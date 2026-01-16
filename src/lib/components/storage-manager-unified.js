/**
 * Storage Manager - Unified storage interface
 * Gère les 4 modes : OAuth, PAT, Local, Local Git
 */

class StorageManager {
  constructor() {
    this.adapter = null;
    this.mode = null;
  }

  /**
   * Initialise le storage avec le mode approprié
   */
  async initialize(bootstrapConfig = null) {
    let mode, config;

    // Si config fournie directement, utiliser celle-ci
    if (bootstrapConfig) {
      mode = bootstrapConfig.storageMode;
      config = bootstrapConfig.credentials;
    } else {
      // Essayer de charger depuis nouveau format (bootstrap.json)
      try {
        const bootstrapData = localStorage.getItem('pensine-bootstrap');
        if (bootstrapData) {
          const parsed = JSON.parse(bootstrapData);
          mode = parsed.storageMode;
          config = parsed.credentials;
          console.log('📋 Loaded bootstrap config:', mode);
        }
      } catch (error) {
        console.warn('Error parsing bootstrap config:', error);
      }

      // Fallback vers ancien format
      if (!mode) {
        mode = localStorage.getItem('pensine-storage-mode');
        console.log('📋 Loaded legacy storage mode:', mode);
      }
    }

    if (!mode) {
      console.log('⚠️ No storage mode configured, will show wizard');
      return false;
    }

    console.log(`🔧 Initializing storage mode: ${mode}`);

    switch (mode) {
      case 'oauth':
        await this.initOAuthMode();
        break;

      case 'pat':
        await this.initPATMode();
        break;

      case 'local':
        await this.initLocalMode();
        break;

      case 'local-git':
        await this.initLocalGitMode();
        break;

      default:
        console.error('Unknown storage mode:', mode);
        return false;
    }

    return this.adapter && this.adapter.isConfigured();
  }

  async initOAuthMode() {
    this.mode = 'oauth';

    // Import dynamique de l'adapter
    const { default: GitHubStorageAdapter } = await import(`/src/lib/adapters/github-storage-adapter.js?v=${Date.now()}`);
    this.adapter = new GitHubStorageAdapter();

    // Vérifier si OAuth est authentifié
    if (!window.githubOAuth || !window.githubOAuth.isAuthenticated()) {
      console.warn('⚠️ OAuth not authenticated');
      return false;
    }

    // Récupérer la config GitHub
    const config = JSON.parse(localStorage.getItem('pensine-github-config') || '{}');
    config.authMode = 'oauth';

    await this.adapter.configure(config);
    console.log('✅ OAuth mode initialized');
    return true;
  }

  async initPATMode() {
    this.mode = 'pat';

    // Import dynamique de l'adapter
    const { default: GitHubStorageAdapter } = await import(`/src/lib/adapters/github-storage-adapter.js?v=${Date.now()}`);
    this.adapter = new GitHubStorageAdapter();

    // Récupérer token chiffré et config
    const token = await window.tokenStorage.getToken();
    const config = JSON.parse(localStorage.getItem('pensine-github-config') || '{}');

    if (!token) {
      console.warn('⚠️ No PAT token found');
      return false;
    }

    config.token = token;
    config.authMode = 'pat';

    await this.adapter.configure(config);
    console.log('✅ PAT mode initialized');
    return true;
  }

  async initLocalMode() {
    this.mode = 'local';

    // Import dynamique de l'adapter
    const { default: LocalStorageAdapter } = await import(`/src/lib/adapters/local-storage-adapter.js?v=${Date.now()}`);
    this.adapter = new LocalStorageAdapter();

    const config = JSON.parse(localStorage.getItem('pensine-local-config') || '{}');
    await this.adapter.configure(config);

    console.log('✅ Local mode initialized');
    return true;
  }

  async initLocalGitMode() {
    this.mode = 'local-git';

    // Import dynamique de l'adapter
    const { default: LocalGitAdapter } = await import(`/src/lib/adapters/local-git-adapter.js?v=${Date.now()}`);
    this.adapter = new LocalGitAdapter();

    const config = JSON.parse(localStorage.getItem('pensine-local-git-config') || '{}');
    await this.adapter.configure(config);

    console.log('✅ Local Git mode initialized');
    return true;
  }

  /**
   * Switcher de mode
   */
  async switchMode(newMode, config) {
    console.log(`🔄 Switching from ${this.mode} to ${newMode}`);

    // Sauvegarder l'ancien mode pour rollback si erreur
    const oldMode = this.mode;
    const oldAdapter = this.adapter;

    try {
      // Initialiser le nouveau mode
      switch (newMode) {
        case 'oauth':
          this.adapter = new GitHubStorageAdapter();
          config.authMode = 'oauth';
          await this.adapter.configure(config);
          break;

        case 'pat':
          this.adapter = new GitHubStorageAdapter();
          config.authMode = 'pat';
          await this.adapter.configure(config);
          break;

        case 'local':
          this.adapter = new LocalStorageAdapter();
          await this.adapter.configure(config);
          break;

        case 'local-git':
          this.adapter = new LocalGitAdapter();
          await this.adapter.configure(config);
          break;

        default:
          throw new Error('Invalid storage mode');
      }

      this.mode = newMode;
      localStorage.setItem('pensine-storage-mode', newMode);

      console.log(`✅ Switched to ${newMode} mode`);
      return true;

    } catch (error) {
      console.error('Error switching mode:', error);

      // Rollback
      this.mode = oldMode;
      this.adapter = oldAdapter;

      throw error;
    }
  }

