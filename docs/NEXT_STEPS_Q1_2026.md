# Plan d'Action Q1 2026 - Modern Config System Migration

**Status**: Acceptance de l'architecture ✅
**Decision Log**: `docs/ARCHITECTURE_DECISION_LOG.md`
**Target**: Système de configuration moderne comme fondation

---

## 🎯 Objectif Général

Transformer Pensine Web d'une **architecture monolithique** vers une **architecture plugin-first** basée sur EventBus + PluginSystem + ConfigManager.

---

## 📋 Semaine 1 (14-20 Jan) - Stabilisation Tests

### 🔴 Blocker: 5 Tests Playwright Échouent

**Tests Affectés**:

- Test 2: "Panneau Settings s'ouvre et affiche l'interface"
- Test 3: "Onglet Core affiche le formulaire"
- Test 6: "Fermeture du panneau Settings"
- Test 9: "Vérification console - Pas d'erreurs critiques"
- Smoke Test: "Configuration système fonctionne de bout en bout"

**Symptômes Identifiés**:

```
❌ SettingsView.show() n'affiche pas le panneau
❌ Élément `.settings-view` existe mais classe `hidden`
❌ Console error: "Token GitHub invalide ou expiré"
❌ ConfigManager init peut échouer
```

### ✅ Actions (Priority)

#### 1.1 Fixer le Token Mock (CRITICAL)

```javascript
// Problème: localStorage.setItem('pensine-encrypted-token', 'test-token');
// Erreur: Token invalide syntaxiquement

// Solution proposée:
const validTokenFormat = "ghp_" + "x".repeat(36); // Syntaxe valide
localStorage.setItem("pensine-encrypted-token", validTokenFormat);
```

**Fichier à modifier**: `tests/config-system-integration.spec.mjs` (ligne ~10)

#### 1.2 Ajouter Waits pour EventBus

```javascript
// Attendre que ConfigManager soit prêt
await page.waitForFunction(
  () => {
    return window.modernConfigManager?.loaded === true;
  },
  { timeout: 5000 }
);

// Attendre que SettingsView soit créée
await page.waitForFunction(
  () => {
    return document.getElementById("settings-view") !== null;
  },
  { timeout: 5000 }
);
```

**Fichier à modifier**: `tests/config-system-integration.spec.mjs` (beforeEach)

#### 1.3 Déboguer SettingsView.show()

```javascript
// Dans test, ajouter logs
const settingsShown = await page.evaluate(() => {
  if (window.settingsView) {
    window.settingsView.show();
    return true;
  }
  return false;
});
console.log("Settings view shown:", settingsShown);
```

**Fichier à examiner**: `src/lib/components/settings-view.js` (méthode show())

#### 1.4 Valider ConfigManager.init()

```javascript
// Vérifier le chemin init
const configReady = await page.evaluate(() => {
  return {
    loaded: window.modernConfigManager?.loaded,
    config: window.modernConfigManager?.config,
    error: window.modernConfigManager?._error,
  };
});
console.log("Config state:", configReady);
```

**Fichier à examiner**: `src/core/config-manager.js` (méthode init())

### 📋 Checklist Semaine 1

- [ ] Identifier exact root cause des 5 tests
- [ ] Fixer token mock (syntaxe valide)
- [ ] Ajouter waits EventBus au beforeEach
- [ ] Déboguer SettingsView.show()
- [ ] Vérifier ConfigManager.init()
- [ ] **TARGET**: 10/12 tests ✅

---

## 📋 Semaine 2 (20-26 Jan) - Migrate Journal Plugin

### 🎯 Objectif

Migrer `plugins/pensine-plugin-journal/` vers PluginSystem en tant que premier exemple.

### ✅ Étapes

#### 2.1 Analyser Structure Actuelle

```
pensine-plugin-journal/
├── plugin.js         # Point d'entrée
├── manifest.json     # Métadonnées (À vérifier)
├── config.schema.json # Schéma config (À créer)
└── README.md         # Documentation
```

**Fichier à créer**: Checklist d'analyse

#### 2.2 Implémenter PluginInterface

```javascript
// template: plugin.js

export default class JournalPlugin {
  constructor(manifest, context) {
    this.manifest = manifest;
    this.context = context; // { eventBus, configManager, storage }
    this.isActive = false;
  }

  async activate() {
    // 1. Enregistrer schema config
    this.context.configManager.registerSchema(
      this.manifest.id,
      this.schema,
      this.defaults
    );

    // 2. S'abonner aux événements pertinents
    this.context.eventBus.on(
      "calendar:day-click",
      this.onDayClick,
      this.manifest.id
    );

    // 3. Initialiser composants
    this.initializeUI();

    this.isActive = true;
  }

  async deactivate() {
    // Nettoyage
    this.isActive = false;
  }

  onDayClick(data) {
    // Créer entrée journal pour ce jour
    console.log("Day clicked:", data.date);
  }
}
```

**Fichier à créer**: `plugins/pensine-plugin-journal/plugin.js` (refactorisé)

#### 2.3 Créer Manifest

```json
{
  "id": "journal",
  "name": "Journal Plugin",
  "version": "1.0.0",
  "description": "Daily journal entries with markdown support",
  "dependencies": [],
  "configSchema": {
    /* JSON Schema */
  },
  "configDefaults": {
    "autoSave": true,
    "entryFormat": "markdown"
  }
}
```

