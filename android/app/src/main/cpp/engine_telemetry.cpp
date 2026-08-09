// engine_telemetry.cpp
// UDP log broadcaster, native crash signal handlers, unwinder, and stdout/stderr interceptor.

#include "engine_globals.h"
#include <unwind.h>
#include <dlfcn.h>
#include <iomanip>
#include <sstream>
#include <fcntl.h>

// ── UDP Broadcaster ───────────────────────────────────────────────────────────
void udp_log(const char* fmt, ...) {
    static int sock = -1;
    static struct sockaddr_in addr;
    if (sock < 0) {
        sock = socket(AF_INET, SOCK_DGRAM, 0);
        int opt = 1;
        setsockopt(sock, SOL_SOCKET, SO_BROADCAST, &opt, sizeof(opt));
        addr.sin_family      = AF_INET;
        addr.sin_port        = htons(9999);
        addr.sin_addr.s_addr = inet_addr("255.255.255.255");
    }
    char buffer[2048];
    va_list args;
    va_start(args, fmt);
    vsnprintf(buffer, sizeof(buffer), fmt, args);
    va_end(args);
    sendto(sock, buffer, strlen(buffer), 0, (struct sockaddr*)&addr, sizeof(addr));
}

// ── Native Backtrace (Stack Unwinder) ─────────────────────────────────────────
struct BacktraceState {
    void** current;
    void** end;
};

static _Unwind_Reason_Code unwindCallback(struct _Unwind_Context* context, void* arg) {
    BacktraceState* state = static_cast<BacktraceState*>(arg);
    uintptr_t pc = _Unwind_GetIP(context);
    if (pc) {
        if (state->current == state->end) return _URC_END_OF_STACK;
        *state->current++ = reinterpret_cast<void*>(pc);
    }
    return _URC_NO_REASON;
}

static void print_backtrace() {
    const size_t max_frames = 64;
    void* buffer[max_frames];
    BacktraceState state = {buffer, buffer + max_frames};
    _Unwind_Backtrace(unwindCallback, &state);

    size_t count = state.current - buffer;
    udp_log("--- NATIVE CRASH BACKTRACE ---");
    for (size_t i = 0; i < count; ++i) {
        const void* addr = buffer[i];
        Dl_info info;
        if (dladdr(addr, &info) && info.dli_fname) {
            uintptr_t offset = (uintptr_t)addr - (uintptr_t)info.dli_fbase;
            const char* libname = strrchr(info.dli_fname, '/');
            libname = libname ? libname + 1 : info.dli_fname;
            
            if (info.dli_sname) {
                udp_log("  #%02zu pc %016llx  %s (%s)", i, (unsigned long long)offset, libname, info.dli_sname);
            } else {
                udp_log("  #%02zu pc %016llx  %s", i, (unsigned long long)offset, libname);
            }
        } else {
            udp_log("  #%02zu pc %p  <unknown>", i, addr);
        }
    }
    udp_log("------------------------------");
}

// ── Crash Signal Handler ──────────────────────────────────────────────────────
static void crash_handler(int sig, siginfo_t* info, void* /*ucontext*/) {
    const char* sig_name = "UNKNOWN";
    switch (sig) {
        case SIGSEGV: sig_name = "SIGSEGV"; break;
        case SIGABRT: sig_name = "SIGABRT"; break;
        case SIGILL:  sig_name = "SIGILL";  break;
        case SIGFPE:  sig_name = "SIGFPE";  break;
        case SIGBUS:  sig_name = "SIGBUS";  break;
    }
    udp_log("!!!!! FATAL NATIVE CRASH !!!!! Caught signal: %d (%s) at address %p",
            sig, sig_name, info->si_addr);
            
    print_backtrace();
    
    __android_log_print(ANDROID_LOG_FATAL, LOG_TAG, "FATAL NATIVE CRASH: Signal %d (%s)", sig, sig_name);
    
    signal(sig, SIG_DFL);
    raise(sig);
}

// ── Stdout/Stderr Redirector ──────────────────────────────────────────────────
static int pfd[2];
static std::thread stdThread;

static void std_redirect_thread() {
    char buf[1024];
    while (true) {
        ssize_t n = read(pfd[0], buf, sizeof(buf) - 1);
        if (n <= 0) break;
        buf[n] = '\0';
        
        // Remove trailing newline if present to avoid double-spacing in UDP
        if (n > 0 && buf[n-1] == '\n') buf[n-1] = '\0';
        
        // Broadcast caught stdout/stderr via UDP
        udp_log("STD_OUT: %s", buf);
    }
}

void register_crash_handlers() {
    // 1. Setup crash signals
    struct sigaction sa;
    sa.sa_flags   = SA_SIGINFO | SA_RESETHAND;
    sigemptyset(&sa.sa_mask);
    sa.sa_sigaction = crash_handler;
    sigaction(SIGSEGV, &sa, nullptr);
    sigaction(SIGABRT, &sa, nullptr);
    sigaction(SIGILL,  &sa, nullptr);
    sigaction(SIGFPE,  &sa, nullptr);
    sigaction(SIGBUS,  &sa, nullptr);
    
    // 2. Redirect stdout and stderr to our UDP logger
    // This catches everything MAME or PS2 cores print natively without retro_log_cb!
    setvbuf(stdout, nullptr, _IONBF, 0);
    setvbuf(stderr, nullptr, _IONBF, 0);
    if (pipe(pfd) == 0) {
        dup2(pfd[1], STDOUT_FILENO);
        dup2(pfd[1], STDERR_FILENO);
        stdThread = std::thread(std_redirect_thread);
        stdThread.detach();
    }
}
