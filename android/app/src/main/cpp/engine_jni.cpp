// engine_jni.cpp
// JNI interface layer — all exported functions callable from Kotlin/Java.
// This is the ONLY file that uses JNI types. All native logic lives in other modules.

#include "engine_globals.h"

// ── Helper: load .so and bind all Libretro symbols ───────────────────────────
bool loadCore(const char* path) {
    // If a previous core is loaded, close it first
    if (g_core_handle) {
        dlclose(g_core_handle);
        g_core_handle = nullptr;
    }

    g_hw_render_active = false;
    core = {};  // Zero all function pointers

    g_core_handle = dlopen(path, RTLD_LAZY);
    if (!g_core_handle) {
        LOGE("dlopen failed: %s", dlerror());
        return false;
    }

#define BIND_SYM(name) core.name = (decltype(core.name))dlsym(g_core_handle, "retro_" #name);
    BIND_SYM(init)
    BIND_SYM(deinit)
    BIND_SYM(api_version)
    BIND_SYM(get_system_info)
    BIND_SYM(get_system_av_info)
    BIND_SYM(set_environment)
    BIND_SYM(set_video_refresh)
    BIND_SYM(set_audio_sample)
    BIND_SYM(set_audio_sample_batch)
    BIND_SYM(set_input_poll)
    BIND_SYM(set_input_state)
    BIND_SYM(load_game)
    BIND_SYM(unload_game)
    BIND_SYM(run)
    BIND_SYM(serialize_size)
    BIND_SYM(serialize)
    BIND_SYM(unserialize)
    BIND_SYM(get_memory_data)
    BIND_SYM(get_memory_size)
#undef BIND_SYM

    // Register our callbacks. set_environment MUST come before set_video/audio/input
    // so the core can negotiate format on the first call to retro_env_callback.
    if (core.set_environment)      core.set_environment(retro_env_callback);
    if (core.set_video_refresh)    core.set_video_refresh(retro_video_cb);
    if (core.set_audio_sample)     core.set_audio_sample(retro_audio_cb);
    if (core.set_audio_sample_batch) core.set_audio_sample_batch(retro_audio_batch_cb);
    if (core.set_input_poll)       core.set_input_poll(retro_input_poll_cb);
    if (core.set_input_state)      core.set_input_state(retro_input_state_cb);

    // NOTE: core.init() is intentionally NOT called here.
    // It is called at the start of GameLoop so that init, load_game, and run
    // all execute on the same OS thread (Libretro TLS requirement).

    return true;
}

// ── JNI: initEngine ───────────────────────────────────────────────────────────
extern "C" JNIEXPORT jboolean JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_initEngine(JNIEnv* env, jobject, jstring corePath) {
    register_crash_handlers();

    const char* path = env->GetStringUTFChars(corePath, nullptr);
    g_corePath = path;
    env->ReleaseStringUTFChars(corePath, path);

    LOGI("initEngine invoked. Core path saved. Actual dlopen deferred to GameLoop thread.");
    return JNI_TRUE;
}

// ── JNI: injectCoreConfiguration ─────────────────────────────────────────────
extern "C" JNIEXPORT void JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_injectCoreConfiguration(JNIEnv* env, jobject, jstring configStr) {
    const char* cfg = env->GetStringUTFChars(configStr, nullptr);
    if (!cfg) return;

    // injectCoreConfiguration adds user-overrides; SET_VARIABLES fills in the rest
    // with core-declared defaults. User overrides take priority.
    std::string s(cfg);
    std::istringstream stream(s);
    std::string line;
    while (std::getline(stream, line)) {
        size_t eq = line.find('=');
        if (eq != std::string::npos) {
            std::string key = line.substr(0, eq);
            std::string val = line.substr(eq + 1);
            g_core_options[key] = val;
            LOGI("Injected Config: %s = %s", key.c_str(), val.c_str());
        }
    }

    env->ReleaseStringUTFChars(configStr, cfg);
}

// ── JNI: setSystemDirectory ───────────────────────────────────────────────────
extern "C" JNIEXPORT void JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_setSystemDirectory(JNIEnv* env, jobject, jstring sysDir, jstring saveDir) {
    const char* sd = env->GetStringUTFChars(sysDir,  nullptr);
    const char* sv = env->GetStringUTFChars(saveDir, nullptr);
    if (sd) { g_systemDir = sd; LOGI("System directory set to: %s", sd); }
    if (sv) { g_saveDir   = sv; LOGI("Save directory set to: %s",   sv); }
    env->ReleaseStringUTFChars(sysDir,  sd);
    env->ReleaseStringUTFChars(saveDir, sv);
}

// ── JNI: setSurface ───────────────────────────────────────────────────────────
extern "C" JNIEXPORT void JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_setSurface(JNIEnv* env, jobject, jobject surface) {
    if (g_window) {
        ANativeWindow_release(g_window);
        g_window       = nullptr;
        g_surfaceReady = false;
    }
    if (surface) {
        g_window       = ANativeWindow_fromSurface(env, surface);
        g_surfaceReady = true;
        LOGI("Surface do Android conectada à Engine Nativa");
    }
}

