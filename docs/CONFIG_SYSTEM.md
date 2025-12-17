# Système de Configuration par Plugin

## Vue d'ensemble

Le système de configuration de Pensine est organisé par plugin avec gestion dynamique des schémas JSON. Chaque plugin peut définir son propre schéma de configuration, et l'interface utilisateur se génère automatiquement.

## Architecture

```
Configuration System
├── core/config-manager.js          # Gestionnaire centralisé
├── lib/json-schema-form-builder.js # Génération de formulaires
├── views/settings-view.js          # Interface utilisateur
├── lib/settings-integration.js     # Intégration avec app.js
└── styles/settings.css             # Styles du panneau
```

## Fichier de configuration

La configuration est stockée dans `.pensine-config.json` à la racine du repository :

```json
{
  "core": {
    "theme": "auto",
    "language": "fr",
    "storageMode": "github",
    "autoSave": true,
    "autoSaveDelay": 2000
  },
  "plugins": {
    "calendar": {
      "startWeekOn": "monday",
      "showWeekNumbers": false,
      "monthsToDisplay": 6,
      "highlightToday": true,
      "scrollBehavior": "smooth",
      "colorScheme": "default"
    },
    "inbox": {
      "defaultPriority": "medium",
      "autoArchive": true
    }
  }
}
```

## Utilisation pour les plugins

### 1. Définir le schéma de configuration

Dans votre plugin, ajoutez une méthode statique `getConfigSchema()` :

```javascript
export default class MyPlugin {
  static getConfigSchema() {
    return {
      title: 'My Plugin Configuration',
      description: 'Configure my plugin behavior',
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          title: 'Enable feature',
          description: 'Turn on/off this feature',
          default: true
        },
        maxItems: {
          type: 'number',
          title: 'Maximum items',
          description: 'How many items to display',
          minimum: 1,
          maximum: 100,
          default: 10
        },
        theme: {
          type: 'string',
          title: 'Color theme',
          enum: ['light', 'dark', 'auto'],
          default: 'auto'
        }
      },
      required: ['enabled']
    };
  }

  static getDefaultConfig() {
    return {
      enabled: true,
      maxItems: 10,
      theme: 'auto'
    };
  }
}
```

### 2. Enregistrer le schéma lors de l'activation

Dans la méthode `enable()` de votre plugin :

```javascript
async enable() {
  // Enregistrer le schéma de configuration
  if (this.context.config) {
    this.context.config.registerPluginSchema(
      this.id,
      MyPlugin.getConfigSchema(),
      MyPlugin.getDefaultConfig()
    );
  }

  // Charger la configuration
  this.config = await this.context.config.getPluginConfig(this.id);

  console.log('[MyPlugin] Configuration loaded:', this.config);
}
```

### 3. Utiliser la configuration

Accéder aux valeurs de configuration :

```javascript
// Obtenir toute la config
const config = this.context.config.getPluginConfig(this.id);

// Obtenir une valeur spécifique (support dot notation)
const maxItems = this.context.config.getPluginValue(this.id, 'maxItems', 10);

// Valeurs imbriquées
const nestedValue = this.context.config.getPluginValue(this.id, 'view.showToolbar', true);
```

### 4. Modifier la configuration

Sauvegarder des changements :

```javascript
// Mettre à jour toute la config
await this.context.config.setPluginConfig(this.id, {
  enabled: true,
  maxItems: 20,
  theme: 'dark'
});

// Mettre à jour une valeur spécifique
await this.context.config.setPluginValue(this.id, 'maxItems', 20);

// Merge avec l'existant (par défaut)
await this.context.config.setPluginConfig(this.id, {
  maxItems: 20  // Les autres valeurs sont préservées
}, true);
```

### 5. Écouter les changements

Réagir aux modifications de configuration :

```javascript
this.context.events.on('config:plugin-updated', ({ pluginId, newConfig }) => {
  if (pluginId === this.id) {
    console.log('[MyPlugin] Configuration updated:', newConfig);
    this.config = newConfig;
    this.applyNewConfig();
  }
});
```

## JSON Schema - Types supportés

### String
```javascript
{
  type: 'string',
  title: 'Username',
  minLength: 3,
  maxLength: 20,
  pattern: '^[a-zA-Z0-9]+$'
}
```

### String (Textarea)
```javascript
{
  type: 'string',
  format: 'textarea',
  title: 'Description',
  minLength: 10,
  maxLength: 500
}
```

### Number
```javascript
{
  type: 'number',
  title: 'Count',
  minimum: 0,
  maximum: 100,
  default: 10
}
```

### Boolean
```javascript
{
  type: 'boolean',
  title: 'Enable feature',
  default: true
}
```

### Enum (Select)
```javascript
{
  type: 'string',
  title: 'Theme',
  enum: ['light', 'dark', 'auto'],
  default: 'auto'
}
```

### Array
```javascript
{
  type: 'array',
  title: 'Tags',
  items: {
    type: 'string'
  },
  default: ['tag1', 'tag2']
}
```

### Object (Nested)
```javascript
{
  type: 'object',
  title: 'View settings',
  properties: {
    showToolbar: {
      type: 'boolean',
      title: 'Show toolbar',
      default: true
    },
    toolbarPosition: {
      type: 'string',
      enum: ['top', 'bottom'],
      default: 'top'
    }
  }
}
```

## Interface utilisateur

### Afficher le panneau de settings

```javascript
// Depuis app.js ou autre script global
window.showModernSettings();

// Ou via l'instance
if (window.settingsView) {
  window.settingsView.show();
}
```

### Fonctionnalités de l'UI

