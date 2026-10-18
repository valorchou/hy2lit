export interface Phase1FileItem {
  id: string;
  name: string;
  path: string;
  badge: string;
  description: string;
  code: string;
  language: string;
  beforeCode?: string;
  afterCode?: string;
}

export const PHASE_1_FILES: Phase1FileItem[] = [
  {
    id: 'registry-go',
    name: 'include/registry.go',
    path: 'sing-box/include/registry.go',
    badge: 'AST 核心出入站注册表裁剪',
    description: '彻底剥离无用协议入站（http, socks, mixed, shadowsocks, vmess, trojan 等）与出站，仅保留 tun 入站以及 direct, block, dns, hysteria2 出站。',
    language: 'go',
    beforeCode: `// 原版包含数十种协议
func InboundRegistry() *inbound.Registry {
	registry := inbound.NewRegistry()
	tun.RegisterInbound(registry)
	redirect.RegisterRedirect(registry)
	redirect.RegisterTProxy(registry)
	direct.RegisterInbound(registry)
	socks.RegisterInbound(registry)
	http.RegisterInbound(registry)
	mixed.RegisterInbound(registry)
	shadowsocks.RegisterInbound(registry)
	vmess.RegisterInbound(registry)
	trojan.RegisterInbound(registry)
	naive.RegisterInbound(registry)
	shadowtls.RegisterInbound(registry)
	vless.RegisterInbound(registry)
	registerQUICInbounds(registry)
	return registry
}

func OutboundRegistry() *outbound.Registry {
	registry := outbound.NewRegistry()
	direct.RegisterOutbound(registry)
	block.RegisterOutbound(registry)
	dns.RegisterOutbound(registry)
	group.RegisterSelector(registry)
	group.RegisterURLTest(registry)
	socks.RegisterOutbound(registry)
	http.RegisterOutbound(registry)
	shadowsocks.RegisterOutbound(registry)
	vmess.RegisterOutbound(registry)
	trojan.RegisterOutbound(registry)
	tor.RegisterOutbound(registry)
	ssh.RegisterOutbound(registry)
	shadowtls.RegisterOutbound(registry)
	vless.RegisterOutbound(registry)
	registerQUICOutbounds(registry)
	registerWireGuardOutbound(registry)
	return registry
}`,
    afterCode: `// Hy2Mini 极限精简版 registry.go
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
	tun.RegisterInbound(registry) // 仅保留 TUN 虚拟网卡接管系统流量
	return registry
}

func OutboundRegistry() *outbound.Registry {
	registry := outbound.NewRegistry()
	direct.RegisterOutbound(registry) // 大陆直连出站
	block.RegisterOutbound(registry)  // 拦截出站
	dns.RegisterOutbound(registry)    // 传统/远程 DNS 出站
	registerQUICOutbounds(registry)   // 包含 hysteria2
	return registry
}

func EndpointRegistry() *endpoint.Registry {
	return endpoint.NewRegistry()
}`,
    code: `package include

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
}`
  },
  {
    id: 'quic-go',
    name: 'include/quic.go',
    path: 'sing-box/include/quic.go',
    badge: 'QUIC 协议过滤 (仅保留 Hy2)',
    description: '剔除 TUIC、Hysteria 1 等无用 QUIC 协议，仅保留 Hysteria 2 客户端出站。',
    language: 'go',
    beforeCode: `func registerQUICInbounds(registry *inbound.Registry) {
	hysteria.RegisterInbound(registry)
	tuic.RegisterInbound(registry)
	hysteria2.RegisterInbound(registry)
}

func registerQUICOutbounds(registry *outbound.Registry) {
	hysteria.RegisterOutbound(registry)
	tuic.RegisterOutbound(registry)
	hysteria2.RegisterOutbound(registry)
}`,
    afterCode: `//go:build with_quic

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
}`,
    code: `//go:build with_quic

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
}`
  },
  {
    id: 'build-script-sh',
    name: 'trim_and_build.sh',
    path: 'scripts/trim_and_build.sh',
    badge: '自动化一键裁剪编译脚本',
    description: '基于 sing-box 官方配套 sagernet/gomobile@v0.1.4，自动拉取源码、替换 include/registry.go 与 include/quic.go，编译生成 libbox.aar。',
    language: 'bash',
    code: `#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo " [Hy2Mini] sing-box 源码裁剪与 libbox.aar 编译自动化工具 "
echo "=========================================================="

SINGBOX_VER="v1.11.4"
WORKDIR="$(pwd)/build_singbox"

# 1. 检查必要环境并安装配套 sagernet/gomobile
command -v go >/dev/null 2>&1 || { echo "❌ 请先安装 Go 1.22+"; exit 1; }
echo ">> 正在安装 sing-box 配套 gomobile 构建套件 (sagernet/gomobile)..."
go install -v github.com/sagernet/gomobile/cmd/gomobile@v0.1.4
go install -v github.com/sagernet/gomobile/cmd/gobind@v0.1.4
gomobile init

# 2. 克隆对应版本的 sing-box
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
git clone --depth 1 --branch "$SINGBOX_VER" https://github.com/sagernet/sing-box.git "$WORKDIR"
cd "$WORKDIR"

echo ">> 正在注入极限裁剪版 include/registry.go ..."
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

echo ">> 正在注入极限裁剪版 include/quic.go ..."
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
gomobile bind -v \\
  -target=android/arm64 \\
  -androidapi=26 \\
  -javapkg=io.nekohasekai \\
  -libname=box \\
  -trimpath \\
  -ldflags="-s -w -buildid=" \\
  -tags="with_quic" \\
  -o libbox.aar \\
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
`
  },
  {
    id: 'github-action-full-apk',
    name: 'build-apk.yml',
    path: '.github/workflows/build-apk.yml',
    badge: '一键云端自动编译 Release APK',
    description: '端到端全自动 CI/CD：自动编译 Go 裁剪内核 -> 自动组装 Android 项目 -> 执行 R8 混淆与 Gradle assembleRelease -> 直接输出可下载的 Release APK！',
    language: 'yaml',
    code: `name: Build Hy2Mini Release APK

on:
  workflow_dispatch:
  push:
    branches: [ "main", "master" ]
    tags: [ "v*" ]

jobs:
  build:
    name: Build and Assemble Release APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
          cache: 'gradle'

      - name: Set up Go 1.22
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'
          cache: true

      - name: Set up Android NDK r26c
        uses: nttld/setup-ndk@v1
        with:
          ndk-version: r26c
          add-to-path: true

      - name: Build Stripped sing-box AAR (gomobile)
        run: |
          go install -v github.com/sagernet/gomobile/cmd/gomobile@v0.1.4
          go install -v github.com/sagernet/gomobile/cmd/gobind@v0.1.4
          gomobile init
          
          git clone --depth 1 --branch v1.11.4 https://github.com/sagernet/sing-box.git sing-box-build
          cd sing-box-build
          
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

          mkdir -p ../android/app/libs
          echo "Executing gomobile bind..."
          gomobile bind -v \\
            -target=android/arm64 \\
            -androidapi=26 \\
            -javapkg=io.nekohasekai \\
            -libname=box \\
            -trimpath \\
            -ldflags="-s -w -buildid=" \\
            -tags="with_quic" \\
            -o ../android/app/libs/libbox.aar \\
            ./experimental/libbox
            
          cd ..
          mkdir -p android/app/src/main/assets
          curl -sSL -o android/app/src/main/assets/geoip-cn.srs https://github.com/SagerNet/sing-geoip/raw/rule-set/geoip-cn.srs

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v3

      - name: Build Release APK with Gradle
        run: |
          cd android
          gradle assembleRelease --stacktrace

      - name: Upload Release APK
        uses: actions/upload-artifact@v4
        with:
          name: Hy2Mini-Release-APK
          path: android/app/build/outputs/apk/release/*.apk
          retention-days: 30
`
  }
];
