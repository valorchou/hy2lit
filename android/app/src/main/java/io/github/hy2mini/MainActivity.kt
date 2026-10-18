package io.github.hy2mini

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
                    Toast.makeText(this, "无效的 Hysteria2 链接: ${e.message}", Toast.LENGTH_LONG).show()
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
            Toast.makeText(this, "已删除节点: ${target.remarks}", Toast.LENGTH_SHORT).show()
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
                Toast.makeText(this, "扫码解析错误: ${e.message}", Toast.LENGTH_SHORT).show()
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
                    tvStatus.text = "已连接 - 点击测速 (RTT: ${rtt} ms)"
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
            tvSubtitle.text = "${node.host}:${node.port}"
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
