export interface SampleNodeDefinition {
  title: string;
  tag: string;
  description: string;
  uri: string;
}

export const SAMPLE_NODES: SampleNodeDefinition[] = [
  {
    title: '东京优化节点 (标准配置)',
    tag: 'Tokyo-BBR',
    description: '标准单端口、TLS 证书健全、自动路由',
    uri: 'hy2://securepass123@tyo01.node.net:443/?sni=tyo01.node.net&insecure=0#东京-BBR优化-01',
  },
  {
    title: '美西高速节点 (多端口跳跃 mport)',
    tag: 'US-West-Mport',
    description: '配置 20000-50000 端口跳跃，抗 UDP QoS',
    uri: 'hy2://secrettoken88@lax.us-proxy.io:443/?sni=lax.us-proxy.io&insecure=0&mport=20000-50000#美西-加州多端口跳跃',
  },
  {
    title: '香港极速 (Salamander 混淆 + Brutal 流控)',
    tag: 'HK-Salamander',
    description: 'Salamander 混淆抗深度包检测，并启用 100M/300M Brutal 拥塞控制',
    uri: 'hy2://user_hk_alpha@hk-direct.cloud:8443/?sni=hk-direct.cloud&obfs=salamander&obfs-password=chaos9988&upmbps=100&downmbps=300#香港-Salamander混淆-极速',
  },
  {
    title: '自建测试节点 (Insecure 自签证书)',
    tag: 'Self-Signed',
    description: '跳过 TLS 证书链验证 (insecure=1)，适合自建测试或内网穿透',
    uri: 'hy2://myvpspassword@198.51.100.24:3443/?sni=test.internal&insecure=1#自建VPS-自签证书测试',
  },
  {
    title: '新加坡游戏专线 (多端口 + Brutal)',
    tag: 'SG-Gaming',
    description: '低延迟优化，多端口跳跃搭配下行 500Mbps 激进拥塞控制',
    uri: 'hy2://gamepass6677@sg-premium.edge.net:1443/?sni=sg-premium.edge.net&mport=30000-45000&upmbps=50&downmbps=500#新加坡-低延迟专线',
  },
];
