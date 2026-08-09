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

    override fun dispatchKeyEvent(event: android.view.KeyEvent): Boolean {
        if ((event.source and android.view.InputDevice.SOURCE_GAMEPAD) == android.view.InputDevice.SOURCE_GAMEPAD ||
            (event.source and android.view.InputDevice.SOURCE_JOYSTICK) == android.view.InputDevice.SOURCE_JOYSTICK) {
            
            val isPressed = event.action == android.view.KeyEvent.ACTION_DOWN
            var retroBtn = -1
            
            when (event.keyCode) {
                // Physical Bottom Button (Xbox A) -> RetroPad B (0)
                android.view.KeyEvent.KEYCODE_BUTTON_A -> retroBtn = 0
                
                // Physical Right Button (Xbox B) -> RetroPad A (8)
                android.view.KeyEvent.KEYCODE_BUTTON_B -> retroBtn = 8
                
                // Physical Left Button (Xbox X) -> RetroPad Y (1)
                android.view.KeyEvent.KEYCODE_BUTTON_X -> retroBtn = 1
                
                // Physical Top Button (Xbox Y) -> RetroPad X (9)
                android.view.KeyEvent.KEYCODE_BUTTON_Y -> retroBtn = 9
                
                android.view.KeyEvent.KEYCODE_BUTTON_SELECT -> retroBtn = 2
                android.view.KeyEvent.KEYCODE_BUTTON_START -> retroBtn = 3
                android.view.KeyEvent.KEYCODE_DPAD_UP -> retroBtn = 4
                android.view.KeyEvent.KEYCODE_DPAD_DOWN -> retroBtn = 5
                android.view.KeyEvent.KEYCODE_DPAD_LEFT -> retroBtn = 6
                android.view.KeyEvent.KEYCODE_DPAD_RIGHT -> retroBtn = 7
                android.view.KeyEvent.KEYCODE_BUTTON_L1 -> retroBtn = 10 // RETRO_DEVICE_ID_JOYPAD_L
                android.view.KeyEvent.KEYCODE_BUTTON_R1 -> retroBtn = 11 // RETRO_DEVICE_ID_JOYPAD_R
                android.view.KeyEvent.KEYCODE_BUTTON_L2 -> retroBtn = 12 // RETRO_DEVICE_ID_JOYPAD_L2
                android.view.KeyEvent.KEYCODE_BUTTON_R2 -> retroBtn = 13 // RETRO_DEVICE_ID_JOYPAD_R2
                android.view.KeyEvent.KEYCODE_BUTTON_THUMBL -> retroBtn = 14 // RETRO_DEVICE_ID_JOYPAD_L3
                android.view.KeyEvent.KEYCODE_BUTTON_THUMBR -> retroBtn = 15 // RETRO_DEVICE_ID_JOYPAD_R3
            }
            
            if (retroBtn != -1) {
                CapivaraEngine.sendInput(0, retroBtn, isPressed)
                // Intercept so Android won't process it (e.g. Button B as Back)
                return true 
            }
        }
        return super.dispatchKeyEvent(event)
    }

    override fun dispatchGenericMotionEvent(event: android.view.MotionEvent): Boolean {
        if ((event.source and android.view.InputDevice.SOURCE_JOYSTICK) == android.view.InputDevice.SOURCE_JOYSTICK &&
            event.action == android.view.MotionEvent.ACTION_MOVE) {
            
            val hatX = event.getAxisValue(android.view.MotionEvent.AXIS_HAT_X)
            val hatY = event.getAxisValue(android.view.MotionEvent.AXIS_HAT_Y)
            val axisX = event.getAxisValue(android.view.MotionEvent.AXIS_X)
            val axisY = event.getAxisValue(android.view.MotionEvent.AXIS_Y)
            
            val isLeft = hatX < -0.5f || axisX < -0.5f
            val isRight = hatX > 0.5f || axisX > 0.5f
            val isUp = hatY < -0.5f || axisY < -0.5f
            val isDown = hatY > 0.5f || axisY > 0.5f
            
            // D-Pad Left/Right
            CapivaraEngine.sendInput(0, 6, isLeft) // Left
            CapivaraEngine.sendInput(0, 7, isRight)  // Right
            
            // D-Pad Up/Down
            CapivaraEngine.sendInput(0, 4, isUp) // Up
            CapivaraEngine.sendInput(0, 5, isDown)  // Down
            
            return true
        }
        return super.dispatchGenericMotionEvent(event)
    }
}
