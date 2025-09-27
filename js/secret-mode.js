'use strict';

(function attachSecretModeUtilities(global) {
    if (!global || global.secretMode) return;

    const SECRET_MODE_PARAM_KEY = '_akyoFresh';
    const SECRET_MODE_LOCAL_KEYS = Object.freeze([
        'akyoDataCSV',
        'akyoDataVersion',
        'akyoAssetsVersion',
        'akyoImages',
        'akyoHeaderLogo',
        'akyoHeaderImage',
        'headerImage',
        'akyoLogo',
        'akyoProfileIcon',
        'akyoCsvLastRefetchAt'
    ]);
    const SECRET_MODE_CACHE_KEY_FILTER = 'akyo';
    const SECRET_MODE_SERVICE_WORKER_SCOPE_PREFIX = '/';
    const BODY_PROGRESS_CLASS = 'secret-mode-progress';
    const BUSY_ANCHOR_CLASS = 'secret-mode-busy';
    const SPINNER_CLASS = 'secret-mode-spinner';

    function buildSecretNavigationUrl(homeUrl) {
        try {
            const targetUrl = new URL(homeUrl, global.location.href);
            targetUrl.searchParams.set(SECRET_MODE_PARAM_KEY, Date.now().toString(36));
            return targetUrl.toString();
        } catch (_) {
            return homeUrl;
        }
    }

    function removeLocalStorageKeys() {
        SECRET_MODE_LOCAL_KEYS.forEach((key) => {
            try {
                global.localStorage.removeItem(key);
            } catch (_) {}
        });
    }

    function applyPendingVisualState(anchor) {
        let cleanup = () => {};
        if (!anchor) {
            if (global.document?.body) {
                global.document.body.classList.add(BODY_PROGRESS_CLASS);
                cleanup = () => global.document.body.classList.remove(BODY_PROGRESS_CLASS);
            }
            return cleanup;
        }

        const doc = anchor.ownerDocument || global.document;
        if (!doc) return cleanup;

        const body = doc.body;
        if (body) {
            body.classList.add(BODY_PROGRESS_CLASS);
        }

        const spinner = doc.createElement('span');
        spinner.className = SPINNER_CLASS;
        spinner.setAttribute('aria-hidden', 'true');

        anchor.classList.add(BUSY_ANCHOR_CLASS);
        anchor.appendChild(spinner);

        cleanup = () => {
            if (spinner.parentElement === anchor) {
                spinner.remove();
            }
            anchor.classList.remove(BUSY_ANCHOR_CLASS);
            if (body) {
                body.classList.remove(BODY_PROGRESS_CLASS);
            }
        };

        return cleanup;
    }

    async function clearTemporarySecretData() {
        try {
            removeLocalStorageKeys();
        } catch (error) {
            console.warn('ローカルストレージのシークレット消去に失敗:', error);
        }

        try {
            global.sessionStorage.clear();
        } catch (error) {
            console.warn('セッションストレージのシークレット消去に失敗:', error);
        }

        const cleanupTasks = [];

        if (global.window?.storageManager && global.window.storageManager.isIndexedDBAvailable) {
            cleanupTasks.push((async () => {
                try {
                    await global.window.storageManager.init();
                    await global.window.storageManager.clearAllImages();
                } catch (error) {
                    console.warn('IndexedDB画像のシークレット消去に失敗:', error);
                }
            })());
        } else if (global.indexedDB) {
            cleanupTasks.push(new Promise((resolve) => {
                try {
                    const request = global.indexedDB.deleteDatabase('AkyoDatabase');
                    const finish = () => resolve();
                    request.onsuccess = finish;
                    request.onerror = finish;
                    request.onblocked = finish;
                } catch (_) {
                    resolve();
                }
            }));
        }

        if (global.caches && typeof global.caches.keys === 'function') {
            const filterNeedle = SECRET_MODE_CACHE_KEY_FILTER.toLowerCase();
            cleanupTasks.push(
                global.caches.keys()
                    .then((keys) => {
                        if (!filterNeedle) return keys;
                        return keys.filter((key) => key.toLowerCase().startsWith(filterNeedle));
                    })
                    .then((targetKeys) =>
                        Promise.all(targetKeys.map((key) => global.caches.delete(key).catch(() => false)))
                    )
                    .catch((error) => {
                        console.warn('キャッシュストレージのシークレット消去に失敗:', error);
                    })
            );
        }

        if (global.navigator?.serviceWorker && global.navigator.serviceWorker.getRegistrations) {
            cleanupTasks.push(
                global.navigator.serviceWorker.getRegistrations()
                    .then((registrations) => {
                        const scopePrefix = new URL(SECRET_MODE_SERVICE_WORKER_SCOPE_PREFIX, global.location.origin).href;
                        return Promise.all(
                            registrations
                                .filter((reg) => {
                                    try {
                                        return reg.scope.startsWith(scopePrefix);
                                    } catch (_) {
                                        return true;
                                    }
                                })
                                .map((reg) => reg.unregister().catch(() => false))
                        );
                    })
                    .catch((error) => {
                        console.warn('ServiceWorkerのシークレット解除に失敗:', error);
                    })
            );
        }

        await Promise.allSettled(cleanupTasks);
    }

    function setupSecretModeNavigation(anchor, homeUrl) {
        if (!anchor || anchor.dataset.secretModeBound === '1') return;
        anchor.dataset.secretModeBound = '1';

        anchor.addEventListener('click', async (event) => {
            if (
                event.defaultPrevented ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.button === 1
            ) {
                return;
            }

            try { event.preventDefault(); } catch (_) {}

            anchor.setAttribute('aria-disabled', 'true');
            anchor.style.pointerEvents = 'none';

            const cleanupVisualState = applyPendingVisualState(anchor);
            const navigateTo = buildSecretNavigationUrl(homeUrl);

            const fallbackTimer = global.setTimeout(() => {
                cleanupVisualState();
                global.location.replace(navigateTo);
            }, 1500);

            try {
                await clearTemporarySecretData();
            } catch (error) {
                console.warn('シークレット効果の適用に失敗:', error);
            } finally {
                global.clearTimeout(fallbackTimer);
                cleanupVisualState();
                global.location.replace(navigateTo);
            }
        }, { once: true });
    }

    const api = Object.freeze({
        SECRET_MODE_PARAM_KEY,
        SECRET_MODE_LOCAL_KEYS,
        SECRET_MODE_CACHE_KEY_FILTER,
        SECRET_MODE_SERVICE_WORKER_SCOPE_PREFIX,
        buildSecretNavigationUrl,
        clearTemporarySecretData,
        setupSecretModeNavigation
    });

    Object.defineProperty(global, 'secretMode', {
        value: api,
        writable: false,
        configurable: false
    });
})(typeof window !== 'undefined' ? window : this);
