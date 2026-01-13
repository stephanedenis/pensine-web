# Plan de Correction des Tests - Pensine Web

**Date**: 12 janvier 2026
**Basé sur**: TEST_AUDIT.md v1.0
**Priorité**: CRITIQUE

---

## 🎯 Objectif

Rendre les tests **réels, pertinents, complets et fiables** en corrigeant les 3 problèmes critiques identifiés :

1. ❌ Tests Playwright non fonctionnels (0/13 passent)
2. ❌ Documentation obsolète (35-40%)
3. ❌ Coverage incomplet (30%)

---

## 📋 Phase 1 : Correction Immédiate (Priorité 1)

**Deadline**: 13 janvier 2026 (1 jour)
**Objectif**: Tests Playwright fonctionnels + Documentation à jour

### Tâche 1.1 : Fix Playwright Tests (2-3h)

#### Problème identifié
```
❌ require is not defined
❌ Cannot use import statement outside a module
❌ window.eventBus = undefined
❌ window.pluginSystem = undefined
```

#### Solution proposée

**Option A** (Rapide): Attendre l'initialisation async
```javascript
test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:8000');

  // Attendre que app.init() se termine
  await page.waitForFunction(() => {
    return window.app?.modernConfigManager !== undefined;
  }, { timeout: 10000 });
});
```

**Option B** (Robuste): Exposer événement init-complete
```javascript
// Dans app.js après init()
window.dispatchEvent(new CustomEvent('pensine:ready'));

// Dans tests
await page.waitForEvent('pensine:ready', { timeout: 10000 });
```

**Recommandation**: Option A (plus simple, moins invasif)

#### Checklist
- [ ] Corriger `playwright.config.mjs` (reporter folder) ✅ FAIT
- [ ] Ajouter `waitForFunction` dans beforeEach
- [ ] Valider que `window.app.settingsView` existe avant tests
- [ ] Augmenter timeouts si nécessaire
- [ ] Relancer `npm test` et vérifier 13/13 pass

---

### Tâche 1.2 : Update SCENARIOS_DE_TEST.md (1-2h)

#### Sections à corriger

**T1.1 - Premier Chargement**
```diff
-✅ Affiche étape 1/5 (Sélection plateforme)
+✅ Affiche étape 1/6 (Bienvenue)
+✅ Affiche étape 2/6 (Sélection plateforme)
```

**T2.1 - Parcours Complet**
```diff
 #### T2.1 - Parcours Complet GitHub
+#### T2.2 - Parcours Complet Local Git
+**Étapes**:
+1. Sélectionner "Local Git"
+2. Entrer author "Test User", email "test@example.com"
+3. Repository name "pensine-local"
+4. (Optionnel) Remote URL
+5. Terminer
```

**T3.1 - Calendrier**
```diff
-✅ 52 semaines affichées (grille 52 lignes × 8 colonnes)
+✅ Calendrier LinearCalendar V2 affiché
+✅ Scroll infini (charge 10 semaines dynamiquement)
+✅ Vue initiale centrée sur semaine actuelle
```

**Nouvelle section T5 - Système Configuration Moderne**
```markdown
### T5: Système Configuration Moderne

#### T5.1 - Ouverture Settings
**Étapes**:
1. Cliquer bouton ⚙️ (Settings)
2. Observer panneau

**Résultat Attendu**:
- ✅ Panneau SettingsView s'ouvre
- ✅ Onglets visibles: Core + plugins actifs
- ✅ Formulaire généré depuis JSON Schema

#### T5.2 - Navigation Onglets
**Étapes**:
1. Ouvrir Settings
2. Cliquer onglet "Calendar"
3. Observer formulaire

**Résultat Attendu**:
- ✅ Formulaire config calendar affiché
- ✅ Champs: startWeekOn, showWeekNumbers, etc.

#### T5.3 - Validation et Sauvegarde
**Étapes**:
1. Modifier une valeur
2. Entrer valeur invalide (ex: nombre négatif)
3. Cliquer Save

**Résultat Attendu**:
- ✅ Validation HTML5 empêche submit
- ✅ Message erreur affiché
- ✅ Config non sauvegardée

#### T5.4 - Export/Import Configuration
**Étapes**:
1. Cliquer Export
2. Vérifier fichier `.pensine-config.json` téléchargé
3. Modifier config localement
4. Cliquer Import, sélectionner fichier

**Résultat Attendu**:
- ✅ Export génère JSON valide
- ✅ Import restaure configuration
- ✅ Validation schéma lors de l'import
```

