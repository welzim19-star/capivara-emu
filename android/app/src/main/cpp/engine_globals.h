#pragma once

// ── Standard Includes ──────────────────────────────────────────────────────────
#include <jni.h>
#include <android/log.h>
#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <EGL/egl.h>
#include <GLES3/gl3.h>
#include <SLES/OpenSLES.h>
#include <SLES/OpenSLES_Android.h>
#include <string>
#include <dlfcn.h>
#include <thread>
#include <atomic>
#include <mutex>
#include <condition_variable>
#include <vector>
#include <unordered_map>
#include <sstream>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdarg.h>
#include <signal.h>
#include <ucontext.h>
#include <cstring>
#include "libretro.h"

// ── Logging Macros ─────────────────────────────────────────────────────────────
#define LOG_TAG "CapivaraEngineNative"
#define LOGI(...) do { __android_log_print(ANDROID_LOG_INFO,  LOG_TAG, __VA_ARGS__); udp_log(__VA_ARGS__); } while(0)
#define LOGE(...) do { __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__); udp_log(__VA_ARGS__); } while(0)

// ── Libretro Core API Function Pointers ────────────────────────────────────────
struct RetroCoreAPI {
    void     (*init)(void);
    void     (*deinit)(void);
    unsigned (*api_version)(void);
    void     (*get_system_info)(struct retro_system_info *info);
    void     (*get_system_av_info)(struct retro_system_av_info *info);
    void     (*set_environment)(retro_environment_t);
    void     (*set_video_refresh)(retro_video_refresh_t);
    void     (*set_audio_sample)(retro_audio_sample_t);
    void     (*set_audio_sample_batch)(retro_audio_sample_batch_t);
    void     (*set_input_poll)(retro_input_poll_t);
    void     (*set_input_state)(retro_input_state_t);
    bool     (*load_game)(const struct retro_game_info *game);
    void     (*unload_game)(void);
    void     (*run)(void);
    size_t   (*serialize_size)(void);
    bool     (*serialize)(void *data, size_t size);
    bool     (*unserialize)(const void *data, size_t size);
    void    *(*get_memory_data)(unsigned id);
    size_t   (*get_memory_size)(unsigned id);
    void     (*set_controller_port_device)(unsigned port, unsigned device);
    void     (*cheat_reset)(void);
    void     (*cheat_set)(unsigned index, bool enabled, const char *code);
};

// ── Audio Constants ────────────────────────────────────────────────────────────
#define AUDIO_FRAMES       1024
#define AUDIO_CHANNELS     2
#define AUDIO_BUFFER_COUNT 4

// ── Global State Declarations (defined in engine_globals.cpp) ─────────────────
extern ANativeWindow*               g_window;
extern void*                        g_core_handle;
extern std::atomic<bool>            g_engineRunning;
extern std::atomic<bool>            g_audioInitialized;
extern std::atomic<bool>            g_fastForward;
extern std::atomic<bool>            g_bilinearFilter;
extern std::atomic<int>             g_frameSkip;
extern std::atomic<float>           g_currentFps;
extern std::thread                  g_gameThread;
extern std::mutex                   g_inputMutex;
extern std::unordered_map<std::string, std::string> g_core_options;
extern std::string                  g_systemDir;
extern std::string                  g_saveDir;
extern std::atomic<bool>            g_surfaceReady;
extern bool                         g_input_state[16];
extern retro_pixel_format           g_pixel_format;
extern unsigned                     g_video_width;
extern unsigned                     g_video_height;
extern RetroCoreAPI                 core;
extern bool                         g_hw_render_active;
extern struct retro_hw_render_callback g_hw_render_cb;
extern EGLDisplay                   g_eglDisplay;
extern EGLSurface                   g_eglSurface;
extern EGLContext                   g_eglContext;
extern GLuint                       g_textureId;
extern std::atomic<bool>            g_bilinearFilter;
extern std::atomic<int>             g_activeShaderIndex; // 0=Sharp, 1=CRT, 2=LCD
extern GLuint                       g_shaderPrograms[3];
extern GLuint                       g_vbo;
extern GLuint                       g_hw_fbo;
extern GLuint                       g_hw_fbo_tex;
extern GLuint                       g_hw_fbo_depth;
extern SLObjectItf                  engineObject;
extern SLEngineItf                  engineEngine;
extern SLObjectItf                  outputMixObject;
extern SLObjectItf                  bqPlayerObject;
extern SLPlayItf                    bqPlayerPlay;
extern SLAndroidSimpleBufferQueueItf bqPlayerBufferQueue;
extern int16_t                      g_audioBuffer[AUDIO_BUFFER_COUNT][AUDIO_FRAMES * AUDIO_CHANNELS];
extern int                          g_audioWriteIdx;
extern int                          g_audioReadIdx;
extern int                          g_audioWriteOffset;
extern std::mutex                   g_audioMutex;
extern std::condition_variable      g_audioCv;
extern std::mutex                   g_videoMutex;
extern std::mutex                   g_coreMutex;
extern std::vector<uint8_t>         g_videoBuffer;
extern bool                         g_videoFrameReady;

// HW Screenshot Sync
extern std::atomic<bool>            g_screenshotRequest;
extern std::vector<uint8_t>         g_screenshotBuffer;
extern std::mutex                   g_screenshotMutex;
extern std::condition_variable      g_screenshotCv;

extern std::string                  g_romPath;
extern std::string                  g_sramPath;
extern std::string                  g_corePath;

bool loadCore(const char* path);
extern std::atomic<bool>            g_enginePaused;
extern std::atomic<bool>            g_surfaceChanged;
extern double                       g_coreSampleRate;
extern double                       g_resampleRatio;
extern double                       g_fraction;
extern int16_t                      g_lastLeft;
extern int16_t                      g_lastRight;

extern JavaVM*                      g_javaVM;

// ── Input State ────────────────────────────────────────────────────────────────
extern bool                         g_input_state[16];
extern int16_t                      g_analog_state[2][2]; // [port][axis] (0=X, 1=Y)
extern std::mutex                   g_inputMutex;

// ── Cross-Module Function Declarations ────────────────────────────────────────
void    udp_log(const char* fmt, ...);
void    register_crash_handlers();
void    enqueueAudioSample(int16_t left, int16_t right);
void    bqPlayerCallback(SLAndroidSimpleBufferQueueItf bq, void *context);
void    retro_audio_cb(int16_t left, int16_t right);
size_t  retro_audio_batch_cb(const int16_t *data, size_t frames);
void    initAudio(double coreSampleRate);
bool    initEGL();
void    recreateEGLSurface();
void    destroyEGL();
void    setup_hw_fbo();
GLuint  compileShader(GLenum type, const char* src);
void    renderFrame(bool skipEglSwap = false);
void    retro_video_cb(const void *data, unsigned width, unsigned height, size_t pitch);
bool    retro_env_callback(unsigned cmd, void *data);
void    retro_input_poll_cb(void);
int16_t retro_input_state_cb(unsigned port, unsigned device, unsigned index, unsigned id);
void    GameLoop();
