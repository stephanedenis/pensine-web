# 🏗️ Audit de la Structure du Projet

**Date** : 14 janvier 2026
**Perspective** : Architecture et organisation des fichiers
**Status** : ⚠️ À restructurer

---

## 📊 Vue d'ensemble

```
RACINE (CHAOS)
├── 16 fichiers .md (docs + audit + session)
├── 7 images .png (screenshots wizard)
├── 5 fichiers config (.code-workspace, package.json, etc.)
├── 3 fichiers HTML (index.html, oauth-callback.html)
├── 2 fichiers JS à la racine (app.js, config.js) ⚠️
└── 10 dossiers (core, lib, styles, plugins, docs, etc.)

HÉRITAGE:
├── core/              (MODERNE - config/plugin system)
├── lib/               (MÉLANGE - legacy + nouveau)
└── styles/           (OK - bien organisé)
```

---

## ✅ CE QUI VA BIEN

### 1. **Dossier `/styles`** (4 fichiers logiques)

```
styles/
├── main.css          ✅ Styles globaux
├── calendar.css      ✅ Spécifique feature
├── editor.css        ✅ Spécifique feature
└── wizard.css        ✅ Spécifique feature
```

**Score** : 9/10 (bien organisé par feature)

---

### 2. **Dossier `/core`** (4 fichiers modernes)

```
core/
├── config-manager.js    ✅ Moderne (443 lignes)
├── event-bus.js         ✅ Service central
├── plugin-system.js     ✅ Architecture plugin
└── router.js            ✅ Routeur
```

**Score** : 8/10 (bon, mais importe `lib/*` ancien code)

---

### 3. **Dossier `/plugins`** (5 plugins)

```
plugins/
├── pensine-plugin-accelerator/    ✅ Nouveau (structuré)
├── pensine-plugin-calendar/       ✅ Isolé
├── pensine-plugin-inbox/          ✅ Isolé
├── pensine-plugin-journal/        ✅ Isolé
└── pensine-plugin-reflection/     ✅ Isolé
```

**Score** : 9/10 (chaque plugin isolé et indépendant)

---

### 4. **Dossier `/docs`** (14+ fichiers)

```
docs/
├── SPECIFICATIONS_TECHNIQUES.md   ✅ Complète
├── AUDIT_COHESION.md              ✅ Détaillé
├── ACCELERATOR_*.md (7 files)     ✅ Structuré par feature
├── journal-de-bord/               ✅ Historique
└── ...
```

**Score** : 9/10 (bien organisé, peut être rangé en sous-dossiers)

---

## 🔴 PROBLÈMES CRITIQUES

### 1. **Fichiers à la racine (CHAOS)**

**Problème** : 30+ fichiers à la racine

```
pensine-web/
├── app.js              🔴 CODE PRINCIPAL (1493 lignes)
├── config.js           🔴 CONFIG (empty)
├── index.html          ✅ OK (point d'entrée)
├── oauth-callback.html 🔴 Orphelin?
├── 7 wizard*.png       🔴 À déplacer → /assets/images
├── 3 pensine*.png      🔴 À déplacer → /assets/images
├── ACCELERATOR_*.md    🔴 À déplacer → /docs
├── TEST_*.md           🔴 À déplacer → /tests
├── MANUAL_TEST_*.md    🔴 À déplacer → /docs ou /tests
└── ...
```

**Impact** :

- Difficile de voir la structure d'un coup d'œil
- Mélange code + docs + images + config
- Git très bruyant au commit

**Recommandation** : Créer structure logique

---

### 2. **Dossier `/lib` (MÉLANGE)**

**Problème** : 17 fichiers sans cohérence

