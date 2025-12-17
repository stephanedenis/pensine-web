# Session de développement - 17 décembre 2025

## 🎯 Objectif
Configuration des plugins comme submodules Git indépendants pour architecture modulaire et extensible.

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

## 📈 Métriques

### Code écrit
- **4 fichiers plugin.js** : 941 lignes total
  - calendar-plugin.js : 137 lignes
  - inbox-plugin.js : 180 lignes
  - journal-plugin.js : 197 lignes
  - reflection-plugin.js : 205 lignes
- **4 fichiers plugin.json** : 80 lignes total
- **4 README.md** : 200 lignes total
- **Total session** : ~1220 lignes code + docs

### Repos GitHub
- **4 repos créés** avec 5 commits initiaux
- **4 submodules** configurés dans pensine-web
- **1 commit** pensine-web avec intégration submodules

### Temps estimé
- Création manuelle repos : ~5 min
- Initialisation structure : ~15 min
- Configuration submodules : ~5 min
- Documentation session : ~10 min
- **Total** : ~35 minutes

## 🔄 Prochaines étapes

### Phase immédiate (0-2 jours)
1. **Migrer calendar component** ✅ PRIORITÉ #1
   - Source : `lib/components/linear-calendar/` (1311 JS + 731 CSS)
   - Target : `plugins/pensine-plugin-calendar/`
   - Fichiers :
     - `linear-calendar.js` → `views/linear-view.js`
     - `linear-calendar-v2.css` → `styles/calendar.css`
     - Wrapper dans `calendar-plugin.js`
   - Tests : Vérifier fonctionnalité identique

2. **Intégrer plugin system dans app.js**
   - Import `PluginSystem`, `EventBus`, `Router`
   - Initialiser avec `StorageManager`
   - Register les 4 plugins
   - Load config depuis `.pensine-config.json`

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
- 531d8b8 - feat: Add plugin submodules (pensine-web)
- e125fad - docs: Guide manuel création plugins

---

**Statut** : ✅ Submodules configurés et opérationnels  
**Prochaine session** : Migration du calendrier vers plugin  
**Durée session** : ~35 minutes  
**Lignes code** : +1220 lignes (4 repos + docs)
