// engine_audio.cpp
// OpenSL ES audio subsystem: ring buffer, resampler, and Libretro audio callbacks.

#include "engine_globals.h"

// ── Audio Queue Callback (OpenSL ES) ─────────────────────────────────────────
void bqPlayerCallback(SLAndroidSimpleBufferQueueItf bq, void* /*context*/) {
    std::lock_guard<std::mutex> lock(g_audioMutex);
    int nextReadIdx = (g_audioReadIdx + 1) % AUDIO_BUFFER_COUNT;

    if (nextReadIdx != g_audioWriteIdx) {
        (*bq)->Enqueue(bq, g_audioBuffer[g_audioReadIdx],
                       AUDIO_FRAMES * AUDIO_CHANNELS * sizeof(int16_t));
        g_audioReadIdx = nextReadIdx;
        g_audioCv.notify_all();
    } else {
        // Underflow — queue silence to keep the pipeline alive
        static int16_t silence[AUDIO_FRAMES * AUDIO_CHANNELS] = {0};
        (*bq)->Enqueue(bq, silence, sizeof(silence));
    }
}

// ── Linear Interpolation Resampler ───────────────────────────────────────────
void enqueueAudioSample(int16_t left, int16_t right) {
    if (!g_audioInitialized || !g_engineRunning) return;

    std::unique_lock<std::mutex> lock(g_audioMutex);

    auto writeOne = [&](int16_t l, int16_t r) {
        int nextWriteIdx = (g_audioWriteIdx + 1) % AUDIO_BUFFER_COUNT;
        while (nextWriteIdx == g_audioReadIdx && g_engineRunning) {
            if (g_fastForward.load()) {
                // Drop sample and return immediately so the emulator doesn't block!
                return;
            }
            g_audioCv.wait(lock);
        }
        if (!g_engineRunning) return;

        g_audioBuffer[g_audioWriteIdx][g_audioWriteOffset++] = l;
        g_audioBuffer[g_audioWriteIdx][g_audioWriteOffset++] = r;
        if (g_audioWriteOffset >= AUDIO_FRAMES * AUDIO_CHANNELS) {
            g_audioWriteOffset = 0;
            g_audioWriteIdx    = nextWriteIdx;
        }
    };

    if (g_resampleRatio == 1.0) {
        writeOne(left, right);
    } else {
        while (g_fraction < 1.0) {
            double a     = g_fraction;
            int16_t outL = (int16_t)(g_lastLeft  + a * (left  - g_lastLeft));
            int16_t outR = (int16_t)(g_lastRight + a * (right - g_lastRight));
            writeOne(outL, outR);
            g_fraction += g_resampleRatio;
        }
        g_fraction -= 1.0;
        g_lastLeft  = left;
        g_lastRight = right;
    }
}

// ── Libretro Audio Callbacks ──────────────────────────────────────────────────
void retro_audio_cb(int16_t left, int16_t right) {
    enqueueAudioSample(left, right);
}

size_t retro_audio_batch_cb(const int16_t* data, size_t frames) {
    if (!g_audioInitialized || !g_engineRunning || !data || frames == 0) return frames;

    std::unique_lock<std::mutex> lock(g_audioMutex);
    auto writeOneBatch = [&](int16_t l, int16_t r) {
        int nextWriteIdx = (g_audioWriteIdx + 1) % AUDIO_BUFFER_COUNT;
        while (nextWriteIdx == g_audioReadIdx && g_engineRunning) {
            if (g_fastForward.load()) return;
            g_audioCv.wait(lock);
        }
        if (!g_engineRunning) return;

        g_audioBuffer[g_audioWriteIdx][g_audioWriteOffset++] = l;
        g_audioBuffer[g_audioWriteIdx][g_audioWriteOffset++] = r;
        if (g_audioWriteOffset >= AUDIO_FRAMES * AUDIO_CHANNELS) {
            g_audioWriteOffset = 0;
            g_audioWriteIdx    = nextWriteIdx;
        }
    };

    if (g_resampleRatio == 1.0) {
        for (size_t i = 0; i < frames; i++) {
            writeOneBatch(data[i * 2], data[i * 2 + 1]);
        }
    } else {
        for (size_t i = 0; i < frames; i++) {
            int16_t left  = data[i * 2];
            int16_t right = data[i * 2 + 1];
            while (g_fraction < 1.0) {
                double a     = g_fraction;
                int16_t outL = (int16_t)(g_lastLeft  + a * (left  - g_lastLeft));
                int16_t outR = (int16_t)(g_lastRight + a * (right - g_lastRight));
                writeOneBatch(outL, outR);
                g_fraction += g_resampleRatio;
            }
            g_fraction -= 1.0;
            g_lastLeft  = left;
            g_lastRight = right;
        }
    }
    return frames;
}

