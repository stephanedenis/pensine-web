/**
 * SettingsView - Interface utilisateur pour la configuration par plugin
 *
 * Affiche un panneau avec onglets par plugin permettant de:
 * - Visualiser et éditer la configuration de chaque plugin
 * - Génération automatique de formulaires basés sur JSON Schema
 * - Validation et sauvegarde des modifications
 * - Export/Import de la configuration
 *
 * @version 1.0.0
 */

import JSONSchemaFormBuilder from './json-schema-form-builder.js';

export default class SettingsView {
  /**
   * @param {Object} configManager - Instance de ConfigManager
   * @param {Object} pluginSystem - Instance de PluginSystem
   * @param {Object} eventBus - Instance de EventBus
   */
  constructor(configManager, pluginSystem, eventBus) {
    this.configManager = configManager;
    this.pluginSystem = pluginSystem;
    this.eventBus = eventBus;
    this.formBuilder = new JSONSchemaFormBuilder();

    this.container = null;
    this.currentTab = 'core';
    this.forms = new Map(); // pluginId -> form element
  }

  /**
   * Afficher le panneau de settings
   */
  async show() {
    // Créer le container si nécessaire
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'settings-view';
      this.container.className = 'settings-view';
      document.body.appendChild(this.container);
    }

    // Rendre le contenu
    await this.render();

    // Afficher
    this.container.classList.add('visible');

