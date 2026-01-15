/**
 * Plugin System - Gestionnaire de plugins Pensine
 * Gère l'enregistrement, l'activation et la communication entre plugins
 *
 * Support @panini/plugin-interface v0.1.0:
 * - PaniniPlugin interface (activate/deactivate)
 * - PaniniPluginContext injection
 * - Namespace-based cleanup
 * - Legacy plugin backward compatibility
 */

import EventBus, { EVENTS } from './event-bus.js';
import { createPaniniContext, LegacyPluginAdapter } from './panini-wrappers.js';

class PluginSystem {
  constructor(eventBus, storageManager, configManager) {
    this.eventBus = eventBus || new EventBus();
    this.storageManager = storageManager;
    this.configManager = configManager; // New: ConfigManager for Panini context
    this.plugins = new Map();
    this.activePlugins = new Set();
    this.pluginConfigs = new Map();
    this.initialized = false;
    this.paniniContext = null; // Shared PaniniPluginContext
  }

  /**
   * Initialiser le système de plugins
   */
  async init() {
    if (this.initialized) {
      console.warn('⚠️ Plugin system already initialized');
      return;
    }

    console.log('🔌 Initializing plugin system...');

    // Create shared PaniniPluginContext
    this.paniniContext = createPaniniContext({
      eventBus: this.eventBus,
      configManager: this.configManager,
      storageManager: this.storageManager,
      features: {
        markdown: true,
        hotReload: false, // Enable in dev mode
        semanticSearch: false, // Future feature
        offline: this.storageManager?.mode === 'local' || this.storageManager?.mode === 'local-git'
      },
      logger: console,
      user: null // TODO: Get from auth system
    });

    // Charger config plugins depuis storage
    try {
      const config = await this.loadPluginConfigs();
      if (config && config.plugins) {
        Object.entries(config.plugins).forEach(([id, pluginConfig]) => {
          this.pluginConfigs.set(id, pluginConfig);
        });
      }
    } catch (error) {
      console.warn('⚠️ Could not load plugin configs:', error.message);
    }

    this.initialized = true;
    console.log('✅ Plugin system initialized with Panini context');
  }

