/**
 * Akyo自動カテゴリ付与スクリプト
 * 
 * 既存のカテゴリパターンを参考に、未分類エントリにカテゴリを付与します。
 * 日本語と英語の両方を同時に更新し、表記ゆれを防止します。
 */

const fs = require('fs');

// 日英カテゴリマッピング（既存データから抽出）
const CATEGORY_MAPPING = {
  // === 動物 ===
  '動物': 'Animal',
  'きつね': 'Fox',
  'たぬき': 'Tanuki (Raccoon Dog)',
  'おおかみ': 'Wolf',
  'うさぎ': 'Rabbit',
  'ねこ': 'Cat',
  'いぬ': 'Dog',
  'くま': 'Bear',
  'うし': 'Cow',
  'うま': 'Horse',
  'ひつじ': 'Sheep',
  'ペンギン': 'Penguin',
  'サメ': 'Shark',
  '鳥類': 'Bird',
  '魚': 'Fish',
  '虫': 'Bug',
  '恐竜': 'Dinosaur',
  'りゅう・ドラゴン': 'Loong・Dragon',
  'とら': 'Tiger',
  'ねずみ': 'Mouse',
  'トナカイ': 'Reindeer',
  'たこ': 'Octopus',
  'オコジョ': 'Stoat',
  'アルパカ': 'Alpaca',
  'パンダ': 'Panda',
  'ライオン': 'Lion',
  'キリン': 'Giraffe',
  'カエル': 'Frog',
  'ハムスター': 'Hamster',
  'リス': 'Squirrel',
  'ぞう': 'Elephant',
  'カンガルー': 'Kangaroo',
  'レッサーパンダ': 'Red Panda',
  'シャチ': 'Orca',
  'くじら': 'Whale',
  'いか': 'Squid',
  'かに': 'Crab',
  'クラゲ': 'Jellyfish',
  'あざらし': 'Seal',
  'へび': 'Snake',
  'トカゲ': 'Lizard',
  'ハリネズミ': 'Hedgehog',
  '両生類': 'Amphibian',
  'しか': 'Deer',
  'いのしし': 'Boar',
  'ひよこ': 'Chick',
  'にわとり': 'Chicken',
  'すずめ': 'Sparrow',
  '白鳥': 'Swan',
  'カラス': 'Crow',
  'ヤンバルクイナ': 'Okinawa Rail',
  'かたつむり': 'Snail',
  
  // === 食べ物 ===
  '食べ物': 'Food',
  'お肉': 'Meat',
  '野菜': 'Vegetable',
  '果実': 'Fruit',
  'お菓子': 'Sweets',
  'のみもの': 'Drink',
  '和菓子': 'Japanese Sweets',
  '料理': 'Dish',
  'パン': 'Bread',
  
  // === 季節・行事 ===
  '季節・行事': 'Season・Event',
  'ハロウィン': 'Halloween',
  'クリスマス': 'Christmas',
  '正月': 'New Year',
  '夏': 'Summer',
  '春': 'Spring',
  '秋': 'Autumn',
  '冬': 'Winter',
  'お祭り': 'Festival',
  
  // === 職業・家柄 ===
  '職業・家柄': 'Occupation・Family background',
  '仮装': 'Costume',
  '衣類・衣装': 'Cloth・Costume',
  '悪魔・淫魔': 'Devil・Saccubus',
  
  // === パロディ・版権 ===
  'パロディ': 'Parody',
  '版権/ポケモン': 'Copyright/Pokemon',
  '版権/映画': 'Copyright/Movie',
  '版権/ゲーム': 'Copyright/Game',
  '版権/メタルギアソリッド': 'Copyright/Metal Gear Solid',
  
  // === 特殊 ===
  '特殊': 'Special',
  'ギミック': 'Gimmick',
  'アート': 'Art',
  '架空': 'Fictitious',
  'おばけ': 'Ghost',
  '神話・伝説': 'Myth・Legend',
  'エジプト': 'Egypt',
  
  // === その他 ===
  '植物': 'Plant',
  '乗り物': 'Vehicle',
  '機械': 'Machine',
  '建物': 'Building',
  '武器・軍事': 'Military・Weapons',
  'ひこう': 'Flying',
};

