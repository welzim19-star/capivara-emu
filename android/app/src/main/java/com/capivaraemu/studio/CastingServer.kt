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
            <head>
                <title>Capivara Cast</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <style>
                    body { background:#000; margin:0; display:flex; justify-content:center; align-items:center; height:100vh; overflow:hidden; }
                    #stream { width:100%; height:100%; object-fit:contain; transition: transform 0.3s ease; }
                    .hud { position:absolute; top:20px; right:20px; display:flex; flex-direction:column; gap:10px; opacity:0.3; transition: opacity 0.3s; z-index:999; }
                    .hud:hover { opacity:1; }
                    .btn { background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.3); color:#fff; padding:12px 20px; border-radius:8px; font-family:sans-serif; cursor:pointer; backdrop-filter:blur(5px); font-size:16px; font-weight:bold; }
                    .btn:hover { background:rgba(255,255,255,0.2); }
                </style>
                <script>
                    let currentZoom = 1;
                    let isFlipped = false;
                    
                    function toggleFit() {
                        const img = document.getElementById('stream');
                        img.style.objectFit = img.style.objectFit === 'cover' ? 'contain' : 'cover';
                    }
                    
                    function toggleFlip() {
                        isFlipped = !isFlipped;
                        updateTransform();
                    }
                    
                    function zoomIn() {
                        currentZoom += 0.5;
                        updateTransform();
                    }
                    
                    function zoomOut() {
                        currentZoom = Math.max(0.5, currentZoom - 0.5);
                        updateTransform();
                    }
                    
                    function updateTransform() {
                        const img = document.getElementById('stream');
                        img.style.transform = 'scale(' + currentZoom + ') ' + (isFlipped ? 'scaleY(-1)' : '');
                    }
                </script>
            </head>
            <body>
                <img id="stream" src="/stream" />
                <div class="hud">
                    <button class="btn" onclick="toggleFit()">↕️ Preencher/Ajustar</button>
                    <button class="btn" onclick="toggleFlip()">🔄 Inverter N64</button>
                    <button class="btn" onclick="zoomIn()">🔍 Zoom +</button>
                    <button class="btn" onclick="zoomOut()">🔍 Zoom -</button>
                </div>
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

        // Cache the standby frame to avoid generating it 30 times a second
        var standbyJpegData: ByteArray? = null

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
                } else {
                    if (standbyJpegData == null) {
                        val standbyBitmap = Bitmap.createBitmap(640, 480, Bitmap.Config.ARGB_8888)
                        val canvas = android.graphics.Canvas(standbyBitmap)
                        canvas.drawColor(android.graphics.Color.BLACK)
                        
                        val paint = android.graphics.Paint()
                        paint.color = android.graphics.Color.WHITE
                        paint.textSize = 30f
                        paint.textAlign = android.graphics.Paint.Align.CENTER
                        canvas.drawText("Aguardando jogo na Capivara...", 320f, 240f, paint)

                        val bos = ByteArrayOutputStream()
                        standbyBitmap.compress(Bitmap.CompressFormat.JPEG, 70, bos)
                        standbyJpegData = bos.toByteArray()
                    }
                    
                    val frameHeader = "--$boundary\r\n" +
                            "Content-Type: image/jpeg\r\n" +
                            "Content-Length: ${standbyJpegData!!.size}\r\n\r\n"
                    
                    output.write(frameHeader.toByteArray())
                    output.write(standbyJpegData!!)
                    output.write("\r\n".toByteArray())
                    output.flush()
                }
                Thread.sleep(100) // Lower FPS when waiting
            } catch (e: Exception) {
                break
            }
        }
    }
}
