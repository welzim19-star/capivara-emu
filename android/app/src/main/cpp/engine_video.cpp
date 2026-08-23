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

static const char* kFragmentShaderCRT =
    "#version 300 es\n"
    "precision mediump float;\n"
    "in vec2 vTexCoord;\n"
    "uniform sampler2D uTexture;\n"
    "out vec4 fragColor;\n"
    "void main() {\n"
    "  vec4 tex = texture(uTexture, vTexCoord);\n"
    "  float scanline = sin(vTexCoord.y * 800.0) * 0.1;\n"
    "  tex.rgb -= scanline;\n"
    "  fragColor = vec4(tex.rgb, 1.0);\n"
    "}\n";

static const char* kFragmentShaderLCD =
    "#version 300 es\n"
    "precision mediump float;\n"
    "in vec2 vTexCoord;\n"
    "uniform sampler2D uTexture;\n"
    "out vec4 fragColor;\n"
    "void main() {\n"
    "  vec4 tex = texture(uTexture, vTexCoord);\n"
    "  float gridX = mod(vTexCoord.x * 600.0, 1.0);\n"
    "  float gridY = mod(vTexCoord.y * 400.0, 1.0);\n"
    "  if(gridX < 0.1 || gridY < 0.1) tex.rgb *= 0.8;\n"
    "  fragColor = vec4(tex.rgb, 1.0);\n"
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

    // Disable VSync so that audio buffering paces the emulation loop!
    // This prevents micro-stuttering ("picotando") in cores with mismatched framerates (like PAL 50Hz).
    eglSwapInterval(g_eglDisplay, 0);

    // Build shader programs for software-rendered cores
    GLuint vs = compileShader(GL_VERTEX_SHADER,   kVertexShaderSrc);
    GLuint fsSharp = compileShader(GL_FRAGMENT_SHADER, kFragmentShaderSrc);
    GLuint fsCRT = compileShader(GL_FRAGMENT_SHADER, kFragmentShaderCRT);
    GLuint fsLCD = compileShader(GL_FRAGMENT_SHADER, kFragmentShaderLCD);
    
    for (int i = 0; i < 3; i++) {
        g_shaderPrograms[i] = glCreateProgram();
        glAttachShader(g_shaderPrograms[i], vs);
        if (i == 0) glAttachShader(g_shaderPrograms[i], fsSharp);
        if (i == 1) glAttachShader(g_shaderPrograms[i], fsCRT);
        if (i == 2) glAttachShader(g_shaderPrograms[i], fsLCD);
        glLinkProgram(g_shaderPrograms[i]);
    }

    glGenTextures(1, &g_textureId);
    glBindTexture(GL_TEXTURE_2D, g_textureId);
    GLint filter = g_bilinearFilter.load() ? GL_LINEAR : GL_NEAREST;
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, filter);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, filter);

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
    GLint filter = g_bilinearFilter.load() ? GL_LINEAR : GL_NEAREST;
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, filter);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, filter);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, g_hw_fbo_tex, 0);

    if (g_hw_render_cb.depth || g_hw_render_cb.stencil) {
        glGenRenderbuffers(1, &g_hw_fbo_depth);
        glBindRenderbuffer(GL_RENDERBUFFER, g_hw_fbo_depth);
        if (g_hw_render_cb.depth && g_hw_render_cb.stencil) {
            glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH24_STENCIL8, 2048, 2048);
            glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_STENCIL_ATTACHMENT, GL_RENDERBUFFER, g_hw_fbo_depth);
            LOGI("setup_hw_fbo: Attached packed GL_DEPTH24_STENCIL8 renderbuffer.");
        } else if (g_hw_render_cb.depth) {
            glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH_COMPONENT24, 2048, 2048);
            glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, g_hw_fbo_depth);
            LOGI("setup_hw_fbo: Attached GL_DEPTH_COMPONENT24 renderbuffer.");
        }
    }

    GLenum status = glCheckFramebufferStatus(GL_FRAMEBUFFER);
    if (status != GL_FRAMEBUFFER_COMPLETE) {
        LOGE("setup_hw_fbo: Framebuffer incomplete! status=0x%x", status);
    } else {
        LOGI("setup_hw_fbo: Framebuffer complete and active. FBO=%u Tex=%u Depth=%u", g_hw_fbo, g_hw_fbo_tex, g_hw_fbo_depth);
    }
}

