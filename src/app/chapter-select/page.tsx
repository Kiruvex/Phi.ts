'use client';

/**
 * Phi.ts — chapterSelect（章节选择）页面
 *
 * 路由：/chapter-select
 *
 * 1:1 迁移自 phigros-html5/chapterSelect/（index.html 57行 + style.css 168行 + index.js 33行）。
 *
 * 核心行为：
 *  1. 显示倾斜的章节卡片（skew(-15deg)），卡片内图片 skew(15deg) translateX(-20%) 反倾斜。
 *     右上角 ::before 显示章节名，右下角 ::after 显示 "▷  P L A Y" + 渐变背景。
 *  2. 背景音乐 ChapterSelect0.mp3 自动循环播放。
 *  3. 背景为 InitialBackground.png，三层模糊：
 *     - cs-bg-1 黑底（等价原 html background:#000）
 *     - cs-bg-2 InitialBackground + filter:blur(10px) + backdrop-filter:blur(15px)（等价原 html::before）
 *     - cs-body InitialBackground + backdrop-filter:blur(15px)（等价原 body）
 *  4. 滚轮水平滚动：向下滚→内容左移（看到右侧章节）。边界检测防止 overshoot。
 *     用 deltaY 替代原版已废弃的 wheelDeltaY，符号取反以保持滚动方向语义。
 *  5. 点击章节卡片（非图片区域，即 ::before/::after）：
 *     - 播放 Tap1.wav 音效
 *     - darkOverlay 加 cs-fadeIn 类（0.5s 渐入，z-index:999）
 *     - 400ms 后跳转 /song-select?c={codename}
 *  6. 右下角设置按钮，点击跳转 /settings。
 *  7. 页面加载时 darkOverlay 播放 cs-fadeOut 1s 动画（从黑屏渐入到页面，z-index:999 切换）。
 *
 * 注意：本组件使用 'use client' 因为需要 audio 播放、wheel 监听、DOM style.left 操作与客户端路由跳转。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChapterCard from '@/components/phigros/ChapterCard';
import { navigateWithFade } from '@/lib/phigros/page-transition';
import {
  CHAPTER_IMAGES,
  CHAPTER_SELECT_AUDIO,
  TAP_AUDIO,
} from '@/lib/phigros/asset-paths';

// 1:1 对齐原版：只有 single 启用，其余 12 个章节在原版被注释掉
const CHAPTERS = [
  {
    name: '单曲 精选集',
    codename: 'single',
    image: `${CHAPTER_IMAGES}/Single.png`,
  },
] as const;

export default function ChapterSelectPage() {
  const router = useRouter();

  /** body 容器引用（用于 wheel 滚动时直接操作 style.left，避免 re-render） */
  const bodyRef = useRef<HTMLDivElement | null>(null);

  /** 当前 body.style.left 的数值（px），用 ref 持有避免每帧 re-render */
  const bodyLeftRef = useRef(0);

  /** 背景音乐 audio 元素引用 */
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /** 跳转定时器引用（用于卸载时清理） */
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** darkOverlay 是否加 cs-fadeIn 类（点击章节后触发） */
  const [fadeIn, setFadeIn] = useState(false);

  /**
   * 点击章节：播放 Tap1.wav + darkOverlay 加 cs-fadeIn 类 + 400ms 后跳转。
   * 1:1 对齐原版 chapterSelect/index.js 的 chapterContainer click 监听器。
   */
  const handleChapterClick = useCallback(
    (codename: string) => {
      // 1. 创建 audio 播放 Tap1.wav（与原版 document.createElement('audio') 一致）
      const clickAudio = new Audio(TAP_AUDIO(1));
      clickAudio.play().catch(() => {
        // 浏览器自动播放策略可能阻止，忽略
      });

      // 2. darkOverlay 加 fadeIn 类（触发 cs-fadeIn 0.5s 动画）
      setFadeIn(true);

      // 3. 400ms 后跳转（darkOverlay 已覆盖屏幕，用全局遮罩保持连续）
      navigateTimerRef.current = setTimeout(() => {
        // 创建全局遮罩保持过渡连续（darkOverlay 随页面卸载会消失）
        const overlay = document.getElementById('phi-route-overlay');
        if (!overlay) {
          const o = document.createElement('div');
          o.id = 'phi-route-overlay';
          o.style.cssText = 'position:fixed;inset:0;background:#000;opacity:1;pointer-events:none;z-index:99999;';
          document.body.appendChild(o);
        }
        router.push(`/song-select?c=${codename}`);
      }, 400);
    },
    [router],
  );

  /** 设置按钮：跳转 /settings */
  const handleSettingClick = useCallback(() => {
    navigateWithFade(router, '/settings');
  }, [router]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    // 背景音乐自动播放（现代浏览器可能阻止 autoplay，捕获异常）
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 1;
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => {
          // 自动播放被阻止，忽略（用户首次交互后可恢复）
        });
      }
    }

    /**
     * wheel 事件：水平滚动
     *
     * 1:1 对齐原版 chapterSelect/index.js 语义，但用 e.deltaY 替代已废弃的 e.wheelDeltaY。
     * - 原版 wheelDeltaY：正值=向上滚，负值=向下滚
     * - 现代 deltaY：正值=向下滚，负值=向上滚（与 wheelDeltaY 符号相反）
     *
     * 为保持"向下滚→内容左移（看到右侧章节）"的体验：
     *   newLeft = currentLeft - deltaY / 1.5
     * （取负因为 deltaY 与 wheelDeltaY 符号相反，原版是 currentLeft + wheelDeltaY/1.5）
     *
     * 边界检测：
     *   - 左边界：currentLeft >= 0 && deltaY < 0（向上滚=想看左侧，已到最左）→ 阻止
     *   - 右边界：currentLeft <= -(bodyWidth - winWidth) && deltaY > 0（向下滚=想看右侧，已到最右）→ 阻止
     */
    const handleWheel = (e: WheelEvent) => {
      const currentLeft = bodyLeftRef.current;
      const deltaY = e.deltaY;
      const bodyWidth = body.offsetWidth;
      const winWidth = window.innerWidth;
      const maxScroll = bodyWidth - winWidth; // 可滚动总距离（正数）

      // 内容不超出视口时，禁止滚动（如只有一个卡片）
      if (maxScroll <= 0) {
        return;
      }

      // 左边界：已到最左且想继续向左（向上滚）
      if (currentLeft >= 0 && deltaY < 0) {
        return;
      }
      // 右边界：已到最右且想继续向右（向下滚）
      if (currentLeft <= -maxScroll && deltaY > 0) {
        return;
      }

      // 计算新 left 值（向下滚 deltaY>0 → newLeft 减小 → 内容左移）
      let newLeft = currentLeft - deltaY / 1.5;
      // 边界夹紧（防止 overshoot，原版无此防护但属于合理改进）
      if (newLeft > 0) newLeft = 0;
      if (newLeft < -maxScroll) newLeft = -maxScroll;

      bodyLeftRef.current = newLeft;
      body.style.left = `${newLeft}px`;
    };

    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current);
        navigateTimerRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* 背景层（原版 html 黑底 + html::before 模糊 InitialBackground + body backdrop-filter） */}
      <div className="cs-bg-1" aria-hidden="true" />
      <div className="cs-bg-2" aria-hidden="true" />

      {/* body 容器：原版 body，可水平滚动（通过 JS 更新 style.left） */}
      <main ref={bodyRef} className="cs-body">
        {CHAPTERS.map((ch) => (
          <ChapterCard
            key={ch.codename}
            name={ch.name}
            codename={ch.codename}
            image={ch.image}
            onClick={handleChapterClick}
          />
        ))}
      </main>

      {/* 设置按钮（右下角固定，::before 黑色斜切底 + ::after setting.png 图标） */}
      <button
        type="button"
        className="cs-settingBtn"
        onClick={handleSettingClick}
        aria-label="设置"
      />

      {/* 全屏黑色遮罩（初始 cs-fadeOut 1s 从黑屏渐入页面；点击章节后加 cs-fadeIn 类触发 0.5s 渐入） */}
      <div
        className={`cs-darkOverlay${fadeIn ? ' cs-fadeIn' : ''}`}
        aria-hidden="true"
      />

      {/* 背景音乐：autoplay + loop，并在 useEffect 中调用 play() 绕过自动播放限制 */}
      <audio ref={audioRef} loop autoPlay src={CHAPTER_SELECT_AUDIO} />
    </>
  );
}
