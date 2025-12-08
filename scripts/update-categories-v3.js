
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const DATA_DIR = path.join(process.cwd(), 'data');
const CSV_PATH = path.join(DATA_DIR, 'akyo-data-ja.csv');

// --- Definitions ---

const MAJOR_ANIMALS = [
  'ねこ', 'いぬ', 'きつね', 'うさぎ', 'たぬき', 'おおかみ', 'くま', 'とり', 
  'へび', 'かめ', 'ぞう', 'きりん', 'キリン', 'しか', 'ねずみ', 'りす', 'リス', 'ペンギン', 
  'ライオン', 'とら', 'うま', 'うし', 'ぶた', 'さる', 'ハムスター', 'アルパカ',
  'ヤモリ', 'カエル', 'サメ', 'クジラ', 'イルカ', 'シャチ', 'カニ', 'イカ', 'タコ',
  'クラゲ', '金魚', '鯉', '虫', '恐竜', 'トナカイ', 'オコジョ', 'ハリネズミ', 'ひよこ',
  'ひつじ', 'ハスキー', 'あざらし', 'カンガルー', 'すずめ', '白鳥', 'かたつむり',
  'ヤンバルクイナ', 'いのしし'
];

const MARINE_LIFE = [
  '魚', 'サメ', 'クジラ', 'イルカ', 'シャチ', 'エイ', 'マンボウ', '金魚', '鯉', 
  '熱帯魚', '深海魚', '魚類', 'カニ', 'イカ', 'タコ', 'クラゲ', 'ウミウシ', 
  'クリオネ', 'アザラシ', 'オットセイ', 'ジュゴン', 'マナティ', 'ペンギン', 
  'カメ', 'サカバンバスピス', 'サカバン', 'あざらし', 'いか', 'くじら', 'かに', 'アマゴ'
];

const FOOD_KEYWORDS = {
  '野菜': ['野菜', 'だいこん', 'にんじん', 'キャベツ', '白菜', 'ナス', 'トマト', 'きゅうり', 'ねぎ', 'とうもろこし', 'とうがらし', 'じゃがいも', 'さつまいも', 'かぼちゃ', 'ブロッコリー', 'アスパラ', '豆', '枝豆', 'そら豆', 'ピーマン', 'パプリカ', 'レタス', 'ほうれん草', '小松菜', 'ごぼう', 'れんこん', 'たけのこ', 'きのこ', 'しいたけ', 'えのき', 'まいたけ', 'エリンギ', 'マッシュルーム', 'トリュフ', '松茸', 'わさび', 'しょうが', 'にんにく'],
  'フルーツ': ['フルーツ', '果物', 'みかん', 'りんご', 'バナナ', 'ばなな', 'メロン', 'スイカ', '桃', 'ぶどう', 'レモン', 'イチゴ', 'いちご', 'さくらんぼ', '梨', '柿', '栗', 'パイナップル', 'マンゴー', 'キウイ', 'キーウイ', 'パイン', 'ゆず', 'ライム', 'オレンジ', 'グレープフルーツ'],
  'スイーツ': ['スイーツ', 'お菓子', 'ケーキ', 'プリン', 'アイス', 'チョコ', 'クッキー', 'ドーナツ', 'マカロン', 'パフェ', 'クレープ', '和菓子', '団子', '大福', 'まんじゅう', '羊羹', 'カステラ', 'たい焼き', 'どら焼き', 'せんべい', 'あめ', 'キャンディ', 'ガム', 'グミ', 'ラムネ', 'マシュマロ', 'ゼリー', 'ホットケーキ', 'パンケーキ', 'ワッフル', 'タルト', 'シュークリーム', 'エクレア', 'モンブラン', 'ティラミス', 'チーズケーキ', 'ショートケーキ', 'チョコレートケーキ', 'アップルパイ', 'メロンパン', 'あんぱん', 'クリームパン', 'ジャムパン', 'チョココロネ', 'かき氷', 'おしるこ', 'ぜんざい', 'もち', '白玉', 'わらびもち', '水まんじゅう', 'ポップコーン', 'ポテトチップス', 'すあま', 'ようかん', 'だんご', 'コロネ', 'ポンデ'],
  '料理': ['料理', 'ご飯', 'パン', '麺', '丼', '寿司', 'カレー', 'ラーメン', 'うどん', 'そば', 'パスタ', 'ピザ', 'ハンバーガー', 'ホットドッグ', 'サンドイッチ', 'おにぎり', '弁当', '定食', 'ランチ', 'ディナー', 'ステーキ', 'ハンバーグ', '焼肉', '焼き鳥', '唐揚げ', '天ぷら', 'フライ', 'カツ', 'コロッケ', 'グラタン', 'シチュー', 'スープ', '味噌汁', '鍋', 'おでん', 'すき焼き', 'しゃぶしゃぶ', 'オムライス', 'チャーハン', 'ピラフ', 'リゾット', 'ドリア', 'グラタン', 'ラザニア', '餃子', '焼売', '春巻き', '肉まん', 'たこ焼き', 'お好み焼き', '焼きそば', '天むす', 'うな重', 'みそしる', '赤飯', 'とろろ', 'お子様ランチ', '食パン', '焼きAkyo', 'ぼんじり', 'すし', 'ちくわ', 'バーガー', '焼き芋', 'いなり', 'やき', '揚げ', 'ポテト', '納豆', 'うな丼'],
  '調味料': ['調味料', '醤油', '味噌', '塩', '砂糖', '胡椒', '酢', '油', 'ソース', 'マヨネーズ', 'ケチャップ', 'ドレッシング', 'スパイス', 'ハーブ', 'バター', 'ジャム', 'はちみつ', 'マヨ', 'わさび'],
  '飲み物': ['飲み物', 'のみもの', 'ドリンク', 'ジュース', 'お茶', 'コーヒー', '紅茶', '酒', 'ビール', 'ワイン', '日本酒', '水', '牛乳', '緑茶', 'タピオカ', 'メロンソーダ']
};

