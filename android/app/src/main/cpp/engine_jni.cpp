// engine_jni.cpp
// JNI interface layer — all exported functions callable from Kotlin/Java.
// This is the ONLY file that uses JNI types. All native logic lives in other modules.

#include "engine_globals.h"
#include "adapters/CoreAdapterFactory.h"

// ── Helper: load .so and bind all Libretro symbols ───────────────────────────
bool loadCore(const char* path) {
    // If a previous core is loaded, close it first
    if (g_core_handle) {
        dlclose(g_core_handle);
        g_core_handle = nullptr;
    }
    
    // GALVANIC ISOLATION: Purge variables from previous core
    g_core_options.clear();

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
    BIND_SYM(set_controller_port_device)
    BIND_SYM(cheat_reset)
    BIND_SYM(cheat_set)
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

    // Emulate JNI_OnLoad for Android-native libretro cores
    typedef jint (*JNI_OnLoad_t)(JavaVM*, void*);
    JNI_OnLoad_t jni_onload = (JNI_OnLoad_t)dlsym(g_core_handle, "JNI_OnLoad");
    if (jni_onload && g_javaVM) {
        LOGI("Calling JNI_OnLoad for core...");
        jni_onload(g_javaVM, nullptr);
    } else if (g_javaVM) {
        // Fallback for Play! core which doesn't export JNI_OnLoad but leaves SetJavaVM mangled
        typedef void (*SetJavaVM_t)(JavaVM*);
        SetJavaVM_t set_javavm = (SetJavaVM_t)dlsym(g_core_handle, "_ZN9Framework7CJavaVM9SetJavaVMEP7_JavaVM");
        if (set_javavm) {
            LOGI("Injecting JavaVM into Play! core via mangled CJavaVM::SetJavaVM...");
            set_javavm(g_javaVM);
        }
    }

    return true;
}

