# Architecture du Système de Configuration Moderne

**Version**: 1.0
**Date**: 2026-01-14
**Status**: Émergent - À valider comme direction future

---

## 🎯 Vue Globale

Le système de configuration moderne est une architecture modulaire construite sur **3 piliers**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     PensineApp (app.js)                         │
│                  Orchestration générale                         │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ├─────────────────────────────────────────────────────┐
           │                                                     │
           ▼                                                     ▼
    ┌────────────────┐                          ┌──────────────────────┐
    │   EventBus     │                          │   PluginSystem       │
    │   (Pub/Sub)    │◄──────────────────────►  │   (Registry)         │
    └────────────────┘                          └──────────────────────┘
           ▲                                             │
           │                                             │
           │              ┌──────────────────────────────┘
           │              │
           │              ▼
           │      ┌──────────────────┐
           └──────┤ ConfigManager    │
                  │ (Persistance +   │
                  │  Validation)     │
                  └──────────────────┘
                          │
                          ▼
                  ┌──────────────────┐
                  │  StorageManager  │
                  │  (localStorage/  │
                  │   IndexedDB)     │
                  └──────────────────┘
                          │
                          ▼
                  GitHub .pensine-config.json
```

---

## 📦 Composant 1: EventBus

**Fichier**: `src/core/event-bus.js`

**Responsabilité**: Communication décuplée entre plugins

**API Publique**:

```javascript
// S'abonner à un événement
eventBus.on("event:name", callback, pluginId);

// Se désabonner
eventBus.off("event:name", callback);

// Émettre un événement
eventBus.emit("event:name", data, sourcePluginId);

// Obtenir stats
eventBus.getEvents();
eventBus.getStats();
```

**Événements Supportés** (voir EVENTS map complète):

```javascript
// Plugin lifecycle
"plugin:registered";
"plugin:enabled";
"plugin:disabled";
"plugin:error";

// Configuration
"config:loaded";
"config:changed";
"config:saved";

// Domain-specific
"calendar:day-click";
"inbox:item-captured";
"journal:entry-save";
"reflection:insight-generated";
```

**Avantages**:

- ✅ Zéro couplage entre plugins
- ✅ Scalable pour N plugins
- ✅ Testable (mock facile)
- ✅ Historique d'événements possible

**Limitations**:

- ❌ Événements perdus si pas écouté avant emit
- ❌ Pas de garantie d'ordre
- ❌ Pas de rejeu d'état

---

## 🔌 Composant 2: PluginSystem

**Fichier**: `src/core/plugin-system.js` (~384 lignes)

**Responsabilité**: Gestion du cycle de vie et orchestration des plugins

**Cycle de Vie**:

```
1. register(PluginClass, manifest)
   ├─ Vérifier dépendances
   ├─ Créer contexte plugin
   ├─ Instancier plugin
   └─ Émettre 'plugin:registered'

2. activate(pluginId)
   ├─ Valider dépendances activées
   ├─ Appeler plugin.activate()
   ├─ Charger config du plugin
   └─ Émettre 'plugin:enabled'

3. deactivate(pluginId)
   ├─ Appeler plugin.deactivate()
   └─ Émettre 'plugin:disabled'
```

**Plugins Actuels**:

```
pensine-plugin-calendar/   - Gestion calendrier
pensine-plugin-inbox/      - Capture et triage
pensine-plugin-journal/    - Journalisation
pensine-plugin-reflection/ - Notes et insights
pensine-plugin-accelerator/ - Aide au développement
```

**Manifest de Plugin** (exemple):

```javascript
{
  id: 'calendar',
  name: 'Calendar Plugin',
  version: '1.0.0',
  dependencies: [],
  configSchema: { /* JSON Schema */ },
  configDefaults: { /* Valeurs par défaut */ }
}
```

**API Principale**:

```javascript
async pluginSystem.register(PluginClass, manifest);
async pluginSystem.activate(pluginId);
async pluginSystem.deactivate(pluginId);
async pluginSystem.loadPluginConfigs();
async pluginSystem.savePluginConfig(pluginId, config);
```

---

## ⚙️ Composant 3: ConfigManager

**Fichier**: `src/core/config-manager.js` (~443 lignes)

**Responsabilité**: Centraliser et valider la configuration

**Structure de Configuration**:

```json
{
  "core": {
    "theme": "dark",
    "language": "fr-CA",
    "autoSave": true
  },
  "plugins": {
    "calendar": {
      "weekStartDay": 1,
      "viewMode": "month"
    },
    "inbox": {
      "inboxSize": 100,
      "archiveAfterDays": 30
    }
  }
}
```

**API Principale**:

```javascript
// Initialisation
async configManager.init();

// Enregistrement schémas
configManager.registerSchema(pluginId, schema, defaults);

// Accès config
configManager.getConfig(pluginId);
configManager.getCoreConfig();
configManager.getPluginConfig(pluginId);

// Modification
async configManager.setConfig(pluginId, config);
async configManager.setPluginConfig(pluginId, config);

// Persistance
async configManager.load();
async configManager.save();
```

**Stockage**:

- Source de vérité: **GitHub** (`.pensine-config.json`)
- Cache local: **localStorage** (rapidité)
- Accès: Via **StorageManager**

---

## 🔗 Intégration: SettingsView

**Fichier**: `src/lib/components/settings-view.js`

**Responsabilité**: Interface utilisateur pour configuration

**Fonctionnalités**:

- Onglets par plugin
- Génération formulaire automatique (JSON Schema)
- Validation en temps réel
- Sauvegarde transparente
- Réactivité aux événements EventBus

**Initialisation** (dans `settings-integration.js`):

```javascript
const configManager = new ConfigManager(storage, eventBus);
const settingsView = new SettingsView(configManager, pluginSystem, eventBus);

