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

    // ── 4. HW Render context_reset (if applicable during init) ───────────────
    bool contextResetFired = false;
    if (g_hw_render_active && g_hw_render_cb.context_reset) {
        LOGI("Triggering HW render context_reset after init...");
        g_hw_render_cb.context_reset();
        contextResetFired = true;
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

    // ── 5.5 HW Render context_reset (if applicable during load_game) ─────────
    if (!contextResetFired && g_hw_render_active && g_hw_render_cb.context_reset) {
        LOGI("Triggering HW render context_reset after load_game...");
        g_hw_render_cb.context_reset();
        contextResetFired = true;
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
    if (core.get_system_av_info) core.get_system_av_info(&av_info);

    initAudio(av_info.timing.sample_rate);

    LOGI("Core: %s v%s | FPS: %.2f | SampleRate: %.0f Hz",
         sys_info.library_name, sys_info.library_version,
         av_info.timing.fps, av_info.timing.sample_rate);

    const int frameTimeUs = (int)(1000000.0 / (av_info.timing.fps > 0 ? av_info.timing.fps : 60.0));

    // ── 8. Main Run Loop ──────────────────────────────────────────────────────
    uint64_t frameCount = 0;
    while (g_engineRunning) {
        if (g_enginePaused) {
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
            continue;
        }

        auto start = std::chrono::high_resolution_clock::now();

        if (core.run) core.run();
        renderFrame();

        ++frameCount;
        // Log a heartbeat every 60 frames so we can confirm the loop is alive
        if (frameCount == 1) {
            LOGI(">>> FIRST FRAME RENDERED! VideoBuffer=%zu HWRender=%d <<<",
                 g_videoBuffer.size(), (int)g_hw_render_active);
        } else if (frameCount % 300 == 0) {
            LOGI("GameLoop heartbeat: frame=%llu videoBuffer=%zu hw=%d",
                 (unsigned long long)frameCount, g_videoBuffer.size(), (int)g_hw_render_active);
        }

        auto end     = std::chrono::high_resolution_clock::now();
        int  elapsed = (int)std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();
        if (elapsed < frameTimeUs && !g_fastForward.load()) {
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
    if (core.unload_game) core.unload_game();
    if (core.deinit)      core.deinit();

    g_audioInitialized = false;
    g_audioCv.notify_all();
    if (bqPlayerPlay)
        (*bqPlayerPlay)->SetPlayState(bqPlayerPlay, SL_PLAYSTATE_STOPPED);

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
