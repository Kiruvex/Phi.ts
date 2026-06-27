'use client';

/**
 * Phi.ts — tapToStart（点击开始）页面
 *
 * 路由：/tap-to-start
 *
 * 1:1 迁移自 phigros-html5/tapToStart/（index.html + style.css + index.js）。
 *
 * 核心行为：
 *  1. 显示 Phigros logo + "点 击 屏 幕 开 始" 文字，背景为 InitialBackground.png（三层模糊）。
 *  2. 背景音乐 TouchToStart0.mp3 自动循环播放。
 *  3. 每 2s 在随机位置生成一个白色气泡 div，气泡执行 12s float 动画后自动移除。
 *  4. 点击屏幕任意位置：
 *     - 插入全屏黑色 fadeIn 遮罩（0.6s 渐入）
 *     - 每 10ms 将 audio.volume 递减 0.1（音量渐弱）
 *     - 510ms 后根据 localStorage 是否为空跳转到 /settings 或 /chapter-select
 *
 * 注意：本组件使用 'use client' 因为需要 audio 播放、定时器、点击监听与客户端路由跳转。
 */

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TOUCH_TO_START_AUDIO } from '@/lib/phigros/asset-paths';
import { playClickSound } from '@/lib/phigros/page-transition';

// 注：背景图 INITIAL_BACKGROUND 通过 phigros.css 中的 .tts-bg-1 / .tts-bg-2
// background-image 引用，无需在 JSX 中作为 <img> 渲染。

