/**
 * Local Storage Adapter - Mode Offline
 * Stockage local pur avec IndexedDB + localStorage
 * Aucune synchronisation GitHub, fonctionnement 100% offline
 */

import StorageAdapterBase from './storage-adapter-base.js';

class LocalStorageAdapter extends StorageAdapterBase {
  constructor() {
    super();
    this.mode = 'local';
    this.db = null;
    this.dbName = 'pensine-local';
    this.dbVersion = 1;
  }

  async configure(config) {
    console.log('🏠 Configuring local storage mode');

    // Initialiser IndexedDB
    await this.initIndexedDB();

    // Stocker la config
    localStorage.setItem('pensine-storage-mode', 'local');
    localStorage.setItem('pensine-local-config', JSON.stringify(config));

    this.configured = true;
    console.log('✅ Local storage mode configured');
  }

  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store pour les fichiers
        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: 'path' });
          filesStore.createIndex('type', 'type', { unique: false });
          filesStore.createIndex('modified', 'modified', { unique: false });
        }

        // Store pour l'historique
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', {
            keyPath: 'id',
            autoIncrement: true
          });
          historyStore.createIndex('path', 'path', { unique: false });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        console.log('✅ IndexedDB schema created');
      };
    });
  }

  async getFile(path) {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.get(path);

      request.onsuccess = () => {
        const file = request.result;
        if (file) {
          resolve({
            content: file.content,
            sha: file.sha,
            path: file.path,
            modified: file.modified
          });
        } else {
          resolve(null); // File doesn't exist
        }
      };

      request.onerror = () => {
        console.error('Error getting file:', request.error);
        reject(request.error);
      };
    });
  }

  async putFile(path, content, message, sha = null) {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    // Générer un SHA simple (hash du contenu + timestamp)
    const newSha = await this.generateSha(content);
    const timestamp = new Date().toISOString();

    const file = {
      path,
      content,
      sha: newSha,
      modified: timestamp,
      type: this.getFileType(path),
      message // Message pour historique
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files', 'history'], 'readwrite');
      const filesStore = transaction.objectStore('files');
      const historyStore = transaction.objectStore('history');

      // Sauvegarder le fichier
      const putRequest = filesStore.put(file);

      putRequest.onsuccess = () => {
        // Ajouter à l'historique
        const historyEntry = {
          path,
          message,
          timestamp,
          oldSha: sha,
          newSha,
          contentSnapshot: content // Garder snapshot pour diff
        };

        historyStore.add(historyEntry);

        resolve({
          content,
          sha: newSha,
          path,
          modified: timestamp
        });
      };

      putRequest.onerror = () => {
        console.error('Error putting file:', putRequest.error);
        reject(putRequest.error);
      };
    });
  }

  async deleteFile(path, message, sha) {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files', 'history'], 'readwrite');
      const filesStore = transaction.objectStore('files');
      const historyStore = transaction.objectStore('history');

      // Récupérer le fichier avant suppression (pour historique)
      const getRequest = filesStore.get(path);

      getRequest.onsuccess = () => {
        const file = getRequest.result;

        // Supprimer le fichier
        const deleteRequest = filesStore.delete(path);

        deleteRequest.onsuccess = () => {
          // Ajouter à l'historique
          const historyEntry = {
            path,
            message,
            timestamp: new Date().toISOString(),
            action: 'delete',
            deletedContent: file ? file.content : null
          };

          historyStore.add(historyEntry);
          resolve();
        };

        deleteRequest.onerror = () => {
          console.error('Error deleting file:', deleteRequest.error);
          reject(deleteRequest.error);
        };
      };

      getRequest.onerror = () => {
        console.error('Error getting file for deletion:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  async listFiles(path) {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.getAll();

      request.onsuccess = () => {
        const allFiles = request.result;

        // Filtrer par préfixe de path
        const filtered = allFiles
          .filter(file => file.path.startsWith(path))
          .map(file => ({
            path: file.path,
            type: file.type,
            modified: file.modified,
            sha: file.sha
          }));

        resolve(filtered);
      };

      request.onerror = () => {
        console.error('Error listing files:', request.error);
        reject(request.error);
      };
    });
  }

  async checkConnection() {
    // Mode local toujours disponible (pas de connexion réseau)
    return true;
  }

  getModeInfo() {
    return {
      mode: 'local',
      label: 'Local (Offline)',
      icon: '🏠',
      description: 'Stockage local uniquement, aucune synchronisation',
      features: {
        sync: false,
        backup: false,
        collaboration: false,
        offline: true,
        privacy: true
      },
      storage: 'IndexedDB + localStorage',
      limitations: [
        'Pas de synchronisation entre appareils',
        'Pas de backup automatique',
        'Données perdues si cache navigateur effacé'
      ]
    };
  }

  /**
   * Générer un SHA simple pour identification
   */
  async generateSha(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content + Date.now());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 40); // 40 chars comme GitHub SHA
  }

  /**
   * Détermine le type de fichier
   */
  getFileType(path) {
    if (path.includes('journal')) return 'journal';
    if (path.endsWith('.md')) return 'page';
    if (path.endsWith('.json')) return 'config';
    return 'file';
  }

  /**
   * Exporter toutes les données (pour backup manuel)
   */
  async exportData() {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const files = await this.listFiles('');
    const fileContents = await Promise.all(
      files.map(file => this.getFile(file.path))
    );

    return {
      version: 1,
      exportDate: new Date().toISOString(),
      files: fileContents,
      config: JSON.parse(localStorage.getItem('pensine-local-config') || '{}')
    };
  }

  /**
   * Importer des données (restore backup)
   */
  async importData(data) {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    if (data.version !== 1) {
      throw new Error('Incompatible backup version');
    }

    console.log(`📥 Importing ${data.files.length} files...`);

    for (const file of data.files) {
      await this.putFile(
        file.path,
        file.content,
        'Imported from backup',
        file.sha
      );
    }

    console.log('✅ Import complete');
  }

  /**
   * Récupérer l'historique pour un fichier
   */
  async getHistory(path, limit = 20) {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['history'], 'readonly');
      const store = transaction.objectStore('history');
      const index = store.index('path');
      const request = index.getAll(path);

      request.onsuccess = () => {
        const history = request.result
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, limit);
        resolve(history);
      };

      request.onerror = () => {
        console.error('Error getting history:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Nettoyer l'historique ancien (> 30 jours)
   */
  async cleanupHistory(daysToKeep = 30) {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['history'], 'readwrite');
      const store = transaction.objectStore('history');
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffDate.toISOString());
      const request = index.openCursor(range);

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`🧹 Cleaned up ${deletedCount} old history entries`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('Error cleaning history:', request.error);
        reject(request.error);
      };
    });
  }
}

// Export for ES6 modules
export default LocalStorageAdapter;

// Export for backward compatibility
if (typeof window !== 'undefined') {
  window.LocalStorageAdapter = LocalStorageAdapter;
}
