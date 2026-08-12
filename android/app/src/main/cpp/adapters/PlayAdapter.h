#ifndef PLAY_ADAPTER_H
#define PLAY_ADAPTER_H

#include "ICoreAdapter.h"
#include <android/log.h>
#include <stdlib.h>

#define LOGI_PLAY(...) __android_log_print(ANDROID_LOG_INFO, "PlayAdapter", __VA_ARGS__)

class PlayAdapter : public ICoreAdapter {
private:
    std::string m_systemDir;
public:
    PlayAdapter(const std::string& systemDir) : m_systemDir(systemDir) {}

    bool supportsFastForward() const override {
        return false;
    }

    bool applyEnvironmentHacks(unsigned cmd, void* data, retro_environment_t original_cb) override {
        return false;
    }

    void setupControllerPorts(void (*set_controller_port_device)(unsigned, unsigned)) override {
        if (set_controller_port_device) {
            LOGI_PLAY("Setting port 0 to RETRO_DEVICE_ANALOG (3D Core)");
            set_controller_port_device(0, RETRO_DEVICE_ANALOG);
        }
    }

    void injectVariables() override {
        LOGI_PLAY("Applying Play! core workaround: mapping EXTERNAL_STORAGE to internal system dir");
        setenv("EXTERNAL_STORAGE", m_systemDir.c_str(), 1);
        setenv("HOME", m_systemDir.c_str(), 1);
        setenv("TMPDIR", m_systemDir.c_str(), 1);
    }
};

#endif // PLAY_ADAPTER_H