const FICTIONAL_KEYWORDS = {
  'りゅう・ドラゴン': ['りゅう', 'ドラゴン', '竜', '龍', 'ワイバーン', 'ドレイク'],
  '妖怪・おばけ': ['妖怪', 'おばけ', '幽霊', 'ゴースト', 'カラス天狗', '天狗', '河童', 'かっぱ', '鬼', 'おに', '座敷童子', '雪女', 'ろくろ首', '一つ目小僧', '唐傘お化け', '提灯お化け', 'ぬりかべ', '一反木綿', '化け猫', '猫又', '九尾の狐', 'キョンシー', 'ゾンビ', 'ミイラ', '吸血鬼', 'ドラキュラ', '狼男', 'フランケンシュタイン', 'フランケン', '魔女', '魔法使い', '死神', '悪魔', '天使', '堕天使', 'サキュバス', 'サキュ', 'インキュバス', '精霊', '妖精', 'エルフ', 'ドワーフ', 'オーク', 'ゴブリン', 'スライム', 'ミミック', 'ゴーレム', 'ガーゴイル', 'ケルベロス', 'ペガサス', 'ユニコーン', 'フェニックス', 'グリフォン', 'キメラ', 'ヒドラ', 'クラーケン', 'リヴァイアサン', 'バハムート', 'ティアマト', 'シヴァ', 'イフリート', 'ラムウ', 'オーディン', 'ゼウス', 'ポセイドン', 'ハデス', 'アヌビス', 'バステト', 'ホルス', 'ラー', 'メジェド', 'スフィンクス', 'among', 'オラフ'],
  '幻獣・精霊': ['幻獣', '精霊', '妖精', 'ペガサス', 'ユニコーン', 'フェニックス', 'グリフォン', 'キメラ', 'ケルベロス', 'アキョベロス', 'サラマンダー', 'ウンディーネ', 'シルフ', 'ノーム']
};

const MATERIAL_KEYWORDS = {
  '石': ['石', '岩', '鉱石', '宝石', 'クリスタル', 'ダイヤモンド', 'ルビー', 'サファイア', 'エメラルド', 'アメジスト', '翡翠', '瑪瑙', '水晶', 'ガラス', 'ステンドグラス', '回折格子'],
  '金属': ['金属', '鉄', '銅', '銀', '金', 'プラチナ', 'アルミ', 'ステンレス', '真鍮', '青銅', '錆'],
  'その他': ['ボクセル', '木', '紙', 'ペーパー', '布', '革', 'プラスチック', 'ゴム', '粘土', '陶器', '磁器', 'ふわふわ', 'ふかふか', 'モサモサ']
};

