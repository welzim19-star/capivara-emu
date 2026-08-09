package com.capivaraemu.studio

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.system.Os
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.activity.result.ActivityResult
import androidx.documentfile.provider.DocumentFile
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.URL
import java.util.zip.ZipInputStream

import kotlin.concurrent.thread

@CapacitorPlugin(name = "CapivaraEngine")
class CapivaraPlugin : Plugin() {

    companion object {
        const val TAG = "CapivaraPlugin"
        private val udpSocket = DatagramSocket()
        private val udpAddress = InetAddress.getByName("255.255.255.255")

        fun udpLog(msg: String) {
            Log.i(TAG, msg)
            thread {
                try {
                    val bytes = "JAVA: $msg".toByteArray()
                    udpSocket.send(DatagramPacket(bytes, bytes.size, udpAddress, 9999))
                } catch (e: Exception) {}
            }
        }
    }

    @PluginMethod
    fun pickRomDirectory(call: PluginCall) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        intent.addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
        startActivityForResult(call, intent, "pickDirectoryResult")
    }

    @ActivityCallback
    private fun pickDirectoryResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val data = result.data
        if (data == null || result.resultCode != Activity.RESULT_OK) {
            call.reject("User canceled")
            return
        }
        val uri = data.data
        if (uri == null) {
            call.reject("No URI returned")
            return
        }
        
        try {
            val takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            context.contentResolver.takePersistableUriPermission(uri, takeFlags)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        val df = DocumentFile.fromTreeUri(context, uri)
        if (df == null) {
            call.reject("Could not read DocumentFile")
            return
        }
        
        execute {
            try {
                val dir = DocumentFile.fromTreeUri(context, uri)
                if (dir == null || !dir.isDirectory) {
                    call.reject("Invalid directory")
                    return@execute
                }

                val filesArray = JSArray()
                dir.listFiles().forEach { file ->
                    if (file.isFile) {
                        val fileObj = JSObject()
                        fileObj.put("name", file.name ?: "Unknown")
                        fileObj.put("uri", file.uri.toString())
                        filesArray.put(fileObj)
                    }
                }
                
                val ret = JSObject()
                ret.put("files", filesArray)
                ret.put("directoryUri", uri.toString())
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Error parsing directory: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun scanRomDirectory(call: PluginCall) {
        val uriStr = call.getString("uri") ?: return call.reject("No URI")
        val uri = Uri.parse(uriStr)
        execute {
            try {
                val dir = DocumentFile.fromTreeUri(context, uri)
                if (dir == null || !dir.isDirectory) {
                    call.reject("Invalid directory")
                    return@execute
                }
                val filesArray = JSArray()
                dir.listFiles().forEach { file ->
                    if (file.isFile) {
                        val fileObj = JSObject()
                        fileObj.put("name", file.name ?: "Unknown")
                        fileObj.put("uri", file.uri.toString())
                        filesArray.put(fileObj)
                    }
                }
                val ret = JSObject()
                ret.put("files", filesArray)
                call.resolve(ret)
            } catch(e: Exception) {
                call.reject(e.message)
            }
        }
    }

    @PluginMethod
    fun startGame(call: PluginCall) {
        try {
            val coreName = call.getString("core")
            val romUriStr = call.getString("romUri") ?: ""
            val fileName = call.getString("fileName") ?: "rom.bin"
            val configMatrix = call.getObject("configMatrix")
            val biosFileUriStr = call.getString("biosFileUri")
            val biosFileName = call.getString("biosFileName")
            val romPathUriStr = call.getString("romPathUri")

            udpLog("StartGame requested! Core: $coreName | File: $fileName")

            if (coreName == null) {
                call.reject("Missing core")
                return
            }

        val sb = java.lang.StringBuilder()
        if (configMatrix != null) {
            val keys = configMatrix.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                val value = configMatrix.getString(key)
                if (value != null) {
                    sb.append(key).append("=").append(value).append("\n")
                }
            }
        }
        val configStr = sb.toString()

        val internalSystemDir = File(context.filesDir, "system").also { it.mkdirs() }
        val internalSaveDir   = File(context.filesDir, "saves").also  { it.mkdirs() }

        if (!biosFileUriStr.isNullOrEmpty() && !biosFileName.isNullOrEmpty()) {
            try {
                val sysUri = Uri.parse(biosFileUriStr)
                val targetName = if (coreName.contains("play") || coreName.contains("nethersx2")) "scph39001.bin" else biosFileName
                val destFile = File(internalSystemDir, targetName)
                
                context.contentResolver.openInputStream(sysUri)?.use { input ->
                    FileOutputStream(destFile).use { output -> input.copyTo(output) }
                }
                Log.i(TAG, "Copied single BIOS file to system dir as: $targetName")

                if (coreName.contains("mame") || coreName.contains("fbneo")) {
                    val cacheDestFile = File(context.cacheDir, targetName)
                    context.contentResolver.openInputStream(sysUri)?.use { input ->
                        FileOutputStream(cacheDestFile).use { output -> input.copyTo(output) }
                    }
                    Log.i(TAG, "Also copied BIOS file to cacheDir for MAME/FBNeo: $targetName")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not copy single BIOS file: ${e.message}")
            }
        }

        // MAME/FBNeo: Shadow Copy neogeo.zip directly from the ROM directory if present
        if (coreName.contains("mame") || coreName.contains("fbneo")) {
            if (!romPathUriStr.isNullOrEmpty()) {
                try {
                    val treeUri = Uri.parse(romPathUriStr)
                    val dir = DocumentFile.fromTreeUri(context, treeUri)
                    val neogeoFile = dir?.findFile("neogeo.zip")
                    if (neogeoFile != null) {
                        val cacheDestFile = File(context.cacheDir, "neogeo.zip")
                        context.contentResolver.openInputStream(neogeoFile.uri)?.use { input ->
                            FileOutputStream(cacheDestFile).use { output -> input.copyTo(output) }
                        }
                        udpLog("Shadow Copied neogeo.zip from ROM dir to cache!")
                    }
                } catch(e: Exception) {
                    udpLog("Failed to shadow copy neogeo.zip: ${e.message}")
                }
            }
        }

        CapivaraEngine.setSystemDirectory(internalSystemDir.absolutePath, internalSaveDir.absolutePath)

        val corePath = ensureCoreExists(coreName)
        if (corePath == null) {
            udpLog("ensureCoreExists failed for $coreName")
            call.reject("Falha ao carregar ou baixar o core nativo: $coreName")
            return
        }

        udpLog("Core ready at: $corePath. Now copying ROM...")
        val romPath = if (romUriStr.isEmpty()) "" else copyRomToCache(romUriStr, fileName, coreName)
        if (romPath == null) {
            udpLog("copyRomToCache failed!")
            call.reject("Falha ao resolver arquivo do jogo.")
            return
        }

        udpLog("ROM ready at: $romPath. Now injecting config...")
        CapivaraEngine.injectCoreConfiguration(configStr)

        val safeName = fileName.replace("[^a-zA-Z0-9.-]".toRegex(), "_")
        val sramPath = File(internalSaveDir, "$safeName.srm").absolutePath

        udpLog("Calling native initEngine...")
        val initSuccess = CapivaraEngine.initEngine(corePath)
        if (initSuccess) {
            udpLog("initEngine SUCCESS. Loading Game...")
            CapivaraEngine.loadGame(romPath, sramPath)
            call.resolve(JSObject().put("success", true).put("message", "Game Loaded!"))
        } else {
            udpLog("initEngine FAILED.")
            call.reject("Falha na JNI InitEngine")
        }
        } catch (e: Throwable) {
            udpLog("FATAL ERROR in startGame: ${e.message}")
            Log.e(TAG, "FATAL ERROR in startGame", e)
            call.reject("CRASH: ${e.message}", e as? Exception)
        }
    }

    @PluginMethod
    fun sendInput(call: PluginCall) {
        val button = call.getInt("button") ?: return
        val isPressed = call.getBoolean("isPressed") ?: return
        CapivaraEngine.sendInput(0, button, isPressed)
        call.resolve()
    }

    @PluginMethod
    fun takeScreenshot(call: PluginCall) {
        try {
            val pixels = CapivaraEngine.getFramebufferPixels()
                ?: run { call.reject("Framebuffer empty"); return }
            val res = CapivaraEngine.getFramebufferResolution()
            val w = res[0]; val h = res[1]; val fmt = res[2]

            val bmp = android.graphics.Bitmap.createBitmap(w, h, android.graphics.Bitmap.Config.ARGB_8888)
            val px = IntArray(w * h)
            when (fmt) {
                2 -> { // XRGB8888
                    for (i in 0 until w * h) {
                        val b = i * 4
                        val r = pixels[b + 2].toInt() and 0xFF
                        val g = pixels[b + 1].toInt() and 0xFF
                        val blue = pixels[b].toInt() and 0xFF
                        px[i] = android.graphics.Color.rgb(r, g, blue)
                    }
                }
                1 -> { // RGB565
                    for (i in 0 until w * h) {
                        val b = i * 2
                        val raw = ((pixels[b + 1].toInt() and 0xFF) shl 8) or (pixels[b].toInt() and 0xFF)
                        val r = (raw and 0xF800) shr 8
                        val g = (raw and 0x07E0) shr 3
                        val blue = (raw and 0x001F) shl 3
                        px[i] = android.graphics.Color.rgb(r, g, blue)
                    }
                }
                else -> { // 0RGB1555 fallback
                    for (i in 0 until w * h) {
                        val b = i * 2
                        val raw = ((pixels[b + 1].toInt() and 0xFF) shl 8) or (pixels[b].toInt() and 0xFF)
                        val r = (raw and 0x7C00) shr 7
                        val g = (raw and 0x03E0) shr 2
                        val blue = (raw and 0x001F) shl 3
                        px[i] = android.graphics.Color.rgb(r, g, blue)
                    }
                }
            }
            bmp.setPixels(px, 0, w, 0, 0, w, h)

            val screenshotDir = File(context.getExternalFilesDir(android.os.Environment.DIRECTORY_PICTURES), "CapivaraEmu")
            screenshotDir.mkdirs()
            val ts = System.currentTimeMillis()
            val outFile = File(screenshotDir, "screenshot_$ts.jpg")
            java.io.FileOutputStream(outFile).use { bmp.compress(android.graphics.Bitmap.CompressFormat.JPEG, 92, it) }

            val ret = JSObject()
            ret.put("path", outFile.absolutePath)
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "Screenshot failed: ${e.message}", e)
            call.reject("Screenshot failed: ${e.message}")
        }
    }

    @PluginMethod
    fun pickBiosFile(call: PluginCall) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT)
        intent.addCategory(Intent.CATEGORY_OPENABLE)
        intent.type = "*/*"
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        intent.addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
        startActivityForResult(call, intent, "pickBiosFileResult")
    }

    @ActivityCallback
    private fun pickBiosFileResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val data = result.data
        if (data == null || result.resultCode != Activity.RESULT_OK) {
            call.reject("User canceled")
            return
        }
        val uri = data.data ?: run { call.reject("No URI returned"); return }
        
        var name = "unknown_bios.bin"
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
            if (cursor.moveToFirst() && nameIndex != -1) {
                name = cursor.getString(nameIndex)
            }
        }

        try {
            val takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION
            context.contentResolver.takePersistableUriPermission(uri, takeFlags)
        } catch (e: Exception) { e.printStackTrace() }

        val ret = JSObject()
        ret.put("uri", uri.toString())
        ret.put("name", name)
        call.resolve(ret)
    }

    @PluginMethod
    fun listBiosFiles(call: PluginCall) {
        val systemDir = File(context.filesDir, "system")
        val files = systemDir.listFiles() ?: emptyArray()
        val arr = com.getcapacitor.JSArray()
        files.forEach { f ->
            val obj = JSObject()
            obj.put("name", f.name)
            obj.put("size", f.length())
            arr.put(obj)
        }
        val ret = JSObject()
        ret.put("files", arr)
        call.resolve(ret)
    }

    private fun ensureCoreExists(coreFileName: String): String? {
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
            udpLog("Error downloading core: ${e.message}")
            Log.e(TAG, "Error downloading core: ${e.message}", e)
            coreFile.delete()
            return null
        }
    }

    private fun copyRomToCache(uriString: String, originalFileName: String, coreFileName: String): String? {
        udpLog("copyRomToCache called for $originalFileName")
        try {
            // Fechar FD anterior se existir
            activeRomFd?.close()
            activeRomFd = null

            // MAME e FBNeo exigem o nome exato do arquivo zip. Outros usam sanitização segura.
            val isMame = coreFileName.contains("mame") || coreFileName.contains("fbneo")
            val cacheFileName = if (isMame) originalFileName else originalFileName.replace("[^a-zA-Z0-9.-]".toRegex(), "_")
            val cacheFile = File(context.cacheDir, cacheFileName)

            // Apagar symlink ou arquivo anterior
            if (cacheFile.exists()) {
                cacheFile.delete()
            }

            if (uriString.startsWith("http")) {
                // Para HTTP, somos obrigados a fazer download real
                URL(uriString).openStream().use { input ->
                    FileOutputStream(cacheFile).use { output ->
                        input.copyTo(output)
                    }
                }
                return cacheFile.absolutePath
            }

            val uri = Uri.parse(uriString)

            val isLargeIsoCore = coreFileName.contains("nethersx2") || coreFileName.contains("play") || coreFileName.contains("ppsspp")
            if (isLargeIsoCore) {
                udpLog("Opening FileDescriptor for Zero-Copy...")
                activeRomFd = context.contentResolver.openFileDescriptor(uri, "r")
                if (activeRomFd != null) {
                    val fd = activeRomFd!!.fd
                    val fdPath = "/proc/self/fd/$fd"
                    udpLog("Using Zero-Copy FD path for large ISO: $fdPath")
                    return fdPath
                } else {
                    udpLog("openFileDescriptor returned null!")
                }
            }

            // Stream Copy real
            if (originalFileName.lowercase().endsWith(".zip") && !isMame) {
                udpLog("ZIP detected for non-MAME core. Extracting first file...")
                context.contentResolver.openInputStream(uri)?.use { input ->
                    ZipInputStream(input).use { zis ->
                        val entry = zis.nextEntry
                        if (entry != null) {
                            val extractedFileName = entry.name.replace("[^a-zA-Z0-9.-]".toRegex(), "_")
                            val extractedFile = File(context.cacheDir, extractedFileName)
                            udpLog("Extracting to: $extractedFileName")
                            FileOutputStream(extractedFile).use { output ->
                                zis.copyTo(output, 128 * 1024)
                            }
                            if (extractedFile.exists() && extractedFile.length() > 0) {
                                return extractedFile.absolutePath
                            }
                        }
                    }
                }
                udpLog("Zip extraction failed, falling back to direct copy.")
            }

            udpLog("Starting stream copy to cache...")
            context.contentResolver.openInputStream(uri)?.use { input ->
                FileOutputStream(cacheFile).use { output ->
                    input.copyTo(output, 128 * 1024)
                }
            }
            if (cacheFile.exists() && cacheFile.length() > 0) {
                return cacheFile.absolutePath
            } else {
                udpLog("Stream copy failed or file empty.")
                Log.e(TAG, "Stream copy falhou ou arquivo vazio: $cacheFileName")
                return null
            }

        } catch (e: Exception) {
            udpLog("copyRomToCache Exception: ${e.message}")
            Log.e(TAG, "copyRomToCache error: ${e.message}", e)
            return null
        }
    }

    @PluginMethod
    fun saveState(call: PluginCall) {
        val path = File(context.cacheDir, "save.state").absolutePath
        val success = CapivaraEngine.saveState(path)
        if (success) {
            call.resolve()
        } else {
            call.reject("Failed to save state")
        }
    }

    private var activeRomFd: ParcelFileDescriptor? = null
    private var logcatProcess: Process? = null

    @PluginMethod
    fun startLogStream(call: PluginCall) {
        if (logcatProcess != null) {
            logcatProcess?.destroy()
        }
        
        Thread {
            try {
                // Clear existing logcat
                Runtime.getRuntime().exec("logcat -c").waitFor()
                
                // Start streaming logcat for our app only (filter by PID or just general)
                val pid = android.os.Process.myPid()
                logcatProcess = Runtime.getRuntime().exec("logcat --pid=$pid -v time")
                val reader = java.io.BufferedReader(java.io.InputStreamReader(logcatProcess!!.inputStream))
                
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    val data = JSObject()
                    data.put("log", line)
                    notifyListeners("onLogLine", data)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Logcat stream error", e)
            }
        }.start()
        
        call.resolve()
    }

    @PluginMethod
    fun stopLogStream(call: PluginCall) {
        logcatProcess?.destroy()
        logcatProcess = null
        call.resolve()
    }

    override fun load() {
    }

    @PluginMethod
    fun loadState(call: PluginCall) {
        val path = File(context.cacheDir, "save.state").absolutePath
        val success = CapivaraEngine.loadState(path)
        if (success) {
            call.resolve()
        } else {
            call.reject("Failed to load state")
        }
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        CapivaraEngine.pause()
        call.resolve()
    }

    @PluginMethod
    fun resume(call: PluginCall) {
        CapivaraEngine.resume()
        call.resolve()
    }

    @PluginMethod
    fun destroyEngine(call: PluginCall) {
        CapivaraEngine.destroyEngine()
        call.resolve()
    }

    @PluginMethod
    fun startCasting(call: PluginCall) {
        CastingServer.start(8080)
        call.resolve()
    }

    @PluginMethod
    fun stopCasting(call: PluginCall) {
        CastingServer.stop()
        call.resolve()
    }
}
