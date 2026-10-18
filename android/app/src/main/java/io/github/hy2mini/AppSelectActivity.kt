package io.github.hy2mini

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
