/**
 * Pensine Bootstrap - Minimal Loader
 * 
 * Responsabilités :
 * 1. Détecter présence configuration locale (bootstrap.json)
 * 2. Si absente/invalide → afficher wizard
 * 3. Si présente → charger storage + config remote
 * 4. Charger plugin system
 * 5. Découvrir et activer plugins configurés
 */

class PensineBootstrap {
    constructor() {
        this.config = null;
        this.storageAdapter = null;
        this.pluginSystem = null;
    }

    /**
     * Point d'entrée principal
     */
    async init() {
        console.log('🚀 Pensine Bootstrap v0.1.0');

        // Étape 1: Charger configuration locale
        const localConfig = this.loadLocalConfig();

        if (!localConfig || !this.isValidConfig(localConfig)) {
            console.log('⚠️ No valid local config - showing wizard');
            await this.showWizard();
            return;
        }

        this.config = localConfig;
        console.log('✅ Local config loaded:', {
            storageMode: localConfig.storageMode,
            hasCredentials: !!localConfig.credentials
        });

        // Étape 2: Initialiser storage
        try {
            await this.initializeStorage(localConfig);
        } catch (error) {
            console.error('❌ Storage initialization failed:', error);
            await this.showWizard();
            return;
        }

        // Étape 3: Charger configuration remote
        try {
            await this.loadRemoteConfig();
        } catch (error) {
            console.warn('⚠️ Could not load remote config, using defaults');
        }

        // Étape 4: Initialiser plugin system
        await this.initializePluginSystem();

        // Étape 5: Charger et activer plugins
        await this.loadPlugins();

        // Étape 6: Marquer comme prêt
        this.markReady();
    }

