# Plan de Travail - Pensine Bootstrap Architecture

**Date**: 2026-01-15
**Phase actuelle**: Bootstrap micro-kernel
**Version cible**: v0.1.0 → v0.5.0

---

## 📊 État Actuel

### ✅ Complété (4 commits récents)

1. **Architecture bootstrap minimale** (f3d5bf8)

   - src/bootstrap.js - Loader principal
   - index-minimal.html - Point d'entrée ultra-léger
   - Schémas de configuration (bootstrap.json, .pensine-config.json)

2. **Exports ES6 modules** (56523ac)

   - StorageManager + méthodes compatibilité (list, readJSON, writeJSON)
   - LocalStorageAdapter + StorageAdapterBase
   - Imports dynamiques des adapters
   - Tests wizard-flow.spec.mjs fonctionnel ✅

3. **Plugin loading framework** (0b138ad)

   - Bootstrap: auto-détection Panini plugins
   - Bootstrap: support chemins custom plugins
   - Plugin hello-world créé (demo)
   - Tests plugin-loading.spec.mjs

4. **Stratégie Wasm** (907bd84)
   - Décision architecturale documentée
   - Vanilla JS first, Wasm optionnel later
   - Cibles: search (23x), git (15x), graphs

### 🔄 En Cours (blockers)

**Problème critique**: Plugin activation ne fonctionne pas

- Plugin chargé et enregistré ✅
- `activate()` pas appelée malgré `isPaniniPlugin=true` ❌
- Logs ajoutés dans PluginSystem.enable() pour debug
- Hypothèses:
  1. Context Panini pas correctement passé
  2. Plugin wrappé incorrectement
  3. Async timing issue

**Tests**:

- 16 tests totaux
- wizard-flow.spec.mjs: ✅ PASS
- plugin-loading.spec.mjs: ❌ FAIL (plugin UI pas visible)
- bootstrap.spec.mjs: ✅ PASS
- config-system-integration: 7/12 PASS

### 📦 Fichiers modifiés non committés

```
app.js
docs/ARCHITECTURE_DECISION_LOG.md
docs/BOOTSTRAP_ARCHITECTURE.md
index-minimal.html
plugins/pensine-plugin-hello/plugin.js
src/bootstrap.js
src/lib/components/config-wizard.js
src/lib/components/storage-manager-unified.js
tests/plugin-loading.spec.mjs
```

---

## 🎯 Priorités Immédiates

### P0 - Debug plugin activation (cette session)

**Objectif**: Faire fonctionner `HelloPlugin.activate()`

**Actions**:

1. ✅ Vérifier logs PluginSystem.enable() ajoutés
2. 🔄 Inspecter `pluginData.plugin` vs `PluginClass`
3. 🔄 Vérifier `pluginData.isPaniniPlugin` flag
4. 🔄 Tester appel direct `plugin.activate(context)`
5. 🔄 Comparer avec plugins Legacy fonctionnels

**Critère succès**:

- Log "🎯 HelloPlugin.activate() called" visible
- Element `#hello-plugin` injecté dans DOM
- Test plugin-loading.spec.mjs PASS

---

### P1 - Stabiliser bootstrap flow (cette semaine)

**Objectif**: Bootstrap → Storage → Plugins → App ready 100% fiable

**Actions**:

1. Fixer plugin activation (P0)
2. Tester les 3 storage modes:
   - ✅ local (IndexedDB)
   - ⏳ github (PAT)
   - ⏳ local-git (OPFS)
3. Vérifier cascade config: bootstrap → remote → plugins
4. Tester wizard → config → reload → app ready
5. Tous tests bootstrap/wizard/plugin GREEN

**Critère succès**:

- 3/3 storage modes fonctionnels
- Plugin hello-world s'affiche
- Tests 100% PASS
- Aucune régression sur wizard

---

### P2 - Migrer premier plugin réel (semaine prochaine)

**Objectif**: Extraire Calendar ou Editor en vrai plugin

**Actions**:

1. Choisir plugin (recommandé: Calendar - moins couplé)
2. Créer structure: `plugins/pensine-plugin-calendar/`
3. Implémenter interface PaniniPlugin:

   ```javascript
   - constructor()
   - async activate(context)
   - async deactivate()
   - getConfigSchema()
   ```

4. Migrer code depuis `lib/calendar.js`
5. Tester: activation, UI rendering, events
6. Documenter processus migration

**Critère succès**:

- Calendar fonctionne comme plugin
- Pas de régression fonctionnelle
- Code isolé du core
- Config via .pensine-config.json

---

## 🗺️ Roadmap Q1 2026

### Semaine 1-2 (Jan 15-26): Bootstrap Foundation

- [x] Architecture bootstrap ✅
- [x] ES6 exports ✅
- [x] Plugin loading framework ✅
- [ ] **Plugin activation fix** ← ON EST ICI
- [ ] Tests bootstrap 100% GREEN
- [ ] Storage modes validés (3/3)

