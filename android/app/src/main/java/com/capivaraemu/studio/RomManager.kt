package com.capivaraemu.studio

import android.content.Context
import android.net.Uri
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.util.zip.ZipInputStream

class RomManager(private val context: Context, private val udpLogger: (String) -> Unit) {

    private val TAG = "RomManager"
    private var activeRomFd: android.os.ParcelFileDescriptor? = null

    fun getRealPathFromUri(uri: Uri): String? {
        val uriStr = uri.toString()

        // Legacy format: content://...primary%3A...
        if (uriStr.contains("primary%3A") || uriStr.contains("primary:")) {
            val decoded = Uri.decode(uriStr)
            val pathPart = decoded.substringAfterLast("primary:").trimStart('/')
            return "/storage/emulated/0/$pathPart"
        }

        // DocumentsContract format (Android 5.0+ SAF)
        try {
            if (android.provider.DocumentsContract.isDocumentUri(context, uri)) {
                val docId = android.provider.DocumentsContract.getDocumentId(uri)
                val split = docId.split(":")
                val storageType = split.getOrNull(0) ?: return null
                val relPath = split.getOrNull(1) ?: return null

                if (storageType.equals("primary", ignoreCase = true)) {
                    return "/storage/emulated/0/$relPath"
                } else {
                    return "/storage/$storageType/$relPath"
                }
            }
        } catch (e: Exception) {
            udpLogger("DocumentsContract path resolve failed: ${e.message}")
        }

        try {
            val cursor = context.contentResolver.query(uri, arrayOf("_data"), null, null, null)
            cursor?.use {
                if (it.moveToFirst()) {
                    val colIdx = it.getColumnIndex("_data")
                    if (colIdx >= 0) {
                        val path = it.getString(colIdx)
                        if (!path.isNullOrBlank()) return path
                    }
                }
            }
        } catch (e: Exception) {
            udpLogger("Content query for _data failed: ${e.message}")
        }

        return null
    }

    fun copyRomToCache(uriString: String, originalFileName: String, coreFileName: String): String? {
        udpLogger("copyRomToCache called for $originalFileName")
        try {
            activeRomFd?.close()
            activeRomFd = null

            val isMame = coreFileName.contains("mame") || coreFileName.contains("fbneo")
            val isFbneo = coreFileName.contains("fbneo")
            val isZip = originalFileName.lowercase().endsWith(".zip")
            val uri = Uri.parse(uriString)

            // ── 1. Direct Zero-Copy Path (Instant 0.01s boot for CHD, GDI, CDI, ISO, Z64, etc.) ──
            if (!isZip && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R && android.os.Environment.isExternalStorageManager()) {
                val realPath = getRealPathFromUri(uri)
                if (realPath != null && File(realPath).exists() && File(realPath).length() > 0) {
                    udpLogger("Using direct Zero-Copy filesystem path: $realPath (Instant Boot!)")
                    return realPath
                }
            }

            // ── 2. Check if ZIP content is already extracted in cache ──────────
            if (isZip && !isMame && !isFbneo) {
                val zipBase = originalFileName.substringBeforeLast(".").replace("[^a-zA-Z0-9.-]".toRegex(), "_")
                val possibleFiles = context.cacheDir.listFiles { _, name -> name.startsWith(zipBase) && !name.endsWith(".zip") }
                if (possibleFiles != null && possibleFiles.isNotEmpty() && possibleFiles[0].length() > 0) {
                    udpLogger("ZIP already extracted in cache: ${possibleFiles[0].name} (Instant Boot!)")
                    return possibleFiles[0].absolutePath
                }
            }

            val cacheFileName = if (isMame) originalFileName else originalFileName.replace("[^a-zA-Z0-9.-]".toRegex(), "_")
            val cacheFile = File(context.cacheDir, cacheFileName)

            if (cacheFile.exists() && cacheFile.length() > 0) {
                var sourceSize: Long = -1
                try {
                    context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                        val sizeIndex = cursor.getColumnIndex(android.provider.OpenableColumns.SIZE)
                        if (cursor.moveToFirst() && sizeIndex != -1) {
                            sourceSize = cursor.getLong(sizeIndex)
                        }
                    }
                } catch(e: Exception) {}

                if (sourceSize > 0 && cacheFile.length() == sourceSize) {
                    udpLogger("ROM already fully cached! Skipping copy for instant load.")
                    return cacheFile.absolutePath
                } else if (sourceSize == -1L && cacheFile.length() > 50000) {
                    udpLogger("ROM already substantially cached. Skipping copy.")
                    return cacheFile.absolutePath
                } else {
                    cacheFile.delete()
                }
            }

            if (uriString.startsWith("http")) {
                URL(uriString).openStream().use { input ->
                    FileOutputStream(cacheFile).use { output ->
                        input.copyTo(output)
                    }
                }
                return cacheFile.absolutePath
            }

            // Zero-Copy FileDescriptor symlink fallback
            val isLargeIsoCore = coreFileName.contains("nethersx2") || coreFileName.contains("ppsspp") || coreFileName.contains("flycast") || coreFileName.contains("play")
            if (isLargeIsoCore && !isZip) {
                udpLogger("Opening FileDescriptor for Zero-Copy...")
                activeRomFd = context.contentResolver.openFileDescriptor(uri, "r")
                if (activeRomFd != null) {
                    val fd = activeRomFd!!.fd
                    val fdPath = "/proc/self/fd/$fd"
                    try {
                        android.system.Os.symlink(fdPath, cacheFile.absolutePath)
                        udpLogger("Using Zero-Copy symlink for large ROM: ${cacheFile.absolutePath} -> $fdPath")
                        return cacheFile.absolutePath
                    } catch (e: Exception) {
                        udpLogger("Symlink failed (${e.message}), falling back to FD path: $fdPath")
                        return fdPath
                    }
                }
            }

            if (isZip && !isMame && !isFbneo) {
                udpLogger("ZIP detected for non-MAME core. Extracting first file...")
                context.contentResolver.openInputStream(uri)?.use { input ->
                    ZipInputStream(input).use { zis ->
                        val entry = zis.nextEntry
                        if (entry != null) {
                            val extractedFileName = entry.name.replace("[^a-zA-Z0-9.-]".toRegex(), "_")
                            val extractedFile = File(context.cacheDir, extractedFileName)
                            udpLogger("Extracting to: $extractedFileName")
                            FileOutputStream(extractedFile).use { output ->
                                zis.copyTo(output, 128 * 1024)
                            }
                            if (extractedFile.exists() && extractedFile.length() > 0) {
                                return extractedFile.absolutePath
                            }
                        }
                    }
                }
                udpLogger("Zip extraction failed, falling back to direct copy.")
            }

            udpLogger("Starting stream copy to cache...")
            context.contentResolver.openInputStream(uri)?.use { input ->
                FileOutputStream(cacheFile).use { output ->
                    input.copyTo(output, 128 * 1024)
                }
            }
            if (cacheFile.exists() && cacheFile.length() > 0) {
                return cacheFile.absolutePath
            } else {
                udpLogger("Stream copy failed or file empty.")
                Log.e(TAG, "Stream copy falhou ou arquivo vazio: $cacheFileName")
                return null
            }

        } catch (e: Exception) {
            udpLogger("copyRomToCache Exception: ${e.message}")
            Log.e(TAG, "copyRomToCache error: ${e.message}", e)
            return null
        }
    }
}