const APPLIANCE_KEYWORDS = ['家電', '家具', 'でんきゅう', '電球', '冷蔵庫', '洗濯機', 'テレビ', 'パソコン', 'スマホ', '電話', '時計', 'カメラ', '扇風機', 'エアコン', 'ストーブ', 'ヒーター', 'こたつ', '椅子', '机', 'テーブル', 'ソファ', 'ベッド', 'タンス', '棚', '本棚', 'ドア', '窓', 'カーテン', 'カーペット', 'ラグ', 'マット', 'クッション', '枕', '布団', '毛布', 'タオル', 'ハンカチ', 'ティッシュ', 'トイレットペーパー', 'ゴミ箱', '掃除機', 'アイロン', 'ドライヤー', 'ミシン', 'はさみ', 'カッター', '定規', '鉛筆', 'ペン', 'ノート', '手帳', 'カレンダー', 'ポスター', '絵画', '写真', '鏡', '傘', '杖', '鞄', 'バッグ', '財布', '鍵', 'イス', 'だるま', '赤べこ', 'メガネ', 'ちょうちん'];

const PLANT_KEYWORDS = ['植物', '花', '草', '木', '葉', '種', '芽', '根', '茎', '実', '桜', 'さくら', '梅', '桃', '松', '竹', '朝顔', 'ひまわり', 'チューリップ', 'バラ', 'ユリ', 'アジサイ', 'あじさい', 'コスモス', 'タンポポ', 'たんぽぽ', 'クローバー', 'サボテン', '多肉植物', '観葉植物', '盆栽', '野菜', 'フルーツ', 'はっぱ', 'ヤシ', 'まつのき', 'ツリー'];

const OCCUPATION_KEYWORDS = ['職業', '衣装', '制服', 'スーツ', 'ドレス', '着物', '浴衣', 'ゆかた', '袴', '法被', '水着', 'パジャマ', 'ナース', '医者', '警察', '消防', '駅員', 'パイロット', 'キャビンアテンダント', 'メイド', '執事', 'ウェイトレス', 'シェフ', 'コック', 'パティシエ', 'アイドル', '歌手', 'ダンサー', '踊り子', 'モデル', '俳優', '声優', '画家', '作家', '漫画家', 'エンジニア', 'プログラマー', '学生', '先生', '博士', '探偵', '忍者', 'にんじゃ', '侍', '武士', '騎士', '魔法使い', '僧侶', '神主', '巫女', 'シスター', 'サンタ', '海賊', 'かいぞく', '宇宙飛行士', 'スポーツ選手', '野球', 'サッカー', 'テニス', 'バスケ', 'バレー', '水泳', '陸上', '柔道', '剣道', '弓道', '相撲', 'りきし', 'ボクシング', 'プロレス', '郵便', 'インディアン', 'バニー', 'あしがる', '歩兵', 'せんすい', 'との', 'おじ', '農家', 'おそうじ', 'グッチ', 'じょん', 'ポンチョ', 'アロハ', 'マフラー', 'キッズ', '新郎', '嫁入り', 'つり', 'ハンター', 'ストレッチ'];

const SEASON_KEYWORDS = ['季節', '行事', '春', '夏', 'なつ', '秋', '冬', '正月', '節分', 'ひな祭り', '花見', 'こどもの日', '七夕', 'お盆', 'ハロウィン', 'クリスマス', '大晦日', 'バレンタイン', 'ホワイトデー', '卒業', '入学', '夏休み', '冬休み', '春休み', 'ゴールデンウィーク', 'シルバーウィーク', 'お祭り', '花火', '海水浴', '紅葉', '雪', 'こいのぼり', 'ししまい', '収穫祭', 'トロピカル', 'ふぉーる', 'てるてる'];

const ELECTRONIC_KEYWORDS = ['電子', 'サイバー', 'さいばー', 'デジタル', 'テクノ', 'ロボット', 'アンドロイド', 'メカ', '機械', 'AI', 'VR', 'AR', 'MR', 'メタバース', 'インターネット', 'ウェブ', 'プログラム', 'コード', 'バグ', 'グリッチ', 'ピクセル', 'ドット', 'バッテリー', 'ν', 'J2m3', 'virtual', 'ローダー'];

const MUSIC_KEYWORDS = ['音楽', '楽器', '歌', 'ピアノ', 'ギター', 'ベース', 'ドラム', 'バイオリン', 'フルート', 'トランペット', 'サックス', 'マイク', 'スピーカー', 'ヘッドホン', 'イヤホン', 'レコード', 'CD', 'カセット', 'ラジオ', 'DJ', 'バンド', 'オーケストラ', 'ライブ', 'コンサート', '音符', 'メロディ', 'リズム', 'ハーモニー', 'テルミン', 'おんがく'];