    // Émettre événement
    this.eventBus.emit('settings:opened');
  }

  /**
   * Masquer le panneau de settings
   */
  hide() {
    if (this.container) {
      this.container.classList.remove('visible');
      this.eventBus.emit('settings:closed');
    }
  }

  /**
   * Rendre le panneau de settings
   */
  async render() {
    if (!this.container) return;

    // Use getAllPlugins() which returns all registered plugins
    const plugins = this.pluginSystem.getAllPlugins();
    const configuredPlugins = this.configManager.getConfiguredPlugins();

    let html = `
      <div class="settings-overlay" data-action="close"></div>
      <div class="settings-panel">
        <div class="settings-header">
          <h2>Settings</h2>
          <button class="btn-close" data-action="close" title="Close">✕</button>
        </div>

        <div class="settings-body">
          <div class="settings-tabs">
            ${this.renderTabs(plugins, configuredPlugins)}
          </div>

          <div class="settings-content">
            ${await this.renderContent(plugins, configuredPlugins)}
          </div>
        </div>

        <div class="settings-footer">
          <button class="btn btn-secondary" data-action="export">
            Export Config
          </button>
          <button class="btn btn-secondary" data-action="import">
            Import Config
          </button>
          <button class="btn btn-primary" data-action="save-all">
            Save All Changes
          </button>
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    // Attacher les event listeners
    this.attachEventListeners();
  }

  /**
   * Rendre les onglets
   */
  renderTabs(plugins, configuredPlugins) {
    let html = '';

    // Onglet Core (config globale)
    html += `
      <button
        class="settings-tab ${this.currentTab === 'core' ? 'active' : ''}"
        data-tab="core"
      >
        <span class="tab-icon">⚙️</span>
        <span class="tab-label">Core</span>
      </button>
    `;

    // Onglets par plugin
    for (const plugin of plugins) {
      const hasConfig = configuredPlugins.includes(plugin.id);
      const isActive = this.currentTab === plugin.id;

      html += `
        <button
          class="settings-tab ${isActive ? 'active' : ''} ${!hasConfig ? 'no-config' : ''}"
          data-tab="${plugin.id}"
          ${!hasConfig ? 'disabled' : ''}
        >
          <span class="tab-icon">${plugin.icon || '🔌'}</span>
          <span class="tab-label">${plugin.name}</span>
          ${!hasConfig ? '<span class="tab-badge">No config</span>' : ''}
        </button>
      `;
    }

    return html;
  }

  /**
   * Rendre le contenu des onglets
   */
  async renderContent(plugins, configuredPlugins) {
    let html = '';

    // Contenu Core
    html += `<div class="settings-tab-content ${this.currentTab === 'core' ? 'active' : ''}" data-tab-content="core">`;
    html += await this.renderCoreSettings();
    html += '</div>';

    // Contenu par plugin
    for (const plugin of plugins) {
      const hasConfig = configuredPlugins.includes(plugin.id);
      const isActive = this.currentTab === plugin.id;

      html += `<div class="settings-tab-content ${isActive ? 'active' : ''}" data-tab-content="${plugin.id}">`;

      if (hasConfig) {
        html += await this.renderPluginSettings(plugin);
      } else {
        html += this.renderNoConfig(plugin);
      }

      html += '</div>';
    }

    return html;
  }

  /**
   * Rendre les settings Core
   */
  async renderCoreSettings() {
    const coreConfig = this.configManager.getCoreConfig();
    const coreSchema = this.getCoreSchema();

    return this.formBuilder.build(coreSchema, coreConfig, {
      formId: 'form-core',
      submitButton: true,
      submitLabel: 'Save Core Settings'
    });
  }

  /**
   * Rendre les settings d'un plugin
   */
  async renderPluginSettings(plugin) {
    const schema = this.configManager.getPluginSchema(plugin.id);
    const config = this.configManager.getPluginConfig(plugin.id);

    if (!schema) {
      return `
        <div class="settings-empty">
          <p>No configuration schema defined for this plugin.</p>
        </div>
      `;
    }

    let html = `
      <div class="plugin-settings-header">
        <h3>${plugin.name} Settings</h3>
        <button class="btn btn-sm btn-secondary" data-action="reset" data-plugin="${plugin.id}">
          Reset to defaults
        </button>
      </div>
    `;

    html += this.formBuilder.build(schema, config, {
      formId: `form-${plugin.id}`,
      submitButton: true,
      submitLabel: `Save ${plugin.name} Settings`
    });

    return html;
  }

  /**
   * Rendre le message "pas de config"
   */
  renderNoConfig(plugin) {
    return `
      <div class="settings-empty">
        <p>${plugin.name} does not have configuration options.</p>
      </div>
    `;
  }

  /**
   * Attacher les event listeners
   */
  attachEventListeners() {
    if (!this.container) return;

    // Fermeture
    this.container.querySelectorAll('[data-action="close"]').forEach(btn => {
      btn.addEventListener('click', () => this.hide());
    });

    // Changement d'onglet
    this.container.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabId = e.currentTarget.dataset.tab;
        this.switchTab(tabId);
      });
    });

    // Soumission des formulaires
    this.container.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('🔥 Form submit event fired!', form.id);
        try {
          await this.handleFormSubmit(form);
        } catch (error) {
          console.error('💥 Error in handleFormSubmit:', error);
        }
      });

      // Attacher les listeners du form builder
      this.formBuilder.attachEventListeners(form);

      // Stocker la référence
      const formId = form.id.replace('form-', '');
      this.forms.set(formId, form);
    });

    // Reset
    this.container.querySelectorAll('[data-action="reset"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const pluginId = e.currentTarget.dataset.plugin;
        await this.handleReset(pluginId);
      });
    });

    // Export
    const exportBtn = this.container.querySelector('[data-action="export"]');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExport());
    }

    // Import
    const importBtn = this.container.querySelector('[data-action="import"]');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.handleImport());
    }

    // Save All
    const saveAllBtn = this.container.querySelector('[data-action="save-all"]');
    if (saveAllBtn) {
      saveAllBtn.addEventListener('click', () => this.handleSaveAll());
    }
  }

  /**
   * Changer d'onglet
   */
  switchTab(tabId) {
    this.currentTab = tabId;

    // Mettre à jour les classes active
    this.container.querySelectorAll('.settings-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    this.container.querySelectorAll('.settings-tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tabContent === tabId);
    });

    this.eventBus.emit('settings:tab-changed', { tab: tabId });
  }

  /**
   * Gérer la soumission d'un formulaire
   */
  async handleFormSubmit(form) {
    const formId = form.id.replace('form-', '');

    console.log('🔍 handleFormSubmit called for:', formId);

    // Obtenir le schéma pour validation
    let schema;
    if (formId === 'core') {
      schema = this.getCoreSchema();
    } else {
      schema = this.configManager.getPluginSchema(formId);
    }

    console.log('📋 Schema for validation:', schema ? 'Found' : 'Not found');

    // Valider avant extraction/sauvegarde
    if (schema) {
      const validation = this.formBuilder.validate(form, schema);

      console.log('✅ Validation result:', validation);

      if (!validation.valid) {
        // Afficher les erreurs
        const errorMessages = validation.errors.map(err => err.message).join(', ');
        console.error('❌ Validation errors:', validation.errors);
        this.showNotification(`Validation failed: ${errorMessages}`, 'error');

        // Highlight les champs en erreur
        validation.errors.forEach(err => {
          if (err.element) {
            console.log('🔴 Adding error class to field:', err.field);
            err.element.classList.add('error');
            // Retirer l'erreur après 3s
            setTimeout(() => err.element.classList.remove('error'), 3000);
          }
        });

        return; // Ne pas sauvegarder si invalide
      }
    }

    // Extraction des données après validation
    const data = this.formBuilder.extractData(form);

    try {
      let success;

      if (formId === 'core') {
        success = await this.configManager.setCoreConfig(data);
      } else {
        success = await this.configManager.setPluginConfig(formId, data);
      }

      if (success) {
        this.showNotification('Configuration saved successfully', 'success');
        this.eventBus.emit('settings:saved', { target: formId, data });
      } else {
        this.showNotification('Failed to save configuration', 'error');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      this.showNotification(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Obtenir le schéma Core (pour validation)
   */
  getCoreSchema() {
    return {
      type: 'object',
      title: 'Core Settings',
      properties: {
        theme: {
          type: 'string',
          title: 'Theme',
          description: 'Application theme',
          enum: ['light', 'dark', 'auto'],
          default: 'auto'
        },
        language: {
          type: 'string',
          title: 'Language',
          description: 'Interface language',
          enum: ['en', 'fr'],
          default: 'fr'
        },
        storageMode: {
          type: 'string',
          title: 'Storage Mode',
          description: 'Where to store your data',
          enum: ['github', 'local', 'local-git'],
          default: 'github'
        },
        autoSave: {
          type: 'boolean',
          title: 'Auto-save',
          description: 'Automatically save changes',
          default: true
        },
        autoSaveDelay: {
          type: 'number',
          title: 'Auto-save delay (ms)',
          description: 'Delay before auto-saving',
          minimum: 500,
          maximum: 10000,
          default: 2000
        }
      },
      required: ['theme', 'language', 'storageMode']
    };
  }

  /**
   * Reset la configuration d'un plugin
   */
  async handleReset(pluginId) {
    if (!confirm(`Reset ${pluginId} configuration to default values?`)) {
      return;
    }

    try {
      const success = await this.configManager.resetPluginConfig(pluginId);

      if (success) {
        this.showNotification('Configuration reset successfully', 'success');
        // Re-render le contenu
        await this.render();
      } else {
        this.showNotification('Failed to reset configuration', 'error');
      }
    } catch (error) {
      console.error('Error resetting config:', error);
      this.showNotification(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Exporter la configuration
   */
  handleExport() {
    const config = this.configManager.getAll();
    const json = JSON.stringify(config, null, 2);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `pensine-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);

    this.showNotification('Configuration exported', 'success');
  }

  /**
   * Importer la configuration
   */
  handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const config = JSON.parse(text);

        // Valider et sauvegarder
        if (config.core) {
          await this.configManager.setCoreConfig(config.core, false);
        }

        if (config.plugins) {
          for (const [pluginId, pluginConfig] of Object.entries(config.plugins)) {
            await this.configManager.setPluginConfig(pluginId, pluginConfig, false);
          }
        }

        this.showNotification('Configuration imported successfully', 'success');
        await this.render();
      } catch (error) {
        console.error('Error importing config:', error);
        this.showNotification(`Import failed: ${error.message}`, 'error');
      }
    });

    input.click();
  }

  /**
   * Sauvegarder tous les formulaires
   */
  async handleSaveAll() {
    let successCount = 0;
    let errorCount = 0;

    for (const [formId, form] of this.forms.entries()) {
      try {
        const data = this.formBuilder.extractData(form);
        let success;

        if (formId === 'core') {
          success = await this.configManager.setCoreConfig(data);
        } else {
          success = await this.configManager.setPluginConfig(formId, data);
        }

        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`Error saving ${formId}:`, error);
        errorCount++;
      }
    }

    if (errorCount === 0) {
      this.showNotification(`All configurations saved (${successCount} items)`, 'success');
    } else {
      this.showNotification(
        `Saved ${successCount} configurations with ${errorCount} errors`,
        'warning'
      );
    }
  }

  /**
   * Afficher une notification
   */
  showNotification(message, type = 'info') {
    // Créer notification toast
    const toast = document.createElement('div');
    toast.className = `notification notification-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Afficher
    setTimeout(() => toast.classList.add('visible'), 10);

    // Masquer et retirer
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Détruire la vue
   */
  destroy() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    this.forms.clear();
  }
}