// ── JNI: initEngine ───────────────────────────────────────────────────────────
extern "C" JNIEXPORT jboolean JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_initEngine(JNIEnv* env, jobject, jstring corePath) {
    register_crash_handlers();

    env->GetJavaVM(&g_javaVM);

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
            if (key == "capivara_video_filter") {
                g_bilinearFilter.store(val == "Bilinear");
            } else if (key == "capivara_shader") {
                if (val == "CRT") g_activeShaderIndex.store(1);
                else if (val == "LCD") g_activeShaderIndex.store(2);
                else g_activeShaderIndex.store(0);
            } else {
                g_core_options[key] = val;
            }
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
    if (sv) { 
        g_saveDir = sv; 
        LOGI("Save directory set to: %s", sv); 
        // Set POSIX environment variables for Libretro cores (Fixes Flycast VMEM mmap errno 13)
        setenv("TMPDIR", sv, 1);
        setenv("HOME", sv, 1);
    }
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
        g_surfaceChanged = true;
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
    std::string sPath = filepath ? filepath : "";
    env->ReleaseStringUTFChars(path, filepath);
    if (sPath.empty()) return JNI_FALSE;

    if (!g_engineRunning) {
        // Direct fallback if engine is stopped
        std::lock_guard<std::mutex> lock(g_coreMutex);
        size_t size = core.serialize_size();
        bool ok = false;
        if (size > 0) {
            void* data = malloc(size);
            ok = core.serialize(data, size);
            if (ok) {
                FILE* f = fopen(sPath.c_str(), "wb");
                if (f) { fwrite(data, 1, size, f); fclose(f); }
                else   { ok = false; }
            }
            free(data);
        }
        return ok ? JNI_TRUE : JNI_FALSE;
    }

    // Thread-safe dispatch to GameLoop thread (where EGL Context is current)
    std::unique_lock<std::mutex> lock(g_stateOpMutex);
    g_pendingSavePath = sPath;
    g_pendingLoadPath = "";
    g_stateOpPending  = true;
    g_stateOpResult   = false;

    // Wait up to 3 seconds for GameLoop to serialize on the EGL thread
    bool signaled = g_stateOpCv.wait_for(lock, std::chrono::seconds(3), [] {
        return !g_stateOpPending;
    });

    return (signaled && g_stateOpResult) ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_loadState(JNIEnv* env, jobject, jstring path) {
    if (!core.unserialize) return JNI_FALSE;
    const char* filepath = env->GetStringUTFChars(path, nullptr);
    std::string sPath = filepath ? filepath : "";
    env->ReleaseStringUTFChars(path, filepath);
    if (sPath.empty()) return JNI_FALSE;

    if (!g_engineRunning) {
        // Direct fallback if engine is stopped
        std::lock_guard<std::mutex> lock(g_coreMutex);
        FILE* f = fopen(sPath.c_str(), "rb");
        bool ok = false;
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
        return ok ? JNI_TRUE : JNI_FALSE;
    }

    // Thread-safe dispatch to GameLoop thread (where EGL Context is current)
    std::unique_lock<std::mutex> lock(g_stateOpMutex);
    g_pendingLoadPath = sPath;
    g_pendingSavePath = "";
    g_stateOpPending  = true;
    g_stateOpResult   = false;

    // Wait up to 3 seconds for GameLoop to unserialize on the EGL thread
    bool signaled = g_stateOpCv.wait_for(lock, std::chrono::seconds(3), [] {
        return !g_stateOpPending;
    });

    return (signaled && g_stateOpResult) ? JNI_TRUE : JNI_FALSE;
}

// ── JNI: Framebuffer access ───────────────────────────────────────────────────
extern "C" JNIEXPORT jbyteArray JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_getFramebufferPixels(JNIEnv* env, jobject) {
    if (g_hw_render_active) {
        std::unique_lock<std::mutex> lock(g_screenshotMutex);
        g_screenshotRequest.store(true);
        // Wait up to 100ms for the GL thread to capture the screen
        if (g_screenshotCv.wait_for(lock, std::chrono::milliseconds(100), [] { return !g_screenshotRequest.load(); })) {
            jbyteArray result = env->NewByteArray((jsize)g_screenshotBuffer.size());
            env->SetByteArrayRegion(result, 0, (jsize)g_screenshotBuffer.size(),
                                    (const jbyte*)g_screenshotBuffer.data());
            return result;
        }
        return nullptr;
    }

    std::lock_guard<std::mutex> lock(g_videoMutex);
    if (g_videoBuffer.empty()) return nullptr;
    jbyteArray result = env->NewByteArray((jsize)g_videoBuffer.size());
    env->SetByteArrayRegion(result, 0, (jsize)g_videoBuffer.size(),
                            (const jbyte*)g_videoBuffer.data());
    return result;
}

extern "C" JNIEXPORT jintArray JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_getFramebufferResolution(JNIEnv* env, jobject) {
    std::lock_guard<std::mutex> lock(g_videoMutex);
    jintArray result = env->NewIntArray(3);
    // If HW render is active, pixels are captured as RGBA8888 (pixel_format = 1, assuming RETRO_PIXEL_FORMAT_XRGB8888)
    jint format = g_hw_render_active ? 1 : (jint)g_pixel_format;
    jint res[3] = { (jint)g_video_width, (jint)g_video_height, format };
    env->SetIntArrayRegion(result, 0, 3, res);
    return result;
}

extern "C" JNIEXPORT void JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_resetCheats(JNIEnv*, jobject) {
    if (core.cheat_reset) {
        std::lock_guard<std::mutex> lock(g_coreMutex);
        LOGI("JNI: cheat_reset called");
        core.cheat_reset();
    }
}

extern "C" JNIEXPORT void JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_applyCheat(JNIEnv* env, jobject, jint index, jboolean enabled, jstring code) {
    if (core.cheat_set) {
        std::lock_guard<std::mutex> lock(g_coreMutex);
        const char* codeCStr = env->GetStringUTFChars(code, nullptr);
        LOGI("JNI: applying cheat %d -> %s (enabled: %d)", index, codeCStr, enabled);
        core.cheat_set((unsigned)index, enabled, codeCStr);
        env->ReleaseStringUTFChars(code, codeCStr);
    }
}

// ── JNI: Input ────────────────────────────────────────────────────────────────
extern "C" JNIEXPORT void JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_sendInput(JNIEnv*, jobject, jint /*port*/, jint buttonId, jboolean isPressed) {
    if (buttonId >= 0 && buttonId < 16) {
        std::lock_guard<std::mutex> lock(g_inputMutex);
        g_input_state[buttonId] = isPressed;
    }
}

extern "C" JNIEXPORT void JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_setFastForward(JNIEnv*, jobject, jboolean enabled) {
    g_fastForward.store(enabled);
    LOGI("Fast Forward set to: %s", enabled ? "ENABLED" : "DISABLED");
}

extern "C" JNIEXPORT void JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_setFrameSkip(JNIEnv*, jobject, jint skip) {
    g_frameSkip.store(skip);
    LOGI("Frame Skip set to: %d", skip);
}

extern "C" JNIEXPORT void JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_sendAnalogInput(JNIEnv* /*env*/, jobject /*thiz*/,
                                                     jint port, jint index, jint id, jshort value) {
    if (port == 0 && index >= 0 && index < 2 && id >= 0 && id < 2) {
        std::lock_guard<std::mutex> lock(g_inputMutex);
        // Hardware-level deadzone / noise floor threshold (~10% of 32767 = ~3200)
        jshort cleanVal = value;
        if (cleanVal > -3200 && cleanVal < 3200) {
            cleanVal = 0;
        }
        g_analog_state[index][id] = cleanVal;
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

extern "C" JNIEXPORT jfloat JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_getCurrentFPS(JNIEnv*, jobject) {
    return g_currentFps.load();
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

// ── JNI: setVideoFilter ───────────────────────────────────────────────────────
// filter: 0=Sharp/Nearest, 1=Bilinear(Smooth), 2=CRT Scanlines, 3=LCD Grid
extern "C" JNIEXPORT void JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_setVideoFilter(JNIEnv*, jobject, jint filter) {
    // Bilinear toggle: 0=Nearest(Sharp), 1=Bilinear(Smooth)
    bool bilinear = (filter == 1);
    g_bilinearFilter.store(bilinear);

    // Update shader selection: 0=Sharp, 2=CRT, 3=LCD (1=bilinear uses shader 0)
    if (filter == 2) {
        g_activeShaderIndex.store(1); // CRT
    } else if (filter == 3) {
        g_activeShaderIndex.store(2); // LCD
    } else {
        g_activeShaderIndex.store(0); // Sharp or Smooth — same shader, different GL_LINEAR/GL_NEAREST
    }

    // Apply texture filter immediately if texture is already bound
    if (g_textureId != 0) {
        GLint texFilter = bilinear ? GL_LINEAR : GL_NEAREST;
        glBindTexture(GL_TEXTURE_2D, g_textureId);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, texFilter);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, texFilter);
    }

    LOGI("Video filter set to: %d (bilinear=%d, shaderIdx=%d)", filter, bilinear, g_activeShaderIndex.load());
}

// ── JNI: captureFramePixels — returns RGBA8888 pixels for screenshot ───────────
// Returns null if no software frame is available (HW render cores like PS2/N64).
extern "C" JNIEXPORT jbyteArray JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_captureFramePixels(JNIEnv* env, jobject) {
    std::lock_guard<std::mutex> lock(g_videoMutex);
    if (g_videoBuffer.empty()) return nullptr;

    // g_videoBuffer is already RGBA8888 (converted by retro_video_cb).
    // For RGB565 format, we need to convert to RGBA8888 first.
    if (g_pixel_format == RETRO_PIXEL_FORMAT_RGB565) {
        size_t pixelCount = g_video_width * g_video_height;
        std::vector<uint8_t> rgba(pixelCount * 4);
        const uint16_t* src = reinterpret_cast<const uint16_t*>(g_videoBuffer.data());
        for (size_t i = 0; i < pixelCount; i++) {
            uint16_t p = src[i];
            uint8_t r = ((p >> 11) & 0x1F) << 3; r |= r >> 5;
            uint8_t g = ((p >>  5) & 0x3F) << 2; g |= g >> 6;
            uint8_t b = ( p        & 0x1F) << 3; b |= b >> 5;
            rgba[i*4+0] = r;
            rgba[i*4+1] = g;
            rgba[i*4+2] = b;
            rgba[i*4+3] = 255;
        }
        jbyteArray result = env->NewByteArray((jsize)rgba.size());
        env->SetByteArrayRegion(result, 0, (jsize)rgba.size(), (const jbyte*)rgba.data());
        return result;
    }

    // RGBA8888 / XRGB8888 already converted by retro_video_cb
    jbyteArray result = env->NewByteArray((jsize)g_videoBuffer.size());
    env->SetByteArrayRegion(result, 0, (jsize)g_videoBuffer.size(),
                            (const jbyte*)g_videoBuffer.data());
    return result;
}

// ── JNI: getVideoResolution — width/height for screenshot bitmap creation ──────
extern "C" JNIEXPORT jintArray JNICALL
Java_com_capivaraemu_studio_CapivaraEngine_getVideoResolution(JNIEnv* env, jobject) {
    jintArray result = env->NewIntArray(2);
    jint res[2] = { (jint)g_video_width, (jint)g_video_height };
    env->SetIntArrayRegion(result, 0, 2, res);
    return result;
}

