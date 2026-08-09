// engine_video.cpp
// EGL/GLES3 rendering subsystem, pixel-format conversion, and Libretro video callback.

#include "engine_globals.h"

// ── Vertex & Fragment Shaders ─────────────────────────────────────────────────
static const char* kVertexShaderSrc =
    "#version 300 es\n"
    "in vec4 aPosition;\n"
    "in vec2 aTexCoord;\n"
    "out vec2 vTexCoord;\n"
    "void main() {\n"
    "  gl_Position = aPosition;\n"
    "  vTexCoord   = aTexCoord;\n"
    "}\n";

static const char* kFragmentShaderSrc =
    "#version 300 es\n"
    "precision mediump float;\n"
    "in vec2 vTexCoord;\n"
    "uniform sampler2D uTexture;\n"
    "out vec4 fragColor;\n"
    "void main() {\n"
    "  fragColor = vec4(texture(uTexture, vTexCoord).rgb, 1.0);\n"
    "}\n";

// ── Shader Compiler ───────────────────────────────────────────────────────────
GLuint compileShader(GLenum type, const char* src) {
    GLuint shader = glCreateShader(type);
    glShaderSource(shader, 1, &src, nullptr);
    glCompileShader(shader);
    GLint compiled;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
    if (!compiled) {
        char infoLog[512];
        glGetShaderInfoLog(shader, 512, nullptr, infoLog);
        LOGE("Shader compilation failed: %s", infoLog);
        glDeleteShader(shader);
        return 0;
    }
    return shader;
}

// ── EGL Initialization ────────────────────────────────────────────────────────
bool initEGL() {
    if (!g_window) return false;

    g_eglDisplay = eglGetDisplay(EGL_DEFAULT_DISPLAY);
    eglInitialize(g_eglDisplay, nullptr, nullptr);

    const EGLint attribs[] = {
        EGL_RENDERABLE_TYPE, EGL_OPENGL_ES3_BIT,
        EGL_BLUE_SIZE, 8, EGL_GREEN_SIZE, 8, EGL_RED_SIZE, 8,
        EGL_DEPTH_SIZE, 24, EGL_STENCIL_SIZE, 8,
        EGL_NONE
    };

    EGLConfig config;
    EGLint numConfigs;
    eglChooseConfig(g_eglDisplay, attribs, &config, 1, &numConfigs);

    const EGLint ctxAttribs3[] = {EGL_CONTEXT_CLIENT_VERSION, 3, EGL_NONE};
    g_eglContext = eglCreateContext(g_eglDisplay, config, EGL_NO_CONTEXT, ctxAttribs3);
    if (g_eglContext == EGL_NO_CONTEXT) {
        LOGI("GLES3 context failed — falling back to GLES2");
        const EGLint ctxAttribs2[] = {EGL_CONTEXT_CLIENT_VERSION, 2, EGL_NONE};
        g_eglContext = eglCreateContext(g_eglDisplay, config, EGL_NO_CONTEXT, ctxAttribs2);
    }

    g_eglSurface = eglCreateWindowSurface(g_eglDisplay, config, g_window, nullptr);

    if (eglMakeCurrent(g_eglDisplay, g_eglSurface, g_eglSurface, g_eglContext) == EGL_FALSE) {
        LOGE("Failed to make EGL context current");
        return false;
    }

    // Build shader program for software-rendered cores
    GLuint vs = compileShader(GL_VERTEX_SHADER,   kVertexShaderSrc);
    GLuint fs = compileShader(GL_FRAGMENT_SHADER, kFragmentShaderSrc);
    g_shaderProgram = glCreateProgram();
    glAttachShader(g_shaderProgram, vs);
    glAttachShader(g_shaderProgram, fs);
    glLinkProgram(g_shaderProgram);

    glGenTextures(1, &g_textureId);
    glBindTexture(GL_TEXTURE_2D, g_textureId);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);

    // Full-screen quad VBO
    float vertices[] = {
        -1.0f,  1.0f, 0.0f, 0.0f,
        -1.0f, -1.0f, 0.0f, 1.0f,
         1.0f, -1.0f, 1.0f, 1.0f,
         1.0f,  1.0f, 1.0f, 0.0f
    };
    glGenBuffers(1, &g_vbo);
    glBindBuffer(GL_ARRAY_BUFFER, g_vbo);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

    if (g_hw_render_active) setup_hw_fbo();

    return true;
}

