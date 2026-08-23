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
        g_core_options["reicast_broadcast"]             = "Auto";               // Automatically detects PAL vs NTSC from game header
        g_core_options["reicast_region"]                = "Auto";               // Automatically matches game region
        g_core_options["reicast_internal_resolution"]   = "640x480";
        g_core_options["reicast_gdrom_fast_loading"]    = "enabled";            // Fast track seek on CHD/GDI
        g_core_options["reicast_digital_triggers"]      = "enabled";            // Allow digital L/R on touchpads

        // ── Direct Game Boot with European NVRAM Flash ───────────────────────
        bool hasBootBin = false;
        std::vector<std::string> searchDirs;
        if (!g_systemDir.empty()) {
            searchDirs.push_back(g_systemDir + "/dc");
            searchDirs.push_back(g_systemDir);
        }
        if (!g_saveDir.empty()) {
            searchDirs.push_back(g_saveDir + "/dc");
            searchDirs.push_back(g_saveDir);
        }

        std::string foundBootPath = "";
        for (const auto& dir : searchDirs) {
            std::string bp = dir + "/dc_boot.bin";
            struct stat st{};
            if (stat(bp.c_str(), &st) == 0 && st.st_size >= 1048576) {
                hasBootBin = true;
                foundBootPath = bp;
                LOGI_FLYCAST("[BIOS] Genuine dc_boot.bin detected at %s (%ld bytes) — activating REAL Dreamcast hardware boot!", bp.c_str(), (long)st.st_size);
                break;
            }
        }

        // Ensure dc/ subfolder exists in system dir and has dc_boot.bin and European dc_flash.bin
        for (const auto& dir : searchDirs) {
            mkdir(dir.c_str(), 0777);
            if (hasBootBin && !foundBootPath.empty()) {
                std::string targetBoot = dir + "/dc_boot.bin";
                if (targetBoot != foundBootPath) {
                    struct stat stT{};
                    if (stat(targetBoot.c_str(), &stT) != 0 || stT.st_size < 1048576) {
                        // Copy to ensure Flycast finds it wherever it looks
                        FILE* src = fopen(foundBootPath.c_str(), "rb");
                        if (src) {
                            FILE* dst = fopen(targetBoot.c_str(), "wb");
                            if (dst) {
                                char buf[8192];
                                size_t n;
                                while ((n = fread(buf, 1, sizeof(buf), src)) > 0) fwrite(buf, 1, n, dst);
                                fclose(dst);
                            }
                            fclose(src);
                        }
                    }
                }
            }

            std::string flashPath = dir + "/dc_flash.bin";
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
                    LOGI_FLYCAST("[FLASH] Generated European PAL dc_flash.bin at %s", flashPath.c_str());
                }
            }

            std::string vmuPath = dir + "/vmu_save_A1.bin";
            struct stat stVmu{};
            if (stat(vmuPath.c_str(), &stVmu) != 0 || stVmu.st_size < 131072) {
                std::vector<uint8_t> vmu(131072, 0x00);
                FILE* f = fopen(vmuPath.c_str(), "wb");
                if (f) {
                    fwrite(vmu.data(), 1, vmu.size(), f);
                    fclose(f);
                    LOGI_FLYCAST("[VMU] Initialized Virtual Memory Unit at %s", vmuPath.c_str());
                }
            }
        }

        g_core_options["reicast_hle_bios"] = hasBootBin ? "disabled" : "enabled";
        LOGI_FLYCAST("Flycast config complete. Mode=%s | European Flash + VMU = ACTIVE", hasBootBin ? "REAL_BIOS" : "HLE_REIOS");
    }
};

#endif // FLYCAST_ADAPTER_H
