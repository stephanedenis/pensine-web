# Test Status - Microsoft Edge (2026-01-17)

## 🎯 Contexte

Tests Playwright sur **Microsoft Edge 143.0.3650.139** (OpenSUSE Tumbleweed).

Objectif : Valider comportement cross-browser avant déploiement production.

**Architecture clarifiée (2026-01-17)** :

- Multi-repos avec superposition de vues (pro + perso + projets)
- Structure standard : `.pensine/`, `journals/`, `pages/`, `assets/`
- Configuration additive (chaque repo a sa config)
- Voir [`REPO_STRUCTURE_STANDARD.md`](REPO_STRUCTURE_STANDARD.md) pour détails

## 📊 Résultats Actuels

### ✅ Tests qui PASSENT

| Test                                  | Durée | Status | Notes                                    |
| ------------------------------------- | ----- | ------ | ---------------------------------------- |
| `e2e/config-persistence.spec.mjs`     | 11.4s | ✅ OK  | Session 1+2, wizard → config persistence |
| `calendar-markers-diagnostic.spec`    | 3.7s  | ✅ OK  | Markers calendrier                       |
| (tests manuels wizard PAT visibility) | N/A   | ✅ OK  | Toggle 👁️/🙈 fonctionne                  |

### ❌ Tests qui ÉCHOUENT

| Test                               | Erreur                                           | Root Cause                         |
| ---------------------------------- | ------------------------------------------------ | ---------------------------------- |
| `config-system-integration.spec.*` | Timeout 30s sur `window.app.modernConfigMana...` | Tests supposent workflow différent |
| `bootstrap-trace.spec`             | Failed 889ms                                     | (Détails non examinés)             |
| `bootstrap-wizard-import.spec`     | Failed 917ms                                     | (Détails non examinés)             |
| `bootstrap.spec` (no config)       | 404 on `index-minimal.html`                      | Fichier manquant ou path incorrect |

## 🔍 Analyse des Échecs

### Test `config-system-integration.spec.mjs`

**Symptômes** :

```
❌ Page Error: require is not defined
❌ Page Error: Unexpected token 'export'
```

**Root Cause** :

- Tests mockent `localStorage` avec config valide
- Attendent que `window.app.modernConfigManager` soit initialisé
- Timeout après 30s car initialisation jamais complétée

**Pourquoi ça échoue** :

1. Tests supposent architecture "wizard-first" (wizard sur toute erreur)
2. Architecture réelle : "wizard-only-once" (onboarding seulement)
3. Avec config mockée, app devrait charger normalement
4. Mais race condition entre `bootstrap.js` et `app-init.js`
5. `modernConfigManager` non initialisé si bootstrap échoue silencieusement

**Erreurs JavaScript** :

- "require is not defined" : Pas de `require()` dans le code → faux positif ?
- "Unexpected token 'export'" : Modules ES6 chargés dans mauvais contexte ?
- Ces erreurs sont **symptômes** d'initialisation incomplète, pas cause racine

### Bootstrap Sequence Issue

**Ordre de chargement attendu** :

```
1. index.html loads
2. Classic scripts (CDN, polyfills, legacy adapters)
3. ES6 modules (parallel, async)
   ├─ settings-integration.js
   ├─ settings-view.js
   └─ json-schema-form-builder.js
4. bootstrap.js (orchestrator)
   ├─ Dynamic imports (EventBus, ConfigManager, PluginSystem)
   └─ Check config → Wizard OR App
5. app-init.js (deferred, waits for bootstrap)
   └─ Initialize PensineApp with modernConfigManager
```

**Problème actuel** :

- `app-init.js` a `defer` attribute → s'exécute après DOM ready
- `bootstrap.js` a `type="module"` → exécution async non garantie
- **Race condition** : `app-init.js` peut s'exécuter avant bootstrap complet
- Tests mock localStorage **avant** navigation → bootstrap détecte config
- Bootstrap skip wizard mais **n'expose pas** `modernConfigManager` dans ce flow

## 🐛 Bugs Identifiés

