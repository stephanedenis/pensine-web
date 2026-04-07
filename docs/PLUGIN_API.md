# Plugin API Documentation - Pensine Web

**Version**: v0.0.22 (Panini Integration Phase 1.1)
**Date**: 2026-01-27
**Status**: Stable

---

## 🎯 Vue d'Ensemble

Pensine Web utilise une **architecture plugin-first** basée sur l'interface `@panini/plugin-interface`. Les plugins étendent les fonctionnalités de l'application sans modifier le core.

### Principes de Design

- ✅ **Isolation**: Chaque plugin est indépendant
- ✅ **Communication**: EventBus pour inter-plugin messaging
- ✅ **Configuration**: JSON Schema pour settings
- ✅ **Lifecycle**: activate/deactivate hooks
- ✅ **Context**: Accès contrôlé aux services core

---

## 📦 Structure d'un Plugin

### Arborescence Recommandée

```
plugins/pensine-plugin-example/
├── plugin.js                  # Point d'entrée principal
├── manifest.json              # Métadonnées
├── schema.json                # Configuration JSON Schema
├── README.md                  # Documentation
├── package.json               # Dépendances npm (optionnel)
└── assets/                    # Ressources (optionnel)
    ├── icons/
    └── styles/
```

---

## 🔌 Interface PaniniPlugin

### Définition TypeScript

```typescript
interface PaniniPlugin {
  manifest: PluginManifest;
  activate(context: PaniniPluginContext): Promise<void>;
  deactivate(): Promise<void>;
}

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  dependencies?: string[];
  configSchema?: object; // JSON Schema
}

interface PaniniPluginContext {
  eventBus: EventBus;
  configManager: ConfigManager;
  storage: StorageManager;
  features: FeatureFlags;
  logger: Console;
  user: User | null;
}
```

---

## 🚀 Créer un Plugin Simple

### Étape 1: Structure de Base

```javascript
// plugins/pensine-plugin-hello/plugin.js

class HelloPlugin {
  constructor() {
    this.manifest = {
      id: 'pensine-plugin-hello',
      name: 'Hello Plugin',
      version: '1.0.0',
      description: 'Plugin d\'exemple minimal',
      author: 'Votre Nom'
    };
  }

  async activate(context) {
    console.log('✨ Hello Plugin activated!');
    this.context = context;

    // Écouter un événement
    context.eventBus.on('app:ready', () => {
      console.log('App is ready!');
    });
  }

  async deactivate() {
    console.log('👋 Hello Plugin deactivated');
    // Cleanup resources
  }
}

export default HelloPlugin;
```

### Étape 2: Manifest JSON

```json
// plugins/pensine-plugin-hello/manifest.json
{
  "id": "pensine-plugin-hello",
  "name": "Hello Plugin",
  "version": "1.0.0",
  "description": "Plugin d'exemple minimal",
  "author": "Votre Nom",
  "main": "plugin.js"
}
```

### Étape 3: Enregistrement

```javascript
// Dans app.js ou bootstrap.js
import HelloPlugin from './plugins/pensine-plugin-hello/plugin.js';

// Enregistrer le plugin
await pluginSystem.register(
  HelloPlugin, 
  HelloPlugin.prototype.manifest,
  true // isPaniniPlugin
);

// Activer le plugin
await pluginSystem.activate('pensine-plugin-hello');
```

---

## 🎛️ PaniniPluginContext API

### 1. EventBus

```javascript
// Écouter un événement
context.eventBus.on('note:created', (data) => {
  console.log('Note created:', data);
});

// Émettre un événement
context.eventBus.emit('plugin:hello:greet', { 
  message: 'Hello World!' 
});

// Se désabonner
context.eventBus.off('note:created', handlerFunction);
```

**Événements Système**:

- `app:ready` - Application initialisée
- `app:beforeunload` - Application va se fermer
- `config:changed` - Configuration modifiée
- `storage:ready` - Storage initialisé
- `note:created`, `note:updated`, `note:deleted` - CRUD notes
- `calendar:dateSelected` - Date sélectionnée dans calendrier
- `editor:opened`, `editor:closed` - Éditeur ouvert/fermé

---

### 2. ConfigManager

```javascript
// Lire une configuration
const appName = await context.configManager.get('core.appName');

// Modifier une configuration
await context.configManager.set('core.theme', 'dark');

// Écouter changements config
context.eventBus.on('config:changed', ({ namespace, key, value }) => {
  console.log(`Config ${namespace}.${key} = ${value}`);
});

// Valider avec JSON Schema
const valid = context.configManager.validate('plugin:hello', {
  greetingMessage: 'Bonjour!'
});
```

