/**
 * Hy2ConfigParser logic implementation in TypeScript
 * Matches the exact behavior of Hy2ConfigParser.kt specified in the PRD
 */

export interface ParsedHy2Node {
  id: string;
  rawUri: string;
  remarks: string;
  auth: string;
  host: string;
  port: number;
  sni: string;
  insecure: boolean;
  obfsType?: string;
  obfsPassword?: string;
  mport?: string; // e.g. "20000-50000"
  serverPorts?: string[]; // e.g. ["20000:50000"]
  upMbps?: number;
  downMbps?: number;
  latency?: number | null;
}

export function parseHy2Uri(uriString: string): ParsedHy2Node {
  const trimmed = uriString.trim();
  if (!trimmed.startsWith('hy2://') && !trimmed.startsWith('hysteria2://')) {
    throw new Error('URI 必须以 hy2:// 或 hysteria2:// 开头');
  }

  try {
    // Normalizing protocol to http for standard URL parser
    const standardUrlStr = trimmed.replace(/^(hy2|hysteria2):\/\//, 'http://');
    const url = new URL(standardUrlStr);

    const auth = decodeURIComponent(url.username || '');
    const host = url.hostname;
    const port = url.port ? parseInt(url.port, 10) : 443;
    const remarks = url.hash ? decodeURIComponent(url.hash.replace(/^#/, '')) : `${host}:${port}`;

    const sni = url.searchParams.get('sni') || host;
    const insecure = url.searchParams.get('insecure') === '1';
    const obfs = url.searchParams.get('obfs') || undefined;
    const obfsPassword = url.searchParams.get('obfs-password') || undefined;
    const mport = url.searchParams.get('mport') || undefined;
    
    // server_ports formatting e.g. "20000-50000" -> ["20000:50000"]
    let serverPorts: string[] | undefined;
    if (mport) {
      serverPorts = [mport.replace('-', ':')];
    }

    const upParam = url.searchParams.get('upmbps');
    const downParam = url.searchParams.get('downmbps');
    const upMbps = upParam ? parseInt(upParam, 10) : undefined;
    const downMbps = downParam ? parseInt(downParam, 10) : undefined;

    return {
      id: 'node-' + Math.random().toString(36).substring(2, 9),
      rawUri: trimmed,
      remarks: remarks || `${host}:${port}`,
      auth,
      host,
      port,
      sni,
      insecure,
      obfsType: obfs,
      obfsPassword,
      mport,
      serverPorts,
      upMbps,
      downMbps,
      latency: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`URI 解析失败: ${message}`);
  }
}

export function generateSingBoxJson(node: ParsedHy2Node, routingMode: 0 | 1): object {
  const isBypassCn = routingMode === 1;

  // Build outbound hysteria2 config
  const hy2Outbound: Record<string, unknown> = {
    type: 'hysteria2',
    tag: 'proxy',
    server: node.host,
    server_port: node.port,
    password: node.auth,
    tls: {
      enabled: true,
      server_name: node.sni || node.host,
      insecure: node.insecure,
    },
  };

  if (node.serverPorts && node.serverPorts.length > 0) {
    hy2Outbound.server_ports = node.serverPorts;
  }

  if (node.obfsType) {
    hy2Outbound.obfs = {
      type: node.obfsType,
      password: node.obfsPassword || '',
    };
  }

  if (node.upMbps && node.upMbps > 0) {
    hy2Outbound.up_mbps = node.upMbps;
  }
  if (node.downMbps && node.downMbps > 0) {
    hy2Outbound.down_mbps = node.downMbps;
  }

  // Routing rules
  const routeRules: Array<Record<string, unknown>> = [
    { protocol: 'dns', outbound: 'dns-out' },
    { ip_is_private: true, outbound: 'direct' },
  ];

  if (isBypassCn) {
    routeRules.push({
      rule_set: ['geoip-cn'],
      outbound: 'direct',
    });
  }

  const routeConfig: Record<string, unknown> = {
    rules: routeRules,
    auto_detect_interface: true,
    final: 'proxy',
  };

  if (isBypassCn) {
    routeConfig.rule_set = [
      {
        type: 'local',
        tag: 'geoip-cn',
        format: 'binary',
        path: '/data/user/0/io.github.hy2mini/files/geoip-cn.srs',
      },
    ];
  }

  return {
    log: {
      level: 'warn',
    },
    dns: {
      servers: [
        {
          tag: 'dns-remote',
          address: 'https://1.1.1.1/dns-query',
          address_resolver: 'dns-direct',
          detour: 'proxy',
        },
        {
          tag: 'dns-direct',
          address: '223.5.5.5',
          detour: 'direct',
        },
        {
          tag: 'dns-fakeip',
          address: 'fakeip',
        },
      ],
      rules: [
        { outbound: 'any', server: 'dns-direct' },
        { query_type: ['A', 'AAAA'], server: 'dns-fakeip' },
      ],
      fakeip: {
        enabled: true,
        inet4_range: '198.18.0.0/15',
        inet6_range: 'fc00::/18',
      },
      independent_cache: true,
    },
    inbounds: [
      {
        type: 'tun',
        tag: 'tun-in',
        interface_name: 'tun0',
        inet4_address: '172.19.0.1/30',
        inet6_address: 'fdfe:dcba:9876::1/126',
        mtu: 1400,
        auto_route: true,
        strict_route: true,
        stack: 'system',
        sniff: true,
        sniff_override_destination: false,
      },
    ],
    outbounds: [
      hy2Outbound,
      { type: 'direct', tag: 'direct' },
      { type: 'block', tag: 'block' },
      { type: 'dns', tag: 'dns-out' },
    ],
    route: routeConfig,
  };
}
