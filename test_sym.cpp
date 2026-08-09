#include <EGL/egl.h>
#include <dlfcn.h>
void* get_sym(const char* sym) {
    void* fn = (void*)eglGetProcAddress(sym);
    if (!fn) fn = dlsym(RTLD_DEFAULT, sym);
    return fn;
}