**Fichier à créer**: `plugins/pensine-plugin-journal/manifest.json`

#### 2.4 Enregistrer dans app.js

```javascript
// Dans app.js initialize()

const journalPlugin = await import(
  "./plugins/pensine-plugin-journal/plugin.js"
);
await pluginSystem.register(journalPlugin.default, {
  id: "journal",
  name: "Journal Plugin",
  version: "1.0.0",
});

await pluginSystem.activate("journal");
```

### 📋 Checklist Semaine 2

- [ ] Analyser structure actuelle du journal plugin
- [ ] Implémenter PluginInterface
- [ ] Créer manifest.json avec schema
- [ ] Enregistrer dans PluginSystem
- [ ] Tests: journal plugin s'active correctement
- [ ] **TARGET**: Journal fonctionnel via PluginSystem

---

## 📋 Semaine 3 (27 Jan - 2 Feb) - Unify Config

### 🎯 Objectif

Migrer tous les plugins vers ConfigManager, supprimer LegacyConfigManager.

### ✅ Étapes

#### 3.1 Migrer Remaining Plugins

- Calendar plugin → PluginSystem
- Inbox plugin → PluginSystem
- Reflection plugin → PluginSystem

#### 3.2 Unifier Storage

```javascript
// Avant: Deux systèmes
localStorage.getItem("calendar-weekStart"); // Legacy
configManager.getPluginConfig("calendar").weekStart; // Modern

// Après: Un seul
configManager.getPluginConfig("calendar").weekStart;
```

#### 3.3 Supprimer Code Legacy

- [ ] Supprimer `src/legacy/config-manager.js` (old)
- [ ] Supprimer `lib/config-wizard.js` fallback
- [ ] Conserver seulement `src/core/config-manager.js`

### 📋 Checklist Semaine 3

- [ ] Tous 4 plugins dans PluginSystem
- [ ] Tous tests passent (12/12 ✅)
- [ ] Aucune référence au LegacyConfigManager
- [ ] **TARGET**: Architecture moderne complètement adoptée

---

## 🎓 Parallel: Documentation Plugin Dev

### À Créer (Au fur et à mesure)

1. **Plugin Development Guide**

   ```
   docs/PLUGIN_DEVELOPMENT_GUIDE.md
   ├─ Architecture de base
   ├─ Template de plugin
   ├─ API disponible (EventBus, ConfigManager)
   ├─ Exemples (journal, calendar)
   └─ Testing patterns
   ```

2. **Plugin Template**

   ```
   plugins/plugin-template/
   ├─ plugin.js (implémentation)
   ├─ manifest.json (métadonnées)
   ├─ config.schema.json (validation)
   └─ README.md (usage)
   ```

3. **EventBus Reference**

   ```
   docs/EVENTBUS_REFERENCE.md
   ├─ All supported events
   ├─ Payload structure
   ├─ Examples
   └─ Best practices
   ```

---

## 📊 Success Metrics

### Par Semaine

**Semaine 1**: Tests

- [ ] 12/12 tests green ✅
- [ ] All error logs resolved

**Semaine 2**: First Plugin Migration

- [ ] Journal plugin via PluginSystem
- [ ] App still works identically
- [ ] <50ms additional init time

**Semaine 3**: Complete Migration

- [ ] 4/4 plugins migrated
- [ ] LegacyConfigManager removed
- [ ] Documentation complete

### Overall (Fin Q1)

- ✅ All 12 tests green
- ✅ All 4 plugins in PluginSystem
- ✅ Custom plugin example working
- ✅ <100ms total overhead
- ✅ Zero user-facing changes

---

## ⚙️ Technical Debt Addressed

- ✅ Wizard refactored to opt-in (Done)
- 🔄 Test stabilization (In Progress)
- ⏳ Plugin unification (Week 2-3)
- ⏳ Legacy removal (Week 3)
- ⏳ Documentation (Ongoing)

---

## 🚨 Known Blockers

| Blocker                       | Severity | Mitigation                  |
| ----------------------------- | -------- | --------------------------- |
| 5 tests failing               | HIGH     | Debug plan above            |
| SettingsView.show() broken    | HIGH     | Examine source code         |
| ConfigManager.init() may fail | MEDIUM   | Add error handling          |
| Token validation fails        | MEDIUM   | Mock valid token format     |
| Plugin registration untested  | MEDIUM   | Create test for each plugin |

---

## 📚 Reference Materials

- Architecture: `docs/ARCHITECTURE_MODERN_CONFIG_SYSTEM.md`
- Decision Log: `docs/ARCHITECTURE_DECISION_LOG.md`
- EventBus: `src/core/event-bus.js`
- PluginSystem: `src/core/plugin-system.js`
- ConfigManager: `src/core/config-manager.js`
- Tests: `tests/config-system-integration.spec.mjs`

---

## 🎯 Validation

**Ready to proceed?** Checklist:

- ✅ Architecture ACCEPTED
- ✅ Decision Log created
- ✅ Plan documented
- ✅ Wizard refactored
- ⏳ Tests stabilization (THIS WEEK)

**Next**: Start Week 1 debugging!

---

**Created**: 2026-01-14
**Last Updated**: 2026-01-14
**Owner**: Stéphane + Copilot