// キーワード→カテゴリルール（優先度順）
// 複数カテゴリの場合は配列で指定
const KEYWORD_RULES = [
  // === 優先ルール（具体的なパロディ・版権を先にマッチ）===
  { keywords: ['段ボールakyo', '段ボールAkyo', 'akyo snake', 'akyo_snake', 'cardboard snake'], categories: ['パロディ', '版権/メタルギアソリッド'] },  // メタルギアソリッドのスネーク（段ボール）
  
  // === 動物（哺乳類）===
  { keywords: ['きつね', 'キツネ', '狐', 'fox'], categories: ['きつね', '動物'] },
  { keywords: ['たぬき', 'タヌキ', 'tanuki'], categories: ['たぬき', '動物'] },
  { keywords: ['おおかみ', 'オオカミ', '狼', 'wolf'], categories: ['おおかみ', '動物'] },
  { keywords: ['うさぎ', 'ウサギ', '兎', 'rabbit', 'バニー', 'bunny'], categories: ['うさぎ', '動物'] },
  { keywords: ['ねこ', 'ネコ', '猫', 'cat', 'キャット'], categories: ['ねこ', '動物'] },
  { keywords: ['いぬ', 'イヌ', '犬', 'dog', 'ハスキー', 'husky'], categories: ['いぬ', '動物'] },
  { keywords: ['くま', 'クマ', '熊', 'bear'], categories: ['くま', '動物'] },
  { keywords: ['うし', 'ウシ', '牛', 'cow', '赤べこ'], categories: ['うし', '動物'] },
  { keywords: ['うま', 'ウマ', '馬', 'horse'], categories: ['うま', '動物'] },
  { keywords: ['ひつじ', 'ヒツジ', '羊', 'sheep'], categories: ['ひつじ', '動物'] },
  { keywords: ['ぞう', 'ゾウ', '象', 'elephant'], categories: ['ぞう', '動物'] },
  { keywords: ['ペンギン', 'penguin'], categories: ['ペンギン', '動物'] },
  { keywords: ['オコジョ', 'おこじょ', 'stoat', 'ermine'], categories: ['オコジョ', '動物'] },
  { keywords: ['アルパカ', 'あるぱか', 'alpaca'], categories: ['アルパカ', '動物'] },
  { keywords: ['パンダ', 'ぱんだ', 'panda'], categories: ['パンダ', '動物'] },
  { keywords: ['レッサーパンダ', 'レッサパンダ', 'red panda'], categories: ['レッサーパンダ', '動物'] },
  { keywords: ['ライオン', 'らいおん', 'lion'], categories: ['ライオン', '動物'] },
  { keywords: ['とら', 'トラ', '虎', 'tiger'], categories: ['とら', '動物'] },
  { keywords: ['キリン', 'きりん', 'giraffe'], categories: ['キリン', '動物'] },
  { keywords: ['カンガルー', 'かんがるー', 'kangaroo'], categories: ['カンガルー', '動物'] },
  { keywords: ['カエル', 'かえる', '蛙', 'frog'], categories: ['カエル', '動物', '両生類'] },
  { keywords: ['ハムスター', 'はむすたー', 'hamster'], categories: ['ハムスター', '動物'] },
  { keywords: ['リス', 'りす', 'squirrel'], categories: ['リス', '動物'] },
  { keywords: ['ハリネズミ', 'はりねずみ', 'hedgehog'], categories: ['ハリネズミ', '動物'] },
  { keywords: ['ねずみ', 'ネズミ', 'rat', 'mouse'], categories: ['ねずみ', '動物'] },
  { keywords: ['しか', 'シカ', '鹿', 'deer'], categories: ['しか', '動物'] },
  { keywords: ['いのしし', 'イノシシ', '猪', 'boar'], categories: ['いのしし', '動物'] },
  { keywords: ['あざらし', 'アザラシ', 'seal'], categories: ['あざらし', '動物', '魚'] },
  
  // === 動物（鳥類）===
  { keywords: ['ひよこ', 'ヒヨコ', 'chick'], categories: ['ひよこ', '動物', '鳥類'] },
  { keywords: ['にわとり', 'ニワトリ', '鶏', 'chicken'], categories: ['にわとり', '動物', '鳥類'] },
  { keywords: ['すずめ', 'スズメ', '雀', 'sparrow'], categories: ['すずめ', '動物', '鳥類'] },
  { keywords: ['はくちょう', '白鳥', 'swan'], categories: ['白鳥', '動物', '鳥類'] },
  { keywords: ['ヤンバルクイナ'], categories: ['ヤンバルクイナ', '動物', '鳥類'] },
  { keywords: ['トナカイ', 'とないかい', 'reindeer'], categories: ['トナカイ', '動物'] },
  
  // === 動物（海洋生物）===
  { keywords: ['サメ', 'さめ', '鮫', 'shark'], categories: ['サメ', '動物', '魚'] },
  { keywords: ['シャチ', 'しゃち', 'orca'], categories: ['シャチ', '動物', '魚'] },
  { keywords: ['くじら', 'クジラ', '鯨', 'whale'], categories: ['くじら', '動物', '魚'] },
  { keywords: ['いか', 'イカ', '烏賊', 'squid'], categories: ['いか', '動物', '魚'] },
  { keywords: ['たこ', 'タコ', '蛸', 'takosan'], categories: ['たこ', '動物', '魚'] },
  { keywords: ['かに', 'カニ', '蟹', 'crab'], categories: ['かに', '動物', '魚'] },
  { keywords: ['クラゲ', 'くらげ', '海月', 'jellyfish'], categories: ['クラゲ', '動物', '魚'] },
  { keywords: ['アマゴ', 'あまご'], categories: ['魚', '動物'] },
  { keywords: ['カツオ', 'かつお', '鰹'], categories: ['魚', '動物'] },
  { keywords: ['マンボー', 'まんぼー', 'manbou'], categories: ['魚', '動物'] },
  { keywords: ['チンアナゴ', 'ちんあなご'], categories: ['魚', '動物'] },
  { keywords: ['こいのぼり'], categories: ['魚', '季節・行事'] },
  
  // === 動物（爬虫類・両生類）===
  { keywords: ['へび', 'ヘビ', '蛇', 'hebi'], categories: ['へび', '動物'] },  // 'snake'はメタルギアと衝突するため除外
  { keywords: ['トカゲモドキ', 'トカゲ', 'レオパ', 'gecko', 'lizard'], categories: ['トカゲ', '動物'] },
  { keywords: ['サラマンダー', 'さらまんだー', 'salamander', 'うぱ', 'ウーパールーパー'], categories: ['両生類', '動物'] },
  { keywords: ['かっぱ', 'カッパ', '河童', 'kappa'], categories: ['両生類', '動物', '神話・伝説'] },
  
  // === 動物（虫）===
  { keywords: ['はち', 'ハチ', '蜂', 'bee'], categories: ['虫', '動物'] },
  { keywords: ['蝶', 'ちょう', 'butterfly'], categories: ['虫', '動物'] },
  { keywords: ['かたつむり', 'カタツムリ', 'snail'], categories: ['かたつむり', '動物'] },
  
  // === ドラゴン・架空 ===
  { keywords: ['どらごん', 'ドラゴン', 'dragon', 'りゅう', '竜', '龍'], categories: ['りゅう・ドラゴン', '架空', 'ひこう'] },
  { keywords: ['ケルベロス', 'アキョベロス', 'cerberus'], categories: ['架空', '神話・伝説'] },
  { keywords: ['天使', 'angel', 'てんし'], categories: ['架空', '神話・伝説'] },
  { keywords: ['アヌビス', 'anubis'], categories: ['架空', '神話・伝説', 'エジプト'] },
  { keywords: ['メジェド', 'medjed'], categories: ['架空', '神話・伝説', 'エジプト'] },
  { keywords: ['ファラオ', 'エジプト', 'egypt'], categories: ['エジプト', '神話・伝説'] },
  { keywords: ['天狗', 'てんぐ'], categories: ['架空', '神話・伝説'] },
  
  // === 食べ物（野菜）===
  { keywords: ['だいこん', 'ダイコン', '大根', 'radish'], categories: ['野菜', '食べ物'] },
  { keywords: ['にんじん', 'ニンジン', '人参', 'carrot'], categories: ['野菜', '食べ物'] },
  { keywords: ['トマト', 'とまと', 'tomato'], categories: ['野菜', '食べ物'] },
  { keywords: ['キャベツ', 'きゃべつ', 'cabbage'], categories: ['野菜', '食べ物'] },
  { keywords: ['ナス', 'なす', '茄子', 'eggplant'], categories: ['野菜', '食べ物'] },
  { keywords: ['白菜', 'hakusai', 'はくさい'], categories: ['野菜', '食べ物'] },
  { keywords: ['たけのこ', 'タケノコ', '竹の子', 'bamboo'], categories: ['野菜', '食べ物'] },
  { keywords: ['じゃがいも', 'ジャガイモ', 'potato'], categories: ['野菜', '食べ物'] },
  { keywords: ['さつまいも', 'サツマイモ', '薩摩芋', 'sweet potato'], categories: ['野菜', '食べ物'] },
  { keywords: ['ブロッコリー', 'broccoli'], categories: ['野菜', '食べ物'] },
  { keywords: ['とうもろこし', 'コーン', 'corn'], categories: ['野菜', '食べ物'] },
  { keywords: ['ねぎ', 'ネギ', '葱', 'green onion'], categories: ['野菜', '食べ物'] },
  { keywords: ['とうがらし', 'トウガラシ', '唐辛子', 'chili'], categories: ['野菜', '食べ物'] },
  
  // === 食べ物（果物）===
  { keywords: ['りんご', 'リンゴ', '林檎', 'apple'], categories: ['果実', '食べ物'] },
  { keywords: ['みかん', 'ミカン', '蜜柑', 'mikan', 'orange'], categories: ['果実', '食べ物'] },
  { keywords: ['ばなな', 'バナナ', 'banana'], categories: ['果実', '食べ物'] },
  { keywords: ['メロン', 'めろん', 'melon'], categories: ['果実', '食べ物'] },
  { keywords: ['スイカ', 'すいか', '西瓜', 'watermelon'], categories: ['果実', '食べ物'] },
  { keywords: ['柿', 'かき', 'persimmon'], categories: ['果実', '食べ物'] },
  { keywords: ['パイン', 'パイナップル', 'pineapple'], categories: ['果実', '食べ物'] },
  { keywords: ['ココナッツ', 'coconut'], categories: ['果実', '食べ物'] },
  { keywords: ['キーウイ', 'キウイ', 'kiwi'], categories: ['果実', '食べ物'] },
  
  // === 食べ物（和菓子・お菓子）===
  { keywords: ['プリン', 'ぷりん', 'pudding'], categories: ['お菓子', '食べ物'] },
  { keywords: ['ケーキ', 'けーき', 'cake'], categories: ['お菓子', '食べ物'] },
  { keywords: ['だんご', 'ダンゴ', '団子', 'dango'], categories: ['和菓子', 'お菓子', '食べ物'] },
  { keywords: ['もち', 'モチ', '餅', 'mochi', 'かがみもち'], categories: ['和菓子', '食べ物'] },
  { keywords: ['わらびもち', 'わらび餅'], categories: ['和菓子', 'お菓子', '食べ物'] },
  { keywords: ['ようかん', '羊羹', 'yokan'], categories: ['和菓子', 'お菓子', '食べ物'] },
  { keywords: ['カステラ', 'かすてら', 'castella'], categories: ['和菓子', 'お菓子', '食べ物'] },
  { keywords: ['すあま', 'スアマ', 'suama'], categories: ['和菓子', 'お菓子', '食べ物'] },
  { keywords: ['おしるこ', 'お汁粉', 'oshiruko'], categories: ['和菓子', 'のみもの', '食べ物'] },
  { keywords: ['かしわもち', '柏餅'], categories: ['和菓子', '食べ物', '季節・行事'] },
  { keywords: ['水まんじゅう', 'みずまんじゅう'], categories: ['和菓子', 'お菓子', '食べ物'] },
  { keywords: ['赤飯', 'せきはん', 'sekihan'], categories: ['和菓子', '食べ物'] },
  { keywords: ['いなり', 'いなりずし', '稲荷'], categories: ['食べ物', '料理'] },
  
  // === 食べ物（洋菓子・パン）===
  { keywords: ['ホットケーキ', 'hotcake', 'パンケーキ'], categories: ['お菓子', '食べ物'] },
  { keywords: ['コロネ', 'ころね', 'corone'], categories: ['パン', 'お菓子', '食べ物'] },
  { keywords: ['メロンパン', 'melonpan'], categories: ['パン', '食べ物'] },
  { keywords: ['食パン', 'トースト', 'toast', 'to-st'], categories: ['パン', '食べ物'] },
  { keywords: ['ポンデ', 'ドーナツ', 'donut'], categories: ['お菓子', '食べ物'] },
  { keywords: ['チョコ', 'chocolate', 'choco'], categories: ['お菓子', '食べ物'] },
  { keywords: ['モンブラン', 'montblanc'], categories: ['お菓子', '食べ物'] },
  { keywords: ['アイス', 'ice', 'アイスクリーム'], categories: ['お菓子', '食べ物'] },
  { keywords: ['白玉', 'しらたま', 'shiratama'], categories: ['和菓子', 'お菓子', '食べ物'] },
  { keywords: ['りんごあめ', 'りんご飴'], categories: ['お菓子', '食べ物', '季節・行事'] },
  
  // === 食べ物（料理）===
  { keywords: ['バーガー', 'ハンバーガー', 'burger'], categories: ['食べ物', '料理'] },
  { keywords: ['ホットドッグ', 'hotdog'], categories: ['食べ物', '料理'] },
  { keywords: ['ピザ', 'pizza'], categories: ['食べ物', '料理'] },
  { keywords: ['ラーメン', 'ramen'], categories: ['食べ物', '料理'] },
  { keywords: ['オムライス', 'omelet rice', 'omurice'], categories: ['食べ物', '料理'] },
  { keywords: ['カレー', 'curry'], categories: ['食べ物', '料理'] },
  { keywords: ['すし', 'スシ', '寿司', 'sushi'], categories: ['食べ物', '料理'] },
  { keywords: ['うな重', 'うなぎ', 'eel'], categories: ['食べ物', '料理'] },
  { keywords: ['ギョーザ', '餃子', 'gyoza'], categories: ['食べ物', '料理'] },
  { keywords: ['そば', 'たぬきそば', 'soba'], categories: ['食べ物', '料理'] },
  { keywords: ['天むす', 'tenmusu'], categories: ['食べ物', '料理'] },
  { keywords: ['フライ', 'fried', 'フライドポテト'], categories: ['食べ物', '料理'] },
  { keywords: ['お子様ランチ'], categories: ['食べ物', '料理'] },
  { keywords: ['ぼんじり', '焼鳥'], categories: ['お肉', '食べ物'] },
  { keywords: ['焼き', 'やき', 'yaki', 'ロースト', 'roast'], categories: ['お肉', '食べ物'] },
  { keywords: ['肉', 'meat'], categories: ['お肉', '食べ物'] },
  { keywords: ['ちくわ', 'チクワ', '竹輪'], categories: ['食べ物'] },
  { keywords: ['とろろ', 'tororo'], categories: ['食べ物'] },
  { keywords: ['納豆', 'なっとう', 'natto'], categories: ['食べ物'] },
  { keywords: ['豆腐', 'とうふ', 'tofu'], categories: ['食べ物'] },
  { keywords: ['みそしる', '味噌汁', 'miso'], categories: ['食べ物', '料理'] },
  { keywords: ['こんにゃく', 'konjac'], categories: ['食べ物'] },
  { keywords: ['わさび', 'wasabi'], categories: ['食べ物'] },
  { keywords: ['マヨ', 'mayo', 'マヨネーズ'], categories: ['食べ物'] },
  
  // === のみもの ===
  { keywords: ['コーヒー', 'coffee'], categories: ['のみもの', '食べ物'] },
  { keywords: ['緑茶', 'お茶', 'tea'], categories: ['のみもの', '食べ物'] },
  { keywords: ['ラムネ', 'ramune'], categories: ['のみもの', '食べ物'] },
  { keywords: ['メロンソーダ', 'melon soda'], categories: ['のみもの', '食べ物'] },
  { keywords: ['タピオカ', 'tapioca'], categories: ['のみもの', '食べ物'] },
  { keywords: ['かき氷', 'kakigori', 'shaved ice'], categories: ['のみもの', '食べ物', '夏'] },
  
  // === 植物 ===
  { keywords: ['草', 'くさ', 'kusa', 'grass'], categories: ['植物'] },
  { keywords: ['たんぽぽ', 'タンポポ', 'dandelion'], categories: ['植物'] },
  { keywords: ['朝顔', 'あさがお', 'morning glory'], categories: ['植物', '夏'] },
  { keywords: ['ひまわり', 'ヒマワリ', '向日葵', 'sunflower'], categories: ['植物', '夏'] },
  { keywords: ['あじさい', 'アジサイ', '紫陽花', 'hydrangea'], categories: ['植物'] },
  { keywords: ['さくら', 'サクラ', '桜', 'sakura', 'cherry'], categories: ['植物', '春'] },
  { keywords: ['サボテン', 'さぼてん', 'cactus'], categories: ['植物'] },
  { keywords: ['苔', 'こけ', 'moss'], categories: ['植物'] },
  { keywords: ['ヤシ', 'やし', 'palm'], categories: ['植物'] },
  { keywords: ['まつ', 'マツ', '松', 'pine'], categories: ['植物'] },
  { keywords: ['はっぱ', '葉っぱ', 'leaf'], categories: ['植物'] },
  { keywords: ['しいたけ', 'シイタケ', '椎茸', 'mushroom'], categories: ['植物', '食べ物'] },
  
  // === 季節・行事 ===
  { keywords: ['ハロウィン', 'halloween'], categories: ['ハロウィン', '季節・行事'] },
  { keywords: ['クリスマス', 'christmas', 'サンタ', 'ツリー'], categories: ['クリスマス', '季節・行事'] },
  { keywords: ['正月', 'しょうがつ', 'new year'], categories: ['正月', '季節・行事'] },
  { keywords: ['お祭り', 'まつり', 'matsuri', 'festival'], categories: ['お祭り', '季節・行事'] },
  { keywords: ['ゆかた', '浴衣', 'yukata'], categories: ['夏', '季節・行事', '衣類・衣装'] },
  { keywords: ['収穫祭', 'harvest'], categories: ['秋', '季節・行事'] },
  { keywords: ['ししまい', '獅子舞', 'lion dance'], categories: ['正月', '季節・行事'] },
  { keywords: ['だるま', 'ダルマ', '達磨', 'daruma'], categories: ['正月', '季節・行事'] },
  { keywords: ['嫁入り', '婿'], categories: ['季節・行事'] },
  { keywords: ['こたつ', 'kotatsu'], categories: ['冬', '季節・行事'] },
  
  // === 職業・家柄 ===
  { keywords: ['ナース', 'nurse', '看護'], categories: ['職業・家柄'] },
  { keywords: ['シスター', 'sister', '修道女'], categories: ['職業・家柄', '仮装'] },
  { keywords: ['郵便', 'ゆうびん', 'mail'], categories: ['職業・家柄'] },
  { keywords: ['警察', 'けいさつ', 'police'], categories: ['職業・家柄'] },
  { keywords: ['消防', 'しょうぼう', 'fire fighter'], categories: ['職業・家柄'] },
  { keywords: ['コック', 'cook', 'chef'], categories: ['職業・家柄'] },
  { keywords: ['にんじゃ', 'ニンジャ', '忍者', 'ninja'], categories: ['職業・家柄', '仮装'] },
  { keywords: ['あしがる', '足軽', 'ashigaru'], categories: ['職業・家柄', '武器・軍事'] },
  { keywords: ['さむらい', 'サムライ', '侍', 'samurai'], categories: ['職業・家柄', '武器・軍事'] },
  { keywords: ['歩兵', 'ほへい', 'infantry'], categories: ['職業・家柄', '武器・軍事'] },
  { keywords: ['かいぞく', '海賊', 'pirate'], categories: ['職業・家柄', '仮装'] },
  { keywords: ['猟師', 'りょうし', 'hunter'], categories: ['職業・家柄'] },
  { keywords: ['踊り子', 'おどりこ', 'dancer'], categories: ['職業・家柄'] },
  { keywords: ['農家', 'のうか', 'farmer'], categories: ['職業・家柄'] },
  { keywords: ['八百屋', 'やおや'], categories: ['職業・家柄'] },
  { keywords: ['酒屋', 'さかや'], categories: ['職業・家柄'] },
  { keywords: ['カフェ', 'cafe'], categories: ['職業・家柄'] },
  { keywords: ['えきいん', '駅員', 'station staff'], categories: ['職業・家柄'] },
  { keywords: ['りきし', 'リキシ', '力士', 'sumo'], categories: ['職業・家柄'] },
  { keywords: ['との', 'トノ', '殿', 'lord'], categories: ['職業・家柄'] },
  { keywords: ['キング', 'king', '王'], categories: ['職業・家柄'] },
  { keywords: ['ふりそで', '振袖'], categories: ['正月', '季節・行事', '衣類・衣装'] },
  
  // === 衣類・衣装 ===
  { keywords: ['ポンチョ', 'poncho'], categories: ['衣類・衣装'] },
  { keywords: ['タオル', 'towel'], categories: ['衣類・衣装'] },
  { keywords: ['アロハ', 'aloha'], categories: ['衣類・衣装', '夏'] },
  { keywords: ['マフラー', 'muffler', 'scarf'], categories: ['衣類・衣装', '冬'] },
  { keywords: ['メガネ', 'めがね', '眼鏡', 'glasses'], categories: ['衣類・衣装'] },
  { keywords: ['着ぐるみ', 'きぐるみ', 'costume'], categories: ['衣類・衣装', '仮装'] },
  { keywords: ['インディアン'], categories: ['仮装', '衣類・衣装'] },
  { keywords: ['サキュ', 'succubus'], categories: ['仮装', '架空'] },
  
  // === 特殊・ギミック ===
  { keywords: ['グリッチ', 'glitch'], categories: ['特殊', 'ギミック'] },
  { keywords: ['ボクセル', 'boxel', 'voxel'], categories: ['特殊', 'アート'] },
  { keywords: ['レインボー', 'rainbow', '虹'], categories: ['特殊'] },
  { keywords: ['メルト', 'melt', '溶け'], categories: ['特殊'] },
  { keywords: ['パーティクル', 'particle'], categories: ['特殊', 'ギミック'] },
  { keywords: ['消える', 'きえる', 'disappear'], categories: ['特殊', 'ギミック'] },
  { keywords: ['分身', 'ぶんしん', 'clone'], categories: ['特殊', 'ギミック'] },
  { keywords: ['ステンドグラス', 'stained glass'], categories: ['アート'] },
  { keywords: ['UV展開', 'UV'], categories: ['特殊'] },
  { keywords: ['ノイズ', 'noise'], categories: ['特殊', 'ギミック'] },
  { keywords: ['ゆがむ', '歪む', 'distortion'], categories: ['特殊', 'ギミック'] },
  { keywords: ['モザイク', 'mosaic'], categories: ['特殊', 'ギミック'] },
  { keywords: ['波動', 'はどう', 'wave'], categories: ['特殊', 'ギミック'] },
  { keywords: ['ヒプノシス', 'hypnosis', '催眠'], categories: ['特殊', 'ギミック'] },
  { keywords: ['吸い込', 'suction'], categories: ['特殊', 'ギミック'] },
  { keywords: ['キラキラ', 'sparkle', 'glitter'], categories: ['特殊'] },
  { keywords: ['回折格子'], categories: ['特殊'] },
  { keywords: ['光学迷彩'], categories: ['特殊', 'ギミック'] },
  { keywords: ['リアル', 'real'], categories: ['特殊'] },
  { keywords: ['ふわふわ', 'fluffy'], categories: ['特殊'] },
  { keywords: ['うね', 'wave'], categories: ['特殊'] },
  { keywords: ['泡', 'あわ', 'bubble'], categories: ['特殊'] },
  { keywords: ['モサモサ', 'もさもさ'], categories: ['特殊'] },
  
  // === アート ===
  { keywords: ['アメジスト', 'amethyst', '宝石'], categories: ['アート'] },
  { keywords: ['色変更', 'color'], categories: ['特殊'] },
  
  // === 乗り物・機械 ===
  { keywords: ['ローダー', 'loader', '重機'], categories: ['乗り物', '機械'] },
  { keywords: ['せんすい', '潜水', 'submarine'], categories: ['乗り物'] },
  { keywords: ['UFO', 'ufo'], categories: ['乗り物', '架空'] },
  { keywords: ['バッテリー', 'battery', '電池'], categories: ['機械'] },
  { keywords: ['でんきゅう', '電球', 'lightbulb'], categories: ['機械'] },
  
  // === 建物・物 ===
  { keywords: ['窓', 'まど', 'window'], categories: ['建物'] },
  { keywords: ['富士山', 'ふじさん', 'mt fuji'], categories: ['建物'] },
  { keywords: ['おじぞう', 'お地蔵', 'jizo'], categories: ['建物', '神話・伝説'] },
  { keywords: ['銅像', 'ブロンズ', 'statue'], categories: ['建物', 'アート'] },
  { keywords: ['はにわ', 'ハニワ', '埴輪', 'haniwa'], categories: ['アート', '神話・伝説'] },
  { keywords: ['段ボール', 'ダンボール', 'cardboard'], categories: ['特殊'] },
  { keywords: ['イス', 'いす', '椅子', 'chair'], categories: ['建物'] },
  { keywords: ['消しゴム', 'けしごむ', 'eraser'], categories: ['特殊'] },
  { keywords: ['シャンプー', 'shampoo'], categories: ['特殊'] },
  { keywords: ['黒板消し', 'こくばん'], categories: ['特殊'] },
  { keywords: ['ペーパー', 'paper', '紙'], categories: ['特殊'] },
  { keywords: ['ちょうちん', '提灯', 'lantern'], categories: ['季節・行事'] },
  { keywords: ['てるてる', 'teruteru'], categories: ['季節・行事'] },
  
  // === おばけ・神話 ===
  { keywords: ['ゆうれい', 'ゴースト', 'ghost', '幽霊', 'おばけ'], categories: ['おばけ', '架空'] },
  
  // === 音楽 ===
  { keywords: ['テルミン', 'theremin'], categories: ['機械', '特殊'] },
  { keywords: ['おんがく', '音楽', 'music'], categories: ['特殊'] },
  
  // === パロディ・版権 ===
  { keywords: ['among', 'アマング', 'アモング'], categories: ['パロディ', '版権/ゲーム'] },
  { keywords: ['サカバン', 'capybara'], categories: ['パロディ', '動物'] },
  { keywords: ['グッチ', 'gucci'], categories: ['パロディ'] },
  { keywords: ['現場ねこ', 'genba'], categories: ['パロディ', 'ねこ', '動物'] },
  { keywords: ['アーキョおじ', 'おじ'], categories: ['パロディ'] },
  { keywords: ['DDT', 'プロレス'], categories: ['パロディ'] },
  { keywords: ['メンシス', 'bloodborne'], categories: ['パロディ', '版権/ゲーム'] },
  { keywords: ['J2m3', '戦闘機'], categories: ['乗り物', '武器・軍事'] },
  
  // === トロピカル ===
  { keywords: ['トロピカル', 'tropical'], categories: ['夏', '季節・行事'] },
  { keywords: ['海辺', 'うみべ', 'seaside'], categories: ['夏', '季節・行事'] },
  { keywords: ['なつ', '夏'], categories: ['夏', '季節・行事'] },
  
  // === その他 ===
  { keywords: ['宇宙', 'うちゅう', 'space'], categories: ['特殊'] },
  { keywords: ['ベニス', 'venice'], categories: ['パロディ'] },
  { keywords: ['さいばー', 'サイバー', 'cyber'], categories: ['パロディ', '特殊'] },
  { keywords: ['ひなた', 'hinata'], categories: ['特殊'] },
  { keywords: ['デブ', 'debu', 'fat'], categories: ['特殊'] },
  { keywords: ['キッズ', 'kids', '子供'], categories: ['特殊'] },
  { keywords: ['ストレッチ', 'stretch'], categories: ['特殊'] },
  { keywords: ['つり', '釣り', 'fishing'], categories: ['特殊'] },
  
  // === 追加ルール（残り未分類対応）===
  { keywords: ['おに', 'オニ', '鬼', 'oni'], categories: ['架空', '神話・伝説'] },
  { keywords: ['落ちそう', 'otisou'], categories: ['特殊', 'ギミック'] },
  { keywords: ['はーふ', 'ハーフ', 'half'], categories: ['特殊'] },
  { keywords: ['ふぉーる', 'フォール', 'fall'], categories: ['季節・行事', '秋'] },
  { keywords: ['おそうじ', 'お掃除', 'cleaning'], categories: ['職業・家柄'] },
  { keywords: ['レターパック', 'Lpack'], categories: ['特殊'] },
  { keywords: ['エゾ', 'えぞ', 'ezo'], categories: ['動物'] },  // エゾシカ・エゾリスなど
  { keywords: ['サウ', 'sau'], categories: ['特殊'] },
  { keywords: ['ν', 'nu', 'ニュー'], categories: ['特殊'] },
  { keywords: ['bayroi', 'virtual'], categories: ['パロディ', '特殊'] },
  { keywords: ['hinyo'], categories: ['特殊'] },
  { keywords: ['それん', 'soren'], categories: ['特殊'] },
  { keywords: ['じょん', 'jon'], categories: ['特殊'] },
];

