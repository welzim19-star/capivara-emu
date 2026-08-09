package com.capivaraemu.studio

import android.app.Activity
import android.content.Context
import android.util.Log
import com.google.android.gms.ads.*
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback

class AdMobManager(private val context: Context, private val activity: Activity) {
    private var interstitialAd: InterstitialAd? = null
    private val TAG = "CapivaraAdMob"

    // IDs de TESTE do Google - substitua pelos seus IDs reais antes de publicar
    private val INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712"
    val BANNER_AD_UNIT_ID = "ca-app-pub-3940256099942544/6300978111"

    fun initialize(onReady: () -> Unit = {}) {
        MobileAds.initialize(context) {
            Log.i(TAG, "AdMob SDK Initialized")
            loadInterstitialAd()
            onReady()
        }
    }

    private fun loadInterstitialAd() {
        val adRequest = AdRequest.Builder().build()
        InterstitialAd.load(context, INTERSTITIAL_AD_UNIT_ID, adRequest,
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialAd = ad
                    Log.i(TAG, "Interstitial Ad loaded")
                }
                override fun onAdFailedToLoad(error: LoadAdError) {
                    interstitialAd = null
                    Log.w(TAG, "Interstitial Ad failed: ${"$"}{error.message}")
                }
            })
    }

    fun showInterstitialIfFreeUser(isProUser: Boolean, onDismissed: () -> Unit) {
        if (isProUser) { onDismissed(); return }
        val ad = interstitialAd
        if (ad != null) {
            ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                override fun onAdDismissedFullScreenContent() {
                    loadInterstitialAd()
                    onDismissed()
                }
                override fun onAdFailedToShowFullScreenContent(error: AdError) {
                    loadInterstitialAd()
                    onDismissed()
                }
            }
            ad.show(activity)
        } else {
            loadInterstitialAd()
            onDismissed()
        }
    }
}