**Nouvelle section T6 - Plugins (Submodules)**
```markdown
### T6: Plugins Submodules

#### T6.1 - Liste Plugins
**Étapes**:
1. Ouvrir console développeur
2. Taper `window.pluginSystem.plugins`

**Résultat Attendu**:
- ✅ Map avec 4 plugins: calendar, inbox, journal, reflection
- ✅ Chaque plugin a manifest (id, name, version)

#### T6.2 - Activation/Désactivation
**Étapes**:
1. `window.pluginSystem.disablePlugin('calendar')`
2. Observer calendrier
3. `window.pluginSystem.enablePlugin('calendar')`

**Résultat Attendu**:
- ✅ Calendrier disparaît après disable
- ✅ Calendrier réapparaît après enable

#### T6.3 - Configuration Plugin
**Étapes**:
1. Ouvrir Settings
2. Cliquer onglet plugin (ex: Calendar)
3. Modifier config
4. Sauvegarder

**Résultat Attendu**:
- ✅ Config plugin mise à jour
- ✅ Plugin réagit au changement (si observable)
```

#### Checklist
- [ ] Corriger sections T1, T2, T3
- [ ] Ajouter section T5 (Configuration moderne)
- [ ] Ajouter section T6 (Plugins)
- [ ] Vérifier cohérence avec code actuel
- [ ] Commit changements

---

### Tâche 1.3 : Update TESTING_CHECKLIST.md (30min)

#### Ajouts nécessaires

**Section "Configuration Moderne"** (après "✅ Configuration")
```markdown
### ✅ Configuration Moderne (Settings UI)

- [ ] **Ouverture Settings**: Clic ⚙️ ouvre panneau SettingsView
- [ ] **Onglets présents**: Core + onglets plugins chargés
- [ ] **Formulaire Core**:
  - [ ] Champs générés depuis JSON Schema
  - [ ] Types correctement rendus (string, number, boolean, enum)
  - [ ] Validation HTML5 active (required, min, max, pattern)
- [ ] **Modification valeur**: Input déclenche changement
- [ ] **Sauvegarde**: Bouton Save persiste config
- [ ] **Notification**: Toast "Configuration saved" affiché
- [ ] **Export**: Bouton Export génère JSON
- [ ] **Import**: Bouton Import restaure config

### ✅ Plugins Submodules

- [ ] **Plugins chargés**: `window.pluginSystem.plugins.size >= 4`
- [ ] **Onglets plugins**: Onglets Calendar, Inbox, Journal, Reflection visibles
- [ ] **Config plugin**: Formulaire plugin s'affiche
- [ ] **Validation plugin**: JSON Schema validé par plugin
```

#### Checklist
- [ ] Ajouter section Configuration Moderne
- [ ] Ajouter section Plugins
- [ ] Ajuster temps estimés (actuellement 6-8min → 8-10min)
- [ ] Commit changements

---

## 📋 Phase 2 : Tests Unitaires (Priorité 2)

**Deadline**: 16 janvier 2026 (3 jours)
**Objectif**: Coverage 70% modules critiques

### Tâche 2.1 : Tests EventBus (1h)

**Fichier**: `tests/unit/event-bus.spec.mjs`

```javascript
import { test, expect } from '@playwright/test';
import EventBus from '../../core/event-bus.js';

test.describe('EventBus', () => {
  let bus;

  test.beforeEach(() => {
    bus = new EventBus();
  });

  test('subscribe and emit event', () => {
    let called = false;
    bus.on('test:event', () => { called = true; });
    bus.emit('test:event');
    expect(called).toBe(true);
  });

  test('unsubscribe removes listener', () => {
    let count = 0;
    const callback = () => { count++; };
    bus.on('test:event', callback);
    bus.emit('test:event');
    expect(count).toBe(1);
    bus.off('test:event', callback);
    bus.emit('test:event');
    expect(count).toBe(1); // Still 1, not 2
  });

  test('emit with data', () => {
    let receivedData = null;
    bus.on('test:event', (data) => { receivedData = data; });
    bus.emit('test:event', { foo: 'bar' });
    expect(receivedData).toEqual({ foo: 'bar' });
  });

  test('once subscribes only for one emit', () => {
    let count = 0;
    bus.once('test:event', () => { count++; });
    bus.emit('test:event');
    bus.emit('test:event');
    expect(count).toBe(1);
  });

  test('removeAllListeners by plugin', () => {
    bus.on('event1', () => {}, 'plugin-a');
    bus.on('event2', () => {}, 'plugin-a');
    bus.on('event3', () => {}, 'plugin-b');
    bus.removeAllListeners('plugin-a');
    expect(bus.listenerCount('event1')).toBe(0);
    expect(bus.listenerCount('event2')).toBe(0);
    expect(bus.listenerCount('event3')).toBe(1);
  });
});
```

---