- **Onglets par plugin** : Navigation facile entre plugins
- **Génération automatique** : Formulaires créés depuis les schémas
- **Validation en temps réel** : Selon les contraintes du schéma
- **Export/Import** : Sauvegarder/restaurer la configuration complète
- **Reset par plugin** : Retour aux valeurs par défaut
- **Notifications** : Feedback visuel des opérations

## API ConfigManager

### Initialisation

```javascript
import ConfigManager from './core/config-manager.js';

const configManager = new ConfigManager(storageManager, eventBus);
await configManager.init();
```

### Méthodes principales

#### `registerPluginSchema(pluginId, schema, defaults)`
Enregistre le schéma et les valeurs par défaut d'un plugin.

#### `getPluginConfig(pluginId)`
Retourne la configuration complète d'un plugin (merged avec defaults).

#### `setPluginConfig(pluginId, config, merge = true)`
Met à jour la configuration d'un plugin.

#### `getPluginValue(pluginId, key, defaultValue)`
Obtient une valeur spécifique (support dot notation).

#### `setPluginValue(pluginId, key, value)`
Définit une valeur spécifique.

#### `resetPluginConfig(pluginId)`
Réinitialise aux valeurs par défaut.

#### `validateConfig(config, schema)`
Valide une configuration selon son schéma.

### Méthodes de persistance

#### `load()`
Charge `.pensine-config.json` depuis le storage.

#### `save()`
Sauvegarde dans `.pensine-config.json`.

## Événements

Le ConfigManager émet des événements via l'EventBus :

```javascript
// Configuration chargée
eventBus.on('config:loaded', ({ config }) => {});

// Configuration sauvegardée
eventBus.on('config:saved', ({ config }) => {});

// Plugin mis à jour
eventBus.on('config:plugin-updated', ({ pluginId, oldConfig, newConfig }) => {});

// Core mis à jour
eventBus.on('config:core-updated', ({ oldConfig, newConfig }) => {});

// Erreur de validation
eventBus.on('config:validation-error', ({ pluginId, errors }) => {});

// Erreur générale
eventBus.on('config:error', ({ action, error }) => {});
```

## Bonnes pratiques

### 1. Toujours définir des valeurs par défaut
```javascript
static getDefaultConfig() {
  return {
    enabled: true,
    maxItems: 10
  };
}
```

### 2. Documenter les propriétés
```javascript
{
  type: 'number',
  title: 'Max items',
  description: 'Maximum number of items to display in the list',
  minimum: 1,
  maximum: 100
}
```

### 3. Valider les entrées utilisateur
Le système valide automatiquement selon le schéma, mais vous pouvez ajouter une validation personnalisée :

```javascript
async setPluginConfig(pluginId, config) {
  // Validation personnalisée
  if (config.maxItems > 1000) {
    throw new Error('maxItems cannot exceed 1000');
  }

  return await this.context.config.setPluginConfig(pluginId, config);
}
```

### 4. Utiliser des enums pour les choix
Plutôt que des strings libres, utilisez des enums :

```javascript
{
  type: 'string',
  enum: ['option1', 'option2', 'option3'],
  default: 'option1'
}
```

### 5. Grouper les settings logiquement
Pour les configurations complexes, utilisez des objets imbriqués :

```javascript
{
  type: 'object',
  properties: {
    display: {
      type: 'object',
      title: 'Display settings',
      properties: {
        theme: { ... },
        layout: { ... }
      }
    },
    behavior: {
      type: 'object',
      title: 'Behavior settings',
      properties: {
        autoSave: { ... },
        notifications: { ... }
      }
    }
  }
}
```

## Migration depuis l'ancien système

Si vous avez des plugins utilisant l'ancien système de configuration :

### Avant (ancien système)
```javascript
// Dans plugin
const config = await this.context.config.get('myPlugin');

// Pas de schéma, pas de validation
```

### Après (nouveau système)
```javascript
// 1. Ajouter le schéma
static getConfigSchema() {
  return { /* ... */ };
}

// 2. Enregistrer lors de l'activation
async enable() {
  this.context.config.registerPluginSchema(
    this.id,
    MyPlugin.getConfigSchema(),
    MyPlugin.getDefaultConfig()
  );

  this.config = await this.context.config.getPluginConfig(this.id);
}

// 3. Utiliser la nouvelle API
const value = this.context.config.getPluginValue(this.id, 'key', default);
```

## Débogage

### Afficher la configuration en cours
```javascript
console.log('All config:', window.modernConfigManager.getAll());
console.log('Plugin config:', window.modernConfigManager.getPluginConfig('calendar'));
```

### Vérifier les schémas enregistrés
```javascript
const plugins = window.modernConfigManager.getConfiguredPlugins();
console.log('Configured plugins:', plugins);

plugins.forEach(pluginId => {
  const schema = window.modernConfigManager.getPluginSchema(pluginId);
  console.log(`Schema for ${pluginId}:`, schema);
});
```

### Tester la validation
```javascript
const schema = CalendarPlugin.getConfigSchema();
const testConfig = { startWeekOn: 'invalid' };

const result = window.modernConfigManager.validateConfig(testConfig, schema);
console.log('Validation result:', result);
// { valid: false, errors: [...] }
```

## Exemples complets

Voir les exemples dans :
- `plugins/pensine-plugin-calendar/calendar-plugin.js` - Implémentation complète
- `docs/EXAMPLES_CONFIG.md` - Exemples de schémas variés (à créer)

## Support et contribution

Pour ajouter de nouvelles fonctionnalités au système de configuration :
1. Mettre à jour `core/config-manager.js`
2. Étendre `lib/json-schema-form-builder.js` si nouveaux types
3. Ajuster `views/settings-view.js` pour la nouvelle UI
4. Documenter dans ce README

## License

MIT - Voir LICENSE à la racine du projet
