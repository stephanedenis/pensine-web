# Phase 1.1 Complete: Interface Plugin Commune

**Date**: 2026-01-14
**Status**: ✅ Implémenté
**Package**: `@panini/plugin-interface` v0.1.0

---

## 📦 Ce qui a été créé

### Structure du package

```
packages/plugin-interface/
├── src/
│   ├── index.ts                 # Point d'entrée, exports tout
│   └── types/
│       ├── manifest.ts          # PaniniPluginManifest + validation
│       ├── context.ts           # PaniniPluginContext (runtime)
│       ├── plugin.ts            # PaniniPlugin interface + states
│       ├── events.ts            # EventBus + événements communs
│       ├── config.ts            # ConfigManager + JSON Schema
│       └── storage.ts           # StorageAdapter + métadonnées
├── package.json                 # NPM package definition
├── tsconfig.json                # TypeScript config
├── README.md                    # Documentation API
├── LICENSE                      # MIT
└── .gitignore
```

### Interfaces principales

#### 1. **PaniniPlugin** (types/plugin.ts)

Interface principale que tous les plugins doivent implémenter:

```typescript
interface PaniniPlugin {
  manifest: PaniniPluginManifest;
  activate(context: PaniniPluginContext): Promise<void>;
  deactivate(): Promise<void>;
  onConfigChange?(newConfig: Record<string, any>): Promise<void>;
  healthCheck?(): Promise<boolean>;
}
```

**Lifecycle states**:

- `UNLOADED` → `LOADED` → `ACTIVE` → `DEACTIVATING`
- `ERROR` (si échec activation)

#### 2. **PaniniPluginContext** (types/context.ts)

Runtime environment fourni aux plugins:

```typescript
interface PaniniPluginContext {
  app: "pensine" | "ontowave" | "panini-fs";
  version: string;
  events: EventBus;
  config: ConfigManager;
  storage: StorageAdapter;
  features: FeatureFlags;
  logger: Logger;
  user?: UserInfo;
}
```

**FeatureFlags** disponibles:

- `markdown` - Support rendu Markdown
- `hotReload` - Hot-reload dev
- `semanticSearch` - Recherche sémantique
- `offline` - Mode offline
- Extensible: `[key: string]: boolean`

#### 3. **EventBus** (types/events.ts)

Pub/sub system pour communication inter-plugins:

```typescript
interface EventBus {
  on(event: string, handler: EventHandler, namespace?: string): void;
  once(event: string, handler: EventHandler, namespace?: string): void;
  off(event: string, handler: EventHandler, namespace?: string): void;
  emit(event: string, data?: any): void;
  clearNamespace(namespace: string): void;
}
```

**Événements standardisés**: `PaniniEvents`

- Lifecycle: `app:ready`, `app:error`
- Plugins: `plugin:activated`, `plugin:deactivated`, `plugin:error`
- Config: `config:changed`, `config:saved`
- Storage: `storage:ready`, `storage:error`
- Files: `file:opened`, `file:saved`, `file:deleted`
- Markdown: `markdown:render`, `markdown:rendered`
- UI: `ui:theme-changed`, `ui:modal-opened`, `ui:modal-closed`

#### 4. **ConfigManager** (types/config.ts)

Configuration hiérarchique avec JSON Schema:

```typescript
interface ConfigManager {
  getCoreConfig(): Record<string, any>;
  setCoreConfig(config: Record<string, any>): Promise<void>;
  getPluginConfig(pluginId: string): Record<string, any>;
  setPluginConfig(pluginId: string, config: Record<string, any>): Promise<void>;
  registerSchema(
    pluginId: string,
    schema: JSONSchema,
    defaults?: Record<string, any>
  ): void;
  validate(pluginId: string, config: Record<string, any>): ValidationResult;
  isLoaded(): boolean;
}
```

#### 5. **StorageAdapter** (types/storage.ts)

Interface abstraite pour persistence:

```typescript
interface StorageAdapter {
  readonly name: string;
  initialize(config: Record<string, any>): Promise<void>;
  isConfigured(): boolean;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string, message?: string): Promise<void>;
  deleteFile(path: string, message?: string): Promise<void>;
  listFiles(path: string): Promise<string[]>;
  fileExists(path: string): Promise<boolean>;
  getFileMetadata?(path: string): Promise<FileMetadata>;
  semanticSearch?(query: string): Promise<SearchResult[]>;
}
```

