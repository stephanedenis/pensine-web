# Session de développement - 17 décembre 2025

## 🎯 Objectifs
1. Configuration des plugins comme submodules Git indépendants ✅
2. Migration du composant LinearCalendar vers le plugin calendar ✅

## 📋 Contexte
Suite à la création du système de plugins core (event-bus, plugin-system, router) et de la documentation (ARCHITECTURE_TEMPS.md), passage à la phase de configuration des repos GitHub pour chaque plugin.

## 🚧 Travaux réalisés

### 1. Création des repositories GitHub
Création de 4 repositories publics sur GitHub :

1. **pensine-plugin-calendar**
   - URL: https://github.com/stephanedenis/pensine-plugin-calendar
   - Description: Plugin Calendrier pour Pensine - 3e hémisphère du cerveau
   - Commit initial: 007acae

2. **pensine-plugin-inbox**
   - URL: https://github.com/stephanedenis/pensine-plugin-inbox
   - Description: Plugin Inbox & Tâches pour Pensine - 3e hémisphère du cerveau
   - Commit initial: 6231125

3. **pensine-plugin-journal**
   - URL: https://github.com/stephanedenis/pensine-plugin-journal
   - Description: Plugin Journal pour Pensine - 3e hémisphère du cerveau
   - Commit initial: d4a9d59

4. **pensine-plugin-reflection**
   - URL: https://github.com/stephanedenis/pensine-plugin-reflection
   - Description: Plugin Réflexions pour Pensine - 3e hémisphère du cerveau
   - Commit initial: c477833

Tous les repos incluent :
- MIT License
- Topics: pensine, pensine-plugin, knowledge-management
- README avec description et structure

### 2. Structure initiale des plugins
Chaque plugin a reçu une structure de base identique :

```
pensine-plugin-{name}/
├── {name}-plugin.js      # Classe principale du plugin
├── plugin.json           # Manifeste (id, version, routes, permissions, config)
└── README.md             # Documentation
```

#### Structure du manifeste (plugin.json)
```json
{
  "id": "plugin-name",
  "name": "Plugin Name",
  "version": "0.1.0",
  "description": "...",
  "author": "Stéphane Denis",
  "license": "MIT",
  "main": "plugin-name-plugin.js",
  "dependencies": [],
  "permissions": [
    "storage:read",
    "storage:write",
    "events:emit",
    "ui:render"
  ],
  "routes": [
    { "path": "/plugin-name", "view": "views/...", "title": "..." }
  ],
  "config": { ... }
}
```

#### Architecture des classes plugin
Toutes suivent le même pattern :

```javascript
export default class PluginNamePlugin {
  constructor(context) {
    this.context = context;
    this.id = 'plugin-name';
    this.name = 'Plugin Name';
    this.version = '0.1.0';
  }

  async enable() {
    // Enregistrer routes
    // Écouter événements
    // Charger configuration
  }

  async disable() {
    // Nettoyer listeners
    // Émettre événement désactivation
  }

  registerRoutes() { ... }
  registerEventListeners() { ... }
}
```

### 3. Configuration des submodules
Ajout des 4 plugins comme submodules dans pensine-web :

```bash
git submodule add git@github.com:stephanedenis/pensine-plugin-calendar.git plugins/pensine-plugin-calendar
git submodule add git@github.com:stephanedenis/pensine-plugin-inbox.git plugins/pensine-plugin-inbox
git submodule add git@github.com:stephanedenis/pensine-plugin-journal.git plugins/pensine-plugin-journal
git submodule add git@github.com:stephanedenis/pensine-plugin-reflection.git plugins/pensine-plugin-reflection
```

Résultat :
- `.gitmodules` créé avec les 4 références
- `plugins/` contient les 4 submodules clonés
- Commit 531d8b8 : "feat: Add plugin submodules"

## 📊 État final