  /**
   * Enregistrer un plugin
   * @param {Object} PluginClass - Classe du plugin
   * @param {Object} manifest - Métadonnées du plugin
   * @param {boolean} isPaniniPlugin - Si true, utilise PaniniPlugin interface; sinon legacy
   */
  async register(PluginClass, manifest, isPaniniPlugin = false) {
    const { id, name, version, dependencies = [] } = manifest;

    if (this.plugins.has(id)) {
      throw new Error(`Plugin "${id}" already registered`);
    }

    console.log(`🔌 Registering plugin: ${name} v${version} (${isPaniniPlugin ? 'Panini' : 'Legacy'})`);

    // Vérifier dépendances
    for (const dep of dependencies) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Plugin "${id}" requires "${dep}" which is not registered`);
      }
    }

    let plugin;

    if (isPaniniPlugin) {
      // New: PaniniPlugin interface
      plugin = new PluginClass();

      // Validate PaniniPlugin interface
      if (!plugin.manifest || !plugin.activate || !plugin.deactivate) {
        throw new Error(`Plugin "${id}" does not implement PaniniPlugin interface`);
      }
    } else {
      // Legacy: Old Pensine plugin style
      const legacyContext = this.createPluginContext(id);
      plugin = new PluginClass(manifest, legacyContext);

      // Wrap in adapter to provide PaniniPlugin interface
      plugin = new LegacyPluginAdapter(plugin, manifest);
    }

    // Stocker
    this.plugins.set(id, {
      id,
      manifest,
      plugin,
      context: isPaniniPlugin ? this.paniniContext : null,
      isPaniniPlugin,
      enabled: false
    });

    this.eventBus.emit(EVENTS['plugin:registered'], { id, name, version }, 'core');

    // Auto-activer si configuré
    const config = this.pluginConfigs.get(id);
    if (config && config.enabled !== false) {
      await this.enable(id);
    }

    return plugin;
  }

  /**
   * Créer contexte pour un plugin
   * @param {string} pluginId
   * @returns {Object}
   */
  createPluginContext(pluginId) {
    return {
      pluginId,

      // Storage API
      storage: this.createStorageAPI(pluginId),

      // Event Bus API
      events: {
        on: (event, callback) => {
          this.eventBus.on(event, callback, pluginId);
        },
        emit: (event, data) => {
          this.eventBus.emit(event, data, pluginId);
        },
        once: (event, callback) => {
          this.eventBus.once(event, callback, pluginId);
        },
        off: (event, callback) => {
          this.eventBus.off(event, callback);
        }
      },

      // UI API
      ui: this.createUIAPI(pluginId),

      // Config API
      config: {
        get: (key, defaultValue) => {
          const config = this.pluginConfigs.get(pluginId) || {};
          return config[key] !== undefined ? config[key] : defaultValue;
        },
        set: async (key, value) => {
          const config = this.pluginConfigs.get(pluginId) || {};
          config[key] = value;
          this.pluginConfigs.set(pluginId, config);
          await this.savePluginConfigs();
        },
        getAll: () => {
          return this.pluginConfigs.get(pluginId) || {};
        }
      },

      // Autres plugins
      getPlugin: (id) => {
        const pluginData = this.plugins.get(id);
        return pluginData ? pluginData.plugin : null;
      }
    };
  }

  /**
   * Créer API storage pour plugin
   * @param {string} pluginId
   * @returns {Object}
   */
  createStorageAPI(pluginId) {
    const basePath = `plugins/${pluginId}/`;

    return {
      read: async (path) => {
        const fullPath = basePath + path;
        return await this.storageManager.adapter.getFile(fullPath);
      },

      write: async (path, content) => {
        const fullPath = basePath + path;
        return await this.storageManager.adapter.saveFile(fullPath, content);
      },

      list: async (directory = '') => {
        const fullPath = basePath + directory;
        return await this.storageManager.adapter.listFiles(fullPath);
      },

      delete: async (path) => {
        const fullPath = basePath + path;
        return await this.storageManager.adapter.deleteFile(fullPath);
      },

      readJSON: async (path) => {
        const content = await this.read(path);
        return JSON.parse(content);
      },

      writeJSON: async (path, data) => {
        const content = JSON.stringify(data, null, 2);
        return await this.write(path, content);
      }
    };
  }

  /**
   * Créer API UI pour plugin
   * @param {string} pluginId
   * @returns {Object}
   */
  createUIAPI(pluginId) {
    return {
      // Création éléments
      createElement: (tag, className, content) => {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (content) el.innerHTML = content;
        return el;
      },

      // Sélecteurs
      querySelector: (selector) => document.querySelector(selector),
      querySelectorAll: (selector) => document.querySelectorAll(selector),

      // Notifications
      showToast: (message, type = 'info') => {
        console.log(`[${pluginId}] ${type.toUpperCase()}: ${message}`);
        // TODO: Implémenter UI toast
      },

      // Modals
      showModal: (title, content, options = {}) => {
        console.log(`[${pluginId}] Modal: ${title}`);
        // TODO: Implémenter UI modal
      },

      // Container principal
      getMainContainer: () => {
        return document.querySelector('#main-content') || document.body;
      }
    };
  }

  /**
   * Activer un plugin
   * @param {string} pluginId
   */
  async enable(pluginId) {
    const pluginData = this.plugins.get(pluginId);
    if (!pluginData) {
      throw new Error(`Plugin "${pluginId}" not found`);
    }

    if (this.activePlugins.has(pluginId)) {
      console.warn(`⚠️ Plugin "${pluginId}" already enabled`);
      return;
    }

    console.log(`✅ Enabling plugin: ${pluginData.manifest.name}`);

    try {
      if (pluginData.isPaniniPlugin) {
        // New: Call PaniniPlugin.activate(context)
        console.log(`[PluginSystem] Calling activate() on Panini plugin`);
        console.log(`[PluginSystem] Plugin:`, pluginData.plugin);
        console.log(`[PluginSystem] Context:`, this.paniniContext);
        await pluginData.plugin.activate(this.paniniContext);
      } else {
        // Legacy: Call enable() if exists
        console.log(`[PluginSystem] Calling enable() on Legacy plugin`);
        if (pluginData.plugin.enable) {
          await pluginData.plugin.enable();
        }
      }

      this.activePlugins.add(pluginId);
      pluginData.enabled = true;

      this.eventBus.emit(EVENTS['plugin:enabled'], {
        id: pluginId,
        name: pluginData.manifest.name
      }, 'core');
    } catch (error) {
      console.error(`❌ Failed to enable plugin "${pluginId}":`, error);
      throw error;
    }
  }

  /**
   * Désactiver un plugin
   * @param {string} pluginId
   */
  async disable(pluginId) {
    const pluginData = this.plugins.get(pluginId);
    if (!pluginData) {
      throw new Error(`Plugin "${pluginId}" not found`);
    }

    if (!this.activePlugins.has(pluginId)) {
      console.warn(`⚠️ Plugin "${pluginId}" not enabled`);
      return;
    }

    console.log(`🔌 Disabling plugin: ${pluginData.manifest.name}`);

    try {
      if (pluginData.isPaniniPlugin) {
        // New: Call PaniniPlugin.deactivate()
        // This will auto-cleanup via clearNamespace()
        await pluginData.plugin.deactivate();
      } else {
        // Legacy: Call disable() if exists
        if (pluginData.plugin.disable) {
          await pluginData.plugin.disable();
        }
        // Manual cleanup for legacy plugins
        this.eventBus.removeAllListeners(pluginId);
      }

      this.activePlugins.delete(pluginId);
      pluginData.enabled = false;

      this.eventBus.emit(EVENTS['plugin:disabled'], {
        id: pluginId,
        name: pluginData.manifest.name
      }, 'core');
    } catch (error) {
      console.error(`❌ Failed to disable plugin "${pluginId}":`, error);
      throw error;
    }
  }

  /**
   * Obtenir plugin par ID
   * @param {string} pluginId
   * @returns {Object|null}
   */
  getPlugin(pluginId) {
    const pluginData = this.plugins.get(pluginId);
    return pluginData ? pluginData.plugin : null;
  }

  /**
   * Enregistrer un plugin Panini (raccourci)
   * @param {PaniniPlugin} PluginClass - Classe implémentant PaniniPlugin
   */
  async registerPaniniPlugin(PluginClass) {
    // Instantiate to get manifest
    const instance = new PluginClass();
    const manifest = instance.manifest;

    if (!manifest || !manifest.id) {
      throw new Error('PaniniPlugin must have manifest with id');
    }

    return await this.register(PluginClass, manifest, true);
  }

  /**
   * Health check pour tous les plugins actifs
   * @returns {Object} Status de chaque plugin
   */
  async healthCheckAll() {
    const results = {};

    for (const pluginId of this.activePlugins) {
      const pluginData = this.plugins.get(pluginId);
      if (!pluginData) continue;

      try {
        if (pluginData.isPaniniPlugin && pluginData.plugin.healthCheck) {
          results[pluginId] = await pluginData.plugin.healthCheck();
        } else {
          results[pluginId] = true; // Legacy assume healthy if enabled
        }
      } catch (error) {
        results[pluginId] = false;
        console.error(`Health check failed for ${pluginId}:`, error);
      }
    }

    return results;
  }

  /**
   * Obtenir tous les plugins enregistrés
   * @returns {Array}
   */
  getAllPlugins() {
    return Array.from(this.plugins.values()).map(({ id, manifest, enabled, isPaniniPlugin }) => ({
      id,
      name: manifest.name,
      version: manifest.version,
      enabled,
      type: isPaniniPlugin ? 'panini' : 'legacy'
    }));
  }

  /**
   * Obtenir plugins actifs
   * @returns {Array}
   */
  getActivePlugins() {
    return Array.from(this.activePlugins);
  }

  /**
   * Charger configs plugins depuis storage
   * @returns {Object}
   */
  async loadPluginConfigs() {
    try {
      const configPath = '.pensine-config.json';
      const result = await this.storageManager.adapter.getFile(configPath);
      return JSON.parse(result.content);
    } catch (error) {
      console.warn('No plugin config found, using defaults');
      return { plugins: {} };
    }
  }

  /**
   * Sauvegarder configs plugins
   */
  async savePluginConfigs() {
    try {
      const configPath = '.pensine-config.json';

      // Lire config existante
      let config = {};
      try {
        const result = await this.storageManager.adapter.getFile(configPath);
        config = JSON.parse(result.content);
      } catch (e) {
        // Fichier n'existe pas encore
      }

      // Mettre à jour section plugins
      config.plugins = {};
      this.pluginConfigs.forEach((pluginConfig, pluginId) => {
        config.plugins[pluginId] = pluginConfig;
      });

      // Sauvegarder
      await this.storageManager.adapter.saveFile(
        configPath,
        JSON.stringify(config, null, 2)
      );
    } catch (error) {
      console.error('Failed to save plugin configs:', error);
    }
  }

  /**
   * Obtenir statistiques
   * @returns {Object}
   */
  getStats() {
    return {
      totalPlugins: this.plugins.size,
      activePlugins: this.activePlugins.size,
      eventBusStats: this.eventBus.getStats()
    };
  }
}

export default PluginSystem;