### Semaine 3-4 (Jan 27 - Feb 7): Plugin Migration

- [ ] Calendar migré en plugin
- [ ] Editor migré en plugin
- [ ] History migré en plugin
- [ ] Inbox migré en plugin
- [ ] Journal migré en plugin

### Semaine 5-6 (Feb 10-21): Polish & Documentation

- [ ] Guide développement plugins
- [ ] API documentation (JSDoc)
- [ ] Performance profiling
- [ ] Bundle size optimization
- [ ] Migration automatique anciens users

### Semaine 7-8 (Feb 24 - Mar 7): Production Ready

- [ ] Tests E2E complets
- [ ] Security audit
- [ ] Backup/restore tool
- [ ] v0.5.0 release
- [ ] Deploy pensine.org

---

## 🏗️ Stratégies de Chargement

### 1. Bootstrap Progressive

**Actuel**:

```
Loading Indicator
  ↓
Bootstrap.init()
  ↓
Wizard (si pas de config)
  ↓
Storage init
  ↓
Config remote load
  ↓
Plugin system init
  ↓
Load plugins
  ↓
App ready (hide loading, show #app)
```

**Optimisation future (v0.3+)**:

- Lazy load plugins (on-demand)
- Preload critical plugins (editor)
- Defer optional plugins (inbox, reflection)
- Code splitting par plugin

### 2. Module Loading Strategy

**Actuel**: Dynamic imports ES6

```javascript
// Bootstrap
const { default: StorageManager } = await import(
  "./lib/components/storage-manager-unified.js"
);

// Plugins
const { default: PluginClass } = await import(pluginPath);
```

**Avantages**:

- ✅ Pas de bundler
- ✅ Modules natifs browser
- ✅ Lazy loading gratuit
- ✅ Cache HTTP par fichier

**Contraintes**:

- ⚠️ Pas de tree-shaking
- ⚠️ Waterfall requests (mitigé par HTTP/2)
- ⚠️ Imports absolus nécessaires

### 3. Storage Loading Strategy

**Pattern actuel**:

```javascript
// 1. Bootstrap config (localStorage)
const bootstrap = JSON.parse(localStorage.getItem("pensine-bootstrap"));

// 2. Init storage adapter
await storageManager.initialize(bootstrap);

// 3. Remote config (from storage)
const remoteConfig = await storageManager.readJSON(".pensine-config.json");

// 4. Merge configs
this.config = { ...localDefaults, ...remoteConfig };
```

**Problèmes potentiels**:

- 🐛 LocalStorageAdapter: config en localStorage vs IndexedDB
- 🐛 ConfigManager appelle `storage.list()` trop tôt?
- 🔄 Race condition config load vs plugin system init?

**Solution proposée**:

```javascript
// Attendre explicitement storage ready
await storageManager.initialize(bootstrap);
await storageManager.waitReady(); // ← Nouvelle méthode

// Puis charger config
const remoteConfig = await loadRemoteConfig();
```

### 4. Plugin Loading Strategy

**Actuel (séquentiel)**:

```javascript
for (const plugin of enabledPlugins) {
  await loadPlugin(plugin); // Un par un
}
```

**Optimisation v0.3**:

```javascript
// Paralléliser plugins indépendants
const criticalPlugins = ["editor"]; // Load first
const optionalPlugins = ["calendar", "inbox"]; // Load after

await Promise.all(criticalPlugins.map((p) => loadPlugin(p)));

// Puis optionnels en background
Promise.all(optionalPlugins.map((p) => loadPlugin(p))).catch(console.warn); // Non-blocking
```

### 5. Dependency Resolution

**Futur (v0.4+)**: Graph de dépendances

```json
{
  "plugins": {
    "editor": {
      "enabled": true,
      "dependencies": [] // No deps
    },
    "reflection": {
      "enabled": true,
      "dependencies": ["editor"] // Needs editor
    }
  }
}
```

**Algorithme**:

1. Build dependency graph
2. Topological sort
3. Load in correct order
4. Detect circular deps

---

## 🔍 Points d'Attention

### Performance

**Métriques cibles**:

- [ ] Bootstrap → App ready: <2s (cold start)
- [ ] Bootstrap → App ready: <500ms (warm cache)
- [ ] Plugin load: <100ms par plugin
- [ ] Storage init: <300ms (local), <1s (GitHub)

**Outils**:

- Performance.mark/measure
- Chrome DevTools Performance tab
- Lighthouse CI

### Bundle Size

**Actuel estimé**:

- Core (bootstrap + config): ~50 KB
- StorageManager: ~30 KB
- PluginSystem: ~20 KB
- **Total base**: ~100 KB

**Par plugin**:

- Editor: ~100 KB (MarkdownIt, CodeMirror)
- Calendar: ~30 KB
- History: ~20 KB
- Inbox: ~15 KB

**Cible v0.5**: <300 KB total chargé (hors gros plugins opt-in)

### Security

**Checklist**:

