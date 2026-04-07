# Architecture Update - Multi-Repos Support (2026-01-17)

## 🚨 Changement Architectural Majeur

**Ce qui a changé** : Pensine passe d'une architecture **single-repo** à **multi-repos avec superposition** + **Layout 3 panneaux**.

### Avant (Single-Repo)

```
pensine-notes/
├── journals/
├── pages/
└── .pensine-config.json
```

**Limites** :

- Tous les contextes mélangés (pro + perso dans même repo)
- Pas de séparation claire vie pro/perso
- Synchronisation "tout ou rien"
- Pas de collaboration sur sous-ensemble

### Après (Multi-Repos + Layout 3 Panneaux)

**Vue application** :

```
┌─────────────────────────────────────────────────────────────────┐
│  Header (⚙️ Settings, 🔄 Sync, 🔍 Search)                       │
├─────────┬───────────────────┬───────────────────────────────────┤
│ Filtres │     Fichiers      │          Éditeur                  │
│         │                   │                                   │
│ 📅 Cal  │ [📁 Repos]        │  ┌────────────────────────────┐   │
│ 🔍 Rech │ ├─ 💼 Travail     │  │ 💼 journals/2025-01-17.md  │   │
│ 🏷️ Tags │ │  ├─ journals/   │  │ # Daily Journal            │   │
│ ⭐ Fav  │ │  └─ pages/       │  │ Content...                 │   │
│         │ ├─ 🏠 Personnel   │  └────────────────────────────┘   │
│         │ │  └─ journals/    │                                   │
│         │ └─ 🚀 Projet X    │  [</> 👁️ ⬌] [💾] [⨉]              │
│         │    ├─ pages/ [+]  │                                   │
└─────────┴───────────────────┴───────────────────────────────────┘
```

**Repos backend** :

```
💼 work-repo/ (GitHub: acme-corp/pensine-work)
├── .pensine/config.json (color=#3b82f6)
├── journals/
└── pages/

🏠 personal-repo/ (GitHub: mystephanedenis/pensine-perso)
├── .pensine/config.json (color=#10b981)
├── journals/
└── pages/

🚀 project-x-repo/ (GitHub: team-x/pensine-projet)
├── .pensine/config.json (color=#f59e0b)
├── journals/
└── pages/
```

**Avantages** :

- ✅ **Séparation contextes** : Pro/perso/projets isolés
- ✅ **Synchronisation sélective** : Sync seulement certains repos
- ✅ **Collaboration granulaire** : Partager projet-repo, pas perso-repo
- ✅ **Privacy-first** : Données sensibles dans repo privé séparé
- ✅ **Vue unifiée** : Calendrier fusionne tous les repos avec couleurs
- ✅ **UX familière** : Layout VSCode-like (Filtres | Fichiers | Éditeur)

---

## 🎨 Layout 3 Panneaux : Filtres | Fichiers | Éditeur

### Principe

**Inspiré de VSCode** : 3 zones horizontales pour maximiser productivité.

```
┌──────────┬──────────────────┬─────────────────────────────────┐
│  Filtres │     Fichiers     │          Éditeur                │
│  (200px) │     (300px)      │          (flex)                 │
├──────────┼──────────────────┼─────────────────────────────────┤
│ 📅 Cal   │ Onglets repos:   │  Header:                        │
│   17 Jan │ [💼][🏠][🚀]     │    💼 journals/2025-01-17.md    │
│   18 Jan │                  │    [</> 👁️ ⬌] [💾] [⨉]         │
│          │ Arborescence:    │                                 │
│ 🔍 Rech  │ 📁 journals      │  Content:                       │
│   "task" │   📄 2025-01.md  │    # Daily Journal              │
│          │   📄 2025-02.md  │    - Meeting notes...           │
│ 🏷️ Tags  │ 📁 pages         │    - Tasks...                   │
│   urgent │   📄 inbox.md    │                                 │
│   work   │                  │  Footer:                        │
│          │ Actions:         │    234 words | Synced ✅        │
│ ⭐ Fav   │ [+ New File]     │                                 │
└──────────┴──────────────────┴─────────────────────────────────┘
```

### Panneau 1 : Filtres (Gauche, 200-250px)

**Rôle** : Navigation et découverte de contenu.

**Plugins affichés** :

1. **📅 Calendrier** (plugin-calendar)

   - LinearCalendar format
   - Clic jour → filtre Panneau Fichiers
   - Badges repos avec contenu (💼🏠🚀)

2. **🔍 Recherche** (core/search)

   - Full-text, regex
   - Filtres : `repo:work tag:urgent`