// カテゴリが見つからない場合のデフォルト
const DEFAULT_CATEGORY_JA = '未分類';
const DEFAULT_CATEGORY_EN = 'Uncategorized';

/**
 * テキストからカテゴリを推測
 */
function inferCategories(nickname, avatarName, comment) {
  const searchText = [nickname, avatarName, comment].filter(Boolean).join(' ').toLowerCase();
  
  const matchedCategories = new Set();
  let isExclusiveMatch = false;  // 排他的マッチング（優先ルール）
  
  for (const rule of KEYWORD_RULES) {
    // 既に排他的マッチが見つかっている場合はスキップ
    if (isExclusiveMatch) {
      break;
    }
    
    for (const keyword of rule.keywords) {
      if (searchText.toLowerCase().includes(keyword.toLowerCase())) {
        rule.categories.forEach(cat => matchedCategories.add(cat));
        
        // 優先ルール（配列の最初のルール）がマッチした場合は他をスキップ
        if (KEYWORD_RULES.indexOf(rule) === 0) {
          isExclusiveMatch = true;
        }
        
        break; // このルールはマッチしたので次のルールへ
      }
    }
  }
  
  return Array.from(matchedCategories);
}

/**
 * 日本語カテゴリを英語に変換
 */
function translateCategories(jaCategories) {
  return jaCategories.map(jaCat => {
    return CATEGORY_MAPPING[jaCat] || jaCat;
  });
}