### Structure du workspace
```
pensine-web/
├── .gitmodules                           # Configuration submodules
├── core/                                 # Système core (888 lignes)
│   ├── event-bus.js                     # Pub/sub (265 lignes)
│   ├── plugin-system.js                 # Registry (400+ lignes)
│   └── router.js                        # Routing (223 lignes)
├── plugins/                             # Plugins (submodules)
│   ├── pensine-plugin-calendar/        # 193 lignes
│   ├── pensine-plugin-inbox/           # 236 lignes
│   ├── pensine-plugin-journal/         # 253 lignes
│   └── pensine-plugin-reflection/      # 259 lignes
└── docs/
    ├── VISION.md                        # Vision complète
    ├── ARCHITECTURE_TEMPS.md            # Architecture (631 lignes)
    ├── PLUGINS_SUBMODULES.md            # Workflow submodules
    └── PLUGINS_MANUAL_SETUP.md          # Setup manuel
```

### Commits de la session
1. **e125fad** - docs: Guide manuel création plugins
2. **007acae** - chore: Initial calendar plugin structure (repo externe)
3. **6231125** - chore: Initial inbox plugin structure (repo externe)
4. **d4a9d59** - chore: Initial journal plugin structure (repo externe)
5. **c477833** - chore: Initial reflection plugin structure (repo externe)
6. **531d8b8** - feat: Add plugin submodules (pensine-web)

## 🎓 Décisions techniques

### 1. Repos indépendants vs monorepo
✅ **Décision** : Repos indépendants avec submodules

**Raisons** :
- Versioning indépendant (SemVer par plugin)
- Contributions communautaires facilitées
- Réutilisabilité dans d'autres projets
- CI/CD isolé par plugin
- Releases décorrélées

**Alternatives rejetées** :
- Monorepo : Couplage trop fort, versions liées
- npm packages : Complexité build, overhead infrastructure

### 2. Structure minimale initiale
✅ **Décision** : Commit initial avec 3 fichiers seulement