- [ ] Token GitHub jamais en clair (localStorage chiffré)
- [ ] CSP headers configurés
- [ ] Plugin sandbox (future)
- [ ] XSS prevention (sanitize HTML)
- [ ] CORS configuré correctement

### Backwards Compatibility

**Stratégie migration v0.0.x → v0.5**:

1. Détection ancien format config
2. Migration automatique localStorage
3. Fallback vers legacy system si échec
4. Warning user "migration requise"
5. Outil export/import data

---

## 📝 Documentation à Créer

### Développeur

- [ ] **Plugin Development Guide**

  - Interface PaniniPlugin
  - Lifecycle (activate/deactivate)
  - Context API (storage, events, config)
  - Config schema (JSON Schema)
  - Testing plugins
  - Publishing plugins

- [ ] **Architecture Deep Dive**

  - Bootstrap flow détaillé
  - Event system patterns
  - Storage abstraction layers
  - Plugin system internals

- [ ] **API Reference**
  - EventBus API
  - PluginSystem API
  - ConfigManager API
  - StorageManager API

### Utilisateur

- [ ] **Migration Guide v0.0 → v0.5**

  - Backup data
  - Migration steps
  - Troubleshooting
  - Rollback procedure

- [ ] **Configuration Guide**
  - Storage modes comparison
  - Plugin catalog
  - Settings reference
  - Best practices

---

## 🧪 Testing Strategy

### Unit Tests (futur)

```javascript
// test/unit/
├── bootstrap.test.js
├── plugin-system.test.js
├── config-manager.test.js
└── storage-manager.test.js
```

### Integration Tests (actuel)

```javascript
// tests/
├── bootstrap.spec.mjs ✅
├── wizard-flow.spec.mjs ✅
├── plugin-loading.spec.mjs ❌ (à fixer)
└── config-system-integration.spec.mjs 🟡 (7/12)
```

### E2E Tests (v0.5)

```javascript
// tests/e2e/
├── new-user-onboarding.spec.mjs
├── plugin-install.spec.mjs
├── multi-device-sync.spec.mjs
└── data-migration.spec.mjs
```

---

## 🚨 Risques Identifiés

| Risque                                  | Probabilité | Impact   | Mitigation                |
| --------------------------------------- | ----------- | -------- | ------------------------- |
| Plugin activation bug bloque tout       | **HAUTE**   | Critique | **P0 - fixer maintenant** |
| Migration plugins plus longue que prévu | Moyenne     | Haute    | Timeline buffer 1 semaine |
| Storage modes instables                 | Faible      | Haute    | Tests exhaustifs par mode |
| Performance dégradation                 | Faible      | Moyenne  | Profiling continu         |
| Breaking changes users                  | Moyenne     | Haute    | Migration auto + fallback |

---

## 🎯 Critères de Succès v0.5

### Fonctionnel

- [ ] Bootstrap flow 100% fiable
- [ ] 3 storage modes fonctionnels
- [ ] 5 plugins core migrés et fonctionnels
- [ ] Wizard configuration complet
- [ ] Migration auto depuis v0.0.x

### Qualité

- [ ] Tests 100% GREEN (20+ tests)
- [ ] Coverage >80%
- [ ] Zero erreurs console
- [ ] Performance <2s cold start
- [ ] Bundle <300 KB

### Documentation

- [ ] Guide développeur plugin complet
- [ ] API reference complète
- [ ] Guide migration utilisateur
- [ ] Architecture documentée

### Production

- [ ] Deploy pensine.org
- [ ] Security audit passé
- [ ] Backup/restore tool
- [ ] Rollback procedure testée

---

## 📅 Prochaines Actions (Immédiat)

### Aujourd'hui (Jan 15)

1. **Debug plugin activation** (2-3h)

   - Examiner logs PluginSystem.enable()
   - Tracer flow: register() → enable() → activate()
   - Fix + test hello-world
   - Commit fix

2. **Review changements non committés** (1h)

   - Examiner diff des 9 fichiers modifiés
   - Décider: commit, revert, ou continuer edit
   - Clean workspace

3. **Stabiliser tests** (1-2h)
   - Fixer plugin-loading.spec.mjs
   - Vérifier wizard-flow.spec.mjs
   - Run full test suite
   - Document résultats

### Cette semaine (Jan 15-19)

1. **Storage modes validation**

   - Test local ✅
   - Test github (PAT)
   - Test local-git (OPFS)

2. **Plugin migration proof**

   - Choisir Calendar
   - Créer structure plugin
   - Migrer code basique
   - Test activation

3. **Documentation bootstrap**
   - Compléter BOOTSTRAP_ARCHITECTURE.md
   - Créer PLUGIN_DEVELOPMENT.md
   - Diagrammes flow

---

**Statut**: 🔄 EN COURS - Debug plugin activation
**Bloqueur**: Plugin.activate() pas appelé
**Prochaine étape**: Examiner logs PluginSystem.enable()
**ETA v0.5**: Mi-mars 2026
