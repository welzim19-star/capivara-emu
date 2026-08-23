#ifndef MUPEN64_ADAPTER_H
#define MUPEN64_ADAPTER_H

#include "ICoreAdapter.h"
#include <android/log.h>

#define LOGI_MUPEN(...) __android_log_print(ANDROID_LOG_INFO, "Mupen64Adapter", __VA_ARGS__)

class Mupen64Adapter : public ICoreAdapter {
public:
    bool supportsFastForward() const override {
        return false; // 3D cores might glitch with raw fast forward
    }

    bool applyEnvironmentHacks(unsigned cmd, void* data, retro_environment_t original_cb) override {
        if (cmd == RETRO_ENVIRONMENT_GET_PREFERRED_HW_RENDER) {
            unsigned* p = (unsigned*)data;
            if (p) *p = RETRO_HW_CONTEXT_OPENGLES3;
            return true;
        }
        return false;
    }

    void setupControllerPorts(void (*set_controller_port_device)(unsigned, unsigned)) override {
        if (set_controller_port_device) {
            LOGI_MUPEN("Setting port 0 to RETRO_DEVICE_ANALOG (3D Core)");
            set_controller_port_device(0, RETRO_DEVICE_ANALOG);
        }
    }

    void injectVariables() override {
        LOGI_MUPEN("Injecting optimal Mupen64Plus-Next GLideN64 variables...");
        // Set standard GLES3 GLideN64 plugin options for 100% Banjo-Kazooie & Mario 64 compatibility
        g_core_options["mupen64plus-rdp-plugin"] = "gliden64";
        g_core_options["mupen64plus-rsp-plugin"] = "hle";
        g_core_options["mupen64plus-43screensize"] = "640x480";
        g_core_options["mupen64plus-cpucore"] = "dynamic_recompiler";
        g_core_options["mupen64plus-txHiresEnable"] = "False";
        g_core_options["mupen64plus-EnableNativeResFactor"] = "1";
    }
};

#endif // MUPEN64_ADAPTER_H
