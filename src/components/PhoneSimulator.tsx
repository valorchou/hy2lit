import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Signal,
  Battery,
  QrCode,
  Layers,
  Trash2,
  Play,
  Square,
  Activity,
  ArrowRight,
  Check,
  ShieldCheck,
  RotateCw,
  X,
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';
import { ParsedHy2Node, parseHy2Uri, generateSingBoxJson } from '../utils/configGenerator';
import { SAMPLE_NODES } from '../data/sampleNodes';

const INITIAL_NODES_DATA: ParsedHy2Node[] = SAMPLE_NODES.map(s => parseHy2Uri(s.uri));

interface SimulatedApp {
  name: string;
  pkg: string;
  iconBg: string;
  iconLetter: string;
  isBypassed: boolean;
}

const DEFAULT_APPS: SimulatedApp[] = [
  { name: '微信', pkg: 'com.tencent.mm', iconBg: 'bg-emerald-500', iconLetter: '微', isBypassed: true },
  { name: '支付宝', pkg: 'com.eg.android.AlipayGphone', iconBg: 'bg-blue-500', iconLetter: '支', isBypassed: true },
  { name: '哔哩哔哩', pkg: 'tv.danmaku.bili', iconBg: 'bg-pink-400', iconLetter: 'B', isBypassed: true },
  { name: '高德地图', pkg: 'com.autonavi.minimap', iconBg: 'bg-blue-600', iconLetter: '高', isBypassed: true },
  { name: '网易云音乐', pkg: 'com.netease.cloudmusic', iconBg: 'bg-red-500', iconLetter: '云', isBypassed: true },
  { name: 'Telegram', pkg: 'org.telegram.messenger', iconBg: 'bg-sky-500', iconLetter: 'TG', isBypassed: false },
  { name: 'Chrome 浏览器', pkg: 'com.android.chrome', iconBg: 'bg-yellow-500', iconLetter: 'C', isBypassed: false },
  { name: 'YouTube', pkg: 'com.google.android.youtube', iconBg: 'bg-red-600', iconLetter: 'YT', isBypassed: false },
  { name: 'GitHub', pkg: 'com.github.android', iconBg: 'bg-zinc-800', iconLetter: 'GH', isBypassed: false },
];

