package io.github.hy2mini

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import io.nekohasekai.libbox.BoxService
import io.nekohasekai.libbox.InterfaceUpdateListener
import io.nekohasekai.libbox.Libbox
import io.nekohasekai.libbox.PlatformInterface
import io.nekohasekai.libbox.TunOptions
import java.io.File

class Hy2VpnService : VpnService(), PlatformInterface {

    companion object {
        const val ACTION_START = "io.github.hy2mini.START"
        const val ACTION_STOP = "io.github.hy2mini.STOP"
        const val CHANNEL_ID = "hy2_vpn_channel"
        const val NOTIFICATION_ID = 101

        @Volatile
        var isRunning = false
            private set
    }

    private var boxService: BoxService? = null
    private var tunFd: ParcelFileDescriptor? = null
    private var connectivityManager: ConnectivityManager? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    override fun onCreate() {
        super.onCreate()
        connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val configJson = intent.getStringExtra("config_json") ?: return START_NOT_STICKY
                startVpn(configJson)
            }
            ACTION_STOP -> {
                stopVpn()
            }
        }
        return START_NOT_STICKY
    }

    private fun startVpn(configJson: String) {
        if (isRunning) return

        val notification = buildForegroundNotification("Hysteria2 极速代理运行中")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        try {
            // 初始化 Go 内核服务
            boxService = Libbox.newService(configJson, this)
            boxService?.start()
            isRunning = true
            sendBroadcast(Intent("io.github.hy2mini.STATUS_CHANGED").putExtra("running", true))
        } catch (e: Exception) {
            e.printStackTrace()
            stopVpn()
        }
    }

    private fun stopVpn() {
        isRunning = false
        sendBroadcast(Intent("io.github.hy2mini.STATUS_CHANGED").putExtra("running", false))

        networkCallback?.let {
            connectivityManager?.unregisterNetworkCallback(it)
            networkCallback = null
        }

        try {
            boxService?.close()
        } catch (_: Exception) {}
        boxService = null

        try {
            tunFd?.close()
        } catch (_: Exception) {}
        tunFd = null

        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    /**
     * PlatformInterface: openTun 实现
     * 建立 TUN 接口、设置路由、配置黑名单分流应用，并将原生文件描述符转交 Go 内核
     */
    override fun openTun(options: TunOptions): Int {
        val builder = Builder()
            .setMtu(1400)
            .setSession("Hy2Mini-TUN")
            .addAddress("172.19.0.1", 30)
            .addAddress("fdfe:dcba:9876::1", 126)
            .addRoute("0.0.0.0", 0)
            .addRoute("::", 0)

        // 默认将自身加入白名单排除以防止回环
        try {
            builder.addDisallowedApplication(packageName)
        } catch (_: Exception) {}

        // 从 SharedPreferences 加载用户勾选的绕过国内应用
        val prefs = getSharedPreferences("hy2_prefs", Context.MODE_PRIVATE)
        val bypassApps = prefs.getStringSet("bypass_apps", emptySet()) ?: emptySet()
        for (pkg in bypassApps) {
            try {
                builder.addDisallowedApplication(pkg)
            } catch (_: Exception) {}
        }

        val pfd = builder.establish() ?: throw IllegalStateException("Cannot establish TUN")
        tunFd = pfd
        return pfd.detachFd()
    }

    /**
     * PlatformInterface: 保护物理套接字不被 TUN 重定向导致死循环
     */
    override fun autoDetectInterfaceControl(fd: Int) {
        protect(fd)
    }

    /**
     * PlatformInterface: 监听默认物理网卡变化 (Wi-Fi <-> 5G)，通知 Go 内核平滑迁移 QUIC 握手
     */
    override fun startDefaultInterfaceMonitor(listener: InterfaceUpdateListener) {
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                notifyInterface(network, listener)
            }

            override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) {
                notifyInterface(network, listener)
            }
        }
        networkCallback = callback
        connectivityManager?.registerNetworkCallback(request, callback)
    }

    private fun notifyInterface(network: Network, listener: InterfaceUpdateListener) {
        val linkProps = connectivityManager?.getLinkProperties(network) ?: return
        val caps = connectivityManager?.getNetworkCapabilities(network) ?: return
        val ifName = linkProps.interfaceName ?: return
        val isExpensive = !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
        val isConstrained = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_CONGESTED).not()

        // 查找接口索引
        val ifIndex = try {
            java.net.NetworkInterface.getByName(ifName)?.index ?: 0
        } catch (_: Exception) {
            0
        }

        listener.updateDefaultInterface(ifName, ifIndex, isExpensive, isConstrained)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Hy2Mini 运行状态",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "保持 VPN 后台服务稳定运行"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(content: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pi = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Hy2Mini 代理核心")
                .setContentText(content)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(pi)
                .setOngoing(true)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("Hy2Mini 代理核心")
                .setContentText(content)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(pi)
                .setOngoing(true)
                .build()
        }
    }

    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }
}
