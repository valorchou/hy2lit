package io.github.hy2mini

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.graphics.SurfaceTexture
import android.hardware.camera2.*
import android.media.ImageReader
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.os.Vibrator
import android.view.Surface
import android.view.TextureView
import android.widget.Toast
import com.google.zxing.BinaryBitmap
import com.google.zxing.MultiFormatReader
import com.google.zxing.PlanarYUVLuminanceSource
import com.google.zxing.common.HybridBinarizer

class QrScanActivity : Activity(), TextureView.SurfaceTextureListener {

    private lateinit var textureView: TextureView
    private var cameraDevice: CameraDevice? = null
    private var captureSession: CameraCaptureSession? = null
    private var imageReader: ImageReader? = null
    private var backgroundThread: HandlerThread? = null
    private var backgroundHandler: Handler? = null

    private val qrReader = MultiFormatReader()
    @Volatile private var isDecoded = false
    private var lastScanTime = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qr_scan)
        textureView = findViewById(R.id.texture_preview)
        textureView.surfaceTextureListener = this

        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.CAMERA), 101)
        }
    }

    override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
        startBackgroundThread()
        openCamera()
    }

    override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {}
    override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean = true
    override fun onSurfaceTextureUpdated(surface: SurfaceTexture) {}

    @SuppressLint("MissingPermission")
    private fun openCamera() {
        val manager = getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val cameraId = manager.cameraIdList.firstOrNull { id ->
            val chars = manager.getCameraCharacteristics(id)
            chars.get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_BACK
        } ?: return

        imageReader = ImageReader.newInstance(1280, 720, ImageFormat.YUV_420_888, 2).apply {
            setOnImageAvailableListener({ reader ->
                val image = reader.acquireLatestImage() ?: return@setOnImageAvailableListener
                val now = System.currentTimeMillis()
                if (isDecoded || now - lastScanTime < 200) {
                    image.close()
                    return@setOnImageAvailableListener
                }
                lastScanTime = now

                try {
                    val buffer = image.planes[0].buffer // 直接读取纯 Y (亮度) 通道
                    val bytes = ByteArray(buffer.remaining())
                    buffer.get(bytes)
                    val width = image.width
                    val height = image.height

                    val source = PlanarYUVLuminanceSource(bytes, width, height, 0, 0, width, height, false)
                    val bitmap = BinaryBitmap(HybridBinarizer(source))
                    val result = qrReader.decodeWithState(bitmap)
                    val text = result.text

                    if (text.startsWith("hy2://") || text.startsWith("hysteria2://")) {
                        isDecoded = true
                        (getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator)?.vibrate(100)
                        val data = Intent().putExtra("scanned_uri", text)
                        setResult(RESULT_OK, data)
                        finish()
                    }
                } catch (_: Exception) {
                } finally {
                    image.close()
                }
            }, backgroundHandler)
        }

        manager.openCamera(cameraId, object : CameraDevice.StateCallback() {
            override fun onOpened(camera: CameraDevice) {
                cameraDevice = camera
                createCameraPreviewSession()
            }
            override fun onDisconnected(camera: CameraDevice) { camera.close() }
            override fun onError(camera: CameraDevice, error: Int) { camera.close() }
        }, backgroundHandler)
    }

    private fun createCameraPreviewSession() {
        val texture = textureView.surfaceTexture ?: return
        texture.setDefaultBufferSize(1280, 720)
        val surface = Surface(texture)
        val readerSurface = imageReader?.surface ?: return

        cameraDevice?.createCaptureSession(listOf(surface, readerSurface), object : CameraCaptureSession.StateCallback() {
            override fun onConfigured(session: CameraCaptureSession) {
                captureSession = session
                val requestBuilder = cameraDevice?.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW)?.apply {
                    addTarget(surface)
                    addTarget(readerSurface)
                    set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
                } ?: return
                session.setRepeatingRequest(requestBuilder.build(), null, backgroundHandler)
            }
            override fun onConfigureFailed(session: CameraCaptureSession) {}
        }, backgroundHandler)
    }

    private fun startBackgroundThread() {
        backgroundThread = HandlerThread("CameraBackground").also { it.start() }
        backgroundHandler = Handler(backgroundThread?.looper!!)
    }

    override fun onDestroy() {
        captureSession?.close()
        cameraDevice?.close()
        imageReader?.close()
        backgroundThread?.quitSafely()
        super.onDestroy()
    }
}