const TOOL_KEYWORDS = ['道具', '文房具', '工具', 'キッチン用品', '掃除用具', '消しゴム', '黒板消し', 'シャンプー', '筆', '鉛筆', 'Lpack'];

const BATH_KEYWORDS = ['お風呂', '温泉', 'サウナ', 'サウ', '銭湯', 'シャンプー', '石鹸', 'ボディソープ', 'タオル', '桶', 'アヒル'];

const SCHOOL_KEYWORDS = ['学校', '教室', '黒板', '黒板消し', '机', '椅子', 'ランドセル', '教科書', 'ノート', '鉛筆', '消しゴム', '制服', '給食', 'テスト', '宿題'];

const NATURE_KEYWORDS = ['自然', '山', '川', '海', '空', '雲', '雨', '雪', '風', '雷', '虹', '太陽', '月', '星', '宇宙', '地球', '森', '林', '草原', '砂漠', '氷河', '火山', '富士山', 'ひなた', 'エゾ'];

const HISTORY_KEYWORDS = ['歴史', '古代', '中世', '近世', '近代', '現代', '未来', '遺跡', '古墳', 'はにわ', '土偶', '城', '寺', '神社', '仏像', '刀', '鎧', '兜', '着物', '侍', '忍者', '武士', '将軍', '殿', '姫', '王', 'キング', '女王', '皇帝', '貴族', '農民', '町人', 'だるま', '赤べこ', 'それん', 'ベニス', 'エジプト', '地蔵'];

const BODY_KEYWORDS = ['体型', 'デブ', 'マッチョ', '筋肉', '痩せ', 'ガリ', '長身', '低身長', '巨乳', '貧乳', 'ぽっちゃり', 'はーふ'];

const ART_KEYWORDS = ['芸術', 'アート', '絵画', '彫刻', '写真', 'デザイン', 'イラスト', 'マンガ', 'アニメ', '映画', '演劇', 'ダンス', '音楽', '文学', '詩', '小説', 'リアル'];


