#!/usr/bin/env node
/**
 * カテゴリ階層化スクリプト
 * 既存のフラットなカテゴリを階層構造に変換する
 */

const fs = require('fs');
const path = require('path');

// ========================================
// カテゴリ変換マッピング
// ========================================

const categoryMappingJA = {
  // 動物カテゴリ
  'きつね': '動物/きつね',
  'いぬ': '動物/いぬ',
  'うさぎ': '動物/うさぎ',
  'ねこ': '動物/ねこ',
  '魚': '動物/魚',
  '虫': '動物/虫',
  'りゅう・ドラゴン': '動物/りゅう・ドラゴン',
  '恐竜': '動物/恐竜',
  'ヤギ': '動物/ヤギ',
  'ウミウシ': '動物/ウミウシ',
  '両生類': '動物/両生類',
  'ライオン': '動物/ライオン',
  'タコ': '動物/タコ',
  'クラゲ': '動物/クラゲ',
  'カニ': '動物/カニ',
  'もぐら': '動物/もぐら',
  'アリクイ': '動物/アリクイ',
  '貝': '動物/貝',
  'タコ乳類': '動物/タコ乳類',
  // 鳥類
  '鳥': '動物/鳥',
  // 爬虫類  
  '爬虫類': '動物/爬虫類',
  
  // 食べ物カテゴリ
  '果実': '食べ物/果実',
  '野菜': '食べ物/野菜',
  'お肉': '食べ物/お肉',
  'スイーツ': '食べ物/スイーツ',
  'パン': '食べ物/パン',
  'タコス': '食べ物/タコス',
  'だいこん': '食べ物/野菜',  // 野菜に統合
  'ねぎ': '食べ物/野菜',      // 野菜に統合
  'まめ': '食べ物/まめ',
  '木の実': '食べ物/木の実',
  'どんぐり': '食べ物/木の実', // 木の実に統合
  '調味料': '食べ物/調味料',
  
  // 飲み物カテゴリ
  'のみもの': '飲み物',
  'コーヒー': '飲み物/コーヒー',
  'ラムネ': '飲み物/ラムネ',
  
  // 植物カテゴリ
  '植物': '植物',
  '菌類': '植物/菌類',
  '苔': '植物/苔',
  
  // 乗り物カテゴリ
  '乗り物': '乗り物',
  '航空': '乗り物/航空',
  
  // 素材・材質カテゴリ
  '材質': '素材',
  '生地': '素材/生地',
  '石': '素材/石',
  '柔らかい': '素材/柔らかい',
  
  // 人工物カテゴリ
  '機械': '人工物/機械',
  '家電': '人工物/家電',
  '建物': '人工物/建物',
  '武器・軍事': '人工物/武器・軍事',
  '道具': '人工物/道具',
  '楽器': '人工物/楽器',
  '像': '人工物/像',
  '鉛筆': '人工物/文房具',
  
  // 存在・キャラクタータイプ
  '妖怪': '存在/妖怪',
  'おばけ': '存在/おばけ',
  '精霊': '存在/精霊',
  '神': '存在/神',
  'モンスター': '存在/モンスター',
  'ウイルス': '存在/ウイルス',
  '架空': '存在/架空',
  
  // これらは変換しない（人間だけのものではない、または単体で成立する）
  // '人類' - そのまま
  // '職業・家柄' - そのまま
  // '髪型' - そのまま
  // '骨' - そのまま
  // '歯' - そのまま
  
  // イベント・季節
  'ハロウィン': '季節・行事/ハロウィン',
  '精霊馬': '季節・行事/お盆',
  
  // アート・スタイル
  'アート': 'スタイル/アート',
  'ローポリ': 'スタイル/ローポリ',
  '色': 'スタイル/色',
  
  // 特殊・変身
  '特殊': '特殊',
  '変身': '特殊/変身',
  '自然': '自然',
};

