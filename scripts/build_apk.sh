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

# Step 5: 安装 sing-box 官方配套 gomobile
echo ">> [5/8] 安装 sagernet/gomobile..."
go install -v github.com/sagernet/gomobile/cmd/gomobile@v0.1.4
go install -v github.com/sagernet/gomobile/cmd/gobind@v0.1.4
gomobile init

# Step 6: Clone sing-box & Strip AST
echo ">> [6/8] 拉取 sing-box 源码并注入裁剪规范..."
rm -rf /tmp/sing-box
git clone --depth 1 --branch v1.11.4 https://github.com/sagernet/sing-box.git /tmp/sing-box
cd /tmp/sing-box

cat << 'EOF' > include/registry.go
package include

import (
	"github.com/sagernet/sing-box/adapter/endpoint"
	"github.com/sagernet/sing-box/adapter/inbound"
	"github.com/sagernet/sing-box/adapter/outbound"
	"github.com/sagernet/sing-box/protocol/block"
	"github.com/sagernet/sing-box/protocol/direct"
	"github.com/sagernet/sing-box/protocol/dns"
	"github.com/sagernet/sing-box/protocol/tun"
)

func InboundRegistry() *inbound.Registry {
	registry := inbound.NewRegistry()
	tun.RegisterInbound(registry)
	return registry
}

func OutboundRegistry() *outbound.Registry {
	registry := outbound.NewRegistry()
	direct.RegisterOutbound(registry)
	block.RegisterOutbound(registry)
	dns.RegisterOutbound(registry)
	registerQUICOutbounds(registry)
	return registry
}

func EndpointRegistry() *endpoint.Registry {
	return endpoint.NewRegistry()
}
EOF

cat << 'EOF' > include/quic.go
//go:build with_quic

package include

import (
	"github.com/sagernet/sing-box/adapter/inbound"
	"github.com/sagernet/sing-box/adapter/outbound"
	"github.com/sagernet/sing-box/protocol/hysteria2"
)

func registerQUICInbounds(registry *inbound.Registry) {
}

func registerQUICOutbounds(registry *outbound.Registry) {
	hysteria2.RegisterOutbound(registry)
}
EOF

echo ">> 编译 libbox.aar (arm64-v8a)..."
gomobile bind -v \
  -target=android/arm64 \
  -androidapi=26 \
  -javapkg=io.nekohasekai \
  -libname=box \
  -trimpath \
  -ldflags="-s -w -buildid=" \
  -tags="with_quic" \
  -o /tmp/libbox.aar \
  ./experimental/libbox

echo ">> libbox.aar 编译成功！大小："
ls -lh /tmp/libbox.aar

echo ">> 下载 geoip-cn.srs..."
curl -sSL -o /tmp/geoip-cn.srs https://github.com/SagerNet/sing-geoip/raw/rule-set/geoip-cn.srs

# Step 7: 装载并构建 Android
echo ">> [7/8] 准备 Android 工程..."
mkdir -p /app/applet/android/app/libs
mkdir -p /app/applet/android/app/src/main/assets
cp /tmp/libbox.aar /app/applet/android/app/libs/libbox.aar
cp /tmp/geoip-cn.srs /app/applet/android/app/src/main/assets/geoip-cn.srs

# Step 8: 执行 Gradle assembleRelease
echo ">> [8/8] 执行 gradle assembleRelease 构建 Release APK..."
cd /app/applet/android
gradle assembleRelease --stacktrace

OUTPUT_APK="/app/applet/android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$OUTPUT_APK" ]; then
    mkdir -p /app/applet/public
    cp "$OUTPUT_APK" /app/applet/public/hy2mini-release.apk
    echo "=========================================================="
    echo "🎉 构建成功！Release APK 产物已生成："
    ls -lh /app/applet/public/hy2mini-release.apk
    echo "=========================================================="
fi
