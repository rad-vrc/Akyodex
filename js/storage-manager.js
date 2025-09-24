// Akyoずかん ストレージマネージャー
// LocalStorageとIndexedDBのハイブリッド管理

class StorageManager {
    constructor() {
        this.dbName = 'AkyoDatabase';
        this.dbVersion = 1;
        this.imageStoreName = 'images';
        this.db = null;
        this.isIndexedDBAvailable = this.checkIndexedDB();
    }

    // IndexedDBが利用可能かチェック
    checkIndexedDB() {
        if (!window.indexedDB) {
            console.warn('IndexedDB is not available. Falling back to localStorage.');
            return false;
        }
        return true;
    }

    // データベース初期化
    async init() {
        if (!this.isIndexedDBAvailable) {
            return false;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 画像ストアの作成
                if (!db.objectStoreNames.contains(this.imageStoreName)) {
                    const imageStore = db.createObjectStore(this.imageStoreName, { keyPath: 'id' });
                    imageStore.createIndex('id', 'id', { unique: true });
                    console.log('Image store created');
                }
            };
        });
    }

    // 画像を保存（IndexedDB）
    async saveImage(id, imageData) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.imageStoreName], 'readwrite');
            const store = transaction.objectStore(this.imageStoreName);
            
            const request = store.put({
                id: id,
                data: imageData,
                timestamp: Date.now()
            });

            request.onsuccess = () => {
                console.log(`Image saved: ${id}`);
                resolve(true);
            };

            request.onerror = () => {
                console.error(`Failed to save image ${id}:`, request.error);
                reject(request.error);
            };
        });
    }

    // 画像を取得（IndexedDB）
    async getImage(id) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.imageStoreName], 'readonly');
            const store = transaction.objectStore(this.imageStoreName);
            const request = store.get(id);

            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result.data);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.error(`Failed to get image ${id}:`, request.error);
                reject(request.error);
            };
        });
    }

    // すべての画像を取得（IndexedDB）
    async getAllImages() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.imageStoreName], 'readonly');
            const store = transaction.objectStore(this.imageStoreName);
            const request = store.getAll();

            request.onsuccess = () => {
                const images = {};
                request.result.forEach(item => {
                    images[item.id] = item.data;
                });
                resolve(images);
            };

            request.onerror = () => {
                console.error('Failed to get all images:', request.error);
                reject(request.error);
            };
        });
    }

    // 画像を削除（IndexedDB）
    async deleteImage(id) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.imageStoreName], 'readwrite');
            const store = transaction.objectStore(this.imageStoreName);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log(`Image deleted: ${id}`);
                resolve(true);
            };

            request.onerror = () => {
                console.error(`Failed to delete image ${id}:`, request.error);
                reject(request.error);
            };
        });
    }

    // すべての画像をクリア（IndexedDB）
    async clearAllImages() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.imageStoreName], 'readwrite');
            const store = transaction.objectStore(this.imageStoreName);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('All images cleared');
                resolve(true);
            };

            request.onerror = () => {
                console.error('Failed to clear images:', request.error);
                reject(request.error);
            };
        });
    }

    // LocalStorageからIndexedDBへ移行
    async migrateFromLocalStorage() {
        try {
            const localData = localStorage.getItem('akyoImages');
            if (!localData) {
                console.log('No data to migrate from localStorage');
                return { migrated: 0, failed: 0 };
            }

            const images = JSON.parse(localData);
            const imageIds = Object.keys(images);
            
            let migratedCount = 0;
            let failedCount = 0;

            console.log(`Starting migration of ${imageIds.length} images...`);

            for (const id of imageIds) {
                try {
                    await this.saveImage(id, images[id]);
                    migratedCount++;
                    console.log(`Migrated: ${id} (${migratedCount}/${imageIds.length})`);
                } catch (error) {
                    console.error(`Failed to migrate ${id}:`, error);
                    failedCount++;
                }
            }

            // 移行成功後、localStorageから削除（オプション）
            if (migratedCount > 0 && failedCount === 0) {
                localStorage.removeItem('akyoImages');
                console.log('Removed old data from localStorage');
            }

            console.log(`Migration complete: ${migratedCount} succeeded, ${failedCount} failed`);
            return { migrated: migratedCount, failed: failedCount };

        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }

    // 互換性レイヤー：既存のコードと互換性を保つ
    async getImageDataMap() {
        if (this.isIndexedDBAvailable) {
            try {
                return await this.getAllImages();
            } catch (error) {
                console.error('Failed to get images from IndexedDB:', error);
                // フォールバック to localStorage
                const localData = localStorage.getItem('akyoImages');
                return localData ? JSON.parse(localData) : {};
            }
        } else {
            // IndexedDB非対応の場合はlocalStorage使用
            const localData = localStorage.getItem('akyoImages');
            return localData ? JSON.parse(localData) : {};
        }
    }

    // 互換性レイヤー：画像を保存
    async saveImageDataMap(imageDataMap) {
        if (this.isIndexedDBAvailable) {
            try {
                // 各画像を個別に保存
                for (const [id, data] of Object.entries(imageDataMap)) {
                    await this.saveImage(id, data);
                }
                return true;
            } catch (error) {
                console.error('Failed to save to IndexedDB:', error);
                // フォールバック to localStorage
                try {
                    localStorage.setItem('akyoImages', JSON.stringify(imageDataMap));
                    return true;
                } catch (e) {
                    throw e;
                }
            }
        } else {
            // IndexedDB非対応の場合はlocalStorage使用
            localStorage.setItem('akyoImages', JSON.stringify(imageDataMap));
            return true;
        }
    }

    // ストレージ情報を取得
    async getStorageInfo() {
        const info = {
            indexedDBAvailable: this.isIndexedDBAvailable,
            indexedDBImages: 0,
            localStorageImages: 0,
            totalSize: 0
        };

        // IndexedDBの情報
        if (this.isIndexedDBAvailable) {
            try {
                const images = await this.getAllImages();
                info.indexedDBImages = Object.keys(images).length;
                
                // サイズ計算
                let totalSize = 0;
                for (const data of Object.values(images)) {
                    totalSize += data.length;
                }
                info.totalSize = totalSize;
            } catch (error) {
                console.error('Failed to get IndexedDB info:', error);
            }
        }

        // LocalStorageの情報
        try {
            const localData = localStorage.getItem('akyoImages');
            if (localData) {
                const images = JSON.parse(localData);
                info.localStorageImages = Object.keys(images).length;
                if (!info.totalSize) {
                    info.totalSize = localData.length;
                }
            }
        } catch (error) {
            console.error('Failed to get localStorage info:', error);
        }

        return info;
    }
}

// グローバルインスタンスを作成
window.storageManager = new StorageManager();

// 初期化
(async () => {
    try {
        await window.storageManager.init();
        console.log('StorageManager initialized');
    } catch (error) {
        console.error('Failed to initialize StorageManager:', error);
    }
})();