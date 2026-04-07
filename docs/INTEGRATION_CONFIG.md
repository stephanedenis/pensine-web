# Guide d'Intégration du Système de Configuration

## Intégration dans app.js

Pour intégrer le nouveau système de configuration dans `app.js`, suivez ces étapes :

### 1. Importer les modules nécessaires

Ajoutez au début de `app.js` ou dans un fichier d'initialisation :

```javascript
// Après l'import de storageManager et eventBus
import { initializeModernConfig, showSettings } from './lib/settings-integration.js';
```

### 2. Initialiser le système de configuration

Dans la méthode `init()` de `PensineApp`, après l'initialisation du storage :

```javascript
async init() {
    // ... initialisation existante (storage, editor, etc.)

    // Initialiser le système de plugins (si pas déjà fait)
    if (!window.pluginSystem) {
        const { default: EventBus } = await import('./core/event-bus.js');
        const { default: PluginSystem } = await import('./core/plugin-system.js');

        window.eventBus = new EventBus();
        window.pluginSystem = new PluginSystem(window.eventBus, storageManager);
        await window.pluginSystem.init();
    }

    // Initialiser le système de configuration moderne
    const { configManager, settingsView } = await initializeModernConfig(
        storageManager,
        window.eventBus,
        window.pluginSystem
    );

    // Stocker les références
    this.configManager = configManager;
    this.settingsView = settingsView;

    // ... reste de l'initialisation
}
```

### 3. Remplacer l'ancien showSettings()

Remplacer la méthode `showSettings()` existante dans `PensineApp` :

```javascript
// ANCIEN (à supprimer ou commenter)
/*
async showSettings() {
    // ... ancien code avec modal ou édition JSON brute
}
*/

// NOUVEAU
async showSettings() {
    if (this.settingsView) {
        this.settingsView.show();
    } else {
        console.error('[PensineApp] Settings view not initialized');
        // Fallback: afficher wizard ou message d'erreur
        if (window.configWizard) {
            configWizard.show();
        }
    }
}
```

### 4. Mettre à jour le bouton Settings

Le bouton settings dans `index.html` ou l'event listener dans `app.js` :

```javascript
setupEventListeners() {
    // ... autres listeners

    // Bouton settings - déjà connecté, juste s'assurer qu'il appelle this.showSettings()
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            this.showSettings();
        });
    }
}
```

### 5. Charger et enregistrer les plugins

Exemple avec le plugin calendar :

```javascript
async loadPlugins() {
    // Import du plugin calendar
    const { default: CalendarPlugin } = await import('./plugins/pensine-plugin-calendar/calendar-plugin.js');

    // Créer le contexte du plugin
    const context = {
        storage: storageManager,
        events: window.eventBus,
        router: window.router || null,
        config: this.configManager  // IMPORTANT: passer le ConfigManager
    };

    // Instancier et enregistrer le plugin
    await window.pluginSystem.register(CalendarPlugin, {
        id: 'calendar',
        name: 'Calendar',
        version: '0.1.0',
        icon: '📅',
        description: 'Linear calendar view'
    });

    // Activer le plugin
    await window.pluginSystem.enable('calendar', context);
}
```

## Alternative : Intégration Minimale

Si vous voulez tester sans modifier massivement `app.js` :

### Option A : Script global

Créer `lib/init-modern-config.js` :

```javascript
// Initialisation autonome du système de configuration
(async function() {
    // Attendre que storageManager soit disponible
    while (!window.storageManager) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Importer et initialiser
    const { initializeModernConfig } = await import('./settings-integration.js');

    const { default: EventBus } = await import('../core/event-bus.js');
    const { default: PluginSystem } = await import('../core/plugin-system.js');

    window.eventBus = window.eventBus || new EventBus();
    window.pluginSystem = window.pluginSystem || new PluginSystem(window.eventBus, window.storageManager);

    await window.pluginSystem.init();

    await initializeModernConfig(
        window.storageManager,
        window.eventBus,
        window.pluginSystem
    );

    console.log('✅ Modern config system initialized');
})();
```

Puis dans `index.html`, après les autres scripts :

```html
<script type="module" src="lib/init-modern-config.js"></script>
```

### Option B : Hook sur le bouton settings

Sans modifier `app.js`, juste intercepter le clic :