// ── Hardware FBO Setup ────────────────────────────────────────────────────────
void setup_hw_fbo() {
    if (g_hw_fbo != 0) return;

    glGenFramebuffers(1, &g_hw_fbo);
    glBindFramebuffer(GL_FRAMEBUFFER, g_hw_fbo);

    glGenTextures(1, &g_hw_fbo_tex);
    glBindTexture(GL_TEXTURE_2D, g_hw_fbo_tex);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, 2048, 2048, 0, GL_RGBA, GL_UNSIGNED_BYTE, nullptr);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, g_hw_fbo_tex, 0);

    if (g_hw_render_cb.depth) {
        glGenRenderbuffers(1, &g_hw_fbo_depth);
        glBindRenderbuffer(GL_RENDERBUFFER, g_hw_fbo_depth);
        glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH_COMPONENT24, 2048, 2048);
        glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, g_hw_fbo_depth);
    }
}

// ── EGL Teardown ──────────────────────────────────────────────────────────────
void destroyEGL() {
    if (g_eglDisplay != EGL_NO_DISPLAY) {
        if (g_hw_fbo)       { glDeleteFramebuffers(1, &g_hw_fbo);        g_hw_fbo = 0; }
        if (g_hw_fbo_tex)   { glDeleteTextures(1, &g_hw_fbo_tex);        g_hw_fbo_tex = 0; }
        if (g_hw_fbo_depth) { glDeleteRenderbuffers(1, &g_hw_fbo_depth); g_hw_fbo_depth = 0; }
        if (g_hw_render_active && g_hw_render_cb.context_destroy)
            g_hw_render_cb.context_destroy();

        eglMakeCurrent(g_eglDisplay, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
        if (g_eglContext != EGL_NO_CONTEXT) eglDestroyContext(g_eglDisplay, g_eglContext);
        if (g_eglSurface != EGL_NO_SURFACE) eglDestroySurface(g_eglDisplay, g_eglSurface);
        eglTerminate(g_eglDisplay);
    }
    g_eglDisplay       = EGL_NO_DISPLAY;
    g_eglContext       = EGL_NO_CONTEXT;
    g_eglSurface       = EGL_NO_SURFACE;
    g_hw_render_active = false;
}

// ── Libretro Video Callback — Pixel Format Conversion ────────────────────────
void retro_video_cb(const void* data, unsigned width, unsigned height, size_t pitch) {
    if (data == RETRO_HW_FRAME_BUFFER_VALID) {
        // HW Render: frame is already in the OpenGL FBO, just update dimensions.
        g_video_width  = width;
        g_video_height = height;
        return;
    }
    if (!data) return;

    std::lock_guard<std::mutex> lock(g_videoMutex);

    // Log first frame so we can confirm video data is flowing
    static bool firstFrame = true;
    if (firstFrame) {
        firstFrame = false;
        LOGI("VIDEO: First frame received! %ux%u pitch=%zu pixel_format=%d",
             width, height, pitch, (int)g_pixel_format);
    }

    g_video_width  = width;
    g_video_height = height;

    if (g_pixel_format == RETRO_PIXEL_FORMAT_0RGB1555) {
        if (pitch < width * 2) return;
        size_t requiredSize = width * height * 4;
        if (g_videoBuffer.size() != requiredSize) g_videoBuffer.resize(requiredSize);

        const uint16_t* src    = (const uint16_t*)data;
        uint8_t*        dst    = g_videoBuffer.data();
        size_t srcPitchPixels  = pitch / 2;

        for (unsigned y = 0; y < height; ++y) {
            for (unsigned x = 0; x < width; ++x) {
                uint16_t pixel = src[y * srcPitchPixels + x];
                uint8_t r = (pixel & 0x7C00) >> 7; r |= (r >> 5);
                uint8_t g = (pixel & 0x03E0) >> 2; g |= (g >> 5);
                uint8_t b = (pixel & 0x001F) << 3; b |= (b >> 5);
                size_t outIdx = (y * width + x) * 4;
                dst[outIdx+0] = r; dst[outIdx+1] = g; dst[outIdx+2] = b; dst[outIdx+3] = 255;
            }
        }
    } else if (g_pixel_format == RETRO_PIXEL_FORMAT_XRGB8888) {
        if (pitch < width * 4) return;
        size_t requiredSize = width * height * 4;
        if (g_videoBuffer.size() != requiredSize) g_videoBuffer.resize(requiredSize);

        const uint32_t* src   = (const uint32_t*)data;
        uint8_t*        dst   = g_videoBuffer.data();
        size_t srcPitchPixels = pitch / 4;

        for (unsigned y = 0; y < height; ++y) {
            for (unsigned x = 0; x < width; ++x) {
                uint32_t pixel = src[y * srcPitchPixels + x];
                size_t outIdx  = (y * width + x) * 4;
                dst[outIdx+0] = (pixel >> 16) & 0xFF;
                dst[outIdx+1] = (pixel >>  8) & 0xFF;
                dst[outIdx+2] =  pixel        & 0xFF;
                dst[outIdx+3] = 255;
            }
        }
    } else { // RETRO_PIXEL_FORMAT_RGB565 — native; just copy rows
        if (pitch < width * 2) return;
        size_t requiredSize = width * height * 2;
        if (g_videoBuffer.size() != requiredSize) g_videoBuffer.resize(requiredSize);

        const uint8_t* src = (const uint8_t*)data;
        uint8_t*       dst = g_videoBuffer.data();
        for (unsigned y = 0; y < height; ++y)
            memcpy(dst + y * width * 2, src + y * pitch, width * 2);
    }

    g_videoFrameReady = true;
}

// ── Frame Renderer ────────────────────────────────────────────────────────────
// Uploads the video buffer as a GL texture and draws a full-screen quad.
void renderFrame() {
    if (g_eglDisplay == EGL_NO_DISPLAY || g_eglSurface == EGL_NO_SURFACE) {
        LOGE("renderFrame: EGL not ready! Display=%p Surface=%p",
             (void*)g_eglDisplay, (void*)g_eglSurface);
        return;
    }

    glBindFramebuffer(GL_FRAMEBUFFER, 0);
    glViewport(0, 0, ANativeWindow_getWidth(g_window), ANativeWindow_getHeight(g_window));
    glClearColor(0, 0, 0, 1);
    glClear(GL_COLOR_BUFFER_BIT);
    glUseProgram(g_shaderProgram);

    bool hasContent = false;
    {
        std::lock_guard<std::mutex> lock(g_videoMutex);
        if (!g_videoBuffer.empty() && !g_hw_render_active) {
            glBindTexture(GL_TEXTURE_2D, g_textureId);
            if (g_pixel_format == RETRO_PIXEL_FORMAT_RGB565) {
                glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, g_video_width, g_video_height,
                             0, GL_RGB, GL_UNSIGNED_SHORT_5_6_5, g_videoBuffer.data());
            } else {
                glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, g_video_width, g_video_height,
                             0, GL_RGBA, GL_UNSIGNED_BYTE, g_videoBuffer.data());
            }
            hasContent = true;
        } else if (g_hw_render_active) {
            glBindTexture(GL_TEXTURE_2D, g_hw_fbo_tex);
            hasContent = true;
        }
    }

    if (hasContent && g_video_width > 0 && g_video_height > 0) {
        glBindBuffer(GL_ARRAY_BUFFER, g_vbo);
        GLint posLoc = glGetAttribLocation(g_shaderProgram, "aPosition");
        GLint texLoc = glGetAttribLocation(g_shaderProgram, "aTexCoord");
        glEnableVertexAttribArray(posLoc);
        glVertexAttribPointer(posLoc, 2, GL_FLOAT, GL_FALSE, 4 * sizeof(float), (void*)0);

        float uMax = 1.0f, vMax = 1.0f;
        if (g_hw_render_active) {
            uMax = (float)g_video_width  / 2048.0f;
            vMax = (float)g_video_height / 2048.0f;
        }
        float texCoords[] = { 0.0f, 0.0f, 0.0f, vMax, uMax, vMax, uMax, 0.0f };
        if (g_hw_render_active && g_hw_render_cb.bottom_left_origin) {
            texCoords[1] = vMax; texCoords[3] = 0.0f;
            texCoords[5] = 0.0f; texCoords[7] = vMax;
        }

        glBindBuffer(GL_ARRAY_BUFFER, 0);
        glEnableVertexAttribArray(texLoc);
        glVertexAttribPointer(texLoc, 2, GL_FLOAT, GL_FALSE, 2 * sizeof(float), texCoords);

        GLushort indices[] = {0, 1, 2, 0, 2, 3};
        glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_SHORT, indices);

        glDisableVertexAttribArray(posLoc);
        glDisableVertexAttribArray(texLoc);
    }

    // ALWAYS swap — even if no content yet (clears to black cleanly)
    EGLBoolean swapOk = eglSwapBuffers(g_eglDisplay, g_eglSurface);
    if (!swapOk) {
        EGLint err = eglGetError();
        // EGL_BAD_SURFACE happens when the surface was destroyed by Android lifecycle
        if (err == EGL_BAD_SURFACE || err == EGL_BAD_NATIVE_WINDOW) {
            LOGE("renderFrame: EGL surface lost (err=0x%x). Stopping engine.", err);
            g_engineRunning = false;
        }
    }
}

