'use client';

/**
 * Phi.ts — PhigrosEmulator client 组件
 *
 * 封装核心模拟器（script.phigros.emulator.ts 的 createEmulator）。
 * 渲染 DOM 结构（还原 whilePlaying/index.html）：
 *   - canvas（可见游戏画面）
 *   - btn-play / btn-pause（隐藏触发按钮）
 *   - pauseOverlay（暂停遮罩，含 back/restart/resume 三按钮）
 *   - 隐藏配置面板（所有 select/input/checkbox，模拟器通过 deps.elements 访问）
 *
 * pauseOverlay 倒计时用 React 状态机（修复原版 innerHTML 重写丢监听器 bug）。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEmulator, type EmulatorInstance } from './emulator/script.phigros.emulator';
import { usePhigrosSettings } from '@/hooks/use-phigros-settings';
import { LoadingChartOverlay } from '@/components/phigros/LoadingChartOverlay';
import { navigateWithFade } from '@/lib/phigros/page-transition';
import {
  EMULATOR_IMAGES,
  EXTERNAL_LIBS,
} from '@/lib/phigros/asset-paths';

interface PhigrosEmulatorProps {
  play: string;
  level: string;
  chapter: string;
}


export default function PhigrosEmulator({ play, level, chapter }: PhigrosEmulatorProps) {
  const router = useRouter();
  const settings = usePhigrosSettings();

  // DOM refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const btnPlayRef = useRef<HTMLInputElement>(null);
  const btnPauseRef = useRef<HTMLInputElement>(null);
  const pauseOverlayRef = useRef<HTMLDivElement>(null);
  const selectscaleratioRef = useRef<HTMLSelectElement>(null);
  const selectaspectratioRef = useRef<HTMLSelectElement>(null);
  const selectglobalalphaRef = useRef<HTMLSelectElement>(null);
  const inputNameRef = useRef<HTMLInputElement>(null);
  const inputLevelRef = useRef<HTMLInputElement>(null);
  const inputDesignerRef = useRef<HTMLInputElement>(null);
  const inputIllustratorRef = useRef<HTMLInputElement>(null);
  const inputOffsetRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLInputElement>(null);
  const imageBlurRef = useRef<HTMLInputElement>(null);
  const highLightRef = useRef<HTMLInputElement>(null);
  const hitSongRef = useRef<HTMLInputElement>(null);
  const lineColorRef = useRef<HTMLInputElement>(null);
  const showPointRef = useRef<HTMLInputElement>(null);
  const hyperModeRef = useRef<HTMLInputElement>(null);
  const showTransitionRef = useRef<HTMLInputElement>(null);
  const autoPlayRef = useRef<HTMLInputElement>(null);

  // 模拟器实例
  const emulatorRef = useRef<EmulatorInstance | null>(null);

  // 状态
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 动态加载外部库（oggmented + stackblur） */
  const loadExternalLibs = useCallback(async () => {
    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    await loadScript(EXTERNAL_LIBS.oggmented);
    await loadScript(EXTERNAL_LIBS.stackblur);
  }, []);

  /** 初始化模拟器 */
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 等待所有 ref 就绪
      if (!canvasRef.current || !btnPlayRef.current || !btnPauseRef.current) return;

      // 加载外部库
      await loadExternalLibs();

      if (cancelled) return;

      // 创建模拟器实例
      const emulator = createEmulator({
        elements: {
          canvas: canvasRef.current,
          btnPlay: btnPlayRef.current,
          btnPause: btnPauseRef.current,
          pauseOverlay: pauseOverlayRef.current!,
          selectscaleratio: selectscaleratioRef.current!,
          selectaspectratio: selectaspectratioRef.current!,
          selectglobalalpha: selectglobalalphaRef.current!,
          inputName: inputNameRef.current!,
          inputLevel: inputLevelRef.current!,
          inputDesigner: inputDesignerRef.current!,
          inputIllustrator: inputIllustratorRef.current!,
          inputOffset: inputOffsetRef.current!,
          feedback: feedbackRef.current!,
          imageBlur: imageBlurRef.current!,
          highLight: highLightRef.current!,
          hitSong: hitSongRef.current!,
          lineColor: lineColorRef.current!,
          showPoint: showPointRef.current!,
          hyperMode: hyperModeRef.current!,
          showTransition: showTransitionRef.current!,
          autoPlay: autoPlayRef.current!,
        },
        play,
        level,
        chapter,
        onFinish: (params) => {
          navigateWithFade(
            router,
            `/level-over?play=${params.play}&l=${params.l}&score=${params.score}&mc=${params.mc}&p=${params.p}&g=${params.g}&b=${params.b}&m=${params.m}&e=${params.e}&c=${params.c}`,
          );
        },
        onBack: () => {
          navigateWithFade(router, `/song-select?c=${chapter}`);
        },
        onReady: () => {
          if (!cancelled) setReady(true);
        },
      });

      emulatorRef.current = emulator;

      await emulator.init();
      if (cancelled) return;

      // 应用设置到隐藏配置面板
    };

    init().catch((err) => {
      console.error('[PhigrosEmulator] init failed:', err);
      setError(err?.message || String(err));
      setLoading(false);
    });

    return () => {
      cancelled = true;
      if (emulatorRef.current) {
        emulatorRef.current.destroy();
        emulatorRef.current = null;
      }
    };
  }, [play, level, chapter]);

  /** 应用设置到隐藏配置面板（settings 变化时同步） */
  useEffect(() => {
    const map = {
      inputOffset: inputOffsetRef.current,
      selectscaleratio: selectscaleratioRef.current,
      selectglobalalpha: selectglobalalphaRef.current,
      selectaspectratio: selectaspectratioRef.current,
      hitSong: hitSongRef.current,
      highLight: highLightRef.current,
      lineColor: lineColorRef.current,
      hyperMode: hyperModeRef.current,
      imageBlur: imageBlurRef.current,
      feedback: feedbackRef.current,
      showPoint: showPointRef.current,
      showTransition: showTransitionRef.current,
      autoPlay: autoPlayRef.current,
    };
    const values: Record<string, string | boolean | number> = {
      'input-offset': settings.inputOffset,
      'select-scale-ratio': settings.selectScaleRatio,
      'select-global-alpha': settings.selectGlobalAlpha,
      'select-aspect-ratio': settings.selectAspectRatio,
      hitSong: settings.hitSong,
      highLight: settings.highLight,
      lineColor: settings.lineColor,
      hyperMode: settings.hyperMode,
      imageBlur: settings.imageBlur,
      feedback: settings.feedback,
      showPoint: settings.showPoint,
      showTransition: settings.showTransition,
      autoPlay: settings.autoPlay,
    };
    for (const key in values) {
      const elem = (map as any)[key];
      if (!elem) continue;
      const val = values[key];
      if (elem.type === 'checkbox') {
        elem.checked = !!val;
      } else {
        elem.value = String(val);
      }
    }
  }, [settings]);

  /** 点击 tapToStart 开始游戏 */
  const handleTapToStart = useCallback(() => {
    if (ready && emulatorRef.current) {
      setLoading(false);
      // 自动全屏（如果设置开启）
      if (settings.autoFullscreen) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
      }
      emulatorRef.current.tapToStart();
    }
  }, [ready, settings.autoFullscreen]);

  return (
    <div className="while-playing-root">
      {/* 游戏 canvas */}
      <canvas ref={canvasRef} id="canvas" className="canvas fade" />

      {/* 隐藏的触发按钮（模拟器通过 deps.elements 访问） */}
      <input ref={btnPlayRef} id="btn-play" className="hide" type="button" defaultValue="播放" />
      <input ref={btnPauseRef} id="btn-pause" className="hide" type="button" defaultValue="暂停" />

      {/* 暂停遮罩：纯 DOM 操作，模拟器控制 visable 类和内容。
          React 只渲染空 div，innerHTML 和事件由模拟器在 init 里设置。
          不用 dangerouslySetInnerHTML 避免 React re-render 覆盖 addEventListener */}
      <div
        ref={pauseOverlayRef}
        id="pauseOverlay"
        className="pauseOverlay"
      />

      {/* 隐藏配置面板（模拟器通过 deps.elements 访问 value/checked） */}
      <div className="hide">
        <select id="select-scale-ratio" ref={selectscaleratioRef} defaultValue="8000">
          <option value="10000">极小</option>
          <option value="9000">较小</option>
          <option value="8000">默认</option>
          <option value="7000">较大</option>
          <option value="6000">极大</option>
        </select>
        <select id="select-aspect-ratio" ref={selectaspectratioRef} defaultValue="1.777778">
          <option value="1.25">5:4</option>
          <option value="1.333333">4:3</option>
          <option value="1.428571">10:7</option>
          <option value="1.461538">19:13</option>
          <option value="1.6">8:5</option>
          <option value="1.666667">5:3</option>
          <option value="1.692308">22:13</option>
          <option value="1.777778">16:9</option>
        </select>
        <select id="select-global-alpha" ref={selectglobalalphaRef} defaultValue="0.6">
          <option value="1">黑暗</option>
          <option value="0.8">昏暗</option>
          <option value="0.6">默认</option>
          <option value="0.4">较亮</option>
          <option value="0.2">明亮</option>
        </select>
        <input id="input-name" ref={inputNameRef} type="text" placeholder="Untitled" />
        <input id="input-level" ref={inputLevelRef} type="text" placeholder="SP  Lv.?" />
        <input id="input-designer" ref={inputDesignerRef} type="text" placeholder="nameless" />
        <input id="input-illustrator" ref={inputIllustratorRef} type="text" placeholder="nameless" />
        <input id="input-offset" ref={inputOffsetRef} type="number" step="5" placeholder="0" />
        <input id="feedback" ref={feedbackRef} type="checkbox" />
        <input id="imageBlur" ref={imageBlurRef} type="checkbox" defaultChecked />
        <input id="highLight" ref={highLightRef} type="checkbox" defaultChecked />
        <input id="hitSong" ref={hitSongRef} type="checkbox" defaultChecked />
        <input id="lineColor" ref={lineColorRef} type="checkbox" defaultChecked />
        <input id="showPoint" ref={showPointRef} type="checkbox" />
        <input id="hyperMode" ref={hyperModeRef} type="checkbox" />
        <input id="showTransition" ref={showTransitionRef} type="checkbox" defaultChecked />
        <input id="autoPlay" ref={autoPlayRef} type="checkbox" />
      </div>

      {/* 错误提示（初始化失败时显示） */}
      {error && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            color: '#f88',
            fontFamily: 'monospace',
            fontSize: '14px',
            padding: '20px',
            zIndex: 99999,
            whiteSpace: 'pre-wrap',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '18px', marginBottom: '12px' }}>模拟器初始化失败</div>
            <div>{error}</div>
            <div style={{ marginTop: '12px', color: '#888' }}>
              请打开浏览器控制台查看详细错误
            </div>
          </div>
        </div>
      )}

      {/* 加载遮罩 */}
      {!error && <LoadingChartOverlay chart={play} level={level} visible={loading} />}

      {/* 资源就绪后的 tapToStart 提示 */}
      {!error && loading && ready && (
        <div
          className="tapToStartFrame"
          onClick={handleTapToStart}
          role="button"
          tabIndex={0}
        >
          <div className="songName">点按以开始</div>
        </div>
      )}
    </div>
  );
}
