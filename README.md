# Hy2Mini - Hysteria2 极简安卓客户端 (源码工程 & 交互式开发工作台)

本项目包含两部分核心产物：
1. **`android/` 目录：** 完整的 **Hy2Mini 原生 Android 客户端**（Package: `io.github.hy2mini`）源码工程，可直接在 Android Studio 中打开，或通过 GitHub Actions 自动编译构建 Release APK。
2. **`src/` 目录：** 交互式 Web 模拟器、URI 解析调试器与配置组装工具，在 AI Studio 预览窗口中运行。

---

## 一、Android 原生工程目录结构 (`android/`)

```
android/
├── build.gradle.kts                   # 根项目 Gradle 插件配置
├── settings.gradle.kts                # 子模块与仓库配置
├── gradle.properties
├── scripts/
│   └── trim_and_build.sh             # Phase 1: sing-box 源码级 AST 裁剪与 gomobile 编译脚本
├── app/
│   ├── build.gradle.kts              # 单架构 (arm64-v8a) 与 R8 激进混淆瘦身
│   ├── proguard-rules.pro            # Go JNI 反射保护与日志剥离
│   ├── libs/
│   │   └── libbox.aar                # (~6.8MB 裁剪版 Go 内核)
│   └── src/main/
│       ├── AndroidManifest.xml       # 权限与前台服务声明
│       ├── assets/
│       │   └── geoip-cn.srs          # 45KB 大陆 IP 规则集
│       ├── java/io/github/hy2mini/
│       │   ├── Hy2ConfigParser.kt    # URI 解析与 15 行极简 204 测速
│       │   ├── Hy2VpnService.kt      # VPN 核心守护与网卡切换监听
│       │   ├── MainActivity.kt       # 纯原生主界面 (零 AppCompat/Material)
│       │   ├── QrScanActivity.kt     # 100 行 Camera2 + ZXing 扫码
│       │   └── AppSelectActivity.kt  # 分应用代理选择器
│       └── res/layout/
│           ├── activity_main.xml
│           ├── item_node.xml
│           ├── activity_qr_scan.xml
│           ├── activity_app_select.xml
│           └── item_app.xml
```

---

## 二、自动编译 Release APK (GitHub Actions)

仓库根目录已配置好 `.github/workflows/build-apk.yml`：
1. 将本项目推送至 GitHub 后，进入 GitHub 仓库的 **Actions** 页面；
2. 选择 **`Build Hy2Mini Release APK`** 工作流，点击 **「Run workflow」**；
3. GitHub 官方云主机将在 3 分钟内自动完成 Go 裁剪与 Gradle 打包，并在 **Artifacts** 直接生成可下载的 **`Hy2Mini-Release-APK`**（大小约 6.8MB）。

---

## 三、本地 Android Studio 开发

1. 在终端进入 `android/` 目录，执行内核编译脚本：
   ```bash
   cd android
   bash scripts/trim_and_build.sh
   ```
2. 使用 Android Studio 打开 `android/` 目录；
3. 执行 `./gradlew assembleRelease` 即可生成正式 APK。
