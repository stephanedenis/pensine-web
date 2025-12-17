# Guide Manuel - Création Plugins Submodules

## ⚠️ Prérequis

Le script automatique nécessite GitHub CLI (`gh`). Si vous ne l'avez pas:

### Option 1: Installation GitHub CLI (Recommandé)

```bash
# Installation GitHub CLI
# Voir: https://cli.github.com/
# Linux (Debian/Ubuntu)
sudo apt install gh

# macOS
brew install gh

# Authentification
gh auth login
# Suivre les instructions (sélectionner SSH, authorize)

# Puis relancer
./scripts/init-plugins.sh
```

### Option 2: Création Manuelle

Si vous préférez créer manuellement:

## 📦 Étape 1: Créer les repos GitHub

Via l'interface web GitHub:

1. **pensine-plugin-calendar**
   - Description: "Plugin Calendrier pour Pensine - 3e hémisphère du cerveau"
   - Public
   - Topics: `pensine`, `pensine-plugin`, `knowledge-management`, `time-management`
   - Initialize with README

2. **pensine-plugin-inbox**
   - Description: "Plugin Inbox & Tâches pour Pensine - 3e hémisphère du cerveau"
   - Public
   - Topics: `pensine`, `pensine-plugin`, `task-management`
   - Initialize with README

3. **pensine-plugin-journal**
   - Description: "Plugin Journal pour Pensine - 3e hémisphère du cerveau"
   - Public
   - Topics: `pensine`, `pensine-plugin`, `journaling`
   - Initialize with README

4. **pensine-plugin-reflection**
   - Description: "Plugin Réflexions pour Pensine - 3e hémisphère du cerveau"
   - Public
   - Topics: `pensine`, `pensine-plugin`, `zettelkasten`, `knowledge-graph`
   - Initialize with README

## 🏗️ Étape 2: Créer structure locale

```bash
cd /home/stephane/GitHub/pensine-web

# Pour chaque plugin
for plugin in calendar inbox journal reflection; do
  mkdir -p "plugins/pensine-plugin-${plugin}"/{views,components,adapters,styles}
  
  cd "plugins/pensine-plugin-${plugin}"
  
  # Clone le repo vide
  git clone "git@github.com:stephanedenis/pensine-plugin-${plugin}.git" .
  
  # Créer plugin.json
  cat > plugin.json << EOF
{
  "id": "${plugin}",
  "name": "Pensine ${plugin^}",
  "version": "0.1.0",
  "description": "Plugin ${plugin^} pour Pensine",
  "author": "Stéphane Denis",
  "license": "MIT",
  "main": "${plugin}-plugin.js",
  "dependencies": {
    "pensine-core": ">=1.0.0"
  },
  "permissions": [
    "storage.read",
    "storage.write"
  ],
  "config": {},
  "routes": []
}
EOF

  # Créer fichier principal
  touch "${plugin}-plugin.js"
  
  # Créer .gitignore
  cat > .gitignore << EOF
node_modules/
.DS_Store
*.log
.env
EOF

  # Commit initial
  git add .
  git commit -m "chore: Initial plugin structure"
  git push origin main
  
  cd ../..
done
```

## 🔗 Étape 3: Ajouter comme submodules

```bash
cd /home/stephane/GitHub/pensine-web

# Supprimer dossiers locaux
rm -rf plugins/*

# Ajouter submodules
git submodule add git@github.com:stephanedenis/pensine-plugin-calendar.git plugins/pensine-plugin-calendar
git submodule add git@github.com:stephanedenis/pensine-plugin-inbox.git plugins/pensine-plugin-inbox
git submodule add git@github.com:stephanedenis/pensine-plugin-journal.git plugins/pensine-plugin-journal
git submodule add git@github.com:stephanedenis/pensine-plugin-reflection.git plugins/pensine-plugin-reflection

# Commit submodules
git add .gitmodules plugins/
git commit -m "feat: Add plugin submodules (calendar, inbox, journal, reflection)"
git push origin main
```

## ✅ Vérification

```bash
# Lister submodules
git submodule status

# Devrait afficher:
# xxxxxx plugins/pensine-plugin-calendar (heads/main)
# xxxxxx plugins/pensine-plugin-inbox (heads/main)
# xxxxxx plugins/pensine-plugin-journal (heads/main)
# xxxxxx plugins/pensine-plugin-reflection (heads/main)

# Vérifier structure
ls -la plugins/
```

## 🚀 Prochaines Étapes

Après setup des submodules:

1. **Migrer composant calendar existant** → `pensine-plugin-calendar`
2. **Implémenter plugin inbox** (capture, triage, tasks)
3. **Implémenter plugin journal** (daily entries, templates)
4. **Implémenter plugin reflection** (notes, backlinks, graph)

---

**Note**: Une fois les repos créés, relancez `./scripts/init-plugins.sh` pour l'init automatique.
