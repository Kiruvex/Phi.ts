/**
 * Phi.ts — 页面跳转过渡工具
 *
 * 在 router.push 前显示纯黑遮罩（渐入 0.3s），
 * 跳转后新页面加载时遮罩自动渐出（0.3s）。
 *
 * 用法：
 *   import { navigateWithFade } from '@/lib/phigros/page-transition';
 *   navigateWithFade(router, '/chapter-select');
 *
 * 各页面已有的过渡动画（tapToStart fadeIn、chapterSelect darkOverlay 等）
 * 保留不动，本工具只用于没有自带过渡的跳转。
 */

/** 显示全局黑色遮罩 */
function showOverlay() {
  let overlay = document.getElementById('phi-route-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'phi-route-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: #000;
      opacity: 0;
      pointer-events: none;
      z-index: 99999;
      transition: opacity 0.3s ease-in;
    `;
    document.body.appendChild(overlay);
  }
  // 下一帧触发渐入（让浏览器先渲染 opacity:0）
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay!.style.opacity = '1';
      overlay!.style.pointerEvents = 'auto';
    });
  });
}

/** 隐藏全局黑色遮罩 */
function hideOverlay() {
  const overlay = document.getElementById('phi-route-overlay');
  if (overlay) {
    overlay.style.transition = 'opacity 0.3s ease-out';
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    // 过渡完成后移除
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 400);
  }
}

/**
 * 带黑色渐变过渡的页面跳转
 * @param router Next.js router
 * @param url 目标 URL
 * @param delay 跳转前等待时间（ms，默认 300 = 遮罩完全遮住后跳转）
 */
export function navigateWithFade(
  router: { push: (url: string) => void },
  url: string,
  delay = 300,
) {
  showOverlay();
  setTimeout(() => {
    router.push(url);
    // 遮罩由 PhigrosProvider 在检测到路由变化时隐藏
    // 不在这里调用 hideOverlay，因为新页面可能还没渲染
  }, delay);
}

/**
 * 在页面加载时隐藏遮罩（用于新页面 mount 后调用）
 * 如果没有遮罩则不操作
 */
export function hideRouteOverlay() {
  hideOverlay();
}

/** 播放按钮点击音效（Tap2.wav） */
export function playClickSound() {
  if (typeof window === 'undefined') return;
  try {
    const audio = new Audio('/phigros/assets/audio/Tap1.wav');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {}
}
