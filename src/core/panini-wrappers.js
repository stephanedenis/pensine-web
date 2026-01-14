/**
 * Panini Wrappers - Adapters pour utiliser @panini/plugin-interface
 * 
 * Adapte les systèmes existants de Pensine (EventBus, ConfigManager, StorageManager)
 * pour implémenter les interfaces de @panini/plugin-interface
 * 
 * @version 1.0.0
 */

/**
 * PaniniEventBusWrapper
 * Adapte EventBus Pensine vers interface PaniniPluginContext.events
 */
export class PaniniEventBusWrapper {
  constructor(pensineEventBus) {
    this.eventBus = pensineEventBus;
    this.namespaces = new Map(); // Track handlers by namespace
  }

  /**
   * Subscribe to event with namespace support
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {string} namespace - Plugin namespace for cleanup
   */
  on(event, handler, namespace) {
    // Store handler reference with namespace
    if (namespace) {
      if (!this.namespaces.has(namespace)) {
        this.namespaces.set(namespace, []);
      }
      this.namespaces.get(namespace).push({ event, handler });
    }

    // Register with Pensine EventBus
    this.eventBus.on(event, handler, namespace || 'core');
  }

  /**
   * Subscribe once with namespace support
   */
  once(event, handler, namespace) {
    const wrappedHandler = (...args) => {
      handler(...args);
      // Remove from namespace tracking
      if (namespace) {
        const handlers = this.namespaces.get(namespace) || [];
        const index = handlers.findIndex(h => h.event === event && h.handler === wrappedHandler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };

    if (namespace) {
      if (!this.namespaces.has(namespace)) {
        this.namespaces.set(namespace, []);
      }
      this.namespaces.get(namespace).push({ event, handler: wrappedHandler });
    }

    this.eventBus.once(event, wrappedHandler, namespace || 'core');
  }

  /**
   * Unsubscribe from event
   */
  off(event, handler, namespace) {
    this.eventBus.off(event, handler);

    // Remove from namespace tracking
    if (namespace) {
      const handlers = this.namespaces.get(namespace) || [];
      const index = handlers.findIndex(h => h.event === event && h.handler === handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  emit(event, data) {
    this.eventBus.emit(event, data, 'plugin');
  }

  /**
   * Clear all handlers for a namespace
   * This is the key feature for PaniniPlugin cleanup!
   */
  clearNamespace(namespace) {
    const handlers = this.namespaces.get(namespace);
    if (!handlers) return;

    // Remove all handlers for this namespace
    handlers.forEach(({ event, handler }) => {
      this.eventBus.off(event, handler);
    });

    // Clear namespace tracking
    this.namespaces.delete(namespace);

    console.log(`[PaniniWrapper] Cleared ${handlers.length} handlers for namespace: ${namespace}`);
  }
}

/**
 * PaniniConfigManagerWrapper
 * Adapte ConfigManager Pensine vers interface PaniniPluginContext.config
 */
export class PaniniConfigManagerWrapper {
  constructor(pensineConfigManager) {
    this.configManager = pensineConfigManager;
  }

  /**
   * Get core application config
   */
  getCoreConfig() {
    return this.configManager.getCoreConfig();
  }

  /**
   * Set core application config
   */
  async setCoreConfig(config) {
    return await this.configManager.setCoreConfig(config);
  }

  /**
   * Get plugin-specific config
   */
  getPluginConfig(pluginId) {
    return this.configManager.getPluginConfig(pluginId);
  }

  /**
   * Set plugin-specific config
   */
  async setPluginConfig(pluginId, config) {
    return await this.configManager.setPluginConfig(pluginId, config, false);
  }

  /**
   * Register JSON Schema for plugin config validation
   */
  registerSchema(pluginId, schema, defaults) {
    this.configManager.registerPluginSchema(pluginId, schema, defaults);
  }

  /**
   * Validate config against schema
   */
  validate(pluginId, config) {
    const schema = this.configManager.getPluginSchema(pluginId);
    if (!schema) {
      return { valid: true };
    }
    return this.configManager.validateConfig(config, schema);
  }

  /**
   * Check if config is loaded
   */
  isLoaded() {
    return this.configManager.loaded;
  }
}

/**
 * PaniniStorageAdapterWrapper
 * Adapte StorageManager Pensine vers interface PaniniPluginContext.storage
 */
export class PaniniStorageAdapterWrapper {
  constructor(pensineStorageManager) {
    this.storageManager = pensineStorageManager;
    this.adapter = pensineStorageManager.adapter;
  }

  /**
   * Get adapter name
   */
  get name() {
    if (!this.adapter) return 'uninitialized';
    
    // Detect adapter type
    if (this.storageManager.mode === 'oauth' || this.storageManager.mode === 'pat') {
      return 'github';
    } else if (this.storageManager.mode === 'local-git') {
      return 'local-git';
    } else if (this.storageManager.mode === 'local') {
      return 'local-storage';
    }
    
    return 'unknown';
  }

  /**
   * Initialize adapter
   */
  async initialize(config) {
    return await this.storageManager.initialize();
  }

  /**
   * Check if configured
   */
  isConfigured() {
    return this.adapter && this.adapter.isConfigured();
  }

  /**
   * Read file content
   */
  async readFile(path) {
    try {
      const result = await this.adapter.getFile(path);
      return result.content || result;
    } catch (error) {
      console.error(`[PaniniStorage] Error reading ${path}:`, error);
      throw new Error(`Failed to read file: ${path}`);
    }
  }

  /**
   * Write file content
   */
  async writeFile(path, content, message) {
    try {
      return await this.adapter.saveFile(path, content, message);
    } catch (error) {
      console.error(`[PaniniStorage] Error writing ${path}:`, error);
      throw new Error(`Failed to write file: ${path}`);
    }
  }

  /**
   * Delete file
   */
  async deleteFile(path, message) {
    try {
      return await this.adapter.deleteFile(path, message);
    } catch (error) {
      console.error(`[PaniniStorage] Error deleting ${path}:`, error);
      throw new Error(`Failed to delete file: ${path}`);
    }
  }

  /**
   * List files in directory
   */
  async listFiles(path) {
    try {
      const files = await this.adapter.listFiles(path);
      return files.map(f => f.path || f);
    } catch (error) {
      console.error(`[PaniniStorage] Error listing ${path}:`, error);
      return [];
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(path) {
    try {
      await this.adapter.getFile(path);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata (optional)
   */
  async getFileMetadata(path) {
    try {
      const result = await this.adapter.getFile(path);
      return {
        path,
        size: result.content ? result.content.length : 0,
        created: result.createdAt ? new Date(result.createdAt) : new Date(),
        modified: result.updatedAt ? new Date(result.updatedAt) : new Date(),
        sha: result.sha
      };
    } catch (error) {
      console.error(`[PaniniStorage] Error getting metadata for ${path}:`, error);
      throw new Error(`Failed to get metadata: ${path}`);
    }
  }

  /**
   * Semantic search (optional, not implemented yet)
   */
  async semanticSearch(query) {
    console.warn('[PaniniStorage] semanticSearch not implemented yet');
    return [];
  }
}

/**
 * Create PaniniPluginContext from Pensine systems
 * 
 * @param {Object} options
 * @param {EventBus} options.eventBus - Pensine EventBus
 * @param {ConfigManager} options.configManager - Pensine ConfigManager
 * @param {StorageManager} options.storageManager - Pensine StorageManager
 * @param {Object} options.features - Feature flags
 * @param {Object} options.logger - Logger instance (default: console)
 * @param {Object} options.user - User info (optional)
 * @returns {PaniniPluginContext}
 */
export function createPaniniContext({
  eventBus,
  configManager,
  storageManager,
  features = {},
  logger = console,
  user = null
}) {
  // Create wrappers
  const wrappedEventBus = new PaniniEventBusWrapper(eventBus);
  const wrappedConfig = new PaniniConfigManagerWrapper(configManager);
  const wrappedStorage = new PaniniStorageAdapterWrapper(storageManager);

  // Build context matching PaniniPluginContext interface
  return {
    app: 'pensine',
    version: '1.0.0', // TODO: Get from package.json or config
    events: wrappedEventBus,
    config: wrappedConfig,
    storage: wrappedStorage,
    features: {
      markdown: true,
      hotReload: false,
      semanticSearch: false,
      offline: storageManager.mode === 'local' || storageManager.mode === 'local-git',
      ...features
    },
    logger,
    user
  };
}

/**
 * Convert legacy Pensine plugin to PaniniPlugin
 * 
 * Wraps old-style Pensine plugins to work with new PaniniPlugin interface
 */
export class LegacyPluginAdapter {
  constructor(legacyPlugin, manifest) {
    this.legacyPlugin = legacyPlugin;
    this.manifest = manifest;
    this.context = null;
  }

  /**
   * Activate plugin (PaniniPlugin interface)
   */
  async activate(context) {
    this.context = context;

    // Call legacy enable() if exists
    if (this.legacyPlugin.enable && typeof this.legacyPlugin.enable === 'function') {
      await this.legacyPlugin.enable();
    }

    context.logger.info(`[PaniniAdapter] Legacy plugin ${this.manifest.id} activated`);
  }

  /**
   * Deactivate plugin (PaniniPlugin interface)
   */
  async deactivate() {
    // Call legacy disable() if exists
    if (this.legacyPlugin.disable && typeof this.legacyPlugin.disable === 'function') {
      await this.legacyPlugin.disable();
    }

    // Auto cleanup via context
    if (this.context) {
      this.context.events.clearNamespace(this.manifest.id);
    }

    this.context = null;
  }

  /**
   * Health check (optional)
   */
  async healthCheck() {
    return this.context !== null;
  }
}

/**
 * Helper: Convert Pensine EVENTS to PaniniEvents constants
 */
export function mapPensineEvents() {
  return {
    // App lifecycle
    APP_READY: 'app:ready',
    APP_ERROR: 'app:error',

    // Plugins
    PLUGIN_ACTIVATED: 'plugin:enabled',
    PLUGIN_DEACTIVATED: 'plugin:disabled',
    PLUGIN_ERROR: 'plugin:error',

    // Config
    CONFIG_CHANGED: 'config:plugin-updated',
    CONFIG_SAVED: 'config:saved',

    // Storage
    STORAGE_READY: 'storage:initialized',
    STORAGE_ERROR: 'storage:error',

    // Files
    FILE_OPENED: 'journal:entry-open',
    FILE_SAVED: 'journal:entry-save',
    FILE_DELETED: 'journal:entry-delete',

    // Markdown (custom, not in Pensine yet)
    MARKDOWN_RENDER: 'markdown:render',
    MARKDOWN_RENDERED: 'markdown:rendered',

    // UI
    UI_THEME_CHANGED: 'ui:theme-change',
    UI_MODAL_OPENED: 'ui:modal-open',
    UI_MODAL_CLOSED: 'ui:modal-close'
  };
}

export default {
  PaniniEventBusWrapper,
  PaniniConfigManagerWrapper,
  PaniniStorageAdapterWrapper,
  createPaniniContext,
  LegacyPluginAdapter,
  mapPensineEvents
};
