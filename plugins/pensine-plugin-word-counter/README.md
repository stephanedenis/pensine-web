# Word Counter Plugin

Plugin de démonstration utilisant `@panini/plugin-interface`.

## 📊 Fonctionnalités

- ✅ Compte les mots et caractères en temps réel
- ✅ Affichage dans un badge flottant
- ✅ Configuration via JSON Schema
- ✅ Position configurable (haut/bas)
- ✅ Interval de mise à jour configurable
- ✅ Compatible Pensine et OntoWave

## 🔧 Configuration

```json
{
  "enabled": true,
  "showCharCount": true,
  "updateInterval": 500,
  "position": "bottom"
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Activer le comptage |
| `showCharCount` | boolean | `true` | Afficher nombre de caractères |
| `updateInterval` | number | `500` | Interval de mise à jour (ms) |
| `position` | string | `"bottom"` | Position: `"top"` ou `"bottom"` |

## 📡 Événements

### Écoutés

- `journal:entry-open` - Quand une entrée est ouverte
- `editor:content-change` - Quand le contenu change
- `config:plugin-updated` - Quand la config change

### Émis

- `word-counter:updated` - Quand les stats changent
  ```javascript
  {
    path: string,
    wordCount: number,
    charCount: number
  }
  ```

## 🎯 API publique

```javascript
const plugin = pluginSystem.getPlugin('word-counter');

// Obtenir stats
const stats = plugin.getStats();
console.log(stats); // { words: 325, chars: 1842 }

// Reset
plugin.reset();
```

## 🏗️ Architecture

Ce plugin démontre les patterns @panini/plugin-interface:

### 1. Manifest
```javascript
manifest = {
  id: 'word-counter',
  name: 'Word Counter',
  version: '1.0.0',
  tags: ['productivity', 'stats'],
  dependencies: []
}
```

### 2. Lifecycle
```javascript
async activate(context) {
  // Register schema
  context.config.registerSchema(id, schema, defaults);
  
  // Subscribe to events with namespace
  context.events.on(event, handler, this.manifest.id);
  
  // Create UI
  this.createUI();
}

async deactivate() {
  // Auto cleanup via namespace
  context.events.clearNamespace(this.manifest.id);
}
```

### 3. Context injection
```javascript
const context = {
  app: 'pensine',
  version: '1.0.0',
  events: EventBus,
  config: ConfigManager,
  storage: StorageAdapter,
  features: { markdown: true },
  logger: console
};
```

## 🧪 Tests

```bash
# Charger Pensine
# Activer plugin dans Settings
# Ouvrir un journal

# Vérifier:
# 1. Badge apparaît en bas à droite
# 2. Compte se met à jour quand vous tapez
# 3. Settings permet de changer position/config
```

## 🔗 Ressources

- [@panini/plugin-interface](../../packages/plugin-interface/)
- [Panini Integration Strategy](../../docs/PANINI_INTEGRATION_STRATEGY.md)
- [Plugin Examples](../../packages/plugin-interface/examples/)

---

**Version**: 1.0.0  
**License**: MIT  
**Author**: Panini Team