export default function TapToStartPage() {
  const router = useRouter();

  /** 背景音乐 audio 元素引用 */
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /** 气泡生成定时器 */
  const bubbleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 音量渐弱定时器 */
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 跳转定时器 */
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 防止点击被触发多次（原版未做防护，但 React Strict Mode 下 useEffect 会重跑，
   *  且用户在 510ms 内可能多次点击，使用 ref 保证只生效一次） */
  const clickedRef = useRef(false);
  const particlesRef = useRef<HTMLDivElement>(null);

  /**
   * 点击处理：插入 fadeIn 遮罩 + 启动音量渐弱 + 510ms 后跳转。
   * 直接附加到 document.body，与原版行为一致。
   */
  const handleClick = useCallback(() => {
    if (clickedRef.current) return;
    clickedRef.current = true;
    try { const a = new Audio('/phigros/assets/audio/Tap7.wav'); a.play().catch(()=>{}); } catch {}

    // 1. 插入全屏黑色 fadeIn 遮罩
    const fadeInElem = document.createElement('div');
    fadeInElem.className = 'tts-fadeIn';
    document.body.appendChild(fadeInElem);

    // 2. 每 10ms 音量递减 0.1（与原版 setInterval(10ms) 一致）
    //    注意：原版 audio.volume -= 0.1 在体积为 0 后仍会持续设置负值，
    //    现代浏览器会抛 IndexSizeError，因此这里加了 Math.max(0, ...) 防护。
    const audio = audioRef.current;
    if (audio) {
      fadeTimerRef.current = setInterval(() => {
        const next = Math.max(0, audio.volume - 0.1);
        audio.volume = next;
        if (next === 0 && fadeTimerRef.current) {
          clearInterval(fadeTimerRef.current);
          fadeTimerRef.current = null;
        }
      }, 10);
    }

    // 3. 510ms 后根据 localStorage 是否为空跳转（fadeIn 遮罩已覆盖，直接 push）
    navigateTimerRef.current = setTimeout(() => {
      if (window.localStorage.length === 0) {
        router.push('/settings');
      } else {
        router.push('/chapter-select');
      }
    }, 510);
    // 注：fadeIn 遮罩会随页面卸载消失，新页面 mount 时 PhigrosProvider
    // 调用 hideRouteOverlay 不会有遮罩。为保持过渡连续，在跳转前显示全局遮罩
    setTimeout(() => {
      const overlay = document.getElementById('phi-route-overlay');
      if (!overlay) {
        const o = document.createElement('div');
        o.id = 'phi-route-overlay';
        o.style.cssText = 'position:fixed;inset:0;background:#000;opacity:1;pointer-events:none;z-index:99999;';
        document.body.appendChild(o);
      }
    }, 500);
  }, [router]);

  // 生成气泡粒子
  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('div');
      p.className = 'phi-particle';
      const size = 8 + Math.random() * 20;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDelay = `${Math.random() * 12}s`;
      p.style.animationDuration = `${10 + Math.random() * 6}s`;
      container.appendChild(p);
    }
    return () => { container.innerHTML = ''; };
  }, []);

  useEffect(() => {
    // 等价于原版 DOMContentLoaded 内的 audio.play()
    // 现代浏览器可能阻止自动播放，捕获异常并在首次点击时再尝试
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 1;
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => {
          // 自动播放被阻止 —— 用户点击屏幕时浏览器会视为用户手势，
          // 在 handleClick 中也可尝试恢复，但本页用户点击后会立即跳转，
          // 因此这里与原版一致：仅尝试一次，失败则静音等待
        });
      }
    }

    // 每 2s 生成一个气泡，附加到 body
    // 与原版逻辑完全一致：
    //   - bottomSize = Math.round(Math.random() * 100)
    //   - if (bottomSize >= 50) bottomSize -= 35
    //   - bubble.style.left = Math.round(Math.random() * 100) + "%"
    //   - 11950ms 后自动 remove
    bubbleTimerRef.current = setInterval(() => {
      const bubble = document.createElement('div');
      bubble.className = 'tts-bubble';

      let bottomSize = Math.round(Math.random() * 100);
      if (bottomSize >= 50) {
        bottomSize -= 35;
      }
      bubble.style.left = `${Math.round(Math.random() * 100)}%`;
      bubble.style.bottom = `${bottomSize}%`;

      document.body.appendChild(bubble);

      // 11.95s 后移除该气泡（与原版 setTimeout 11950 一致）
      window.setTimeout(() => {
        bubble.remove();
      }, 11950);
    }, 2000);

    // 点击监听附加到 body，覆盖整个视口
    document.body.addEventListener('click', handleClick);

    return () => {
      if (bubbleTimerRef.current) {
        clearInterval(bubbleTimerRef.current);
        bubbleTimerRef.current = null;
      }
      if (fadeTimerRef.current) {
        clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current);
        navigateTimerRef.current = null;
      }
      document.body.removeEventListener('click', handleClick);

      // 清理可能残留的气泡与遮罩（如 Strict Mode 重跑或路由卸载时）
      document
        .querySelectorAll('.tts-bubble, .tts-fadeIn')
        .forEach((el) => el.remove());

      // 重置点击标志，避免组件复用时无法再次触发
      clickedRef.current = false;
    };
  }, [handleClick]);

  return (
    <>
      {/* 三层背景模糊（原版 html + html::before + body backdrop-filter） */}
      <div className="tts-bg-1" aria-hidden="true" />
      <div className="tts-bg-2" aria-hidden="true" />
      <div className="phi-particles" ref={particlesRef} aria-hidden="true" />

      {/* 内容容器：flex 列居中 */}
      <main className="tts-container">
        {/* 标题：Phi.ts 文字（替代原版 Phigros.png 艺术字 logo） */}
        <h1 className="tts-title">Phi.ts</h1>
        <div className="tts-tapToStart">点 击 屏 幕 开 始</div>
      </main>

      {/* 背景音乐：autoplay + loop，并在 useEffect 中调用 play() 绕过自动播放限制 */}
      <audio
        ref={audioRef}
        loop
        // 原版用 autoplay 属性，但 React 在 hydration 后才会挂载 audio；
        // 仅靠 autoplay 属性不可靠，所以同时在 useEffect 中调用 play()。
        autoPlay
        src={TOUCH_TO_START_AUDIO}
      />
    </>
  );
}
