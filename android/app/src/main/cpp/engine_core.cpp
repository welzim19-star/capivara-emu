// engine_core.cpp
// Libretro environment callbacks, input callbacks, and core log bridge.
// This is the "contract layer" between Capivara Engine and any libretro core.

#include "engine_globals.h"

// ── Core Log Callback ─────────────────────────────────────────────────────────
static void retro_log_cb(enum retro_log_level level, const char* fmt, ...) {
    va_list args;
    va_start(args, fmt);
    int android_level = ANDROID_LOG_INFO;
    if (level == RETRO_LOG_WARN)  android_level = ANDROID_LOG_WARN;
    if (level == RETRO_LOG_ERROR) android_level = ANDROID_LOG_ERROR;
    __android_log_vprint(android_level, "CapivaraNativeCore", fmt, args);
    va_end(args);

    // Mirror to UDP so we see core internals in listen_logs.py
    va_start(args, fmt);
    char buf[1024];
    vsnprintf(buf, sizeof(buf), fmt, args);
    udp_log("CORE LOG: %s", buf);
    va_end(args);
}

// ── HW Render Proc-Address Helpers ───────────────────────────────────────────
static uintptr_t retro_hw_get_current_framebuffer() { return g_hw_fbo; }

static retro_proc_address_t retro_hw_get_proc_address(const char* sym) {
    retro_proc_address_t fn = (retro_proc_address_t)eglGetProcAddress(sym);
    if (!fn) fn = (retro_proc_address_t)dlsym(RTLD_DEFAULT, sym);
    return fn;
}