// Exposer globalement
window.modernConfigManager = configManager;
window.settingsView = settingsView;
```

---

## 🚀 Flux d'Initialisation dans app.js

```javascript
// app.js - PensineApp.initialize()

1. Créer EventBus
   window.eventBus = new EventBus();

2. Créer PluginSystem
   window.pluginSystem = new PluginSystem(eventBus, storageManager);
   await pluginSystem.init();

3. Initialiser ConfigManager
   const configManager = new ConfigManager(storage, eventBus);
   await configManager.init();

4. Créer SettingsView UI
   const settingsView = new SettingsView(configManager, pluginSystem, eventBus);

5. Exposer à window
   window.modernConfigManager = configManager;
   window.settingsView = settingsView;
```

---

## 📊 Cas d'Usage Actuel

### 1. Afficher le Panneau de Settings

```javascript
// Depuis n'importe où
window.app.showSettings();

// Ou directement
window.settingsView.show();
```

### 2. Obtenir Configuration d'un Plugin

```javascript
const calendarConfig = window.modernConfigManager.getPluginConfig("calendar");
console.log(calendarConfig.weekStartDay); // 1
```

### 3. Modifier Configuration

```javascript
await window.modernConfigManager.setPluginConfig("calendar", {
  weekStartDay: 0, // Dimanche
  viewMode: "week",
});

// Événement émis: 'config:changed'
```

### 4. Écouter Changements de Config

```javascript
window.eventBus.on(
  "config:changed",
  (data) => {
    console.log("Config changée:", data);
    // Mettre à jour UI si nécessaire
  },
  "my-plugin"
);
```

---

## 🎯 Problèmes Identifiés et Solutions

### Problème 1: Cohabitation Legacy/Modern

**État**: `lib/` (legacy) + `src/` (modern) existent simultanément

**Symptôme**:

- Duplication de code (2 config managers)
- Tests fragiles (mélange des systèmes)
- Migration complexe

**Solution Proposée**:

```
Phase 1 (FAIT): Refactorisation wizard (opt-in)
Phase 2: Migrer tous les plugins vers EventBus/PluginSystem
Phase 3: Unifier storage (legacy localStorage → modern ConfigManager)
Phase 4: Supprimer code legacy graduel
```

---

### Problème 2: Tests Playwright Instables

**État**: 7/12 tests passent, 5 échouent avec "settings panel hidden"

**Root Cause**:

- SettingsView pas initialisée correctement en test
- ConfigManager.init() peut échouer
- Événements EventBus pas attendus avant assertions

**Solution**:

```javascript
// Dans beforeEach du test
await page.waitForFunction(
  () => {
    return (
      window.settingsView?.isVisible !== undefined &&
      window.modernConfigManager?.config
    );
  },
  { timeout: 5000 }
);
```

---

### Problème 3: Configuration Token Invalide

**État**: Tests mock token "test-token", validation échoue

**Impact**:

- Test 9 détecte erreur console
- Smoke test échoue
- Settings panel ne s'affiche pas

**Solution**:

```javascript
// Mock un vrai token format (même invalide)
const mockToken = "ghp_" + "x".repeat(36); // Format valide syntaxiquement
localStorage.setItem("pensine-encrypted-token", mockToken);
```

---

## 🗺️ Architecture Future Proposée

### Vision: **Plugin-First Architecture**

```
PensineApp (Orchestration)
    │
    ├─ Core Services
    │   ├─ EventBus (communication)
    │   ├─ ConfigManager (configuration)
    │   ├─ StorageManager (persistance)
    │   └─ Router (navigation)
    │
    └─ Plugin System (tout est plugin)
        ├─ calendar-plugin
        │   ├─ UI Component
        │   ├─ Config Schema
        │   └─ Event Handlers
        ├─ inbox-plugin
        ├─ journal-plugin
        ├─ reflection-plugin
        └─ [custom plugins user]
```

### Avantages:

- ✅ Extensibilité: Ajouter plugins sans modifier core
- ✅ Maintenabilité: Chaque plugin isolé et testable
- ✅ Scalabilité: N plugins sans dégradation perf
- ✅ Testabilité: Mock facile avec EventBus

### Timeline Recommandée:

1. **Semaine 1**: Stabiliser tests (mock token + EventBus waits)
2. **Semaine 2**: Migrer plugins legacy vers PluginSystem
3. **Semaine 3**: Unifier config (éliminer LegacyConfigManager)
4. **Semaine 4**: Cleanup et documentation

---

## ✅ Checklist: Prochaines Étapes

- [ ] Fixer les 5 tests Playwright (mock token + waits)
- [ ] Documenter manifest de plugin standard
- [ ] Créer exemple de plugin custom
- [ ] Implémenter Router dans core
- [ ] Migrer journal-plugin vers PluginSystem
- [ ] Supprimer LegacyConfigManager progressivement
- [ ] Tests E2E pour scénarios multi-plugin

---

## 📚 Références

- **EventBus**: `src/core/event-bus.js` (227 lignes)
- **PluginSystem**: `src/core/plugin-system.js` (384 lignes)
- **ConfigManager**: `src/core/config-manager.js` (443 lignes)
- **SettingsView**: `src/lib/components/settings-view.js`
- **Tests**: `tests/config-system-integration.spec.mjs` (12 tests)

---

**Prochaine Révision**: Après stabilisation des tests (proba cette semaine)
