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
import java.util.Timer
import java.util.TimerTask

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

        val sysDir = File(context.getExternalFilesDir(null), "system/bios")
        sysDir.mkdirs()
        

        val saveDir = File(context.getExternalFilesDir(null), "saves")
        saveDir.mkdirs()

        CapivaraEngine.setSystemDirectory(sysDir.absolutePath, saveDir.absolutePath)

        if (biosFileUriStr != null && biosFileName != null && biosFileUriStr.isNotEmpty()) {
            udpLog("Copying BIOS file $biosFileName across all system paths...")
            try {
                val biosUri = Uri.parse(biosFileUriStr)
                
                val targetDirs = listOf(
                    sysDir, // system/bios
                    File(context.getExternalFilesDir(null), "system"),
                    File(context.getExternalFilesDir(null), "system/dc"),
                    File(context.filesDir, "system"),
                    File(context.filesDir, "system/dc"),
                    context.filesDir,
                    context.cacheDir, // <-- MUST exist here for NeoGeo/FBNeo!
                    File(context.cacheDir, "roms"),
                    File(context.getExternalFilesDir(null), "system/pcsx2/bios")
                )

                for (dir in targetDirs) {
                    dir.mkdirs()
                    val targetFile = File(dir, biosFileName)
                    context.contentResolver.openInputStream(biosUri)?.use { input ->
                        FileOutputStream(targetFile).use { output -> input.copyTo(output) }
                    }
                }

                udpLog("BIOS Multi-Path Broadcast complete for: $biosFileName")
            } catch (e: Exception) {
                udpLog("Failed to copy BIOS: ${e.message}")
            }
        }

        // ── PS2 HIGH PERFORMANCE ENGINE BRIDGE (NetherSX2 / AetherSX2) ──
        if (coreName.contains("play_libretro") || coreName.contains("nethersx2") || coreName.contains("aethersx2")) {
            val ps2Launcher = PS2Launcher(context, CapivaraPlugin::udpLog)
            ps2Launcher.launchPS2(coreName, romUriStr, call)
            return
        }

        val coreDownloader = CoreDownloader(context, CapivaraPlugin::udpLog)
        val corePath = coreDownloader.ensureCoreExists(coreName)
        if (corePath == null) {
            udpLog("ensureCoreExists failed for $coreName")
            call.reject("Falha ao carregar ou baixar o core nativo: $coreName")
            return
        }

        udpLog("Core ready at: $corePath. Now copying ROM...")
        val romManager = RomManager(context, CapivaraPlugin::udpLog)
        val romPath = if (romUriStr.isEmpty()) "" else romManager.copyRomToCache(romUriStr, fileName, coreName)
        if (romPath == null) {
            udpLog("copyRomToCache failed!")
            call.reject("Falha ao resolver arquivo do jogo.")
            return
        }

        udpLog("ROM ready at: $romPath. Now injecting config...")
        CapivaraEngine.injectCoreConfiguration(configStr)

        val safeName = fileName.replace("[^a-zA-Z0-9.-]".toRegex(), "_")
        val sramPath = File(saveDir, "$safeName.srm").absolutePath

        udpLog("Calling native initEngine...")
        val initSuccess = CapivaraEngine.initEngine(corePath)
        if (initSuccess) {
            udpLog("initEngine SUCCESS. Loading Game...")
            CapivaraEngine.loadGame(romPath, sramPath)
            
            telemetryTimer?.cancel()
            telemetryTimer = Timer()
            telemetryTimer?.scheduleAtFixedRate(object : TimerTask() {
                override fun run() {
                    try {
                        val fps = CapivaraEngine.getCurrentFPS()
                        notifyListeners("onTelemetry", JSObject().put("fps", fps))
                    } catch (e: Exception) {}
                }
            }, 1000, 1000)

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
        val button = call.getInt("button") ?: 0
        val isPressed = call.getBoolean("isPressed") ?: false
        CapivaraEngine.sendInput(0, button, isPressed)
        call.resolve()
    }

    @PluginMethod
    fun updateCoreOptions(call: PluginCall) {
        val sb = java.lang.StringBuilder()
        val data = call.data
        if (data != null) {
            val keys = data.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                val value = data.getString(key)
                if (value != null) {
                    sb.append(key).append("=").append(value).append("\n")
                }
            }
        }
        CapivaraEngine.injectCoreConfiguration(sb.toString())
        call.resolve()
    }

    @PluginMethod
    fun sendAnalog(call: PluginCall) {
        val port = call.getInt("port") ?: 0
        val stick = call.getInt("stick") ?: 0 // 0 = left, 1 = right
        val x = call.getFloat("x") ?: 0f
        val y = call.getFloat("y") ?: 0f
        
        // Convert -1.0..1.0 float to INT16 (-32767..32767)
        val xShort = (x * 32767).toInt().toShort()
        val yShort = (y * 32767).toInt().toShort()
        
        // libretro IDs: 0 = X, 1 = Y
        CapivaraEngine.sendAnalogInput(port, stick, 0, xShort)
        CapivaraEngine.sendAnalogInput(port, stick, 1, yShort)
        call.resolve()
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



    @PluginMethod
    fun saveState(call: PluginCall) {
        val slot = call.getInt("slot", 0) ?: 0
        val path = File(context.cacheDir, "save_${slot}.state").absolutePath
        val success = CapivaraEngine.saveState(path)
        
        if (!success) {
            call.reject("Failed to save state")
            return
        }

        // Try to capture a thumbnail for the Save State UI
        var thumbBase64: String? = null
        try {
            val pixels = CapivaraEngine.captureFramePixels()
            val res = CapivaraEngine.getVideoResolution()
            
            if (pixels != null && res != null && res.size >= 2 && res[0] > 0 && res[1] > 0) {
                val width = res[0]
                val height = res[1]
                val argbPixels = IntArray(width * height)
                
                // Avoid allocating millions of Integer objects!
                val expectedBytes = width * height * 4
                val limit = if (pixels.size < expectedBytes) pixels.size / 4 else width * height
                
                for (i in 0 until limit) {
                    val r = pixels[i * 4 + 0].toInt() and 0xFF
                    val g = pixels[i * 4 + 1].toInt() and 0xFF
                    val b = pixels[i * 4 + 2].toInt() and 0xFF
                    argbPixels[i] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
                }
                
                val bmp = android.graphics.Bitmap.createBitmap(argbPixels, width, height, android.graphics.Bitmap.Config.ARGB_8888)
                val thumbW = 320
                val thumbH = (320.0 * height / width).toInt().coerceAtLeast(1)
                val thumbBmp = android.graphics.Bitmap.createScaledBitmap(bmp, thumbW, thumbH, true)
                val thumbOut = java.io.ByteArrayOutputStream()
                thumbBmp.compress(android.graphics.Bitmap.CompressFormat.JPEG, 60, thumbOut)
                thumbBase64 = "data:image/jpeg;base64," + android.util.Base64.encodeToString(thumbOut.toByteArray(), android.util.Base64.NO_WRAP)
                
                bmp.recycle()
                thumbBmp.recycle()
            }
        } catch (e: Exception) {
            udpLog("saveState thumbnail error: ${e.message}")
        }
        
        val ret = JSObject()
        ret.put("success", true)
        if (thumbBase64 != null) {
            ret.put("thumbnailBase64", thumbBase64)
        }
        val file = File(path)
        if (file.exists()) {
            ret.put("dataSizeKb", file.length() / 1024)
        }
        
        call.resolve(ret)
    }

    @PluginMethod
    fun resetCheats(call: PluginCall) {
        CapivaraEngine.resetCheats()
        call.resolve()
    }

    @PluginMethod
    fun applyCheat(call: PluginCall) {
        val index = call.getInt("index", 0)!!
        val enabled = call.getBoolean("enabled", true)!!
        val code = call.getString("code", "")!!
        
        CapivaraEngine.applyCheat(index, enabled, code)
        call.resolve()
    }

    override fun handleOnPause() {
        super.handleOnPause()
        udpLog("App Paused: Pausing Engine")
        try {
            CapivaraEngine.pause()
        } catch(e: Exception) {}
    }

    override fun handleOnResume() {
        super.handleOnResume()
        udpLog("App Resumed: Resuming Engine")
        try {
            CapivaraEngine.resume()
        } catch(e: Exception) {}
    }

    private var activeRomFd: ParcelFileDescriptor? = null
    private var telemetryTimer: Timer? = null
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
        val slot = call.getInt("slot", 0) ?: 0
        val path = File(context.cacheDir, "save_${slot}.state").absolutePath
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
    fun setFastForward(call: PluginCall) {
        val enabled = call.getBoolean("enabled", false) ?: false
        CapivaraEngine.setFastForward(enabled)
        call.resolve()
    }

    @PluginMethod
    fun setFrameSkip(call: PluginCall) {
        val skip = call.getInt("skip", 0) ?: 0
        CapivaraEngine.setFrameSkip(skip)
        call.resolve()
    }

    @PluginMethod
    fun destroyEngine(call: PluginCall) {
        udpLog("Destroying Engine...")
        telemetryTimer?.cancel()
        telemetryTimer = null
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

    @PluginMethod
    fun requestAllFilesAccess(call: PluginCall) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            if (!android.os.Environment.isExternalStorageManager()) {
                try {
                    val intent = Intent(android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                    intent.addCategory("android.intent.category.DEFAULT")
                    intent.data = Uri.parse("package:${context.packageName}")
                    startActivityForResult(call, intent, "allFilesAccessResult")
                } catch (e: Exception) {
                    val intent = Intent(android.provider.Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                    startActivityForResult(call, intent, "allFilesAccessResult")
                }
            } else {
                call.resolve(JSObject().put("granted", true))
            }
        } else {
            call.resolve(JSObject().put("granted", true))
        }
    }

    @ActivityCallback
    private fun allFilesAccessResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            val granted = android.os.Environment.isExternalStorageManager()
            call.resolve(JSObject().put("granted", granted))
        } else {
            call.resolve(JSObject().put("granted", true))
        }
    }

    // ── setVideoFilter ─────────────────────────────────────────────────────────
    // filter values: 0=Sharp(Nearest), 1=Smooth(Bilinear), 2=CRT, 3=LCD
    @PluginMethod
    fun setVideoFilter(call: PluginCall) {
        val filter = call.getInt("filter") ?: 0
        CapivaraEngine.setVideoFilter(filter)
        udpLog("setVideoFilter: $filter")
        call.resolve()
    }

    // ── takeScreenshot ─────────────────────────────────────────────────────────
    // Reads raw RGBA pixels from JNI, encodes to JPEG 75%, saves to Pictures/CapivaraEmu
    // and returns the base64 thumbnail (for SaveState cards).
    @PluginMethod
    fun takeScreenshot(call: PluginCall) {
        execute {
            try {
                val pixels = CapivaraEngine.captureFramePixels()
                val res    = CapivaraEngine.getVideoResolution()

                if (pixels == null || res == null || res.size < 2) {
                    call.reject("empty")
                    return@execute
                }

                val width  = res[0]
                val height = res[1]

                if (width <= 0 || height <= 0) {
                    call.reject("empty")
                    return@execute
                }

                // Create Bitmap from RGBA8888 pixel array
                val unsignedPixels = pixels.map { it.toInt() and 0xFF }.toIntArray()
                val argbPixels = IntArray(width * height)
                for (i in argbPixels.indices) {
                    val r = unsignedPixels[i * 4 + 0]
                    val g = unsignedPixels[i * 4 + 1]
                    val b = unsignedPixels[i * 4 + 2]
                    argbPixels[i] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
                }

                val bmp = android.graphics.Bitmap.createBitmap(argbPixels, width, height,
                    android.graphics.Bitmap.Config.ARGB_8888)

                // Save full-res JPEG to Pictures/CapivaraEmu
                val picturesDir = android.os.Environment.getExternalStoragePublicDirectory(
                    android.os.Environment.DIRECTORY_PICTURES)
                val capDir = java.io.File(picturesDir, "CapivaraEmu")
                capDir.mkdirs()
                val fileName = "screenshot_${System.currentTimeMillis()}.jpg"
                val file = java.io.File(capDir, fileName)
                FileOutputStream(file).use { out ->
                    bmp.compress(android.graphics.Bitmap.CompressFormat.JPEG, 90, out)
                }

                // Create small thumbnail (320×240) as base64 for SaveState cards
                val thumbW = 320
                val thumbH = (320.0 * height / width).toInt().coerceAtLeast(1)
                val thumbBmp = android.graphics.Bitmap.createScaledBitmap(bmp, thumbW, thumbH, true)
                val thumbOut = java.io.ByteArrayOutputStream()
                thumbBmp.compress(android.graphics.Bitmap.CompressFormat.JPEG, 60, thumbOut)
                val thumbBase64 = android.util.Base64.encodeToString(
                    thumbOut.toByteArray(), android.util.Base64.NO_WRAP)

                bmp.recycle()
                thumbBmp.recycle()

                udpLog("Screenshot saved: ${file.absolutePath}")
                call.resolve(JSObject()
                    .put("path", file.absolutePath)
                    .put("thumbnailBase64", "data:image/jpeg;base64,$thumbBase64"))

            } catch (e: Exception) {
                udpLog("takeScreenshot error: ${e.message}")
                call.reject("Screenshot failed: ${e.message}")
            }
        }
    }
}

