/**
 * Local Storage Manager
 * Uses localStorage for settings, IndexedDB for caching
 */

class StorageManager {
    constructor() {
        this.dbName = 'PensineDB';
        this.dbVersion = 1;
        this.db = null;
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('files')) {
                    db.createObjectStore('files', { keyPath: 'path' });
                }
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Save file to cache
     */
    async cacheFile(path, content, sha) {
        const transaction = this.db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        
        await store.put({
            path,
            content,
            sha,
            timestamp: Date.now()
        });
    }

    /**
     * Get file from cache
     */
    async getCachedFile(path) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const request = store.get(path);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all cache
     */
    async clearCache() {
        const transaction = this.db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        await store.clear();
    }

    // Settings (localStorage)
    
    saveSettings(settings) {
        localStorage.setItem('pensine-settings', JSON.stringify(settings));
    }

    getSettings() {
        const json = localStorage.getItem('pensine-settings');
        return json ? JSON.parse(json) : null;
    }

    clearSettings() {
        localStorage.removeItem('pensine-settings');
    }

    // Recent pages
    
    addRecentPage(pageName) {
        const recent = this.getRecentPages();
        const updated = [pageName, ...recent.filter(p => p !== pageName)].slice(0, 10);
        localStorage.setItem('pensine-recent', JSON.stringify(updated));
    }

    getRecentPages() {
        const json = localStorage.getItem('pensine-recent');
        return json ? JSON.parse(json) : [];
    }
}

window.storageManager = new StorageManager();