const categoryMappingEN = {
  // Animal categories
  'Fox': 'Animal/Fox',
  'Dog': 'Animal/Dog',
  'Rabbit': 'Animal/Rabbit',
  'Cat': 'Animal/Cat',
  'Fish': 'Animal/Fish',
  'Bug': 'Animal/Bug',
  'Loong・Dragon': 'Animal/Dragon',
  'Dinosaur': 'Animal/Dinosaur',
  'Goat': 'Animal/Goat',
  'Sea Slug': 'Animal/Sea Slug',
  'Amphibian': 'Animal/Amphibian',
  'Lion': 'Animal/Lion',
  'Octopus': 'Animal/Octopus',
  'Jellyfish': 'Animal/Jellyfish',
  'Crab': 'Animal/Crab',
  'Mole': 'Animal/Mole',
  'Anteater': 'Animal/Anteater',
  'Shell': 'Animal/Shell',
  'Octopoid Mammal': 'Animal/Octopoid Mammal',
  'Wolf': 'Animal/Wolf',
  'Bird': 'Animal/Bird',
  'Reptile': 'Animal/Reptile',
  
  // Food categories
  'Fruit': 'Food/Fruit',
  'Vegetable': 'Food/Vegetable',
  'Meat': 'Food/Meat',
  'Sweets': 'Food/Sweets',
  'Bread': 'Food/Bread',
  'Tacos': 'Food/Tacos',
  'Japanese Radish': 'Food/Vegetable',
  'Green Onion': 'Food/Vegetable',
  'Bean': 'Food/Bean',
  'Nuts': 'Food/Nuts',
  'Acorn': 'Food/Nuts',
  'Seasoning': 'Food/Seasoning',
  
  // Drink categories
  'Drink': 'Drink',
  'Coffee': 'Drink/Coffee',
  'Ramune': 'Drink/Ramune',
  
  // Plant categories
  'Plant': 'Plant',
  'Fungus': 'Plant/Fungus',
  'Moss': 'Plant/Moss',
  
  // Vehicle categories
  'Vehicle': 'Vehicle',
  'Aviation': 'Vehicle/Aviation',
  
  // Material categories
  'Material': 'Material',
  'Stone': 'Material/Stone',
  'Soft': 'Material/Soft',
  
  // Artificial object categories
  'Machine': 'Object/Machine',
  'Electronics': 'Object/Electronics',
  'Building': 'Object/Building',
  'Military・Weapons': 'Object/Military・Weapons',
  'Tool': 'Object/Tool',
  'Musical Instrument': 'Object/Musical Instrument',
  'Statue': 'Object/Statue',
  'Pencil': 'Object/Stationery',
  
  // Being/Character type
  'Yokai': 'Being/Yokai',
  'Ghost': 'Being/Ghost',
  'Spirit': 'Being/Spirit',
  'God': 'Being/God',
  'Monster': 'Being/Monster',
  'Virus': 'Being/Virus',
  'Fictitious': 'Being/Fictitious',
  
  // These are NOT converted (not exclusive to humans, or standalone categories)
  // 'Human' - keep as is
  // 'Occupation・Family background' - keep as is
  // 'Hair Style' - keep as is
  // 'Bone' - keep as is
  // 'Teeth' - keep as is
  
  // Event/Season
  'Halloween': 'Event/Halloween',
  'Spirit Horse': 'Event/Obon',
  
  // Art/Style
  'Art': 'Style/Art',
  'Low-poly': 'Style/Low-poly',
  'Color': 'Style/Color',
  
  // Special
  'Special': 'Special',
  'Transformation': 'Special/Transformation',
  'Nature': 'Nature',
};

// ========================================
// 特定IDのカテゴリ更新（未分類→新カテゴリ）
// ========================================

const specificUpdatesJA = {
  '0145': '版権/Bloodborne,パロディ',  // めんしすAkyo (メンシス学派)
};

const specificUpdatesEN = {
  '0145': 'Copyright/Bloodborne,Parody',  // めんしすAkyo
};

// ========================================
// CSV処理関数（RFC 4180準拠）
// ========================================

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされたダブルクォート
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

