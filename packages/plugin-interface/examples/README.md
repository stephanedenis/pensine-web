# Exemples de Plugins Panini

Ce dossier contient des exemples concrets de plugins utilisant `@panini/plugin-interface`.

---

## 📋 Exemples disponibles

### 1. Word Counter (`example-plugin.ts`)

Plugin simple qui compte les mots et caractères dans les documents Markdown.

**Fonctionnalités démontrées**:

- ✅ Implémentation complète de `PaniniPlugin`
- ✅ Configuration via JSON Schema
- ✅ Event listeners avec namespace cleanup
- ✅ Lecture de fichiers via `StorageAdapter`
- ✅ Health check
- ✅ Gestion des changements de config
- ✅ Émission d'événements custom
- ✅ API publique pour autres plugins

**Config par défaut**:

```json
{
  "enabled": true,
  "showCharCount": true,
  "updateInterval": 500
}
```

**Événements émis**:

- `word-counter:updated` - Quand les stats changent
  - `data: { path: string, wordCount: number, charCount: number }`

**Événements écoutés**:

- `file:opened` - Ouverture d'un fichier
- `markdown:render` - Rendu Markdown
- `config:changed` - Changement de config

---

## 🚀 Utilisation dans Pensine

```typescript
// pensine-web/app.js
import WordCounterPlugin from "@panini/plugin-word-counter";

// 1. Créer le contexte Panini
const context = {
  app: "pensine",
  version: "1.0.0",
  events: window.eventBus,
  config: window.modernConfigManager,
  storage: storageManager,
  features: {
    markdown: true,
    hotReload: false,
    semanticSearch: false,
    offline: true,
  },
  logger: console,
  user: {
    id: "user123",
    name: "John Doe",
  },
};

// 2. Instancier et activer le plugin
const wordCounter = new WordCounterPlugin();
await wordCounter.activate(context);

// 3. Utiliser l'API publique
const stats = wordCounter.getStats();
console.log(`Words: ${stats.words}, Chars: ${stats.chars}`);

// 4. Écouter les événements du plugin
context.events.on("word-counter:updated", (data) => {
  console.log(`Updated: ${data.wordCount} words in ${data.path}`);
});

// 5. Changer la config
await context.config.setPluginConfig("word-counter", {
  enabled: true,
  showCharCount: false,
  updateInterval: 1000,
});

// 6. Cleanup à la fermeture
await wordCounter.deactivate();
```

---

## 🌊 Utilisation dans OntoWave

```typescript
// Panini-OntoWave/src/plugin-manager.ts
import WordCounterPlugin from "@panini/plugin-word-counter";

// 1. Créer le contexte OntoWave
const context = {
  app: "ontowave",
  version: "2.0.0",
  events: this.eventBus,
  config: this.configManager,
  storage: this.storageAdapter,
  features: {
    markdown: true,
    hotReload: true,
    semanticSearch: false,
    offline: false,
  },
  logger: this.logger,
};

// 2. Activer le plugin
const wordCounter = new WordCounterPlugin();
await wordCounter.activate(context);

// Le reste est identique à Pensine !
```

**C'est le même code!** Le plugin fonctionne identiquement dans les deux apps.

---

## 🏗️ Créer votre propre plugin

### Template de base

```typescript
import {
  PaniniPlugin,
  PaniniPluginContext,
  PaniniPluginManifest,
  PluginState,
} from "@panini/plugin-interface";

export default class MyPlugin implements PaniniPlugin {
  private state = PluginState.UNLOADED;
  private context?: PaniniPluginContext;

  manifest: PaniniPluginManifest = {
    id: "my-plugin",
    name: "My Awesome Plugin",
    version: "1.0.0",
    description: "Does amazing things",
    author: "Your Name",
    tags: ["markdown", "productivity"],
  };

  async activate(context: PaniniPluginContext): Promise<void> {
    this.context = context;
    this.state = PluginState.ACTIVE;

    // 1. Enregistrer schema config
    context.config.registerSchema(
      this.manifest.id,
      {
        type: "object",
        properties: {
          myOption: { type: "boolean" },
        },
      },
      { myOption: true }
    );

    // 2. Lire config
    const config = context.config.getPluginConfig(this.manifest.id);

    // 3. Écouter événements
    context.events.on(
      "file:opened",
      async (data) => {
        // Votre logique ici
      },
      this.manifest.id
    );

    context.logger.info(`[${this.manifest.id}] Activated!`);
  }

  async deactivate(): Promise<void> {
    if (!this.context) return;

    this.context.events.clearNamespace(this.manifest.id);
    this.state = PluginState.UNLOADED;
  }

  async healthCheck(): Promise<boolean> {
    return this.state === PluginState.ACTIVE;
  }
}
```

### Checklist de développement

- [ ] Définir `manifest` avec metadata correcte
- [ ] Implémenter `activate()` et `deactivate()`
- [ ] Enregistrer JSON Schema pour config
- [ ] Utiliser namespace pour event listeners
- [ ] Ajouter `healthCheck()` si pertinent
- [ ] Gérer `onConfigChange()` si nécessaire
- [ ] Tester dans Pensine ET OntoWave
- [ ] Documenter events émis et écoutés
- [ ] Ajouter tests unitaires

---

## 🧪 Tests

### Test unitaire d'un plugin

```typescript
import { describe, it, expect, vi } from "vitest";
import WordCounterPlugin from "./example-plugin";

describe("WordCounterPlugin", () => {
  it("should activate successfully", async () => {
    const plugin = new WordCounterPlugin();

    const mockContext = {
      app: "pensine",
      version: "1.0.0",
      events: {
        on: vi.fn(),
        emit: vi.fn(),
        clearNamespace: vi.fn(),
      },
      config: {
        registerSchema: vi.fn(),
        getPluginConfig: vi.fn(() => ({
          enabled: true,
          showCharCount: true,
          updateInterval: 500,
        })),
      },
      storage: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
      },
      features: { markdown: true },
      logger: console,
    };

    await plugin.activate(mockContext as any);

    expect(await plugin.healthCheck()).toBe(true);
    expect(mockContext.config.registerSchema).toHaveBeenCalled();
  });

  it("should count words correctly", () => {
    const plugin = new WordCounterPlugin();
    // Test la logique de comptage
  });
});
```

---

## 📚 Resources

### Documentation

- [Plugin Interface README](../README.md) - API complète
- [Type Definitions](../src/types/) - Toutes les interfaces TypeScript
- [Integration Strategy](../../../docs/PANINI_INTEGRATION_STRATEGY.md) - Vision globale

### Plugins existants à étudier

- **Pensine**: `plugins/pensine-plugin-*/`
- **OntoWave**: `~/GitHub/Panini-OntoWave/plugins/`

### Conventions

- **ID plugin**: kebab-case (`my-plugin`)
- **Namespace events**: Utiliser plugin ID
- **Config defaults**: Toujours fournir
- **Error handling**: Try-catch + logger
- **Cleanup**: `clearNamespace()` dans `deactivate()`

---

## 🤝 Contribution

Pour proposer un nouvel exemple:

1. Fork le repo
2. Créer `examples/my-example.ts`
3. Ajouter section dans ce README
4. Tester dans Pensine ET OntoWave
5. Pull request

---

**Maintainer**: Stéphane Denis (@stephanedenis)
**License**: MIT
**Version**: 0.1.0