// メイン処理
function main() {
  const dataJa = JSON.parse(fs.readFileSync('data/akyo-data-ja.json', 'utf-8'));
  const dataEn = JSON.parse(fs.readFileSync('data/akyo-data-en.json', 'utf-8'));
  
  let categorized = 0;
  let unchanged = 0;
  const results = [];
  
  dataJa.forEach((entry, index) => {
    // 未分類のみ処理
    if (entry.category && entry.category !== '未分類') {
      unchanged++;
      return;
    }
    
    const inferredJa = inferCategories(entry.nickname, entry.avatarName, entry.comment);
    
    if (inferredJa.length > 0) {
      const inferredEn = translateCategories(inferredJa);
      const newCategoryJa = inferredJa.join('、');
      const newCategoryEn = inferredEn.join(', ');
      
      // 更新
      dataJa[index].category = newCategoryJa;
      if (dataEn[index]) {
        dataEn[index].category = newCategoryEn;
      }
      
      categorized++;
      results.push({
        nickname: entry.nickname,
        categoryJa: newCategoryJa,
        categoryEn: newCategoryEn
      });
    }
  });
  
  // 結果を出力
  console.log('=== 自動カテゴリ付与結果 ===');
  console.log(`処理済み: ${categorized}件`);
  console.log(`変更なし（既にカテゴリあり）: ${unchanged}件`);
  console.log(`残り未分類: ${dataJa.filter(d => !d.category || d.category === '未分類').length}件`);
  console.log();
  
  // 付与されたカテゴリを表示
  if (results.length > 0) {
    console.log('=== 付与されたカテゴリ（最初の50件）===');
    results.slice(0, 50).forEach((r, i) => {
      console.log(`${i+1}. ${r.nickname}`);
      console.log(`   JA: ${r.categoryJa}`);
      console.log(`   EN: ${r.categoryEn}`);
    });
  }
  
  // ファイル保存（--dry-run オプションがない場合）
  const isDryRun = process.argv.includes('--dry-run');
  
  if (!isDryRun) {
    fs.writeFileSync('data/akyo-data-ja.json', JSON.stringify(dataJa, null, 2));
    fs.writeFileSync('data/akyo-data-en.json', JSON.stringify(dataEn, null, 2));
    console.log('\n✅ ファイルを保存しました');
  } else {
    console.log('\n⚠️ ドライランモード: ファイルは保存されていません');
    console.log('   実際に保存するには --dry-run オプションを外して実行してください');
  }
  
  // 未分類として残ったエントリを表示
  const remaining = dataJa.filter(d => !d.category || d.category === '未分類');
  if (remaining.length > 0) {
    console.log('\n=== まだ未分類のエントリ ===');
    remaining.forEach((r, i) => {
      console.log(`${i+1}. ${r.nickname} | ${r.avatarName}`);
    });
  }
}

main();
