(function(){
  const IMG_WEBP = 'images/@miniakyo.webp';
  const IMG_PNG  = 'images/@miniakyo.png';

  function getVersionSuffix(){
    try{
      const v = localStorage.getItem('akyoAssetsVersion') || localStorage.getItem('akyoDataVersion') || '1';
      return `?v=${encodeURIComponent(v)}`;
    }catch(_){ return ''; }
  }

  async function resolveMiniAkyoUrl(){
    const ver = getVersionSuffix();
    try{
      const r = await fetch(IMG_WEBP + ver, { cache: 'no-cache' });
      if (r.ok) return IMG_WEBP + ver;
    }catch(_){}
    try{
      const r2 = await fetch(IMG_PNG + ver, { cache: 'no-cache' });
      if (r2.ok) return IMG_PNG + ver;
    }catch(_){ }
    return null;
  }

  function createHost(){
    let host = document.getElementById('miniAkyoBg');
    if (!host){
      host = document.createElement('div');
      host.id = 'miniAkyoBg';
      document.body.prepend(host);
    }
    return host;
  }

  function spawnOne(host, url){
    const el = document.createElement('div');
    el.className = 'mini-akyo';

    const size = Math.round(32 + Math.random()*96); // 32-128px
    const left = Math.round(Math.random()*100);
    const duration = 14 + Math.random()*12; // 14-26s
    const delay = Math.random()*10; // 0-10s
    const opacity = 0.10 + Math.random()*0.18; // 0.10-0.28
    const drift = (Math.random()*40 - 20); // -20~+20 px 近似

    el.style.setProperty('--size', size+'px');
    el.style.setProperty('--left', `calc(${left}vw + ${drift}px)`);
    el.style.setProperty('--opacity', String(opacity));
    el.style.animationDuration = duration+'s';
    el.style.animationDelay = delay+'s';
    el.style.backgroundImage = `url("${url}")`;

    const rotate = (Math.random()*40 - 20);
    el.style.transform = `translateY(0) rotate(${rotate}deg)`;

    el.addEventListener('animationend', () => { el.remove(); });
    host.appendChild(el);
  }

  async function initMiniAkyoBackground(){
    try{
      const url = await resolveMiniAkyoUrl();
      if (!url) return;
      const host = createHost();

      const initial = Math.min(18, Math.max(8, Math.round(window.innerWidth/120)));
      for (let i=0;i<initial;i++) spawnOne(host, url);

      const targetDensity = initial;
      setInterval(() => {
        const current = host.children.length;
        const spawnCount = Math.max(1, Math.min(4, targetDensity - current + Math.floor(Math.random()*3)));
        for (let i=0;i<spawnCount;i++) spawnOne(host, url);
      }, 2000);

      window.addEventListener('resize', () => {
        const ideal = Math.min(22, Math.max(8, Math.round(window.innerWidth/110)));
        while (host.children.length > ideal) host.removeChild(host.firstChild);
      });
    }catch(_){ }
  }

  if (typeof window !== 'undefined'){
    window.initMiniAkyoBackground = initMiniAkyoBackground;
  }
})();
