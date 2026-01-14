/**
 * Example Panini Plugin - Word Counter
 * 
 * Démontre l'utilisation de @panini/plugin-interface dans Pensine
 * Ce plugin compte les mots et caractères dans les notes
 * 
 * @version 1.0.0
 */

// Import types from @panini/plugin-interface (when published)
// For now, we implement the interfaces directly

/**
 * Word Counter Plugin
 * Implements PaniniPlugin interface
 */
export default class WordCounterPlugin {
  constructor() {
    this.state = 'unloaded';
    this.context = null;
    this.wordCount = 0;
    this.charCount = 0;
    this.uiElement = null;
  }

  /**
   * Plugin manifest
   */
  manifest = {
    id: 'word-counter',
    name: 'Word Counter',
    version: '1.0.0',
    description: 'Count words and characters in journal entries',
    author: 'Panini Team',
    tags: ['productivity', 'stats', 'markdown'],
    dependencies: []
  };

  /**
   * Activate plugin (PaniniPlugin lifecycle)
   */
  async activate(context) {
    this.context = context;
    this.state = 'active';

    context.logger.info(`[${this.manifest.id}] Activating...`);

    // 1. Register config schema with defaults
    context.config.registerSchema(
      this.manifest.id,
      {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'Enable word counting'
          },
          showCharCount: {
            type: 'boolean',
            description: 'Show character count alongside word count'
          },
          updateInterval: {
            type: 'number',
            description: 'Update interval in milliseconds',
            minimum: 100,
            maximum: 5000
          },
          position: {
            type: 'string',
            enum: ['top', 'bottom'],
            description: 'Position of stats display'
          }
        },
        required: ['enabled']
      },
      {
        // Defaults
        enabled: true,
        showCharCount: true,
        updateInterval: 500,
        position: 'bottom'
      }
    );

    // 2. Get plugin config
    const config = context.config.getPluginConfig(this.manifest.id);
    context.logger.info(`[${this.manifest.id}] Config:`, config);

    // 3. Subscribe to events (with namespace for auto-cleanup!)
    if (config.enabled) {
      // Listen for journal entry opens
      context.events.on(
        'journal:entry-open',
        async (data) => {
          await this.onEntryOpened(data);
        },
        this.manifest.id // Namespace = plugin ID
      );

      // Listen for content changes (if editor emits such events)
      context.events.on(
        'editor:content-change',
        (data) => {
          this.updateCounts(data.content);
        },
        this.manifest.id
      );

      // Listen for config changes
      context.events.on(
        'config:plugin-updated',
        (data) => {
          if (data.pluginId === this.manifest.id) {
            this.onConfigChanged(data.newConfig);
          }
        },
        this.manifest.id
      );

      // Create UI
      this.createUI(config);
    }

    context.logger.info(`[${this.manifest.id}] Activated successfully!`);
  }

  /**
   * Deactivate plugin (PaniniPlugin lifecycle)
   */
  async deactivate() {
    if (!this.context) return;

    this.context.logger.info(`[${this.manifest.id}] Deactivating...`);

    // Cleanup UI
    if (this.uiElement && this.uiElement.parentNode) {
      this.uiElement.parentNode.removeChild(this.uiElement);
    }

    // Clear all event listeners via namespace
    // This is automatic cleanup - one of the key features!
    this.context.events.clearNamespace(this.manifest.id);

    // Reset state
    this.wordCount = 0;
    this.charCount = 0;
    this.state = 'unloaded';
    this.context = null;

    console.log(`[${this.manifest.id}] Deactivated.`);
  }

  /**
   * Health check (optional PaniniPlugin method)
   */
  async healthCheck() {
    return this.state === 'active' && this.context !== null;
  }

  /**
   * Config change handler (optional PaniniPlugin method)
   */
  async onConfigChange(newConfig) {
    if (!this.context) return;

    this.context.logger.info(`[${this.manifest.id}] Config changed:`, newConfig);

    if (newConfig.enabled === false) {
      // Hide UI
      if (this.uiElement) {
        this.uiElement.style.display = 'none';
      }
    } else {
      // Show UI
      if (this.uiElement) {
        this.uiElement.style.display = 'block';
        this.updateUI(newConfig);
      } else {
        this.createUI(newConfig);
      }
    }
  }

  // ========== Plugin-specific logic ==========

  /**
   * Handle journal entry opened
   */
  async onEntryOpened(data) {
    if (!this.context) return;

    const { path } = data;

    try {
      // Read file content via StorageAdapter
      const content = await this.context.storage.readFile(path);

      // Update counts
      this.updateCounts(content);

      // Emit custom event
      this.context.events.emit(`${this.manifest.id}:updated`, {
        path,
        wordCount: this.wordCount,
        charCount: this.charCount
      });
    } catch (error) {
      this.context.logger.error(`[${this.manifest.id}] Error reading file:`, error);
    }
  }

  /**
   * Update word and character counts
   */
  updateCounts(content) {
    if (!content) {
      this.wordCount = 0;
      this.charCount = 0;
      this.updateUIDisplay();
      return;
    }

    // Count words (simple split on whitespace)
    const words = content.trim().split(/\s+/).filter(w => w.length > 0);
    this.wordCount = words.length;

    // Count characters
    this.charCount = content.length;

    // Update UI
    this.updateUIDisplay();

    // Log if in dev mode
    if (this.context && this.context.features.hotReload) {
      this.context.logger.info(
        `[${this.manifest.id}] Words: ${this.wordCount}, Chars: ${this.charCount}`
      );
    }
  }

  /**
   * Create UI element
   */
  createUI(config) {
    if (!this.context) return;

    // Create stats container
    this.uiElement = document.createElement('div');
    this.uiElement.id = 'word-counter-stats';
    this.uiElement.className = 'word-counter-stats';
    this.uiElement.style.cssText = `
      position: fixed;
      ${config.position === 'top' ? 'top: 10px' : 'bottom: 10px'};
      right: 10px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      z-index: 1000;
      pointer-events: none;
    `;

    // Insert into DOM
    document.body.appendChild(this.uiElement);

    // Initial update
    this.updateUIDisplay();

    this.context.logger.info(`[${this.manifest.id}] UI created at ${config.position}`);
  }

  /**
   * Update UI display
   */
  updateUIDisplay() {
    if (!this.uiElement || !this.context) return;

    const config = this.context.config.getPluginConfig(this.manifest.id);

    let text = `${this.wordCount} words`;
    
    if (config.showCharCount) {
      text += ` · ${this.charCount} chars`;
    }

    this.uiElement.textContent = text;
  }

  /**
   * Update UI position/style from config
   */
  updateUI(config) {
    if (!this.uiElement) return;

    // Update position
    if (config.position === 'top') {
      this.uiElement.style.top = '10px';
      this.uiElement.style.bottom = 'auto';
    } else {
      this.uiElement.style.bottom = '10px';
      this.uiElement.style.top = 'auto';
    }

    // Update display
    this.updateUIDisplay();
  }

  // ========== Public API ==========

  /**
   * Get current statistics
   * Can be called by other plugins or app
   */
  getStats() {
    return {
      words: this.wordCount,
      chars: this.charCount
    };
  }

  /**
   * Reset counts
   */
  reset() {
    this.wordCount = 0;
    this.charCount = 0;
    this.updateUIDisplay();
  }
}
