#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo " [Hy2Mini] sing-box 源码裁剪与 libbox.aar 编译自动化工具 "
echo "=========================================================="

SINGBOX_VER="v1.11.4"
WORKDIR="$(pwd)/build_singbox"

# 1. 检查必要环境并安装 sing-box 配套 gomobile 工具
command -v go >/dev/null 2>&1 || { echo "❌ 请先安装 Go 1.22+"; exit 1; }
echo ">> 正在安装 sing-box 配套 gomobile 构建套件 (sagernet/gomobile)..."
go install -v github.com/sagernet/gomobile/cmd/gomobile@v0.1.4
go install -v github.com/sagernet/gomobile/cmd/gobind@v0.1.4
gomobile init

if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_NDK_HOME:-}" ]; then
  echo "⚠️ 警告: 未检测到 ANDROID_HOME 或 ANDROID_NDK_HOME 环境变量"
fi

# 2. 克隆对应版本的 sing-box
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
git clone --depth 1 --branch "$SINGBOX_VER" https://github.com/sagernet/sing-box.git "$WORKDIR"
cd "$WORKDIR"

echo ">> 正在重构 include/registry.go (仅保留 tun 与 direct, block, dns)..."
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

echo ">> 正在重构 include/quic.go (仅保留 hysteria2 出站)..."
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

echo ">> 开始执行 gomobile bind 交叉编译 (arm64-v8a)..."
gomobile bind -v \
  -target=android/arm64 \
  -androidapi=26 \
  -javapkg=io.nekohasekai \
  -libname=box \
  -trimpath \
  -ldflags="-s -w -buildid=" \
  -tags="with_quic" \
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