### Tâche 2.2 : Tests ConfigManager (2h)

**Fichier**: `tests/unit/config-manager.spec.mjs`

```javascript
import { test, expect } from '@playwright/test';
import ConfigManager from '../../core/config-manager.js';

// Mock storage
class MockStorage {
  constructor() {
    this.data = {};
  }
  async readFile(path) {
    return this.data[path] || null;
  }
  async writeFile(path, content) {
    this.data[path] = content;
  }
}

// Mock EventBus
class MockEventBus {
  constructor() {
    this.events = [];
  }
  emit(event, data) {
    this.events.push({ event, data });
  }
}

test.describe('ConfigManager', () => {
  let config, storage, eventBus;

  test.beforeEach(async () => {
    storage = new MockStorage();
    eventBus = new MockEventBus();
    config = new ConfigManager(storage, eventBus);
    await config.init();
  });

  test('init loads config from storage', async () => {
    storage.data['.pensine-config.json'] = JSON.stringify({
      core: { theme: 'dark' },
      plugins: {}
    });
    await config.load();
    expect(config.config.core.theme).toBe('dark');
  });

  test('registerPluginSchema stores schema', () => {
    const schema = { type: 'object', properties: {} };
    config.registerPluginSchema('test-plugin', schema, { foo: 'bar' });
    expect(config.schemas.has('test-plugin')).toBe(true);
  });

  test('getPluginConfig returns plugin config', () => {
    config.config.plugins['test-plugin'] = { enabled: true };
    const pluginConfig = config.getPluginConfig('test-plugin');
    expect(pluginConfig.enabled).toBe(true);
  });

  test('setPluginConfig updates and saves', async () => {
    await config.setPluginConfig('test-plugin', { enabled: false });
    expect(config.config.plugins['test-plugin'].enabled).toBe(false);
    expect(eventBus.events.some(e => e.event === 'config:saved')).toBe(true);
  });

  test('validateConfig rejects invalid data', () => {
    const schema = {
      type: 'object',
      properties: { count: { type: 'number', minimum: 0 } },
      required: ['count']
    };
    const valid = config.validateConfig({ count: 5 }, schema);
    const invalid = config.validateConfig({ count: -1 }, schema);
    expect(valid.isValid).toBe(true);
    expect(invalid.isValid).toBe(false);
  });
});
```

---

### Tâche 2.3 : Tests PluginSystem (1h)

**Fichier**: `tests/unit/plugin-system.spec.mjs`

```javascript
import { test, expect } from '@playwright/test';
import PluginSystem from '../../core/plugin-system.js';
import EventBus from '../../core/event-bus.js';

// Mock Plugin
class MockPlugin {
  constructor(id, context) {
    this.id = id;
    this.context = context;
  }
  async enable() {}
  async disable() {}
  static getManifest() {
    return {
      id: 'mock-plugin',
      name: 'Mock Plugin',
      version: '1.0.0'
    };
  }
}

test.describe('PluginSystem', () => {
  let system, eventBus, storage;

  test.beforeEach(async () => {
    eventBus = new EventBus();
    storage = { readFile: async () => null };
    system = new PluginSystem(eventBus, storage);
    await system.init();
  });

  test('register adds plugin', async () => {
    await system.register(MockPlugin, MockPlugin.getManifest());
    expect(system.plugins.has('mock-plugin')).toBe(true);
  });

  test('enable activates plugin', async () => {
    await system.register(MockPlugin, MockPlugin.getManifest());
    await system.enablePlugin('mock-plugin');
    expect(system.activePlugins.has('mock-plugin')).toBe(true);
  });

  test('disable deactivates plugin', async () => {
    await system.register(MockPlugin, MockPlugin.getManifest());
    await system.enablePlugin('mock-plugin');
    await system.disablePlugin('mock-plugin');
    expect(system.activePlugins.has('mock-plugin')).toBe(false);
  });
});
```

---

## 📋 Phase 3 : Tests E2E (Priorité 2)

**Deadline**: 18 janvier 2026 (2 jours après Phase 2)
**Objectif**: Scénarios critiques automatisés

### Tâche 3.1 : Test Wizard Complet (1h)

**Fichier**: `tests/e2e/wizard-complete.spec.mjs`

