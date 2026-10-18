#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo " [Hy2Mini] sing-box 源码裁剪与 libbox.aar 编译自动化工具 "
echo "=========================================================="

SINGBOX_VER="v1.11.4"
WORKDIR="$(pwd)/build_singbox"

# 1. 检查必要环境
command -v go >/dev/null 2>&1 || { echo "❌ 请先安装 Go 1.22+"; exit 1; }
command -v gomobile >/dev/null 2>&1 || { 
  echo "⚠️ 正在安装 gomobile..."
  go install golang.org/x/mobile/cmd/gomobile@latest
  gomobile init
}
if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_NDK_HOME:-}" ]; then
  echo "⚠️ 警告: 未检测到 ANDROID_HOME 或 ANDROID_NDK_HOME 环境变量"
fi

# 2. 克隆对应版本的 sing-box
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
git clone --depth 1 --branch "$SINGBOX_VER" https://github.com/sagernet/sing-box.git "$WORKDIR"
cd "$WORKDIR"

echo ">> 正在注入极限裁剪版 include/inbound.go ..."
cat << 'EOF' > include/inbound.go
package include

import (
	_ "github.com/sagernet/sing-box/inbound/tun"
)
EOF

echo ">> 正在注入极限裁剪版 include/outbound.go ..."
cat << 'EOF' > include/outbound.go
package include

import (
	_ "github.com/sagernet/sing-box/outbound/block"
	_ "github.com/sagernet/sing-box/outbound/direct"
	_ "github.com/sagernet/sing-box/outbound/dns"
	_ "github.com/sagernet/sing-box/outbound/hysteria2"
)
EOF

echo ">> 正在排空 Clash / V2Ray API 引用 ..."
[ -f include/v2ray.go ] && echo "package include" > include/v2ray.go
[ -f include/clash.go ] && echo "package include" > include/clash.go

echo ">> 开始执行 gomobile bind 交叉编译 (arm64-v8a)..."
gomobile bind -v \
  -androidapi 26 \
  -target=android/arm64 \
  -tags="with_quic" \
  -trimpath \
  -ldflags="-s -w -buildid=" \
  -o libbox.aar \
  ./experimental/libbox

echo ">> 编译完成！验证 libbox.aar 产物体积:"
ls -lh libbox.aar

echo ">> 正在下载配套的 geoip-cn.srs 规则文件 (45KB)..."
curl -sSL -o geoip-cn.srs https://github.com/SagerNet/sing-geoip/raw/rule-set/geoip-cn.srs

echo "=========================================================="
echo " 编译产物已生成:"
echo " 1. $WORKDIR/libbox.aar (约 6.8MB)"
echo " 2. $WORKDIR/geoip-cn.srs (约 45KB)"
echo " 请将 libbox.aar 拷贝到 Android 工程 app/libs/ 目录下！"
echo " 请将 geoip-cn.srs 拷贝到 Android 工程 app/src/main/assets/ 目录下！"
echo "=========================================================="
