# Changelog

All notable changes to `@panini/plugin-interface` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-alpha.1] - 2026-01-14

### 🎉 Initial Alpha Release

First public release of the common plugin interface for the Panini ecosystem (Pensine, OntoWave, PaniniFS).

### Added

#### Core Interfaces
- **PaniniPlugin** - Main plugin contract with lifecycle methods
  - `activate(context)` - Initialize plugin
  - `deactivate()` - Cleanup resources
  - `onConfigChange(key, value)` - React to config updates (optional)
  - `healthCheck()` - Report plugin health (optional)

- **PaniniPluginContext** - Runtime environment provided to plugins
  - `app` - Application name (pensine, ontowave, panini-fs)
  - `version` - App version
  - `events` - EventBus instance
  - `config` - ConfigManager instance
  - `storage` - StorageAdapter instance
  - `features` - Feature flags
  - `logger` - Logging utility

- **EventBus** - Pub/sub system with namespace support
  - `on(event, handler, namespace?)` - Subscribe
  - `off(event, handler)` - Unsubscribe
  - `emit(event, data)` - Publish
  - `clearNamespace(namespace)` - Remove all handlers in namespace

- **ConfigManager** - Configuration with JSON Schema validation
  - `getPluginConfig(pluginId)` - Get config
  - `setPluginConfig(pluginId, config)` - Set config (validates)
  - `registerSchema(pluginId, schema, defaults)` - Register validation

- **StorageAdapter** - Abstracted persistence layer
  - `readFile(path)` - Read file content
  - `writeFile(path, content)` - Write file
  - `listFiles(path)` - List directory
  - `fileExists(path)` - Check existence

#### Types & Enums
- **PluginState** - Plugin lifecycle states
  - UNINITIALIZED, INITIALIZING, ACTIVE, ERROR, DISABLED

- **PaniniEvents** - Standard event constants (12 events)
  - Application: app:ready, app:shutdown
  - Plugin: plugin:activated, plugin:deactivated, plugin:error
  - File: file:opened, file:saved, file:closed
  - Journal: journal:entry-open, journal:entry-close
  - Editor: editor:content-change, editor:mode-change

- **PaniniPluginManifest** - Plugin metadata
  - Core fields: id, name, version, description, author
  - Advanced: tags, dependencies, permissions, icon
  - Panini-specific: panini.interface version

#### Examples
- Word Counter Plugin - Full implementation example
  - Counts words/characters in journal entries
  - Configurable UI position (top/bottom)
  - JSON Schema validation
  - Namespace-based cleanup

#### Documentation
- **README.md** (270 lines) - Complete guide
  - Quick start
  - Installation instructions
  - API reference
  - Usage examples
  - Best practices

- **ARCHITECTURE.md** - System design
  - Architecture diagrams (ASCII art)
  - Component relationships
  - Data flow
  - Integration patterns

- **QUICKREF.md** - Quick reference
  - Command cheatsheet
  - Common patterns
  - Troubleshooting

- **examples/README.md** - Example walkthrough
  - Word Counter step-by-step
  - Best practices
  - Testing strategies

### Technical Details

- **Language**: TypeScript 5.3
- **Target**: ES2020
- **Module**: CommonJS (for compatibility)
- **Type Safety**: Strict mode enabled
- **Dependencies**: 0 runtime dependencies
- **Dev Dependencies**: typescript, vitest
- **Bundle Size**: ~15 KB (uncompressed)

### Testing

- **Unit Tests**: 9 tests (100% passing)
  - Types export validation
  - Interface implementation
  - Real-world usage scenarios
- **Test Runner**: Vitest
- **Coverage**: All exported interfaces tested

### Quality Assurance

- ✅ TypeScript compilation successful (0 errors)
- ✅ All tests passing
- ✅ Syntax validation clean
- ✅ No security vulnerabilities
- ✅ Documentation complete

### Notes

- This is an **alpha release** - API may change before 1.0.0
- Designed for Panini ecosystem only
- Breaking changes expected in future alphas
- Feedback welcome via GitHub issues

### Contributors

- Stéphane Denis (@stephanedenis) - Initial implementation
- GitHub Copilot - Development assistance

---

## Version History

### Alpha Releases

- **0.1.0-alpha.1** (2026-01-14) - Initial public alpha

### Planned

- **0.1.0-alpha.2** - Bug fixes + feedback integration
- **0.2.0-alpha.1** - Additional interfaces (UI components?)
- **1.0.0-beta.1** - Feature freeze, API stabilization
- **1.0.0** - Stable release

---

## Migration Guide

### From No Interface (Legacy Plugins)

If you have existing plugins without this interface:

1. Install package: `npm install @panini/plugin-interface@alpha`
2. Implement `PaniniPlugin` interface
3. Use `PaniniPluginContext` instead of global dependencies
4. Replace manual cleanup with `context.events.clearNamespace()`
5. Add JSON Schema for config validation
6. Implement optional `healthCheck()` method

See [`docs/PLUGIN_MIGRATION_GUIDE.md`](../../docs/PLUGIN_MIGRATION_GUIDE.md) for detailed steps.

### Breaking Changes

None yet (first release).

---

## Links

- **NPM**: https://www.npmjs.com/package/@panini/plugin-interface
- **GitHub**: https://github.com/stephanedenis/pensine-web/tree/main/packages/plugin-interface
- **Issues**: https://github.com/stephanedenis/pensine-web/issues
- **Documentation**: [README.md](README.md)

---

**Legend**:
- 🎉 Major feature
- ✨ Enhancement
- 🐛 Bug fix
- 📚 Documentation
- ⚠️ Breaking change
- 🔒 Security

[Unreleased]: https://github.com/stephanedenis/pensine-web/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/stephanedenis/pensine-web/releases/tag/v0.1.0-alpha.1