// ── initAudio ─────────────────────────────────────────────────────────────────
void initAudio(double coreSampleRate) {
    if (coreSampleRate <= 0) coreSampleRate = 44100.0;
    g_coreSampleRate = coreSampleRate;
    g_resampleRatio  = coreSampleRate / 44100.0;
    g_fraction       = 0.0;
    g_lastLeft       = 0;
    g_lastRight      = 0;
    g_audioWriteIdx  = 0;
    g_audioReadIdx   = 0;
    g_audioWriteOffset = 0;
    g_audioInitialized = true;

    LOGI("Audio Resampler: Core %.1f Hz -> 44100 Hz (ratio: %.4f)",
         coreSampleRate, g_resampleRatio);

    slCreateEngine(&engineObject, 0, nullptr, 0, nullptr, nullptr);
    (*engineObject)->Realize(engineObject, SL_BOOLEAN_FALSE);
    (*engineObject)->GetInterface(engineObject, SL_IID_ENGINE, &engineEngine);

    (*engineEngine)->CreateOutputMix(engineEngine, &outputMixObject, 0, nullptr, nullptr);
    (*outputMixObject)->Realize(outputMixObject, SL_BOOLEAN_FALSE);

    // Choose closest native sample rate to avoid resampling whenever possible
    SLuint32 slSampleRate = SL_SAMPLINGRATE_44_1;
    if      (coreSampleRate >= 47900 && coreSampleRate <= 48100) { slSampleRate = SL_SAMPLINGRATE_48;    g_resampleRatio = 1.0; LOGI("Audio: native 48000 Hz"); }
    else if (coreSampleRate >= 31900 && coreSampleRate <= 32100) { slSampleRate = SL_SAMPLINGRATE_32;    g_resampleRatio = 1.0; LOGI("Audio: native 32000 Hz"); }
    else if (coreSampleRate >= 22000 && coreSampleRate <= 22100) { slSampleRate = SL_SAMPLINGRATE_22_05; g_resampleRatio = 1.0; LOGI("Audio: native 22050 Hz"); }
    else if (g_resampleRatio == 1.0) { LOGI("Audio: native 44100 Hz"); }

    SLDataLocator_AndroidSimpleBufferQueue loc_bufq = {SL_DATALOCATOR_ANDROIDSIMPLEBUFFERQUEUE, AUDIO_BUFFER_COUNT};
    SLDataFormat_PCM format_pcm = {
        SL_DATAFORMAT_PCM, AUDIO_CHANNELS, slSampleRate,
        SL_PCMSAMPLEFORMAT_FIXED_16, SL_PCMSAMPLEFORMAT_FIXED_16,
        SL_SPEAKER_FRONT_LEFT | SL_SPEAKER_FRONT_RIGHT, SL_BYTEORDER_LITTLEENDIAN
    };
    SLDataSource audioSrc = {&loc_bufq, &format_pcm};
    SLDataLocator_OutputMix loc_outmix = {SL_DATALOCATOR_OUTPUTMIX, outputMixObject};
    SLDataSink audioSnk = {&loc_outmix, nullptr};

    const SLInterfaceID ids[1] = {SL_IID_BUFFERQUEUE};
    const SLboolean     req[1] = {SL_BOOLEAN_TRUE};

    (*engineEngine)->CreateAudioPlayer(engineEngine, &bqPlayerObject, &audioSrc, &audioSnk, 1, ids, req);
    (*bqPlayerObject)->Realize(bqPlayerObject, SL_BOOLEAN_FALSE);
    (*bqPlayerObject)->GetInterface(bqPlayerObject, SL_IID_PLAY,        &bqPlayerPlay);
    (*bqPlayerObject)->GetInterface(bqPlayerObject, SL_IID_BUFFERQUEUE, &bqPlayerBufferQueue);

    (*bqPlayerBufferQueue)->RegisterCallback(bqPlayerBufferQueue, bqPlayerCallback, nullptr);
    (*bqPlayerPlay)->SetPlayState(bqPlayerPlay, SL_PLAYSTATE_PLAYING);
    bqPlayerCallback(bqPlayerBufferQueue, nullptr); // Kickstart
}
