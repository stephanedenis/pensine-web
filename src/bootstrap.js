/**
 * Pensine Bootstrap - Minimal Loader
 *
 * Responsabilités :
 * 1. Détecter présence configuration locale (bootstrap.json)
 * 2. Si absente/invalide → afficher wizard
 * 3. Si présente → charger storage + config remote
 * 4. Charger plugin system
 * 5. Découvrir et activer plugins configurés
 */

/**
 * BootLogger - Console de boot style Linux
 */
class BootLogger {
  constructor() {
    this.startTime = Date.now();
    this.container = document.getElementById('boot-console-content');
    this.lineCount = 0;
  }

  getTimestamp() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(3);
    return `[${elapsed.padStart(8)}]`;
  }

  log(message, type = 'info', badge = null) {
    // Log console standard
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍'
    }[type] || 'ℹ️';
    console.log(`${emoji} ${message}`);

    // Log console visuelle
    if (!this.container) return;

    const line = document.createElement('div');
    line.className = `boot-line ${type}`;

    let badgeHtml = '';
    if (badge) {
      badgeHtml = `<span class="badge badge-${badge.type}">${badge.text}</span>`;
    }

    line.innerHTML = `<span class="timestamp">${this.getTimestamp()}</span>${badgeHtml}${this.escapeHtml(message)}`;

    this.container.appendChild(line);
    this.lineCount++;

    // Auto-scroll
    this.container.scrollTop = this.container.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  ok(message) {
    this.log(message, 'success', { type: 'ok', text: ' OK ' });
  }

  fail(message) {
    this.log(message, 'error', { type: 'fail', text: 'FAIL' });
  }

  wait(message) {
    this.log(message, 'info', { type: 'wait', text: 'WAIT' });
  }

  info(message) {
    this.log(message, 'info', { type: 'info', text: 'INFO' });
  }

  warn(message) {
    this.log(message, 'warning');
  }

  error(message, error) {
    this.log(`${message}: ${error?.message || error}`, 'error');
    if (error?.stack) {
      this.log(error.stack, 'debug');
    }
  }

  debug(message) {
    this.log(message, 'debug');
  }

  step(step, total, message) {
    this.log(`[${step}/${total}] ${message}`, 'info');
  }
}

class PensineBootstrap {
  constructor() {
    this.config = null;
    this.storageAdapter = null;
    this.pluginSystem = null;
    this.logger = new BootLogger();

    // Promise pour synchroniser avec app.js
    this.readyPromise = null;
    this.resolveReady = null;
    this.isReady = false;
  }

  /**
   * Point d'entrée principal
   */
  async init() {
    // Créer Promise pour synchronisation
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
    window.bootstrapReady = this.readyPromise;

    this.logger.step(1, 6, 'Bootstrap initialization');

    // Étape 1: Charger configuration locale
    this.logger.wait('Loading local configuration...');
    const localConfig = this.loadLocalConfig();

    if (!localConfig || !this.isValidConfig(localConfig)) {
      this.logger.warn('No valid local config - showing wizard');
      await this.showWizard();
      return;
    }

    this.config = localConfig;
    this.logger.ok(`Local config loaded: ${localConfig.storageMode} mode`);

    // Étape 2: Initialiser storage
    this.logger.step(2, 6, 'Storage initialization');
    try {
      await this.initializeStorage(localConfig);
    } catch (error) {
      this.logger.fail('Storage initialization failed');
      this.logger.error('Error', error);
      await this.showWizard();
      return;
    }

    // Étape 3: Charger configuration remote
    this.logger.step(3, 6, 'Loading remote configuration');
    try {
      await this.loadRemoteConfig();
    } catch (error) {
      this.logger.warn('Could not load remote config, using defaults');
    }

    // Étape 4: Initialiser plugin system
    this.logger.step(4, 6, 'Plugin system initialization');
    await this.initializePluginSystem();

    // Étape 5: Charger et activer plugins
    this.logger.step(5, 6, 'Loading and activating plugins');
    await this.loadPlugins();

    // Étape 6: Marquer comme prêt
    this.logger.step(6, 6, 'Finalizing bootstrap');
    this.markReady();
  }

  /**
   * Charger configuration locale depuis localStorage
   * Format: { storageMode, credentials, version }
   */
  loadLocalConfig() {
    try {
      // Load full config from pensine-config (not just bootstrap metadata)
      const raw = localStorage.getItem('pensine-config');
      if (!raw) {
        this.logger.debug('No pensine-config in localStorage');
        return null;
      }
      const config = JSON.parse(raw);
      this.logger.debug('Loaded config:', { storageMode: config.storageMode, hasCredentials: !!config.credentials });
      return config;
    } catch (error) {
      this.logger.error('Failed to parse local config', error);
      return null;
    }
  }

