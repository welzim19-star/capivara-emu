// engine_globals.cpp
// Definitions of all global state variables for the Capivara Engine.
// Every other module includes engine_globals.h and gets extern references to these.

#include "engine_globals.h"

// ── Surface & Core ─────────────────────────────────────────────────────────────
ANativeWindow*               g_window        = nullptr;
void*                        g_core_handle   = nullptr;
std::atomic<bool>            g_engineRunning(false);
std::atomic<bool>            g_audioInitialized(false);
std::atomic<bool>            g_fastForward{false};
std::atomic<bool>            g_bilinearFilter{true};
std::atomic<int>             g_frameSkip{0};
std::atomic<float>           g_currentFps{0.0f};
std::thread                  g_gameThread;
std::mutex                   g_inputMutex;
std::unordered_map<std::string, std::string> g_core_options;
std::string                  g_systemDir;
std::string                  g_saveDir;
std::atomic<bool>            g_surfaceReady(false);
bool                         g_input_state[16] = {false};
retro_pixel_format           g_pixel_format  = RETRO_PIXEL_FORMAT_0RGB1555;
unsigned                     g_video_width   = 320;
unsigned                     g_video_height  = 240;
RetroCoreAPI                 core            = {};

// ── Hardware Rendering ─────────────────────────────────────────────────────────
bool                         g_hw_render_active = false;
struct retro_hw_render_callback g_hw_render_cb = {};

// ── EGL / OpenGL ──────────────────────────────────────────────────────────────
EGLDisplay                   g_eglDisplay    = EGL_NO_DISPLAY;
EGLSurface                   g_eglSurface    = EGL_NO_SURFACE;
EGLContext                   g_eglContext    = EGL_NO_CONTEXT;
GLuint                       g_textureId     = 0;
GLuint                       g_shaderPrograms[3] = {0, 0, 0};
std::atomic<int>             g_activeShaderIndex(0);
GLuint                       g_vbo           = 0;
GLuint                       g_hw_fbo        = 0;
GLuint                       g_hw_fbo_tex    = 0;
GLuint                       g_hw_fbo_depth  = 0;

// ── Audio (OpenSL ES) ─────────────────────────────────────────────────────────
SLObjectItf                  engineObject            = nullptr;
SLEngineItf                  engineEngine;
SLObjectItf                  outputMixObject         = nullptr;
SLObjectItf                  bqPlayerObject          = nullptr;
SLPlayItf                    bqPlayerPlay;
SLAndroidSimpleBufferQueueItf bqPlayerBufferQueue;
int16_t                      g_audioBuffer[AUDIO_BUFFER_COUNT][AUDIO_FRAMES * AUDIO_CHANNELS];
int                          g_audioWriteIdx         = 0;
int                          g_audioReadIdx          = 0;
int                          g_audioWriteOffset      = 0;
std::mutex                   g_audioMutex;
std::condition_variable      g_audioCv;

// ── Video Buffer ──────────────────────────────────────────────────────────────
std::mutex                   g_videoMutex;
std::mutex                   g_coreMutex;
std::vector<uint8_t>         g_videoBuffer;
bool                         g_videoFrameReady       = false;

// HW Screenshot Sync
std::atomic<bool>            g_screenshotRequest{false};
std::vector<uint8_t>         g_screenshotBuffer;
std::mutex                   g_screenshotMutex;
std::condition_variable      g_screenshotCv;

// ── GameLoop State ──────────────────────────────────────────────────────────────
std::string                  g_romPath;
std::string                  g_sramPath;
int16_t                      g_analog_state[2][2] = {{0}};
std::atomic<bool>            g_enginePaused(false);
std::atomic<bool>            g_surfaceChanged(false);
JavaVM*                      g_javaVM = nullptr;

// ── Audio Resampler ───────────────────────────────────────────────────────────
double                       g_coreSampleRate        = 44100.0;
double                       g_resampleRatio         = 1.0;
double                       g_fraction              = 0.0;
int16_t                      g_lastLeft              = 0;
int16_t                      g_lastRight             = 0;
std::string                  g_corePath;
