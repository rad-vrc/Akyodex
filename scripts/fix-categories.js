const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const csvPath = process.argv[2] || 'data/akyo-data-ja.csv';

console.log(`Reading CSV from ${csvPath}...`);
const input = fs.readFileSync(csvPath, 'utf8');

const records = parse(input, {
  columns: false,
  relax_quotes: true,
  relax_column_count: true,
  skip_empty_lines: true,
});

const header = records[0];
const categoryIdx = header.findIndex(h => h.trim() === 'Category');
const nicknameIdx = header.findIndex(h => h.trim() === 'Nickname');

if (categoryIdx === -1) {
  console.error('Could not find Category column');
  process.exit(1);
}
if (nicknameIdx === -1) {
  console.error('Could not find Nickname column');
  process.exit(1);
}

console.log('Processing records...');

// 野菜名のリスト（食べ物/野菜/○○に変換するため）
const vegetables = [
  'だいこん', 'にんじん', 'キャベツ', '白菜', 'ナス', 'トマト', 'きゅうり', 'ねぎ', 
  'とうもろこし', 'とうがらし', 'じゃがいも', 'さつまいも', 'かぼちゃ', 'ブロッコリー', 
  'アスパラ', '豆', '枝豆', 'そら豆', 'ピーマン', 'パプリカ', 'レタス', 'ほうれん草', 
  '小松菜', 'ごぼう', 'れんこん', 'たけのこ', 'きのこ', 'しいたけ', 'えのき', 'まいたけ', 
  'エリンギ', 'マッシュルーム', 'トリュフ', '松茸', 'わさび', 'しょうが', 'にんにく'
];

let modifiedCount = 0;
const newRecords = [header];

