package com.capivaraemu.studio

import android.graphics.Bitmap
import android.util.Log
import java.io.ByteArrayOutputStream
import java.io.OutputStream
import java.net.ServerSocket
import java.net.Socket
import kotlin.concurrent.thread

object CastingServer {
    private var serverSocket: ServerSocket? = null
    private var isRunning = false
    private val TAG = "CastingServer"
    
    fun start(port: Int = 8080) {
        if (isRunning) return
        isRunning = true
        thread(start = true, name = "CastingServerThread") {
            try {
                serverSocket = ServerSocket(port)
                Log.i(TAG, "Casting Server started on port $port")
                while (isRunning) {
                    val client = serverSocket?.accept()
                    if (client != null) {
                        handleClient(client)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Server error", e)
            } finally {
                isRunning = false
            }
        }
    }
    
    fun stop() {
        isRunning = false
        serverSocket?.close()
        serverSocket = null
    }

    private fun handleClient(client: Socket) {
        thread {
            try {
                val input = client.getInputStream()
                val output = client.getOutputStream()
                val reader = input.bufferedReader()
                
                val reqLine = reader.readLine()
                if (reqLine != null) {
                    if (reqLine.startsWith("GET / ")) {
                        serveHtml(output)
                    } else if (reqLine.startsWith("GET /stream")) {
                        serveMjpegStream(output)
                    } else {
                        output.write("HTTP/1.1 404 Not Found\r\n\r\n".toByteArray())
                    }
                }
            } catch (e: Exception) {
            } finally {
                try { client.close() } catch(e: Exception) {}
            }
        }
    }

    private fun serveHtml(output: OutputStream) {
        val html = """
            <!DOCTYPE html>
            <html>
            <head><title>Capivara Cast</title></head>
            <body style="background:#000; margin:0; display:flex; justify-content:center; align-items:center; height:100vh; overflow:hidden;">
                <img src="/stream" style="width:100%; height:100%; object-fit:contain;" />
            </body>
            </html>
        """.trimIndent()
        
        val header = "HTTP/1.1 200 OK\r\n" +
                "Content-Type: text/html\r\n" +
                "Content-Length: ${html.length}\r\n" +
                "Connection: close\r\n\r\n"
        output.write(header.toByteArray())
        output.write(html.toByteArray())
        output.flush()
    }

    private fun serveMjpegStream(output: OutputStream) {
        val boundary = "CapivaraBoundary"
        val header = "HTTP/1.1 200 OK\r\n" +
                "Content-Type: multipart/x-mixed-replace; boundary=$boundary\r\n" +
                "Connection: keep-alive\r\n" +
                "Cache-Control: no-cache\r\n\r\n"
        output.write(header.toByteArray())
        output.flush()

        while (isRunning) {
            try {
                val res = CapivaraEngine.getFramebufferResolution()
                val pixels = CapivaraEngine.getFramebufferPixels()
                
                if (pixels != null && res[0] > 0 && res[1] > 0) {
                    val w = res[0]
                    val h = res[1]
                    val fmt = res[2] 
                    
                    // Fallback para RGB565 se nao for 8888
                    val conf = if (fmt == 1) Bitmap.Config.ARGB_8888 else Bitmap.Config.RGB_565
                    val bitmap = Bitmap.createBitmap(w, h, conf)
                    
                    bitmap.copyPixelsFromBuffer(java.nio.ByteBuffer.wrap(pixels))
                    
                    val bos = ByteArrayOutputStream()
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 70, bos)
                    val jpegData = bos.toByteArray()
                    
                    val frameHeader = "--$boundary\r\n" +
                            "Content-Type: image/jpeg\r\n" +
                            "Content-Length: ${jpegData.size}\r\n\r\n"
                    
                    output.write(frameHeader.toByteArray())
                    output.write(jpegData)
                    output.write("\r\n".toByteArray())
                    output.flush()
                }
                Thread.sleep(33) // ~30 FPS
            } catch (e: Exception) {
                break
            }
        }
    }
}