    /**
     * Charger configuration locale depuis localStorage
     * Format: { storageMode, credentials, version }
     */
    loadLocalConfig() {
        try {
            const raw = localStorage.getItem('pensine-bootstrap');
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (error) {
            console.error('Failed to parse local config:', error);
            return null;
        }
    }

    /**
     * Valider configuration locale
     */
    isValidConfig(config) {
        if (!config || !config.storageMode) return false;

        switch (config.storageMode) {
            case 'github':
                return config.credentials?.token && config.credentials?.owner && config.credentials?.repo;
            case 'local-git':
                return config.credentials?.repoPath;
            case 'local':
                return true; // localStorage seul
            default:
                return false;
        }
    }

    /**
     * Afficher le wizard de configuration
     */
    async showWizard() {
        console.log('🧙 Showing configuration wizard...');
        
        try {
            // Import wizard dynamiquement (chemin depuis racine)
            const { default: ConfigWizard } = await import('../src/lib/components/config-wizard.js');
            console.log('✅ Wizard module loaded');
            
            // Créer container wizard si absent
            let wizardContainer = document.getElementById('wizard-container');
            if (!wizardContainer) {
                wizardContainer = document.createElement('div');
                wizardContainer.id = 'wizard-container';
                document.body.appendChild(wizardContainer);
            }

            // Cacher loading
            const loading = document.getElementById('loading');
            if (loading) {
                loading.classList.add('hidden');
            }

            // Instancier wizard
            const wizard = new ConfigWizard();
            wizard.onComplete = async (config) => {
                console.log('✅ Wizard completed, saving config');
                // Sauvegarder config locale
                this.saveLocalConfig(config);
                
                // Recharger l'app
                window.location.reload();
            };

            await wizard.show();
            console.log('✅ Wizard displayed');
        } catch (error) {
            console.error('❌ Failed to load wizard:', error);
            // Fallback: afficher message d'erreur
            const loading = document.getElementById('loading');
            if (loading) {
                loading.innerHTML = `
                    <div style="color: red;">
                        <h2>❌ Erreur de chargement</h2>
                        <p>${error.message}</p>
                        <button onclick="location.reload()">Réessayer</button>
                    </div>
                `;
            }
        }
    }

    /**
     * Sauvegarder configuration locale
     */
    saveLocalConfig(config) {
        const bootstrap = {
            storageMode: config.storageMode,
            credentials: config.credentials,
            version: '1.0.0',
            timestamp: new Date().toISOString()
        };

        localStorage.setItem('pensine-bootstrap', JSON.stringify(bootstrap));
        console.log('✅ Local config saved');
    }

    /**
     * Initialiser le storage adapter
     */
    async initializeStorage(config) {
        const { default: StorageManager } = await import('../src/lib/components/storage-manager-unified.js');
        
        window.storageManager = new StorageManager();
        await window.storageManager.initialize(config);

        this.storageAdapter = window.storageManager.adapter;
        console.log('✅ Storage initialized:', config.storageMode);
    }

    /**
     * Charger configuration remote depuis .pensine-config.json
     */
    async loadRemoteConfig() {
        if (!this.storageAdapter) {
            throw new Error('Storage adapter not initialized');
        }

        try {
            const configFile = await this.storageAdapter.getFile('.pensine-config.json');
            const remoteConfig = JSON.parse(configFile.content);

            // Merger avec config locale (remote a priorité pour plugins)
            this.config = {
                ...this.config,
                plugins: remoteConfig.plugins || {},
                settings: remoteConfig.settings || {}
            };

            console.log('✅ Remote config loaded:', {
                pluginsCount: Object.keys(this.config.plugins).length
            });
        } catch (error) {
            // Fichier n'existe pas encore - utiliser defaults
            console.log('ℹ️ No remote config found, using defaults');
            this.config.plugins = {};
            this.config.settings = {};
        }
    }

    /**
     * Initialiser plugin system
     */
    async initializePluginSystem() {
        const { default: EventBus } = await import('../src/core/event-bus.js');
        const { default: PluginSystem } = await import('../src/core/plugin-system.js');
        const { default: ConfigManager } = await import('../src/core/config-manager.js');

        window.eventBus = new EventBus();
        
        window.configManager = new ConfigManager(
            window.storageManager,
            window.eventBus
        );
        await window.configManager.init();

        window.pluginSystem = new PluginSystem(
            window.eventBus,
            window.storageManager,
            window.configManager
        );
        await window.pluginSystem.init();

        console.log('✅ Plugin system initialized');
    }

    /**
     * Découvrir et charger plugins configurés
     */
    async loadPlugins() {
        const enabledPlugins = this.getEnabledPlugins();
        
        console.log(`📦 Loading ${enabledPlugins.length} plugins...`);

        for (const pluginConfig of enabledPlugins) {
            try {
                await this.loadPlugin(pluginConfig);
            } catch (error) {
                console.error(`Failed to load plugin ${pluginConfig.id}:`, error);
            }
        }

        console.log('✅ Plugins loaded');
    }

    /**
     * Obtenir liste des plugins activés depuis config
     */
    getEnabledPlugins() {
        if (!this.config.plugins) return [];

        return Object.entries(this.config.plugins)
            .filter(([id, config]) => config.enabled !== false)
            .map(([id, config]) => ({
                id,
                ...config
            }));
    }

    /**
     * Charger et activer un plugin
     */
    async loadPlugin(pluginConfig) {
        const { id, source } = pluginConfig;

        // Déterminer source du plugin
        let pluginPath;
        if (source === 'local') {
            pluginPath = `./plugins/pensine-plugin-${id}/${id}-plugin.js`;
        } else if (source === 'cdn') {
            pluginPath = `https://unpkg.com/pensine-plugin-${id}@latest/${id}-plugin.js`;
        } else if (source) {
            pluginPath = source; // URL custom
        } else {
            // Default: local
            pluginPath = `./plugins/pensine-plugin-${id}/${id}-plugin.js`;
        }

        console.log(`📦 Loading plugin "${id}" from ${pluginPath}`);

        // Import plugin
        const { default: PluginClass } = await import(pluginPath);

        // Créer manifest
        const manifest = {
            id,
            name: pluginConfig.name || id,
            version: pluginConfig.version || '0.1.0',
            icon: pluginConfig.icon || '🔌'
        };

        // Enregistrer plugin
        await window.pluginSystem.register(PluginClass, manifest);

        // Activer plugin
        const context = {
            storage: window.storageManager,
            events: window.eventBus,
            config: window.configManager,
            router: window.router || null
        };

        await window.pluginSystem.enable(id, context);

        console.log(`✅ Plugin "${id}" loaded and activated`);
    }

    /**
     * Marquer l'application comme prête
     */
    markReady() {
        // Cacher loading indicator
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }

        // Afficher app container
        const app = document.getElementById('app');
        if (app) {
            app.classList.remove('hidden');
        }

        // Émettre événement ready
        window.eventBus?.emit('app:ready');

        console.log('✅ Pensine ready');
    }
}

// Auto-start au chargement DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.pensineBootstrap = new PensineBootstrap();
        window.pensineBootstrap.init().catch(console.error);
    });
} else {
    window.pensineBootstrap = new PensineBootstrap();
    window.pensineBootstrap.init().catch(console.error);
}

export default PensineBootstrap;
