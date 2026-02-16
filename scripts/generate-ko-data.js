#!/usr/bin/env node
/**
 * Generate Korean (ko) translation data from Japanese (ja) source
 *
 * Translates: nickname, category, comment
 * Keeps as-is: id, avatarName, author, avatarUrl
 *
 * Usage: node scripts/generate-ko-data.js [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { NICKNAME_MAP } = require('./nickname-map-ko');
const { CATEGORY_MAP } = require('./category-definitions-ko');

const VERBOSE = process.argv.includes('--verbose');
let untranslatedCommentCount = 0;

function loadExistingKoCommentMap(csvPath) {
  if (!fs.existsSync(csvPath)) {
    return new Map();
  }

  try {
    const csv = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: false,
      record_delimiter: ['\r\n', '\n', '\r'],
      quote: '"',
      escape: '"',
    });
    return new Map(records.map((record) => [record.ID || '', record.Comment || '']));
  } catch (error) {
    console.warn(`[WARN] Failed to read existing Korean CSV for fallback: ${csvPath}`);
    console.warn(`[WARN] ${error instanceof Error ? error.message : String(error)}`);
    return new Map();
  }
}

// ============================================================
// Category translation map: Japanese → Korean
// ============================================================

/**
 * Translate a single category string (comma-separated list)
 */
function translateCategory(jaCategory) {
  if (!jaCategory) return '';

  return jaCategory
    .split(/\s*,\s*/)
    .map((cat) => {
      const trimmed = cat.trim();
      if (CATEGORY_MAP[trimmed]) {
        return CATEGORY_MAP[trimmed];
      }
      // If no mapping found, keep original
      console.warn(`[WARN] No Korean translation for category: "${trimmed}"`);
      return trimmed;
    })
    .join(', ');
}

/**
 * Translate nickname from Japanese to Korean
 * Uses NICKNAME_MAP for exact matches, keeps original as fallback
 */
function translateNickname(jaNickname) {
  if (!jaNickname) return jaNickname;

  // Exact match from map
  if (NICKNAME_MAP[jaNickname]) {
    return NICKNAME_MAP[jaNickname];
  }

  // If no mapping found, keep original
  console.warn(`[WARN] No Korean translation for nickname: "${jaNickname}"`);
  return jaNickname;
}

/**
 * Translate comment from Japanese to Korean
 * Common patterns translation
 */
