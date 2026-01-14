/**
 * App Initialization - Initialize Pensine with Panini plugin support
 * 
 * This file demonstrates how to bootstrap Pensine with both:
 * - New PaniniPlugin interface plugins
 * - Legacy Pensine plugins (backward compatible)
 * 
 * @version 1.0.0
 */

import PluginSystem from './src/core/plugin-system.js';
import EventBus from './src/core/event-bus.js';
import ConfigManager from './src/core/config-manager.js';

// Import example Panini plugin
import WordCounterPlugin from './plugins/pensine-plugin-word-counter/word-counter.js';

/**
 * Initialize Pensine application
 */
async function initPensine() {
  console.log('🚀 Initializing Pensine with Panini support...');

  try {
    // 1. Initialize core systems
    const eventBus = new EventBus();
    
    // Wait for storage manager (assume it's initialized elsewhere)
    if (!window.storageManager) {
      throw new Error('StorageManager not initialized');
    }
    
    const configManager = new ConfigManager(window.storageManager, eventBus);
    await configManager.init();
    
    // 2. Initialize plugin system with ConfigManager
    const pluginSystem = new PluginSystem(eventBus, window.storageManager, configManager);
    await pluginSystem.init();
    
    // Make available globally
    window.pluginSystem = pluginSystem;
    window.eventBus = eventBus;
    window.modernConfigManager = configManager;
    
    console.log('✅ Core systems initialized');
    
    // 3. Register plugins
    await registerPlugins(pluginSystem);
    
    // 4. Emit app ready
    eventBus.emit('app:ready', {
      version: '1.0.0',
      paniniSupport: true
    });
    
    console.log('✅ Pensine initialized successfully!');
    
    // 5. Optional: Run health checks
    setTimeout(async () => {
      const health = await pluginSystem.healthCheckAll();
      console.log('🏥 Plugin health check:', health);
    }, 2000);
    
  } catch (error) {
    console.error('❌ Failed to initialize Pensine:', error);
    throw error;
  }
}

/**
 * Register all plugins
 */
async function registerPlugins(pluginSystem) {
  console.log('📦 Registering plugins...');
  
  // Register Panini plugins (new interface)
  try {
    await pluginSystem.registerPaniniPlugin(WordCounterPlugin);
    console.log('✅ Registered: Word Counter (Panini)');
  } catch (error) {
    console.warn('⚠️ Failed to register Word Counter:', error.message);
  }
  
  // Register legacy plugins (if any)
  // Example:
  // await pluginSystem.register(OldPluginClass, manifest, false);
  
  // Get plugin stats
  const plugins = pluginSystem.getAllPlugins();
  console.log(`📊 Total plugins: ${plugins.length}`);
  console.log('   - Panini:', plugins.filter(p => p.type === 'panini').length);
  console.log('   - Legacy:', plugins.filter(p => p.type === 'legacy').length);
  console.log('   - Active:', plugins.filter(p => p.enabled).length);
}

/**
 * Manual plugin registration example
 * (for use in console or settings UI)
 */
window.registerPaniniPlugin = async function(PluginClass) {
  if (!window.pluginSystem) {
    console.error('Plugin system not initialized');
    return;
  }
  
  try {
    const plugin = await window.pluginSystem.registerPaniniPlugin(PluginClass);
    console.log('✅ Plugin registered:', plugin.manifest.name);
    return plugin;
  } catch (error) {
    console.error('❌ Failed to register plugin:', error);
    throw error;
  }
};

/**
 * Plugin management helpers
 */
window.listPlugins = function() {
  if (!window.pluginSystem) {
    console.error('Plugin system not initialized');
    return [];
  }
  
  const plugins = window.pluginSystem.getAllPlugins();
  console.table(plugins);
  return plugins;
};

window.enablePlugin = async function(pluginId) {
  if (!window.pluginSystem) {
    console.error('Plugin system not initialized');
    return;
  }
  
  try {
    await window.pluginSystem.enable(pluginId);
    console.log(`✅ Plugin enabled: ${pluginId}`);
  } catch (error) {
    console.error(`❌ Failed to enable plugin: ${error.message}`);
  }
};

window.disablePlugin = async function(pluginId) {
  if (!window.pluginSystem) {
    console.error('Plugin system not initialized');
    return;
  }
  
  try {
    await window.pluginSystem.disable(pluginId);
    console.log(`✅ Plugin disabled: ${pluginId}`);
  } catch (error) {
    console.error(`❌ Failed to disable plugin: ${error.message}`);
  }
};

window.getPluginConfig = function(pluginId) {
  if (!window.modernConfigManager) {
    console.error('Config manager not initialized');
    return null;
  }
  
  const config = window.modernConfigManager.getPluginConfig(pluginId);
  console.log(`Config for ${pluginId}:`, config);
  return config;
};

window.setPluginConfig = async function(pluginId, config) {
  if (!window.modernConfigManager) {
    console.error('Config manager not initialized');
    return;
  }
  
  try {
    await window.modernConfigManager.setPluginConfig(pluginId, config);
    console.log(`✅ Config updated for: ${pluginId}`);
  } catch (error) {
    console.error(`❌ Failed to update config: ${error.message}`);
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPensine);
} else {
  // DOM already loaded
  initPensine();
}

export { initPensine, registerPlugins };
