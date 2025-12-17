/**
 * ConfigManager - Gestion centralisée de la configuration par plugin
 *
 * Responsabilités:
 * - Charger/sauvegarder configuration depuis storage (.pensine-config.json)
 * - Valider configuration selon schémas JSON Schema des plugins
 * - Fournir API pour accès à la config par plugin
 * - Gérer les valeurs par défaut
 * - Émettre événements lors des changements
 *
 * Structure de .pensine-config.json:
 * {
 *   "core": { ... },        // Config globale de l'app
 *   "plugins": {
 *     "calendar": { ... },   // Config spécifique au plugin calendar
 *     "inbox": { ... },      // Config spécifique au plugin inbox
 *     ...
 *   }
 * }
 *
 * @version 1.0.0
 */

export default class ConfigManager {
  /**
   * @param {Object} storage - StorageManager instance
   * @param {Object} eventBus - EventBus instance
   */
  constructor(storage, eventBus) {
    this.storage = storage;
    this.eventBus = eventBus;

    // Configuration chargée en mémoire
    this.config = {
      core: {},
      plugins: {}
    };

    // Schémas de validation par plugin
    this.schemas = new Map();

    // Valeurs par défaut par plugin
    this.defaults = new Map();

    // État de chargement
    this.loaded = false;
    this.loading = false;
  }

