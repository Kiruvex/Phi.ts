/**
 * Phi.ts — Service Worker
 *
 * 源自 phigros-html5 (MPL-2.0) by lchzh3473 & HanHan233
 *
 * 修改点:
 *   1. 预缓存清单路径加 /phigros/ 前缀
 *   2. 移除 terrasphere 相关注释（已删除）
 *   3. 增加 activate 事件清理旧缓存（原版无，这是 bug 修复）
 *   4. cache-first 策略保留
 */

const CACHE_NAME = 'phigros-video-store-v1';
const PRECACHE_URLS = [
  '/phigros/tapToStart/TouchToStart0.mp3',
  '/phigros/chapterSelect/ChapterSelect0.mp3',
  '/phigros/assets/images/chapterImages/Single.png',
  '/phigros/assets/audio/LevelOver0.wav',
  '/phigros/assets/audio/LevelOver1.wav',
  '/phigros/assets/audio/LevelOver2.wav',
  '/phigros/assets/audio/LevelOver3.wav',
  '/phigros/assets/audio/Tap1.wav',
  '/phigros/assets/audio/Tap2.wav',
  '/phigros/assets/audio/Tap3.wav',
  '/phigros/assets/audio/Tap4.wav',
  '/phigros/assets/audio/Tap5.wav',
  '/phigros/assets/audio/Tap6.wav',
  '/phigros/assets/audio/Tap7.wav',
  '/phigros/charts/ouroVoros/meta.json',
  '/phigros/charts/ouroVoros/ouroVoros.jpg',
  '/phigros/charts/ouroVoros/ouroVoros.ogg',
  '/phigros/charts/ouroVoros/ouroVoros.pec',
  '/phigros/charts/sample/meta.json',
  '/phigros/charts/sample/0.png',
  '/phigros/charts/sample/1.png',
  '/phigros/charts/sample/2.png',
  '/phigros/charts/sample/3.png',
  '/phigros/charts/sample/line.json',
  '/phigros/charts/sample/SpasmodicSP.json',
  '/phigros/charts/sample/SpasmodicSP.ogg',
  '/phigros/charts/sample/SpasmodicSP.png',
  '/phigros/charts/samplePec/meta.json',
  '/phigros/charts/samplePec/temp.jpg',
  '/phigros/charts/samplePec/temp.mp3',
  '/phigros/charts/samplePec/Tempestissimo.pec',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