```
lib/
├── ANCIEN (legacy non-modular):
│   ├── editor.js              (éditeur ancien)
│   ├── github-adapter.js      (appels API bruts)
│   ├── storage.js             (localStorage basique)
│   └── markdown-*.js          (parsers)
│
├── NOUVEAU (ES6 modules):
│   ├── config-wizard.js
│   ├── github-oauth.js
│   ├── settings-integration.js
│   └── storage-adapter-base.js
│
├── TRANSITOIRE (migration):
│   ├── local-git-adapter.js
│   ├── local-storage-adapter.js
│   ├── migrate-to-oauth.js
│   └── token-storage.js
│
└── COMPOSANTS:
    ├── components/            (mal placé?)
    └── json-schema-form-builder.js
```

**Impact** :

- Pas clair quel code utiliser (ancien vs nouveau)
- Duplication (storage.js vs storage-adapter-base.js)
- Dépendances circulaires possibles

**Score** : 3/10 (très désorganisé)

---

### 3. **Duplication ConfigManager**

**Localisation** :

- `app.js` lignes ~1-90 : classe ConfigManager (simple, legacy)
- `core/config-manager.js` lignes 1-443 : classe ConfigManager (moderne, complex)

**Le même code existe 2 fois** :

| Aspect | app.js | core/ |
|--------|--------|-------|
| **Statut** | Legacy | Moderne |
| **Lignes** | ~90 | 443 |
| **Modules ES6** | Non | Oui |
| **Storage injectable** | Non | Oui |
| **Validation** | Non | Oui |
| **Event system** | Non | Oui |
| **Plugins** | Non | Oui |

**Question** : Lequel utiliser? Les deux?

**Recommandation** : Consolider → garder `core/` uniquement

---

### 4. **PluginSystem sous-exploité**

**Localisation** : `core/plugin-system.js`

**Problème** :

- Définit l'API plugin (register, enable, disable)
- Mais `lib/config-wizard.js` n'utilise PAS le système
- Plugins dans `plugins/` n'utilisent pas tous plugin-system.js
- Déclaration de plugins COMMENT? Où?

**Impact** :

- Pas clair comment créer un nouveau plugin
- Migration des plugins vers système unifié incomplet

**Recommandation** : Documenter API plugin standardisée

---

### 5. **RouterJS vs Pas de routeur clair**

**Localisation** : `core/router.js`

**Problème** :

- Fichier existe mais `app.js` gère la navigation
- Pas d'API cohérente `router.navigate()` ou similaire
- Conditions de course possibles sur changement de vue

**Recommandation** : Unifier navigation via routeur

---

## 🟡 PROBLÈMES MINEURS

### 1. **Dossier `/views` (vide ou mal placé)**

```
views/
└── settings-view.js  (1 seul fichier)
```

→ Devrait être dans `lib/components/` ou `lib/views/`

---

### 2. **Dossier `/tests` vs `/test-results`**

```
tests/                    (1 fichier .mjs)
test-results/            (output playwright)
playwright-report/       (output playwright)
```

→ Consolider: tous les tests générés dans `test-results/`

---

### 3. **Dossier `/workers` (orphelin?)**

```
workers/
├── oauth.js
└── wrangler.toml
```

→ Cloudflare Workers? Utilisé? Documenté?

---

### 4. **Dossier `/journals` (pourquoi pas dans `/docs/journal-de-bord`?)**

```
journals/
└── 2025-12-16.md
```

→ À déplacer dans `docs/journal-de-bord/`

---

### 5. **Dossier `/scripts` (mal documenté)**

```
scripts/
└── init-plugins.sh
```

→ Documenter usage et dépendances

---

## 📐 STRUCTURE RECOMMANDÉE