---

### 3. StorageManager

```javascript
// Lire un fichier
const content = await context.storage.readFile('notes/example.md');

// Écrire un fichier
await context.storage.writeFile('notes/hello.md', '# Hello\n\nContent');

// Lister fichiers
const files = await context.storage.listFiles('notes/');

// Supprimer un fichier
await context.storage.deleteFile('notes/old.md');
```

---

### 4. Features (Feature Flags)

```javascript
// Vérifier disponibilité fonctionnalité
if (context.features.markdown) {
  // Utiliser markdown renderer
}

if (context.features.offline) {
  // Mode offline disponible
}

// Flags disponibles:
// - markdown: boolean
// - hotReload: boolean
// - semanticSearch: boolean
// - offline: boolean
```

---

### 5. Logger

```javascript
// Logging standard
context.logger.log('Info message');
context.logger.warn('Warning message');
context.logger.error('Error message');

// Groupes de logs
context.logger.group('Plugin Hello');
context.logger.log('Step 1');
context.logger.log('Step 2');
context.logger.groupEnd();
```

---

### 6. User (si auth activé)

```javascript
if (context.user) {
  console.log('Username:', context.user.username);
  console.log('Email:', context.user.email);
  console.log('Repos:', context.user.repos);
}
```

---

## ⚙️ Configuration Plugin (JSON Schema)

### Définir le Schéma

```json
// plugins/pensine-plugin-hello/schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "greetingMessage": {
      "type": "string",
      "title": "Message de salutation",
      "description": "Message affiché au démarrage",
      "default": "Hello, World!"
    },
    "showTimestamp": {
      "type": "boolean",
      "title": "Afficher horodatage",
      "default": false
    },
    "maxGreetings": {
      "type": "number",
      "title": "Nombre max de salutations",
      "minimum": 1,
      "maximum": 100,
      "default": 10
    },
    "greetingStyle": {
      "type": "string",
      "title": "Style de salutation",
      "enum": ["formal", "casual", "fun"],
      "default": "casual"
    }
  },
  "required": ["greetingMessage"]
}
```

### Enregistrer le Schéma

```javascript
class HelloPlugin {
  async activate(context) {
    // Enregistrer schéma de configuration
    const schema = await fetch('./schema.json').then(r => r.json());
    context.configManager.registerSchema('plugin:hello', schema);

    // Lire config utilisateur
    const config = await context.configManager.get('plugin:hello');
    console.log('Greeting:', config.greetingMessage);
  }
}
```

---

## 🎨 Intégration UI

### Ajouter un Bouton dans Sidebar

```javascript
async activate(context) {
  // Créer bouton
  const btn = document.createElement('button');
  btn.id = 'hello-plugin-btn';
  btn.textContent = '👋';
  btn.title = 'Hello Plugin';
  btn.onclick = () => this.showGreeting();

  // Injecter dans sidebar
  const sidebar = document.querySelector('.sidebar');
  sidebar.appendChild(btn);
}

showGreeting() {
  alert('Hello from plugin!');
}

async deactivate() {
  // Cleanup UI
  document.getElementById('hello-plugin-btn')?.remove();
}
```

---

### Ajouter un Onglet dans Settings

Le schéma JSON est automatiquement généré en formulaire dans Settings UI.

```javascript
// Aucun code nécessaire !
// ConfigManager + SettingsView s'occupent de tout
```

---

## 📢 Communication Inter-Plugins

### Publier un Événement

```javascript
// Plugin A
context.eventBus.emit('plugin:calendar:dateSelected', {
  date: '2026-01-27',
  timestamp: Date.now()
});
```

### Écouter un Événement

```javascript
// Plugin B
context.eventBus.on('plugin:calendar:dateSelected', (data) => {
  console.log('Date selected:', data.date);
  // Charger journal pour cette date
});
```

---

## 🔄 Lifecycle Hooks

### Activation

```javascript
async activate(context) {
  // 1. Initialiser état
  this.state = { active: true };

  // 2. Enregistrer configuration
  await this.registerConfig(context);

  // 3. Attacher event listeners
  this.attachListeners(context);

  // 4. Initialiser UI
  await this.initUI();

  // 5. Charger données
  await this.loadData(context.storage);
}
```

### Désactivation

