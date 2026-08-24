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

    bool useDirectFboBlit() const override {
        return true;
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
        g_core_options["reicast_internal_resolution"]   = "640x480";
        g_core_options["reicast_gdrom_fast_loading"]    = "enabled";            // Fast track seek on CHD/GDI
        g_core_options["reicast_digital_triggers"]      = "enabled";            // Allow digital L/R on touchpads
        g_core_options["reicast_widescreen_hack"]       = "disabled";           // Keep stable 3D viewport (avoids geometry freeze on Sonic)
        g_core_options["reicast_device_port1_slot1"]    = "VMU";
        g_core_options["reicast_device_port1_slot2"]    = "VMU";
        g_core_options["reicast_device_port2_slot1"]    = "VMU";
        g_core_options["reicast_device_port2_slot2"]    = "VMU";
        g_core_options["reicast_per_content_vmus"]      = "disabled";

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
            // Check if VMU doesn't exist or is unformatted (all zeros)
            bool needsFormat = (stat(vmuPath.c_str(), &stVmu) != 0 || stVmu.st_size < 131072);
            if (!needsFormat) {
                FILE* vf = fopen(vmuPath.c_str(), "rb");
                if (vf) {
                    uint8_t testByte = 0;
                    fseek(vf, 0x1FE00, SEEK_SET);
                    if (fread(&testByte, 1, 1, vf) == 1 && testByte != 0x55) {
                        needsFormat = true; // Was an unformatted zero-fill VMU
                    }
                    fclose(vf);
                }
            }

            if (needsFormat) {
                std::vector<uint8_t> vmu(131072, 0x00);

                // ── Format FAT Block (Block 254 / Offset 0x1FC00) ─────────────
                // 256 words: 0..199 are user blocks (0xFFFE = Free), 241..253 dir, 254 & 255 system (0xFFFC)
                uint16_t* fat = (uint16_t*)(vmu.data() + 0x1FC00);
                for (int b = 0; b <= 240; ++b) {
                    fat[b] = 0xFFFE; // Free block
                }
                for (int b = 241; b <= 253; ++b) {
                    fat[b] = (b == 241) ? 0xFFFA : (b - 1); // Directory block chain
                }
                fat[254] = 0xFFFC; // FAT system block
                fat[255] = 0xFFFC; // Root system block

                // ── Format Root Block (Block 255 / Offset 0x1FE00) ────────────
                uint8_t* root = vmu.data() + 0x1FE00;
                memset(root, 0x55, 16); // Magic pattern

                // BCD Timestamp: 2026-08-24 12:00:00
                root[0x30] = 0x20; root[0x31] = 0x26; // Year
                root[0x32] = 0x08;                     // Month
                root[0x33] = 0x24;                     // Day
                root[0x34] = 0x12; root[0x35] = 0x00; root[0x36] = 0x00; // Hour, Min, Sec

                root[0x40] = 255; root[0x41] = 0; // Root block location (255)
                root[0x42] = 0;   root[0x43] = 0;
                root[0x44] = 254; root[0x45] = 0; // FAT block location (254)
                root[0x46] = 1;   root[0x47] = 0; // FAT size (1 block)
                root[0x48] = 253; root[0x49] = 0; // Dir location (253)
                root[0x4A] = 13;  root[0x4B] = 0; // Dir size (13 blocks)
                root[0x4C] = 0;   root[0x4D] = 0; // Icon shape (0)
                root[0x4E] = 200; root[0x4F] = 0; // User blocks (200)

                FILE* f = fopen(vmuPath.c_str(), "wb");
                if (f) {
                    fwrite(vmu.data(), 1, vmu.size(), f);
                    fclose(f);
                    LOGI_FLYCAST("[VMU] Pre-formatted Sega Dreamcast VMU (200 Free Blocks) at %s", vmuPath.c_str());
                }
            }
        }

        g_core_options["reicast_hle_bios"] = hasBootBin ? "disabled" : "enabled";
        LOGI_FLYCAST("Flycast config complete. Mode=%s | European Flash + VMU = ACTIVE", hasBootBin ? "REAL_BIOS" : "HLE_REIOS");
    }
};

#endif // FLYCAST_ADAPTER_H
