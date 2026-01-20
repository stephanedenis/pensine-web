# Architecture Decision Log - Modern Config System

**Date**: 2026-01-14
**Decision Maker**: Stéphane + Copilot
**Status**: ACCEPTED (pending tests)

---

## 🎯 ADR-001: Wizard vs Settings Panel - Clear Separation of Concerns

**Date**: 2026-01-17
**Decision Maker**: Stéphane
**Status**: ACCEPTED (clarification critique)

### Context

Confusion détectée lors des tests Edge : l'app était perçue comme "wizard-first" alors que le design réel est différent. Les tests `config-system-integration.spec.mjs` échouaient car ils attendaient `window.app.modernConfigManager` dans tous les workflows, mais l'initialisation varie selon le contexte.

### The Decision

**Le wizard et le panneau Settings ont des rôles DISTINCTS et NON INTERCHANGEABLES :**

#### 1. **Wizard = Onboarding SEULEMENT**

- Affiché **UNIQUEMENT** à la première visite (aucune configuration existante)
- **JAMAIS** utilisé pour les erreurs quotidiennes (PAT expiré, repo introuvable, etc.)
- Workflow : `Première visite → Wizard → Config sauvegardée → Plus jamais de wizard`
- Condition déclencheur : `!localStorage.getItem('pensine-config')`

#### 2. **Settings Panel = Configuration Quotidienne**

- Interface standard accessible via bouton ⚙️ dans le header
- Gère **toutes** les modifications de configuration après onboarding
- Traite les erreurs récupérables (credentials invalides, changement repo, etc.)
- Même workflow d'édition que pour les fichiers `.md` (éditeur unifié)

#### 3. **Éditeur Unifié = Configuration comme Contenu**

**Principe fondamental** : Les fichiers de configuration sont des fichiers comme les autres.

- **Même fenêtre** d'édition pour tous les types :
  - `.md` → Éditeur Markdown (3 vues : code / rich / split)
  - `.pensine-config.json` → Formulaire auto-généré via JSON Schema
  - `.yaml`, `.json` → Éditeur avec validation syntaxique
  - Autres → Éditeur texte brut
- Configuration stockée dans structure standard : `.pensine/config.json`
- Édition en place avec sauvegarde directe vers GitHub
- Historique Git pour les configs comme pour les notes

#### 4. **Stratégie de Gestion d'Erreurs**

```
Erreur détectée → Analyser gravité → Router vers UI appropriée

├─ Première visite (no config)
│  └→ Afficher Wizard (onboarding complet)
│
├─ Config corrompu/irrécupérable
│  └→ Afficher Wizard (reset complet avec confirmation)
│
└─ Erreur mineure/récupérable
   └→ Ouvrir Settings Panel (édition ciblée)
      ├─ PAT expiré → Onglet Git > Token (highlight champ)
      ├─ Repo introuvable → Onglet Git > Repository
      ├─ Validation JSON échouée → Afficher erreurs inline
      └─ Network timeout → Notification toast (transient, pas de modal)
```

#### 5. **Multi-Repos et Superposition de Contenu**

**Principe fondamental** : Plusieurs repos peuvent coexister, leurs contenus sont **superposés** dans une structure commune.

**Use Cases** :

- **Séparation contextes** : Vie pro (`work-repo`) + Vie perso (`personal-repo`) + Projets (`project-X-repo`)
- **Collaboration** : Repos partagés par équipe/groupe de travail
- **Privacy** : Contenu sensible isolé dans repo privé
- **Synchronisation sélective** : Sync seulement certains repos selon machine

**Structure Standard** (convention Pensine) :

```
repo-name/
├── .pensine/
│   ├── config.json          # Config spécifique au repo
│   └── metadata.json        # Métadonnées (couleur, tags, priorité)
├── journals/
│   ├── 2025-01-17.md
│   ├── 2025-01-18.md
│   └── ...
├── pages/
│   ├── inbox.md
│   ├── projets/
│   └── references/
└── assets/
    ├── images/
    └── attachments/
```

**Configuration Multi-Repos** :