const COMMENT_MAP = {
  すべてのはじまり: '모든 것의 시작',
  Quest対応〇: 'Quest 지원〇',
  'Quest対応○': 'Quest 지원○',
  'Quest対応✕': 'Quest 지원✕',
  'Quest対応×': 'Quest 지원×',
  Quest対応: 'Quest 지원',
  'お正月衣装に着替えたうまakyo。うきうきしているらしい。':
    '설날 복장으로 갈아입은 말 Akyo. 들떠 있는 듯하다.',
  'ねぎakyoを背負った、かもakyo。どこで出会ったのだろう？':
    '파 Akyo를 업은 오리 Akyo. 어디서 만난 걸까?',
  '舞踊を極めしAkyoらしい。': '춤의 경지에 이른 Akyo라고 한다.',
  '外宇宙探査のために独自の進化を遂げたらしい。':
    '외우주 탐사를 위해 독자적인 진화를 이룬 듯하다.',
  'レアなAkyoか、それとも。': '희귀한 Akyo일까, 아니면...',
  '赤チームにいる。': '빨간 팀에 있다.',
  '青チームにいる。とても青い。': '파란 팀에 있다. 아주 파랗다.',
  'Akyo？': 'Akyo?',
  'レア中のレア！': '희귀 중의 희귀!',
  'ぬるぬるしているらしいよ！': '미끈미끈하다고 해!',
  '氷の惑星で発見されたらしい。': '얼음 행성에서 발견되었다고 한다.',
  '純金なんだって～！': '순금이래~!',
  'おいしい！': '맛있어!',
  'こっちもおいしい！': '이것도 맛있어!',
  'パンクだぜ！': '펑크하다!',
  '宝石を食べすぎたらしいよ！': '보석을 너무 많이 먹었다고 해!',
  'こっちも宝石を食べすぎたんだって！': '이것도 보석을 너무 많이 먹었대!',
  'キツネツキ式狐Akyoの好物は宝石なのかな？': '키츠네츠키식 여우 Akyo의 좋아하는 음식은 보석일까?',
  'ここ200年で生まれたAkyoかな？': '지난 200년 사이에 태어난 Akyo일까?',
  'すごい力を感じる・・・': '엄청난 힘이 느껴진다...',
  '（ささのきの手記）\r\n温めてくれるakyo。プラグは差していなくても平気なようだ。錆びてしまうので水が苦手。':
    '(사사노키의 수기)\r\n따뜻하게 해주는 Akyo. 플러그를 꽂지 않아도 괜찮은 듯하다. 녹이 슬어서 물을 싫어한다.',
  '（ささのきの手記）\r\nしっかり焼かれた四角いお餅に海苔を巻いて。香ばしい香りが食欲を誘う':
    '(사사노키의 수기)\r\n노릇하게 구운 네모난 떡에 김을 말았다. 고소한 향이 식욕을 자극한다.',
  '（ささのきの手記）\r\n永久凍土の研究中に発見された氷のakyo。中に何か埋まっている気がする':
    '(사사노키의 수기)\r\n영구동토 연구 중 발견된 얼음 Akyo. 안에 뭔가 묻혀 있는 것 같다.',
  '（ささのきの手記）\r\n人懐っこく好奇心旺盛': '(사사노키의 수기)\r\n사람을 잘 따르고 호기심이 왕성하다.',
  '遠くから見たらAkyo！': '멀리서 보면 Akyo!',
  '（ささのきの手記）\r\n世紀末に生きるakyo': '(사사노키의 수기)\r\n세기말을 살아가는 Akyo.',
  'このバター、VRChatで見た気がする！': '이 버터, VRChat에서 본 것 같아!',
  'AkyoのCMで見たことある！': 'Akyo 광고에서 본 적 있어!',
  'このAkyoもAkyoのCMにいた！': '이 Akyo도 Akyo 광고에 있었어!',
  'よく見て、肩の上に苔Akyoがいるよ！自律もするんだって！':
    '잘 봐, 어깨 위에 이끼 Akyo가 있어! 자율적으로 움직이기도 한대!',
  '記憶を失ってもなおその魂の灯火は熱く燃え上がる！\r\nマンボーマンの遺志を継ぎ今ここに誕生した絆の戦士・ウーパールーパーマンとうまAkyoに全宇宙の命運は託された！':
    '기억을 잃어도 그 영혼의 불꽃은 뜨겁게 타오른다!\r\n맨보맨의 유지를 이어 지금 이곳에 탄생한 유대의 전사・우파루파맨과 말 Akyo에게 온 우주의 명운이 맡겨졌다!',
  '頭がAkyo！？\r\n人・・・なの？': '머리가 Akyo！？\r\n사람...이야?',
  '爬虫類を指す英語だよ！': '파충류를 뜻하는 영어야!',
  'まめAkyoパラダイスだ～～～！！！': '마메 Akyo 파라다이스다~~~!!!',
  'まだまだ増える、まめAkyoパラダイス！': '아직도 늘어나는 마메 Akyo 파라다이스!',
  'まめAkyoの勢いが止まらない！\r\n全AkyoまめAkyo化計画も夢じゃないね！':
    '마메 Akyo의 기세가 멈추지 않아!\r\n모든 Akyo를 마메 Akyo로 만드는 계획도 꿈만은 아니네!',
  'ついてこい！（ ｀ー´）ノ\r\n（作者コメントより）': '따라와!（ ｀ー´）ノ\r\n(제작자 코멘트에서)',
  'Akyo、ゲットだぜ！': 'Akyo, 겟이다제!',
  '（ささのきの手記）\r\n永久凍土で眠っていたakyo。目覚めたらずいぶん暖かくなっていてびっくりしている':
    '(사사노키의 수기)\r\n영구동토에서 잠들어 있던 Akyo. 깨어나니 한참 따뜻해져서 깜짝 놀라고 있다.',
  '（ささのきの手記）\r\n栄養価が高く森のバターとも呼ばれる。そのおいしさはakyoにも人気である':
    '(사사노키의 수기)\r\n영양가가 높아 숲의 버터라고도 불린다. 그 맛은 Akyo에게도 인기다.',
};

function translateComment(jaComment, existingKoComment = '') {
  if (!jaComment) return '';

  // Check exact match first
  if (COMMENT_MAP[jaComment]) {
    return COMMENT_MAP[jaComment];
  }

  // Retry with normalized line-endings: JA CSV may use \n while map keys use \r\n
  const normalized = jaComment.replace(/\r\n/g, '\n');
  for (const [key, value] of Object.entries(COMMENT_MAP)) {
    if (key.replace(/\r\n/g, '\n') === normalized) {
      return value;
    }
  }
  untranslatedCommentCount += 1;

  if (existingKoComment && existingKoComment.trim()) {
    if (VERBOSE) {
      console.warn(`[WARN] untranslated comment, reusing existing ko comment: "${jaComment}"`);
    }
    return existingKoComment.trim();
  }

  if (VERBOSE) {
    console.warn(`[WARN] untranslated comment, falling back to original: "${jaComment}"`);
  }
  return jaComment;
}

