const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const definitions = require('./category-definitions-en');

const csvPath = process.argv[2] || 'data/akyo-data-en.csv';

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
const avatarNameIdx = header.findIndex(h => h.trim() === 'AvatarName');

if (categoryIdx === -1) {
  console.error('Could not find Category column');
  process.exit(1);
}
if (nicknameIdx === -1) {
  console.error('Could not find Nickname column');
  process.exit(1);
}
if (avatarNameIdx === -1) {
  console.error('Could not find AvatarName column');
  process.exit(1);
}

console.log('Processing records...');

let modifiedCount = 0;
const newRecords = [header];

for (let i = 1; i < records.length; i++) {
  const record = records[i];
  const oldCategory = record[categoryIdx] || '';
  const nickname = record[nicknameIdx] || '';
  const avatarName = record[avatarNameIdx] || '';
  
  let categories = oldCategory.replace(/、/g, ',').split(',').map(c => c.trim()).filter(c => c);
  
  // 1. Watermelon Akyo から Drink を削除（スイカは飲み物ではない）
  if (nickname.includes('Watermelon') || avatarName.includes('スイカ')) {
    categories = categories.filter(c => c !== 'Drink');
  }
  
  // 2. Material → Material & Fabric に変更
  categories = categories.map(c => {
    if (c === 'Material') return 'Material & Fabric';
    if (c.startsWith('Material/')) return c.replace('Material/', 'Material & Fabric/');
    return c;
  });
  
  // 3. Fabric → Material & Fabric に統合
  if (categories.includes('Fabric')) {
    categories = categories.filter(c => c !== 'Fabric');
    if (!categories.includes('Material & Fabric')) categories.push('Material & Fabric');
  }
  
  // 4. Clothing & Occupation → 分割（Clothing/Costume と Occupation/Family）
  // 正規の定義ファイルからキーワードを使用
  if (categories.includes('Costume & Occupation') || categories.includes('Clothing & Occupation')) {
    categories = categories.filter(c => c !== 'Costume & Occupation' && c !== 'Clothing & Occupation');
    const costumeKeywords = definitions.COSTUME_KEYWORDS;
    const occupationKeywords = definitions.OCCUPATION_KEYWORDS;
    
    const hasCostume = costumeKeywords.some(k => nickname.toLowerCase().includes(k.toLowerCase()));
    const hasOccupation = occupationKeywords.some(k => nickname.toLowerCase().includes(k.toLowerCase()));
    
    if (hasCostume) categories.push('Clothing/Costume');
    if (hasOccupation) categories.push('Occupation/Family');
    if (!hasCostume && !hasOccupation) categories.push('Occupation/Family');
  }
  
  // 5. Anubis系を Fictional Being/God に変更
  // 神話的な神のみを対象とする（単語境界チェックを含む）
  const godPatterns = [
    /\bAnubis\b/i,
    /\bBastet\b/i,
    /\bHorus\b/i,
    /\bMedjed\b/i,
    /\bZeus\b/i,
    /\bPoseidon\b/i,
    /\bHades\b/i,
    /\bOdin\b/i,
    /\bHalo\b/i
  ];
  if (godPatterns.some(pattern => pattern.test(nickname))) {
    categories = categories.filter(c => c !== 'Fictional Being/Yokai・Ghost');
    if (!categories.includes('Fictional Being')) categories.push('Fictional Being');
    if (!categories.includes('Fictional Being/God')) categories.push('Fictional Being/God');
    categories = categories.filter(c => c !== 'God');
  }
  
  // 6. Cerberus を Fictional Being/Mythical Beast・Spirit に変更
  if (nickname.includes('Cerberus') || avatarName.includes('アキョベロス') || avatarName.includes('ケルベロス')) {
    categories = categories.filter(c => c !== 'Fictional Being/Yokai・Ghost');
    if (!categories.includes('Fictional Being/Mythical Beast・Spirit')) categories.push('Fictional Being/Mythical Beast・Spirit');
  }
  
  // 7. Carbuncle を Fictional Being/Mythical Beast・Spirit に変更
  if (nickname.includes('Carbuncle') || avatarName.includes('カーバンクル')) {
    categories = categories.filter(c => c !== 'Fictional Being/Yokai・Ghost');
    if (!categories.includes('Fictional Being/Mythical Beast・Spirit')) categories.push('Fictional Being/Mythical Beast・Spirit');
  }
  
  // 8. Sea → Nature/Sea に変更
  if (categories.includes('Sea')) {
    categories = categories.filter(c => c !== 'Sea');
    if (!categories.includes('Nature')) categories.push('Nature');
    if (!categories.includes('Nature/Sea')) categories.push('Nature/Sea');
  }
  
  // 9. Mt. Fuji Akyo に Nature/Mountain を追加
  if (nickname.includes('Fuji') || avatarName.includes('富士山')) {
    if (!categories.includes('Nature')) categories.push('Nature');
    if (!categories.includes('Nature/Mountain')) categories.push('Nature/Mountain');
  }
  
  // 10. Coffee, Ramune などの重複削除
  if (categories.includes('Coffee')) {
    categories = categories.filter(c => c !== 'Coffee');
    if (!categories.includes('Drink')) categories.push('Drink');
  }
  if (categories.includes('Ramune')) {
    categories = categories.filter(c => c !== 'Ramune');
    if (!categories.includes('Drink')) categories.push('Drink');
  }
  
  // 11. Home Appliances と Furniture を統一
  if (categories.includes('Home Appliances')) {
    categories = categories.filter(c => c !== 'Home Appliances');
    if (!categories.includes('Home Appliances & Furniture')) categories.push('Home Appliances & Furniture');
  }
  if (categories.includes('Furniture')) {
    categories = categories.filter(c => c !== 'Furniture');
    if (!categories.includes('Home Appliances & Furniture')) categories.push('Home Appliances & Furniture');
  }
  
  // 12. Dragon → Fictional Being/Dragon に統合
  if (categories.includes('Dragon') || categories.includes('Dragon・Wyvern')) {
    categories = categories.filter(c => c !== 'Dragon' && c !== 'Dragon・Wyvern');
    if (!categories.includes('Fictional Being')) categories.push('Fictional Being');
    if (!categories.includes('Fictional Being/Dragon')) categories.push('Fictional Being/Dragon');
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
