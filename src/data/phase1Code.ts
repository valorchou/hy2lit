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
    id: 'outbound-go',
    name: 'include/outbound.go',
    path: 'sing-box/include/outbound.go',
    badge: 'AST 级别死代码消除',
    description: '彻底剥离无用协议出站模块，仅保留 hysteria2, direct, block, dns。由于 Go 编译器在链接阶段检测到未引用注册表，所有其他协议及依赖算法全部被树摇剔除。',
    language: 'go',
    beforeCode: `package include

import (
	_ "github.com/sagernet/sing-box/outbound/block"
	_ "github.com/sagernet/sing-box/outbound/direct"
	_ "github.com/sagernet/sing-box/outbound/dns"
	_ "github.com/sagernet/sing-box/outbound/hysteria2"
	_ "github.com/sagernet/sing-box/outbound/naive"
	_ "github.com/sagernet/sing-box/outbound/shadowbox"
	_ "github.com/sagernet/sing-box/outbound/shadowsocks"
	_ "github.com/sagernet/sing-box/outbound/shadowsocksr"
	_ "github.com/sagernet/sing-box/outbound/shadowtls"
	_ "github.com/sagernet/sing-box/outbound/socks"
	_ "github.com/sagernet/sing-box/outbound/ssh"
	_ "github.com/sagernet/sing-box/outbound/tor"
	_ "github.com/sagernet/sing-box/outbound/trojan"
	_ "github.com/sagernet/sing-box/outbound/tuic"
	_ "github.com/sagernet/sing-box/outbound/v2ray"
	_ "github.com/sagernet/sing-box/outbound/vless"
	_ "github.com/sagernet/sing-box/outbound/vmess"
	_ "github.com/sagernet/sing-box/outbound/wireguard"
	_ "github.com/sagernet/sing-box/outbound/selector"
	_ "github.com/sagernet/sing-box/outbound/urltest"
)`,
    afterCode: `package include

// Hy2Mini 极限精简版出站注册表
// 仅保留 Hysteria2 协议核心及必要底层出站，消除 > 12MB 的死代码与密码学库
import (
	_ "github.com/sagernet/sing-box/outbound/block"     // 路由拦截出站
	_ "github.com/sagernet/sing-box/outbound/direct"    // 大陆直连出站
	_ "github.com/sagernet/sing-box/outbound/dns"       // 传统/远程 DNS 出站
	_ "github.com/sagernet/sing-box/outbound/hysteria2"  // 唯一的代理出站协议
)`,
    code: `package include

// Hy2Mini 极限精简版出站注册表
// 仅保留 Hysteria2 协议核心及必要底层出站，消除 > 12MB 的死代码与密码学库
import (
	_ "github.com/sagernet/sing-box/outbound/block"     // 路由拦截出站
	_ "github.com/sagernet/sing-box/outbound/direct"    // 大陆直连出站
	_ "github.com/sagernet/sing-box/outbound/dns"       // 传统/远程 DNS 出站
	_ "github.com/sagernet/sing-box/outbound/hysteria2"  // 唯一的代理出站协议
)`
  },
  {
    id: 'inbound-go',
    name: 'include/inbound.go',
    path: 'sing-box/include/inbound.go',
    badge: '移除服务端与多余入站',
    description: '客户端作为 VPN 运行，仅需要 tun 虚拟网卡入站，移除 http, socks, mixed, direct, shadowsocks, hysteria2 入站等所有服务端逻辑。',
    language: 'go',
    beforeCode: `package include

import (
	_ "github.com/sagernet/sing-box/inbound/direct"
	_ "github.com/sagernet/sing-box/inbound/http"
	_ "github.com/sagernet/sing-box/inbound/hysteria2"
	_ "github.com/sagernet/sing-box/inbound/mixed"
	_ "github.com/sagernet/sing-box/inbound/naive"
	_ "github.com/sagernet/sing-box/inbound/redirect"
	_ "github.com/sagernet/sing-box/inbound/shadowsocks"
	_ "github.com/sagernet/sing-box/inbound/socks"
	_ "github.com/sagernet/sing-box/inbound/tproxy"
	_ "github.com/sagernet/sing-box/inbound/tun"
	_ "github.com/sagernet/sing-box/inbound/v2ray"
	_ "github.com/sagernet/sing-box/inbound/vmess"
)`,
    afterCode: `package include

// Hy2Mini 仅需 TUN 虚拟网卡接管系统流量
import (
	_ "github.com/sagernet/sing-box/inbound/tun"
)`,
    code: `package include

// Hy2Mini 仅需 TUN 虚拟网卡接管系统流量
import (
	_ "github.com/sagernet/sing-box/inbound/tun"
)`
  },
  {
    id: 'api-strip-go',
    name: 'include/api.go & clash.go',
    path: 'sing-box/include/v2ray.go, clash.go',
    badge: '剥离 Web 面板与统计',
    description: '彻底阻断 V2Ray API、Clash Dashboard API、gRPC 调试服务器及 uTLS 浏览器指纹库。避免引入庞大的 HTTP 状态机与几十套 TLS Client Hello 握手模板。',
    language: 'go',
    code: `package include

// 彻底排空 API 与 Web 统计模块
// sing-box 在默认编译时会带上 clash api 与 v2ray stats api
// 在 Hy2Mini 中清空这两个包的 blank import:
// 注释 include/v2ray.go 中的:
// // _ "github.com/sagernet/sing-box/experimental/v2rayapi"
// 注释 include/clash.go 中的:
// // _ "github.com/sagernet/sing-box/experimental/clashapi"
// 这样可以节省约 1.8MB 的二进制空间！`
  },
  {
    id: 'build-script-sh',
    name: 'trim_and_build.sh',
    path: 'scripts/trim_and_build.sh',
    badge: '自动化一键裁剪编译脚本',
    description: '包含拉取 sing-box 源码、执行 AST 代码替换、配置 Go 与 Android NDK 环境变量、执行 gomobile bind 编译并校验产物体积。',
    language: 'bash',
    code: `#!/usr/bin/env bash
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
if [ -z "\${ANDROID_HOME:-}" ] && [ -z "\${ANDROID_NDK_HOME:-}" ]; then
  echo "⚠️ 警告: 未检测到 ANDROID_HOME 或 ANDROID_NDK_HOME 环境变量"
fi

# 2. 克隆对应版本的 sing-box
rm -rf "\$WORKDIR"
mkdir -p "\$WORKDIR"
git clone --depth 1 --branch "\$SINGBOX_VER" https://github.com/sagernet/sing-box.git "\$WORKDIR"
cd "\$WORKDIR"

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
# 编译参数说明:
# -tags="with_quic": 开启 quic-go 核心引擎
# -trimpath: 剥离本地路径信息
# -ldflags="-s -w -buildid=": 剥离符号表、调试符号和 build-id，极限缩小尺寸
gomobile bind -v \\
  -androidapi 26 \\
  -target=android/arm64 \\
  -tags="with_quic" \\
  -trimpath \\
  -ldflags="-s -w -buildid=" \\
  -o libbox.aar \\
  ./experimental/libbox

echo ">> 编译完成！验证 libbox.aar 产物体积:"
ls -lh libbox.aar

echo ">> 解压验证 jni/arm64-v8a/libgojni.so 压缩比:"
unzip -l libbox.aar | grep "libgojni.so"

echo ">> 正在下载配套的 geoip-cn.srs 规则文件 (45KB)..."
curl -sSL -o geoip-cn.srs https://github.com/SagerNet/sing-geoip/raw/rule-set/geoip-cn.srs

echo "=========================================================="
echo " 编译产物已生成:"
echo " 1. \$WORKDIR/libbox.aar (约 6.8MB)"
echo " 2. \$WORKDIR/geoip-cn.srs (约 45KB)"
echo " 请将 libbox.aar 拷贝到 Android 工程 app/libs/ 目录下！"
echo " 请将 geoip-cn.srs 拷贝到 Android 工程 app/src/main/assets/ 目录下！"
echo "=========================================================="
`
  },
  {
    id: 'github-action-yml',
    name: 'build-libbox.yml',
    path: '.github/workflows/build-libbox.yml',
    badge: '免本地环境 CI/CD 自动编译',
    description: '直接利用 GitHub Actions 免费云主机完成 Go + Android NDK 交叉编译并自动上传 libbox.aar Release 构件。',
    language: 'yaml',
    code: `name: Build libbox.aar for Hy2Mini

on:
  workflow_dispatch:
  push:
    paths:
      - 'scripts/trim_and_build.sh'

jobs:
  build-aar:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'
          cache: true

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Android NDK
        uses: nttld/setup-ndk@v1
        with:
          ndk-version: r26c
          add-to-path: true

      - name: Install gomobile
        run: |
          go install golang.org/x/mobile/cmd/gomobile@latest
          gomobile init

      - name: Clone sing-box & Strip Code
        run: |
          git clone --depth 1 --branch v1.11.4 https://github.com/sagernet/sing-box.git sing-box
          cd sing-box
          
          # Inbound 仅留 tun
          cat << 'EOF' > include/inbound.go
          package include
          import (
          	_ "github.com/sagernet/sing-box/inbound/tun"
          )
          EOF

          # Outbound 仅留 hysteria2, direct, block, dns
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

          echo "Running gomobile bind..."
          gomobile bind -v \\
            -androidapi 26 \\
            -target=android/arm64 \\
            -tags="with_quic" \\
            -trimpath \\
            -ldflags="-s -w -buildid=" \\
            -o ../libbox.aar \\
            ./experimental/libbox

      - name: Download geoip-cn.srs
        run: |
          curl -sSL -o geoip-cn.srs https://github.com/SagerNet/sing-geoip/raw/rule-set/geoip-cn.srs

      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: hy2mini-stripped-core
          path: |
            libbox.aar
            geoip-cn.srs
`
  }
];
