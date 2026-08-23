// engine_gameloop.cpp
// Main emulator loop — runs entirely on its own C++ thread.
// Libretro lifecycle: init → load_game → run (loop) → unload_game → deinit
// All calls happen on the SAME thread to satisfy Libretro TLS and GL-context rules.

#include "engine_globals.h"
#include <chrono>
#include "adapters/CoreAdapterFactory.h"

std::unique_ptr<ICoreAdapter> g_coreAdapter = nullptr;

void GameLoop() {
    // ── 1. Wait for Android Surface (up to 5 s) ───────────────────────────────
    LOGI("GameLoop started. Waiting for Android Surface...");
    int waitMs = 0;
    while (!g_surfaceReady && waitMs < 5000) {
        std::this_thread::sleep_for(std::chrono::milliseconds(32));
        waitMs += 32;
    }
    if (!g_surfaceReady || !g_window) {
        LOGE("GameLoop ABORT: Surface not ready after 5 s. g_surfaceReady=%d g_window=%p",
             (int)g_surfaceReady.load(), (void*)g_window);
        g_engineRunning = false;
        return;
    }
    LOGI("Surface ready. g_window=%p", (void*)g_window);

    // ── 1.5. Load Core & Bind Symbols (MUST BE ON THIS THREAD) ───────────────
    LOGI("Loading core: %s", g_corePath.c_str());
    if (!loadCore(g_corePath.c_str())) {
        LOGE("GameLoop ABORT: Failed to load core from %s", g_corePath.c_str());
        g_engineRunning = false;
        return;
    }
    LOGI("Core loaded on GameLoop thread. Pointers: init=%p load_game=%p run=%p",
         (void*)core.init, (void*)core.load_game, (void*)core.run);

    // ── 2. EGL / GL Context ───────────────────────────────────────────────────
    LOGI("Initializing EGL...");
    if (!initEGL()) {
        LOGE("GameLoop ABORT: initEGL() failed! g_window=%p", (void*)g_window);
        g_engineRunning = false;
        return;
    }
    LOGI("EGL initialized. Display=%p Surface=%p Context=%p",
         (void*)g_eglDisplay, (void*)g_eglSurface, (void*)g_eglContext);

    // ── 3. core.init() — MUST run on THIS thread ──────────────────────────────
    g_coreAdapter = CoreAdapterFactory::getAdapter(g_corePath, g_systemDir);
    g_coreAdapter->injectVariables();

    LOGI("Calling core.init()...");
    if (core.init) core.init();
    LOGI("core.init() completed.");

    if (core.set_controller_port_device) {
        g_coreAdapter->setupControllerPorts(core.set_controller_port_device);
    }

    // ── 5. Query system info & load ROM ───────────────────────────────────────
    retro_system_info sys_info = {};
    if (core.get_system_info) core.get_system_info(&sys_info);
    LOGI("Core info: name=%s version=%s need_fullpath=%d",
         sys_info.library_name ? sys_info.library_name : "??",
         sys_info.library_version ? sys_info.library_version : "??",
         sys_info.need_fullpath);

    retro_game_info info = {};
    info.path = g_romPath.c_str();
    info.meta = "";

    std::vector<uint8_t> romBuffer;
    bool loadSuccess = false;

    if (g_romPath.empty()) {
        LOGI("Booting BIOS (no ROM path provided)");
        info.path = nullptr;
        info.data = nullptr;
        info.size = 0;
        loadSuccess = core.load_game ? core.load_game(&info) : false;
    } else {
        if (!sys_info.need_fullpath) {
            LOGI("Loading ROM into memory: %s", g_romPath.c_str());
            FILE* f = fopen(g_romPath.c_str(), "rb");
            if (f) {
                fseek(f, 0, SEEK_END);
                size_t sz = ftell(f);
                fseek(f, 0, SEEK_SET);
                romBuffer.resize(sz);
                fread(romBuffer.data(), 1, sz, f);
                fclose(f);
                info.data = romBuffer.data();
                info.size = sz;
                LOGI("ROM loaded into memory: %zu bytes", sz);
            } else {
                LOGE("FAILED to open ROM file: %s (errno=%d)", g_romPath.c_str(), errno);
            }
        } else {
            info.data = nullptr;
            info.size = 0;
            LOGI("Core uses fullpath. ROM: %s", g_romPath.c_str());
        }
        LOGI("Calling core.load_game()...");
        loadSuccess = core.load_game ? core.load_game(&info) : false;
    }

    if (!loadSuccess) {
        LOGE("GameLoop ABORT: core.load_game() returned false.");
        if (core.deinit) core.deinit();
        destroyEGL();
        g_engineRunning = false;
        return;
    }
    LOGI(">>> GAME LOADED SUCCESSFULLY! Core is running. <<<");

    // ── 5.5 HW Render context_reset (MUST ALWAYS run after load_game per Libretro spec) ──
    if (g_hw_render_active && g_hw_render_cb.context_reset) {
        LOGI("Triggering HW render context_reset after load_game...");
        g_hw_render_cb.context_reset();
    }
    // ── 6. Restore SRAM ───────────────────────────────────────────────────────
    if (core.get_memory_data && core.get_memory_size && !g_sramPath.empty()) {
        size_t sramSize = core.get_memory_size(RETRO_MEMORY_SAVE_RAM);
        void*  sramData = core.get_memory_data(RETRO_MEMORY_SAVE_RAM);
        if (sramSize > 0 && sramData) {
            FILE* f = fopen(g_sramPath.c_str(), "rb");
            if (f) {
                fread(sramData, 1, sramSize, f);
                fclose(f);
                LOGI("SRAM loaded from %s (%zu bytes)", g_sramPath.c_str(), sramSize);
            }
        }
    }

    // ── 7. Init Audio & AV Info ───────────────────────────────────────────────
    retro_system_av_info av_info = {};
    if (core.get_system_av_info) {
        core.get_system_av_info(&av_info);
        if (av_info.geometry.base_width > 0 && av_info.geometry.base_height > 0) {
            g_video_width  = av_info.geometry.base_width;
            g_video_height = av_info.geometry.base_height;
        }
    }

    initAudio(av_info.timing.sample_rate);

    LOGI("Core: %s v%s | FPS: %.2f | SampleRate: %.0f Hz | Geom: %ux%u",
         sys_info.library_name, sys_info.library_version,
         av_info.timing.fps, av_info.timing.sample_rate,
         g_video_width, g_video_height);

    const int frameTimeUs = (int)(1000000.0 / (av_info.timing.fps > 0 ? av_info.timing.fps : 60.0));

    // ── 8. Main Run Loop (With Rewind & Auto-Save) ────────────────────────────
    uint64_t frameCount = 0;
    
    // SRAM Auto-Save State
    std::vector<uint8_t> lastSramCopy;
    size_t sramSize = 0;
    void* sramData = nullptr;
    if (core.get_memory_data && core.get_memory_size && !g_sramPath.empty()) {
        sramSize = core.get_memory_size(RETRO_MEMORY_SAVE_RAM);
        sramData = core.get_memory_data(RETRO_MEMORY_SAVE_RAM);
        if (sramSize > 0 && sramData) {
            lastSramCopy.resize(sramSize);
            memcpy(lastSramCopy.data(), sramData, sramSize);
        }
    }

    // Rewind Ring Buffer
    const int REWIND_MAX_STATES = 150; // About 15 seconds if saved every 6 frames
    std::vector<std::vector<uint8_t>> rewindBuffer;
    int rewindIndex = 0;
    size_t serializeSize = core.serialize_size ? core.serialize_size() : 0;
    bool canRewind = (!g_hw_render_active && core.serialize && core.unserialize && serializeSize > 0 && serializeSize < 2 * 1024 * 1024);
    if (canRewind) {
        rewindBuffer.resize(REWIND_MAX_STATES, std::vector<uint8_t>(serializeSize));
    }

    while (g_engineRunning) {
        if (g_surfaceChanged.exchange(false)) {
            recreateEGLSurface();
        }

        // Process pending Save / Load State on the EGL thread (with active OpenGL context!)
        if (g_stateOpPending) {
            std::lock_guard<std::mutex> opLock(g_stateOpMutex);
            std::lock_guard<std::mutex> coreLock(g_coreMutex);
            if (!g_pendingSavePath.empty()) {
                size_t size = core.serialize_size ? core.serialize_size() : 0;
                bool ok = false;
                if (size > 0 && core.serialize) {
                    void* data = malloc(size);
                    ok = core.serialize(data, size);
                    if (ok) {
                        FILE* f = fopen(g_pendingSavePath.c_str(), "wb");
                        if (f) { fwrite(data, 1, size, f); fclose(f); }
                        else   { ok = false; }
                    }
                    free(data);
                }
                g_stateOpResult   = ok;
                g_pendingSavePath = "";
                g_stateOpPending  = false;
                g_stateOpCv.notify_all();
                LOGI("SaveState executed on GL thread: result=%d", ok);
            } else if (!g_pendingLoadPath.empty()) {
                bool ok = false;
                if (core.unserialize) {
                    FILE* f = fopen(g_pendingLoadPath.c_str(), "rb");
                    if (f) {
                        fseek(f, 0, SEEK_END);
                        size_t size = ftell(f);
                        fseek(f, 0, SEEK_SET);
                        if (size > 0) {
                            void* data = malloc(size);
                            fread(data, 1, size, f);
                            fclose(f);
                            ok = core.unserialize(data, size);
                            free(data);
                        } else {
                            fclose(f);
                        }
                    }
                }
                g_stateOpResult   = ok;
                g_pendingLoadPath = "";
                g_stateOpPending  = false;
                g_stateOpCv.notify_all();
                LOGI("LoadState executed on GL thread: result=%d", ok);
            }
        }

        if (g_enginePaused) {
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
            continue;
        }

        auto start = std::chrono::high_resolution_clock::now();

        // Check if L2 (ID 12) is held for Rewind
        bool isRewinding = canRewind && g_input_state[12];

        {
            std::lock_guard<std::mutex> lock(g_coreMutex);
            if (isRewinding) {
                // Rebobinar: load previous state, skip core.run()
                rewindIndex = (rewindIndex - 1 + REWIND_MAX_STATES) % REWIND_MAX_STATES;
                core.unserialize(rewindBuffer[rewindIndex].data(), serializeSize);
            } else {
                // For HW-rendered cores (Direct EGL Target), ensure Framebuffer 0 is active
                if (g_hw_render_active) {
                    glBindFramebuffer(GL_FRAMEBUFFER, 0);
                }

                // Normal execution
                if (core.run) core.run();

                // Save state for rewind every 6 frames (only if not in fast forward!)
                if (canRewind && frameCount % 6 == 0 && !g_fastForward.load()) {
                    core.serialize(rewindBuffer[rewindIndex].data(), serializeSize);
                    rewindIndex = (rewindIndex + 1) % REWIND_MAX_STATES;
                }
            }
        }

        bool skipEglSwap = false;
        static int ffRenderSkipCount = 0;
        static int globalFrameSkipCount = 0;

        if (g_fastForward.load()) {
            ffRenderSkipCount++;
            if (ffRenderSkipCount % 4 != 0) {
                skipEglSwap = true; // Drop 3 out of 4 frames at the GPU swap level
            }
        } else {
            ffRenderSkipCount = 0;
            int manualSkip = g_frameSkip.load();
            if (manualSkip > 0) {
                globalFrameSkipCount++;
                if (globalFrameSkipCount % (manualSkip + 1) != 0) {
                    skipEglSwap = true;
                }
            } else {
                globalFrameSkipCount = 0;
            }
        }

        // Render frame AFTER releasing the core lock so FF isn't bottlenecked by video sync
        renderFrame(skipEglSwap);

        if (isRewinding) {
            // Sleep slightly longer for a cool slow-motion rewind effect
            std::this_thread::sleep_for(std::chrono::milliseconds(16));
        }

        ++frameCount;

        // Auto-Save SRAM every 600 frames (~10 seconds)
        if (sramSize > 0 && sramData && frameCount % 600 == 0) {
            if (memcmp(lastSramCopy.data(), sramData, sramSize) != 0) {
                memcpy(lastSramCopy.data(), sramData, sramSize);
                FILE* f = fopen(g_sramPath.c_str(), "wb");
                if (f) {
                    fwrite(sramData, 1, sramSize, f);
                    fclose(f);
                    LOGI("Auto-Save SRAM flushed to disk.");
                }
            }
        }

        if (frameCount == 1) {
            LOGI(">>> FIRST FRAME RENDERED! VideoBuffer=%zu HWRender=%d <<<",
                 g_videoBuffer.size(), (int)g_hw_render_active);
        } else if (frameCount % 600 == 0) {
            LOGI("GameLoop heartbeat: frame=%llu videoBuffer=%zu hw=%d",
                 (unsigned long long)frameCount, g_videoBuffer.size(), (int)g_hw_render_active);
        }

        auto end     = std::chrono::high_resolution_clock::now();
        int  elapsed = (int)std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();

        // ── Calculate FPS ──
        static auto lastFpsTime = std::chrono::high_resolution_clock::now();
        static int fpsFrameCount = 0;
        fpsFrameCount++;
        auto nowFps = std::chrono::high_resolution_clock::now();
        int msSinceLastFps = (int)std::chrono::duration_cast<std::chrono::milliseconds>(nowFps - lastFpsTime).count();
        if (msSinceLastFps >= 1000) {
            g_currentFps.store((fpsFrameCount * 1000.0f) / msSinceLastFps);
            fpsFrameCount = 0;
            lastFpsTime = nowFps;
        }

        if (!isRewinding && elapsed < frameTimeUs && !g_fastForward.load()) {
            std::this_thread::sleep_for(std::chrono::microseconds(frameTimeUs - elapsed));
        }
    }

    LOGI("GameLoop: run loop exited — tearing down.");

    // ── 9. Persist SRAM ───────────────────────────────────────────────────────
    if (core.get_memory_data && core.get_memory_size && !g_sramPath.empty()) {
        size_t sramSize = core.get_memory_size(RETRO_MEMORY_SAVE_RAM);
        void*  sramData = core.get_memory_data(RETRO_MEMORY_SAVE_RAM);
        if (sramSize > 0 && sramData) {
            FILE* f = fopen(g_sramPath.c_str(), "wb");
            if (f) {
                fwrite(sramData, 1, sramSize, f);
                fclose(f);
                LOGI("SRAM saved to %s (%zu bytes)", g_sramPath.c_str(), sramSize);
            }
        }
    }

    // ── 10. Teardown — all on this same thread ────────────────────────────────
    
    // Call HW context_destroy BEFORE unload_game and BEFORE destroying EGL
    // This prevents SIGSEGV because the core needs to clean up its GL state 
    // while the EGL context is still valid and the core isn't unloaded yet.
    if (g_hw_render_active && g_hw_render_cb.context_destroy) {
        LOGI("Triggering HW render context_destroy before EGL teardown...");
        g_hw_render_cb.context_destroy();
    }

    if (core.unload_game) core.unload_game();
    if (core.deinit)      core.deinit();

    g_audioInitialized = false;
    g_audioCv.notify_all();
    if (bqPlayerPlay)
        (*bqPlayerPlay)->SetPlayState(bqPlayerPlay, SL_PLAYSTATE_STOPPED);

    // Destroy EGL AFTER context_destroy
    destroyEGL();

    if (bqPlayerObject)  (*bqPlayerObject)->Destroy(bqPlayerObject);
    if (outputMixObject) (*outputMixObject)->Destroy(outputMixObject);
    if (engineObject)    (*engineObject)->Destroy(engineObject);

    bqPlayerObject      = nullptr;
    outputMixObject     = nullptr;
    engineObject        = nullptr;
    bqPlayerPlay        = nullptr;
    bqPlayerBufferQueue = nullptr;

    g_engineRunning = false;
    LOGI("GameLoop thread terminated cleanly.");
}