### 1. Bootstrap Race Condition

**Fichiers** : [`src/bootstrap.js`](../src/bootstrap.js), [`src/app-init.js`](../src/app-init.js)

**Problème** :

```javascript
// index.html
<script type="module" src="src/bootstrap.js"></script>
<script defer src="src/app-init.js"></script>  // ← Pas de garantie d'ordre
```

**Solution** :

```javascript
// Dans bootstrap.js - fin du init()
window.dispatchEvent(
  new CustomEvent("bootstrap:complete", {
    detail: { modernConfigManager, settingsView },
  })
);

// Dans app-init.js - début
window.addEventListener("bootstrap:complete", (event) => {
  const { modernConfigManager, settingsView } = event.detail;
  window.app = new PensineApp(modernConfigManager, settingsView);
});
```

### 2. ModernConfigManager Not Exposed

**Fichier** : [`src/bootstrap.js`](../src/bootstrap.js) ligne 282-337

**Problème** :

```javascript
// bootstrap.js initialise modernConfigManager mais ne l'expose que si wizard affiché
if (needsWizard) {
  // wizard flow → modernConfigManager exposé
} else {
  // app flow → modernConfigManager NON exposé ? ← BUG
}
```

**Solution** :
Exposer `window.modernConfigManager` dans **tous** les workflows, pas seulement wizard.

### 3. Tests Assume Wrong Workflow

**Fichier** : [`tests/config-system-integration.spec.mjs`](../tests/config-system-integration.spec.mjs)

**Problème** :

```javascript
test.beforeEach(async ({ page }) => {
  // Mock localStorage avec config valide
  await page.addInitScript(() => {
    localStorage.setItem("pensine-config", "true");
    // ...
  });

  // Attendre modernConfigManager (mais app ne l'initialise pas dans ce flow !)
  await page.waitForFunction(
    () => {
      return window.app?.modernConfigManager !== undefined;
    },
    { timeout: 5000 }
  ); // ← TIMEOUT ICI
});
```

**Solution** :
Refactorer tests pour refléter ADR-001 :

- Test "First visit" → Wizard workflow
- Test "Config exists" → App workflow (pas de wizard, Settings Panel accessible)
- Test "Error recoverable" → Settings Panel opened on error

## 🎯 Plan de Correction

### Phase 1 : Bootstrap Synchronization (Urgent)

**Priority** : 🔴 HIGH (bloquant pour tous les tests)

- [ ] Ajouter `bootstrap:complete` event dans [`src/bootstrap.js`](../src/bootstrap.js)
- [ ] Modifier [`src/app-init.js`](../src/app-init.js) pour attendre event
- [ ] Exposer `modernConfigManager` dans tous les workflows
- [ ] Ajouter `window.bootstrapReady` promise pour tests

**Temps estimé** : 2-3 heures

### Phase 2 : Tests Refactoring (Important)

**Priority** : 🟡 MEDIUM (tests passent après Phase 1)

- [ ] Créer `tests/e2e/wizard-onboarding.spec.mjs` (première visite)
- [ ] Créer `tests/e2e/settings-panel.spec.mjs` (config quotidienne)
- [ ] Refactorer `config-system-integration.spec.mjs` (split en 2 suites)
- [ ] Ajouter tests error routing (PAT expiré → Settings)

**Temps estimé** : 4-6 heures

### Phase 3 : Error Routing (Enhancement)

**Priority** : 🟢 LOW (amélioration UX, pas bloquant)

- [ ] Implémenter error router (PAT expiré, repo introuvable, etc.)
- [ ] Ouvrir Settings Panel ciblé sur champ en erreur
- [ ] Ajouter highlight champ invalide dans formulaire
- [ ] Tests E2E workflow erreur → fix → save → reload

**Temps estimé** : 6-8 heures

## 📋 Commandes pour Reproduire

### Test E2E qui PASSE (config-persistence)

