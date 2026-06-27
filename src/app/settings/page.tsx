'use client';

/**
 * Phi.ts — 设置页面
 *
 * 源自 phigros-html5/settings/index.html (81 行) + index.js (134 行)
 *
 * 路由: /settings
 *
 * 1:1 对齐原版功能：
 *   - 背景 InitialBackground.png + backdrop-filter:blur(100px)
 *   - 左倾斜面板（leftArea, skew(-15deg)）
 *   - 左上角返回按钮（backBtn, onclick → 跳转 /chapter-select）
 *   - 13 个设置项（4 slider + 9 toggle，含 bug 修复新增的 showTransition 与 select-aspect-ratio）
 *   - 2 个额外按钮（关于我们 → /about-us；清除全部数据 → localStorage.clear() → /）
 *   - wheel/touch 滚动修改 #settingItems 的 margin-top
 *
 * Bug 修复点（与原版差异）：
 *   1. select-scale-ratio / select-global-alpha：原版 settings 存档位索引，模拟器读真实值；
 *      迁移后统一存真实值（8000 / 0.6 等），由 SettingSlider 内部映射档位 ↔ 真实值。
 *   2. showTransition：原版 settings 注释掉了，但模拟器在用；此处启用。
 *   3. select-aspect-ratio：原版隐藏 select 有此项但 resizeCanvas 不读取；此处暴露。
 *
 * 持久化：通过 usePhigrosSettings store 读写，不直接操作 localStorage。
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useRouter } from 'next/navigation';
import { usePhigrosSettings } from '@/hooks/use-phigros-settings';
import { SettingSlider } from '@/components/phigros/SettingSlider';
import { SettingToggle } from '@/components/phigros/SettingToggle';
import { navigateWithFade } from '@/lib/phigros/page-transition';
import {
  SCALE_RATIO_OPTIONS,
  GLOBAL_ALPHA_OPTIONS,
  ASPECT_RATIO_OPTIONS,
  INPUT_OFFSET_RANGE,
} from '@/lib/phigros/constants';

/**
 * 生成 input-offset 滑块档位：-500 ~ 500 步进 5（共 201 档）
 *
 * 原版 HTML 写的是 data-total="1000"（隐含步进 1，共 1001 档），但本仓库
 * constants.ts 中 INPUT_OFFSET_RANGE.step = 5，故实际档位数 = 201。
 * 滑块内部 total = options.length = 201，每步 marginLeft 位移 = 200/201 %。
 */
const INPUT_OFFSET_OPTIONS = (() => {
  const opts: { label: string; value: number }[] = [];
  for (let v = INPUT_OFFSET_RANGE.min; v <= INPUT_OFFSET_RANGE.max; v += INPUT_OFFSET_RANGE.step) {
    opts.push({ label: String(v), value: v });
  }
  return opts;
})();

/**
 * 检测是否在客户端渲染，避免 SSR/CSR hydration mismatch
 * （zustand persist 在客户端同步从 localStorage 水合，会导致首帧值与 SSR 默认值不同）
 *
 * 使用 useSyncExternalStore 是 React 推荐的"客户端感知"模式，不会触发
 * react-hooks/set-state-in-effect 告警。
 */
const subscribeNoop = () => () => {};
const getMountedClient = () => true;
const getMountedServer = () => false;