```json
// localStorage: pensine-multi-repos
{
  "repos": [
    {
      "id": "work",
      "name": "Travail",
      "owner": "mycompany",
      "repo": "pensine-work",
      "branch": "main",
      "color": "#3b82f6", // Bleu pour pro
      "icon": "💼",
      "enabled": true,
      "priority": 1 // Ordre d'affichage
    },
    {
      "id": "personal",
      "name": "Personnel",
      "owner": "mystephanedenis",
      "repo": "pensine-perso",
      "branch": "main",
      "color": "#10b981", // Vert pour perso
      "icon": "🏠",
      "enabled": true,
      "priority": 2
    },
    {
      "id": "projet-x",
      "name": "Projet X",
      "owner": "team-x",
      "repo": "pensine-projet-x",
      "branch": "main",
      "color": "#f59e0b", // Orange pour projets
      "icon": "🚀",
      "enabled": true,
      "priority": 3
    }
  ]
}
```

**Superposition des Vues** :

1. **Vue Calendrier** : Fusion de tous les `journals/` de tous les repos

   ```
   Calendrier
   ├─ 2025-01-17
   │  ├─ 💼 work-repo/journals/2025-01-17.md     (bleu)
   │  ├─ 🏠 personal-repo/journals/2025-01-17.md (vert)
   │  └─ 🚀 projet-x-repo/journals/2025-01-17.md (orange)
   └─ 2025-01-18
      └─ ...
   ```

2. **Vue Pages** : Arborescence fusionnée avec indicateurs origine

   ```
   📁 Pages
   ├─ 📥 Inbox
   │  ├─ 💼 Task cliente A (work)
   │  ├─ 🏠 Courses à faire (personal)
   │  └─ 🚀 Feature à implémenter (projet-x)
   ├─ 📂 Projets
   │  ├─ 💼 projets-clients/ (work)
   │  └─ 🚀 projets-open-source/ (projet-x)
   └─ 📚 Références
      └─ ...
   ```

3. **Vue Recherche** : Résultats tous repos avec filtres

   ```
   🔍 Recherche: "réunion"

   Filtres: [💼 Travail] [🏠 Personnel] [🚀 Projet X]

   Résultats:
   ├─ 💼 2025-01-15: Réunion équipe (work)
   ├─ 🏠 2025-01-16: Réunion parents d'élèves (personal)
   └─ 🚀 2025-01-17: Réunion kickoff projet (projet-x)
   ```

**Configuration Additive** :

- Chaque repo peut avoir sa propre `.pensine/config.json`
- Configs fusionnées avec priorité : `repo-config` > `global-config` > `defaults`
- Exemple : thème par défaut global, mais `work-repo` force thème sombre

**Isolation et Sécurité** :

