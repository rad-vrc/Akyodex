// js/akyo-float.js
// 画像URLは必ずマニフェスト経由（R2/PNG両対応）
function getUrlById(id3) {
  try {
    if (typeof getAkyoImageUrl === 'function') return getAkyoImageUrl(id3);
  } catch (_) {}
  return `/images/${id3}.png`; // 保険
}

// Akyoをふわふわ動かす最小実装
function startAkyoFloat(id3 = '001', opts = {}) {
  const density = Number(opts.density || 20); // 予備（将来拡張）

  const img = new Image();
  img.alt = 'Akyo';
  img.style.position = 'fixed';
  img.style.left = '0';
  img.style.top = '0';
  img.style.zIndex = '9999';
  img.style.pointerEvents = 'none';
  img.style.willChange = 'transform';

  const url = getUrlById(id3);
  img.src = url;
  img.onerror = () => { img.src = `/images/${id3}.png`; }; // フォールバック

  document.body.appendChild(img);

  // 動きが苦手な人の設定は尊重
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch(_) {}

  let t = 0;
  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  function frame() {
    t += 1 / 60;
    const x = (W() * 0.6) + Math.sin(t * 0.6) * (W() * 0.25);
    const y = (H() * 0.2) + Math.cos(t * 0.8) * (H() * 0.15);
    img.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

window.startAkyoFloat = startAkyoFloat;