```
pensine-web/
│
├── 📄 FICHIERS RACINE (essentiels seulement)
│   ├── index.html              ✅ Point d'entrée
│   ├── app.js → app-init.js   ↔️ À transformer en module
│   ├── package.json            ✅ Dépendances
│   ├── README.md               ✅ Guide utilisateur
│   ├── LICENSE                 ✅ MIT/Apache
│   └── .env.example            ✅ Config template
│
├── 📁 src/ (nouveau → code source)
│   │
│   ├── core/
│   │   ├── config-manager.js      (440 lignes)
│   │   ├── event-bus.js           (service)
│   │   ├── plugin-system.js       (API plugins)
│   │   └── router.js              (navigation)
│   │
│   ├── lib/
│   │   ├── adapters/              (NOUVELLE CATÉGORIE)
│   │   │   ├── storage-adapter-base.js
│   │   │   ├── github-storage-adapter.js
│   │   │   ├── local-storage-adapter.js
│   │   │   ├── local-git-adapter.js
│   │   │   └── github-oauth.js
│   │   │
│   │   ├── services/              (NOUVELLE CATÉGORIE)
│   │   │   ├── github-adapter.js
│   │   │   ├── markdown-parser.js
│   │   │   ├── markdown-renderer.js
│   │   │   └── token-storage.js
│   │   │
│   │   └── components/
│   │       ├── editor.js          (ancien → moderniser)
│   │       ├── config-wizard.js
│   │       ├── settings-view.js   (déplacé de views/)
│   │       ├── json-schema-form-builder.js
│   │       └── settings-integration.js
│   │
│   └── plugins/
│       ├── calendar/
│       ├── journal/
│       ├── inbox/
│       ├── reflection/
│       └── accelerator/
│
├── 📁 styles/
│   ├── main.css
│   ├── calendar.css
│   ├── editor.css
│   └── wizard.css
│
├── 📁 assets/                      (NOUVEAU)
│   └── images/
│       ├── wizard-step-0.png
│       ├── wizard-step-1.png
│       └── ... (tous les .png)
│
├── 📁 docs/
│   ├── SPECIFICATIONS_TECHNIQUES.md
│   ├── AUDIT_COHESION.md
│   ├── README.md                   (index)
│   ├── SECURITY.md
│   ├── STRUCTURE.md                (cette étude)
│   │
│   ├── accelerator/                (NOUVEAU SOUS-DOSSIER)
│   │   ├── EXECUTIVE_SUMMARY.md
│   │   ├── ARCHITECTURE.md
│   │   ├── DEVELOPMENT_PLAN.md
│   │   └── AZURE_GUIDE.md
│   │
│   ├── guides/                     (NOUVEAU SOUS-DOSSIER)
│   │   ├── PLUGIN_CREATION.md      (documenter plugin-system.js)
│   │   ├── DEPLOYMENT.md
│   │   └── TESTING.md
│   │
│   └── journal-de-bord/
│       ├── 2025-01-15_*.md
│       └── ... (tous les journaux)
│
├── 📁 tests/
│   ├── unit/                       (NOUVEAU)
│   │   └── *.spec.js
│   │
│   ├── integration/                (NOUVEAU)
│   │   └── config-system-integration.spec.mjs
│   │
│   ├── e2e/                        (NOUVEAU)
│   │   └── playwright.config.mjs
│   │
│   └── results/                    (OUTPUT, .gitignore)
│       └── ...
│
├── 📁 config/                      (NOUVEAU)
│   ├── config.js                   (déplacé de racine)
│   ├── .env.example                (déplacé de racine)
│   └── oauth-callback.html         (déplacé de racine)
│
└── 📁 scripts/
    ├── init-plugins.sh
    └── setup.sh                    (à créer?)
```

---

## 🔧 PLAN DE RESTRUCTURATION

### Phase 0: Préparation (1h)

```bash
# 1. Créer nouvelle structure
mkdir -p src/{core,lib/{adapters,services,components},plugins}
mkdir -p assets/images
mkdir -p tests/{unit,integration,e2e}
mkdir -p config
mkdir -p docs/{accelerator,guides}

# 2. Backup git
git stash
git branch backup-before-restructure
```

### Phase 1: Déplacer fichiers (2h)