3. **🏷️ Tags** (plugin-tags, future)

   - Nuage de tags, clic → filtre

4. **⭐ Favoris** (core/favorites)
   - Notes épinglées

**Comportement** :

- Collapsible (bouton ◀️)
- Mobile : overlay slide-in

### Panneau 2 : Fichiers (Centre-gauche, 250-350px)

**Rôle** : Arborescence fichiers avec gestion multi-repos.

**Fonctionnalités** :

1. **Onglets repos** :

   ```html
   <div class="repo-tabs">
     <button class="tab active" data-repo="work">💼 Travail</button>
     <button class="tab" data-repo="personal">🏠 Personnel</button>
     <button class="tab" data-repo="projet-x">🚀 Projet X</button>
   </div>
   ```

   - Badge nombre modifs (💼 3)
   - Icône conflit (⚠️)

2. **[+] Créer fichier** :

   - Bouton dans onglet actif
   - Modal : Type, Nom, Template
   - Crée dans repo actif

3. **Drag & Drop entre repos** :

   - Drag `task.md` depuis 💼 Travail
   - Drop sur onglet 🏠 Personnel
   - Confirmation → Move (delete + add Git)

4. **Actions contextuelles** :

   - Clic droit → Renommer, Supprimer, Déplacer
   - Double-clic → Ouvre dans éditeur

5. **Indicateurs** :
   - ● Rouge : Non sauvegardé
   - ☁️ Gris : Non syncé
   - ⚠️ Jaune : Conflit

### Panneau 3 : Éditeur (Centre-droit, flex)

**Rôle** : Éditeur unifié existant avec améliorations multi-repos.

**Header amélioré** :

```html
<div class="editor-header">
  <div class="left">
    <span class="repo-badge" data-repo="work">💼 Travail</span>
    <input class="filename-editable" value="journals/2025-01-17.md" />
  </div>
  <div class="right">
    <button class="view-mode" data-mode="code"><\/></button>
    <button class="view-mode" data-mode="rich">👁️</button>
    <button class="view-mode" data-mode="split">⬌</button>
    <button class="save">💾</button>
    <button class="close">⨉</button>
  </div>
</div>
```

**Nouveautés** :

- **Badge repo** : Indique origine (non éditable)
- **Filename editable** : Clic → rename inline
- **Drag badge vers onglet** : Déplace fichier
- **Footer stats** : `234 words | Synced ✅`

### Interactions entre Panneaux

```
Filtres →[filtre]→ Fichiers →[ouvre]→ Éditeur
   ↑                  ↓                  ↓
   └──[clic]──────────┘        [save]→[update]
                        [drag fichier entre onglets]
```

**Exemples** :

1. **Calendrier → Fichiers** :

   - Clic 17 Jan
   - Fichiers filtre : `journals/2025-01-17.md` (tous repos)
   - 3 fichiers affichés (💼🏠🚀)

2. **Drag entre repos** :
   - Drag `inbox-task.md` depuis 💼
   - Drop sur 🏠
   - Confirmation → Move + Git ops

### Responsive

| Taille  | Layout                                      |
| ------- | ------------------------------------------- |
| Desktop | 3 panneaux (Filtres \| Fichiers \| Éditeur) |
| Tablet  | Filtres collapse (📁 \| Éditeur)            |
| Mobile  | 1 panneau, swipe navigation                 |

---

## 📊 Impact sur les Composants

### 1. Configuration System

**Avant** :

```javascript
// Single config source
const config = localStorage.getItem("pensine-config");
```

**Après** :

```javascript
// Multi-configs avec priorité
const configs = {
  global: localStorage.getItem("pensine-global-config"),
  repos: JSON.parse(localStorage.getItem("pensine-multi-repos")).repos.map(
    (r) => ({
      id: r.id,
      config: loadRepoConfig(r), // .pensine/config.json de chaque repo
    })
  ),
};

// Merge avec priorité: repo-specific > global > defaults
const effectiveConfig = mergeConfigs(configs);
```

### 2. Storage Manager

**Avant** :

```javascript
class StorageManager {
  async readFile(path) {
    // Single repo
    return github.getContent(this.owner, this.repo, path);
  }
}
```

**Après** :

```javascript
class StorageManager {
  constructor(repos) {
    this.repos = repos; // Array of repo configs
  }

  async readFile(path) {
    // Détecter quel repo contient le fichier
    const repo = this.detectRepo(path);
    return repo.adapter.getContent(path);
  }

  async readAllJournals(date) {
    // Lire journal de TOUS les repos pour cette date
    const promises = this.repos
      .filter((r) => r.enabled)
      .map((r) => r.adapter.getContent(`journals/${date}.md`));

    return Promise.allSettled(promises);
  }
}
```

