# @panini/plugin-interface

> Common plugin interface for the Panini ecosystem

[![npm version](https://img.shields.io/npm/v/@panini/plugin-interface.svg)](https://www.npmjs.com/package/@panini/plugin-interface)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

---

## 🎯 Overview

This package provides TypeScript interfaces and types shared across the **Panini ecosystem**:

- 🧠 **[Pensine](https://github.com/stephanedenis/pensine-web)** - Personal knowledge management
- 🌊 **OntoWave** - Ontology navigator
- 📁 **PaniniFS** - Semantic filesystem with fractal compression

Write your plugin **once**, use it **everywhere**! ✨

---

## 📦 Installation

```bash
npm install @panini/plugin-interface
```

For alpha releases:
```bash
npm install @panini/plugin-interface@alpha
```

---

## 🚀 Quick Start

### Creating a Plugin

```typescript
import { PaniniPlugin, PaniniPluginContext } from "@panini/plugin-interface";

export default class MyPlugin implements PaniniPlugin {
  manifest = {
    id: "my-plugin",
    name: "My Plugin",
    version: "1.0.0",
    description: "Does something cool",
  };

  async activate(context: PaniniPluginContext) {
    // Initialize your plugin
    context.logger.info("MyPlugin activated!");

    // Listen to events
    context.events.on(
      "file:opened",
      (data) => {
        console.log("File opened:", data.path);
      },
      this.manifest.id
    );

    // Register config schema
    context.config.registerSchema(
      this.manifest.id,
      {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          theme: { type: "string" },
        },
      },
      {
        enabled: true,
        theme: "default",
      }
    );
  }

  async deactivate() {
    // Clean up
  }
}
```

### Using in Host Application

```typescript
import { PaniniPlugin, PaniniPluginContext } from "@panini/plugin-interface";
import MyPlugin from "@my-scope/my-plugin";

// Create context
const context: PaniniPluginContext = {
  app: "pensine",
  version: "1.0.0",
  events: eventBus,
  config: configManager,
  storage: storageAdapter,
  features: {
    markdown: true,
    hotReload: false,
    semanticSearch: false,
    offline: true,
  },
  logger: console,
};

// Instantiate and activate
const plugin = new MyPlugin();
await plugin.activate(context);
```

## API Reference

### Core Interfaces

- **`PaniniPlugin`** - Main plugin interface
- **`PaniniPluginContext`** - Runtime context provided to plugins
- **`PaniniPluginManifest`** - Plugin metadata

### Event System

- **`EventBus`** - Pub/sub event system
- **`PaniniEvents`** - Common event names

### Configuration

- **`ConfigManager`** - Hierarchical config with JSON Schema validation
- **`JSONSchema`** - Schema definition for config validation

### Storage

- **`StorageAdapter`** - Abstract storage interface
- **`FileMetadata`** - File metadata structure
- **`SearchResult`** - Semantic search result

## Examples

See [examples/](./examples/) directory for complete plugin examples:

- `examples/simple-plugin/` - Basic plugin structure
- `examples/markdown-renderer/` - Markdown rendering plugin
- `examples/storage-adapter/` - Custom storage adapter

## Development

```bash
# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

## License

MIT © Stéphane Denis

## Links

- [Documentation](https://docs.panini.dev/plugin-interface)
- [Panini Ecosystem](https://panini.dev)
- [GitHub](https://github.com/panini-ecosystem/plugin-interface)