function escapeCSVField(value) {
  // カンマ、ダブルクォート、改行を含む場合はクォートで囲む
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function transformCategory(category, mapping) {
  // カテゴリが空または未分類の場合はそのまま
  if (!category || category === '未分類' || category === 'Uncategorized') {
    return category;
  }
  
  // 複数カテゴリをカンマで分割
  const categories = category.split(',').map(c => c.trim());
  
  const transformed = categories.map(cat => {
    // すでに階層化されている場合（/を含む）はスキップ
    if (cat.includes('/')) {
      return cat;
    }
    // マッピングに存在する場合は変換
    if (mapping[cat]) {
      return mapping[cat];
    }
    // マッピングにない場合はそのまま
    return cat;
  });
  
  // 重複を除去して結合
  const unique = [...new Set(transformed)];
  return unique.join(',');
}

function processCSV(inputPath, outputPath, categoryMapping, specificUpdates, lang) {
  console.log(`\n処理中: ${inputPath}`);
  
  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n');
  const header = lines[0];
  
  const processedLines = [header];
  let changedCount = 0;
  const changes = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const fields = parseCSVLine(line);
    if (fields.length < 7) {
      processedLines.push(line);
      continue;
    }
    
    const id = fields[0].replace(/"/g, '');
    const nickname = fields[1].replace(/"/g, '');
    const originalCategory = fields[3].replace(/"/g, '');
    
    let newCategory;
    
    // 特定IDの更新をチェック
    if (specificUpdates[id] && (originalCategory === '未分類' || originalCategory === 'Uncategorized')) {
      newCategory = specificUpdates[id];
    } else {
      newCategory = transformCategory(originalCategory, categoryMapping);
    }
    
    if (newCategory !== originalCategory) {
      changes.push({
        id,
        nickname,
        from: originalCategory,
        to: newCategory
      });
      changedCount++;
    }
    
    // フィールドを再構築（各フィールドを適切にエスケープ）
    const outputFields = fields.map((field, idx) => {
      if (idx === 3) {
        // カテゴリフィールドは新しい値を使用
        return escapeCSVField(newCategory);
      }
      // 他のフィールドはクォートを除去してから再エスケープ
      const cleanField = field.replace(/^"|"$/g, '').replace(/""/g, '"');
      return escapeCSVField(cleanField);
    });
    
    processedLines.push(outputFields.join(','));
  }
  
  // ファイルを書き出し
  fs.writeFileSync(outputPath, processedLines.join('\n'), 'utf-8');
  
  console.log(`  変更件数: ${changedCount}`);
  
  // 変更サマリーを表示
  if (changes.length > 0) {
    console.log(`\n  変更サマリー (${lang}):`);
    
    // カテゴリ変換の集計
    const summary = {};
    changes.forEach(c => {
      const key = `${c.from} → ${c.to}`;
      if (!summary[key]) summary[key] = 0;
      summary[key]++;
    });
    
    Object.entries(summary)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([change, count]) => {
        console.log(`    ${change}: ${count}件`);
      });
    
    if (Object.keys(summary).length > 20) {
      console.log(`    ... 他 ${Object.keys(summary).length - 20} 種類の変更`);
    }
  }
  
  return changes;
}

// ========================================
// メイン処理
// ========================================

function main() {
  console.log('='.repeat(60));
  console.log('カテゴリ階層化スクリプト');
  console.log('='.repeat(60));
  
  const jaInput = path.join(__dirname, '../data/akyo-data-ja.csv');
  const enInput = path.join(__dirname, '../data/akyo-data-en.csv');
  
  // 日本語CSV処理
  const jaChanges = processCSV(jaInput, jaInput, categoryMappingJA, specificUpdatesJA, 'JA');
  
  // 英語CSV処理
  const enChanges = processCSV(enInput, enInput, categoryMappingEN, specificUpdatesEN, 'EN');
  
  console.log('\n' + '='.repeat(60));
  console.log('処理完了');
  console.log(`  日本語: ${jaChanges.length} 件変更`);
  console.log(`  英語: ${enChanges.length} 件変更`);
  console.log('='.repeat(60));
  
  // 詳細な変更ログを出力
  const logPath = path.join(__dirname, '../data/category-changes.log');
  const logContent = [
    '# カテゴリ変更ログ',
    `# 生成日時: ${new Date().toISOString()}`,
    '',
    '## 日本語 (JA)',
    ...jaChanges.map(c => `${c.id}\t${c.nickname}\t${c.from}\t→\t${c.to}`),
    '',
    '## 英語 (EN)',
    ...enChanges.map(c => `${c.id}\t${c.nickname}\t${c.from}\t→\t${c.to}`),
  ].join('\n');
  
  fs.writeFileSync(logPath, logContent, 'utf-8');
  console.log(`\n変更ログ: ${logPath}`);
}

main();