// ── Environment Callback ──────────────────────────────────────────────────────
// Critical: this is called by the core to negotiate capabilities with us.
bool retro_env_callback(unsigned cmd, void* data) {
    switch (cmd) {

    case RETRO_ENVIRONMENT_SET_PIXEL_FORMAT: {
        const enum retro_pixel_format* fmt = (enum retro_pixel_format*)data;
        if (*fmt != RETRO_PIXEL_FORMAT_0RGB1555 &&
            *fmt != RETRO_PIXEL_FORMAT_XRGB8888 &&
            *fmt != RETRO_PIXEL_FORMAT_RGB565) {
            LOGE("Core requested unsupported pixel format %d", *fmt);
            return false;
        }
        g_pixel_format = *fmt;
        return true;
    }

    case RETRO_ENVIRONMENT_GET_SYSTEM_DIRECTORY: {
        const char** dir = (const char**)data;
        if (!g_systemDir.empty()) {
            *dir = g_systemDir.c_str();
            LOGI("System dir resolved to: %s", g_systemDir.c_str());
        } else {
            *dir = "/data/data/com.capivaraemu.studio/cache";
            LOGI("System dir not configured — using cache fallback.");
        }
        return true;
    }

    case RETRO_ENVIRONMENT_GET_SAVE_DIRECTORY: {
        const char** dir = (const char**)data;
        *dir = g_saveDir.empty()
             ? "/data/data/com.capivaraemu.studio/cache"
             : g_saveDir.c_str();
        return true;
    }

    case RETRO_ENVIRONMENT_GET_CAN_DUPE: {
        bool* b = (bool*)data;
        if (b) *b = true;
        return true;
    }

    case RETRO_ENVIRONMENT_GET_LOG_INTERFACE: {
        struct retro_log_callback* cb = (struct retro_log_callback*)data;
        if (cb) cb->log = retro_log_cb;
        return true;
    }

    // ── Variable system ─────────────────────────────────────────────────────
    // SET_VARIABLES: core declares all its supported options with default values.
    // We parse the first option as the safe default.
    // FIX FOR MAME 2010: Without populating defaults here, GET_VARIABLE returns
    // false → core uses NULL pointer → strcmp(NULL, ...) → SIGSEGV @ 0x100.
    case RETRO_ENVIRONMENT_SET_VARIABLES: {
        const struct retro_variable* vars = (const struct retro_variable*)data;
        while (vars && vars->key) {
            // Only fill in if not already injected by injectCoreConfiguration
            if (g_core_options.find(vars->key) == g_core_options.end()) {
                const char* desc = vars->value ? vars->value : "";
                const char* semi = strchr(desc, ';');
                if (semi) {
                    const char* opts = semi + 1;
                    while (*opts == ' ') opts++; // trim leading space
                    const char* pipe = strchr(opts, '|');
                    std::string def  = pipe ? std::string(opts, pipe - opts)
                                            : std::string(opts);
                    // Trim trailing spaces
                    while (!def.empty() && def.back() == ' ') def.pop_back();
                    g_core_options[vars->key] = def;
                }
            }
            vars++;
        }
        return true;
    }

    case RETRO_ENVIRONMENT_GET_VARIABLE: {
        auto* var = (struct retro_variable*)data;
        if (var && var->key) {
            auto it = g_core_options.find(var->key);
            if (it != g_core_options.end()) {
                var->value = it->second.c_str();
                LOGI("Core reads variable %s = %s", var->key, var->value);
                return true;
            }
            // CRITICAL: NEVER leave var->value as NULL.
            // MAME 2010's astring_cpy does strcmp(dst->text, src->text) without
            // null check → SIGSEGV @ 0x100 if value is nullptr.
            // Return false but set value="" so any deref gets a valid pointer.
            var->value = "";
            LOGI("Core asked for variable %s, not found in our matrix.", var->key);
        }
        return false;
    }

    case RETRO_ENVIRONMENT_GET_VARIABLE_UPDATE: {
        bool* updated = (bool*)data;
        if (updated) *updated = false;
        return true;
    }

    // Returning false makes the core fall back to SET_VARIABLES / GET_VARIABLE.
    case RETRO_ENVIRONMENT_GET_CORE_OPTIONS_VERSION:
    case RETRO_ENVIRONMENT_SET_CORE_OPTIONS:
    case RETRO_ENVIRONMENT_SET_CORE_OPTIONS_INTL:
    case RETRO_ENVIRONMENT_SET_CORE_OPTIONS_V2:
    case RETRO_ENVIRONMENT_SET_CORE_OPTIONS_V2_INTL:
    case RETRO_ENVIRONMENT_SET_CORE_OPTIONS_DISPLAY:
        return false;

    case RETRO_ENVIRONMENT_SET_SUPPORT_NO_GAME:
        return true;

    case RETRO_ENVIRONMENT_GET_PREFERRED_HW_RENDER: {
        unsigned* p = (unsigned*)data;
        if (p) *p = RETRO_HW_CONTEXT_OPENGLES3;
        return true;
    }

    case RETRO_ENVIRONMENT_SET_HW_RENDER: {
        auto* hw = (struct retro_hw_render_callback*)data;
        if (hw->context_type != RETRO_HW_CONTEXT_OPENGLES2 &&
            hw->context_type != RETRO_HW_CONTEXT_OPENGLES3) {
            LOGE("Core requires unsupported HW Context: %d", hw->context_type);
            return false;
        }
        hw->get_current_framebuffer = retro_hw_get_current_framebuffer;
        hw->get_proc_address        = retro_hw_get_proc_address;
        g_hw_render_cb   = *hw;
        g_hw_render_active = true;
        if (g_eglContext != EGL_NO_CONTEXT) setup_hw_fbo();
        return true;
    }

    case RETRO_ENVIRONMENT_SET_GEOMETRY: {
        auto* geom = (const struct retro_game_geometry*)data;
        if (geom) {
            g_video_width  = geom->base_width;
            g_video_height = geom->base_height;
        }
        return true;
    }

    default:
        return false;
    }
}

// ── Input Callbacks ───────────────────────────────────────────────────────────
void retro_input_poll_cb(void) {}

int16_t retro_input_state_cb(unsigned port, unsigned device, unsigned index, unsigned id) {
    std::lock_guard<std::mutex> lock(g_inputMutex);
    
    // We only route inputs to port 0 (Player 1)
    if (port != 0) {
        return 0;
    }

    if (device == RETRO_DEVICE_JOYPAD) {
        return g_input_state[id] ? 1 : 0;
    }
    if (device == RETRO_DEVICE_ANALOG) {
        if (index < 2 && id < 2) {
            return g_analog_state[index][id];
        }
    }
    return 0;
}
