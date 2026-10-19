export interface Phase2FileItem {
  id: string;
  name: string;
  path: string;
  package: string;
  badge: string;
  lines: number;
  description: string;
  code: string;
}

export const PHASE_2_FILES: Phase2FileItem[] = [
  {
    id: 'Hy2ConfigParser',
    name: 'Hy2ConfigParser.kt',
    path: 'app/src/main/java/io/github/hy2mini/Hy2ConfigParser.kt',
    package: 'io.github.hy2mini',
    badge: 'URI 解析 & 测速工具',
    lines: 145,
    description: '负责 hy2:// 协议解析、mport 端口跳跃、Salamander 混淆、Brutal 流控参数提取、sing-box JSON 动态拼接与 15 行极简真连接 204 测速。',
    code: `package io.github.hy2mini

import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

data class Hy2Node(
    val id: String = UUID.randomUUID().toString(),
    val remarks: String,
    val rawUri: String,
    val host: String,
    val port: Int,
    val auth: String,
    val sni: String,
    val insecure: Boolean = false,
    val obfsType: String? = null,
    val obfsPassword: String? = null,
    val serverPorts: String? = null,
    val upMbps: Int? = null,
    val downMbps: Int? = null
)

object Hy2ConfigParser {

    /**
     * 解析标准 hy2:// 与 hysteria2:// URI
     * hy2://[auth]@[host]:[port]/?sni=[sni]&insecure=[0|1]&obfs=[salamander]&obfs-password=[pwd]&mport=[port-range]&upmbps=[int]&downmbps=[int]#[remarks]
     */
    fun parseUri(uriString: String): Hy2Node {
        val trimmed = uriString.trim()
        val standardUriString = if (trimmed.startsWith("hysteria2://")) {
            "hy2://" + trimmed.substring(12)
        } else trimmed

        val parsed = Uri.parse(standardUriString)
        val userInfo = parsed.userInfo ?: ""
        val host = parsed.host ?: throw IllegalArgumentException("Missing host in URI")
        val port = if (parsed.port != -1) parsed.port else 443
        val remarks = if (!parsed.fragment.isNullOrBlank()) parsed.fragment!! else "$host:$port"

        val sni = parsed.getQueryParameter("sni")?.takeIf { it.isNotBlank() } ?: host
        val insecure = parsed.getQueryParameter("insecure") == "1"
        val obfs = parsed.getQueryParameter("obfs")
        val obfsPwd = parsed.getQueryParameter("obfs-password")
        val mport = parsed.getQueryParameter("mport")
        val upMbps = parsed.getQueryParameter("upmbps")?.toIntOrNull()
        val downMbps = parsed.getQueryParameter("downmbps")?.toIntOrNull()

        return Hy2Node(
            remarks = remarks,
            rawUri = trimmed,
            host = host,
            port = port,
            auth = userInfo,
            sni = sni,
            insecure = insecure,
            obfsType = obfs,
            obfsPassword = obfsPwd,
            serverPorts = mport?.replace('-', ':'),
            upMbps = upMbps,
            downMbps = downMbps
        )
    }

    /**
     * 动态生成 sing-box 运行配置 JSON
     * routingMode: 0 = 全局代理, 1 = 绕过大陆 IP
     */
    fun buildSingBoxConfig(node: Hy2Node, routingMode: Int, geoipPath: String): String {
        val isBypassCn = routingMode == 1

        val root = JSONObject()

        // 1. log
        root.put("log", JSONObject().put("level", "warn"))

        // 2. dns
        val dnsServers = JSONArray().apply {
            put(JSONObject().apply {
                put("tag", "dns-remote")
                put("address", "https://1.1.1.1/dns-query")
                put("address_resolver", "dns-direct")
                put("detour", "proxy")
            })
            put(JSONObject().apply {
                put("tag", "dns-direct")
                put("address", "223.5.5.5")
                put("detour", "direct")
            })
            put(JSONObject().apply {
                put("tag", "dns-fakeip")
                put("address", "fakeip")
            })
        }
        val dnsRules = JSONArray().apply {
            put(JSONObject().put("outbound", "any").put("server", "dns-direct"))
            put(JSONObject().put("query_type", JSONArray(listOf("A", "AAAA"))).put("server", "dns-fakeip"))
        }
        val fakeip = JSONObject().apply {
            put("enabled", true)
            put("inet4_range", "198.18.0.0/15")
            put("inet6_range", "fc00::/18")
        }
        root.put("dns", JSONObject().apply {
            put("servers", dnsServers)
            put("rules", dnsRules)
            put("fakeip", fakeip)
            put("independent_cache", true)
        })

        // 3. inbounds (tun)
        val tunInbound = JSONObject().apply {
            put("type", "tun")
            put("tag", "tun-in")
            put("interface_name", "tun0")
            put("inet4_address", "172.19.0.1/30")
            put("inet6_address", "fdfe:dcba:9876::1/126")
            put("mtu", 1400)
            put("auto_route", true)
            put("strict_route", true)
            put("stack", "system")
            put("sniff", true)
            put("sniff_override_destination", false)
        }
        root.put("inbounds", JSONArray().put(tunInbound))

        // 4. outbounds
        val hy2Outbound = JSONObject().apply {
            put("type", "hysteria2")
            put("tag", "proxy")
            put("server", node.host)
            put("server_port", node.port)
            put("password", node.auth)
            put("tls", JSONObject().apply {
                put("enabled", true)
                put("server_name", node.sni)
                put("insecure", node.insecure)
            })
            if (!node.serverPorts.isNullOrBlank()) {
                put("server_ports", JSONArray().put(node.serverPorts))
            }
            if (!node.obfsType.isNullOrBlank()) {
                put("obfs", JSONObject().apply {
                    put("type", node.obfsType)
                    put("password", node.obfsPassword ?: "")
                })
            }
            if (node.upMbps != null && node.upMbps > 0) put("up_mbps", node.upMbps)
            if (node.downMbps != null && node.downMbps > 0) put("down_mbps", node.downMbps)
        }
        root.put("outbounds", JSONArray().apply {
            put(hy2Outbound)
            put(JSONObject().put("type", "direct").put("tag", "direct"))
            put(JSONObject().put("type", "block").put("tag", "block"))
            put(JSONObject().put("type", "dns").put("tag", "dns-out"))
        })

        // 5. route
        val routeRules = JSONArray().apply {
            put(JSONObject().put("protocol", "dns").put("outbound", "dns-out"))
            put(JSONObject().put("ip_is_private", true).put("outbound", "direct"))
            if (isBypassCn) {
                put(JSONObject().put("rule_set", JSONArray().put("geoip-cn")).put("outbound", "direct"))
            }
        }
        val route = JSONObject().apply {
            put("rules", routeRules)
            put("auto_detect_interface", true)
            put("final", "proxy")
            if (isBypassCn) {
                put("rule_set", JSONArray().put(JSONObject().apply {
                    put("type", "local")
                    put("tag", "geoip-cn")
                    put("format", "binary")
                    put("path", geoipPath)
                }))
            }
        }
        root.put("route", route)

        return root.toString(2)
    }

    /**
     * 15 行真连接测速实现：直连 Cloudflare 204 生成接口测试 RTT 延迟
     */
    fun testRealLatency(): Long {
        val start = System.currentTimeMillis()
        var conn: HttpURLConnection? = null
        return try {
            val url = URL("http://cp.cloudflare.com/generate_204")
            conn = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 4000
                readTimeout = 4000
                instanceFollowRedirects = false
                useCaches = false
                requestMethod = "GET"
            }
            val code = conn.responseCode
            if (code == 204 || code in 200..299) {
                System.currentTimeMillis() - start
            } else -1L
        } catch (_: Exception) {
            -1L
        } finally {
            conn?.disconnect()
        }
    }
}
`
  },
  {
    id: 'Hy2VpnService',
    name: 'Hy2VpnService.kt',
    path: 'app/src/main/java/io/github/hy2mini/Hy2VpnService.kt',
    package: 'io.github.hy2mini',
    badge: 'VPN 核心与网卡感知',
    lines: 195,
    description: '继承原生 VpnService 并实现 Libbox PlatformInterface 规范。管理 TUN 文件描述符、排除分流应用、监听物理网卡 Wi-Fi/5G 状态切换迁移连接。',
    code: `package io.github.hy2mini

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

    override fun usePlatformAutoDetectInterfaceControl(): Boolean = true

    override fun autoDetectInterfaceControl(fd: Int) {
        protect(fd)
    }

    override fun writeLog(message: String) {}

    override fun useProcFS(): Boolean = false

    override fun findConnectionOwner(
        ipProtocol: Int,
        sourceAddress: String,
        sourcePort: Int,
        destinationAddress: String,
        destinationPort: Int
    ): Int = 0

    override fun packageNameByUid(uid: Int): String = ""

    override fun uidByPackageName(packageName: String): Int = 0

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

    override fun closeDefaultInterfaceMonitor(listener: InterfaceUpdateListener) {
        networkCallback?.let {
            connectivityManager?.unregisterNetworkCallback(it)
            networkCallback = null
        }
    }

    override fun getInterfaces(): io.nekohasekai.libbox.NetworkInterfaceIterator? = null

    override fun underNetworkExtension(): Boolean = false

    override fun includeAllNetworks(): Boolean = false

    override fun readWIFIState(): io.nekohasekai.libbox.WIFIState? = null

    override fun clearDNSCache() {}

    override fun sendNotification(notification: io.nekohasekai.libbox.Notification?) {}

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
`
  },
  {
    id: 'MainActivity',
    name: 'MainActivity.kt',
    path: 'app/src/main/java/io/github/hy2mini/MainActivity.kt',
    package: 'io.github.hy2mini',
    badge: '纯原生无第三方库主界面',
    lines: 260,
    description: '采用纯原生 Android SDK 与原生 BaseAdapter 构建的主控制面板。包含顶部输入栏、模式单选组、节点列表管理、真连接测速与一键开关。零 AppCompat/Material 依赖！',
    code: `package io.github.hy2mini

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.net.VpnService
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.ListView
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import kotlin.concurrent.thread

class MainActivity : Activity() {

    private lateinit var prefs: SharedPreferences
    private val nodes = ArrayList<Hy2Node>()
    private var selectedNodeId: String? = null
    private var routingMode = 1 // 1 = Bypass CN, 0 = Global

    private lateinit var etUriInput: EditText
    private lateinit var btnAdd: Button
    private lateinit var btnScan: Button
    private lateinit var btnApps: Button
    private lateinit var rgMode: RadioGroup
    private lateinit var rbBypassCn: RadioButton
    private lateinit var rbGlobal: RadioButton
    private lateinit var lvNodes: ListView
    private lateinit var tvStatus: TextView
    private lateinit var btnToggle: Button
    private lateinit var adapter: NodeAdapter

    private val statusReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val isRunning = intent?.getBooleanExtra("running", false) ?: false
            updateUiState(isRunning)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = getSharedPreferences("hy2_prefs", Context.MODE_PRIVATE)

        // 确保 assets/geoip-cn.srs 复制到 filesDir
        copyGeoipAssetIfNeeded()

        bindViews()
        loadData()
        setupListeners()
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter("io.github.hy2mini.STATUS_CHANGED")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(statusReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(statusReceiver, filter)
        }
        updateUiState(Hy2VpnService.isRunning)
    }

    override fun onPause() {
        super.onPause()
        unregisterReceiver(statusReceiver)
    }

    private fun bindViews() {
        etUriInput = findViewById(R.id.et_uri_input)
        btnAdd = findViewById(R.id.btn_add)
        btnScan = findViewById(R.id.btn_scan)
        btnApps = findViewById(R.id.btn_apps)
        rgMode = findViewById(R.id.rg_mode)
        rbBypassCn = findViewById(R.id.rb_bypass_cn)
        rbGlobal = findViewById(R.id.rb_global)
        lvNodes = findViewById(R.id.lv_nodes)
        tvStatus = findViewById(R.id.tv_status)
        btnToggle = findViewById(R.id.btn_toggle)

        adapter = NodeAdapter()
        lvNodes.adapter = adapter
    }

    private fun loadData() {
        routingMode = prefs.getInt("routing_mode", 1)
        if (routingMode == 1) rbBypassCn.isChecked = true else rbGlobal.isChecked = true
        selectedNodeId = prefs.getString("selected_node_id", null)

        val nodesJson = prefs.getString("nodes_json", "[]") ?: "[]"
        nodes.clear()
        try {
            val arr = JSONArray(nodesJson)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                nodes.add(Hy2ConfigParser.parseUri(obj.getString("raw_uri")))
            }
        } catch (_: Exception) {}

        if (selectedNodeId == null && nodes.isNotEmpty()) {
            selectedNodeId = nodes[0].id
        }
        adapter.notifyDataSetChanged()
    }

    private fun saveData() {
        val arr = JSONArray()
        for (n in nodes) {
            arr.put(JSONObject().apply {
                put("id", n.id)
                put("remarks", n.remarks)
                put("raw_uri", n.rawUri)
            })
        }
        prefs.edit()
            .putString("nodes_json", arr.toString())
            .putString("selected_node_id", selectedNodeId)
            .putInt("routing_mode", routingMode)
            .apply()
    }

    private fun setupListeners() {
        btnAdd.setOnClickListener {
            val text = etUriInput.text.toString().trim()
            if (text.isNotBlank()) {
                try {
                    val node = Hy2ConfigParser.parseUri(text)
                    nodes.add(0, node)
                    selectedNodeId = node.id
                    saveData()
                    adapter.notifyDataSetChanged()
                    etUriInput.setText("")
                    Toast.makeText(this, "节点已添加", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Toast.makeText(this, "无效的 Hysteria2 链接: \${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }

        btnScan.setOnClickListener {
            startActivityForResult(Intent(this, QrScanActivity::class.java), 200)
        }

        btnApps.setOnClickListener {
            startActivity(Intent(this, AppSelectActivity::class.java))
        }

        rgMode.setOnCheckedChangeListener { _, checkedId ->
            routingMode = if (checkedId == R.id.rb_bypass_cn) 1 else 0
            prefs.edit().putInt("routing_mode", routingMode).apply()
        }

        tvStatus.setOnClickListener {
            if (Hy2VpnService.isRunning) {
                testCurrentNodeLatency()
            }
        }

        btnToggle.setOnClickListener {
            if (Hy2VpnService.isRunning) {
                stopService(Intent(this, Hy2VpnService::class.java).apply {
                    action = Hy2VpnService.ACTION_STOP
                })
            } else {
                val intent = VpnService.prepare(this)
                if (intent != null) {
                    startActivityForResult(intent, 100)
                } else {
                    startVpn()
                }
            }
        }

        lvNodes.setOnItemClickListener { _, _, position, _ ->
            selectedNodeId = nodes[position].id
            saveData()
            adapter.notifyDataSetChanged()
        }

        lvNodes.setOnItemLongClickListener { _, _, position, _ ->
            val target = nodes[position]
            nodes.removeAt(position)
            if (selectedNodeId == target.id) {
                selectedNodeId = nodes.firstOrNull()?.id
            }
            saveData()
            adapter.notifyDataSetChanged()
            Toast.makeText(this, "已删除节点: \${target.remarks}", Toast.LENGTH_SHORT).show()
            true
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 100 && resultCode == RESULT_OK) {
            startVpn()
        } else if (requestCode == 200 && resultCode == RESULT_OK) {
            val uri = data?.getStringExtra("scanned_uri") ?: return
            try {
                val node = Hy2ConfigParser.parseUri(uri)
                nodes.add(0, node)
                selectedNodeId = node.id
                saveData()
                adapter.notifyDataSetChanged()
                Toast.makeText(this, "扫码成功并已添加节点", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, "扫码解析错误: \${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun startVpn() {
        val selected = nodes.firstOrNull { it.id == selectedNodeId } ?: run {
            Toast.makeText(this, "请先选择一个节点", Toast.LENGTH_SHORT).show()
            return
        }

        val geoipPath = File(filesDir, "geoip-cn.srs").absolutePath
        val config = Hy2ConfigParser.buildSingBoxConfig(selected, routingMode, geoipPath)

        val intent = Intent(this, Hy2VpnService::class.java).apply {
            action = Hy2VpnService.ACTION_START
            putExtra("config_json", config)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun updateUiState(running: Boolean) {
        if (running) {
            tvStatus.text = "已连接 - 点击测速 (RTT: -- ms)"
            btnToggle.text = "断开连接"
            btnToggle.setBackgroundColor(0xFFE53935.toInt())
        } else {
            tvStatus.text = "未连接"
            btnToggle.text = "启动连接"
            btnToggle.setBackgroundColor(0xFF1E88E5.toInt())
        }
    }

    private fun testCurrentNodeLatency() {
        tvStatus.text = "正在测速中..."
        thread {
            val rtt = Hy2ConfigParser.testRealLatency()
            runOnUiThread {
                if (rtt >= 0) {
                    tvStatus.text = "已连接 - 点击测速 (RTT: \${rtt} ms)"
                } else {
                    tvStatus.text = "已连接 - 测速失败 (超时)"
                }
            }
        }
    }

    private fun copyGeoipAssetIfNeeded() {
        val file = File(filesDir, "geoip-cn.srs")
        if (!file.exists()) {
            thread {
                try {
                    assets.open("geoip-cn.srs").use { input ->
                        FileOutputStream(file).use { output ->
                            input.copyTo(output)
                        }
                    }
                } catch (_: Exception) {}
            }
        }
    }

    private inner class NodeAdapter : BaseAdapter() {
        override fun getCount(): Int = nodes.size
        override fun getItem(position: Int): Any = nodes[position]
        override fun getItemId(position: Int): Long = position.toLong()

        override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
            val view = convertView ?: LayoutInflater.from(this@MainActivity)
                .inflate(R.layout.item_node, parent, false)
            val node = nodes[position]

            val tvTitle = view.findViewById<TextView>(R.id.tv_node_title)
            val tvSubtitle = view.findViewById<TextView>(R.id.tv_node_subtitle)
            val rbSelect = view.findViewById<RadioButton>(R.id.rb_node_select)

            tvTitle.text = node.remarks
            tvSubtitle.text = "\${node.host}:\${node.port}"
            rbSelect.isChecked = (node.id == selectedNodeId)
            rbSelect.setOnClickListener {
                selectedNodeId = node.id
                saveData()
                notifyDataSetChanged()
            }

            return view
        }
    }
}
`
  },
  {
    id: 'QrScanActivity',
    name: 'QrScanActivity.kt',
    path: 'app/src/main/java/io/github/hy2mini/QrScanActivity.kt',
    package: 'io.github.hy2mini',
    badge: '100行极简零拷贝扫码器',
    lines: 110,
    description: '使用 Camera2 直接提取 ImageFormat.YUV_420_888 纯 Y 灰度通道亮度数据，直接喂给 ZXing 二值化解码，无任何 CameraX / MLKit 沉重依赖，内存占用极低。',
    code: `package io.github.hy2mini

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
`
  },
  {
    id: 'AppSelectActivity',
    name: 'AppSelectActivity.kt',
    path: 'app/src/main/java/io/github/hy2mini/AppSelectActivity.kt',
    package: 'io.github.hy2mini',
    badge: '分应用代理勾选器',
    lines: 110,
    description: '异步检索系统安装应用、过滤无启动图标的系统底层进程、按已勾选置顶排序，并将绕过应用名单写入 SharedPreferences 供 VpnService 的 addDisallowedApplication 使用。',
    code: `package io.github.hy2mini

import android.app.Activity
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.CheckBox
import android.widget.ImageView
import android.widget.ListView
import android.widget.TextView
import kotlin.concurrent.thread

data class AppItem(
    val name: String,
    val packageName: String,
    val icon: Drawable?,
    var isBypassed: Boolean
)

class AppSelectActivity : Activity() {

    private lateinit var lvApps: ListView
    private val appList = ArrayList<AppItem>()
    private lateinit var adapter: AppAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_app_select)

        lvApps = findViewById(R.id.lv_apps)
        adapter = AppAdapter()
        lvApps.adapter = adapter

        loadApplications()
    }

    private fun loadApplications() {
        thread {
            val pm = packageManager
            val prefs = getSharedPreferences("hy2_prefs", Context.MODE_PRIVATE)
            val bypassedSet = prefs.getStringSet("bypass_apps", emptySet()) ?: emptySet()

            val installed = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            val results = ArrayList<AppItem>()

            for (app in installed) {
                // 排除本应用自身
                if (app.packageName == packageName) continue
                // 仅保留有启动 Launcher 入口的应用，过滤掉几百个底层核心服务
                if (pm.getLaunchIntentForPackage(app.packageName) == null) continue

                val name = pm.getApplicationLabel(app).toString()
                val icon = pm.getApplicationIcon(app)
                val isBypassed = bypassedSet.contains(app.packageName)

                results.add(AppItem(name, app.packageName, icon, isBypassed))
            }

            // 已勾选的排在最前
            results.sortWith(compareByDescending<AppItem> { it.isBypassed }.thenBy { it.name })

            runOnUiThread {
                appList.clear()
                appList.addAll(results)
                adapter.notifyDataSetChanged()
            }
        }
    }

    private fun saveBypassedApps() {
        val selected = appList.filter { it.isBypassed }.map { it.packageName }.toSet()
        val prefs = getSharedPreferences("hy2_prefs", Context.MODE_PRIVATE)
        prefs.edit().putStringSet("bypass_apps", selected).apply()
    }

    private inner class AppAdapter : BaseAdapter() {
        override fun getCount(): Int = appList.size
        override fun getItem(position: Int): Any = appList[position]
        override fun getItemId(position: Int): Long = position.toLong()

        override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
            val view = convertView ?: LayoutInflater.from(this@AppSelectActivity)
                .inflate(R.layout.item_app, parent, false)
            val item = appList[position]

            val ivIcon = view.findViewById<ImageView>(R.id.iv_app_icon)
            val tvName = view.findViewById<TextView>(R.id.tv_app_name)
            val tvPkg = view.findViewById<TextView>(R.id.tv_app_pkg)
            val cbBypass = view.findViewById<CheckBox>(R.id.cb_bypass)

            tvName.text = item.name
            tvPkg.text = item.packageName
            ivIcon.setImageDrawable(item.icon)
            cbBypass.isChecked = item.isBypassed

            cbBypass.setOnCheckedChangeListener { _, isChecked ->
                item.isBypassed = isChecked
                saveBypassedApps()
            }

            return view
        }
    }
}
`
  },
  {
    id: 'AndroidManifest',
    name: 'AndroidManifest.xml',
    path: 'app/src/main/AndroidManifest.xml',
    package: 'io.github.hy2mini',
    badge: '清单与服务声明',
    lines: 48,
    description: '声明 INTERNET, BIND_VPN_SERVICE, FOREGROUND_SERVICE, CAMERA 权限及 VpnService 与相关 Activity。',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="io.github.hy2mini">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SYSTEM_EXEMPTED" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <uses-feature android:name="android.hardware.camera" android:required="false" />

    <application
        android:allowBackup="false"
        android:icon="@android:drawable/ic_dialog_info"
        android:label="Hy2Mini"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.DeviceDefault.Light.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".QrScanActivity"
            android:exported="false"
            android:screenOrientation="portrait" />

        <activity
            android:name=".AppSelectActivity"
            android:exported="false" />

        <service
            android:name=".Hy2VpnService"
            android:permission="android.permission.BIND_VPN_SERVICE"
            android:foregroundServiceType="systemExempted"
            android:exported="false">
            <intent-filter>
                <action android:name="android.net.VpnService" />
            </intent-filter>
        </service>

    </application>
</manifest>
`
  },
  {
    id: 'proguard-rules',
    name: 'proguard-rules.pro',
    path: 'app/proguard-rules.pro',
    package: 'io.github.hy2mini',
    badge: 'R8 极限混淆规则',
    lines: 28,
    description: '保护 sing-box JNI 反射绑定，开启 5 轮极限死代码优化，清除调试日志。',
    code: `# 保护 sing-box Go Mobile 绑定的 JNI 类与接口不被混淆破坏
-keep class io.nekohasekai.libbox.** { *; }
-keep class go.** { *; }

# ZXing 极简保留
-keep class com.google.zxing.** { *; }

# 极限优化与字节码压缩
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
-allowaccessmodification
-dontpreverify

# 剥离所有原生日志调用
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
`
  },
  {
    id: 'build-gradle-app',
    name: 'build.gradle.kts (App)',
    path: 'app/build.gradle.kts',
    package: 'io.github.hy2mini',
    badge: 'App 模块编译配置',
    lines: 55,
    description: '单架构 ndk.abiFilters ("arm64-v8a") 彻底丢弃 32 位以压制体积，开启 isMinifyEnabled 与 isShrinkResources。',
    code: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "io.github.hy2mini"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.github.hy2mini"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        // 仅保留 64 位 ARM 架构，绝不打入 32 位与 x86 so
        ndk {
            abiFilters.clear()
            abiFilters.add("arm64-v8a")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("debug") // 开发调试签名
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // 引入编译裁剪产出的 libbox.aar
    implementation(files("libs/libbox.aar"))

    // 仅引入 ZXing core (纯纯二维码算法，无冗余 Android 组件)
    implementation("com.google.zxing:core:3.5.3")

    // 严禁引入: androidx.appcompat, material, okhttp, gson, camerax
}
`
  }
];
