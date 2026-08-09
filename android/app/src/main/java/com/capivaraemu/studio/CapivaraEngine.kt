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
    external fun sendInput(port: Int, button: Int, isPressed: Boolean)
    external fun pause()
    external fun resume()
    external fun destroyEngine()
    external fun saveState(path: String): Boolean
    external fun loadState(path: String): Boolean
    
    external fun getFramebufferPixels(): ByteArray?
    external fun getFramebufferResolution(): IntArray

    // Phase 1.1: BIOS / System Directory injection
    external fun setSystemDirectory(systemDir: String, saveDir: String)
}
