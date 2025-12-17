/**
 * Plugin System - Gestionnaire de plugins Pensine
 * Gère l'enregistrement, l'activation et la communication entre plugins
 */

import EventBus, { EVENTS } from './event-bus.js';

class PluginSystem {
  constructor(eventBus, storageManager) {
    this.eventBus = eventBus || new EventBus();
    this.storageManager = storageManager;
    this.plugins = new Map();
    this.activePlugins = new Set();
    this.pluginConfigs = new Map();
    this.initialized = false;
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
    console.log('✅ Plugin system initialized');
  }

  /**
   * Enregistrer un plugin
   * @param {Object} PluginClass - Classe du plugin
   * @param {Object} manifest - Métadonnées du plugin
   */
  async register(PluginClass, manifest) {
    const { id, name, version, dependencies = [] } = manifest;

    if (this.plugins.has(id)) {
      throw new Error(`Plugin "${id}" already registered`);
    }

    console.log(`🔌 Registering plugin: ${name} v${version}`);

    // Vérifier dépendances
    for (const dep of dependencies) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Plugin "${id}" requires "${dep}" which is not registered`);
      }
    }

    // Créer contexte plugin
    const context = this.createPluginContext(id);

    // Instancier plugin
    const plugin = new PluginClass(manifest, context);

    // Stocker
    this.plugins.set(id, {
      id,
      manifest,
      plugin,
      context,
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

    // Appeler lifecycle hook
    if (pluginData.plugin.enable) {
      await pluginData.plugin.enable();
    }

    this.activePlugins.add(pluginId);
    pluginData.enabled = true;

    this.eventBus.emit(EVENTS['plugin:enabled'], {
      id: pluginId,
      name: pluginData.manifest.name
    }, 'core');
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

    // Appeler lifecycle hook
    if (pluginData.plugin.disable) {
      await pluginData.plugin.disable();
    }

    // Nettoyer event listeners
    this.eventBus.removeAllListeners(pluginId);

    this.activePlugins.delete(pluginId);
    pluginData.enabled = false;

    this.eventBus.emit(EVENTS['plugin:disabled'], {
      id: pluginId,
      name: pluginData.manifest.name
    }, 'core');
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
   * Obtenir tous les plugins enregistrés
   * @returns {Array}
   */
  getAllPlugins() {
    return Array.from(this.plugins.values()).map(({ id, manifest, enabled }) => ({
      id,
      name: manifest.name,
      version: manifest.version,
      enabled
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