  /**
   * Valider configuration locale
   */
  isValidConfig(config) {
    if (!config || !config.storageMode) {
      this.logger.debug('Invalid config: missing storageMode');
      return false;
    }

    switch (config.storageMode) {
      case 'github':
        const hasGitHub = config.credentials?.token && config.credentials?.owner && config.credentials?.repo;
        if (!hasGitHub) this.logger.debug('Invalid GitHub credentials');
        return hasGitHub;
      case 'local-git':
        const hasLocalGit = config.credentials?.repoPath;
        if (!hasLocalGit) this.logger.debug('Invalid local-git credentials');
        return hasLocalGit;
      case 'local':
        return true; // localStorage seul
      default:
        this.logger.debug(`Unknown storage mode: ${config.storageMode}`);
        return false;
    }
  }

  /**
   * Afficher le wizard de configuration
   */
  async showWizard() {
    this.logger.info('Configuration wizard required');

    try {
      // ConfigWizard is loaded as a global (classic script)
      this.logger.wait('Loading wizard...');
      if (!window.ConfigWizard) {
        throw new Error('ConfigWizard not loaded');
      }
      const ConfigWizard = window.ConfigWizard;
      this.logger.ok('Wizard loaded');

      // Créer container wizard si absent
      let wizardContainer = document.getElementById('wizard-container');
      if (!wizardContainer) {
        wizardContainer = document.createElement('div');
        wizardContainer.id = 'wizard-container';
        document.body.appendChild(wizardContainer);
      }

      // Cacher loading
      const loading = document.getElementById('loading');
      if (loading) {
        loading.classList.add('hidden');
      }

      // Instancier wizard
      const wizard = new ConfigWizard();
      wizard.onComplete = async (config) => {
        console.log('✅ Wizard completed, saving config');
        // Sauvegarder config locale
        this.saveLocalConfig(config);

        // Recharger l'app
        window.location.reload();
      };

      await wizard.show();
      console.log('✅ Wizard displayed');
    } catch (error) {
      console.error('❌ Failed to load wizard:', error);
      // Fallback: afficher message d'erreur
      const loading = document.getElementById('loading');
      if (loading) {
        loading.innerHTML = `
                    <div style="color: red;">
                        <h2>❌ Erreur de chargement</h2>
                        <p>${error.message}</p>
                        <button onclick="location.reload()">Réessayer</button>
                    </div>
                `;
      }
    }
  }

  /**
   * Sauvegarder configuration locale
   */
  saveLocalConfig(config) {
    const bootstrap = {
      storageMode: config.storageMode,
      credentials: config.credentials,
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('pensine-bootstrap', JSON.stringify(bootstrap));
    this.logger.ok('Local config saved to localStorage');
  }

  /**
   * Initialiser le storage adapter
   */
  async initializeStorage(config) {
    this.logger.wait(`Initializing ${config.storageMode} storage adapter...`);

    const { default: StorageManager } = await import('../src/lib/components/storage-manager-unified.js');
    this.logger.debug('StorageManager module imported');

    window.storageManager = new StorageManager();
    this.logger.debug('StorageManager instance created');

    await window.storageManager.initialize(config);
    this.logger.debug('StorageManager.initialize() completed');

    this.storageAdapter = window.storageManager.adapter;
    this.logger.ok(`Storage initialized: ${config.storageMode} (adapter ready)`);
  }

  /**
   * Charger configuration remote depuis .pensine-config.json
   */
  async loadRemoteConfig() {
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }

    try {
      this.logger.wait('Fetching .pensine-config.json from storage...');
      const configFile = await this.storageAdapter.getFile('.pensine-config.json');
      const remoteConfig = JSON.parse(configFile.content);
      this.logger.debug(`Remote config: ${configFile.content.length} bytes`);

      // Merger avec config locale (remote a priorité pour plugins)
      this.config = {
        ...this.config,
        plugins: remoteConfig.plugins || {},
        settings: remoteConfig.settings || {}
      };

      const pluginCount = Object.keys(this.config.plugins).length;
      this.logger.ok(`Remote config loaded: ${pluginCount} plugin(s) configured`);
    } catch (error) {
      // Fichier n'existe pas encore - utiliser defaults
      this.logger.info('No remote config found, using defaults');
      this.config.plugins = {};
      this.config.settings = {};
    }
  }

  /**
   * Initialiser plugin system
   */
  async initializePluginSystem() {
    this.logger.wait('Importing core modules (EventBus, PluginSystem, ConfigManager)...');
    const { default: EventBus } = await import('../src/core/event-bus.js');
    const { default: PluginSystem } = await import('../src/core/plugin-system.js');
    const { default: ConfigManager } = await import('../src/core/config-manager.js');
    this.logger.debug('Core modules imported');

    this.logger.wait('Creating EventBus instance...');
    window.eventBus = new EventBus();
    this.logger.debug('EventBus created');

    this.logger.wait('Creating ConfigManager instance...');
    window.configManager = new ConfigManager(
      window.storageManager,
      window.eventBus
    );
    await window.configManager.init();
    this.logger.debug('ConfigManager initialized');

    this.logger.wait('Creating PluginSystem instance...');
    window.pluginSystem = new PluginSystem(
      window.eventBus,
      window.storageManager,
      window.configManager
    );
    await window.pluginSystem.init();
    this.logger.debug('PluginSystem initialized');

    this.logger.ok('Plugin system ready');
  }