// ── EGL Teardown ──────────────────────────────────────────────────────────────
void recreateEGLSurface() {
    if (g_eglDisplay == EGL_NO_DISPLAY || !g_window || g_eglContext == EGL_NO_CONTEXT) return;
    
    if (g_eglSurface != EGL_NO_SURFACE) {
        eglMakeCurrent(g_eglDisplay, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
        eglDestroySurface(g_eglDisplay, g_eglSurface);
        g_eglSurface = EGL_NO_SURFACE;
    }

    const EGLint attribs[] = {
        EGL_RENDERABLE_TYPE, EGL_OPENGL_ES3_BIT,
        EGL_BLUE_SIZE, 8, EGL_GREEN_SIZE, 8, EGL_RED_SIZE, 8,
        EGL_DEPTH_SIZE, 24, EGL_STENCIL_SIZE, 8,
        EGL_NONE
    };
    EGLConfig config;
    EGLint numConfigs;
    eglChooseConfig(g_eglDisplay, attribs, &config, 1, &numConfigs);

    g_eglSurface = eglCreateWindowSurface(g_eglDisplay, config, g_window, nullptr);
    if (eglMakeCurrent(g_eglDisplay, g_eglSurface, g_eglSurface, g_eglContext) == EGL_FALSE) {
        LOGE("Failed to make EGL context current after recreation");
    } else {
        LOGI("EGL Surface successfully recreated.");
    }
}

void destroyEGL() {
    if (g_eglDisplay != EGL_NO_DISPLAY) {
        if (g_hw_fbo)       { glDeleteFramebuffers(1, &g_hw_fbo);        g_hw_fbo = 0; }
        if (g_hw_fbo_tex)   { glDeleteTextures(1, &g_hw_fbo_tex);        g_hw_fbo_tex = 0; }
        if (g_hw_fbo_depth) { glDeleteRenderbuffers(1, &g_hw_fbo_depth); g_hw_fbo_depth = 0; }

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
    if (g_hw_render_active || data == RETRO_HW_FRAME_BUFFER_VALID) {
        // HW Render: frame is already in the OpenGL FBO, just update dimensions.
        if (width > 0 && height > 0) {
            g_video_width  = width;
            g_video_height = height;
        }
        g_videoFrameReady = true;
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
// Presents the rendered frame to the Android Native Window display.
void renderFrame(bool skipEglSwap) {
    if (g_eglDisplay == EGL_NO_DISPLAY || g_eglSurface == EGL_NO_SURFACE || !g_engineRunning) return;

    if (g_hw_render_active) {
        int winW = ANativeWindow_getWidth(g_window);
        int winH = ANativeWindow_getHeight(g_window);

        // Sanitize OpenGL pipeline state altered by 3D core
        glDisable(GL_SCISSOR_TEST);
        glDisable(GL_STENCIL_TEST);
        glDisable(GL_DEPTH_TEST);
        glDisable(GL_BLEND);
        glDisable(GL_CULL_FACE);
        glColorMask(GL_TRUE, GL_TRUE, GL_TRUE, GL_TRUE);
        glDepthMask(GL_FALSE);

        // Scale and center the 3D rendered frame from g_hw_fbo to the full Android display (4:3 aspect)
        if (winW > 0 && winH > 0) {
            int srcW = (g_video_width > 0) ? (int)g_video_width : 640;
            int srcH = (g_video_height > 0) ? (int)g_video_height : 480;

            float targetAspect = 4.0f / 3.0f;
            float windowAspect = (float)winW / (float)winH;
            int dstW, dstH, dstX, dstY;

            if (windowAspect > targetAspect) {
                dstH = winH;
                dstW = (int)(winH * targetAspect);
                dstX = (winW - dstW) / 2;
                dstY = 0;
            } else {
                dstW = winW;
                dstH = (int)(winW / targetAspect);
                dstX = 0;
                dstY = (winH - dstH) / 2;
            }

            // Clear black letterbox bars on the display
            glBindFramebuffer(GL_FRAMEBUFFER, 0);
            glViewport(0, 0, winW, winH);
            glClearColor(0, 0, 0, 1);
            glClear(GL_COLOR_BUFFER_BIT);

            // Blit from HW FBO to Window Framebuffer 0
            glBindFramebuffer(GL_READ_FRAMEBUFFER, g_hw_fbo);
            glBindFramebuffer(GL_DRAW_FRAMEBUFFER, 0);
            glBlitFramebuffer(0, 0, srcW, srcH,
                              dstX, dstY, dstX + dstW, dstY + dstH,
                              GL_COLOR_BUFFER_BIT, GL_LINEAR);
        }

        if (g_screenshotRequest.load()) {
            std::lock_guard<std::mutex> lock(g_screenshotMutex);
            if (winW > 0 && winH > 0) {
                g_screenshotBuffer.resize(winW * winH * 4);
                glReadPixels(0, 0, winW, winH, GL_RGBA, GL_UNSIGNED_BYTE, g_screenshotBuffer.data());
            }
            g_screenshotRequest.store(false);
            g_screenshotCv.notify_one();
        }

        if (!skipEglSwap) {
            EGLBoolean swapOk = eglSwapBuffers(g_eglDisplay, g_eglSurface);
            if (!swapOk) {
                EGLint err = eglGetError();
                if (err == EGL_BAD_SURFACE || err == EGL_BAD_NATIVE_WINDOW) {
                    LOGE("renderFrame: EGL surface lost (err=0x%x). Suspending rendering.", err);
                    g_eglSurface = EGL_NO_SURFACE;
                }
            }
        }
        return;
    }

    // 2D Software cores (SNES, NES, GBA, Genesis, Arcade): upload pixel buffer and draw textured quad
    glBindFramebuffer(GL_FRAMEBUFFER, 0);
    glViewport(0, 0, ANativeWindow_getWidth(g_window), ANativeWindow_getHeight(g_window));

    glDisable(GL_DEPTH_TEST);
    glDisable(GL_CULL_FACE);
    glDisable(GL_SCISSOR_TEST);
    glDisable(GL_STENCIL_TEST);
    glDisable(GL_BLEND);
    glColorMask(GL_TRUE, GL_TRUE, GL_TRUE, GL_TRUE);
    glDepthMask(GL_FALSE);

    glClearColor(0, 0, 0, 1);
    glClear(GL_COLOR_BUFFER_BIT);
    
    int activeShader = g_activeShaderIndex.load();
    if (activeShader < 0 || activeShader > 2) activeShader = 0;
    GLuint currentProgram = g_shaderPrograms[activeShader];
    glUseProgram(currentProgram);

    bool hasContent = false;
    {
        std::lock_guard<std::mutex> lock(g_videoMutex);
        glActiveTexture(GL_TEXTURE0);
        if (!g_videoBuffer.empty()) {
            glBindTexture(GL_TEXTURE_2D, g_textureId);
            if (g_pixel_format == RETRO_PIXEL_FORMAT_RGB565) {
                glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, g_video_width, g_video_height,
                             0, GL_RGB, GL_UNSIGNED_SHORT_5_6_5, g_videoBuffer.data());
            } else {
                glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, g_video_width, g_video_height,
                             0, GL_RGBA, GL_UNSIGNED_BYTE, g_videoBuffer.data());
            }
            hasContent = true;
        }
    }

    if (g_video_width == 0)  g_video_width = 320;
    if (g_video_height == 0) g_video_height = 240;

    if (hasContent) {
        GLint uTexLoc = glGetUniformLocation(currentProgram, "uTexture");
        if (uTexLoc >= 0) glUniform1i(uTexLoc, 0);

        float quadVertices[16] = {
            -1.0f,  1.0f, 0.0f, 0.0f,  // Top-Left
            -1.0f, -1.0f, 0.0f, 1.0f,  // Bottom-Left
             1.0f, -1.0f, 1.0f, 1.0f,  // Bottom-Right
             1.0f,  1.0f, 1.0f, 0.0f   // Top-Right
        };

        glBindBuffer(GL_ARRAY_BUFFER, g_vbo);
        glBufferData(GL_ARRAY_BUFFER, sizeof(quadVertices), quadVertices, GL_DYNAMIC_DRAW);

        GLint posLoc = glGetAttribLocation(currentProgram, "aPosition");
        GLint texLoc = glGetAttribLocation(currentProgram, "aTexCoord");
        if (posLoc >= 0) {
            glEnableVertexAttribArray(posLoc);
            glVertexAttribPointer(posLoc, 2, GL_FLOAT, GL_FALSE, 4 * sizeof(float), (void*)0);
        }
        if (texLoc >= 0) {
            glEnableVertexAttribArray(texLoc);
            glVertexAttribPointer(texLoc, 2, GL_FLOAT, GL_FALSE, 4 * sizeof(float), (void*)(2 * sizeof(float)));
        }

        GLushort indices[] = {0, 1, 2, 0, 2, 3};
        glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_SHORT, indices);

        if (posLoc >= 0) glDisableVertexAttribArray(posLoc);
        if (texLoc >= 0) glDisableVertexAttribArray(texLoc);
        glBindBuffer(GL_ARRAY_BUFFER, 0);
    }

    if (g_screenshotRequest.load()) {
        std::lock_guard<std::mutex> lock(g_screenshotMutex);
        size_t bufferSize = g_video_width * g_video_height * 4;
        g_screenshotBuffer.resize(bufferSize);
        glReadPixels(0, 0, g_video_width, g_video_height, GL_RGBA, GL_UNSIGNED_BYTE, g_screenshotBuffer.data());
        g_screenshotRequest.store(false);
        g_screenshotCv.notify_one();
    }

    // Skip swapping the buffers if fast forwarding is rapidly dropping frames
    if (skipEglSwap) {
        return;
    }

    // ALWAYS swap — even if no content yet (clears to black cleanly)
    EGLBoolean swapOk = eglSwapBuffers(g_eglDisplay, g_eglSurface);
    if (!swapOk) {
        EGLint err = eglGetError();
        // EGL_BAD_SURFACE happens when the surface was destroyed by Android lifecycle
        if (err == EGL_BAD_SURFACE || err == EGL_BAD_NATIVE_WINDOW) {
            LOGE("renderFrame: EGL surface lost (err=0x%x). Suspending rendering.", err);
            // Do NOT stop the engine, just suspend rendering by dropping the surface.
            g_eglSurface = EGL_NO_SURFACE;
        }
    }
}


