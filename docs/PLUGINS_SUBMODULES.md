# Structure Plugins avec Git Submodules

## 🎯 Architecture

Chaque plugin est un **repository Git indépendant**, ajouté comme submodule dans `pensine-web/plugins/`.

### Avantages

- 🔄 Versioning indépendant par plugin
- 👥 Développement communautaire facilité
- 🔧 Réutilisation entre projets
- 🎯 CI/CD par plugin
- 📦 NPM publishing possible

## 📦 Plugins Prévus

### Axe Temps

1. **pensine-plugin-calendar** - Gestion calendrier (timeline, mois, semaine)
2. **pensine-plugin-inbox** - Flux entrants & tâches
3. **pensine-plugin-journal** - Journal quotidien
4. **pensine-plugin-reflection** - Notes permanentes & graph

### Axe Santé (futur)

1. **pensine-plugin-health** - Suivi santé & métriques
2. **pensine-plugin-fitness** - Activité physique
3. **pensine-plugin-nutrition** - Alimentation

### Axe Buts (futur)

1. **pensine-plugin-goals** - Objectifs & progression
2. **pensine-plugin-habits** - Habitudes & routines

### Intégrations (futur)

1. **pensine-plugin-google-calendar** - Sync Google Calendar
2. **pensine-plugin-outlook** - Sync Outlook
3. **pensine-plugin-github** - Intégration GitHub (issues, PRs)
4. **pensine-plugin-weather** - Météo contextuelle
5. **pensine-plugin-rss** - Flux RSS

## 🚀 Setup Initial

### 1. Créer repositories GitHub

Pour chaque plugin principal (4 premiers pour commencer):

```bash
# Sur GitHub (via web ou gh CLI)
gh repo create stephanedenis/pensine-plugin-calendar --public --description "Plugin Calendrier pour Pensine"
gh repo create stephanedenis/pensine-plugin-inbox --public --description "Plugin Inbox & Tâches pour Pensine"
gh repo create stephanedenis/pensine-plugin-journal --public --description "Plugin Journal pour Pensine"
gh repo create stephanedenis/pensine-plugin-reflection --public --description "Plugin Réflexions pour Pensine"
```

### 2. Créer structure locale et initialiser

```bash
cd /home/stephane/GitHub/pensine-web

# Créer dossier plugins
mkdir -p plugins

# Initialiser chaque plugin localement
for plugin in calendar inbox journal reflection; do
  mkdir -p "plugins/pensine-plugin-${plugin}"
  cd "plugins/pensine-plugin-${plugin}"

  # Init git
  git init

  # Créer structure de base
  mkdir -p {views,components,adapters,styles}

  # Créer fichiers de base
  cat > plugin.json << 'EOF'
{
  "id": "PLUGIN_NAME",
  "name": "PLUGIN_DISPLAY_NAME",
  "version": "0.1.0",
  "description": "",
  "author": "Stéphane Denis",
  "license": "MIT",
  "main": "PLUGIN_NAME-plugin.js",
  "dependencies": {
    "pensine-core": ">=1.0.0"
  },
  "permissions": [],
  "config": {},
  "routes": []
}
EOF

  # README
  cat > README.md << 'EOF'
# Pensine Plugin - PLUGIN_NAME

## Installation

Ce plugin fait partie de l'écosystème Pensine.

## Développement

\`\`\`bash
npm install
npm test
\`\`\`

## License

MIT
EOF

  # .gitignore
  cat > .gitignore << 'EOF'
node_modules/
.DS_Store
*.log
EOF

  # Initial commit
  git add .
  git commit -m "chore: Initial plugin structure"

  # Ajouter remote
  git remote add origin "git@github.com:stephanedenis/pensine-plugin-${plugin}.git"

  cd ../..
done
```

### 3. Ajouter comme submodules dans pensine-web

```bash
cd /home/stephane/GitHub/pensine-web

# Retirer dossiers créés localement (seront remplacés par submodules)
rm -rf plugins/*

# Ajouter submodules
git submodule add git@github.com:stephanedenis/pensine-plugin-calendar.git plugins/pensine-plugin-calendar
git submodule add git@github.com:stephanedenis/pensine-plugin-inbox.git plugins/pensine-plugin-inbox
git submodule add git@github.com:stephanedenis/pensine-plugin-journal.git plugins/pensine-plugin-journal
git submodule add git@github.com:stephanedenis/pensine-plugin-reflection.git plugins/pensine-plugin-reflection

# Commit submodules config
git add .gitmodules plugins/
git commit -m "feat: Add plugin submodules (calendar, inbox, journal, reflection)"
```

### 4. Push initial plugins

```bash
# Pour chaque plugin
for plugin in calendar inbox journal reflection; do
  cd "plugins/pensine-plugin-${plugin}"
  git push -u origin main
  cd ../..
done

# Push pensine-web
git push origin main
```

