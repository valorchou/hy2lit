import React, { useState } from 'react';
import JSZip from 'jszip';
import { PHASE_1_FILES } from '../data/phase1Code';
import { PHASE_2_FILES } from '../data/phase2Code';
import { ANDROID_RESOURCES } from '../data/androidResources';
import { Download, FolderArchive, CheckCircle2, FileCheck, Layers, Terminal, Sparkles, BookOpen } from 'lucide-react';

export function ProjectExporter() {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const handleDownloadZip = async () => {
    setIsExporting(true);
    setDownloadSuccess(false);

    try {
      const zip = new JSZip();

      // 1. Root and scripts
      const trimScript = PHASE_1_FILES.find(f => f.id === 'build-script-sh')?.code || '';
      const githubWorkflow = PHASE_1_FILES.find(f => f.id === 'github-action-yml')?.code || '';
      const outboundGo = PHASE_1_FILES.find(f => f.id === 'outbound-go')?.code || '';
      const inboundGo = PHASE_1_FILES.find(f => f.id === 'inbound-go')?.code || '';

      zip.file('scripts/trim_and_build.sh', trimScript);
      zip.file('.github/workflows/build-libbox.yml', githubWorkflow);
      zip.file('sing-box-patches/include/outbound.go', outboundGo);
      zip.file('sing-box-patches/include/inbound.go', inboundGo);

      // 2. Gradle root
      const rootGradle = ANDROID_RESOURCES.find(r => r.name.includes('build.gradle.kts (Root)'))?.content || '';
      const settingsGradle = ANDROID_RESOURCES.find(r => r.name === 'settings.gradle.kts')?.content || '';
      zip.file('build.gradle.kts', rootGradle);
      zip.file('settings.gradle.kts', settingsGradle);
      zip.file('gradle.properties', 'android.useAndroidX=true\nandroid.nonTransitiveRClass=true\norg.gradle.jvmargs=-Xmx2048m\n');

      // 3. App module files
      const appGradle = PHASE_2_FILES.find(f => f.id === 'build-gradle-app')?.code || '';
      const proguardRules = PHASE_2_FILES.find(f => f.id === 'proguard-rules')?.code || '';
      const manifest = PHASE_2_FILES.find(f => f.id === 'AndroidManifest')?.code || '';

      zip.file('app/build.gradle.kts', appGradle);
      zip.file('app/proguard-rules.pro', proguardRules);
      zip.file('app/src/main/AndroidManifest.xml', manifest);

      // 4. Kotlin sources (5 classes)
      for (const kf of PHASE_2_FILES) {
        if (kf.id.endsWith('Activity') || kf.id.startsWith('Hy2')) {
          zip.file(kf.path, kf.code);
        }
      }

      // 5. XML Layouts & resources
      for (const res of ANDROID_RESOURCES) {
        if (res.path.startsWith('app/src/main/res/')) {
          zip.file(res.path, res.content);
        }
      }

      // 6. Project README.md with complete instructions
      const readmeContent = `# Hy2Mini - Hysteria2 极简安卓客户端 (源码工程)

根据技术规格说明书构建的 **Hy2Mini** (Package: \`io.github.hy2mini\`) 原生 Android 客户端。

## 核心特性
- **minSdk = 26** (Android 8.0) | **targetSdk = 35** (Android 15)
- **单架构支持：** 仅 \`arm64-v8a\` (剥离 32 位与 x86)
- **体积红线：** Release 签名 APK $\\le$ 8.5 MB
- **运行时内存红线：** $\\le$ 40 MB
- **零外部 UI 依赖：** 绝无 AppCompat, Material, Jetpack Compose, OkHttp, Gson

## 项目目录结构
\`\`\`
├── build.gradle.kts
├── settings.gradle.kts
├── scripts/
│   └── trim_and_build.sh             # Phase 1: sing-box 源码裁剪与 libbox.aar 编译脚本
├── sing-box-patches/                 # AST 裁剪版 include/outbound.go 与 inbound.go
├── app/
│   ├── build.gradle.kts              # 单架构与 R8 激进混淆配置
│   ├── proguard-rules.pro            # Go JNI 反射保护与日志剥离
│   ├── libs/
│   │   └── libbox.aar                # (需要将 Phase 1 编译生成的 AAR 放入此处)
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── assets/
│       │   └── geoip-cn.srs          # 45KB 大陆 IP 规则集 (由脚本下载)
│       ├── java/io/github/hy2mini/
│       │   ├── Hy2ConfigParser.kt    # URI 解析与 15 行极简 204 测速
│       │   ├── Hy2VpnService.kt      # VPN 核心守护与网卡切换监听
│       │   ├── MainActivity.kt       # 纯原生主界面
│       │   ├── QrScanActivity.kt     # 100 行 Camera2 + ZXing 扫码
│       │   └── AppSelectActivity.kt  # 分应用代理选择器
│       └── res/layout/
│           ├── activity_main.xml
│           ├── item_node.xml
│           ├── activity_qr_scan.xml
│           ├── activity_app_select.xml
│           └── item_app.xml
\`\`\`

## 编译运行三步走
1. **Phase 1 产物获取：**
   执行 \`bash scripts/trim_and_build.sh\` 编译产出 \`libbox.aar\` 并下载 \`geoip-cn.srs\`。
   将 \`libbox.aar\` 拷贝到 \`app/libs/\` 目录；
   将 \`geoip-cn.srs\` 拷贝到 \`app/src/main/assets/\` 目录。

2. **Android Studio 导入：**
   使用 Android Studio Ladybug 或更高版本打开本项目根目录，Gradle 将自动同步。

3. **打包 Release APK：**
   \`\`\`bash
   ./gradlew assembleRelease
   \`\`\`
   最终生成的 APK 位于 \`app/build/outputs/apk/release/\`，体积稳定在 6.8MB 左右。
`;
      zip.file('README.md', readmeContent);

      // Create placeholder directory marker files
      zip.file('app/libs/PUT_LIBBOX_AAR_HERE.txt', '请将 Phase 1 编译出的 libbox.aar 放置于此目录下。\n');
      zip.file('app/src/main/assets/PUT_GEOIP_CN_SRS_HERE.txt', '请将 geoip-cn.srs (45KB) 放置于此目录下。\n');

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Hy2Mini-Android-Project.zip';
      a.click();
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: unknown) {
      console.error(err);
      alert('打包导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-zinc-900 to-indigo-950/40 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                完整的 Android Studio 标准工程
              </span>
              <span className="text-xs text-zinc-400">
                包含 Phase 1 编译脚本 + Phase 2 全部 5 个 Kotlin 源码与 XML 布局
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              一键打包下载完整 Android 工程源码 (ZIP)
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              无需逐个文件复制，点击即可打包下载开箱即用的 Android Studio 完整工程包。已配置好 Gradle Kotlin DSL、R8 激进混淆规则、纯原生 Android SDK 布局与完整的编译部署指南。
            </p>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isExporting}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-600/25 active:scale-95 transition-all disabled:opacity-50 shrink-0"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>正在生成工程压缩包...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>已成功下载 ZIP！</span>
              </>
            ) : (
              <>
                <FolderArchive className="w-5 h-5" />
                <span>一键下载全部工程 (Hy2Mini.zip)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Directory Structure & Setup Walkthrough */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Tree */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>工程文件清单树</span>
            </h3>
            <span className="text-[11px] text-zinc-500">标准 Android Studio 结构</span>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80 font-mono text-xs text-zinc-300 space-y-1.5 leading-relaxed overflow-x-auto">
            <div className="text-blue-400 font-bold">Hy2Mini/</div>
            <div className="pl-4 text-zinc-400">├── build.gradle.kts <span className="text-zinc-600">(根目录插件配置)</span></div>
            <div className="pl-4 text-zinc-400">├── settings.gradle.kts <span className="text-zinc-600">(仓库与子模块配置)</span></div>
            <div className="pl-4 text-zinc-400">├── gradle.properties</div>
            <div className="pl-4 text-emerald-400">├── scripts/</div>
            <div className="pl-8 text-emerald-300">└── trim_and_build.sh <span className="text-zinc-500">(Phase 1 裁剪编译)</span></div>
            <div className="pl-4 text-zinc-400">├── .github/workflows/</div>
            <div className="pl-8 text-zinc-400">└── build-libbox.yml <span className="text-zinc-500">(云端 CI 自动编译)</span></div>
            <div className="pl-4 text-blue-400">└── app/</div>
            <div className="pl-8 text-zinc-400">├── build.gradle.kts <span className="text-zinc-500">(单架构 arm64-v8a)</span></div>
            <div className="pl-8 text-zinc-400">├── proguard-rules.pro <span className="text-zinc-500">(R8 混淆与保护)</span></div>
            <div className="pl-8 text-amber-400">├── libs/</div>
            <div className="pl-12 text-amber-300">└── libbox.aar <span className="text-zinc-500">(~6.8MB Go 裁剪核心)</span></div>
            <div className="pl-8 text-zinc-400">└── src/main/</div>
            <div className="pl-12 text-zinc-400">├── AndroidManifest.xml</div>
            <div className="pl-12 text-amber-400">├── assets/</div>
            <div className="pl-16 text-amber-300">└── geoip-cn.srs <span className="text-zinc-500">(45KB 大陆IP规则)</span></div>
            <div className="pl-12 text-purple-400">├── java/io/github/hy2mini/</div>
            <div className="pl-16 text-purple-300">├── Hy2ConfigParser.kt</div>
            <div className="pl-16 text-purple-300">├── Hy2VpnService.kt</div>
            <div className="pl-16 text-purple-300">├── MainActivity.kt</div>
            <div className="pl-16 text-purple-300">├── QrScanActivity.kt</div>
            <div className="pl-16 text-purple-300">└── AppSelectActivity.kt</div>
            <div className="pl-12 text-cyan-400">└── res/layout/</div>
            <div className="pl-16 text-cyan-300">├── activity_main.xml</div>
            <div className="pl-16 text-cyan-300">├── item_node.xml</div>
            <div className="pl-16 text-cyan-300">├── activity_qr_scan.xml</div>
            <div className="pl-16 text-cyan-300">└── activity_app_select.xml</div>
          </div>
        </div>

        {/* Right: Step-by-Step Build Walkthrough */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>开发与编译执行标准流程</span>
            </h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
              <div className="font-bold text-emerald-400 flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs">1</span>
                <span>执行 Phase 1 编译脚本产出 libbox.aar</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed mb-2 pl-7">
                在配备 Go 1.22+ 与 Android NDK 的终端中运行脚本，一键拉取 sing-box 注入裁剪代码：
              </p>
              <div className="pl-7">
                <code className="block p-2 bg-zinc-900 rounded font-mono text-[11px] text-zinc-300">
                  bash scripts/trim_and_build.sh
                </code>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
              <div className="font-bold text-blue-400 flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs">2</span>
                <span>放入产物到 Android 工程</span>
              </div>
              <ul className="text-zinc-400 text-[11px] space-y-1 list-disc list-inside pl-7">
                <li>将生成的 <code className="text-zinc-200 font-mono">libbox.aar</code> 放入 <code className="text-zinc-200 font-mono">app/libs/</code></li>
                <li>将下载的 <code className="text-zinc-200 font-mono">geoip-cn.srs</code> 放入 <code className="text-zinc-200 font-mono">app/src/main/assets/</code></li>
              </ul>
            </div>

            <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
              <div className="font-bold text-purple-400 flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs">3</span>
                <span>Android Studio 打开并构建 Release APK</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed pl-7">
                点击 Android Studio 的 Sync Project with Gradle Files，然后执行构建：
              </p>
              <div className="pl-7 mt-1.5">
                <code className="block p-2 bg-zinc-900 rounded font-mono text-[11px] text-zinc-300">
                  ./gradlew assembleRelease
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