```javascript
async deactivate() {
  // 1. Détacher event listeners
  this.detachListeners();

  // 2. Cleanup UI
  this.cleanupUI();

  // 3. Sauvegarder état
  await this.saveState();

  // 4. Libérer ressources
  this.state = null;
}
```

---

## 🧪 Testing Plugin

### Test Unitaire

```javascript
// plugins/pensine-plugin-hello/hello.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import HelloPlugin from './plugin.js';

describe('HelloPlugin', () => {
  let plugin;
  let mockContext;

  beforeEach(() => {
    plugin = new HelloPlugin();
    mockContext = {
      eventBus: { on: vi.fn(), emit: vi.fn() },
      configManager: { get: vi.fn(), set: vi.fn() },
      logger: console
    };
  });

  it('should activate successfully', async () => {
    await plugin.activate(mockContext);
    expect(plugin.context).toBe(mockContext);
  });

  it('should listen to app:ready event', async () => {
    await plugin.activate(mockContext);
    expect(mockContext.eventBus.on).toHaveBeenCalledWith(
      'app:ready', 
      expect.any(Function)
    );
  });
});
```

---

## 📦 Distribution Plugin

### Via Git Submodule (Recommandé)

```bash
# Ajouter plugin comme submodule
cd pensine-web
git submodule add https://github.com/you/pensine-plugin-hello plugins/pensine-plugin-hello

# Utilisateurs clonent avec
git clone --recursive https://github.com/you/pensine-web
```

### Via npm Package

```json
// package.json du plugin
{
  "name": "@pensine/plugin-hello",
  "version": "1.0.0",
  "main": "plugin.js",
  "files": ["plugin.js", "schema.json", "manifest.json"]
}
```

```bash
# Installer
npm install @pensine/plugin-hello

# Importer
import HelloPlugin from '@pensine/plugin-hello';
```

---

## 🛡️ Best Practices

### ✅ À Faire

1. **Nommer avec préfixe**: `pensine-plugin-XXX`
2. **Version sémantique**: `1.0.0`, `1.1.0`, `2.0.0`
3. **Cleanup dans deactivate**: Toujours libérer ressources
4. **Utiliser EventBus**: Pour communication asynchrone
5. **JSON Schema**: Pour configuration typée
6. **README complet**: Usage, configuration, exemples
7. **Tester isolément**: Tests unitaires pour chaque plugin

### ❌ À Éviter

1. **Pas de global scope**: Ne polluez pas `window`
2. **Pas de DOM direct sans cleanup**: Toujours remove listeners
3. **Pas de dépendances lourdes**: Garder plugins légers
4. **Pas de mutations state global**: Utiliser ConfigManager
5. **Pas de hardcoded values**: Toujours configurable
6. **Pas de sync blocking**: Toujours async

---

## 📚 Exemples de Plugins Officiels

### Calendar Plugin

```javascript
// plugins/pensine-plugin-calendar/plugin.js
class CalendarPlugin {
  async activate(context) {
    this.calendar = new LinearCalendar('#calendar-container', {
      startWeekOn: 'Monday',
      onDateSelected: (date) => {
        context.eventBus.emit('calendar:dateSelected', { date });
      }
    });
  }
}
```

### Journal Plugin

```javascript
// plugins/pensine-plugin-journal/plugin.js
class JournalPlugin {
  async activate(context) {
    context.eventBus.on('calendar:dateSelected', async ({ date }) => {
      const journalPath = `journals/${date}.md`;
      const content = await context.storage.readFile(journalPath);
      this.openInEditor(content, date);
    });
  }
}
```

### Inbox Plugin

```javascript
// plugins/pensine-plugin-inbox/plugin.js
class InboxPlugin {
  async activate(context) {
    this.inbox = [];
    const inboxContent = await context.storage.readFile('inbox.md');
    this.parseInbox(inboxContent);
    this.renderInboxUI();
  }
}
```

---

## 🔗 Ressources

- [Spécifications Techniques](./SPECIFICATIONS_TECHNIQUES.md)
- [Panini Integration Strategy](./PANINI_INTEGRATION_STRATEGY.md)
- [Plugin Interface Package](../packages/plugin-interface/README.md)
- [Exemples Plugins](../plugins/)

---

## 🆘 Support

Questions? Ouvrez une issue GitHub avec le tag `plugin-api`.

**Mainteneur**: Stéphane Denis (@stephanedenis)
**Dernière mise à jour**: 2026-01-27