### 3. Calendar View

**Avant** :

```javascript
// Afficher journal d'une seule source
const journal = await storage.readFile(`journals/${date}.md`);
displayJournal(journal);
```

**Après** :

```javascript
// Afficher journaux de TOUS les repos, colorés par origine
const journals = await storage.readAllJournals(date);

journals.forEach((result, index) => {
  if (result.status === "fulfilled") {
    const repo = repos[index];
    displayJournal(result.value, {
      color: repo.color,
      icon: repo.icon,
      repoName: repo.name,
    });
  }
});
```

### 4. Editor

**Avant** :

```javascript
// Save dans le repo unique
await storage.writeFile(path, content);
```

**Après** :

```javascript
// Save dans le bon repo (détecté par path ou contexte)
const repo = detectTargetRepo(path);
await repo.adapter.writeFile(path, content);

// Ou permettre choix utilisateur
const repo = await promptRepoSelection();
await repo.adapter.writeFile(path, content);
```

### 5. Search

**Avant** :

```javascript
// Recherche dans un seul repo
const results = await search(query);
```

**Après** :

```javascript
// Recherche dans tous les repos activés
const results = await Promise.all(
  repos.filter((r) => r.enabled).map((r) => r.adapter.search(query))
);

// Fusionner résultats avec metadata repo
const mergedResults = results.flat().map((result) => ({
  ...result,
  repoId: result.repo.id,
  repoName: result.repo.name,
  repoColor: result.repo.color,
  repoIcon: result.repo.icon,
}));
```

---

## 🔧 Modifications Nécessaires

### Phase 1: Data Model (Urgent)

**Fichiers à modifier** :

1. [`src/lib/adapters/storage-adapter-base.js`](../src/lib/adapters/storage-adapter-base.js)

   - Ajouter `repoId` à toutes les méthodes
   - Retourner metadata repo avec chaque fichier

2. [`src/lib/components/storage-manager-unified.js`](../src/lib/components/storage-manager-unified.js)

   - Support array de repos au lieu de single repo
   - Méthodes `readAll*()` pour lire multi-repos
   - Router writes vers bon repo

3. [`src/core/config-manager.js`](../src/core/config-manager.js)
   - Support configs par repo
   - Merge strategy avec priorités
   - Validation JSON Schema pour `.pensine/config.json`

**Nouvelles classes** :

```javascript
// src/lib/multi-repo-manager.js
class MultiRepoManager {
  constructor() {
    this.repos = [];
    this.activeRepo = null;
  }

  async addRepo(repoConfig) {
    const adapter = this.createAdapter(repoConfig);
    await adapter.init();

    this.repos.push({
      ...repoConfig,
      adapter,
      enabled: true,
    });
  }

  async readFromAll(path) {
    return Promise.allSettled(
      this.repos.filter((r) => r.enabled).map((r) => r.adapter.readFile(path))
    );
  }

  detectRepo(path) {
    // Heuristique: chercher quel repo contient le fichier
    // Fallback: activeRepo ou defaultRepo
  }
}
```

### Phase 2: UI Components (Important)

**Composants à créer** :

1. **Repo Switcher** (header)

   ```html
   <select id="repo-switcher">
     <option value="all">📊 Tous les repos</option>
     <option value="work">💼 Travail</option>
     <option value="personal">🏠 Personnel</option>
     <option value="project-x">🚀 Projet X</option>
   </select>
   ```

2. **Repo Badge** (sur chaque note)

   ```html
   <span class="repo-badge" style="background: #3b82f6"> 💼 Travail </span>
   ```

3. **Multi-Repo Settings Panel**

   ```html
   <div id="multi-repo-settings">
     <h2>Repos Configurés</h2>
     <ul>
       <li>
         <span>💼 Travail</span>
         <input type="color" value="#3b82f6" />
         <button>⚙️</button>
         <button>🗑️</button>
       </li>
       <!-- ... -->
     </ul>
     <button id="add-repo">➕ Ajouter un repo</button>
   </div>
   ```

4. **Repo Selector Modal** (nouvelle note)

   ```html
   <dialog id="repo-selector">
     <h2>Dans quel repo créer cette note ?</h2>
     <div class="repo-options">
       <button data-repo="work">💼 Travail</button>
       <button data-repo="personal">🏠 Personnel</button>
       <button data-repo="project-x">🚀 Projet X</button>
     </div>
   </dialog>
   ```

