export interface AndroidResourceFile {
  path: string;
  name: string;
  description: string;
  content: string;
}

export const ANDROID_RESOURCES: AndroidResourceFile[] = [
  {
    path: 'app/src/main/res/layout/activity_main.xml',
    name: 'activity_main.xml',
    description: '主界面布局：纯原生 LinearLayout，无 Material/CardView 依赖',
    content: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp"
    android:background="#FAFAFA">

    <!-- 顶部输入栏 -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <EditText
            android:id="@+id/et_uri_input"
            android:layout_width="0dp"
            android:layout_height="44dp"
            android:layout_weight="1"
            android:hint="输入 hy2:// 或 hysteria2:// 链接"
            android:textSize="13sp"
            android:paddingHorizontal="10dp"
            android:background="#EFEFEF"
            android:singleLine="true" />

        <Button
            android:id="@+id/btn_add"
            android:layout_width="wrap_content"
            android:layout_height="44dp"
            android:text="添加"
            android:layout_marginStart="6dp" />

        <Button
            android:id="@+id/btn_scan"
            android:layout_width="wrap_content"
            android:layout_height="44dp"
            android:text="扫码"
            android:layout_marginStart="4dp" />

        <Button
            android:id="@+id/btn_apps"
            android:layout_width="wrap_content"
            android:layout_height="44dp"
            android:text="分应用"
            android:layout_marginStart="4dp" />
    </LinearLayout>

    <!-- 模式单选栏 -->
    <RadioGroup
        android:id="@+id/rg_mode"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="12dp">

        <RadioButton
            android:id="@+id/rb_bypass_cn"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:checked="true"
            android:text="绕过大陆 IP" />

        <RadioButton
            android:id="@+id/rb_global"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="全局代理" />
    </RadioGroup>

    <!-- 节点列表区 -->
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="节点列表 (长按删除)"
        android:textSize="12sp"
        android:textColor="#888888"
        android:layout_marginTop="12dp"
        android:layout_marginBottom="4dp" />

    <ListView
        android:id="@+id/lv_nodes"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:divider="#DDDDDD"
        android:dividerHeight="1dp" />

    <!-- 底部控制区 -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:paddingTop="12dp">

        <TextView
            android:id="@+id/tv_status"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:gravity="center"
            android:padding="8dp"
            android:text="未连接"
            android:textSize="14sp"
            android:textColor="#333333" />

        <Button
            android:id="@+id/btn_toggle"
            android:layout_width="match_parent"
            android:layout_height="52dp"
            android:text="启动连接"
            android:textColor="#FFFFFF"
            android:textSize="16sp"
            android:background="#1E88E5" />
    </LinearLayout>

</LinearLayout>
`
  },
  {
    path: 'app/src/main/res/layout/item_node.xml',
    name: 'item_node.xml',
    description: '节点单项布局：单选框、备注名、Host 与端口',
    content: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="horizontal"
    android:gravity="center_vertical"
    android:padding="12dp">

    <RadioButton
        android:id="@+id/rb_node_select"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:clickable="false" />

    <LinearLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:orientation="vertical"
        android:layout_marginStart="8dp">

        <TextView
            android:id="@+id/tv_node_title"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textSize="15sp"
            android:textStyle="bold"
            android:textColor="#222222" />

        <TextView
            android:id="@+id/tv_node_subtitle"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textSize="12sp"
            android:textColor="#666666" />
    </LinearLayout>
</LinearLayout>
`
  },
  {
    path: 'app/src/main/res/layout/activity_qr_scan.xml',
    name: 'activity_qr_scan.xml',
    description: '100 行扫码界面布局：TextureView 与扫描框',
    content: `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#000000">

    <TextureView
        android:id="@+id/texture_preview"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

    <View
        android:layout_width="260dp"
        android:layout_height="260dp"
        android:layout_gravity="center"
        android:background="#33FFFFFF" />

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="center_horizontal|bottom"
        android:layout_marginBottom="48dp"
        android:text="请将 Hysteria2 二维码置于取景框中"
        android:textColor="#FFFFFF"
        android:textSize="14sp" />
</FrameLayout>
`
  },
  {
    path: 'app/src/main/res/layout/activity_app_select.xml',
    name: 'activity_app_select.xml',
    description: '分应用代理勾选器布局',
    content: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="#FFFFFF">

    <TextView
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:padding="16dp"
        android:text="勾选的应用将绕过 VPN 隧道，直接通过物理网卡直连访问互联网"
        android:textSize="13sp"
        android:background="#F5F5F5"
        android:textColor="#666666" />

    <ListView
        android:id="@+id/lv_apps"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:divider="#EEEEEE"
        android:dividerHeight="1dp" />
</LinearLayout>
`
  },
  {
    path: 'app/src/main/res/layout/item_app.xml',
    name: 'item_app.xml',
    description: '分应用单项条目',
    content: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="horizontal"
    android:gravity="center_vertical"
    android:padding="12dp">

    <ImageView
        android:id="@+id/iv_app_icon"
        android:layout_width="40dp"
        android:layout_height="40dp"
        android:contentDescription="App Icon" />

    <LinearLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:orientation="vertical"
        android:layout_marginStart="12dp">

        <TextView
            android:id="@+id/tv_app_name"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textSize="15sp"
            android:textColor="#222222" />

        <TextView
            android:id="@+id/tv_app_pkg"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textSize="11sp"
            android:textColor="#888888" />
    </LinearLayout>

    <CheckBox
        android:id="@+id/cb_bypass"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content" />
</LinearLayout>
`
  },
  {
    path: 'settings.gradle.kts',
    name: 'settings.gradle.kts',
    description: '项目级 Gradle 设置',
    content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Hy2Mini"
include(":app")
`
  },
  {
    path: 'build.gradle.kts',
    name: 'build.gradle.kts (Root)',
    description: '根目录 Gradle 插件配置',
    content: `plugins {
    id("com.android.application") version "8.7.2" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}
`
  }
];