  /**
   * Initialiser le gestionnaire
   */
  async init() {
    if (this.loaded || this.loading) return;

    this.loading = true;
    console.log('[ConfigManager] Initializing...');

    try {
      // Charger la configuration depuis le storage
      await this.load();

      this.loaded = true;
      this.loading = false;

      console.log('[ConfigManager] Initialized successfully');
      this.eventBus.emit('config:loaded', { config: this.config });
    } catch (error) {
      this.loading = false;
      console.error('[ConfigManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Enregistrer le schéma et les valeurs par défaut d'un plugin
   *
   * @param {string} pluginId - ID du plugin
   * @param {Object} schema - JSON Schema de la configuration
   * @param {Object} defaults - Valeurs par défaut
   */
  registerPluginSchema(pluginId, schema, defaults = {}) {
    if (!pluginId) {
      throw new Error('pluginId is required');
    }

    this.schemas.set(pluginId, schema);
    this.defaults.set(pluginId, defaults);

    // Initialiser la config du plugin avec les defaults si elle n'existe pas
    if (!this.config.plugins[pluginId]) {
      this.config.plugins[pluginId] = { ...defaults };
      console.log(`[ConfigManager] Registered schema for plugin: ${pluginId}`);
    }
  }

  /**
   * Charger la configuration depuis le storage
   */
  async load() {
    try {
      const configPath = '.pensine-config.json';

      // Vérifier si le fichier existe
      const files = await this.storage.list('/');
      const configExists = files.some(f => f.path === configPath);

      if (!configExists) {
        console.log('[ConfigManager] No config file found, using defaults');
        this.config = this.getDefaultConfig();
        return;
      }

      // Charger le fichier
      const content = await this.storage.readJSON(configPath);

      if (!content || typeof content !== 'object') {
        console.warn('[ConfigManager] Invalid config file, using defaults');
        this.config = this.getDefaultConfig();
        return;
      }

      // Merger avec la config existante (preserves registered schemas)
      this.config.core = { ...this.config.core, ...(content.core || {}) };
      this.config.plugins = { ...this.config.plugins, ...(content.plugins || {}) };

      console.log('[ConfigManager] Configuration loaded from storage');
    } catch (error) {
      console.error('[ConfigManager] Error loading config:', error);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Sauvegarder la configuration dans le storage
   */
  async save() {
    try {
      const configPath = '.pensine-config.json';

      // Sérialiser avec indentation pour lisibilité
      const content = JSON.stringify(this.config, null, 2);

      await this.storage.writeJSON(configPath, this.config);

      console.log('[ConfigManager] Configuration saved to storage');
      this.eventBus.emit('config:saved', { config: this.config });

      return true;
    } catch (error) {
      console.error('[ConfigManager] Error saving config:', error);
      this.eventBus.emit('config:error', {
        action: 'save',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Obtenir la configuration complète
   */
  getAll() {
    return JSON.parse(JSON.stringify(this.config)); // Deep clone
  }

  /**
   * Obtenir la configuration d'un plugin
   *
   * @param {string} pluginId - ID du plugin
   * @returns {Object} Configuration du plugin
   */
  getPluginConfig(pluginId) {
    if (!pluginId) {
      throw new Error('pluginId is required');
    }

    // Retourner la config ou les defaults
    const config = this.config.plugins[pluginId];
    const defaults = this.defaults.get(pluginId);

    return config ? { ...defaults, ...config } : { ...defaults };
  }

  /**
   * Mettre à jour la configuration d'un plugin
   *
   * @param {string} pluginId - ID du plugin
   * @param {Object} newConfig - Nouvelle configuration (partielle ou complète)
   * @param {boolean} merge - Si true, merge avec l'existant; sinon remplace
   * @returns {Promise<boolean>} Succès de l'opération
   */
  async setPluginConfig(pluginId, newConfig, merge = true) {
    if (!pluginId) {
      throw new Error('pluginId is required');
    }

    if (!newConfig || typeof newConfig !== 'object') {
      throw new Error('newConfig must be an object');
    }

    try {
      // Valider selon le schéma si disponible
      const schema = this.schemas.get(pluginId);
      if (schema) {
        const validation = this.validateConfig(newConfig, schema);
        if (!validation.valid) {
          console.error(`[ConfigManager] Validation failed for ${pluginId}:`, validation.errors);
          this.eventBus.emit('config:validation-error', {
            pluginId,
            errors: validation.errors
          });
          return false;
        }
      }

      // Mettre à jour la config
      const oldConfig = this.config.plugins[pluginId] || {};
      this.config.plugins[pluginId] = merge
        ? { ...oldConfig, ...newConfig }
        : { ...newConfig };

      // Sauvegarder
      const saved = await this.save();

      if (saved) {
        this.eventBus.emit('config:plugin-updated', {
          pluginId,
          oldConfig,
          newConfig: this.config.plugins[pluginId]
        });
      }

      return saved;
    } catch (error) {
      console.error(`[ConfigManager] Error updating config for ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Obtenir une valeur spécifique de la config d'un plugin
   *
   * @param {string} pluginId - ID du plugin
   * @param {string} key - Clé de la configuration (support dot notation: "view.showWeekNumbers")
   * @param {any} defaultValue - Valeur par défaut si la clé n'existe pas
   * @returns {any} Valeur de la configuration
   */
  getPluginValue(pluginId, key, defaultValue = undefined) {
    const config = this.getPluginConfig(pluginId);

    if (!key) return config;

    // Support dot notation
    const keys = key.split('.');
    let value = config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Définir une valeur spécifique dans la config d'un plugin
   *
   * @param {string} pluginId - ID du plugin
   * @param {string} key - Clé de la configuration (support dot notation)
   * @param {any} value - Nouvelle valeur
   * @returns {Promise<boolean>} Succès de l'opération
   */
  async setPluginValue(pluginId, key, value) {
    if (!key) {
      throw new Error('key is required');
    }

    const config = this.getPluginConfig(pluginId);

    // Support dot notation
    const keys = key.split('.');
    const lastKey = keys.pop();
    let obj = config;

    // Créer les objets intermédiaires si nécessaire
    for (const k of keys) {
      if (!obj[k] || typeof obj[k] !== 'object') {
        obj[k] = {};
      }
      obj = obj[k];
    }

    obj[lastKey] = value;

    return await this.setPluginConfig(pluginId, config, false);
  }

  /**
   * Obtenir la configuration core de l'application
   */
  getCoreConfig() {
    return JSON.parse(JSON.stringify(this.config.core));
  }

  /**
   * Mettre à jour la configuration core
   */
  async setCoreConfig(newConfig, merge = true) {
    const oldConfig = this.config.core;
    this.config.core = merge
      ? { ...oldConfig, ...newConfig }
      : { ...newConfig };

    const saved = await this.save();

    if (saved) {
      this.eventBus.emit('config:core-updated', {
        oldConfig,
        newConfig: this.config.core
      });
    }

    return saved;
  }

  /**
   * Valider une configuration selon un schéma JSON Schema
   *
   * @param {Object} config - Configuration à valider
   * @param {Object} schema - JSON Schema
   * @returns {Object} { valid: boolean, errors: Array }
   */
  validateConfig(config, schema) {
    // Validation basique - peut être étendue avec une lib comme Ajv
    const errors = [];

    if (!schema || !schema.properties) {
      return { valid: true, errors: [] };
    }

    // Valider les propriétés requises
    if (schema.required && Array.isArray(schema.required)) {
      for (const reqKey of schema.required) {
        if (!(reqKey in config)) {
          errors.push({
            property: reqKey,
            message: `Required property '${reqKey}' is missing`
          });
        }
      }
    }

    // Valider les types
    for (const [key, value] of Object.entries(config)) {
      const propSchema = schema.properties[key];
      if (!propSchema) continue;

      const actualType = Array.isArray(value) ? 'array' : typeof value;

      if (propSchema.type && propSchema.type !== actualType) {
        errors.push({
          property: key,
          message: `Expected type '${propSchema.type}' but got '${actualType}'`
        });
      }

      // Valider enum
      if (propSchema.enum && !propSchema.enum.includes(value)) {
        errors.push({
          property: key,
          message: `Value '${value}' is not in allowed values: ${propSchema.enum.join(', ')}`
        });
      }

      // Valider min/max pour nombres
      if (propSchema.type === 'number') {
        if (propSchema.minimum !== undefined && value < propSchema.minimum) {
          errors.push({
            property: key,
            message: `Value ${value} is less than minimum ${propSchema.minimum}`
          });
        }
        if (propSchema.maximum !== undefined && value > propSchema.maximum) {
          errors.push({
            property: key,
            message: `Value ${value} is greater than maximum ${propSchema.maximum}`
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtenir la configuration par défaut
   */
  getDefaultConfig() {
    return {
      core: {
        theme: 'auto',
        language: 'fr',
        storageMode: 'github'
      },
      plugins: {}
    };
  }

  /**
   * Réinitialiser la configuration d'un plugin aux valeurs par défaut
   */
  async resetPluginConfig(pluginId) {
    const defaults = this.defaults.get(pluginId);
    if (!defaults) {
      console.warn(`[ConfigManager] No defaults found for plugin: ${pluginId}`);
      return false;
    }

    return await this.setPluginConfig(pluginId, defaults, false);
  }

  /**
   * Obtenir tous les plugins ayant une configuration enregistrée
   */
  getConfiguredPlugins() {
    return Array.from(this.schemas.keys());
  }

  /**
   * Obtenir le schéma d'un plugin
   */
  getPluginSchema(pluginId) {
    return this.schemas.get(pluginId);
  }
}