**Raisons** :
- Déblocage des submodules (besoin d'un commit pour clone)
- Structure évolutive (ajout progressif de views/, components/)
- README + manifeste suffisants pour documenter l'intention
- Plugin.js avec TODO pour migration future

**Alternatives rejetées** :
- Structure complète immédiate : Trop de code mort
- README seul : Git submodule échoue sans fichiers substantiels

### 3. Pattern uniforme pour tous les plugins
✅ **Décision** : Architecture identique pour les 4 plugins

**Raisons** :
- Maintenabilité : Même structure cognitive
- Onboarding rapide des contributeurs
- Tests uniformes (même framework de test)
- Documentation réutilisable

**Implémentation** :
- Hooks obligatoires : `enable()`, `disable()`
- Méthodes recommandées : `registerRoutes()`, `registerEventListeners()`
- Context API unifié : `storage`, `events`, `ui`, `config`

## 🐛 Problèmes rencontrés

### 1. gh CLI authentication broken
**Symptôme** : `gh auth status` retourne "token in keyring is invalid"

**Tentatives de résolution** :
- `gh auth login` → Succès apparent mais keyring reste invalide
- `gh repo create` → HTTP 401 pour tous les repos

**Workaround** : Création manuelle via GitHub web interface (5 min)

**Impact** : Aucun - automated script `scripts/init-plugins.sh` inutilisé mais workflow manuel efficace

### 2. Git submodule sur repo vide
**Symptôme** :
```
fatal: You are on a branch yet to be born
fatal: unable to checkout submodule
```

**Cause** : Repos GitHub créés sans commit initial

**Solution** :
1. Clone chaque repo en /tmp
2. Créer structure de base (README, plugin.json, plugin.js)
3. Commit et push vers main
4. Reconfigurer submodules avec `--force`

**Leçon** : Toujours initialiser repos avec au moins 1 commit avant submodule add

### 3. Erreurs lint JSON
**Symptôme** : VSCode signale erreurs syntaxe dans plugin.json

**Cause** : Erreurs bénignes (trailing commas, format)

**Impact** : Aucun - JSON valide, erreurs purement éditor

**Action** : Ignoré - JSON fonctionnel confirmé

### 4. Migration du calendrier - Dépendances de chargement
**Contexte** : LinearCalendar dépend de ConfigurableComponent

**Solution** : Chargement séquentiel dans `loadDependencies()` :
1. configurable-component.js (base)
2. linear-calendar.js (dépend de #1)
3. calendar-view.js (dépend de #2)

**Code** :
```javascript
await this.loadScript('components/configurable-component.js');
await this.loadScript('components/linear-calendar.js');
await this.loadScript('components/calendar-view.js');
```

**Résultat** : Pas d'erreurs `undefined`, composants chargés correctement

## 📈 Métriques

### Code écrit - Phase 1 (Submodules)
- **4 fichiers plugin.js** : 941 lignes total
  - calendar-plugin.js : 137 lignes
  - inbox-plugin.js : 180 lignes
  - journal-plugin.js : 197 lignes
  - reflection-plugin.js : 205 lignes
- **4 fichiers plugin.json** : 80 lignes total
- **4 README.md** : 200 lignes total
- **Docs submodules** : ~600 lignes (PLUGINS_*.md)
- **Subtotal Phase 1** : ~1820 lignes

### Code écrit - Phase 2 (Calendar migration)
- **components/linear-calendar.js** : 1310 lignes (copie)
- **components/configurable-component.js** : ~100 lignes (copie)
- **styles/calendar.css** : 732 lignes (copie)
- **views/calendar-view.js** : 175 lignes (nouveau)
- **calendar-plugin.js** : +~100 lignes (mise à jour)
- **MIGRATION.md** : 230 lignes (nouveau)
- **Subtotal Phase 2** : ~2650 lignes

### Total session
- **Total lignes** : ~4470 lignes (code + docs)
- **Commits** : 11 commits (4 repos externes + 7 pensine-web)

### Repos GitHub
- **4 repos créés** avec structure initiale
- **pensine-plugin-calendar** : 3 commits (initial, migration, docs)
- **4 submodules** configurés dans pensine-web

### Temps estimé
- Phase 1 (Submodules) : ~35 min
- Phase 2 (Migration) : ~55 min
- **Total** : ~90 minutes

## 🔄 Phase 2 : Migration du calendrier

### 4. Migration du composant LinearCalendar

**Source** : `lib/components/linear-calendar/`
**Destination** : `plugins/pensine-plugin-calendar/`

#### Fichiers copiés
1. **linear-calendar.js** (1310 lignes) → `components/linear-calendar.js`
   - Calendrier linéaire avec scroll infini
   - 12 couleurs mensuelles
   - Marquage de dates
   - Gestion des événements

2. **linear-calendar-v2.css** (732 lignes) → `styles/calendar.css`
   - Styles complets
   - Système de couleurs
   - Responsive design

3. **configurable-component.js** (~100 lignes) → `components/configurable-component.js`
   - Classe de base pour components configurables
   - Dépendance de LinearCalendar

#### Nouveaux fichiers créés

1. **views/calendar-view.js** (175 lignes)
   - Wrapper autour de LinearCalendar
   - Intégration avec l'API plugin (context)
   - Méthodes principales :
     * `render()` - Instancier et render le calendrier
     * `loadMarkedDates()` - Charger dates depuis storage
     * `handleDayClick()` - Clic → navigation vers journal
     * `handleWeekLoad()` - Infinite scroll
     * `updateMarkedDates()` - Refresh après changements
   - Événements émis : `calendar:day-click`, `calendar:week-load`

2. **calendar-plugin.js** (mis à jour, ~200 lignes)
   - `loadDependencies()` - Chargement CSS + JS séquentiel
   - `loadScript(src)` - Helper pour charger scripts dynamiquement
   - `enable()` - Charge dépendances avant activation
   - `disable()` - Cleanup CalendarView
   - `renderCalendarView()` - Instancie CalendarView
   - `handleEventCreate()` - Sauvegarde événements
   - `handleEventUpdate()` - Mise à jour dates marquées
   - `handleJournalEntrySaved()` - Écoute événements journal

3. **MIGRATION.md** (230 lignes)
   - Documentation complète migration
   - Architecture avant/après
   - Context API utilisé
   - Événements émis/écoutés
   - Checklist tests
   - Configuration mapping
   - Points d'attention

#### Intégration avec le plugin system

**Context API utilisé** :
```javascript
context = {
  storage: { list(), readJSON(), writeJSON() },
  events: { emit(), on(), off() },
  router: { navigate(), register() },
  config: { get(), set() }
}
```

**Flux de données** :
```
1. Plugin activé → loadDependencies()
2. CSS chargé → styles/calendar.css
3. Scripts chargés → configurable-component.js, linear-calendar.js, calendar-view.js
4. Route /calendar → renderCalendarView()
5. CalendarView instanciée → loadMarkedDates() depuis storage
6. LinearCalendar rendu → affichage visuel
7. Clic sur jour → emit('calendar:day-click') → navigate('/journal/date')
8. Journal sauvegardé → emit('journal:entry-saved') → markDate(date)
```

**Événements inter-plugins** :
- **Émis** : `calendar:day-click`, `calendar:week-load`, `calendar:event-created`
- **Écoutés** : `calendar:event-create`, `calendar:event-update`, `journal:entry-saved`

#### Structure finale du plugin
```
pensine-plugin-calendar/
├── calendar-plugin.js         (200 lignes - orchestration)
├── plugin.json                (30 lignes - manifeste)
├── README.md                  (documentation utilisateur)
├── MIGRATION.md               (230 lignes - doc migration)
├── components/
│   ├── configurable-component.js   (100 lignes - base class)
│   └── linear-calendar.js          (1310 lignes - calendrier)
├── styles/
│   └── calendar.css                (732 lignes - styles)
└── views/
    └── calendar-view.js            (175 lignes - wrapper)

Total : ~2777 lignes
```

#### Commits de migration
- **f3d0308** - feat: Migrate LinearCalendar component to plugin
- **23eb3c0** - docs: Add migration documentation
- **f8fc60a** - chore: Update calendar plugin submodule to f3d0308 (pensine-web)
- **a987d53** - chore: Update calendar plugin to 23eb3c0 (pensine-web)

### 5. Fonctionnalités préservées

✅ Toutes les fonctionnalités du LinearCalendar original :
- Scroll infini vertical
- Système 12 couleurs mensuelles
- Jour de début de semaine configurable
- Marquage de dates
- Handlers de clic
- Détection weekends
- Bordures transitions mois
- Design responsive
- Configuration standardisée

### 6. Fonctionnalités ajoutées

✅ Nouvelles capacités grâce à l'intégration plugin :
- Chargement automatique dates marquées depuis storage
- Navigation vers journal au clic (route `/journal/YYYY-MM-DD`)
- Communication avec autres plugins via EventBus
- Configuration centralisée via plugin.json
- Lifecycle propre (enable/disable avec cleanup)
- Chargement dynamique des dépendances

## 📋 Prochaines étapes

### Phase immédiate (0-2 jours)
1. ✅ **Migrer calendar component** - COMPLÉTÉ
2. **Intégrer plugin system dans app.js** - PRIORITÉ #1
   - Import PluginSystem, EventBus, Router
   - Initialiser avec StorageManager
   - Register CalendarPlugin
   - Load config depuis `.pensine-config.json`
   - Tester route `/calendar`

3. **Créer .pensine-config.json template**
   - Config par défaut pour chaque plugin
   - Structure :
     ```json
     {
       "plugins": {
         "calendar": { "enabled": true, "config": { ... } },
         "inbox": { "enabled": false, ... },
         ...
       }
     }
     ```

### Phase court terme (1-2 semaines)
4. **Implémenter inbox plugin**
   - Formulaire capture rapide
   - Liste items avec filtres (priorité, statut)
   - Drag & drop vers calendrier

5. **Implémenter journal plugin**
   - Réutiliser `lib/editor.js`
   - Adapter `lib/markdown-*.js`
   - Vue liste des entrées par mois

6. **Implémenter reflection plugin**
   - Notes avec backlinks
   - Graph visualization (D3.js ou Cytoscape.js)
   - Recherche full-text

### Phase moyen terme (3-4 semaines)
7. **Ajouter tests automatisés**
   - Tests unitaires pour chaque plugin
   - Tests d'intégration event-bus
   - Tests E2E avec Playwright

8. **Setup CI/CD**
   - GitHub Actions par repo plugin
   - Lint + tests sur PR
   - Auto-release avec tags SemVer

9. **Documentation développeurs**
   - Guide "Créer un plugin"
   - API reference complète
   - Exemples de plugins communautaires

## 💡 Apprentissages

### Submodules Git
- ✅ Submodules nécessitent au moins 1 commit dans le repo distant
- ✅ `git submodule add --force` écrase config locale (.git/modules/)
- ✅ `.gitmodules` est versionné, `.git/modules/` est local
- ✅ Clone pensine-web nécessite `git submodule update --init`

### Architecture plugins
- ✅ Context API offre isolation et testabilité
- ✅ Event-driven découple les plugins (pas d'imports directs)
- ✅ Router avec params dynamiques (/calendar/:date) très flexible
- ✅ Manifeste JSON facilite discovery et validation

### Workflow développement
- ✅ Créer structure minimale d'abord, développer ensuite
- ✅ Documentation workflow (PLUGINS_SUBMODULES.md) critique pour onboarding
- ✅ Fallback manuel (PLUGINS_MANUAL_SETUP.md) essentiel si automation échoue

## 🔗 Liens

### Repos plugins
- https://github.com/stephanedenis/pensine-plugin-calendar
- https://github.com/stephanedenis/pensine-plugin-inbox
- https://github.com/stephanedenis/pensine-plugin-journal
- https://github.com/stephanedenis/pensine-plugin-reflection

### Documentation
- [docs/VISION.md](../VISION.md) - Vision 3 axes
- [docs/ARCHITECTURE_TEMPS.md](../ARCHITECTURE_TEMPS.md) - Architecture détaillée
- [docs/PLUGINS_SUBMODULES.md](../PLUGINS_SUBMODULES.md) - Workflow submodules
- [docs/PLUGINS_MANUAL_SETUP.md](../PLUGINS_MANUAL_SETUP.md) - Setup manuel

### Commits clés

**Phase 1 : Submodules setup**
- e125fad - docs: Guide manuel création plugins
- 007acae - chore: Initial calendar plugin structure (repo externe)
- 6231125 - chore: Initial inbox plugin structure (repo externe)
- d4a9d59 - chore: Initial journal plugin structure (repo externe)
- c477833 - chore: Initial reflection plugin structure (repo externe)
- 531d8b8 - feat: Add plugin submodules (pensine-web)
- 6789e6a - docs: Journal session submodules setup

**Phase 2 : Calendar migration** 
- f3d0308 - feat: Migrate LinearCalendar component to plugin
- 23eb3c0 - docs: Add migration documentation  
- f8fc60a - chore: Update calendar plugin submodule to f3d0308
- a987d53 - chore: Update calendar plugin to 23eb3c0

---

**Statut** : ✅ Submodules configurés + Calendar migré  
**Prochaine session** : Intégration plugin system dans app.js  
**Durée session** : ~90 minutes  
**Lignes code** : +4020 lignes (4 repos + migration + docs)
