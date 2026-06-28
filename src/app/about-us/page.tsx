'use client';

/**
 * Phi.ts — aboutUs（关于我们）页面
 *
 * 路由：/about-us
 *
 * 1:1 迁移自 phigros-html5/aboutUs/（index.html 1061 行 + main.js 57 行 + index.css + main.css）。
 *
 * 双阶段 SPA：
 *  - 阶段一 intro：Phi.ts 标题 + "touch to start"，点击任意处切换到 credits
 *  - 阶段二 credits：完整 credits 滚动 + 背景音乐循环 + 跳过提示
 *
 * 核心行为（与原版 1:1 对齐）：
 *  1. intro 阶段显示 Phi.ts 标题与 "touch to start"（letter-spacing 6s 脉动动画）
 *  2. 点击屏幕 → 切换到 credits 阶段（用 React state 切换 className，不真的换 CSS 文件）
 *  3. credits 阶段：
 *     - audio.src = AboutUs0.mp3 + play
 *     - audio 'ended' 事件 → 切换 AboutUs0 ↔ AboutUs1 循环
 *     - setInterval(12ms) 把 document.body.style.marginTop -= 0.5px（向上滚动）
 *     - 滚到底 → 3s 后 blackOverlay.opacity=1 → 1s 后 router.push('/chapter-select')
 *  4. 跳过逻辑：5s 内连点 6 次 → blackOverlay.opacity=1 → 1s 后 router.push('/chapter-select')
 *     - clickToExitCounter 初始 6，每次点击 -1，到 0 则跳转
 *     - 5s 后重置为 6
 *
 * credits 内容（997 行）从 @/lib/phigros/about-us-credits 导入，
 * 由 Python 脚本从原版 index.html 逐行抽取，保留所有 Tab 缩进、错别字、全角/半角混排。
 *
 * 注意：本组件使用 'use client' 因为需要 audio 播放、定时器、body 点击监听与客户端路由跳转。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ABOUT_US } from '@/lib/phigros/asset-paths';
import {
  CREDITS,
  FROM_GAME_DIRECTOR_1,
  FROM_GAME_DIRECTOR_2,
  MUSIC_CREDITS_HEADER,
  MUSIC_CREDITS_LEFT,
  MUSIC_CREDITS_RIGHT,
} from '@/lib/phigros/about-us-credits';

type Stage = 'intro' | 'credits';

export default function AboutUsPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('intro');

  // ─── Refs（1:1 对应原版 main.js 的全局变量） ───────────────
  /** audio 元素引用（原版 audioElem） */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** autoScroll 定时器（原版 window.autoScrollInterval） */
  const autoScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  /** 跳过计数器（原版 clickToExitCounter，初始 6） */
  const clickToExitCounterRef = useRef(6);
  /** 5s 重置计数器定时器 */
  const clickToExitResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  /** 当前播放的音频（替代原版 audioElem.getAttribute('src') 比较） */
  const currentAudioRef = useRef<'audio0' | 'audio1'>('audio0');
  /** 黑色遮罩引用 */
  const blackOverlayRef = useRef<HTMLDivElement | null>(null);
  /** 跳过提示标签引用 */
  const clickToExitTagRef = useRef<HTMLDivElement | null>(null);
  /** 防止重复导航 */
  const navigatedRef = useRef(false);
  /** 跟踪组件挂载状态，避免卸载后调用 router.push */
  const isMountedRef = useRef(true);
  /** 滚到底后 3s 等待定时器（fade to black 前） */
  const endFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 导航前 1s 等待定时器（end 与 skip 共用） */
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── 工具函数 ─────────────────────────────────────────────

  /** 跳转到 /chapter-select（仅生效一次） */
  const navigateToChapterSelect = useCallback(() => {
    if (!isMountedRef.current) return;
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    // 创建全局遮罩保持过渡连续（blackOverlay 随页面卸载会消失）
    const overlay = document.getElementById('phi-route-overlay');
    if (!overlay) {
      const o = document.createElement('div');
      o.id = 'phi-route-overlay';
      o.style.cssText = 'position:fixed;inset:0;background:#000;opacity:1;pointer-events:none;z-index:99999;';
      document.body.appendChild(o);
    }
    router.push('/chapter-select');
  }, [router]);

  /** 立即停止 autoScroll（用于跳过时） */
  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  }, []);

  // ─── 阶段一切换：intro → credits ──────────────────────────
  /** 原版 index.html body click handler：切换 link CSS、移除 logo/tapToStart、显示 #main、注入 main.js */
  const handleIntroClick = useCallback(() => {
    setStage('credits');
  }, []);

  // ─── 阶段二：autoScroll + 音频循环 ────────────────────────
  /** 1:1 对应原版 main.js autoScroll() 函数 */
  useEffect(() => {
    if (stage !== 'credits') return;

    const audio = audioRef.current;
    if (!audio) return;

    // 1. 设置音频源为 AboutUs0.mp3 并播放
    audio.src = ABOUT_US.audio0;
    currentAudioRef.current = 'audio0';
    const playPromise = audio.play();
    if (playPromise) {
      // 自动播放可能被浏览器拦截（尽管有 intro 点击手势，仍可能在 React 渲染延迟下失败）
      playPromise.catch(() => {
        /* 静默失败，与原版一致 */
      });
    }

    // 2. ended 事件：切换 AboutUs0.mp3 ↔ AboutUs1.mp3 循环
    const handleEnded = () => {
      audio.pause();
      if (currentAudioRef.current === 'audio0') {
        audio.src = ABOUT_US.audio1;
        currentAudioRef.current = 'audio1';
      } else {
        audio.src = ABOUT_US.audio0;
        currentAudioRef.current = 'audio0';
      }
      audio.play().catch(() => {
        /* 静默失败 */
      });
    };
    audio.addEventListener('ended', handleEnded);

    // 3. 重置滚动位置（原版 document.body.scrollTo(0,0) + marginTop='0px'）
    document.body.scrollTo(0, 0);
    document.body.style.marginTop = '0px';

    // 4. 启动 autoScroll：12ms 间隔，marginTop -= 0.5px
    let topSize = 0;
    /** 滚到底后的 ended 监听器：当前歌曲播完后黑屏返回（一次性） */
    const handleEndedForReturn = () => {
      if (!isMountedRef.current) return;
      // 当前歌曲播完，黑屏后返回
      if (blackOverlayRef.current) {
        blackOverlayRef.current.style.opacity = '1';
      }
      navTimerRef.current = setTimeout(() => {
        navigateToChapterSelect();
      }, 1000);
    };
    autoScrollIntervalRef.current = setInterval(() => {
      const currentMarginTop = parseFloat(
        document.body.style.marginTop.replace('px', '') || '0'
      );
      // 滚到底判定：内容完全滚过视口底部
      if (
        document.body.offsetHeight + currentMarginTop <
        window.innerHeight
      ) {
        // END：清除滚动 interval，停止循环切换，等当前歌曲播完再返回
        stopAutoScroll();
        // 移除循环切换的 ended 监听器，改为"播完即返回"的一次性监听器
        audio.removeEventListener('ended', handleEnded);
        audio.addEventListener('ended', handleEndedForReturn, { once: true });
        return;
      }

      document.body.style.marginTop = `${topSize}px`;
      topSize -= 0.5;
    }, 12);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('ended', handleEndedForReturn);
      audio.pause();
      stopAutoScroll();
      if (endFadeTimerRef.current) {
        clearTimeout(endFadeTimerRef.current);
        endFadeTimerRef.current = null;
      }
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
      // 重置 body.marginTop，避免污染其他页面
      document.body.style.marginTop = '';
    };
  }, [stage, navigateToChapterSelect, stopAutoScroll]);

  // ─── 阶段二：跳过逻辑（5s 内连点 6 次） ────────────────────
  /** 1:1 对应原版 main.js 的 body click 监听（跳过逻辑） */
  useEffect(() => {
    if (stage !== 'credits') return;

    const handleCreditsClick = () => {
      clickToExitCounterRef.current -= 1;
      const counter = clickToExitCounterRef.current;

      // 更新跳过提示文字与不透明度
      // 原版：'再点击'+counter+'次以跳过' + opacity='0.'+(10-counter)
      const tag = clickToExitTagRef.current;
      if (tag) {
        tag.innerText = `再点击${counter}次以跳过`;
        tag.style.opacity = `0.${10 - counter}`;
      }

      // 计数到 0 → 渐显黑屏 + 1s 后跳转
      if (counter === 0) {
        stopAutoScroll();
        if (endFadeTimerRef.current) {
          clearTimeout(endFadeTimerRef.current);
          endFadeTimerRef.current = null;
        }
        if (blackOverlayRef.current) {
          blackOverlayRef.current.style.opacity = '1';
        }
        navTimerRef.current = setTimeout(() => {
          navigateToChapterSelect();
        }, 1000);
        return;
      }

      // 5s 后重置计数器为 6（清除之前的 timer，避免原版多 timer 叠加的副作用）
      if (clickToExitResetTimerRef.current) {
        clearTimeout(clickToExitResetTimerRef.current);
      }
      clickToExitResetTimerRef.current = setTimeout(() => {
        clickToExitCounterRef.current = 6;
        const t = clickToExitTagRef.current;
        if (t) {
          t.style.opacity = '0';
          // 300ms 后更新文字以反映重置（1:1 还原原版嵌套 setTimeout）
          setTimeout(() => {
            if (clickToExitTagRef.current) {
              clickToExitTagRef.current.innerText = `再点击${clickToExitCounterRef.current}次以跳过`;
            }
          }, 300);
        }
      }, 5000);
    };

    document.body.addEventListener('click', handleCreditsClick);

    return () => {
      document.body.removeEventListener('click', handleCreditsClick);
      if (clickToExitResetTimerRef.current) {
        clearTimeout(clickToExitResetTimerRef.current);
        clickToExitResetTimerRef.current = null;
      }
    };
  }, [stage, navigateToChapterSelect, stopAutoScroll]);

  // ─── 组件挂载/卸载跟踪 ──────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─── 阶段一：intro（tap-to-start 覆盖层） ─────────────────
  if (stage === 'intro') {
    return (
      <div
        className="au-intro-root"
        onClick={handleIntroClick}
        role="button"
        tabIndex={0}
        aria-label="touch to start"
      >
        <h1 className="au-title">Phi.ts</h1>
        <div className="au-tapToStart">touch to start</div>
      </div>
    );
  }

  // ─── 阶段二：credits 滚动 ────────────────────────────────
  // 结构 1:1 还原原版 index.html 的 #main 内容：
  //   blackOverlay + clickToExitTag + audio + 2×fromGameDirector + credits + snr.png +
  //   musicCredits(含 mainContent 双列 leftSide/rightSide) + thanksAllHelpers + thankYou
  return (
    <>
      <div className="au-blackOverlay" ref={blackOverlayRef} aria-hidden="true" />
      <div
        className="au-clickToExitTag"
        ref={clickToExitTagRef}
        aria-hidden="true"
      />
      <div className="au-credits-root">
        <audio ref={audioRef} />
        {/* Phi.ts 写在前面 */}
        <pre className="au-pre au-pre-fromGameDirector">{FROM_GAME_DIRECTOR_1}</pre>
        {/* 致谢 */}
        <pre className="au-pre au-pre-fromGameDirector">{FROM_GAME_DIRECTOR_2}</pre>
        {/* Phi.ts 技术栈 */}
        <pre className="au-pre au-pre-credits">{CREDITS}</pre>
        {/* Phi.ts logo */}
        <img
          src={ABOUT_US.snrLogo}
          alt="Phi.ts"
          className="au-snrLogo"
          draggable={false}
        />
        {/* 曲目 credits：header 文本 + div.mainContent 双列展示 */}
        <pre className="au-pre au-pre-musicCredits">
          {MUSIC_CREDITS_HEADER}
          <div className="au-mainContent">
            <pre className="au-pre au-pre-leftSide">{MUSIC_CREDITS_LEFT}</pre>
            <pre className="au-pre au-pre-rightSide">{MUSIC_CREDITS_RIGHT}</pre>
          </div>
        </pre>
        <div className="au-thanksAllHelpers">
          感谢所有为Phi.ts提供帮助的个人或团体
        </div>
        <div className="au-thankYou">
          And <br />
          You. <br />
        </div>
      </div>
    </>
  );
}
