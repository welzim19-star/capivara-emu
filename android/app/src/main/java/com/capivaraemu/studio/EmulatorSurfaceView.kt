package com.capivaraemu.studio

import android.content.Context
import android.graphics.PixelFormat
import android.util.AttributeSet
import android.view.SurfaceHolder
import android.view.SurfaceView

class EmulatorSurfaceView(context: Context, attrs: AttributeSet? = null) : SurfaceView(context, attrs), SurfaceHolder.Callback {
    init {
        // Permite que a SurfaceView fique atrás do Capacitor e seja transparente até o jogo carregar
        holder.addCallback(this)
        holder.setFormat(PixelFormat.TRANSLUCENT)
        setZOrderMediaOverlay(false)
    }

    override fun surfaceCreated(holder: SurfaceHolder) {
        // Envia a surface para o C++ desenhar
        CapivaraEngine.setSurface(holder.surface)
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        // Notifica C++ sobre mudança de resolução
    }

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        CapivaraEngine.pause()
    }
}
