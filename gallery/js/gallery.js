// AkyoGallery メインスクリプト

console.log('🎨 AkyoGallery loaded');
console.log('💡 管理者機能: window.setGalleryAuth("password") で認証');

// グローバル変数
let galleryItems = [];
let filteredItems = [];

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing AkyoGallery...');

  // X埋め込みウィジェット読み込み
  loadTwitterWidget();

  // アーカイブ読み込み
  await loadArchive();

  // イベントリスナー設定
  setupEventListeners();

  console.log('✅ Initialization complete');
});

// X埋め込みウィジェット読み込み
function loadTwitterWidget() {
  if (window.twttr) return;

  !function(d,s,id){
    var js,fjs=d.getElementsByTagName(s)[0],t=window.twttr||{};
    if(d.getElementById(id))return t;
    js=d.createElement(s);
    js.id=id;
    js.src="https://platform.twitter.com/widgets.js";
    fjs.parentNode.insertBefore(js,fjs);
    t._e = [];
    t.ready = function(f) {
      t._e.push(f);
    };
    return t;
  }(document,"script","twitter-wjs");
}

// アーカイブ読み込み
async function loadArchive() {
  const loading = document.getElementById('archiveLoading');
  const grid = document.getElementById('galleryGrid');
  const noArchive = document.getElementById('noArchive');

  try {
    const res = await fetch('/api/gallery');

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    galleryItems = data.items || [];
    filteredItems = [...galleryItems];

    loading.classList.add('hidden');

    if (galleryItems.length === 0) {
      noArchive.classList.remove('hidden');
    } else {
      grid.classList.remove('hidden');
      renderGallery();
      updateStats();
    }

    console.log(`📦 Loaded ${galleryItems.length} archive items`);

  } catch (error) {
    console.error('❌ Failed to load archive:', error);
    loading.classList.add('hidden');
    noArchive.classList.remove('hidden');
  }
}

// ギャラリー描画
function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = '';

  filteredItems.forEach(item => {
    const card = createGalleryCard(item);
    grid.appendChild(card);
  });
}

// カード作成
function createGalleryCard(item) {
  const card = document.createElement('div');
  card.className = 'gallery-card';

  const img = document.createElement('img');
  img.src = item.thumbnail || item.fullUrl;
  img.alt = item.author || 'Akyo投稿';
  img.loading = 'lazy';

  const overlay = document.createElement('div');
  overlay.className = 'gallery-card-overlay';

  const author = document.createElement('div');
  author.className = 'gallery-card-author';
  author.textContent = item.author || '匿名';

  const link = document.createElement('a');
  link.href = item.tweetUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = 'gallery-card-link';
  link.textContent = 'ツイートを見る →';

  overlay.appendChild(author);
  overlay.appendChild(link);
  card.appendChild(img);
  card.appendChild(overlay);

  return card;
}

// 統計更新
function updateStats() {
  document.getElementById('totalCount').textContent = filteredItems.length;

  const now = new Date();
  const timeStr = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  document.getElementById('lastUpdate').textContent = timeStr;
}

// イベントリスナー設定
function setupEventListeners() {
  // 検索（PC）
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
  }

  // 検索（モバイル）
  const searchInputMobile = document.getElementById('searchInputMobile');
  if (searchInputMobile) {
    searchInputMobile.addEventListener('input', debounce(handleSearch, 300));
  }

  // タグフィルター
  const tagFilter = document.getElementById('tagFilter');
  if (tagFilter) {
    tagFilter.addEventListener('change', handleFilter);
  }
}

// 検索処理
function handleSearch(event) {
  const query = event.target.value.toLowerCase().trim();

  filteredItems = galleryItems.filter(item => {
    const author = (item.author || '').toLowerCase();
    const tags = (item.tags || []).join(' ').toLowerCase();
    return author.includes(query) || tags.includes(query);
  });

  renderGallery();
  updateStats();
}

// フィルター処理
function handleFilter(event) {
  const tag = event.target.value;

  if (!tag) {
    filteredItems = [...galleryItems];
  } else {
    filteredItems = galleryItems.filter(item => {
      return (item.tags || []).includes(tag);
    });
  }

  renderGallery();
  updateStats();
}

// デバウンス
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ==================== 管理者機能 ====================

// 認証設定
window.setGalleryAuth = function(password) {
  window.__GALLERY_ADMIN_AUTH__ = password;
  console.log('✅ 認証設定完了');
  console.log('💡 使用例: await window.addGalleryItem({...})');
};

// 投稿追加
window.addGalleryItem = async function(item) {
  if (!window.__GALLERY_ADMIN_AUTH__) {
    throw new Error('❌ 認証が必要です。window.setGalleryAuth("password") を実行してください');
  }

  const { tweetUrl, imageUrl, author, tags } = item;

  if (!tweetUrl || !imageUrl || !author) {
    throw new Error('❌ 必須項目: tweetUrl, imageUrl, author');
  }

  const id = `gallery_${Date.now()}`;
  const payload = {
    id,
    type: 'photo',
    thumbnail: imageUrl,
    fullUrl: imageUrl,
    tweetUrl,
    author,
    tags: tags || [],
    createdAt: new Date().toISOString()
  };

  console.log('📤 Uploading:', payload);

  const res = await fetch('/api/gallery-add', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${window.__GALLERY_ADMIN_AUTH__}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`❌ アップロード失敗 (${res.status}): ${error}`);
  }

  const result = await res.json();
  console.log('✅ 追加完了:', result);

  // リロードして反映
  await loadArchive();

  return result;
};

// 使用例を表示
console.log(`
🎨 AkyoGallery 管理者コマンド
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 認証設定:
   window.setGalleryAuth("your-password")

2. 投稿追加:
   await window.addGalleryItem({
     tweetUrl: 'https://twitter.com/user/status/123',
     imageUrl: 'https://pbs.twimg.com/media/xxx.jpg',
     author: '@username',
     tags: ['Akyo', 'あきょさつ']
   })
`);
