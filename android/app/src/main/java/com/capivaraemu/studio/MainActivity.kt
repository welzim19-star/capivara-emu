package com.capivaraemu.studio

import android.os.Bundle
import android.view.Gravity
import android.widget.FrameLayout
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    private lateinit var adMobManager: AdMobManager
    private var bannerAdView: AdView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        // Registrar nosso Plugin Customizado antes do super.onCreate
        registerPlugin(CapivaraPlugin::class.java)

        super.onCreate(savedInstanceState)
        
        // Setup Native SurfaceView behind Capacitor
        setupEmulatorSurface()

        // AdMob removed as requested
    }

    private fun setupEmulatorSurface() {
        val emulatorSurface = EmulatorSurfaceView(this)
        val params = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        )
        // Add to the bottom of the stack (index 0)
        (window.decorView as FrameLayout).addView(emulatorSurface, 0, params)
        
        // Make WebView transparent so the SurfaceView shows through
        bridge.webView.setBackgroundColor(android.graphics.Color.TRANSPARENT)
    }

    private fun loadBannerAd() {
        // Banner removed
    }

    override fun onPause() {
        bannerAdView?.pause()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        bannerAdView?.resume()
    }

    override fun onDestroy() {
        bannerAdView?.destroy()
        super.onDestroy()
    }

}
