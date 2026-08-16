package com.capivaraemu.studio

import android.view.Surface

object CapivaraEngine {
    init {
        // Carrega a nossa biblioteca C++ (que criaremos na Fase 2)
        System.loadLibrary("capivara-engine")
    }

    // --- Funções JNI Nativas ---
    external fun injectCoreConfiguration(config: String)
    external fun initEngine(corePath: String): Boolean
    external fun setSurface(surface: Surface)
    external fun loadGame(romPath: String, sramPath: String): Boolean
    // Gamepad Input
    external fun sendInput(port: Int, button: Int, isPressed: Boolean)
    external fun sendAnalogInput(port: Int, index: Int, id: Int, value: Short)
    external fun pause()
    external fun resume()
    external fun setFastForward(enabled: Boolean)
    external fun setFrameSkip(skip: Int)
    external fun destroyEngine()
    external fun saveState(path: String): Boolean
    external fun loadState(path: String): Boolean
    
    external fun getFramebufferPixels(): ByteArray?
    external fun getFramebufferResolution(): IntArray
    external fun getCurrentFPS(): Float

    // Phase 1.1: BIOS / System Directory injection
    external fun setSystemDirectory(systemDir: String, saveDir: String)

    // Season 2: Video Filters & Screenshot
    // filter: 0=Sharp, 1=Smooth(Bilinear), 2=CRT, 3=LCD
    external fun setVideoFilter(filter: Int)
    external fun captureFramePixels(): ByteArray?
    external fun getVideoResolution(): IntArray

    external fun resetCheats()
    external fun applyCheat(index: Int, enabled: Boolean, code: String)
}