for (let i = 1; i < records.length; i++) {
  const record = records[i];
  const oldCategory = record[categoryIdx];
  const nickname = record[nicknameIdx] || '';
  
  let categories = oldCategory.replace(/、/g, ',').split(',').map(c => c.trim()).filter(c => c);
  
  // 1. 衣装・職業 → 削除（衣類・衣装と職業・家柄に分割）
  // 踊り子は職業、グッチ/じょん/ポンチョ/アロハ/サンタ/バニー/インディアン/マフラーは衣類
  if (categories.includes('衣装・職業')) {
    categories = categories.filter(c => c !== '衣装・職業');
    // 内容に基づいて適切なカテゴリを追加
    const costumeKeywords = ['グッチ', 'じょん', 'ポンチョ', 'アロハ', 'サンタ', 'バニー', 'インディアン', 'マフラー', '水着', '制服', 'スーツ', 'ドレス', '着物', '浴衣', '袴', '法被', 'パジャマ', '衣装', 'キッズ', '新郎', '嫁入り'];
    const occupationKeywords = ['ナース', '医者', '警察', '消防', '駅員', 'パイロット', 'メイド', '執事', 'シェフ', 'コック', 'パティシエ', 'アイドル', '歌手', 'ダンサー', '踊り子', '学生', '先生', '博士', '探偵', '忍者', 'にんじゃ', '侍', '武士', '騎士', '魔法使い', '僧侶', '神主', '巫女', 'シスター', '海賊', 'かいぞく', '宇宙飛行士', '郵便', 'あしがる', '歩兵', 'せんすい', 'との', 'おじ', '農家', 'おそうじ', 'つり', 'ハンター', 'ストレッチ', 'りきし'];
    
    const hasCostume = costumeKeywords.some(k => nickname.includes(k));
    const hasOccupation = occupationKeywords.some(k => nickname.includes(k));
    
    if (hasCostume) categories.push('衣類・衣装');
    if (hasOccupation) categories.push('職業・家柄');
    // どちらにも該当しない場合、職業として扱う（デフォルト）
    if (!hasCostume && !hasOccupation) categories.push('職業・家柄');
  }
  
  // 2. 神カテゴリを追加、アヌビス系を架空の存在/神に
  const godKeywords = ['アヌビス', 'バステト', 'ホルス', 'ラー', 'メジェド', 'ゼウス', 'ポセイドン', 'ハデス', 'オーディン', '後光'];
  if (godKeywords.some(k => nickname.includes(k))) {
    categories = categories.filter(c => c !== '架空の存在/妖怪・おばけ');
    if (!categories.includes('架空の存在')) categories.push('架空の存在');
    if (!categories.includes('架空の存在/神')) categories.push('架空の存在/神');
    // 神カテゴリが追加された場合、単独の「神」カテゴリを削除
    categories = categories.filter(c => c !== '神');
  }
  
  // 3. スイカAkyoから海の生き物カテゴリを削除（スイカはフルーツであってイカではない）
  // 「スイカ」と「イカ」は別物。「スイカ」にはイカが含まれるので正規表現で判定
  if (/スイカ/.test(nickname)) {
    categories = categories.filter(c => !c.includes('海の生き物') && c !== '動物/イカ');
    // 動物カテゴリも削除（スイカはフルーツなので）
    if (categories.includes('動物')) {
      const hasOtherAnimal = categories.some(c => c.startsWith('動物/') && c !== '動物/海の生き物' && c !== '動物/イカ');
      if (!hasOtherAnimal) {
        categories = categories.filter(c => c !== '動物');
      }
    }
  }
  
  // 4. アキョベロスを幻獣に修正（妖怪を削除）
  if (nickname.includes('アキョベロス') || nickname.includes('ケルベロス')) {
    categories = categories.filter(c => c !== '架空の存在/妖怪・おばけ');
    if (!categories.includes('架空の存在/幻獣・精霊')) categories.push('架空の存在/幻獣・精霊');
  }
  
  // 5. カーバンクルを精霊に修正（妖怪を削除）
  if (nickname.includes('カーバンクル')) {
    categories = categories.filter(c => c !== '架空の存在/妖怪・おばけ');
    if (!categories.includes('架空の存在/幻獣・精霊')) categories.push('架空の存在/幻獣・精霊');
  }
  
  // 6. 海を自然/海に変更
  if (categories.includes('海')) {
    categories = categories.filter(c => c !== '海');
    if (!categories.includes('自然')) categories.push('自然');
    if (!categories.includes('自然/海')) categories.push('自然/海');
  }
  
  // 7. 富士山Akyoに自然/山を追加
  if (nickname.includes('富士山')) {
    if (!categories.includes('自然')) categories.push('自然');
    if (!categories.includes('自然/山')) categories.push('自然/山');
  }
  
  // 8. 動物/狼を動物/おおかみに統一
  if (categories.includes('動物/狼')) {
    categories = categories.filter(c => c !== '動物/狼');
    if (!categories.includes('動物/おおかみ')) categories.push('動物/おおかみ');
  }
  
  // 9. パンを食べ物/パンに変更
  if (categories.includes('パン')) {
    categories = categories.filter(c => c !== 'パン');
    if (!categories.includes('食べ物')) categories.push('食べ物');
    if (!categories.includes('食べ物/パン')) categories.push('食べ物/パン');
  }
  
  // 10. 寿司を食べ物/寿司に変更
  if (categories.includes('寿司')) {
    categories = categories.filter(c => c !== '寿司');
    if (!categories.includes('食べ物')) categories.push('食べ物');
    if (!categories.includes('食べ物/寿司')) categories.push('食べ物/寿司');
  }
  
  // 11. のみものを飲み物に統一
  if (categories.includes('のみもの')) {
    categories = categories.filter(c => c !== 'のみもの');
    if (!categories.includes('飲み物')) categories.push('飲み物');
  }
  
  // 12. 素材・材質を素材・材質・生地に変更
  categories = categories.map(c => {
    if (c === '素材・材質') return '素材・材質・生地';
    if (c.startsWith('素材・材質/')) return c.replace('素材・材質/', '素材・材質・生地/');
    return c;
  });
  
  // 13. 生地を素材・材質・生地に変更
  if (categories.includes('生地')) {
    categories = categories.filter(c => c !== '生地');
    if (!categories.includes('素材・材質・生地')) categories.push('素材・材質・生地');
  }
  
  // 14. 家電と家具の単体カテゴリを削除（家電・家具に統一）
  if (categories.includes('家電')) {
    categories = categories.filter(c => c !== '家電');
    if (!categories.includes('家電・家具')) categories.push('家電・家具');
  }
  if (categories.includes('家具')) {
    categories = categories.filter(c => c !== '家具');
    if (!categories.includes('家電・家具')) categories.push('家電・家具');
  }
  
  // 15. 野菜系を食べ物/野菜/○○に階層化
  vegetables.forEach(veg => {
    if (categories.includes(veg)) {
      categories = categories.filter(c => c !== veg);
      if (!categories.includes('食べ物')) categories.push('食べ物');
      if (!categories.includes('食べ物/野菜')) categories.push('食べ物/野菜');
      if (!categories.includes(`食べ物/野菜/${veg}`)) categories.push(`食べ物/野菜/${veg}`);
    }
  });
  
  // 16. 重複カテゴリの削除
  // 材質単体を削除（素材・材質・生地に統合済み）
  if (categories.includes('材質')) {
    categories = categories.filter(c => c !== '材質');
    if (!categories.includes('素材・材質・生地')) categories.push('素材・材質・生地');
  }
  
  // コーヒーを飲み物に統合
  if (categories.includes('コーヒー')) {
    categories = categories.filter(c => c !== 'コーヒー');
    if (!categories.includes('飲み物')) categories.push('飲み物');
  }
  
  // ラムネを飲み物に統合
  if (categories.includes('ラムネ')) {
    categories = categories.filter(c => c !== 'ラムネ');
    if (!categories.includes('飲み物')) categories.push('飲み物');
    if (!categories.includes('食べ物/スイーツ')) categories.push('食べ物/スイーツ');
  }
  
  // 果実を食べ物/フルーツに統合
  if (categories.includes('果実')) {
    categories = categories.filter(c => c !== '果実');
    if (!categories.includes('食べ物')) categories.push('食べ物');
    if (!categories.includes('食べ物/フルーツ')) categories.push('食べ物/フルーツ');
  }
  
  // おばけを架空の存在/妖怪・おばけに統合
  if (categories.includes('おばけ')) {
    categories = categories.filter(c => c !== 'おばけ');
    if (!categories.includes('架空の存在')) categories.push('架空の存在');
    if (!categories.includes('架空の存在/妖怪・おばけ')) categories.push('架空の存在/妖怪・おばけ');
  }
  
  // 精霊単体を架空の存在/幻獣・精霊に統合
  if (categories.includes('精霊') && !categories.includes('架空の存在/幻獣・精霊')) {
    categories = categories.filter(c => c !== '精霊');
    if (!categories.includes('架空の存在')) categories.push('架空の存在');
    categories.push('架空の存在/幻獣・精霊');
  }
  
  // りゅう・ドラゴンを架空の存在/りゅう・ドラゴンに統合
  if (categories.includes('りゅう・ドラゴン')) {
    categories = categories.filter(c => c !== 'りゅう・ドラゴン');
    if (!categories.includes('架空の存在')) categories.push('架空の存在');
    if (!categories.includes('架空の存在/りゅう・ドラゴン')) categories.push('架空の存在/りゅう・ドラゴン');
  }
  
  // 重複削除
  categories = [...new Set(categories)];
  
  const newCategory = categories.join(',');
  if (oldCategory !== newCategory) {
    record[categoryIdx] = newCategory;
    modifiedCount++;
    console.log(`Modified: ${nickname}: ${oldCategory} -> ${newCategory}`);
  }
  newRecords.push(record);
}

console.log(`Modified ${modifiedCount} records.`);

console.log('Writing CSV...');
const output = stringify(newRecords, {
  quoted: true,
});

fs.writeFileSync(csvPath, output);
console.log('Done.');
