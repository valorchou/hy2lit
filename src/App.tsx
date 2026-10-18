import React, { useState } from 'react';
import {
  Smartphone,
  Cpu,
  Code,
  FileSearch,
  Download,
  ShieldCheck,
  Zap,
  Terminal,
  Activity,
  Github,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { PhoneSimulator } from './components/PhoneSimulator';
import { Phase1View } from './components/Phase1View';
import { Phase2View } from './components/Phase2View';
import { UriDebugger } from './components/UriDebugger';
import { ProjectExporter } from './components/ProjectExporter';
import { ParsedHy2Node } from './utils/configGenerator';

type TabType = 'simulator' | 'phase1' | 'phase2' | 'debugger' | 'exporter';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('simulator');
  const [inspectedNode, setInspectedNode] = useState<ParsedHy2Node | undefined>();
  const [inspectedMode, setInspectedMode] = useState<0 | 1>(1);

  const handleSelectNodeForInspection = (node: ParsedHy2Node, mode: 0 | 1) => {
    setInspectedNode(node);
    setInspectedMode(mode);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Global Navigation Bar */}
      <header className="sticky top-0 z-50 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo & Meta */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 p-0.5 flex items-center justify-center shadow-md shadow-blue-500/20">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base tracking-tight text-white">
                  Hy2Mini
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  io.github.hy2mini
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  APK ≤ 8.5MB
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Hysteria2 专属极简安卓客户端技术规格书与全套交付代码
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800 text-xs overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'simulator'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>📱 客户端交互模拟器</span>
            </button>

            <button
              onClick={() => setActiveTab('phase1')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'phase1'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>⚙️ Phase 1 (Go 裁剪与编译)</span>
            </button>

            <button
              onClick={() => setActiveTab('phase2')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'phase2'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>☕ Phase 2 (Kotlin 完整源码)</span>
            </button>

            <button
              onClick={() => setActiveTab('debugger')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'debugger'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>🔍 URI 调试与配置预览</span>
            </button>

            <button
              onClick={() => setActiveTab('exporter')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'exporter'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>📦 导出工程 ZIP</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {activeTab === 'simulator' && (
          <div className="flex flex-col gap-6">
            <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-blue-950/30 border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>原生 Android 原型交互演示环境</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                    实时仿真
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                  模拟纯 XML / LinearLayout 无 Material 依赖的原生客户端，可在此添加节点、模拟 Camera2 零拷贝扫码、测试分应用黑名单直连、切换网卡（QUIC 热迁移）以及点击发起 Cloudflare 204 真连接 RTT 延迟探测。
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab('phase2')}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Code className="w-3.5 h-3.5 text-blue-400" />
                  <span>查看 Kotlin 对应实现</span>
                </button>
                <button
                  onClick={() => setActiveTab('debugger')}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <FileSearch className="w-3.5 h-3.5" />
                  <span>调试当前节点配置</span>
                </button>
              </div>
            </div>

            <PhoneSimulator onSelectNodeForInspection={handleSelectNodeForInspection} />
          </div>
        )}

        {activeTab === 'phase1' && <Phase1View />}

        {activeTab === 'phase2' && <Phase2View />}

        {activeTab === 'debugger' && (
          <UriDebugger initialNode={inspectedNode} initialMode={inspectedMode} />
        )}

        {activeTab === 'exporter' && <ProjectExporter />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800/80 bg-zinc-950 py-4 px-6 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>Hy2Mini (io.github.hy2mini) 规范与代码生成套件</span>
            <span>•</span>
            <span className="text-zinc-400">基于 sing-box v1.11.x 裁剪内核与 Android VpnService</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>minSdk 26</span>
            <span>arm64-v8a</span>
            <span>≤ 8.5MB</span>
            <span>≤ 40MB 内存</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