  /**
   * Découvrir et charger plugins configurés
   */
  async loadPlugins() {
    const enabledPlugins = this.getEnabledPlugins();

    this.logger.info(`Found ${enabledPlugins.length} enabled plugin(s)`);

    if (enabledPlugins.length === 0) {
      this.logger.warn('No plugins configured - app will be empty');
      return;
    }

    for (const pluginConfig of enabledPlugins) {
      try {
        await this.loadPlugin(pluginConfig);
      } catch (error) {
        this.logger.fail(`Plugin ${pluginConfig.id} failed to load`);
        this.logger.error('Error', error);
      }
    }

    this.logger.ok(`All plugins processed (${enabledPlugins.length} total)`);
  }

  /**
   * Obtenir liste des plugins activés depuis config
   */
  getEnabledPlugins() {
    if (!this.config.plugins) return [];

    return Object.entries(this.config.plugins)
      .filter(([id, config]) => config.enabled !== false)
      .map(([id, config]) => ({
        id,
        ...config
      }));
  }

  /**
   * Charger et activer un plugin
   */
  async loadPlugin(pluginConfig) {
    const { id, source, path } = pluginConfig;

    this.logger.wait(`Loading plugin: ${id}`);

    // Déterminer source du plugin
    let pluginPath;
    if (path) {
      // Chemin custom fourni explicitement
      pluginPath = path;
    } else if (source === 'local') {
      // Path from src/ to root plugins/
      pluginPath = `../plugins/pensine-plugin-${id}/${id}-plugin.js`;
    } else if (source === 'cdn') {
      pluginPath = `https://unpkg.com/pensine-plugin-${id}@latest/${id}-plugin.js`;
    } else if (source) {
      pluginPath = source; // URL custom
    } else {
      // Default: local
      pluginPath = `../plugins/pensine-plugin-${id}/${id}-plugin.js`;
    }

    this.logger.debug(`Plugin path: ${pluginPath}`);

    // Import plugin
    this.logger.wait(`Importing module: ${pluginPath}`);
    const { default: PluginClass } = await import(pluginPath);
    this.logger.debug(`Module imported: ${PluginClass.name || 'anonymous'}`);

    // Créer manifest
    const manifest = {
      id,
      name: pluginConfig.name || id,
      version: pluginConfig.version || '0.1.0',
      icon: pluginConfig.icon || '🔌'
    };
    this.logger.debug(`Manifest created: ${manifest.name} v${manifest.version}`);

    // Détecter type de plugin (Panini vs Legacy)
    // PaniniPlugin a : activate, deactivate methods (pas de constructor context param)
    // Legacy a : enable method + prend context en constructor
    const isPaniniPlugin = PluginClass.prototype &&
      typeof PluginClass.prototype.activate === 'function';
    this.logger.debug(`Plugin type: ${isPaniniPlugin ? 'Panini (activate/deactivate)' : 'Legacy (enable)'}`);

    // Enregistrer plugin
    this.logger.wait(`Registering plugin in PluginSystem...`);
    await window.pluginSystem.register(PluginClass, manifest, isPaniniPlugin);
    this.logger.debug(`Plugin registered: ${id}`);

    // Activer plugin
    const context = {
      storage: window.storageManager,
      events: window.eventBus,
      config: window.configManager,
      router: window.router || null
    };
    this.logger.debug(`Context prepared: storage=${!!context.storage}, events=${!!context.events}, config=${!!context.config}, router=${!!context.router}`);

    this.logger.wait(`Enabling plugin via PluginSystem.enable("${id}", context)...`);
    await window.pluginSystem.enable(id, context);

    this.logger.ok(`Plugin "${id}" loaded and activated`);
  }

  /**
   * Marquer l'application comme prête
   */
  markReady() {
    this.logger.wait('Finalizing app initialization...');

    // Cacher loading indicator
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
      this.logger.debug('Loading indicator hidden');
    }

    // Afficher app container
    const app = document.getElementById('app');
    if (app) {
      app.classList.remove('hidden');
      this.logger.debug('App container visible');
    }

    // Marquer comme prêt AVANT d'émettre events
    this.isReady = true;

    // Exposer references globales pour app.js
    window.modernConfigManager = window.configManager;
    this.logger.debug('Global references exposed: modernConfigManager');

    // Résoudre la promise
    if (this.resolveReady) {
      this.resolveReady({
        storageManager: window.storageManager,
        eventBus: window.eventBus,
        pluginSystem: window.pluginSystem,
        configManager: window.configManager
      });
      this.logger.debug('bootstrapReady promise resolved');
    }

    // Émettre événements
    window.eventBus?.emit('bootstrap:complete');
    this.logger.debug('Event "bootstrap:complete" emitted');

    window.eventBus?.emit('app:ready');
    this.logger.debug('Event "app:ready" emitted');

    this.logger.ok('🎉 Pensine ready - All systems operational');
  }
}

// Auto-start au chargement DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.pensineBootstrap = new PensineBootstrap();
    window.pensineBootstrap.init().catch(console.error);
  });
} else {
  window.pensineBootstrap = new PensineBootstrap();
  window.pensineBootstrap.init().catch(console.error);
}

export default PensineBootstrap;