---

## 🎯 Exemple d'utilisation

### Créer un plugin

```typescript
import { PaniniPlugin, PaniniPluginContext } from "@panini/plugin-interface";

export default class PlantUMLPlugin implements PaniniPlugin {
  manifest = {
    id: "plantuml",
    name: "PlantUML Renderer",
    version: "1.0.0",
    description: "Render PlantUML diagrams",
    author: "Panini Team",
    tags: ["markdown", "diagram", "visualization"],
  };

  async activate(context: PaniniPluginContext) {
    context.logger.info(`[${this.manifest.id}] Activating...`);

    // Register config schema
    context.config.registerSchema(
      this.manifest.id,
      {
        type: "object",
        properties: {
          serverUrl: { type: "string" },
          theme: { type: "string", enum: ["default", "dark"] },
        },
      },
      {
        serverUrl: "https://plantuml.com/plantuml",
        theme: "default",
      }
    );

    // Listen to markdown render events
    context.events.on(
      "markdown:render",
      async (data) => {
        const config = context.config.getPluginConfig(this.manifest.id);
        // Render PlantUML blocks...
      },
      this.manifest.id
    );

    context.logger.info(`[${this.manifest.id}] Activated!`);
  }

  async deactivate() {
    // Cleanup happens via clearNamespace(this.manifest.id)
  }
}
```

### Utiliser dans Pensine

```typescript
// pensine-web/src/app-init.js
import PlantUMLPlugin from "@panini/plugin-plantuml";

// Create context matching PaniniPluginContext
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
};

// Instantiate and activate
const plugin = new PlantUMLPlugin();
await plugin.activate(context);
```

### Utiliser dans OntoWave

```typescript
// Panini-OntoWave/src/core/plugin-manager.ts
import PlantUMLPlugin from "@panini/plugin-plantuml";

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

const plugin = new PlantUMLPlugin();
await plugin.activate(context);
```

---

## ✅ Compatibilité

### Pensine actuel

**Adapters à créer**:

- [ ] Wrapper `EventBus` actuel → `PaniniPluginContext.events`
- [ ] Wrapper `ConfigManager` actuel → `PaniniPluginContext.config`
- [ ] Wrapper `StorageManager` → `StorageAdapter`

**Impact**: Minimal - wrappers thin, pas de refactor majeur

### OntoWave actuel

**Adapters à créer**:

- [ ] Wrapper plugin system OntoWave → `PaniniPlugin`
- [ ] Créer `EventBus` (n'existe pas encore)
- [ ] Wrapper config HTML → `ConfigManager`

**Impact**: Moyen - EventBus à implémenter

---

## 📋 Prochaines Étapes

### Immédiat (Cette semaine)

- [ ] **Build le package**: `cd packages/plugin-interface && npm install && npm run build`
- [ ] **Publier en alpha**: `npm publish --tag alpha` (version 0.1.0-alpha.1)
- [ ] **Tester dans Pensine**: Créer wrappers compatibilité

### Court terme (Semaine 2)

- [ ] **Adapter PluginSystem Pensine** pour utiliser `PaniniPlugin`
- [ ] **Créer exemple complet** dans `packages/plugin-interface/examples/`
- [ ] **Documentation complète** sur docs.panini.dev

### Moyen terme (Phase 1.2)

- [ ] **Créer `@panini/plugin-plantuml`** utilisant cette interface
- [ ] **Porter dans OntoWave**
- [ ] **Tests cross-project** dans CI/CD

---

## 📊 Métriques

| Métrique                    | Valeur               |
| --------------------------- | -------------------- |
| **Fichiers TypeScript**     | 7                    |
| **Interfaces exportées**    | 15+                  |
| **Événements standardisés** | 12                   |
| **Lignes de code**          | ~500                 |
| **Documentation**           | README complet       |
| **Dépendances**             | 0 (runtime), 3 (dev) |

---

## 🔗 Références

- Package: `packages/plugin-interface/`
- README: `packages/plugin-interface/README.md`
- Stratégie: `docs/PANINI_INTEGRATION_STRATEGY.md`
- Types: `packages/plugin-interface/src/types/*.ts`

---

**Statut**: 🟢 Ready for testing
**Next**: Build, publish alpha, test in Pensine
**Owner**: Stéphane Denis (@stephanedenis)
