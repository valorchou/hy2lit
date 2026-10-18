import React, { useState } from 'react';
import { PHASE_2_FILES, Phase2FileItem } from '../data/phase2Code';
import { ANDROID_RESOURCES, AndroidResourceFile } from '../data/androidResources';
import { Copy, Check, FileCode, Download, Shield, Sparkles, Layers, Code, FileText } from 'lucide-react';

export function Phase2View() {
  const [activeTab, setActiveTab] = useState<'kotlin' | 'xml'>('kotlin');
  const [selectedFileId, setSelectedFileId] = useState<string>(PHASE_2_FILES[0].id);
  const [selectedXmlIndex, setSelectedXmlIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const currentKotlinFile = PHASE_2_FILES.find(f => f.id === selectedFileId) || PHASE_2_FILES[0];
  const currentXmlFile = ANDROID_RESOURCES[selectedXmlIndex] || ANDROID_RESOURCES[0];

  const totalKotlinLines = PHASE_2_FILES.reduce((sum, f) => sum + f.lines, 0);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-blue-950/40 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Phase 2 交付标准
              </span>
              <span className="text-xs text-zinc-400">
                5 个核心 Kotlin 类 + 零第三方重量级 UI 库 + 纯原生 Android SDK
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Android 客户端源码：极致精简与高内聚设计
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              严格恪守 PRD 红线：<strong>严禁引入</strong> AppCompat, Material, Jetpack Compose, Gson, OkHttp, CameraX。全工程仅需引入 <code className="text-emerald-400 font-mono">com.google.zxing:core</code> 与自编译的 <code className="text-emerald-400 font-mono">libbox.aar</code>，总代码量控制在 1,000 行左右，APK 体积稳稳压制在 <strong>6.5MB ~ 8.2MB</strong>。
            </p>
          </div>

          <div className="flex items-center gap-4 bg-zinc-900/90 border border-zinc-800 px-4 py-3 rounded-xl shrink-0">
            <div className="text-center">
              <div className="text-xs text-zinc-400">总核心类</div>
              <div className="text-lg font-bold text-white font-mono">5 个</div>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="text-center">
              <div className="text-xs text-zinc-400">Kotlin 代码总量</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">~{totalKotlinLines} 行</div>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="text-center">
              <div className="text-xs text-zinc-400">外部重量级库</div>
              <div className="text-lg font-bold text-blue-400 font-mono">0 个</div>
            </div>
          </div>
        </div>

        {/* Tab Toggle: Kotlin vs XML/Gradle */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800/80">
          <button
            onClick={() => setActiveTab('kotlin')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'kotlin'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Kotlin 核心源码 (5 个核心类 + Manifest + Gradle)</span>
          </button>
          <button
            onClick={() => setActiveTab('xml')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'xml'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>原生 XML 布局与 Gradle 配置文件 ({ANDROID_RESOURCES.length})</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: File Navigator */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1 mb-1">
            {activeTab === 'kotlin' ? '核心 Kotlin 类与构建规范' : 'XML 布局与构建清单'}
          </div>

          {activeTab === 'kotlin' ? (
            PHASE_2_FILES.map(file => {
              const isSelected = file.id === selectedFileId;
              return (
                <button
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-zinc-800/90 border-emerald-500/60 shadow-lg text-white'
                      : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/40 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-zinc-200">
                      {file.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-950 text-emerald-400 font-mono border border-zinc-800">
                      {file.lines} 行
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
            })
          ) : (
            ANDROID_RESOURCES.map((res, idx) => {
              const isSelected = idx === selectedXmlIndex;
              return (
                <button
                  key={res.path}
                  onClick={() => setSelectedXmlIndex(idx)}
                  className={`text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-zinc-800/90 border-blue-500/60 shadow-lg text-white'
                      : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/40 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-zinc-200">
                      {res.name}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 leading-snug line-clamp-2">
                    {res.description}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right: Code Viewer */}
        <div className="lg:col-span-8 flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Code Viewer Toolbar */}
          <div className="h-13 bg-zinc-950 px-4 flex items-center justify-between border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-sm text-zinc-200 font-semibold truncate max-w-[280px] sm:max-w-md">
                {activeTab === 'kotlin' ? currentKotlinFile.path : currentXmlFile.path}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(activeTab === 'kotlin' ? currentKotlinFile.code : currentXmlFile.content)}
                className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg flex items-center gap-1.5 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已复制' : '复制代码'}</span>
              </button>

              <button
                onClick={() => handleDownload(
                  activeTab === 'kotlin' ? currentKotlinFile.name : currentXmlFile.name,
                  activeTab === 'kotlin' ? currentKotlinFile.code : currentXmlFile.content
                )}
                className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下载文件</span>
              </button>
            </div>
          </div>

          {/* Code Display */}
          <div className="p-4 overflow-x-auto max-h-[620px] bg-zinc-950/80 font-mono text-xs leading-relaxed text-zinc-300">
            <pre className="whitespace-pre">
              {activeTab === 'kotlin' ? currentKotlinFile.code : currentXmlFile.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
