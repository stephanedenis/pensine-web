/**
 * ConfigurableComponent - Base class for Pensine components with standardized configuration
 * @version 1.0.0
 * @license MIT
 *
 * Provides standardized interface for component configuration:
 * - getConfigSchema() - Returns JSON Schema-like structure
 * - getConfig() - Returns current configuration
 * - setConfig() - Updates configuration
 * - resetConfig() - Resets to defaults
 * - exportConfig() / importConfig() - Serialization
 * - emit() - Event system
 */

class ConfigurableComponent {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.container) {
      throw new Error('Container element not found');
    }

    // Event listeners
    this._listeners = new Map();

    // Initialize with defaults + user options
    const schema = this.getConfigSchema();
    const defaults = this._extractDefaults(schema);
    this.options = { ...defaults, ...options };

    // Track if initialized
    this._initialized = false;
  }

  /**
   * Returns configuration schema (to be overridden by child classes)
   * Format:
   * {
   *   groups: [{
   *     id: 'display',
   *     title: 'Display Options',
   *     icon: '🎨',
   *     description: 'Visual appearance settings',
   *     properties: {
   *       theme: {
   *         type: 'select',
   *         title: 'Theme',
   *         description: 'Color scheme',
   *         options: [{value: 'light', label: 'Light'}, ...],
   *         default: 'light'
   *       }
   *     }
   *   }]
   * }
   */
  getConfigSchema() {
    return {
      groups: []
    };
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.options };
  }

  /**
   * Set configuration
   * @param {Object} config - New configuration values
   * @param {Boolean} merge - If true, merge with existing; if false, replace
   */
  setConfig(config, merge = true) {
    const oldConfig = { ...this.options };

    if (merge) {
      Object.assign(this.options, config);
    } else {
      this.options = { ...config };
    }

    // Validate configuration
    const errors = this._validateConfig(this.options);
    if (errors.length > 0) {
      console.warn('Configuration validation errors:', errors);
      this.options = oldConfig; // Rollback
      return false;
    }

    // Trigger refresh if component is initialized
    if (this._initialized && this.refresh) {
      this.refresh();
    }

    // Emit event
    this.emit('configchange', {
      oldConfig,
      newConfig: this.options,
      changes: this._getConfigDiff(oldConfig, this.options)
    });

    return true;
  }

  /**
   * Update single config property
   */
  setConfigProperty(key, value) {
    this.setConfig({ [key]: value }, true);
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig() {
    const schema = this.getConfigSchema();
    const defaults = this._extractDefaults(schema);
    this.setConfig(defaults, false);
    this.emit('configreset');
  }

  /**
   * Export configuration as JSON string
   */
  exportConfig(pretty = true) {
    return JSON.stringify(this.getConfig(), null, pretty ? 2 : 0);
  }

  /**
   * Import configuration from JSON string
   */
  importConfig(jsonString) {
    try {
      const config = JSON.parse(jsonString);
      return this.setConfig(config, false);
    } catch (error) {
      console.error('Failed to import configuration:', error);
      this.emit('configerror', { error, action: 'import' });
      return false;
    }
  }

  /**
   * Extract default values from schema
   * @private
   */
  _extractDefaults(schema) {
    const defaults = {};

    if (!schema || !schema.groups) return defaults;

    schema.groups.forEach(group => {
      if (!group.properties) return;

      Object.entries(group.properties).forEach(([key, prop]) => {
        if (prop.default !== undefined) {
          defaults[key] = prop.default;
        }
      });
    });

    return defaults;
  }

  /**
   * Validate configuration against schema
   * @private
   */
  _validateConfig(config) {
    const errors = [];
    const schema = this.getConfigSchema();

    if (!schema || !schema.groups) return errors;

    schema.groups.forEach(group => {
      if (!group.properties) return;

      Object.entries(group.properties).forEach(([key, prop]) => {
        const value = config[key];

        // Required check
        if (prop.required && (value === undefined || value === null)) {
          errors.push(`${key}: Required field is missing`);
          return;
        }

        if (value === undefined) return;

        // Type validation
        const actualType = typeof value;
        let expectedType = prop.type;

        // Map schema types to JS types
        const typeMap = {
          'number': 'number',
          'string': 'string',
          'boolean': 'boolean',
          'color': 'string',
          'date': 'string',
          'select': actualType // Can be any type
        };

        if (typeMap[expectedType] && actualType !== typeMap[expectedType]) {
          errors.push(`${key}: Expected ${expectedType}, got ${actualType}`);
        }

        // Number validation
        if (prop.type === 'number') {
          if (prop.min !== undefined && value < prop.min) {
            errors.push(`${key}: Value ${value} is less than minimum ${prop.min}`);
          }
          if (prop.max !== undefined && value > prop.max) {
            errors.push(`${key}: Value ${value} exceeds maximum ${prop.max}`);
          }
        }

        // String validation
        if (prop.type === 'string') {
          if (prop.minLength && value.length < prop.minLength) {
            errors.push(`${key}: Length ${value.length} is less than minimum ${prop.minLength}`);
          }
          if (prop.maxLength && value.length > prop.maxLength) {
            errors.push(`${key}: Length ${value.length} exceeds maximum ${prop.maxLength}`);
          }
          if (prop.pattern && !new RegExp(prop.pattern).test(value)) {
            errors.push(`${key}: Value does not match pattern ${prop.pattern}`);
          }
        }

        // Select validation
        if (prop.type === 'select' && prop.options) {
          const validValues = prop.options.map(opt =>
            typeof opt === 'object' ? opt.value : opt
          );
          if (!validValues.includes(value)) {
            errors.push(`${key}: Invalid option "${value}"`);
          }
        }

        // Custom validator
        if (prop.validator && typeof prop.validator === 'function') {
          const isValid = prop.validator(value);
          if (!isValid) {
            errors.push(`${key}: Custom validation failed`);
          }
        }
      });
    });

    return errors;
  }

  /**
   * Get differences between two configs
   * @private
   */
  _getConfigDiff(oldConfig, newConfig) {
    const changes = {};

    // Check all keys in new config
    Object.keys(newConfig).forEach(key => {
      if (oldConfig[key] !== newConfig[key]) {
        changes[key] = {
          old: oldConfig[key],
          new: newConfig[key]
        };
      }
    });

    // Check for removed keys
    Object.keys(oldConfig).forEach(key => {
      if (!(key in newConfig)) {
        changes[key] = {
          old: oldConfig[key],
          new: undefined
        };
      }
    });

    return changes;
  }

  /**
   * Event system - Register event listener
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return this; // Chainable
  }

  /**
   * Event system - Remove event listener
   */
  off(event, callback) {
    if (!this._listeners.has(event)) return this;

    const listeners = this._listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }

    return this;
  }

  /**
   * Event system - Emit event
   */
  emit(event, data) {
    if (!this._listeners.has(event)) return this;

    this._listeners.get(event).forEach(callback => {
      try {
        callback.call(this, data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });

    return this;
  }

  /**
   * Destroy component (cleanup)
   */
  destroy() {
    this._listeners.clear();
    this.emit('destroy');
  }
}

// Export for UMD pattern
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigurableComponent;
}
