package com.capivaraemu.studio

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall

class PS2Launcher(private val context: Context, private val udpLogger: (String) -> Unit) {

    fun launchPS2(coreName: String, romUriStr: String, call: PluginCall): Boolean {
        if (!coreName.contains("play_libretro") && !coreName.contains("nethersx2") && !coreName.contains("aethersx2")) {
            return false // Not a PS2 launch request
        }

        val nethersx2Packages = listOf(
            "xyz.aethersx2.android",
            "xyz.aethersx2.android.alpha",
            "xyz.aethersx2.android.beta",
            "com.nethersx2.android",
            "com.aethersx2.android",
            "xyz.nethersx2.android"
        )

        var launched = false
        for (pkg in nethersx2Packages) {
            try {
                // Bypass visibility checks by aggressively firing explicit intents
                val launchIntent = Intent(Intent.ACTION_MAIN).apply {
                    setClassName(pkg, "$pkg.MainActivity")
                    addCategory(Intent.CATEGORY_LAUNCHER)
                }

                if (romUriStr.isNotEmpty()) {
                    val parsedUri = Uri.parse(romUriStr)
                    launchIntent.action = Intent.ACTION_VIEW
                    launchIntent.setDataAndType(parsedUri, "*/*")
                    launchIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    launchIntent.putExtra("bootPath", romUriStr)
                }

                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                context.startActivity(launchIntent)
                launched = true
                udpLogger("Successfully launched PS2 engine via intent for package: $pkg")
                break
            } catch (e: android.content.ActivityNotFoundException) {
                // Try next package
            } catch (e: Exception) {
                udpLogger("Exception launching $pkg: ${e.message}")
            }
        }

        if (launched) {
            call.resolve(JSObject().put("success", true).put("message", "Launched in NetherSX2!"))
            return true
        } else {
            udpLogger("NetherSX2 explicit launch failed. Attempting ACTION_VIEW fallback...")
            try {
                val fallbackIntent = Intent(Intent.ACTION_VIEW)
                if (romUriStr.isNotEmpty()) {
                    fallbackIntent.setDataAndType(Uri.parse(romUriStr), "application/octet-stream")
                    fallbackIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                
                // Use Intent Chooser to let the user pick their emulator!
                val chooser = Intent.createChooser(fallbackIntent, "Escolha o Emulador de PS2")
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(chooser)
                
                call.resolve(JSObject().put("success", true).put("message", "Launched via Android Chooser"))
                return true
            } catch (e: Exception) {
                udpLogger("Fallback ACTION_VIEW failed: ${e.message}")
                call.reject("NetherSX2/AetherSX2 não detectado. Você precisa instalar um dos emuladores e associar os arquivos ISO a ele.")
                return true
            }
        }
    }
}