// ── JNI: loadGame ─────────────────────────────────────────────────────────────
extern "C" JNIEXPORT jboolean JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_loadGame(JNIEnv* env, jobject, jstring romPath, jstring sramPath) {
    // NOTE: core symbols are bound on the GameLoop thread, NOT here.
    // Do NOT check core.load_game here — it will be null at this point.

    const char* rPath = env->GetStringUTFChars(romPath,  nullptr);
    const char* sPath = env->GetStringUTFChars(sramPath, nullptr);
    g_romPath  = rPath ? rPath : "";
    g_sramPath = sPath ? sPath : "";
    env->ReleaseStringUTFChars(romPath,  rPath);
    env->ReleaseStringUTFChars(sramPath, sPath);

    LOGI("Starting GameLoop thread for: %s", g_romPath.c_str());

    // Safe restart: tear down any running session before spawning a new one
    if (g_engineRunning) {
        g_engineRunning = false;
        g_audioCv.notify_all();
        if (g_gameThread.joinable()) g_gameThread.join();
    }

    g_engineRunning = true;
    g_gameThread    = std::thread(GameLoop);
    return JNI_TRUE;
}

// ── JNI: saveState / loadState ────────────────────────────────────────────────
extern "C" JNIEXPORT jboolean JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_saveState(JNIEnv* env, jobject, jstring path) {
    if (!core.serialize_size || !core.serialize) return JNI_FALSE;
    const char* filepath = env->GetStringUTFChars(path, nullptr);

    size_t size = core.serialize_size();
    bool ok = false;
    if (size > 0) {
        void* data = malloc(size);
        ok = core.serialize(data, size);
        if (ok) {
            FILE* f = fopen(filepath, "wb");
            if (f) { fwrite(data, 1, size, f); fclose(f); }
            else   { ok = false; }
        }
        free(data);
    }

    env->ReleaseStringUTFChars(path, filepath);
    return ok ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_loadState(JNIEnv* env, jobject, jstring path) {
    if (!core.unserialize) return JNI_FALSE;
    const char* filepath = env->GetStringUTFChars(path, nullptr);

    FILE* f = fopen(filepath, "rb");
    bool ok = false;
    if (f) {
        fseek(f, 0, SEEK_END);
        size_t size = ftell(f);
        fseek(f, 0, SEEK_SET);
        void* data = malloc(size);
        fread(data, 1, size, f);
        fclose(f);
        ok = core.unserialize(data, size);
        free(data);
    }

    env->ReleaseStringUTFChars(path, filepath);
    return ok ? JNI_TRUE : JNI_FALSE;
}

// ── JNI: Framebuffer access ───────────────────────────────────────────────────
extern "C" JNIEXPORT jbyteArray JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_getFramebufferPixels(JNIEnv* env, jobject) {
    std::lock_guard<std::mutex> lock(g_videoMutex);
    if (g_videoBuffer.empty() || g_hw_render_active) return nullptr;
    jbyteArray result = env->NewByteArray((jsize)g_videoBuffer.size());
    env->SetByteArrayRegion(result, 0, (jsize)g_videoBuffer.size(),
                            (const jbyte*)g_videoBuffer.data());
    return result;
}

extern "C" JNIEXPORT jintArray JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_getFramebufferResolution(JNIEnv* env, jobject) {
    std::lock_guard<std::mutex> lock(g_videoMutex);
    jintArray result = env->NewIntArray(3);
    jint res[3] = { (jint)g_video_width, (jint)g_video_height, (jint)g_pixel_format };
    env->SetIntArrayRegion(result, 0, 3, res);
    return result;
}

// ── JNI: Input ────────────────────────────────────────────────────────────────
extern "C" JNIEXPORT void JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_sendInput(JNIEnv*, jobject, jint /*port*/, jint buttonId, jboolean isPressed) {
    if (buttonId >= 0 && buttonId < 16) {
        std::lock_guard<std::mutex> lock(g_inputMutex);
        g_input_state[buttonId] = isPressed;
    }
}

// ── JNI: Lifecycle ────────────────────────────────────────────────────────────
extern "C" JNIEXPORT void JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_pause(JNIEnv*, jobject) {
    g_enginePaused = true;
    LOGI("Engine paused");
}

extern "C" JNIEXPORT void JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_resume(JNIEnv*, jobject) {
    g_enginePaused = false;
    LOGI("Engine resumed");
}

extern "C" JNIEXPORT void JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_destroyEngine(JNIEnv*, jobject) {
    g_engineRunning    = false;
    g_enginePaused     = false;
    g_audioInitialized = false;
    g_audioCv.notify_all();

    if (bqPlayerPlay)
        (*bqPlayerPlay)->SetPlayState(bqPlayerPlay, SL_PLAYSTATE_STOPPED);

    if (g_gameThread.joinable())
        g_gameThread.join();

    LOGI("Engine destroyed");
}