export function PhoneSimulator({
  onSelectNodeForInspection,
}: {
  onSelectNodeForInspection?: (node: ParsedHy2Node, mode: 0 | 1) => void;
}) {
  const [nodes, setNodes] = useState<ParsedHy2Node[]>(INITIAL_NODES_DATA);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(INITIAL_NODES_DATA[0].id);
  const [routingMode, setRoutingMode] = useState<0 | 1>(1); // 1 = Bypass CN, 0 = Global
  const [inputUri, setInputUri] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('未连接');
  const [isTestingLatency, setIsTestingLatency] = useState<boolean>(false);
  const [activeNetwork, setActiveNetwork] = useState<'wifi' | 'cellular'>('wifi');
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [showNotification, setShowNotification] = useState<boolean>(false);

  // Modals
  const [showScanModal, setShowScanModal] = useState<boolean>(false);
  const [showAppSelectModal, setShowAppSelectModal] = useState<boolean>(false);
  const [installedApps, setInstalledApps] = useState<SimulatedApp[]>(DEFAULT_APPS);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[0];

  useEffect(() => {
    if (selectedNode && onSelectNodeForInspection) {
      onSelectNodeForInspection(selectedNode, routingMode);
    }
  }, [selectedNode, routingMode, onSelectNodeForInspection]);

  const addLog = (text: string) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    setLogs(prev => [`[${timestamp}] ${text}`, ...prev.slice(0, 49)]);
  };

  const handleAddUri = (uriToAdd?: string) => {
    const uri = uriToAdd || inputUri.trim();
    if (!uri) return;
    try {
      const newNode = parseHy2Uri(uri);
      setNodes(prev => [newNode, ...prev]);
      setSelectedNodeId(newNode.id);
      setInputUri('');
      addLog(`成功解析并添加节点: ${newNode.remarks}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    }
  };

  const handleDeleteNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodes.length <= 1) {
      alert('至少保留一个节点供测试');
      return;
    }
    const target = nodes.find(n => n.id === id);
    setNodes(prev => prev.filter(n => n.id !== id));
    if (selectedNodeId === id) {
      const remaining = nodes.filter(n => n.id !== id);
      setSelectedNodeId(remaining[0].id);
    }
    if (target) {
      addLog(`已删除节点: ${target.remarks}`);
    }
  };

  const handleToggleVpn = () => {
    if (isConnected) {
      setIsConnected(false);
      setStatusText('未连接');
      setShowNotification(false);
      addLog('VPN 核心已关闭: BoxService.close(), tunFd.detachFd() 已释放');
    } else {
      if (!selectedNode) {
        alert('请先选择一个节点');
        return;
      }
      setIsConnected(true);
      setStatusText('已连接 - 点击测速 (RTT: -- ms)');
      setShowNotification(true);
      addLog(`TUN 建立成功 (MTU: 1400, Interface: tun0)`);
      addLog(`Go 内核启动: Hysteria2 -> ${selectedNode.host}:${selectedNode.port}`);
      addLog(`分流策略: ${routingMode === 1 ? '绕过大陆 IP (geoip-cn.srs 45KB)' : '全局代理'}`);
      addLog(`已排除本地应用: ${installedApps.filter(a => a.isBypassed).map(a => a.name).join(', ')}`);
    }
  };

  const handleTestLatency = () => {
    if (!isConnected || isTestingLatency) return;
    setIsTestingLatency(true);
    setStatusText('正在发起 204 测速...');
    addLog(`发起 HttpURLConnection -> http://cp.cloudflare.com/generate_204`);

    setTimeout(() => {
      // realistic latency calculation based on node host
      const isLocalOrAsia = selectedNode.host.includes('hk') || selectedNode.host.includes('tyo') || selectedNode.host.includes('sg');
      const baseRtt = isLocalOrAsia ? 35 : 125;
      const jitter = Math.floor(Math.random() * 20);
      const measuredRtt = baseRtt + jitter;

      setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, latency: measuredRtt } : n));
      setStatusText(`已连接 - 点击测速 (RTT: ${measuredRtt} ms)`);
      setIsTestingLatency(false);
      addLog(`HTTP 204 探针成功返回响应码 204, RTT: ${measuredRtt}ms`);
    }, 450);
  };

  const handleNetworkSwitch = () => {
    const nextNet = activeNetwork === 'wifi' ? 'cellular' : 'wifi';
    setActiveNetwork(nextNet);
    const ifName = nextNet === 'wifi' ? 'wlan0' : 'rmnet_data0';
    const ifIndex = nextNet === 'wifi' ? 24 : 12;
    addLog(`【网络感知】ConnectivityManager 触发 onCapabilitiesChanged: 切换为 ${nextNet === 'wifi' ? 'Wi-Fi (wlan0)' : '5G移动蜂窝网 (rmnet_data0)'}`);
    addLog(`调用 listener.updateDefaultInterface("${ifName}", ${ifIndex}, isExpensive=${nextNet === 'cellular'})`);
    if (isConnected) {
      addLog(`Go 内核底层 QUIC 连接成功热迁移至新网卡，握手无中断！`);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row items-center xl:items-start justify-center gap-8 p-2 sm:p-4">
      {/* Phone Body Mockup */}
      <div className="relative w-[340px] sm:w-[370px] h-[720px] bg-zinc-950 rounded-[48px] p-3 shadow-2xl border-4 border-zinc-700 flex flex-col shrink-0">
        {/* Top Speaker / Dynamic Island */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-zinc-900 rounded-full flex items-center justify-center z-30">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-zinc-800 mr-2" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-900/60" />
        </div>

        {/* Screen Content */}
        <div className="w-full h-full bg-[#FAFAFA] rounded-[38px] overflow-hidden flex flex-col text-zinc-900 relative">
          {/* Status Bar */}
          <div className="h-10 pt-1.5 px-6 flex items-center justify-between text-xs font-medium text-zinc-700 select-none bg-zinc-100/90 border-b border-zinc-200">
            <span>09:41</span>
            <div className="flex items-center gap-2">
              {isConnected && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white tracking-wider">
                  VPN
                </span>
              )}
              {activeNetwork === 'wifi' ? (
                <Wifi className="w-3.5 h-3.5 text-zinc-700" />
              ) : (
                <div className="flex items-center gap-0.5 text-[10px] font-bold text-zinc-800">
                  <Signal className="w-3.5 h-3.5" />
                  <span>5G</span>
                </div>
              )}
              <Battery className="w-4 h-4 text-zinc-700" />
            </div>
          </div>

          {/* Android Notification Dropdown Peek (Clickable) */}
          {isConnected && showNotification && (
            <div className="bg-zinc-800 text-zinc-100 text-[11px] px-3 py-2 flex items-center justify-between border-b border-zinc-700 shadow-sm transition-all animate-in fade-in">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white">
                  ✓
                </div>
                <div>
                  <div className="font-semibold text-zinc-200">Hy2Mini 运行中</div>
                  <div className="text-[10px] text-zinc-400 truncate max-w-[210px]">
                    已连接: {selectedNode?.remarks}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowNotification(false)}
                className="text-zinc-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Native XML View Replica matching tech spec */}
          <div className="flex-1 flex flex-col p-3 overflow-hidden text-zinc-900">
            {/* Top Input Bar: EditText + Add + Scan + Apps */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={inputUri}
                onChange={e => setInputUri(e.target.value)}
                placeholder="输入 hy2:// 链接"
                className="flex-1 h-9 px-2.5 text-xs bg-zinc-100 border border-zinc-300 rounded font-mono text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleAddUri()}
                className="h-9 px-2.5 text-xs font-semibold bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded active:scale-95 transition-all shadow-sm"
              >
                添加
              </button>
              <button
                onClick={() => setShowScanModal(true)}
                className="h-9 px-2 text-xs font-semibold bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded active:scale-95 transition-all flex items-center justify-center shadow-sm"
                title="扫码"
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowAppSelectModal(true)}
                className="h-9 px-2 text-xs font-semibold bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded active:scale-95 transition-all flex items-center justify-center shadow-sm"
                title="分应用代理"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mode RadioGroup */}
            <div className="flex items-center justify-around py-2.5 mt-2 bg-zinc-50 border border-zinc-200 rounded text-xs select-none">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="routing_mode"
                  checked={routingMode === 1}
                  onChange={() => setRoutingMode(1)}
                  className="w-3.5 h-3.5 text-blue-600 focus:ring-0"
                />
                <span className="font-medium text-zinc-800">绕过大陆 IP</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="routing_mode"
                  checked={routingMode === 0}
                  onChange={() => setRoutingMode(0)}
                  className="w-3.5 h-3.5 text-blue-600 focus:ring-0"
                />
                <span className="font-medium text-zinc-800">全局代理</span>
              </label>
            </div>

            {/* Node List Header */}
            <div className="flex items-center justify-between mt-2.5 mb-1 text-[11px] text-zinc-500 font-medium px-1">
              <span>节点列表 ({nodes.length}) - 单击切换 / 长按删除</span>
              <span className="text-[10px] text-blue-600 font-semibold cursor-pointer" onClick={() => handleAddUri(SAMPLE_NODES[Math.floor(Math.random() * SAMPLE_NODES.length)].uri)}>
                +随机预设
              </span>
            </div>

            {/* Native ListView Replica */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 border border-zinc-200 rounded bg-white p-1">
              {nodes.map(node => {
                const isSelected = node.id === selectedNodeId;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`p-2.5 rounded border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                        : 'bg-white border-zinc-100 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setSelectedNodeId(node.id)}
                        className="w-3.5 h-3.5 text-blue-600 shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs font-bold text-zinc-900 truncate">
                          {node.remarks}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
                          <span>{node.host}:{node.port}</span>
                          {node.serverPorts && (
                            <span className="text-[9px] px-1 bg-amber-100 text-amber-800 rounded font-sans">
                              跳跃
                            </span>
                          )}
                          {node.obfsType && (
                            <span className="text-[9px] px-1 bg-purple-100 text-purple-800 rounded font-sans">
                              混淆
                            </span>
                          )}
                          {node.upMbps && (
                            <span className="text-[9px] px-1 bg-emerald-100 text-emerald-800 rounded font-sans">
                              Brutal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {node.latency !== null && node.latency !== undefined && (
                        <span className={`text-[10px] font-mono font-semibold px-1 py-0.5 rounded ${
                          node.latency < 80 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
                        }`}>
                          {node.latency}ms
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteNode(node.id, e)}
                        className="p-1 text-zinc-400 hover:text-red-600 rounded transition-colors"
                        title="删除节点"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Controls */}
            <div className="pt-2 flex flex-col gap-1.5">
              {/* Status and Latency TextView */}
              <div
                onClick={handleTestLatency}
                className={`py-1.5 text-center text-xs font-medium rounded cursor-pointer transition-colors ${
                  isConnected
                    ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                    : 'text-zinc-500 bg-zinc-100'
                }`}
              >
                {statusText}
              </div>

              {/* Big Main Button */}
              <button
                onClick={handleToggleVpn}
                className={`w-full h-11 text-sm font-bold text-white rounded transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 ${
                  isConnected
                    ? 'bg-[#E53935] hover:bg-red-600'
                    : 'bg-[#1E88E5] hover:bg-blue-600'
                }`}
              >
                {isConnected ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>断开连接</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>启动连接</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Android Bottom Navigation Bar */}
          <div className="h-6 flex items-center justify-center bg-zinc-100 border-t border-zinc-200">
            <div className="w-24 h-1 bg-zinc-400 rounded-full" />
          </div>
        </div>

        {/* Modal: QrScanActivity 100-Line Scanner Mockup */}
        {showScanModal && (
          <div className="absolute inset-0 bg-black/85 rounded-[44px] z-40 p-4 flex flex-col text-white animate-in fade-in">
            <div className="flex items-center justify-between pt-4 pb-2 border-b border-zinc-800">
              <span className="text-xs font-bold text-zinc-300">QrScanActivity (100 行扫码器)</span>
              <button
                onClick={() => setShowScanModal(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center my-4 relative">
              {/* Camera2 TextureView Simulator */}
              <div className="w-48 h-48 border-2 border-emerald-500 rounded-lg relative overflow-hidden bg-zinc-900 flex items-center justify-center">
                <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
                <div className="w-full h-0.5 bg-emerald-400 absolute top-1/2 -translate-y-1/2 shadow-lg shadow-emerald-400/50 animate-bounce" />
                <QrCode className="w-24 h-24 text-zinc-400 opacity-60" />
              </div>
              <div className="text-[11px] text-zinc-300 mt-3 text-center">
                Camera2 YUV_420_888 亮度通道零拷贝解码
              </div>
            </div>

            {/* Quick Preset Pick for Testing */}
            <div className="bg-zinc-900 rounded-lg p-2.5 text-xs">
              <div className="text-[11px] text-zinc-400 mb-1.5 font-medium">点击模拟扫码识别:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {SAMPLE_NODES.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleAddUri(s.uri);
                      setShowScanModal(false);
                    }}
                    className="w-full text-left p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 truncate flex items-center justify-between"
                  >
                    <span>{s.title}</span>
                    <span className="text-[9px] text-emerald-400">识别</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal: AppSelectActivity Per-App Proxy Mockup */}
        {showAppSelectModal && (
          <div className="absolute inset-0 bg-white rounded-[44px] z-40 p-4 flex flex-col text-zinc-900 animate-in fade-in">
            <div className="flex items-center justify-between pt-4 pb-2 border-b border-zinc-200">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold">分应用代理 (AppSelectActivity)</span>
              </div>
              <button
                onClick={() => setShowAppSelectModal(false)}
                className="text-zinc-500 hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[11px] text-zinc-500 py-1.5 bg-zinc-50 px-2 rounded my-1 border border-zinc-100">
              勾选的应用将添加至 <code className="text-zinc-700 font-mono">addDisallowedApplication</code> 绕过代理直连
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 my-1">
              {installedApps.map(app => (
                <div
                  key={app.pkg}
                  onClick={() => {
                    setInstalledApps(prev => prev.map(a => a.pkg === app.pkg ? { ...a, isBypassed: !a.isBypassed } : a));
                  }}
                  className="py-2 px-1 flex items-center justify-between hover:bg-zinc-50 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${app.iconBg} text-white flex items-center justify-center font-bold text-xs`}>
                      {app.iconLetter}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-zinc-900">{app.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">{app.pkg}</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={app.isBypassed}
                    onChange={() => {}}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowAppSelectModal(false);
                addLog(`更新分流应用名单: 已排除 ${installedApps.filter(a => a.isBypassed).length} 个应用`);
              }}
              className="w-full py-2 bg-blue-600 text-white rounded text-xs font-bold shadow-sm"
            >
              保存并生效
            </button>
          </div>
        )}
      </div>

      {/* Simulator Control & Inspection Sidecar Panel */}
      <div className="w-full xl:w-[480px] bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-zinc-200 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-zinc-100">Hy2Mini 原型运行时态感知器</h3>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
            VpnService Active
          </span>
        </div>

        {/* Network & Physical Card Switch Simulation */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-300">底层网卡热切换测试 (QUIC 迁移)</span>
            <button
              onClick={handleNetworkSwitch}
              className="px-2.5 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded flex items-center gap-1.5 transition-all"
            >
              <RotateCw className="w-3 h-3" />
              <span>切换网卡</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-2 rounded border ${activeNetwork === 'wifi' ? 'bg-blue-950/40 border-blue-500/50 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
              <div className="font-bold flex items-center gap-1">
                <Wifi className="w-3 h-3" /> Wi-Fi 网卡
              </div>
              <div className="text-[11px] font-mono mt-0.5">ifName: wlan0 (idx: 24)</div>
            </div>
            <div className={`p-2 rounded border ${activeNetwork === 'cellular' ? 'bg-amber-950/40 border-amber-500/50 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
              <div className="font-bold flex items-center gap-1">
                <Signal className="w-3 h-3" /> 5G 移动蜂窝
              </div>
              <div className="text-[11px] font-mono mt-0.5">ifName: rmnet0 (idx: 12)</div>
            </div>
          </div>
        </div>

        {/* Core Specs Checklist */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-[11px]">APK 预估下载体积</div>
            <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">~ 7.2 MB</div>
            <div className="text-[10px] text-zinc-500">libgojni.so 6.8M + 资源 400K</div>
          </div>
          <div className="bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-[11px]">运行时常驻内存</div>
            <div className="text-base font-bold text-blue-400 font-mono mt-0.5">&lt; 38 MB</div>
            <div className="text-[10px] text-zinc-500">纯 XML + 无 Material/Compose</div>
          </div>
        </div>

        {/* Live System Logs (sing-box / Android Service) */}
        <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl p-3 min-h-[220px]">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 mb-2">
            <span className="text-xs font-mono font-bold text-zinc-300">
              sing-box &amp; VpnService 模拟日志
            </span>
            <button
              onClick={() => setLogs([])}
              className="text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              清空日志
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px] text-zinc-400 max-h-56 pr-1">
            {logs.length === 0 ? (
              <div className="text-zinc-600 italic py-6 text-center">
                点击手机屏幕中的“启动连接”或测速以捕获实时隧道日志...
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="leading-tight break-all border-b border-zinc-900/50 pb-0.5">
                  {log.includes('QUIC') || log.includes('TUN') ? (
                    <span className="text-emerald-400">{log}</span>
                  ) : log.includes('网络感知') ? (
                    <span className="text-amber-400">{log}</span>
                  ) : (
                    <span>{log}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