## 🔄 Workflow Développement

### Cloner pensine-web avec plugins

```bash
# Clone avec submodules
git clone --recurse-submodules git@github.com:stephanedenis/pensine-web.git

# Ou si déjà cloné sans submodules
cd pensine-web
git submodule update --init --recursive
```

### Mettre à jour un plugin

```bash
cd plugins/pensine-plugin-calendar

# Développer
# ... modifications ...

# Commit & push dans le plugin
git add .
git commit -m "feat: Add monthly view"
git push

# Retour au repo principal
cd ../..

# Mettre à jour référence submodule
git add plugins/pensine-plugin-calendar
git commit -m "chore: Update calendar plugin to latest"
git push
```

### Mettre à jour tous les plugins

```bash
# Depuis pensine-web root
git submodule update --remote --merge

# Commit nouvelles références
git add plugins/
git commit -m "chore: Update all plugins to latest"
git push
```

### Développer sur une branche

```bash
cd plugins/pensine-plugin-calendar

# Créer branche feature
git checkout -b feature/add-weekly-view

# Développer, commit
git add .
git commit -m "feat: Add weekly calendar view"

# Push branch
git push -u origin feature/add-weekly-view

# PR sur GitHub puis merge
# ...

# Retour main et update
git checkout main
git pull

# Update dans pensine-web
cd ../..
git add plugins/pensine-plugin-calendar
git commit -m "chore: Update calendar to v0.2.0 (weekly view)"
```

## 📁 Structure Finale

```
pensine-web/
├── .gitmodules                    # Config submodules
├── core/
│   ├── event-bus.js
│   ├── plugin-system.js
│   └── router.js
├── plugins/                       # Dossier submodules
│   ├── pensine-plugin-calendar/   # Submodule Git
│   │   ├── .git/                  # Repo indépendant
│   │   ├── plugin.json
│   │   ├── calendar-plugin.js
│   │   ├── views/
│   │   ├── components/
│   │   └── styles/
│   ├── pensine-plugin-inbox/      # Submodule Git
│   ├── pensine-plugin-journal/    # Submodule Git
│   └── pensine-plugin-reflection/ # Submodule Git
└── ...
```

## 🔒 Permissions & Accès

### Repository Settings

Pour chaque plugin repo:

1. **Visibility**: Public (contribution communautaire)
2. **Branch Protection**: `main` branch
   - Require PR reviews (1 reviewer)
   - Require status checks
   - No force push
3. **Topics GitHub**: `pensine`, `pensine-plugin`, `knowledge-management`
4. **License**: MIT
5. **Issues**: Enabled
6. **Discussions**: Enabled (pour chaque plugin)

### CI/CD

Chaque plugin peut avoir son propre workflow:

```yaml
# .github/workflows/test.yml dans chaque plugin
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run lint
```

## 🎯 Avantages Architecture Submodules

### Pour le Développement

- ✅ Version control indépendant
- ✅ Branches/tags par plugin
- ✅ Release notes séparées
- ✅ Tests unitaires isolés

### Pour la Communauté

- ✅ Fork plugin spécifique
- ✅ PR ciblées
- ✅ Issues par plugin
- ✅ Contributeurs spécialisés

### Pour la Réutilisation

- ✅ Import plugin dans autre projet
- ✅ NPM publish possible
- ✅ Dépendances versionnées
- ✅ Documentation dédiée

### Pour la Maintenance

- ✅ Hotfix rapide sur un plugin
- ✅ Rollback sans affecter autres
- ✅ Migration progressive
- ✅ Deprecation gérée

## 📊 Versioning

Chaque plugin suit **Semantic Versioning**:

- `MAJOR.MINOR.PATCH`
- `0.1.0` → Initial release
- `0.2.0` → Add feature (backward compatible)
- `0.2.1` → Bugfix
- `1.0.0` → Stable API

### Compatibility Matrix

| pensine-core | calendar | inbox | journal | reflection |
|--------------|----------|-------|---------|------------|
| 1.0.x        | 0.1.x    | 0.1.x | 0.1.x   | 0.1.x      |
| 1.1.x        | 0.2.x    | 0.2.x | 0.1.x   | 0.1.x      |
| 2.0.x        | 1.0.x    | 1.0.x | 1.0.x   | 1.0.x      |

## 🚀 Next Steps

1. ✅ Créer 4 repos GitHub pour plugins principaux
2. ✅ Initialiser structure locale
3. ✅ Ajouter comme submodules
4. ✅ Migrer composant calendar existant → plugin
5. ✅ Implémenter inbox plugin
6. ✅ Implémenter journal plugin
7. ✅ Implémenter reflection plugin
8. ✅ Documentation API chaque plugin
9. ✅ Tests unitaires
10. ✅ Release v0.1.0 pour chaque

---

**Note**: Cette structure permet extensibilité maximale tout en gardant contrôle qualité centralisé via pensine-web.