  /**
   * Obtenir les infos du mode actuel
   */
  getModeInfo() {
    if (!this.adapter) {
      return {
        mode: 'none',
        label: 'Non configuré',
        icon: '❓',
        description: 'Aucun mode de stockage configuré'
      };
    }

    return this.adapter.getModeInfo();
  }

  /**
   * API unifiée - Délégation aux adapters
   */

  async getFile(path) {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }
    return this.adapter.getFile(path);
  }

  async putFile(path, content, message, sha = null) {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }
    return this.adapter.putFile(path, content, message, sha);
  }

  async deleteFile(path, message, sha) {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }
    return this.adapter.deleteFile(path, message, sha);
  }

  async listFiles(path) {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }
    return this.adapter.listFiles(path);
  }

  async checkConnection() {
    if (!this.adapter) {
      return false;
    }
    return this.adapter.checkConnection();
  }

  isConfigured() {
    return this.adapter && this.adapter.isConfigured();
  }

  /**
   * Fonctionnalités avancées selon le mode
   */

  async exportData() {
    if ((this.mode === 'local' || this.mode === 'local-git') && this.adapter.exportData) {
      return this.adapter.exportData();
    }
    throw new Error('Export not available in this mode');
  }

  async importData(data) {
    if ((this.mode === 'local' || this.mode === 'local-git') && this.adapter.importData) {
      return this.adapter.importData(data);
    }
    throw new Error('Import not available in this mode');
  }

  async getHistory(path, limit) {
    if ((this.mode === 'local' || this.mode === 'local-git') && this.adapter.getHistory) {
      return this.adapter.getHistory(path, limit);
    }
    throw new Error('History not available in this mode');
  }

  async getCommits(limit) {
    if ((this.mode === 'oauth' || this.mode === 'pat') && this.adapter.getCommits) {
      return this.adapter.getCommits(limit);
    }
    throw new Error('Commits not available in this mode');
  }

  /**
   * Alias methods for compatibility with ConfigManager and other plugins
   */
  async list(path = '/') {
    return this.listFiles(path);
  }

  async readJSON(path) {
    const content = await this.getFile(path);
    return JSON.parse(content);
  }

  async writeJSON(path, data, message = 'Update config') {
    const content = JSON.stringify(data, null, 2);
    const files = await this.listFiles('/');
    const file = files.find(f => f.path === path);
    const sha = file ? file.sha : null;
    return this.putFile(path, content, message, sha);
  }

  /**
   * Comparer les modes disponibles
   */
  static getAvailableModes() {
    return [
      {
        id: 'oauth',
        label: 'GitHub OAuth',
        icon: '🔒',
        description: 'Sécurisé, recommandé pour production',
        security: '⭐⭐⭐⭐⭐',
        features: ['Sync multi-appareils', 'Backup automatique', 'Collaboration', 'Sécurité maximale'],
        requirements: ['Compte GitHub', 'Internet', 'Backend OAuth (Cloudflare)']
      },
      {
        id: 'pat',
        label: 'GitHub PAT',
        icon: '🔑',
        description: 'Simple, pour développement et tests',
        security: '⭐⭐⭐',
        features: ['Sync multi-appareils', 'Backup automatique', 'Configuration rapide'],
        requirements: ['Compte GitHub', 'Internet', 'Personal Access Token'],
        warnings: ['Moins sécurisé que OAuth', 'Token visible dans localStorage']
      },
      {
        id: 'local',
        label: 'Local (Offline)',
        icon: '🏠',
        description: 'Privé, fonctionne sans Internet',
        security: '⭐⭐⭐⭐',
        features: ['100% offline', 'Données privées', 'Pas de compte requis', 'Export/Import manuel'],
        requirements: ['Aucun compte', 'Navigateur moderne (IndexedDB)'],
        warnings: ['Pas de sync entre appareils', 'Backup manuel nécessaire', 'Données perdues si cache effacé']
      },
      {
        id: 'local-git',
        label: 'Local Git (Offline Pro)',
        icon: '🌿',
        description: 'Vrai Git dans le navigateur, offline ou sync optionnel',
        security: '⭐⭐⭐⭐⭐',
        features: ['100% offline', 'Vrai historique Git', 'Branches & commits', 'Diff & merge', 'Push/pull optionnel vers GitHub'],
        requirements: ['Aucun compte (mode offline)', 'Navigateur moderne (OPFS)', 'Token GitHub (si sync)'],
        warnings: ['Backup manuel recommandé', 'Performance dépend du navigateur']
      }
    ];
  }
}

// Export for ES6 modules
export default StorageManager;

// Export singleton for backward compatibility
if (typeof window !== 'undefined') {
  window.storageManager = new StorageManager();
}