**Composants à modifier** :

1. [`src/lib/components/linear-calendar.js`](../src/lib/components/linear-calendar/linear-calendar.js)

   - Afficher markers colorés par repo
   - Tooltip montre origine (💼 + 🏠 + 🚀)

2. [`src/lib/components/editor.js`](../src/lib/components/editor.js)

   - Badge repo dans header
   - Selector repo avant save (si nouveau fichier)

3. [`src/lib/components/settings-view.js`](../src/lib/components/settings-view.js)
   - Nouvel onglet "Repos"
   - Gestion add/edit/delete repos

### Phase 3: Synchronization (Critical)

**Stratégie** :

- Sync parallèle de tous repos (Promise.all)
- Retry indépendant par repo (erreur dans work n'affecte pas personal)
- Status indicator par repo (🟢 synced, 🔴 error, 🟡 syncing)

```javascript
class MultiRepoSync {
  async syncAll() {
    const results = await Promise.allSettled(
      this.repos.map((r) => this.syncRepo(r))
    );

    results.forEach((result, i) => {
      const repo = this.repos[i];
      if (result.status === "fulfilled") {
        repo.syncStatus = "synced";
        repo.lastSync = new Date();
      } else {
        repo.syncStatus = "error";
        repo.lastError = result.reason;
      }
    });

    this.emit("sync:complete", results);
  }

  async syncRepo(repo) {
    // Sync individuel avec retry
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await repo.adapter.sync();
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.wait(1000 * Math.pow(2, i));
      }
    }
  }
}
```

---

## 📋 Migration Utilisateurs

### Scénario 1 : Utilisateur Existant (Single-Repo)

**Étape 1** : Détecter config existante

```javascript
const hasOldConfig = localStorage.getItem("pensine-config");
if (hasOldConfig) {
  showMigrationWizard();
}
```

**Étape 2** : Wizard de migration

```
┌─────────────────────────────────────────┐
│ Migration vers Multi-Repos             │
├─────────────────────────────────────────┤
│                                         │
│ Votre repo actuel :                     │
│ 📦 stephanedenis/pensine-notes          │
│                                         │
│ Voulez-vous :                           │
│                                         │
│ ◉ Garder comme repo unique              │
│   (Recommandé si vous n'avez qu'un      │
│    contexte)                            │
│                                         │
│ ○ Séparer en plusieurs repos            │
│   (Pro/Perso/Projets dans repos         │
│    distincts)                           │
│                                         │
│         [Continuer]  [Plus tard]        │
└─────────────────────────────────────────┘
```

**Étape 3** : Si séparation choisie

- Wizard guide création nouveaux repos
- Propose migration contenu par regex/mots-clés
- Conserve backup du repo original

### Scénario 2 : Nouvel Utilisateur

**Wizard onboarding adapté** :

```
┌─────────────────────────────────────────┐
│ Bienvenue dans Pensine!                │
├─────────────────────────────────────────┤
│                                         │
│ Configurez votre premier repo :        │
│                                         │
│ Nom:     [Personal Notes_________]     │
│ Owner:   [stephanedenis__________]     │
│ Repo:    [pensine-perso__________]     │
│ Couleur: [🎨 #10b981] 🏠               │
│                                         │
│ ☐ Ajouter d'autres repos plus tard     │
│                                         │
│            [Créer mon repo]             │
└─────────────────────────────────────────┘
```

---

## 🧪 Tests à Ajouter

### Tests Multi-Repos

**Fichier** : `tests/multi-repo-integration.spec.mjs`

```javascript
test("Load journals from 3 repos simultaneously", async ({ page }) => {
  // Setup 3 repos mockés
  await mockRepo("work", { journals: ["2025-01-17.md"] });
  await mockRepo("personal", { journals: ["2025-01-17.md"] });
  await mockRepo("project-x", { journals: ["2025-01-17.md"] });

  // Naviguer vers calendrier
  await page.goto("/");
  await page.click("#calendar-btn");
  await page.click('[data-date="2025-01-17"]');

  // Vérifier 3 sections affichées
  const sections = await page.locator(".journal-section").count();
  expect(sections).toBe(3);

  // Vérifier couleurs distinctes
  const colors = await page
    .locator(".repo-badge")
    .evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).backgroundColor)
    );
  expect(new Set(colors).size).toBe(3); // 3 couleurs différentes
});

test("Save new note prompts repo selection", async ({ page }) => {
  // 3 repos configurés
  await setupMultiRepos(3);

  // Créer nouvelle note
  await page.click("#new-note-btn");

  // Modal de sélection repo doit apparaître
  const modal = page.locator("#repo-selector");
  await expect(modal).toBeVisible();

  // Sélectionner "Personal"
  await page.click('[data-repo="personal"]');

  // Éditeur ouvert avec badge "Personal"
  const badge = page.locator(".repo-badge");
  await expect(badge).toHaveText("🏠 Personnel");
});

test("Sync error in one repo does not block others", async ({ page }) => {
  await mockRepo("work", { syncError: true });
  await mockRepo("personal", { syncOk: true });

  await page.click("#sync-btn");
  await page.waitForTimeout(2000);

  // Work repo en erreur
  const workStatus = page.locator('[data-repo="work"] .sync-status');
  await expect(workStatus).toHaveText("🔴");

  // Personal repo OK
  const personalStatus = page.locator('[data-repo="personal"] .sync-status');
  await expect(personalStatus).toHaveText("🟢");
});
```

---

## 📚 Documentation Nécessaire

### Pour Utilisateurs

1. **Guide Multi-Repos** (`docs/USER_GUIDE_MULTI_REPOS.md`)

   - Pourquoi séparer contextes
   - Comment créer plusieurs repos
   - Best practices organisation

2. **Migration Guide** (`docs/MIGRATION_SINGLE_TO_MULTI.md`)
   - Étapes détaillées
   - Stratégies de séparation contenu
   - Rollback si problèmes

### Pour Développeurs

1. **Architecture Multi-Repos** (ce document)
2. **Repo Structure Standard** ([`REPO_STRUCTURE_STANDARD.md`](REPO_STRUCTURE_STANDARD.md))
3. **API Multi-Repos** (`docs/API_MULTI_REPOS.md` - TODO)
   - MultiRepoManager API
   - Repo detection heuristics
   - Config merge strategies

---

## 🗓️ Timeline

**Priorité** : Débogage d'abord, refactoring ensuite (sauf si refactoring résout bug).

### Phase 0 : Débogage Critique (Semaine 3 Janvier) ⚠️ **URGENT**

**Objectif** : Stabiliser l'app existante avant refactoring multi-repos.

- [ ] **Bootstrap race condition** (2-3h)

  - Promise `bootstrapReady` dans `bootstrap.js`
  - Event `bootstrap:complete` pour synchronisation
  - Exposer `modernConfigManager` dans tous workflows

- [ ] **Refactorer tests** (4-6h)

  - Splitter `config-system-integration.spec.mjs`
  - Séparer tests wizard-onboarding de settings-panel
  - Attendre `bootstrapReady` au lieu de timeout hardcodé

- [ ] **Error routing basique** (4h)
  - PAT expiré → Settings Panel (pas wizard)
  - Repo introuvable → Settings Git tab
  - Config corrompu irrécupérable → Wizard reset

**Livrable** : Tests 100% verts sur Edge, app stable.

---

### Phase 1 : Foundation Multi-Repos (Semaine 4 Janvier - Semaine 1 Février)

- [ ] Data model multi-repos (localStorage structure)
- [ ] Storage adapter support array repos
- [ ] Config merge strategy (repo > global > defaults)
- [ ] Tests unitaires MultiRepoManager

### Phase 2 : Layout 3 Panneaux (Semaine 2-3 Février)

- [ ] **Panneau Filtres** : Calendrier, Recherche, Tags, Favoris
- [ ] **Panneau Fichiers** : Onglets repos, arborescence, [+] créer, drag&drop
- [ ] **Panneau Éditeur** : Badge repo, filename editable, drag vers onglets
- [ ] Responsive (Desktop 3 panneaux, Tablet 2, Mobile 1)

### Phase 3 : Views Adaptation (Semaine 4 Février - Semaine 1 Mars)

- [ ] Calendar multi-repos coloré (💼🏠🚀 superposition)
- [ ] Search cross-repos avec filtres
- [ ] Pages arborescence fusionnée
- [ ] Graph view multi-repos (future)

### Phase 4 : Migration & Polish (Semaine 2 Mars)

- [ ] ~~Migration wizard single→multi~~ ❌ **ANNULÉ** (user : "Pas de wizard de migration")
- [ ] **Migration automatique** : Détection au boot, config standard
- [ ] User guide multi-repos
- [ ] Tests E2E complets (drag&drop, multi-repos sync)
- [ ] Performance optimization (lazy loading, cache)

---

**Maintainer** : Stéphane Denis (@stephanedenis)
**Date** : 2026-01-17
**Status** : DRAFT - Architecture proposée (Phase 0 URGENT)
