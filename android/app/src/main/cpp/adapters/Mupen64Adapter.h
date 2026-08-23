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
        g_core_options["mupen64plus-cpucore"] = "dynamic_recompiler";
        g_core_options["mupen64plus-txHiresEnable"] = "False";
        
        // Banjo-Kazooie Witch Intro & Cutscene Freeze Prevention (Auto-Profile)
        g_core_options["mupen64plus-CountPerOp"] = "0"; // Auto: Prevents JIT Dynarec buffer exhaustion on ARM64
        g_core_options["mupen64plus-CountPerOpDenomPot"] = "0";
        g_core_options["mupen64plus-EnableFBEmulation"] = "False"; // Let GLideN64 ini enable it per-game (fixes silent crashes)
        g_core_options["mupen64plus-EnableCopyColorToRDRAM"] = "Off";
        g_core_options["mupen64plus-EnableCopyDepthToRDRAM"] = "Off";
        g_core_options["mupen64plus-GLideN64IniBehaviour"] = "early"; // Allows GLideN64 to auto-inject Banjo-Kazooie optimal fixes
        g_core_options["mupen64plus-CorrectTexrectCoords"] = "Auto";
        g_core_options["mupen64plus-BackgroundMode"] = "OnePiece";
        g_core_options["mupen64plus-EnableNativeResTexrects"] = "Disabled";
        g_core_options["mupen64plus-HybridFilter"] = "True";
        g_core_options["mupen64plus-BilinearMode"] = "standard";

        // Respect user resolution multiplier if passed from SettingsMenu/ConfigMatrix
        if (g_core_options.find("mupen64plus-EnableNativeResFactor") == g_core_options.end()) {
            g_core_options["mupen64plus-EnableNativeResFactor"] = "2"; // Default HD 2x
        }
        if (g_core_options.find("mupen64plus-43screensize") == g_core_options.end()) {
            g_core_options["mupen64plus-43screensize"] = "640x480";
        }
    }
};

#endif // MUPEN64_ADAPTER_H
