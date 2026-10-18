#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="/tmp/apk_build.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=========================================================="
echo " [Hy2Mini] 自动化编译构建 Release APK"
echo " Time: $(date)"
echo "=========================================================="

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=/opt/android-sdk
export ANDROID_NDK_HOME=/opt/android-sdk/ndk/26.2.11394342
export PATH=/opt/gradle/gradle-8.7/bin:/usr/local/go/bin:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/root/go/bin:$PATH

# Step 1: Cmdline-tools
if [ ! -d "/opt/android-sdk/cmdline-tools/latest" ]; then
    echo ">> [1/8] 配置 Android SDK 命令行工具..."
    mkdir -p /opt/android-sdk/cmdline-tools
    if [ ! -f "/tmp/cmdline.zip" ]; then
        curl -sSL -o /tmp/cmdline.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
    fi
    unzip -q /tmp/cmdline.zip -d /tmp/cmdline
    mv /tmp/cmdline/cmdline-tools /opt/android-sdk/cmdline-tools/latest
    rm -rf /tmp/cmdline /tmp/cmdline.zip
fi

# Step 2: NDK r26c
if [ ! -d "$ANDROID_NDK_HOME" ]; then
    echo ">> [2/8] 下载并解压 Android NDK r26c..."
    mkdir -p /opt/android-sdk/ndk
    curl -sSL -o /tmp/ndk.zip https://dl.google.com/android/repository/android-ndk-r26c-linux.zip
    unzip -q /tmp/ndk.zip -d /opt/android-sdk/ndk
    mv /opt/android-sdk/ndk/android-ndk-r26c "$ANDROID_NDK_HOME"
    rm -f /tmp/ndk.zip
fi

# Step 3: Gradle 8.7
if [ ! -d "/opt/gradle/gradle-8.7" ]; then
    echo ">> [3/8] 安装 Gradle 8.7..."
    mkdir -p /opt/gradle
    curl -sSL -o /tmp/gradle.zip https://services.gradle.org/distributions/gradle-8.7-bin.zip
    unzip -q /tmp/gradle.zip -d /opt/gradle
    rm -f /tmp/gradle.zip
fi

# Step 4: Android SDK components
echo ">> [4/8] 许可协议接受与 SDK 组件安装..."
yes | sdkmanager --licenses >/dev/null 2>&1 || true
sdkmanager "platforms;android-35" "build-tools;35.0.0"

# Step 5: gomobile
echo ">> [5/8] 安装 gomobile..."
go install golang.org/x/mobile/cmd/gomobile@latest
gomobile init

# Step 6: Clone sing-box & Strip AST
echo ">> [6/8] 拉取 sing-box 源码并注入裁剪规范..."
rm -rf /tmp/sing-box
git clone --depth 1 --branch v1.11.4 https://github.com/sagernet/sing-box.git /tmp/sing-box
cd /tmp/sing-box

cat << 'EOF' > include/inbound.go
package include

import (
	_ "github.com/sagernet/sing-box/inbound/tun"
)
EOF

cat << 'EOF' > include/outbound.go
package include

import (
	_ "github.com/sagernet/sing-box/outbound/block"
	_ "github.com/sagernet/sing-box/outbound/direct"
	_ "github.com/sagernet/sing-box/outbound/dns"
	_ "github.com/sagernet/sing-box/outbound/hysteria2"
)
EOF

echo "package include" > include/v2ray.go
echo "package include" > include/clash.go

echo ">> 编译 libbox.aar (arm64-v8a)..."
gomobile bind -v \
  -androidapi 26 \
  -target=android/arm64 \
  -tags="with_quic" \
  -trimpath \
  -ldflags="-s -w -buildid=" \
  -o /tmp/libbox.aar \
  ./experimental/libbox

echo ">> libbox.aar 编译成功！大小："
ls -lh /tmp/libbox.aar

echo ">> 下载 geoip-cn.srs..."
curl -sSL -o /tmp/geoip-cn.srs https://github.com/SagerNet/sing-geoip/raw/rule-set/geoip-cn.srs

