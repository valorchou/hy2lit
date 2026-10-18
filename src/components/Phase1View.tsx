import React, { useState } from 'react';
import { PHASE_1_FILES, Phase1FileItem } from '../data/phase1Code';
import { Copy, Check, Terminal, FileCode, Cpu, ShieldCheck, ArrowRight, Zap, Download } from 'lucide-react';

export function Phase1View() {
  const [selectedFileId, setSelectedFileId] = useState<string>(PHASE_1_FILES[0].id);
  const [copied, setCopied] = useState<boolean>(false);
  const [diffMode, setDiffMode] = useState<boolean>(true);

  const currentFile = PHASE_1_FILES.find(f => f.id === selectedFileId) || PHASE_1_FILES[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = (file: Phase1FileItem) => {
    const blob = new Blob([file.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.split('/').pop() || 'file';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-zinc-900 to-emerald-950/40 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Phase 1 交付标准
              </span>
              <span className="text-xs text-zinc-400">
                Go sing-box 源码级 AST 死代码消除规范与 gomobile 构建
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              sing-box 裁剪方案：出入站注册表深度重构
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              常规 sing-box 编译出来的 AAR 包含数十种代理协议与庞大的密码学算法库（总计超 25MB）。
              通过改写 <code className="text-emerald-400 font-mono">include/inbound.go</code> 与 <code className="text-emerald-400 font-mono">include/outbound.go</code>，利用 Go 静态链接器的死代码消除（DCE），未引用的协议包与 uTLS 指纹库在编译期被彻底剔除，使产物压缩后仅 <strong>6.8MB</strong>。
            </p>
          </div>

          <div className="flex items-center gap-4 bg-zinc-900/90 border border-zinc-800 px-4 py-3 rounded-xl shrink-0">
            <div className="text-center">
              <div className="text-xs text-zinc-500">完整未裁剪</div>
              <div className="text-sm font-bold text-zinc-400 line-through font-mono">24.5 MB</div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            <div className="text-center">
              <div className="text-xs text-emerald-400 font-semibold">裁剪后体积</div>
              <div className="text-lg font-extrabold text-emerald-400 font-mono">6.8 MB</div>
            </div>
            <div className="pl-2 border-l border-zinc-800 text-center">
              <div className="text-xs text-blue-400 font-semibold">体积缩减</div>
              <div className="text-sm font-bold text-blue-300 font-mono">-72%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: File Navigator */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1 mb-1">
            Phase 1 源码与脚本清单
          </div>
          {PHASE_1_FILES.map(file => {
            const isSelected = file.id === selectedFileId;
            return (
              <button
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className={`text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-zinc-800/90 border-blue-500/60 shadow-lg text-white'
                    : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/40 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-zinc-200">
                    {file.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-950 text-blue-400 font-mono border border-zinc-800">
                    {file.language.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 leading-snug line-clamp-2">
                  {file.description}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                    {file.badge}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Quick gomobile Cheat Sheet */}
          <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300">
            <div className="flex items-center gap-1.5 text-zinc-400 font-bold mb-2 font-sans">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>gomobile 极限编译参数精要</span>
            </div>
            <ul className="space-y-1.5 text-zinc-400 text-[11px]">
              <li><strong className="text-zinc-200">-target=android/arm64:</strong> 彻底抛弃 32 位与 x86</li>
              <li><strong className="text-zinc-200">-tags=&quot;with_quic&quot;:</strong> 仅保留 quic 核心库</li>
              <li><strong className="text-zinc-200">-ldflags=&quot;-s -w -buildid=&quot;:</strong> 剥离符号表与调试符</li>
              <li><strong className="text-zinc-200">-trimpath:</strong> 移除本地编译主机绝对文件路径</li>
            </ul>
          </div>
        </div>

        {/* Right: Code Viewer / Diff Viewer */}
        <div className="lg:col-span-8 flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Code Viewer Toolbar */}
          <div className="h-13 bg-zinc-950 px-4 flex items-center justify-between border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <FileCode className="w-4 h-4 text-blue-400" />
              <span className="font-mono text-sm text-zinc-200 font-semibold">
                {currentFile.path}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {currentFile.beforeCode && (
                <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 text-xs mr-2">
                  <button
                    onClick={() => setDiffMode(true)}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      diffMode ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    裁剪对比 (Diff)
                  </button>
                  <button
                    onClick={() => setDiffMode(false)}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      !diffMode ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    最终代码
                  </button>
                </div>
              )}

              <button
                onClick={() => handleCopy(currentFile.code)}
                className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg flex items-center gap-1.5 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已复制' : '复制'}</span>
              </button>

              <button
                onClick={() => handleDownloadFile(currentFile)}
                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下载文件</span>
              </button>
            </div>
          </div>

          {/* Code Content */}
          <div className="p-4 overflow-x-auto max-h-[580px] bg-zinc-950/70 font-mono text-xs leading-relaxed">
            {diffMode && currentFile.beforeCode && currentFile.afterCode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before (Original sing-box) */}
                <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-red-400 pb-2 mb-2 border-b border-red-900/40 flex items-center justify-between">
                    <span>❌ 官方原版包含的冗余模块 (&gt;25MB)</span>
                    <span className="text-[10px] text-red-500">已被剥离</span>
                  </div>
                  <pre className="text-red-300/80 font-mono text-[11px] whitespace-pre-wrap">
                    {currentFile.beforeCode}
                  </pre>
                </div>

                {/* After (Hy2Mini Stripped) */}
                <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-emerald-400 pb-2 mb-2 border-b border-emerald-900/40 flex items-center justify-between">
                    <span>✅ Hy2Mini 极简保留项 (仅 6.8MB)</span>
                    <span className="text-[10px] text-emerald-400">死代码消除</span>
                  </div>
                  <pre className="text-emerald-300 font-mono text-[11px] whitespace-pre-wrap">
                    {currentFile.afterCode}
                  </pre>
                </div>
              </div>
            ) : (
              <pre className="text-zinc-300 font-mono whitespace-pre-wrap">
                {currentFile.code}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