/**
 * Fail fast on malformed CSV rows after parsing.
 */
function validateParsedRows(records, csvPath) {
  const [header, ...dataRows] = records;
  const expectedColumnCount = header.length;

  dataRows.forEach((row, index) => {
    const lineNumber = index + 2; // Header is line 1
    if (row.length !== expectedColumnCount) {
      throw new Error(
        `Malformed CSV row at line ${lineNumber} in ${csvPath}: expected ${expectedColumnCount} columns, got ${row.length}`
      );
    }
  });
}

// ============================================================
// Main: Generate Korean data files
// ============================================================
function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  const csvKoPath = path.join(dataDir, 'akyo-data-ko.csv');
  const existingKoCommentMap = loadExistingKoCommentMap(csvKoPath);
  console.log(`📚 Loaded existing Korean comments: ${existingKoCommentMap.size}`);

  // === Read Japanese CSV ===
  console.log('📖 Reading Japanese CSV...');
  const csvJaPath = path.join(dataDir, 'akyo-data-ja.csv');
  const csvJa = fs.readFileSync(csvJaPath, 'utf-8');

  // Strict parsing is required so malformed CSVs fail immediately.
  const records = parse(csvJa, {
    skip_empty_lines: true,
    trim: false,
    record_delimiter: ['\r\n', '\n', '\r'],
    columns: false,
    quote: '"',
    escape: '"',
  });

  if (records.length < 2) {
    console.error('❌ No data rows found in CSV');
    process.exit(1);
  }

  const [header, ...dataRows] = records;
  validateParsedRows(records, csvJaPath);
  console.log(`   Found ${dataRows.length} rows`);

  // Header: ID, Nickname, AvatarName, Category, Comment, Author, AvatarURL
  const headerMap = {};
  header.forEach((h, i) => {
    headerMap[h.trim().replace(/^\ufeff/, '')] = i;
  });

  // Validate required headers exist
  const REQUIRED_HEADERS = [
    'ID',
    'Nickname',
    'AvatarName',
    'Category',
    'Comment',
    'Author',
    'AvatarURL',
  ];
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !(h in headerMap));
  if (missingHeaders.length > 0) {
    console.error(`\u274C Missing required CSV headers: ${missingHeaders.join(', ')}`);
    console.error(`   Found headers: ${Object.keys(headerMap).join(', ')}`);
    process.exit(1);
  }

  // === Translate rows ===
  console.log('🔄 Translating to Korean...');
  const koRows = dataRows.map((row) => {
    const id = row[headerMap['ID']] || '';
    const nickname = row[headerMap['Nickname']] || '';
    const avatarName = row[headerMap['AvatarName']] || '';
    const category = row[headerMap['Category']] || '';
    const comment = row[headerMap['Comment']] || '';
    const author = row[headerMap['Author']] || '';
    const avatarUrl = row[headerMap['AvatarURL']] || '';

    const existingKoComment = existingKoCommentMap.get(id) || '';

    return [
      id,
      translateNickname(nickname),
      avatarName, // Keep as-is
      translateCategory(category),
      translateComment(comment, existingKoComment),
      author, // Keep as-is
      avatarUrl, // Keep as-is
    ];
  });

  // === Write Korean CSV ===
  console.log('📝 Writing Korean CSV...');
  const csvOutput = stringify([header, ...koRows], {
    quoted: true,
    record_delimiter: '\n',
  });
  fs.writeFileSync(csvKoPath, csvOutput, 'utf-8');
  console.log(`   ✅ ${csvKoPath}`);

  // === Write Korean JSON ===
  console.log('📝 Writing Korean JSON...');
  const jsonKoPath = path.join(dataDir, 'akyo-data-ko.json');
  const jsonData = koRows.map((row) => ({
    id: row[0],
    nickname: row[1],
    avatarName: row[2],
    category: row[3],
    comment: row[4],
    author: row[5],
    avatarUrl: row[6],
  }));
  fs.writeFileSync(jsonKoPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`   ✅ ${jsonKoPath}`);

  // === Summary ===
  if (untranslatedCommentCount > 0) {
    console.warn(
      `[WARN] ${untranslatedCommentCount} untranslated comments (use --verbose for detailed rows)`
    );
  }
  console.log(`\n✨ Korean data generated: ${koRows.length} avatars`);
  console.log('   Files:');
  console.log(`   - ${csvKoPath}`);
  console.log(`   - ${jsonKoPath}`);
}

main();
