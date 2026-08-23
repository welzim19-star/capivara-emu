#ifndef FLYCAST_ADAPTER_H
#define FLYCAST_ADAPTER_H

#include "ICoreAdapter.h"
#include <android/log.h>
#include <cstdlib>
#include <sys/stat.h>

#define LOGI_FLYCAST(...) __android_log_print(ANDROID_LOG_INFO, "FlycastAdapter", __VA_ARGS__)

class FlycastAdapter : public ICoreAdapter {
public:
    bool supportsFastForward() const override {
        return false;
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
            LOGI_FLYCAST("Setting port 0 & 1 to RETRO_DEVICE_JOYPAD (Dreamcast 2-Player)");
            set_controller_port_device(0, RETRO_DEVICE_JOYPAD);
            set_controller_port_device(1, RETRO_DEVICE_JOYPAD);
        }
    }

    void injectVariables() override {
        LOGI_FLYCAST("Injecting Flycast runtime variables...");

        // ── Video & Audio Stability ──────────────────────────────────────────
        g_core_options["reicast_threaded_rendering"]    = "disabled";
        g_core_options["reicast_alpha_sorting"]         = "per-triangle (normal)";
        g_core_options["reicast_anisotropic_filtering"] = "4";
        g_core_options["reicast_fog"]                   = "enabled";
        g_core_options["reicast_cable_type"]            = "TV (RGB)";           // TV RGB: 100% compatible with both PAL and NTSC games (avoids anti-VGA PAL crashes)
        g_core_options["reicast_broadcast"]             = "PAL";                // European games require PAL bus timing
        g_core_options["reicast_region"]                = "Europe";             // Matches European ROM ID (MK-5111750)
        g_core_options["reicast_internal_resolution"]   = "640x480";
        g_core_options["reicast_gdrom_fast_loading"]    = "enabled";            // Fast track seek on CHD/GDI
        g_core_options["reicast_digital_triggers"]      = "enabled";            // Allow digital L/R on touchpads

        // ── Direct Game Boot with European NVRAM Flash ───────────────────────
        // Sonic Adventure 2 (Europe) checks the Flash ROM region. We create a European PAL dc_flash.bin.
        bool hasBootBin = false;
        if (!g_internalFilesDir.empty()) {
            std::string dcDir     = g_internalFilesDir + "/system/dc";
            std::string bootPath  = dcDir + "/dc_boot.bin";
            std::string flashPath = dcDir + "/dc_flash.bin";
            mkdir(dcDir.c_str(), 0777);

            struct stat stBoot{};
            if (stat(bootPath.c_str(), &stBoot) == 0 && stBoot.st_size >= 1048576) {
                hasBootBin = true;
                LOGI_FLYCAST("[BIOS] Genuine dc_boot.bin detected (%ld bytes) — activating REAL Dreamcast hardware boot!", (long)stBoot.st_size);
            }

            struct stat stFlash{};
            if (stat(flashPath.c_str(), &stFlash) != 0 || stFlash.st_size < 131072) {
                std::vector<uint8_t> flash(131072, 0xFF);
                flash[0x1A000] = 'S';
                flash[0x1A001] = 'E';
                flash[0x1A002] = 0x02; // Region: Europe (matches Sonic Adventure 2 MK-5111750)
                flash[0x1A003] = 0x01; // Broadcast: PAL
                flash[0x1A004] = 0x01; // Language: English
                FILE* f = fopen(flashPath.c_str(), "wb");
                if (f) {
                    fwrite(flash.data(), 1, flash.size(), f);
                    fclose(f);
                    LOGI_FLYCAST("[FLASH] Generated European PAL dc_flash.bin");
                }
            }
        }

        g_core_options["reicast_hle_bios"] = hasBootBin ? "disabled" : "enabled";
        LOGI_FLYCAST("Flycast config complete. Mode=%s | European Flash = ACTIVE", hasBootBin ? "REAL_BIOS" : "HLE_REIOS");
    }
};

#endif // FLYCAST_ADAPTER_H
