#ifndef GENERIC_ADAPTER_H
#define GENERIC_ADAPTER_H

#include "ICoreAdapter.h"
#include <android/log.h>

#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, "GenericAdapter", __VA_ARGS__)

class GenericAdapter : public ICoreAdapter {
public:
    bool supportsFastForward() const override {
        return true; // Generic/2D cores support fast forward
    }

    bool applyEnvironmentHacks(unsigned cmd, void* data, retro_environment_t original_cb) override {
        return false; // Handled by engine_core
    }

    void setupControllerPorts(void (*set_controller_port_device)(unsigned, unsigned)) override {
        if (set_controller_port_device) {
            LOGI("Setting port 0 to RETRO_DEVICE_JOYPAD (Classic)");
            set_controller_port_device(0, RETRO_DEVICE_JOYPAD);
        }
    }

    void injectVariables() override {
        // Generic variables if needed
    }
};

#endif // GENERIC_ADAPTER_H