```javascript
// Dans un script global ou dans index.html
document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('settings-btn');

    if (settingsBtn) {
        // Retirer les anciens listeners
        const newBtn = settingsBtn.cloneNode(true);
        settingsBtn.parentNode.replaceChild(newBtn, settingsBtn);

        // Ajouter le nouveau listener
        newBtn.addEventListener('click', () => {
            if (window.settingsView) {
                window.settingsView.show();
            } else {
                console.warn('Settings view not ready yet');
            }
        });
    }
});
```

## Vérification de l'intégration

Après l'intégration, tester :

### 1. Console DevTools

```javascript
// Vérifier que tout est chargé
console.log('ConfigManager:', window.modernConfigManager);
console.log('SettingsView:', window.settingsView);
console.log('PluginSystem:', window.pluginSystem);

// Tester l'accès à la config
window.modernConfigManager.getAll();
window.modernConfigManager.getPluginConfig('calendar');
```

### 2. Ouvrir le panneau

```javascript
// Afficher le panneau de settings
window.showModernSettings();

// Vérifier que le panneau s'affiche
// Vérifier que les onglets apparaissent (Core + plugins configurés)
```

### 3. Tester la sauvegarde

```javascript
// Modifier une valeur dans le formulaire
// Cliquer sur "Save"
// Vérifier dans la console :
window.modernConfigManager.getPluginConfig('calendar');

// Vérifier que .pensine-config.json a été mis à jour dans le storage
```

## Dépannage

### Le panneau ne s'affiche pas

1. Vérifier que `styles/settings.css` est chargé :

```javascript
console.log(document.querySelector('link[href*="settings.css"]'));
```

1. Vérifier que SettingsView est instancié :

```javascript
console.log(window.settingsView);
```

1. Regarder la console pour les erreurs d'import

### Les formulaires sont vides

1. Vérifier que les plugins ont enregistré leurs schémas :

```javascript
const configured = window.modernConfigManager.getConfiguredPlugins();
console.log('Configured plugins:', configured);

configured.forEach(id => {
    const schema = window.modernConfigManager.getPluginSchema(id);
    console.log(`Schema for ${id}:`, schema);
});
```

1. Vérifier que le plugin a bien appelé `registerPluginSchema()` dans `enable()`

### Les modifications ne sont pas sauvegardées

1. Vérifier que le StorageManager est initialisé :

```javascript
console.log('Storage mode:', window.storageManager.currentMode);
```

1. Vérifier les erreurs dans la console lors de la sauvegarde

2. Tester manuellement :

```javascript
await window.modernConfigManager.save();
```

## Migration de l'ancien ConfigManager

Si vous aviez un ancien `ConfigManager` dans `app.js`, voici comment migrer :

### Ancien code

```javascript
class ConfigManager {
    async loadFromGitHub() { ... }
    async saveToGitHub(key, value) { ... }
}

const configManager = new ConfigManager();
```

### Nouveau code

```javascript
// Supprimer l'ancien ConfigManager de app.js
// Utiliser le nouveau système importé

// Dans init()
import { initializeModernConfig } from './lib/settings-integration.js';

const { configManager } = await initializeModernConfig(
    storageManager,
    eventBus,
    pluginSystem
);

this.configManager = configManager;
```

### Adapter les appels existants

```javascript
// AVANT
const value = configManager.get('someKey');
await configManager.saveToGitHub('someKey', 'value');

// APRÈS - Core config
const value = this.configManager.getCoreConfig().someKey;
await this.configManager.setCoreConfig({ someKey: 'value' });

// APRÈS - Plugin config
const value = this.configManager.getPluginValue('pluginId', 'key');
await this.configManager.setPluginValue('pluginId', 'key', 'value');
```

## Prochaines étapes

Après intégration réussie :

1. ✅ Tester avec le plugin calendar
2. ⏳ Créer les schémas pour les autres plugins (inbox, journal, reflection)
3. ⏳ Ajouter des tests automatisés
4. ⏳ Documenter dans `docs/ARCHITECTURE_TEMPS.md`

## Support

Pour toute question ou problème d'intégration, consulter :

- `docs/CONFIG_SYSTEM.md` - Documentation complète du système
- `docs/SPECIFICATIONS_TECHNIQUES.md` - Architecture globale
- `docs/journal-de-bord/` - Historique des décisions techniques
