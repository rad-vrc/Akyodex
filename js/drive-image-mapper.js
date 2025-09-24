// Google Drive画像マッピング補助スクリプト
// Google Driveの共有フォルダから画像URLを生成

// Google Drive直接表示URL変換関数
function convertDriveUrl(fileName) {
    // Google Driveの直接アクセスURLパターン
    // 共有フォルダID: 1m_NYhQaGHPO1palTotxu611svE6Yvx9p
    const folderId = '1m_NYhQaGHPO1palTotxu611svE6Yvx9p';
    
    // ファイル名からIDを抽出
    const match = fileName.match(/^(\d{3})/);
    if (match) {
        return {
            id: match[1],
            fileName: fileName,
            // プレビューURL（実際のファイルIDが必要）
            previewUrl: `https://drive.google.com/uc?export=view&id=FILE_ID_HERE`
        };
    }
    return null;
}

// ファイル名リスト（Google Driveフォルダ内の画像）
// 実際のファイル名に基づいて更新が必要
const driveImageList = [
    "001オリジンAkyo.png",
    "002チョコミントAkyo.png",
    "003赤チョコミントAkyo.png",
    "004緑チョコミントAkyo.png",
    "005青チョコミントAkyo.png",
    "006黄チョコミントAkyo.png",
    "007黒チョコミントAkyo.png",
    "008白チョコミントAkyo.png",
    "009灰チョコミントAkyo.png",
    "010ミニチョコミントAkyo.png",
    "011スーパー汎用Akyo.png",
    "012スーパースタッフAkyo.png",
    "013スーパーワープAkyo.png",
    "014スーパーフライング運送Akyo.png",
    "015ランAkyo.png",
    "016バルブAkyo.png",
    "017N_A.png",
    "018ヒューマノイドAkyo.png",
    "019キツネツキ式狐Akyo.png",
    "020キツネツキ式幽霊狐Akyo.png",
    "021キツネツキ式溶け狐Akyo.png",
    // 続きのファイル名を追加
];

// Spreadsheetデータ構造
const spreadsheetColumns = {
    id: 0,           // 番号
    appearance: 1,   // 見た目
    nickname: 2,     // 通称
    avatarName: 3,   // アバター名
    attribute: 4,    // 属性
    notes: 5,        // 備考
    creator: 6,      // 作者
    avatarUrl: 7     // アバターURL
};

// 画像マッピングを生成
function generateImageMapping() {
    const mapping = {};
    
    driveImageList.forEach(fileName => {
        const data = convertDriveUrl(fileName);
        if (data) {
            mapping[data.id] = {
                fileName: data.fileName,
                driveUrl: data.previewUrl,
                // 既存の画像URLがあれば保持
                fallbackUrl: akyoImageUrls ? akyoImageUrls[data.id] : null
            };
        }
    });
    
    return mapping;
}

// バッチ画像プリロード
function preloadImages(ids) {
    const promises = ids.map(id => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const mapping = generateImageMapping();
            
            if (mapping[id]) {
                img.onload = () => resolve({id, status: 'loaded'});
                img.onerror = () => resolve({id, status: 'error'});
                img.src = mapping[id].fallbackUrl || mapping[id].driveUrl;
            } else {
                resolve({id, status: 'not_found'});
            }
        });
    });
    
    return Promise.all(promises);
}

// Google Spreadsheet APIを使用したデータ取得（CORS制限のため直接は不可）
// 代替: CSV形式でエクスポートしてから使用
async function fetchSpreadsheetData() {
    const spreadsheetId = '15CrxihXlmHLDcEtg-BamJHQrmtmJFpiHvThAmhe6rPQ';
    const sheetName = 'PublicAkyo';
    
    // CSV形式でのエクスポートURL
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
    
    console.log('Spreadsheet CSV URL:', csvUrl);
    console.log('Note: CORS制限により直接取得はできません。CSVファイルとしてダウンロードして使用してください。');
    
    return csvUrl;
}

// 管理画面用: 一括画像URL更新機能
function batchUpdateImageUrls() {
    const mapping = generateImageMapping();
    const updateScript = [];
    
    Object.entries(mapping).forEach(([id, data]) => {
        updateScript.push({
            id: id,
            imageUrl: data.fallbackUrl || data.driveUrl,
            source: 'google_drive'
        });
    });
    
    // LocalStorageに保存
    const existingImages = JSON.parse(localStorage.getItem('akyoImages') || '{}');
    updateScript.forEach(item => {
        if (item.imageUrl && !existingImages[item.id]) {
            existingImages[item.id] = item.imageUrl;
        }
    });
    
    localStorage.setItem('akyoImages', JSON.stringify(existingImages));
    console.log('画像URLを更新しました:', Object.keys(existingImages).length, '件');
    
    return existingImages;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        convertDriveUrl, 
        generateImageMapping, 
        preloadImages, 
        fetchSpreadsheetData,
        batchUpdateImageUrls
    };
}