function processCategories(categoryStr, nickname) {
  if (!categoryStr) categoryStr = '';
  let categories = categoryStr.replace(/、/g, ',').split(',').map(c => c.trim()).filter(c => c);

  // --- 1. Pre-processing & Merging ---
  
  // Merge Gimmick/Special
  categories = categories.map(c => (c === 'ギミック' || c === '特殊') ? 'ギミック・特殊' : c);
  
  // Merge Material
  categories = categories.map(c => (c === '素材') ? '素材・材質' : c);

  // Merge Fictional
  categories = categories.map(c => (c === '架空' || c === '妖怪' || c === 'りゅう' || c === 'ドラゴン') ? '架空の存在' : c);

  // Merge Art
  categories = categories.map(c => (c === '芸術' || c === 'アート') ? '芸術・アート' : c);

  // Merge Music
  categories = categories.map(c => (c === '音楽' || c === '楽器') ? '音楽・楽器' : c);

  // Rename '魚' to '動物' (will be handled in Animal logic)
  if (categories.includes('魚')) {
      categories = categories.filter(c => c !== '魚');
      categories.push('動物');
      categories.push('動物/海の生き物');
  }

  // --- 2. Keyword-based Categorization ---
  
  const addCat = (cat) => { if (!categories.includes(cat)) categories.push(cat); };

  // Food Logic
  for (const [subCat, keywords] of Object.entries(FOOD_KEYWORDS)) {
      if (keywords.some(k => nickname.includes(k) || categories.includes(k))) {
          if (subCat === '調味料') {
              addCat('調味料');
              categories = categories.filter(c => c !== 'マヨ');
          } else if (subCat === '飲み物') {
              addCat('飲み物');
          } else {
              addCat('食べ物');
              addCat(`食べ物/${subCat}`);
          }
      }
  }
  if (nickname.includes('豆腐') || nickname.includes('ギョーザ')) {
      addCat('食べ物');
      addCat('食べ物/料理');
  }
  categories = categories.map(c => {
      if (['野菜', 'スイーツ', 'フルーツ', '料理'].includes(c)) return `食べ物/${c}`;
      return c;
  });
  if (categories.some(c => c.startsWith('食べ物/'))) addCat('食べ物');

  // Mint Chocolate Exception
  if (categories.includes('チョコミント類')) {
      categories = categories.filter(c => !c.startsWith('食べ物'));
  }

  // Animal Logic
  if (MARINE_LIFE.some(k => nickname.includes(k) || categories.includes(k))) {
      addCat('動物');
      addCat('動物/海の生き物');
  }

  MAJOR_ANIMALS.forEach(animal => {
      if (nickname.includes(animal) || categories.includes(animal)) {
          addCat('動物');
          addCat(`動物/${animal}`);
      }
  });
  
  if (nickname.includes('動物') || categories.includes('動物')) {
      addCat('動物');
  }
  
  // Fictional Logic
  if (nickname.includes('カラス天狗')) {
      addCat('架空の存在');
      addCat('架空の存在/妖怪・おばけ');
  }
  if (nickname.includes('アキョベロス')) {
      addCat('架空の存在');
      addCat('架空の存在/幻獣・精霊');
  }

  for (const [subCat, keywords] of Object.entries(FICTIONAL_KEYWORDS)) {
      if (keywords.some(k => nickname.includes(k) || categories.includes(k))) {
          addCat('架空の存在');
          addCat(`架空の存在/${subCat}`);
      }
  }

  // Material Logic
  if (nickname.includes('ボクセル') || nickname.includes('アメジスト')) {
      addCat('素材・材質');
  }
  if (categories.includes('石') || nickname.includes('石')) {
      if (categories.includes('石')) {
           categories = categories.filter(c => c !== '石');
           addCat('素材・材質');
           addCat('素材・材質/石');
      }
  }
  for (const [subCat, keywords] of Object.entries(MATERIAL_KEYWORDS)) {
       if (keywords.some(k => nickname.includes(k) || categories.includes(k))) {
           addCat('素材・材質');
           if (subCat !== 'その他') addCat(`素材・材質/${subCat}`);
       }
  }

  // Special/Effects
  if (['泡', 'キラキラ', 'パーティクル', '落ちそう', '波動', 'ヒプノシス', '吸い込まれる', '消える', 'メルト', '色胞', 'めんしす', 'Hinyo'].some(k => nickname.includes(k))) {
      addCat('ギミック・特殊');
  }
  if (nickname.includes('レインボー')) {
      addCat('色');
  }

  // Appliances/Furniture
  if (APPLIANCE_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('家電・家具');
  }

  // Plant
  if (PLANT_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('植物');
  }

  // Occupation/Costume
  if (OCCUPATION_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('衣装・職業');
  }

  // Season/Event
  if (SEASON_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('季節・行事');
  }

  // Electronic
  if (ELECTRONIC_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('電子');
  }

  // Music
  if (MUSIC_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('音楽・楽器');
  }

  // Tool
  if (TOOL_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('道具');
  }

  // Bath
  if (BATH_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('お風呂');
  }

  // School
  if (SCHOOL_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('学校');
  }

  // Nature
  if (NATURE_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('自然');
  }

  // History
  if (HISTORY_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('歴史');
  }

  // Body Type
  if (BODY_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('体型');
  }

  // Art
  if (ART_KEYWORDS.some(k => nickname.includes(k))) {
      addCat('芸術・アート');
  }
  if (nickname.includes('リアル')) {
      addCat('実写');
  }

  // --- 3. Cleanup & Deduplication ---
  
  if (categories.length > 1 && categories.includes('未分類')) {
      categories = categories.filter(c => c !== '未分類');
  }
  
  categories = categories.filter(c => c);

  const result = [...new Set(categories)].join(',');
  return result || '未分類';
}

async function main() {
  console.log('Reading CSV...');
  const input = fs.readFileSync(CSV_PATH, 'utf8');
  
  const records = parse(input, {
    columns: false,
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
  });

  const header = records[0];
  const categoryIdx = header.findIndex(h => h.trim() === 'Category');
  const nicknameIdx = header.findIndex(h => h.trim() === 'Nickname');

  if (categoryIdx === -1 || nicknameIdx === -1) {
    console.error('Could not find Category or Nickname column');
    process.exit(1);
  }

  console.log('Processing records...');
  const newRecords = [header];
  let modifiedCount = 0;

  for (let i = 1; i < records.length; i++) {
    const record = records[i];
    const oldCategory = record[categoryIdx];
    const nickname = record[nicknameIdx];
    
    const newCategory = processCategories(oldCategory, nickname);
    
    if (oldCategory !== newCategory) {
      record[categoryIdx] = newCategory;
      modifiedCount++;
    }
    newRecords.push(record);
  }

  console.log(`Modified ${modifiedCount} records.`);

  console.log('Writing CSV...');
  const output = stringify(newRecords, {
    quoted: true,
  });
  
  fs.writeFileSync(CSV_PATH, output);
  console.log('Done.');
}

main();