```bash
cd /home/stephane/GitHub/pensine-web

# Démarrer serveur HTTP
python3 -m http.server 8000 &

# Lancer test E2E
GITHUB_TEST_TOKEN="dummy" \
GITHUB_TEST_OWNER="dummy" \
GITHUB_TEST_REPO="dummy" \
npx playwright test tests/e2e/config-persistence.spec.mjs \
  --project=msedge \
  --headed
```

**Résultat attendu** : ✅ Test passe en ~11s

### Test Integration qui ÉCHOUE (config-system-integration)

```bash
# Même commande mais autre test
npx playwright test tests/config-system-integration.spec.mjs \
  --project=msedge \
  --reporter=list \
  --max-failures=1
```

**Résultat actuel** : ❌ Timeout 30s sur `beforeEach` hook

### Génerer Rapport HTML

```bash
npx playwright test tests/config-system-integration.spec.mjs \
  --project=msedge \
  --reporter=html \
  --max-failures=1

# Ouvrir rapport
firefox playwright-report/index.html
```

## 🔗 Références

### Documents Architecture

- [`docs/ARCHITECTURE_DECISION_LOG.md`](ARCHITECTURE_DECISION_LOG.md) - **ADR-001** : Wizard vs Settings
- [`docs/SPECIFICATIONS_TECHNIQUES.md`](SPECIFICATIONS_TECHNIQUES.md) - Architecture complète
- [`docs/TESTING_CHECKLIST.md`](TESTING_CHECKLIST.md) - Checklist validation

### Code Source

- [`src/bootstrap.js`](../src/bootstrap.js) - Orchestration initialisation
- [`src/app-init.js`](../src/app-init.js) - PensineApp main class
- [`src/lib/components/settings-integration.js`](../src/lib/components/settings-integration.js) - Init modernConfigManager
- [`src/core/config-manager.js`](../src/core/config-manager.js) - Config Manager
- [`src/core/event-bus.js`](../src/core/event-bus.js) - Event Bus

### Tests

- [`tests/e2e/config-persistence.spec.mjs`](../tests/e2e/config-persistence.spec.mjs) - ✅ Passing
- [`tests/config-system-integration.spec.mjs`](../tests/config-system-integration.spec.mjs) - ❌ Failing
- [`playwright.config.mjs`](../playwright.config.mjs) - Configuration Edge

### Installation Edge

- [`scripts/install-edge-opensuse.sh`](../scripts/install-edge-opensuse.sh) - Script installation
- [`docs/INSTALL_EDGE.md`](INSTALL_EDGE.md) - Documentation installation

## 📈 Métriques Succès

**Avant correction** (2026-01-17) :

- ❌ 5/15 tests échouent sur Edge
- ⏱️ Timeout 30s sur config-system-integration
- 🐛 Race condition bootstrap non résolue

**Après Phase 1** (objectif) :

- ✅ 15/15 tests passent sur Edge
- ⏱️ Tous tests <15s
- 🎯 Bootstrap synchronisé, pas de race condition

**Après Phase 2+3** (objectif) :

- ✅ Tests séparés wizard/settings/errors
- 🎯 Error routing PAT expiré → Settings
- 📝 Documentation complète workflows

## 🚀 Prochaines Actions

**Aujourd'hui (2026-01-17)** :

1. ✅ Documentation ADR-001 (done)
2. ✅ Installation Edge (done)
3. ✅ Tests baseline Edge (done)
4. ⏳ Fix bootstrap race condition (TODO)

**Demain (2026-01-18)** :

1. [ ] Implémenter `bootstrap:complete` event
2. [ ] Tester tous les tests sur Edge
3. [ ] Refactorer tests config-system-integration

**Cette semaine** :

1. [ ] Error router basique (PAT expiré)
2. [ ] Tests E2E error workflows
3. [ ] Documentation utilisateur wizard vs settings

---

**Maintainer** : Stéphane Denis (@stephanedenis)
**Last Updated** : 2026-01-17 11:53 UTC
**Edge Version** : 143.0.3650.139
**Playwright Version** : (voir package.json)
**OS** : OpenSUSE Tumbleweed