# Step 7: 生成 Android 源码目录
echo ">> [7/8] 装载 Android 工程源码..."
PROJECT_DIR="/tmp/Hy2Mini"
rm -rf "$PROJECT_DIR"
mkdir -p "$PROJECT_DIR/app/libs" \
         "$PROJECT_DIR/app/src/main/assets" \
         "$PROJECT_DIR/app/src/main/java/io/github/hy2mini" \
         "$PROJECT_DIR/app/src/main/res/layout" \
         "$PROJECT_DIR/app/src/main/res/values"

cp /tmp/libbox.aar "$PROJECT_DIR/app/libs/libbox.aar"
cp /tmp/geoip-cn.srs "$PROJECT_DIR/app/src/main/assets/geoip-cn.srs"

# 写出 gradle 配置与源码
cat << 'EOF' > "$PROJECT_DIR/settings.gradle.kts"
pluginManagement {
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
EOF

cat << 'EOF' > "$PROJECT_DIR/build.gradle.kts"
plugins {
    id("com.android.application") version "8.7.2" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}
EOF

cat << 'EOF' > "$PROJECT_DIR/gradle.properties"
android.useAndroidX=true
android.nonTransitiveRClass=true
org.gradle.jvmargs=-Xmx2048m
EOF

cat << 'EOF' > "$PROJECT_DIR/app/build.gradle.kts"
plugins {
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
            signingConfig = signingConfigs.getByName("debug")
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
    implementation(files("libs/libbox.aar"))
    implementation("com.google.zxing:core:3.5.3")
}
EOF

# Copy generated project files from /app/applet/src/data if available or write directly
python3 - << 'PYEOF'
import os

with open('/app/applet/src/data/phase2Code.ts', 'r', encoding='utf-8') as f:
    code_ts = f.read()

with open('/app/applet/src/data/androidResources.ts', 'r', encoding='utf-8') as f:
    res_ts = f.read()

project_dir = '/tmp/Hy2Mini'

# Write Kotlin files
import re
items = re.findall(r"path:\s*'([^']+)',\s*package:[^,]+,\s*badge:[^,]+,\s*lines:[^,]+,\s*description:[^,]+,\s*code:\s*`([\s\S]*?)`\s*\}", code_ts)
for path, code in items:
    full_path = os.path.join(project_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as out:
        out.write(code.replace('\\$', '$').replace('\\`', '`'))

# Write resource files
res_items = re.findall(r"path:\s*'([^']+)',\s*name:[^,]+,\s*description:[^,]+,\s*content:\s*`([\s\S]*?)`\s*\}", res_ts)
for path, content in res_items:
    full_path = os.path.join(project_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as out:
        out.write(content.replace('\\$', '$').replace('\\`', '`'))

print("All Kotlin and XML files created successfully!")
PYEOF

cat << 'EOF' > "$PROJECT_DIR/app/src/main/res/values/strings.xml"
<resources>
    <string name="app_name">Hy2Mini</string>
</resources>
EOF

# Step 8: 执行 Gradle assembleRelease
echo ">> [8/8] 执行 gradle assembleRelease 构建 Release APK..."
cd "$PROJECT_DIR"
gradle assembleRelease --stacktrace

# 复制产物
OUTPUT_APK="$PROJECT_DIR/app/build/outputs/apk/release/app-release.apk"
if [ -f "$OUTPUT_APK" ]; then
    mkdir -p /app/applet/public
    cp "$OUTPUT_APK" /app/applet/public/hy2mini-release.apk
    echo "=========================================================="
    echo "🎉 构建成功！Release APK 产物："
    ls -lh /app/applet/public/hy2mini-release.apk
    echo "文件已部署至 Web 静态目录: /public/hy2mini-release.apk"
    echo "=========================================================="
else
    echo "❌ 未检测到输出 APK 文件，请检查 Gradle 构建日志"
    exit 1
fi
