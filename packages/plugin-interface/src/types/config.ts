/**
 * Config Manager - Hierarchical configuration system
 */
export interface ConfigManager {
  /**
   * Get core application config
   */
  getCoreConfig(): Record<string, any>;

  /**
   * Set core application config
   * @param config - New core config (merged with existing)
   */
  setCoreConfig(config: Record<string, any>): Promise<void>;

  /**
   * Get plugin-specific config
   * @param pluginId - Plugin identifier
   */
  getPluginConfig(pluginId: string): Record<string, any>;

  /**
   * Set plugin-specific config
   * @param pluginId - Plugin identifier
   * @param config - New plugin config
   */
  setPluginConfig(pluginId: string, config: Record<string, any>): Promise<void>;

  /**
   * Register a JSON Schema for config validation
   * @param pluginId - Plugin identifier
   * @param schema - JSON Schema object
   * @param defaults - Default values
   */
  registerSchema(
    pluginId: string,
    schema: JSONSchema,
    defaults?: Record<string, any>
  ): void;

  /**
   * Validate config against registered schema
   * @param pluginId - Plugin identifier
   * @param config - Config to validate
   * @returns Validation result
   */
  validate(pluginId: string, config: Record<string, any>): ValidationResult;

  /**
   * Check if config manager is loaded
   */
  isLoaded(): boolean;
}

/**
 * JSON Schema type (simplified)
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

/**
 * Config validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

/**
 * Config validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  value?: any;
}
