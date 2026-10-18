import React, { useState } from 'react';
import { ParsedHy2Node, parseHy2Uri, generateSingBoxJson } from '../utils/configGenerator';
import { SAMPLE_NODES } from '../data/sampleNodes';
import { Copy, Check, Sparkles, Terminal, Code, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

export function UriDebugger({
  initialNode,
  initialMode = 1,
}: {
  initialNode?: ParsedHy2Node;
  initialMode?: 0 | 1;
}) {
  const [uriInput, setUriInput] = useState<string>(
    initialNode?.rawUri || SAMPLE_NODES[1].uri
  );
  const [routingMode, setRoutingMode] = useState<0 | 1>(initialMode);
  const [copied, setCopied] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Dynamic parse
  let parsedNode: ParsedHy2Node | null = null;
  let generatedJsonStr = '';

  try {
    parsedNode = parseHy2Uri(uriInput);
    const jsonConfig = generateSingBoxJson(parsedNode, routingMode);
    generatedJsonStr = JSON.stringify(jsonConfig, null, 2);
    if (parseError) setParseError(null);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (parseError !== msg) setParseError(msg);
  }

  const handleCopyJson = () => {
    if (!generatedJsonStr) return;
    navigator.clipboard.writeText(generatedJsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-zinc-900 to-blue-950/40 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                URI 调试器 &amp; 运行时配置生成
              </span>
              <span className="text-xs text-zinc-400">
                兼容 hy2:// 与 hysteria2:// 规范，实时生成 sing-box 运行结构
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Hysteria2 节点解析与 Fake-IP / DoH 规则组装
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              输入或选择任一 Hysteria2 链接，客户端中的 <code className="text-purple-400 font-mono">Hy2ConfigParser</code> 将在内存中实时提取鉴权、端口跳跃、混淆密码等，并组装出包含 TUN 虚拟网卡、198.18.0.0/15 Fake-IP、1.1.1.1 DoH 与 geoip-cn 45KB 二进制规则集的运行配置。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {SAMPLE_NODES.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => setUriInput(sample.uri)}
                className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg transition-all"
              >
                {sample.tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* URI Input & Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>输入 Hysteria2 分享链接</span>
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 font-medium">路由分流模式:</span>
            <div className="flex items-center bg-zinc-950 rounded-lg p-0.5 border border-zinc-800 text-xs">
              <button
                onClick={() => setRoutingMode(1)}
                className={`px-3 py-1 rounded font-medium transition-all ${
                  routingMode === 1 ? 'bg-purple-600 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                绕过大陆 IP (geoip-cn)
              </button>
              <button
                onClick={() => setRoutingMode(0)}
                className={`px-3 py-1 rounded font-medium transition-all ${
                  routingMode === 0 ? 'bg-purple-600 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                全局代理 (Global)
              </button>
            </div>
          </div>
        </div>

        <textarea
          rows={3}
          value={uriInput}
          onChange={e => setUriInput(e.target.value)}
          placeholder="hy2://password@host:port/?sni=host&insecure=0#Remarks"
          className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-200 focus:outline-none focus:border-purple-500 leading-relaxed"
        />

        {parseError && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-900/50 p-2.5 rounded-lg">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}
      </div>

      {/* Two Columns: Field Inspector vs Generated Sing-Box JSON */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Fields Breakdown */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>字段语义解析结果</span>
              </h3>
              <span className="text-[11px] text-zinc-500">Android 原生 Uri.parse</span>
            </div>

            {parsedNode ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400">节点别名 (remarks)</span>
                  <span className="font-semibold text-zinc-100">{parsedNode.remarks}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400">服务器地址 (host)</span>
                  <span className="font-mono text-emerald-400">{parsedNode.host}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400">连接端口 (port)</span>
                  <span className="font-mono text-blue-400">{parsedNode.port}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400">端口跳跃 (mport)</span>
                  <span className="font-mono text-amber-400">
                    {parsedNode.serverPorts ? parsedNode.serverPorts.join(', ') : '未启用 (单端口)'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400">TLS SNI (server_name)</span>
                  <span className="font-mono text-zinc-300">{parsedNode.sni}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400">自签证书跳过校验 (insecure)</span>
                  <span className={`font-semibold ${parsedNode.insecure ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {parsedNode.insecure ? 'true (跳过校验)' : 'false (严校验)'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400">混淆 (Salamander obfs)</span>
                  <span className="font-mono text-purple-400">
                    {parsedNode.obfsType ? `${parsedNode.obfsType} (${parsedNode.obfsPassword})` : '无混淆'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400">拥塞流控算法 (Brutal)</span>
                  <span className="font-mono text-zinc-300">
                    {parsedNode.upMbps || parsedNode.downMbps ? (
                      <span className="text-emerald-400">
                        Brutal (↑{parsedNode.upMbps || 0}M / ↓{parsedNode.downMbps || 0}M)
                      </span>
                    ) : (
                      <span className="text-zinc-500">标准 BBR 拥塞控制</span>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 text-xs py-8 text-center italic">
                请输入有效的 hy2 链接以查看字段解析
              </div>
            )}
          </div>
        </div>

        {/* Right: Generated Sing-Box Runtime JSON */}
        <div className="lg:col-span-7 flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="h-13 bg-zinc-950 px-4 flex items-center justify-between border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-zinc-200">
                运行时 sing-box 核心 JSON 配置 (Libbox.newService 载荷)
              </span>
            </div>

            <button
              onClick={handleCopyJson}
              disabled={!generatedJsonStr}
              className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制 JSON' : '复制 JSON'}</span>
            </button>
          </div>

          <div className="p-4 overflow-x-auto max-h-[560px] bg-zinc-950/80 font-mono text-xs leading-relaxed text-zinc-300">
            {generatedJsonStr ? (
              <pre className="whitespace-pre">{generatedJsonStr}</pre>
            ) : (
              <div className="text-zinc-600 text-center py-12">等待生成配置...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
