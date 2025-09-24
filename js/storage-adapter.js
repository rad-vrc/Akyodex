// ストレージアダプター
// 既存のコードと互換性を保ちながら、IndexedDBを使用可能にする

(function() {
    // StorageManagerのインスタンスを確認
    if (!window.storageManager) {
        console.log('StorageManager not found. Creating new instance...');
        // storage-manager.jsが読み込まれていない場合は動的に読み込む
        const script = document.createElement('script');
        script.src = 'js/storage-manager.js';
        document.head.appendChild(script);
    }

    // 画像データ読み込み（LocalStorage → IndexedDB の順で試行）
    window.loadImageData = async function() {
        try {
            // まずIndexedDBから読み込みを試行
            if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
                console.log('Loading images from IndexedDB...');
                const images = await window.storageManager.getAllImages();
                
                if (Object.keys(images).length > 0) {
                    console.log(`Loaded ${Object.keys(images).length} images from IndexedDB`);
                    return images;
                }
            }
        } catch (error) {
            console.warn('Failed to load from IndexedDB:', error);
        }

        // IndexedDBから読み込めない場合はLocalStorageを試行
        try {
            console.log('Loading images from LocalStorage...');
            const localData = localStorage.getItem('akyoImages');
            if (localData) {
                const images = JSON.parse(localData);
                console.log(`Loaded ${Object.keys(images).length} images from LocalStorage`);
                return images;
            }
        } catch (error) {
            console.warn('Failed to load from LocalStorage:', error);
        }

        return {};
    };

    // 画像データ保存（IndexedDB優先、失敗時はLocalStorage）
    window.saveImageData = async function(imageDataMap) {
        let savedToIndexedDB = false;

        // IndexedDBへの保存を試行
        if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
            try {
                console.log('Saving images to IndexedDB...');
                
                // 各画像を個別に保存
                const imageIds = Object.keys(imageDataMap);
                let successCount = 0;
                
                for (const id of imageIds) {
                    try {
                        await window.storageManager.saveImage(id, imageDataMap[id]);
                        successCount++;
                    } catch (error) {
                        console.error(`Failed to save image ${id}:`, error);
                    }
                }
                
                if (successCount > 0) {
                    console.log(`Saved ${successCount}/${imageIds.length} images to IndexedDB`);
                    savedToIndexedDB = true;
                }
                
            } catch (error) {
                console.error('Failed to save to IndexedDB:', error);
            }
        }

        // IndexedDBに保存できなかった場合、LocalStorageに保存を試行
        if (!savedToIndexedDB) {
            try {
                console.log('Saving images to LocalStorage...');
                localStorage.setItem('akyoImages', JSON.stringify(imageDataMap));
                console.log('Images saved to LocalStorage');
                return true;
            } catch (error) {
                // LocalStorageも失敗（容量オーバーの可能性）
                console.error('Failed to save to LocalStorage:', error);
                
                if (error.name === 'QuotaExceededError') {
                    alert('ストレージ容量が不足しています。\n\n「migrate-storage.html」を開いてIndexedDBへの移行を実行してください。');
                    throw error;
                }
            }
        }

        return savedToIndexedDB;
    };

    // 単一画像の保存
    window.saveSingleImage = async function(id, imageData) {
        // IndexedDBへの保存を優先
        if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
            try {
                await window.storageManager.saveImage(id, imageData);
                console.log(`Image ${id} saved to IndexedDB`);
                return true;
            } catch (error) {
                console.warn(`Failed to save image ${id} to IndexedDB:`, error);
            }
        }

        // LocalStorageへの保存（フォールバック）
        try {
            const existingData = localStorage.getItem('akyoImages');
            const images = existingData ? JSON.parse(existingData) : {};
            images[id] = imageData;
            localStorage.setItem('akyoImages', JSON.stringify(images));
            console.log(`Image ${id} saved to LocalStorage`);
            return true;
        } catch (error) {
            console.error(`Failed to save image ${id}:`, error);
            
            if (error.name === 'QuotaExceededError') {
                alert('ストレージ容量が不足しています。\n\n「migrate-storage.html」を開いてIndexedDBへの移行を実行してください。');
            }
            throw error;
        }
    };

    // 単一画像の削除
    window.deleteSingleImage = async function(id) {
        let deletedFromIndexedDB = false;

        // IndexedDBから削除
        if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
            try {
                await window.storageManager.deleteImage(id);
                console.log(`Image ${id} deleted from IndexedDB`);
                deletedFromIndexedDB = true;
            } catch (error) {
                console.warn(`Failed to delete image ${id} from IndexedDB:`, error);
            }
        }

        // LocalStorageからも削除（両方から削除して整合性を保つ）
        try {
            const existingData = localStorage.getItem('akyoImages');
            if (existingData) {
                const images = JSON.parse(existingData);
                if (images[id]) {
                    delete images[id];
                    localStorage.setItem('akyoImages', JSON.stringify(images));
                    console.log(`Image ${id} deleted from LocalStorage`);
                }
            }
        } catch (error) {
            console.warn(`Failed to delete image ${id} from LocalStorage:`, error);
        }

        return deletedFromIndexedDB;
    };

    // ストレージ情報取得
    window.getStorageInfo = async function() {
        const info = {
            indexedDB: { available: false, count: 0, size: 0 },
            localStorage: { available: true, count: 0, size: 0 }
        };

        // IndexedDB情報
        if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
            try {
                const images = await window.storageManager.getAllImages();
                info.indexedDB.available = true;
                info.indexedDB.count = Object.keys(images).length;
                
                // サイズ計算
                let totalSize = 0;
                for (const data of Object.values(images)) {
                    totalSize += data.length;
                }
                info.indexedDB.size = totalSize;
            } catch (error) {
                console.warn('Failed to get IndexedDB info:', error);
            }
        }

        // LocalStorage情報
        try {
            const localData = localStorage.getItem('akyoImages');
            if (localData) {
                const images = JSON.parse(localData);
                info.localStorage.count = Object.keys(images).length;
                info.localStorage.size = localData.length;
            }
        } catch (error) {
            console.warn('Failed to get LocalStorage info:', error);
        }

        return info;
    };

    // 初期化完了をログ出力
    console.log('Storage Adapter initialized. Use migrate-storage.html to migrate to IndexedDB for unlimited storage.');
})();