export default function SettingsPage() {
  const router = useRouter();
  const settings = usePhigrosSettings();
  const isClient = useSyncExternalStore(
    subscribeNoop,
    getMountedClient,
    getMountedServer,
  );

  // 滚动状态：#settingItems 的 marginTop（px）
  const [marginTop, setMarginTop] = useState(0);
  const yCoordRef = useRef(0);
  const prevTouchYRef = useRef(0);

  // 下落音符动画容器 ref
  const fallingNotesRef = useRef<HTMLDivElement | null>(null);

  // 挂载后从 localStorage 重新拉取一次，确保与 persist 水合结果一致
  useEffect(() => {
    usePhigrosSettings.getState().loadFromStorage();
  }, []);

  // wheel / touch 滚动（修改 #settingItems 的 margin-top）
  // 原版用 e.wheelDeltaY/8（已废弃）；这里用现代 e.deltaY，符号取反以保持方向一致
  useEffect(() => {
    if (!isClient) return;

    /** 计算可滚动范围：maxScroll = 内容高度 - 容器可见高度（正数）。
     *  margin-top 范围 [-maxScroll, 0]；maxScroll<=0 时禁止滚动。
     *  注意：offsetHeight 不含最后一个子元素的 margin-bottom，需额外补上，
     *  否则滚到底时最后一个按钮会被 leftArea 的 overflow:hidden 裁切。 */
    const getMaxScroll = () => {
      const items = document.getElementById('settingItems');
      if (!items) return 0;
      const container = items.parentElement; // .leftArea
      if (!container) return 0;
      // 容器可见高度 = offsetHeight - padding-top（100px）
      const containerVisible = container.offsetHeight - 100;
      // 内容高度 = items 自身高度 + 最后一个子元素的 margin-bottom
      const last = items.lastElementChild as HTMLElement | null;
      const lastMarginBottom = last
        ? parseFloat(getComputedStyle(last).marginBottom) || 0
        : 0;
      const contentHeight = items.offsetHeight + lastMarginBottom;
      return Math.max(0, contentHeight - containerVisible);
    };

    const clamp = (v: number) => {
      const maxScroll = getMaxScroll();
      if (maxScroll <= 0) return 0;
      if (v > 0) return 0;
      if (v < -maxScroll) return -maxScroll;
      return v;
    };

    const onWheel = (e: WheelEvent) => {
      const maxScroll = getMaxScroll();
      if (maxScroll <= 0) return; // 内容不超出容器，禁止滚动
      yCoordRef.current = clamp(yCoordRef.current - e.deltaY / 8);
      setMarginTop(yCoordRef.current);
      updateEdgeScale();
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.changedTouches.length === 0) return;
      prevTouchYRef.current = e.changedTouches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.changedTouches.length === 0) return;
      const maxScroll = getMaxScroll();
      if (maxScroll <= 0) return; // 内容不超出容器，禁止滚动
      const touchY = e.changedTouches[0].clientY;
      // 原版公式：yCoord = -0.1*(prevTouch - touchY) + yCoord
      // 此处补充 prevTouch 更新（原版漏掉，会导致位移累积），保持 0.1 缩放系数
      yCoordRef.current = clamp(yCoordRef.current + -0.1 * (prevTouchYRef.current - touchY));
      prevTouchYRef.current = touchY;
      setMarginTop(yCoordRef.current);
      updateEdgeScale();
    };

    /**
     * 底部边缘缩放效果（类似圆屏手表上下滑动时的边缘消隐）
     *
     * item 底部距容器底部 < 200px 时开始渐变缩放淡出，
     * 距离 200→0 对应 scale 1→0.75, opacity 1→0.15
     *
     * offsetTop 随 marginTop 滚动动态变化，已包含滚动偏移。
     * container.offsetHeight 是 leftArea 全高（含 padding-top:100）。
     */
    const updateEdgeScale = () => {
      const items = document.getElementById('settingItems');
      if (!items) return;
      const container = items.parentElement;
      if (!container) return;
      const containerBottom = container.offsetHeight;
      const fadeZone = 130; // 从底部 130px 处开始渐变
      const children = items.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        const itemTop = child.offsetTop;
        const itemBottom = itemTop + child.offsetHeight;
        // item 底部距容器底部的距离（正数=在容器内，负数=已超出）
        const distFromBottom = containerBottom - itemBottom;
        // item 顶部在容器内（至少部分可见）且距底部 < fadeZone
        if (itemTop < containerBottom && distFromBottom < fadeZone) {
          // t: 0（距底部远/刚进入fadeZone）→ 1（到达底部/超出）
          const t = Math.max(0, Math.min(1, 1 - distFromBottom / fadeZone));
          const scale = 1 - 0.25 * t; // 1→0.75
          const opacity = 1 - 0.7 * t; // 1→0.3（调清晰）
          child.style.transform = `scale(${scale})`;
          child.style.opacity = String(opacity);
          child.style.transformOrigin = 'bottom center';
          child.style.transition = 'none';
        } else {
          child.style.transform = '';
          child.style.opacity = '';
          child.style.transformOrigin = '';
        }
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    // 初始触发一次
    setTimeout(updateEdgeScale, 100);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [isClient]);

  // ─── 下落音符动画（JS rAF 精确控制，每周期重新创建元素消除累积偏移） ───
  useEffect(() => {
    if (!isClient) return;
    const container = fallingNotesRef.current;
    if (!container) return;

    const JUDGE_LINE_RATIO = 0.65; // 判定线在容器 65% 处
    const FALL_DURATION = 1000; // 下落 1s
    const CLICK_DURATION = 500; // 点击特效 500ms
    const WAIT_DURATION = 1500; // 等待 1.5s
    const CYCLE = FALL_DURATION + WAIT_DURATION; // 总周期 2.5s

    let rafId = 0;
    let startTime = performance.now();

    // 每周期创建新元素，避免 CSS 累积偏移
    let noteEl: HTMLDivElement | null = null;
    let clickEl: HTMLDivElement | null = null;
    let particles: HTMLDivElement[] = [];
    let cycleStartTime = startTime;

    const createNote = () => {
      noteEl = document.createElement('div');
      noteEl.className = 'settings-tap-note';
      noteEl.style.opacity = '1';
      noteEl.style.top = '-30px';
      container.appendChild(noteEl);
    };

    const createClickEffect = () => {
      clickEl = document.createElement('div');
      clickEl.className = 'settings-click-effect';
      clickEl.style.opacity = '1';
      clickEl.style.backgroundPosition = '0 0';
      container.appendChild(clickEl);

      // 4 个粒子
      const dirs = [
        [200, -80], [-200, -80], [180, 60], [-180, 60],
      ];
      particles = dirs.map(([dx, dy]) => {
        const p = document.createElement('div');
        p.className = 'settings-particle';
        p.style.opacity = '1';
        p.style.transform = 'translate(0, 0)';
        p.dataset.dx = String(dx);
        p.dataset.dy = String(dy);
        container.appendChild(p);
        return p;
      });
    };

    const cleanupElements = () => {
      if (noteEl) { noteEl.remove(); noteEl = null; }
      if (clickEl) { clickEl.remove(); clickEl = null; }
      particles.forEach((p) => p.remove());
      particles = [];
    };

    const animate = (now: number) => {
      const elapsed = now - cycleStartTime;
      const containerH = container.offsetHeight;
      const judgeY = containerH * JUDGE_LINE_RATIO;

      if (elapsed < FALL_DURATION) {
        // 阶段1：下落
        if (!noteEl) createNote();
        const t = elapsed / FALL_DURATION;
        // 匀速下落
        const y = -30 + (judgeY + 30) * t;
        if (noteEl) {
          noteEl.style.top = `${y}px`;
          noteEl.style.opacity = '1';
        }
      } else if (elapsed < FALL_DURATION + 50) {
        // 阶段2：到达判定线，音符消失，触发点击特效
        if (noteEl) {
          noteEl.style.opacity = '0';
          noteEl.remove();
          noteEl = null;
        }
        if (!clickEl) createClickEffect();
      } else if (elapsed < FALL_DURATION + CLICK_DURATION) {
        // 阶段3：点击特效播放（精灵帧 + 粒子）
        const clickT = (elapsed - FALL_DURATION) / CLICK_DURATION;
        if (clickEl) {
          const frame = Math.min(29, Math.floor(clickT * 30));
          clickEl.style.opacity = String(clickT < 0.8 ? 1 - clickT / 0.8 : 0);
          clickEl.style.backgroundPosition = `0 ${-frame * 120}px`;
        }
        particles.forEach((p) => {
          const dx = parseFloat(p.dataset.dx || '0');
          const dy = parseFloat(p.dataset.dy || '0');
          // 粒子飞散：9*t/(8*t+1) 模拟原版公式
          const ds = 9 * clickT / (8 * clickT + 1);
          p.style.transform = `translate(${dx * ds}px, ${dy * ds}px) scale(${1 - clickT * 0.7})`;
          p.style.opacity = String(clickT < 0.8 ? 1 - clickT / 0.8 : 0);
        });
      } else if (elapsed < CYCLE) {
        // 阶段4：等待
        if (clickEl) { clickEl.style.opacity = '0'; }
        particles.forEach((p) => { p.style.opacity = '0'; });
      } else {
        // 新周期：清理旧元素，重新开始
        cleanupElements();
        cycleStartTime = now;
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      cleanupElements();
    };
  }, [isClient]);

  // 返回按钮：原版 saveSettings() + 跳转 chapterSelect
  // zustand persist 已实时写入 localStorage，无需显式 save
  const handleBack = useCallback(() => {
    navigateWithFade(router, '/chapter-select');
  }, [router]);

  const handleAboutUs = useCallback(() => {
    navigateWithFade(router, '/about-us');
  }, [router]);

  const handleClearData = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
    navigateWithFade(router, '/');
  }, [router]);

  // 未挂载时仅渲染空背景，避免 SSR 与 CSR 之间 store 状态不一致导致 hydration 警告
  if (!isClient) {
    return <div className="settings-root" aria-busy="true" />;
  }

  return (
    <div className="settings-root">
      <div
        className="backBtn"
        role="button"
        aria-label="返回章节选择"
        tabIndex={0}
        onClick={handleBack}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBack();
          }
        }}
      />
      <div className="leftArea">
        <div
          id="settingItems"
          className="settingItems"
          style={{ marginTop: `${marginTop}px` }}
        >
          {/* 1. 谱面延时(MS) — slider, -500~500 步进 5 */}
          <SettingSlider
            codename="input-offset"
            label="谱面延时(MS)"
            options={INPUT_OFFSET_OPTIONS}
            currentValue={settings.inputOffset}
            onChange={(v) => settings.setSetting('inputOffset', v)}
          />

          {/* 2. 按键缩放 — 5 档（真实值 6000~10000） */}
          <SettingSlider
            codename="select-scale-ratio"
            label="按键缩放"
            options={SCALE_RATIO_OPTIONS}
            currentValue={settings.selectScaleRatio}
            onChange={(v) => settings.setSetting('selectScaleRatio', v)}
          />

          {/* 3. 背景亮度 — 5 档（真实值 0.2~1） */}
          <SettingSlider
            codename="select-global-alpha"
            label="背景亮度"
            options={GLOBAL_ALPHA_OPTIONS}
            currentValue={settings.selectGlobalAlpha}
            onChange={(v) => settings.setSetting('selectGlobalAlpha', v)}
          />

          {/* 4. 开启打击音效 — toggle，默认开 */}
          <SettingToggle
            codename="hitSong"
            label="开启打击音效"
            currentValue={settings.hitSong}
            onChange={(v) => settings.setSetting('hitSong', v)}
          />

          {/* 5. 开启多押辅助 — toggle，默认开 */}
          <SettingToggle
            codename="highLight"
            label="开启多押辅助"
            currentValue={settings.highLight}
            onChange={(v) => settings.setSetting('highLight', v)}
          />

          {/* 6. 游玩时自动全屏 — toggle，默认开 */}
          <SettingToggle
            codename="autoFullscreen"
            label="游玩时自动全屏"
            currentValue={settings.autoFullscreen}
            onChange={(v) => settings.setSetting('autoFullscreen', v)}
          />

          {/* 7. 开启FC/AP指示器 — toggle，默认关 */}
          <SettingToggle
            codename="lineColor"
            label="开启FC/AP指示器"
            currentValue={settings.lineColor}
            onChange={(v) => settings.setSetting('lineColor', v)}
          />

          {/* 8. 开启HyperMode — toggle，默认关 */}
          <SettingToggle
            codename="hyperMode"
            label="开启HyperMode"
            currentValue={settings.hyperMode}
            onChange={(v) => settings.setSetting('hyperMode', v)}
          />

          {/* 9. 背景模糊显示 — toggle，默认开 */}
          <SettingToggle
            codename="imageBlur"
            label="背景模糊显示"
            currentValue={settings.imageBlur}
            onChange={(v) => settings.setSetting('imageBlur', v)}
          />

          {/* 10. 开启触摸反馈 — toggle，默认关 */}
          <SettingToggle
            codename="feedback"
            label="开启触摸反馈"
            currentValue={settings.feedback}
            onChange={(v) => settings.setSetting('feedback', v)}
          />

          {/* 11. 显示定位点 — toggle，默认关 */}
          <SettingToggle
            codename="showPoint"
            label="显示定位点"
            currentValue={settings.showPoint}
            onChange={(v) => settings.setSetting('showPoint', v)}
          />

          {/* 12. 显示过渡动画 — toggle，默认开（原版被注释，此处启用） */}
          <SettingToggle
            codename="showTransition"
            label="显示过渡动画"
            currentValue={settings.showTransition}
            onChange={(v) => settings.setSetting('showTransition', v)}
          />

          {/* 13. 画面宽高比 — 8 档（原版隐藏 select 有此项，此处暴露） */}
          <SettingSlider
            codename="select-aspect-ratio"
            label="画面宽高比"
            options={ASPECT_RATIO_OPTIONS}
            currentValue={settings.selectAspectRatio}
            onChange={(v) => settings.setSetting('selectAspectRatio', v)}
          />

          {/* 14. 自动游玩 — toggle，默认关（原版硬编码关闭无UI，此处启用） */}
          <SettingToggle
            codename="autoPlay"
            label="自动游玩"
            currentValue={settings.autoPlay}
            onChange={(v) => settings.setSetting('autoPlay', v)}
          />

          {/* 额外按钮：关于我们 */}
          <div className="item">
            <button type="button" className="button" onClick={handleAboutUs}>
              关于我们
            </button>
          </div>

          {/* 额外按钮：清除全部数据 */}
          <div className="item">
            <button type="button" className="button" onClick={handleClearData}>
              清除全部数据
            </button>
          </div>
        </div>
      </div>

      {/* 右侧空白区域：判定线 + Tap 音符循环下落动画（JS rAF 精确控制） */}
      <div className="settings-falling-notes" aria-hidden="true" ref={fallingNotesRef}>
        <div className="settings-judge-line" />
      </div>
    </div>
  );
}
