package com.capivaraemu.studio

import android.content.Context
import android.util.Log
import java.io.File

object CoreLoader {
    private const val TAG = "CapivaraCore"

    /**
     * Extrai o arquivo .so da pasta assets para codeCacheDir (SELinux-safe no Android 10+)
     * e retorna o caminho POSIX real para dlopen().
     */
    fun getNativeCorePath(context: Context, coreFileName: String): String? {
        return try {
            val internalCoreFile = File(context.codeCacheDir, coreFileName)
            if (!internalCoreFile.exists()) {
                context.assets.open("cores/${"$"}coreFileName").use { input ->
                    internalCoreFile.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }
                internalCoreFile.setExecutable(true)
            }
            Log.i(TAG, "Core loaded: ${"$"}{internalCoreFile.absolutePath}")
            internalCoreFile.absolutePath
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load core ${"$"}coreFileName: ${"$"}{e.message}")
            null
        }
    }

    fun getAvailableCores(context: Context): List<String> {
        return try {
            context.assets.list("cores")?.toList() ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }
}