- Credentials par repo (différents PATs possibles)
- Sync sélectif (désactiver temporairement un repo)
- Pas de cross-contamination (erreur dans work-repo n'affecte pas personal-repo)

**Performance** :

- Chargement parallèle des repos (Promise.all)
- Cache partagé (même structure de dossiers)
- Lazy loading (charger seulement repos visibles dans vue active)

### Rationale

| Critère            | Wizard-First (❌ Rejeté)           | Settings-First (✅ Adopté)                 |
| ------------------ | ---------------------------------- | ------------------------------------------ |
| **Interruption**   | Fréquente (chaque erreur)          | Rare (une fois seulement)                  |
| **Mental model**   | Config = processus spécial         | Config = fichier comme un autre            |
| **Maintenance**    | Wizard doit gérer tous les cas     | Settings réutilise éditeur existant        |
| **Extensibilité**  | Ajouter step wizard pour chaque UI | JSON Schema → UI auto-générée              |
| **User autonomy**  | Guidage forcé                      | Accès direct aux paramètres                |
| **Error recovery** | Wizard lourd pour erreur simple    | Édition ciblée du champ en erreur          |
| **Git history**    | Config externe au repo             | Config versionné avec le contenu           |
| **Testing**        | Complexe (simuler wizard flow)     | Simple (tester formulaire JSON Schema)     |
| **Performance**    | Wizard charge tout le flow         | Settings charge seulement les schémas      |
| **Accessibility**  | Stepper avec état complexe         | Formulaire standard (mieux pour a11y)      |
| **Mobile**         | Wizard multi-step difficile        | Settings single-page responsive            |
| **Plugin config**  | Wizard ne peut pas connaître       | Plugins exposent leur propre JSON Schema   |
| **Power users**    | Frustrant (workflow imposé)        | Efficace (édition JSON directe disponible) |

### Implementation Guidelines

#### Détection Première Visite

```javascript
// Dans bootstrap.js
async function detectFirstVisit() {
  const hasLocalConfig = localStorage.getItem("pensine-config");
  const hasGitHubConfig = await storageManager.fileExists(
    ".pensine-config.json"
  );

  if (!hasLocalConfig && !hasGitHubConfig) {
    return "SHOW_WIZARD"; // Onboarding complet
  }

  return "SHOW_APP"; // Config existe, charger normalement
}
```

#### Routing vers Settings sur Erreur

```javascript
// Dans error handler
function handleConfigError(error) {
  // Analyser gravité
  if (error.code === "CORRUPTED_CONFIG") {
    // Config irrécupérable → reset complet
    if (confirm("Config corrompu. Voulez-vous réinitialiser ?")) {
      localStorage.clear();
      location.reload(); // → Wizard
    }
  } else if (error.code === "INVALID_TOKEN") {
    // PAT expiré → ouvrir Settings ciblé
    window.settingsView.show("git.token"); // Onglet + highlight
    showNotification("Votre token GitHub a expiré", "warning");
  } else if (error.code === "REPO_NOT_FOUND") {
    window.settingsView.show("git.repository");
    showNotification("Repository introuvable", "error");
  }
  // ... autres cas
}
```

#### Éditeur Unifié pour Configs

```javascript
// Dans editor.js - détection type fichier
async function openFile(filePath) {
  const ext = filePath.split(".").pop();
  const content = await storageManager.readFile(filePath);

  if (ext === "md") {
    // Markdown → 3 vues (code/rich/split)
    this.setMode("markdown");
    this.enableViews(["code", "rich", "split"]);
  } else if (filePath.endsWith(".pensine-config.json")) {
    // Config → formulaire JSON Schema
    this.setMode("json-schema");
    this.renderSchemaForm(content, PENSINE_CONFIG_SCHEMA);
  } else if (["json", "yaml", "yml"].includes(ext)) {
    // JSON/YAML → éditeur avec validation
    this.setMode("json");
    this.enableValidation(ext);
  } else {
    // Autre → texte brut
    this.setMode("text");
  }

  this.setContent(content);
  this.show();
}
```

### Consequences

#### Positives ✅

- **UX cohérente** : Même workflow édition pour notes ET configs
- **Moins d'interruptions** : Wizard vu une seule fois (onboarding)
- **Autonomie utilisateur** : Accès direct via ⚙️, pas de flow imposé
- **Extensibilité plugins** : Chaque plugin expose son schema → UI auto-générée
- **Git history** : Configs versionnées, diffables, historique complet
- **Tests simplifiés** : Tester formulaire JSON Schema, pas wizard multi-step
- **Performance** : Pas de re-render wizard à chaque erreur

#### Négatives ❌

- **Complexité détection** : Distinguer "première visite" vs "erreur récupérable"
- **Documentation critique** : Utilisateurs doivent comprendre la distinction
- **Tests à refactorer** : `config-system-integration.spec.mjs` suppose workflow différent
- **Migration utilisateurs** : Expliquer pourquoi wizard ne revient plus
- **Edge cases** : Config partiellement valide (quelle gravité ?)

#### Blocking Issues (Identified 2026-01-17)

**Priorité** : Débogage > Refactoring (sauf si refactoring résout bug)

1. ✅ **RÉSOLU** : Race condition `bootstrap.js` vs `app-init.js`

   - **Fix appliqué** : Promise `bootstrapReady` + suppression `app-init.js` dupliqué
   - **Date** : 2026-01-17
   - **Résultat** : Bootstrap synchronisé, test isolation PASS (5/5 systems)

2. ✅ **RÉSOLU** : Module loading errors (CommonJS vs ES6)

   - **Fix appliqué** :
     - Buffer CDN : Converti de CommonJS → ES6 module (`+esm`)
     - config-wizard.js : Retiré `export default`, gardé `window.ConfigWizard`
     - cache-buster.js : Idem, pattern script classique
   - **Date** : 2026-01-17
   - **Résultat** : Plus d'erreurs "require is not defined" ni "Unexpected token 'export'"

3. ✅ **RÉSOLU** : Test configuration invalide

   - **Fix appliqué** : Config test localStorage passe de `'true'` (string) à JSON valide :
     ```javascript
     {
       storageMode: 'local',
       credentials: {},
       version: '0.0.22'
     }
     ```
   - **Date** : 2026-01-17
   - **Résultat** : Bootstrap détecte config valide, initialise tous systèmes

4. ✅ **RÉSOLU** : System duplication (app.js vs bootstrap.js)

   - **Fix appliqué** : Refactoré `app.js` pour référencer systèmes bootstrap au lieu de créer nouveaux
   - **Date** : 2026-01-17
   - **Résultat** : Plus de duplication EventBus/PluginSystem/ConfigManager

5. ✅ **RÉSOLU** : API method mismatch (`getRegisteredPlugins`)

   - **Fix appliqué** : SettingsView.render() utilise `getAllPlugins()` au lieu de `getRegisteredPlugins()`
   - **Date** : 2026-01-17
   - **Résultat** : Plus d'erreur "is not a function"

6. 🔄 **EN COURS** : Suite de tests instable (4/13 passing)

   - **Symptômes** :
     - Test isolé PASSE (5/5 systems true)
     - Suite complète ÉCHOUE (modernConfigManager/settingsView false)
     - Settings panel s'auto-ouvre au boot → bloque interactions
     - Certains tests : `window.app.showSettings is not a function`
   - **Cause probable** : Cache Edge + appel automatique `.showSettings()` dans app.js init
   - **Temps estimé** : 1-2h
   - **Prochaines étapes** :
     - Analyser pourquoi settings s'ouvre automatiquement
     - Fixer beforeEach des tests 11-13 (utilisent ancien format config)
     - Valider suppression appel `.showSettings()` auto dans app.js

7. **🟢 MEDIUM** : Error routing manquant (inchangé)

   - **Impact** : PAT expiré affiche wizard au lieu de Settings
   - **Solution** : Error handler avec routing intelligent
   - **Temps estimé** : 4-6h

8. **🟢 LOW** : Wizard trigger flou (inchangé)
   - **Impact** : Edge cases mal gérés
   - **Solution** : Définir critères validation config

### Migration Plan

**Priorité** : Débogage d'abord, refactoring ensuite (sauf si refactoring résout le bug).

**Phase 1 (Immediate - Cette semaine)** :

- [ ] **URGENT** : Fixer bootstrap race condition (`bootstrapReady` promise)
- [ ] **URGENT** : Exposer `modernConfigManager` dans tous les workflows
- [ ] Refactorer tests pour refléter architecture réelle
- [ ] Documenter distinction Wizard/Settings dans README
- [ ] Implémenter error router basique (PAT expiré → Settings)

**Phase 2 (Semaine prochaine)** :

- [ ] Tester ouverture Settings ciblée sur erreur
- [ ] Ajouter highlight champ en erreur dans formulaire
- [ ] Documenter schémas JSON pour plugins
- [ ] Créer exemple plugin avec config schema

**Phase 3 (Fin Janvier)** :

- [ ] Migration automatique anciens configs localStorage → `.pensine/config.json` (via détection au boot)
- [ ] Historique Git pour configs (commit auto sur save)
- [ ] UI "Restore config from history" dans Settings
- [ ] Tests E2E workflow complet (erreur → Settings → fix → save → reload)

**Note** : Pas de wizard de migration. Configuration standard détectée et migrée automatiquement au boot.

### Success Metrics

- [ ] 0 apparitions wizard après première visite (sauf reset volontaire)
- [ ] 100% erreurs récupérables routées vers Settings (pas wizard)
- [ ] <2 clics pour corriger erreur config (Settings → field → save)
- [ ] Tests `config-system-integration.spec.mjs` 100% verts sur Edge
- [ ] 0 confusion utilisateur entre wizard et settings (user feedback)

### Dependencies

- ✅ Settings Panel avec JSON Schema form builder (done)
- ✅ Éditeur unifié (code/rich/split views) (done)
- 🔄 Error detection et routing (in progress)
- ⏳ Bootstrap synchronization promise (TODO)
- ⏳ Git history pour configs (TODO)
- ⏳ Plugin config schema registry (TODO)

### Risks & Mitigation

| Risk                                       | Probability | Impact | Mitigation                                                 |
| ------------------------------------------ | ----------- | ------ | ---------------------------------------------------------- |
| Utilisateurs ne trouvent pas Settings      | Medium      | High   | Bouton ⚙️ prominent, tooltip "Configuration"               |
| Config corrompu → app inutilisable         | Low         | High   | Fallback localStorage, wizard reset en dernier recours     |
| Tests restent flaky après refactor         | Medium      | Medium | Ajouter timeouts généreux, logs verbeux, retry logic       |
| Bootstrap race condition non résolue       | High        | High   | Promise `bootstrapReady`, event `bootstrap:complete`       |
| Plugins ne fournissent pas schema          | Medium      | Low    | Schéma par défaut généré depuis config, validation relaxée |
| Performance formulaire JSON Schema lent    | Low         | Medium | Lazy render champs (virtual scroll), cache validation      |
| Users veulent wizard pour changement repos | Low         | Low    | Ajouter "Wizard" button dans Settings (opt-in re-run)      |

### Alternative Considered

#### Alternative 1 : Wizard-First pour toutes erreurs

**Rejected because** :

- Interrompt workflow pour erreurs mineures (PAT expiré)
- Frustrant pour utilisateurs avancés (imposé stepper)
- Maintenance complexe (wizard doit gérer tous les cas d'erreur)
- Performance : charge wizard complet pour changer un token

#### Alternative 2 : Configs externes (settings.json séparé)

**Rejected because** :

- Configs non versionnées (pas d'historique Git)
- Mental model incohérent (notes in repo, configs out repo)
- Sync compliqué entre machines (localStorage only)
- Plugins ne peuvent pas versionner leur config

#### Alternative 3 : Modal Settings (pas fullscreen)

**Rejected because** :

- Trop petit pour formulaires complexes (JSON Schema)
- Mobile inutilisable (modal étroit)
- Pas de code/rich views pour édition JSON directe
- Incohérent avec éditeur notes (fullscreen)

### Related Decisions

- **ADR-002** (ci-dessous) : PluginSystem architecture → plugins exposent config schema
- **ADR-003** (ci-dessous) : Performance Wasm → configs plugins lazy-loaded
- Architecture Document : [`docs/SPECIFICATIONS_TECHNIQUES.md`](SPECIFICATIONS_TECHNIQUES.md)
- Bootstrap Sequence : [`src/bootstrap.js`](../src/bootstrap.js) ligne 180-250
- Settings View : [`src/lib/components/settings-view.js`](../src/lib/components/settings-view.js)
- Config Manager : [`src/core/config-manager.js`](../src/core/config-manager.js)
- Wizard : [`src/lib/components/config-wizard.js`](../src/lib/components/config-wizard.js)
- Tests : [`tests/config-system-integration.spec.mjs`](../tests/config-system-integration.spec.mjs)

### Notes

Cette ADR résout une ambiguïté critique détectée le 2026-01-17 lors des tests Edge. Les tests échouaient car ils supposaient un workflow "wizard apparaît sur erreur" alors que l'architecture réelle est "wizard = onboarding, settings = quotidien".

**Citation Stéphane** :

> "Le wizard est nécessaire en introduction pas en usage quotidien. Ainsi un PAT expiré ne devrait pas déclencher le wizard, mais ouvrir le panneau de configuration approprié."

Cette clarification change **fondamentalement** la stratégie de tests et l'error handling de l'app.

---

## 🎯 Decision: Make PluginSystem + ConfigManager the Future Foundation

### Context

Currently, Pensine Web has:

- **Legacy System** (`lib/`, `app.js`): Monolithic, tightly coupled
- **Modern System** (`src/core/`, `src/lib/components/`): EventBus + PluginSystem + ConfigManager

Tests show:

- 7/12 passing (modern system initializes correctly)
- 5/12 failing (settings panel UI issues - fixable)
- Wizard refactored to opt-in ✅

### The Decision

**We commit to EventBus + PluginSystem + ConfigManager as our future architecture.**

This means:

1. **Everything is a plugin** - Even core features (journal, calendar) as plugins
2. **Configuration is centralized** - ConfigManager + JSON Schema validation
3. **Communication is event-driven** - No direct dependencies between plugins
4. **Storage is abstracted** - Works with GitHub, Local Git, etc.

### Rationale

| Aspect            | Legacy                      | Modern                |
| ----------------- | --------------------------- | --------------------- |
| **Coupling**      | High (direct calls)         | Low (EventBus)        |
| **Extensibility** | Hard (modify app.js)        | Easy (add plugin)     |
| **Testing**       | Brittle (full app init)     | Robust (mock deps)    |
| **Configuration** | String-based (localStorage) | JSON Schema validated |
| **Scalability**   | Max ~5 features             | Unlimited plugins     |

### Accepted Tradeoffs

✅ **ACCEPT**: More files/complexity initially
✅ **ACCEPT**: Need for plugin development guide
❌ **REJECT**: Supporting both systems indefinitely

### Migration Plan

```
Q1 2026:
├─ Stabilize tests (this week)
├─ Migrate all plugins to PluginSystem (week 2-3)
└─ Unify config (week 4)

Q2 2026:
├─ Deprecate legacy system
├─ Create plugin dev docs
└─ Implement first custom plugin as proof

Q3+ 2026:
├─ Community plugins
├─ Plugin marketplace
└─ Full modular ecosystem
```

### Dependencies

This decision depends on:

- ✅ EventBus implementation (done)
- ✅ PluginSystem implementation (done)
- ✅ ConfigManager implementation (done)
- 🔄 Tests stabilization (in progress)
- ⏳ Plugin documentation (pending)
- ⏳ Migration of existing plugins (pending)

### Success Metrics

- [ ] All 12 tests green
- [ ] All 4 existing plugins migrated to PluginSystem
- [ ] Custom plugin created and documented
- [ ] <100ms additional init time
- [ ] Zero breaking changes for end users

### Risks & Mitigation

| Risk                    | Probability | Impact | Mitigation                           |
| ----------------------- | ----------- | ------ | ------------------------------------ |
| Tests remain flaky      | Medium      | High   | Intensive debugging (done this week) |
| Plugin migration stalls | Low         | Medium | Document as you go                   |
| Performance degradation | Low         | Medium | Event system profiling               |
| User config migration   | Low         | High   | Automated migration script           |

### Alternative Considered

**Alternative**: Keep both systems indefinitely

**Why Rejected**:

- Maintenance burden = 2x work
- Confuses new contributors
- Tests must support both paths
- No clear migration path
- Users stuck with legacy once they choose it

---

## Consequences

### What Changes

1. **For App Core**:

   - EventBus becomes communication backbone
   - All plugins register with PluginSystem
   - Configuration via ConfigManager

2. **For Plugins**:

   - Must implement PluginInterface
   - Must emit standard events
   - Must register configSchema

3. **For Users**:
   - Settings unified in one UI
   - Configuration shared across plugins
   - Consistent experience

### What Stays the Same

1. **For End Users**:

   - Same UI/UX
   - Same data (GitHub storage)
   - Same keyboard shortcuts

2. **For API**:
   - localStorage still works (via StorageManager)
   - GitHub API same
   - Markdown rendering same

---

## Next Actions

1. **This Week** (Jan 14-16):

   - [ ] Debug & fix 5 failing tests
   - [ ] Commit decision to repo
   - [ ] Create plugin development guide

2. **Next Week** (Jan 20-24):

   - [ ] Migrate journal-plugin to PluginSystem
   - [ ] Create first custom plugin example
   - [ ] Document plugin manifest

3. **Following Week** (Jan 27-31):
   - [ ] Migrate remaining plugins
   - [ ] Performance testing
   - [ ] User migration plan

---

## References

- Architecture Document: `docs/ARCHITECTURE_MODERN_CONFIG_SYSTEM.md`
- EventBus: `src/core/event-bus.js`
- PluginSystem: `src/core/plugin-system.js`
- ConfigManager: `src/core/config-manager.js`
- Tests: `tests/config-system-integration.spec.mjs`

---

**Record Keeper**: GitHub Copilot
**Decision Date**: 2026-01-14
**Last Updated**: 2026-01-15

---

## 🚀 Decision: Performance Strategy - Vanilla JS First, Wasm for Hot Paths

**Date**: 2026-01-15
**Decision Maker**: Stéphane + Copilot
**Status**: ACCEPTED

---

### Context

Question: Should we use WebAssembly (Wasm) for performance-critical operations?

Current app characteristics:

- Vanilla JavaScript (no build step)
- Bundle size: <100 KB
- Target: notes typically <50 KB
- Philosophy: Simplicity over premature optimization

### The Decision

**Keep vanilla JavaScript as default, introduce Wasm as optional plugins for proven hot paths.**

### Rationale

#### Why NOT Wasm now (v0.0.x → v0.9.x):

- ❌ **Complexity**: Requires build toolchain (rustc/clang → wasm)
- ❌ **Bundle size**: Typical Wasm modules 1-2 MB vs current <100 KB total
- ❌ **Breaks philosophy**: "Zero build step" is core value
- ❌ **Premature**: Current JS performance already sufficient for typical usage
- ✅ **Simplicity > Speed**: For notes <50 KB, JS parsing is <10ms

#### Why Wasm later (v1.0+):

- ✅ **Hot paths identified**: Real performance bottlenecks proven by metrics
- ✅ **As plugins**: Optional, lazy-loaded, with JS fallback
- ✅ **Progressive enhancement**: Advanced users opt-in
- ✅ **Specific use cases**: Search, Git, graph algorithms

### Priority Hot Paths for Future Wasm

| Feature              | Current (JS)                      | With Wasm        | Gain | Priority        |
| -------------------- | --------------------------------- | ---------------- | ---- | --------------- |
| **Full-text search** | Lunr.js ~350ms (5000 notes)       | Tantivy ~15ms    | 23x  | 🥇 HIGH         |
| **Git operations**   | isomorphic-git ~12s (500 commits) | libgit2 ~0.8s    | 15x  | 🥈 MEDIUM       |
| **Graph algorithms** | N/A (future)                      | Rust graph libs  | N/A  | 🥉 LOW          |
| **Markdown parsing** | marked ~10ms                      | Wasm parser ~2ms | 5x   | ❌ NOT WORTH IT |

### Implementation Strategy

```javascript
// Plugin manifest with Wasm + fallback
{
  "plugins": {
    "search-tantivy": {
      "enabled": true,
      "source": "cdn",
      "url": "https://unpkg.com/pensine-plugin-search-wasm@latest",
      "wasm": true,              // ← Wasm module
      "fallback": "search-js",   // ← JS fallback if Wasm fails
      "lazyLoad": true,          // ← Load only when needed
      "size": "1.5 MB"           // ← User can see cost
    }
  }
}
```

**Advantages**:

- ✅ Base app remains lightweight
- ✅ Advanced users get performance boost
- ✅ Graceful degradation (Wasm fail → JS fallback)
- ✅ Lazy loading (download only when activated)
- ✅ Clear opt-in (users see bundle size)

### Trigger Conditions for Wasm Implementation

Implement Wasm plugin when **ALL** of these are true:

1. **Proven bottleneck**: >500ms operation in real usage
2. **Frequent operation**: >10 times/day by typical user
3. **Wasm advantage**: >5x performance improvement demonstrated
4. **JS fallback exists**: Works without Wasm
5. **Bundle size acceptable**: <2 MB additional download
6. **Browser support**: >95% of target browsers

### Timeline

```
Phase 1 (v0.0.x → v0.9.x): Vanilla JS only
├─ No Wasm
├─ Profile & identify real bottlenecks
└─ Optimize JS first

Phase 2 (v1.0 → v1.5): First Wasm plugin
├─ Implement: Full-text search (Tantivy)
├─ As optional plugin with JS fallback
└─ Gather performance metrics

Phase 3 (v1.6+): Additional Wasm plugins
├─ Implement: libgit2 for local-git mode
├─ Consider: Graph algorithms for "3e Hémisphère"
└─ Ecosystem: Accept community Wasm plugins

Phase 4 (v2.0+): Wasm for advanced features
├─ Semantic analysis
├─ ML-based search ranking
└─ Knowledge graph computation
```

### Rejected Alternatives

**Alternative 1**: Wasm from day one

- ❌ Violates "simplicity first" principle
- ❌ Premature optimization
- ❌ Adds complexity without proven need

**Alternative 2**: Never use Wasm

- ❌ Limits future performance ceiling
- ❌ Prevents advanced features (ML, semantic analysis)
- ❌ Competitive disadvantage vs native apps

**Alternative 3**: Mandatory Wasm for all users

- ❌ Forces 1-2 MB download on everyone
- ❌ Breaks on Wasm-incompatible browsers
- ❌ No graceful degradation

### Success Metrics

**Phase 1 (JS optimization)**:

- [ ] All operations <100ms on average hardware
- [ ] 5000 notes searchable in <500ms
- [ ] Git clone (100 commits) in <5s

**Phase 2 (First Wasm plugin)**:

- [ ] Search 5000 notes in <50ms (Tantivy)
- [ ] <20% of users opt-in (validates optional approach)
- [ ] Zero crashes due to Wasm failures (fallback works)
- [ ] 95%+ positive feedback from Wasm users

### Dependencies

- ✅ Plugin system operational (done)
- ✅ Lazy loading infrastructure (done)
- 🔄 Performance profiling tools (in progress)
- ⏳ Wasm build pipeline (future)
- ⏳ Browser compatibility tests (future)

### Risks & Mitigation

| Risk                    | Probability | Impact | Mitigation                   |
| ----------------------- | ----------- | ------ | ---------------------------- |
| Wasm fails to load      | Medium      | Low    | JS fallback mandatory        |
| Bundle size bloat       | Low         | Medium | Size warnings + lazy load    |
| Build complexity        | High        | Medium | Isolate in separate plugins  |
| Browser incompatibility | Low         | Low    | Feature detection + fallback |

---

### Consequences

**What changes**:

1. Performance roadmap clearly defined
2. Plugin system designed for Wasm support
3. JS fallbacks required for all Wasm features
4. Bundle size monitoring critical

**What stays the same**:

1. Core app remains vanilla JS
2. Zero build step for main codebase
3. Works without Wasm
4. Simplicity-first philosophy

---

### Next Actions

**Q1 2026** (Current):

- [ ] Profile real-world performance bottlenecks
- [ ] Document Wasm plugin architecture
- [ ] Create JS fallback template

**Q2-Q3 2026**:

- [ ] Implement first Wasm plugin (search) if metrics justify
- [ ] A/B test with/without Wasm
- [ ] Gather user feedback

**Q4 2026+**:

- [ ] Expand Wasm to proven hot paths only
- [ ] Community Wasm plugin guidelines
- [ ] Performance dashboard for users

---

**References**:

- Plugin Architecture: `docs/BOOTSTRAP_ARCHITECTURE.md`
- Performance Benchmarks: `docs/PERFORMANCE.md` (to create)
- Wasm Plugin Template: `packages/plugin-wasm-template/` (future)
