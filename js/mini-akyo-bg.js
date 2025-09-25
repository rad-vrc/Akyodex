(function(){
  const CANDIDATES = [
    'images/@miniakyo.webp',
    'images/miniakyo.webp',
  ];

  function getVersionSuffix(){
    try{
      const href = (typeof window !== 'undefined' ? window.location.href : '');
      const params = new URL(href).searchParams;
      const force = params.get('reloadBg') === '1' || params.has('nocache');
      const base = localStorage.getItem('akyoAssetsVersion') || localStorage.getItem('akyoDataVersion') || '1';
      const bump = force ? `.${Date.now().toString(36)}` : '';
      return `?v=${encodeURIComponent(base + bump)}`;
    }catch(_){ return ''; }
  }

  async function resolveMiniAkyoUrl(){
    const ver = getVersionSuffix();
    const ACCEPTABLE = new Set([200, 203, 204, 206, 304]);
    for (const path of CANDIDATES){
      try{
        const r = await fetch(path + ver, { cache: 'no-cache' });
        if (r.ok || ACCEPTABLE.has(r.status) || (r.type === 'opaque' && !r.status)) {
          return path + ver;
        }
      }catch(_){ /* continue */ }
    }
    return null;
  }

  function ensureStyles(){
    if (document.getElementById('miniAkyoBgStyles')) return;
    const css = `
#miniAkyoBg{position:fixed;inset:0;width:100vw;height:100vh;overflow:hidden;pointer-events:none;z-index:0}
.mini-akyo{position:absolute;bottom:-12%;background-size:contain;background-repeat:no-repeat;opacity:var(--opacity,0.35);width:var(--size,96px);height:var(--size,96px);left:var(--left,50vw);animation:akyo-float-up var(--duration,22s) linear infinite;will-change:transform,opacity;filter:drop-shadow(0 3px 10px rgba(0,0,0,.35))}
@keyframes akyo-float-up{0%{transform:translateY(0) rotate(var(--rotate,0deg));opacity:var(--opacity,0.35)}100%{transform:translateY(-120vh) rotate(calc(var(--rotate,0deg) + 360deg));opacity:0}}
`;
    const style = document.createElement('style');
    style.id = 'miniAkyoBgStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createHost(){
    let host = document.getElementById('miniAkyoBg');
    if (!host){
      host = document.createElement('div');
      host.id = 'miniAkyoBg';
      host.setAttribute('aria-hidden', 'true');
      document.body.prepend(host);
    }
    try{
      const p = new URLSearchParams(location.search);
      const bg = (p.get('bg') || '').toLowerCase();
      if (bg === 'front' || bg === '1') host.style.zIndex = '10';
    }catch(_){ }
    return host;
  }

  // 左右偏りを抑えるための低差異シーケンス（黄金比擬似乱数）
  let __seqU = Math.random();
  const PHI = 0.6180339887498949; // (sqrt(5)-1)/2
  function nextUniform(){ __seqU = (__seqU + PHI) % 1; return __seqU; }
  function clamp(v, min, max){ return v < min ? min : (v > max ? max : v); }

  function spawnOne(host, url, uOverride){
    const el = document.createElement('div');
    el.className = 'mini-akyo';

    const size = Math.round(64 + Math.random()*96); // 64-160px
    const u = (typeof uOverride === 'number') ? uOverride : nextUniform();
    const leftVW = clamp(u*100, 2, 98);
    const duration = 18 + Math.random()*14; // 18-32s
    const delay = Math.random()*8; // 0-8s
    const opacity = 0.24 + Math.random()*0.18; // 0.24-0.42
    const drift = (Math.random()*40 - 20);

    el.style.setProperty('--size', size+'px');
    el.style.setProperty('--left', `calc(${leftVW}vw + ${drift}px)`);
    el.style.setProperty('--opacity', String(opacity));
    el.style.setProperty('--duration', duration+'s');
    el.style.animationDuration = duration+'s';
    el.style.animationDelay = delay+'s';
    el.style.backgroundImage = `url("${url}")`;

    const rotate = (Math.random()*40 - 20);
    el.style.setProperty('--rotate', rotate+'deg');
    el.style.transform = `translateY(0) rotate(${rotate}deg)`;
    el.style.opacity = String(opacity);

    el.addEventListener('animationend', () => { el.remove(); });
    host.appendChild(el);
  }

  async function initMiniAkyoBackground(){
    try{
      ensureStyles();
      const url = await resolveMiniAkyoUrl();
      if (!url) return;
      const host = createHost();

      // 初期クリア（再初期化時の重複防止）
      while (host.firstChild) host.removeChild(host.firstChild);

      let initial = Math.min(18, Math.max(10, Math.round(window.innerWidth/110)));
      try{
        const p = new URLSearchParams(location.search);
        const dens = parseInt(p.get('bgdensity')||'', 10);
        if (!isNaN(dens) && dens>0 && dens<=50) initial = dens;
      }catch(_){ }
      // ストラタム分割で均等配置（各スライス内にランダム）
      for (let i=0;i<initial;i++){
        const u = (i + Math.random()) / initial;
        spawnOne(host, url, u);
      }

      const targetDensity = initial;
      setInterval(() => {
        const current = host.children.length;
        const deficit = targetDensity - current + Math.floor(Math.random()*2); // -1..+?
        const spawnCount = Math.max(0, Math.min(4, deficit));
        for (let i=0;i<spawnCount;i++) spawnOne(host, url);
      }, 2000);

      window.addEventListener('resize', () => {
        const ideal = Math.min(22, Math.max(10, Math.round(window.innerWidth/110)));
        while (host.children.length > ideal) host.removeChild(host.firstChild);
      });
    }catch(_){ }
  }

  if (typeof window !== 'undefined'){
    window.initMiniAkyoBackground = initMiniAkyoBackground;
  }
})();