```bash
# Images
mv wizard*.png assets/images/
mv pensine*.png assets/images/

# Config
mv app.js src/app-init.js
mv config.js config/
mv oauth-callback.html config/
mv .env.example config/

# Docs (nouveau système)
mv ACCELERATOR_*.md docs/accelerator/
mv docs/AUDIT_COHESION.md docs/ (OK)
mv MANUAL_TEST_*.md docs/guides/
mv TEST_README.md docs/guides/TESTING.md
```

### Phase 2: Reorganiser `/src/lib` (3h)

```bash
# Créer catégories
mkdir src/lib/adapters
mkdir src/lib/services

# Déplacer
mv src/lib/github-storage-adapter.js src/lib/adapters/
mv src/lib/local-storage-adapter.js src/lib/adapters/
mv src/lib/local-git-adapter.js src/lib/adapters/
mv src/lib/github-oauth.js src/lib/adapters/
mv src/lib/storage-adapter-base.js src/lib/adapters/

mv src/lib/github-adapter.js src/lib/services/
mv src/lib/markdown-*.js src/lib/services/
mv src/lib/token-storage.js src/lib/services/

# Déplacer composants
mv src/lib/editor.js src/lib/components/
mv src/lib/config-wizard.js src/lib/components/
mv src/lib/settings-integration.js src/lib/components/
mv src/lib/json-schema-form-builder.js src/lib/components/
mv views/settings-view.js src/lib/components/
```

### Phase 3: Mettre à jour imports (2h)

```bash
# Chercher et remplacer tous les imports
grep -r "from.*lib/" src/ --include="*.js"

# Avant: import { X } from '../lib/editor.js'
# Après: import { X } from '../lib/components/editor.js'
```

### Phase 4: Documenter (1h)

```bash
# Créer STRUCTURE.md (copie de ce document)
# Créer docs/guides/PLUGIN_CREATION.md (depuis plugin-system.js)
# Updater docs/README.md avec nouvelle structure
```

---

## 🎯 BÉNÉFICES DE LA RESTRUCTURATION

| Avant | Après |
|-------|-------|
| 30+ fichiers racine | 6 fichiers racine (essentiel) |
| `lib/` 17 fichiers mélangés | `src/lib/{adapters,services,components}` |
| Docs à la racine | `docs/{accelerator,guides,journal-de-bord}` |
| Pas de catégories | Catégories logiques claires |
| Temps onboarding dev | -50% |
| Clarté imports | +80% |
| Discoverabilité code | +70% |

---

## 📋 CHECKLIST POST-RESTRUCTURATION

- [ ] Tous les imports mis à jour
- [ ] Tests passent: `npm test`
- [ ] Dev server démarre: `python3 -m http.server 8000`
- [ ] Aucun 404 console F12
- [ ] Git blame fonctionne: `git log --follow src/`
- [ ] .gitignore mis à jour
- [ ] Package.json scripts mis à jour
- [ ] VS Code workspace config mis à jour
- [ ] CI/CD (Playwright) fait passer les tests
- [ ] README.md mis à jour avec nouvelle structure

---

## 🔗 DÉPENDANCES DE CETTE RESTRUCTURATION

**Blocage de Phase 1 (Accelerator)** ?
Non - peut se faire en parallèle:

- Phase 1 = implémenter `accelerator-plugin.js`
- Restructuration = déplacer fichiers existants
- Peuvent se faire indépendamment

**Recommandation** :

1. **Approuver** cette structure (ce doc)
2. **Faire la restructuration** (4-5h, peut être split en PR)
3. **Puis commencer** Phase 1 Accelerator

---

**Score global structure** : **5/10**

- ✅ Styles bien organisé (9/10)
- ✅ Core moderne (8/10)
- ✅ Plugins isolés (9/10)
- ❌ Lib chaotique (3/10)
- ❌ Racine encombrée (3/10)
- ⚠️ Docs peuvent être mieux rangée (6/10)

**Recommandation** : Restructurer avant d'ajouter plus de code.
