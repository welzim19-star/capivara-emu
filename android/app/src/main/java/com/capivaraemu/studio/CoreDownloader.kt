package com.capivaraemu.studio

import android.content.Context
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.util.zip.ZipInputStream

class CoreDownloader(private val context: Context, private val udpLogger: (String) -> Unit) {

    private val TAG = "CoreDownloader"

    fun ensureCoreExists(coreFileName: String): String? {
        val coreFile = File(context.filesDir, coreFileName)
        
        if (coreFile.exists()) {
            if (coreFile.length() > 50000) {
                return coreFile.absolutePath
            } else {
                Log.w(TAG, "Corrupted core file detected (${coreFile.length()} bytes), deleting: $coreFileName")
                coreFile.delete()
            }
        }

        try {
            Log.i(TAG, "Downloading core: $coreFileName")
            val urlString = "https://buildbot.libretro.com/nightly/android/latest/arm64-v8a/$coreFileName.zip"
            val conn = URL(urlString).openConnection() as java.net.HttpURLConnection
            conn.connectTimeout = 10000
            conn.readTimeout = 15000
            
            if (conn.responseCode != 200) {
                Log.e(TAG, "HTTP ${conn.responseCode} when downloading core $coreFileName")
                return null
            }

            conn.inputStream.use { input ->
                ZipInputStream(input).use { zis ->
                    val entry = zis.nextEntry
                    if (entry != null) {
                        FileOutputStream(coreFile).use { output ->
                            zis.copyTo(output)
                        }
                    } else {
                        Log.e(TAG, "Empty zip for core: $coreFileName")
                        coreFile.delete()
                        return null
                    }
                }
            }
            if (coreFile.exists() && coreFile.length() > 50000) {
                return coreFile.absolutePath
            } else {
                coreFile.delete()
                return null
            }
        } catch (e: Exception) {
            udpLogger("Error downloading core: ${e.message}")
            Log.e(TAG, "Error downloading core: ${e.message}", e)
            coreFile.delete()
            return null
        }
    }
}