```javascript
test('Wizard parcours complet GitHub PAT', async ({ page }) => {
  await page.goto('http://localhost:8000');

  // Étape 1: Bienvenue
  await expect(page.locator('text=Bienvenue')).toBeVisible();
  await page.click('button:has-text("Suivant")');

  // Étape 2: Plateforme
  await page.click('.wizard-platform-option[data-platform="github"]');
  await page.click('button:has-text("Suivant")');

  // Étape 3: Token
  await page.fill('#wizard-token', 'ghp_test_token_123');
  await page.click('button:has-text("Valider")');
  await page.waitForSelector('.token-valid', { timeout: 5000 });
  await page.click('button:has-text("Suivant")');

  // Étape 4: Repository
  await page.selectOption('#wizard-repo', 'Pensine');
  await page.click('button:has-text("Suivant")');

  // Étape 5: Préférences
  await page.selectOption('#wizard-theme', 'dark');
  await page.check('#wizard-auto-sync');
  await page.click('button:has-text("Suivant")');

  // Étape 6: Complete
  await page.click('button:has-text("Terminer")');

  // Vérifier app se charge
  await expect(page.locator('#calendar')).toBeVisible({ timeout: 5000 });
});
```

---

### Tâche 3.2 : Test Calendrier → Journal (30min)

**Fichier**: `tests/e2e/calendar-journal-flow.spec.mjs`

```javascript
test('Clic calendrier ouvre journal et sauvegarde', async ({ page }) => {
  // Setup: Config existante
  await page.addInitScript(() => { /* config mock */ });
  await page.goto('http://localhost:8000');

  // Attendre calendrier chargé
  await page.waitForSelector('.linear-calendar', { timeout: 5000 });

  // Cliquer sur jour actuel
  const today = new Date().toISOString().split('T')[0];
  await page.click(`.calendar-day[data-date="${today}"]`);

  // Vérifier éditeur s'ouvre
  await expect(page.locator('#editor-container')).toBeVisible();
  await expect(page.locator('.editor-filename')).toContainText(today);

  // Switch en mode CODE
  await page.click('button[aria-label="Code"]');

  // Modifier contenu
  await page.fill('#editor-code-view textarea', '# Test Journal\n\nContenu test');

  // Sauvegarder
  await page.click('button:has-text("Sauvegarder")');

  // Vérifier succès
  await expect(page.locator('.notification')).toContainText('sauvegardé');
});
```

---

### Tâche 3.3 : Test Settings UI (30min)

**Fichier**: `tests/e2e/settings-ui-flow.spec.mjs`

```javascript
test('Settings UI modification et reload', async ({ page }) => {
  await page.addInitScript(() => { /* config mock */ });
  await page.goto('http://localhost:8000');

  // Ouvrir Settings
  await page.click('#settings-btn');
  await expect(page.locator('.settings-view')).toBeVisible();

  // Naviguer onglet Core
  await page.click('.tab:has-text("Core")');

  // Modifier une valeur
  await page.selectOption('select[name="theme"]', 'dark');

  // Sauvegarder
  await page.click('button:has-text("Save")');
  await expect(page.locator('.notification')).toContainText('saved');

  // Recharger page
  await page.reload();

  // Vérifier persistence
  await page.click('#settings-btn');
  await page.click('.tab:has-text("Core")');
  const theme = await page.inputValue('select[name="theme"]');
  expect(theme).toBe('dark');
});
```

---

## 📊 Résumé des Livrables

### Phase 1 (1 jour)
- ✅ Playwright config fixed
- ✅ 13/13 tests Playwright passent
- ✅ SCENARIOS_DE_TEST.md à jour
- ✅ TESTING_CHECKLIST.md complété

### Phase 2 (3 jours)
- ✅ Tests unitaires EventBus (6 tests)
- ✅ Tests unitaires ConfigManager (6 tests)
- ✅ Tests unitaires PluginSystem (4 tests)
- ✅ **Total: 16 tests unitaires**

### Phase 3 (2 jours)
- ✅ Test E2E Wizard complet
- ✅ Test E2E Calendrier → Journal
- ✅ Test E2E Settings UI
- ✅ **Total: 3 tests E2E critiques**

---

## 🎯 Objectifs de Succès

**À la fin du plan**:
- ✅ 32 tests automatisés (13 Playwright + 16 unitaires + 3 E2E)
- ✅ 100% tests passent (32/32)
- ✅ 0% documentation obsolète
- ✅ 70% coverage modules critiques
- ✅ CI/CD pipeline (bonus Phase 3)

**Temps total estimé**: 6 jours de travail

---

## 📝 Notes d'Implémentation

### Configuration Jest/Vitest (si tests unitaires Node.js)

```bash
npm install --save-dev vitest
```

```javascript
// vitest.config.mjs
export default {
  test: {
    globals: true,
    environment: 'node'
  }
};
```

### Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/sh
node -c app.js || exit 1
npm test || exit 1
```

---

**Document créé le**: 12 janvier 2026
**Basé sur**: TEST_AUDIT.md
**Statut**: 📝 PLAN PROPOSÉ - EN ATTENTE VALIDATION
