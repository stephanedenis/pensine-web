/**
 * Pensine Settings Integration
 *
 * Intègre le système de configuration moderne avec:
 * - ConfigManager pour gestion centralisée
 * - SettingsView pour l'interface utilisateur
 * - JSONSchemaFormBuilder pour génération dynamique
 *
 * À importer dans app.js après les autres dépendances
 */

import ConfigManager from '../core/config-manager.js';
import SettingsView from '../views/settings-view.js';

// Instance globale du ConfigManager (si pas déjà instancié)
window.modernConfigManager = null;
window.settingsView = null;

/**
 * Initialiser le système de configuration moderne
 *
 * @param {Object} storage - Instance de StorageManager
 * @param {Object} eventBus - Instance de EventBus
 * @param {Object} pluginSystem - Instance de PluginSystem
 * @returns {Promise<Object>} { configManager, settingsView }
 */
export async function initializeModernConfig(storage, eventBus, pluginSystem) {
  console.log('[Settings] Initializing modern config system...');

  // Créer le ConfigManager
  const configManager = new ConfigManager(storage, eventBus);
  await configManager.init();

  // Créer la SettingsView
  const settingsView = new SettingsView(configManager, pluginSystem, eventBus);

  // Exposer globalement pour accès facile
  window.modernConfigManager = configManager;
  window.settingsView = settingsView;

  console.log('[Settings] Modern config system initialized');

  return { configManager, settingsView };
}

/**
 * Afficher le panneau de settings
 */
export function showSettings() {
  if (window.settingsView) {
    window.settingsView.show();
  } else {
    console.error('[Settings] Settings view not initialized');
  }
}

/**
 * Masquer le panneau de settings
 */
export function hideSettings() {
  if (window.settingsView) {
    window.settingsView.hide();
  }
}

/**
 * Obtenir la configuration d'un plugin
 *
 * @param {string} pluginId - ID du plugin
 * @returns {Object} Configuration du plugin
 */
export function getPluginConfig(pluginId) {
  if (window.modernConfigManager) {
    return window.modernConfigManager.getPluginConfig(pluginId);
  }
  return {};
}

/**
 * Définir la configuration d'un plugin
 *
 * @param {string} pluginId - ID du plugin
 * @param {Object} config - Nouvelle configuration
 * @returns {Promise<boolean>} Succès de l'opération
 */
export async function setPluginConfig(pluginId, config) {
  if (window.modernConfigManager) {
    return await window.modernConfigManager.setPluginConfig(pluginId, config);
  }
  return false;
}

// Exposer les fonctions globalement pour compatibilité
window.showModernSettings = showSettings;
window.hideModernSettings = hideSettings;
window.getPluginConfig = getPluginConfig;
window.setPluginConfig = setPluginConfig;
