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
            LOGI_FLYCAST("Setting ports 0..3 to RETRO_DEVICE_JOYPAD (Dreamcast 4-Player + VMUs)");
            set_controller_port_device(0, RETRO_DEVICE_JOYPAD);
            set_controller_port_device(1, RETRO_DEVICE_JOYPAD);
            set_controller_port_device(2, RETRO_DEVICE_JOYPAD);
            set_controller_port_device(3, RETRO_DEVICE_JOYPAD);
        }
    }

    void injectVariables() override {
        LOGI_FLYCAST("Injecting Flycast runtime variables...");

        // ── Video & Audio Stability & 60 FPS VGA Mode ────────────────────────
        g_core_options["reicast_threaded_rendering"]    = "disabled";
        g_core_options["reicast_alpha_sorting"]         = "per-triangle (normal)";
        g_core_options["reicast_anisotropic_filtering"] = "2";
        g_core_options["reicast_oit_layers"]            = "16";                 // 16 layers: high throughput 60 FPS on Adreno GPU
        g_core_options["reicast_fog"]                   = "enabled";
        g_core_options["reicast_cable_type"]            = "VGA (RGB)";          // VGA 60Hz: unlocks full 60 FPS in games
        g_core_options["reicast_broadcast"]             = "Auto";               // Automatically detects PAL vs NTSC from game header
        g_core_options["reicast_internal_resolution"]   = "640x480";
        g_core_options["reicast_gdrom_fast_loading"]    = "enabled";            // Fast track seek on CHD/GDI
        g_core_options["reicast_digital_triggers"]      = "enabled";            // Allow digital L/R on touchpads
        g_core_options["reicast_widescreen_hack"]       = "disabled";           // Keep stable 3D viewport (avoids geometry freeze on Sonic)
        g_core_options["reicast_device_port1_slot1"]    = "VMU";
        g_core_options["reicast_device_port1_slot2"]    = "VMU";
        g_core_options["reicast_device_port2_slot1"]    = "VMU";
        g_core_options["reicast_device_port2_slot2"]    = "VMU";
        g_core_options["reicast_device_port3_slot1"]    = "VMU";
        g_core_options["reicast_device_port4_slot1"]    = "VMU";
        g_core_options["reicast_per_content_vmus"]      = "disabled";

        g_core_options["flycast_device_port1_slot1"]    = "VMU";
        g_core_options["flycast_device_port1_slot2"]    = "VMU";
        g_core_options["flycast_device_port2_slot1"]    = "VMU";
        g_core_options["flycast_device_port2_slot2"]    = "VMU";
        g_core_options["flycast_device_port3_slot1"]    = "VMU";
        g_core_options["flycast_device_port4_slot1"]    = "VMU";
        g_core_options["flycast_per_content_vmus"]      = "disabled";

        // ── Direct Game Boot with NVRAM Flash ─────────────────────────────────
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
        searchDirs.push_back("/data/user/0/com.capivaraemu.studio/files/system/dc");
        searchDirs.push_back("/data/user/0/com.capivaraemu.studio/files/system");
        searchDirs.push_back("/data/user/0/com.capivaraemu.studio/files/system/bios/dc");
        searchDirs.push_back("/data/user/0/com.capivaraemu.studio/files/system/bios");
        searchDirs.push_back("/data/user/0/com.capivaraemu.studio/files/saves/dc");
        searchDirs.push_back("/data/user/0/com.capivaraemu.studio/files/saves");
        searchDirs.push_back("/data/user/0/com.capivaraemu.studio/files/dc");
        searchDirs.push_back("/data/user/0/com.capivaraemu.studio/files");

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

        // Ensure dc/ subfolder exists in system dir and has dc_boot.bin and NVRAM dc_flash.bin
        for (const auto& dir : searchDirs) {
            mkdir(dir.c_str(), 0777);
            if (hasBootBin && !foundBootPath.empty()) {
                std::string targetBoot = dir + "/dc_boot.bin";
                if (targetBoot != foundBootPath) {
                    struct stat stT{};
                    if (stat(targetBoot.c_str(), &stT) != 0 || stT.st_size < 1048576) {
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
                flash[0x1A002] = 0x02; // Region: Europe/Universal
                flash[0x1A003] = 0x01; // Broadcast: PAL/Auto
                flash[0x1A004] = 0x01; // Language: English
                FILE* f = fopen(flashPath.c_str(), "wb");
                if (f) {
                    fwrite(flash.data(), 1, flash.size(), f);
                    fclose(f);
                    LOGI_FLYCAST("[FLASH] Generated dc_flash.bin at %s", flashPath.c_str());
                }
            }

            // Format all 8 standard Sega Dreamcast VMU slots (A1, A2, B1, B2, C1, C2, D1, D2)
            const char* vmuNames[] = {
                "vmu_save_A1.bin", "vmu_save_A2.bin",
                "vmu_save_B1.bin", "vmu_save_B2.bin",
                "vmu_save_C1.bin", "vmu_save_C2.bin",
                "vmu_save_D1.bin", "vmu_save_D2.bin"
            };
            for (const char* vname : vmuNames) {
                std::string vmuPath = dir + "/" + vname;
                struct stat stVmu{};
                bool needsFormat = (stat(vmuPath.c_str(), &stVmu) != 0 || stVmu.st_size < 131072);
                if (!needsFormat) {
                    FILE* vf = fopen(vmuPath.c_str(), "rb");
                    if (vf) {
                        uint8_t testByte = 0;
                        uint8_t dirByte = 0;
                        uint8_t userBlockByte = 0;
                        uint16_t testFat0 = 0;
                        uint16_t testFat199 = 0;
                        fseek(vf, 0x1FE00, SEEK_SET);
                        fread(&testByte, 1, 1, vf);
                        fseek(vf, 0x1FE42, SEEK_SET);
                        fread(&dirByte, 1, 1, vf);
                        fseek(vf, 0x1FE4E, SEEK_SET);
                        fread(&userBlockByte, 1, 1, vf);
                        fseek(vf, 0x1FC00, SEEK_SET);
                        fread(&testFat0, 2, 1, vf);
                        fseek(vf, 0x1FC00 + 199 * 2, SEEK_SET);
                        fread(&testFat199, 2, 1, vf);
                        // In Sega Dreamcast VMS FAT: 0xFFFC = UNALLOCATED (FREE BLOCK), 0xFFFA = LAST BLOCK IN CHAIN
                        if (testByte != 0x55 || dirByte != 0xFD || userBlockByte != 0xC8 || testFat0 != 0xFFFC || testFat199 != 0xFFFC) {
                            needsFormat = true; // Corrupted, non-standard or misaligned VMU
                        }
                        fclose(vf);
                    }
                }

                if (needsFormat) {
                    std::vector<uint8_t> vmu(131072, 0x00);

                    // ── FAT Block (Block 254 / Offset 0x1FC00) ─────────────────
                    // Sega VMS Spec: 0xFFFC = Unallocated (Free), 0xFFFA = EOF / Allocated
                    uint16_t* fat = (uint16_t*)(vmu.data() + 0x1FC00);
                    for (int b = 0; b < 200; ++b)     fat[b] = 0xFFFC; // 200 Free User Blocks (0..199 = 0xFFFC)
                    for (int b = 200; b <= 240; ++b) fat[b] = 0xFFFA; // Reserved system blocks (200..240 = 0xFFFA)
                    for (int b = 241; b <= 253; ++b) fat[b] = (b == 241) ? 0xFFFA : (uint16_t)(b - 1); // Directory chain
                    fat[254] = 0xFFFA; // FAT system block
                    fat[255] = 0xFFFA; // Root system block

                    // ── Root Block (Block 255 / Offset 0x1FE00) ────────────────
                    uint8_t* root = vmu.data() + 0x1FE00;
                    memset(root, 0x55, 16); // Magic pattern 0x55

                    // BCD Timestamp: 2026-08-25 12:00:00
                    root[0x30] = 0x20; root[0x31] = 0x26;
                    root[0x32] = 0x08; root[0x33] = 0x25;
                    root[0x34] = 0x12; root[0x35] = 0x00; root[0x36] = 0x00; root[0x37] = 0x00;

                    root[0x40] = 0xFF; root[0x41] = 0x00; // Total blocks - 1 (255)
                    root[0x42] = 0xFD; root[0x43] = 0x00; // Dir location (Block 253)
                    root[0x44] = 0x0D; root[0x45] = 0x00; // Dir size (13 blocks)
                    root[0x46] = 0xFE; root[0x47] = 0x00; // FAT location (Block 254)
                    root[0x48] = 0x01; root[0x49] = 0x00; // FAT size (1 block)
                    root[0x4A] = 0x00; root[0x4B] = 0x00; // Icon shape (0)
                    root[0x4C] = 0x00; root[0x4D] = 0x00; // Volume shape (0)
                    root[0x4E] = 0xC8; root[0x4F] = 0x00; // User blocks (200 free blocks)

                    FILE* f = fopen(vmuPath.c_str(), "wb");
                    if (f) {
                        fwrite(vmu.data(), 1, vmu.size(), f);
                        fflush(f);
                        fsync(fileno(f));
                        fclose(f);
                        LOGI_FLYCAST("[VMU] Pre-formatted Sega Dreamcast VMU (200 Free 0xFFFC Blocks, Dir@253, FAT@254) at %s", vmuPath.c_str());
                    }
                }
            }
        }

        g_core_options["reicast_hle_bios"] = hasBootBin ? "disabled" : "enabled";
        LOGI_FLYCAST("Flycast config complete. Mode=%s | European Flash + VMU = ACTIVE", hasBootBin ? "REAL_BIOS" : "HLE_REIOS");
    }
};

#endif // FLYCAST_ADAPTER_H
