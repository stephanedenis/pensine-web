#!/bin/bash

# Script de création des plugins comme submodules Git
# Usage: ./scripts/init-plugins.sh

set -e

echo "🔌 Initialisation des plugins Pensine comme submodules Git"
echo "============================================================"
echo ""

# Configuration
GITHUB_USER="stephanedenis"
PLUGINS=("calendar" "inbox" "journal" "reflection")

echo "📋 Plugins à créer:"
for plugin in "${PLUGINS[@]}"; do
  echo "  - pensine-plugin-${plugin}"
done
echo ""

# Vérifier si gh CLI est installé
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) n'est pas installé"
  echo "   Installation: https://cli.github.com/"
  exit 1
fi

# Vérifier authentification
if ! gh auth status &> /dev/null; then
  echo "❌ Vous devez vous authentifier avec GitHub CLI"
  echo "   Exécutez: gh auth login"
  exit 1
fi

echo "✅ GitHub CLI authentifié"
echo ""

# Étape 1: Créer les repos GitHub
echo "📦 Étape 1/4: Création des repositories GitHub"
echo "---------------------------------------------"
for plugin in "${PLUGINS[@]}"; do
  repo_name="pensine-plugin-${plugin}"
  
  # Vérifier si le repo existe déjà
  if gh repo view "${GITHUB_USER}/${repo_name}" &> /dev/null; then
    echo "⚠️  Repository ${repo_name} existe déjà, skip"
  else
    echo "✨ Création de ${repo_name}..."
    gh repo create "${GITHUB_USER}/${repo_name}" \
      --public \
      --description "Plugin ${plugin^} pour Pensine - 3e hémisphère du cerveau" \
      --add-readme
    
    # Ajouter topics
    gh repo edit "${GITHUB_USER}/${repo_name}" \
      --add-topic "pensine" \
      --add-topic "pensine-plugin" \
      --add-topic "knowledge-management" \
      --add-topic "time-management"
    
    echo "✅ ${repo_name} créé"
  fi
done
echo ""

# Étape 2: Initialiser les plugins localement
echo "🏗️  Étape 2/4: Initialisation locale des plugins"
echo "----------------------------------------------"
for plugin in "${PLUGINS[@]}"; do
  plugin_dir="plugins/pensine-plugin-${plugin}"
  
  if [ -d "${plugin_dir}" ]; then
    echo "⚠️  ${plugin_dir} existe déjà, skip"
    continue
  fi
  
  echo "📁 Création de ${plugin_dir}..."
  mkdir -p "${plugin_dir}"/{views,components,adapters,styles}
  
  cd "${plugin_dir}"
  
  # Init git
  git init
  git branch -M main
  
  # plugin.json
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

  # Main plugin file
  cat > "${plugin}-plugin.js" << 'EOF'
/**
 * PLUGIN_NAME Plugin for Pensine
 */

class PLUGIN_CLASS {
  constructor(manifest, context) {
    this.manifest = manifest;
    this.context = context;
    console.log(`🔌 ${manifest.name} v${manifest.version} loaded`);
  }

  /**
   * Enable plugin
   */
  async enable() {
    console.log(`✅ ${this.manifest.name} enabled`);
    
    // Register routes
    // this.registerRoutes();
    
    // Listen to events
    // this.setupEventListeners();
  }

  /**
   * Disable plugin
   */
  async disable() {
    console.log(`🔌 ${this.manifest.name} disabled`);
  }
}

export default PLUGIN_CLASS;
EOF

  # Replace placeholders
  sed -i "s/PLUGIN_NAME/${plugin^}/g" "${plugin}-plugin.js"
  sed -i "s/PLUGIN_CLASS/${plugin^}Plugin/g" "${plugin}-plugin.js"
  
  # README.md
  cat > README.md << EOF
# Pensine Plugin - ${plugin^}

Plugin ${plugin^} pour [Pensine](https://github.com/${GITHUB_USER}/pensine-web) - 3e hémisphère du cerveau.

## 🎯 Fonctionnalités

- TODO: Liste des fonctionnalités

## 📦 Installation

Ce plugin est inclus par défaut dans Pensine. Pour l'utiliser dans un autre projet:

\`\`\`bash
git submodule add git@github.com:${GITHUB_USER}/pensine-plugin-${plugin}.git plugins/pensine-plugin-${plugin}
\`\`\`

## 🚀 Utilisation

\`\`\`javascript
import ${plugin^}Plugin from './plugins/pensine-plugin-${plugin}/${plugin}-plugin.js';

// Enregistrer le plugin
await pluginSystem.register(${plugin^}Plugin, manifest);
\`\`\`

## 🔧 Développement

\`\`\`bash
# Clone
git clone git@github.com:${GITHUB_USER}/pensine-plugin-${plugin}.git
cd pensine-plugin-${plugin}

# Développer
# ... modifications ...

# Commit & push
git add .
git commit -m "feat: Add feature"
git push
\`\`\`

## 📚 Documentation

Voir [docs/](docs/) pour la documentation complète.

## 🤝 Contributing

Les contributions sont bienvenues! Voir [CONTRIBUTING.md](../../CONTRIBUTING.md).

## 📄 License

MIT © Stéphane Denis
EOF

  # .gitignore
  cat > .gitignore << EOF
node_modules/
.DS_Store
*.log
.env
EOF

  # Initial commit
  git add .
  git commit -m "chore: Initial plugin structure"
  
  # Ajouter remote
  git remote add origin "git@github.com:${GITHUB_USER}/pensine-plugin-${plugin}.git"
  
  echo "✅ ${plugin} initialisé localement"
  
  cd ../..
done
echo ""

# Étape 3: Push les plugins
echo "⬆️  Étape 3/4: Push des plugins vers GitHub"
echo "----------------------------------------"
for plugin in "${PLUGINS[@]}"; do
  plugin_dir="plugins/pensine-plugin-${plugin}"
  
  cd "${plugin_dir}"
  
  echo "📤 Push de pensine-plugin-${plugin}..."
  if git push -u origin main 2>/dev/null; then
    echo "✅ pensine-plugin-${plugin} pushed"
  else
    echo "⚠️  Push failed (peut-être déjà fait?)"
  fi
  
  cd ../..
done
echo ""

# Étape 4: Ajouter comme submodules dans pensine-web
echo "🔗 Étape 4/4: Ajout des submodules dans pensine-web"
echo "-------------------------------------------------"

# Retirer dossiers locaux (seront remplacés par submodules)
echo "🗑️  Suppression des dossiers locaux..."
rm -rf plugins/*

# Ajouter submodules
for plugin in "${PLUGINS[@]}"; do
  echo "🔗 Ajout submodule pensine-plugin-${plugin}..."
  git submodule add \
    "git@github.com:${GITHUB_USER}/pensine-plugin-${plugin}.git" \
    "plugins/pensine-plugin-${plugin}"
done

# Commit
echo "💾 Commit de la configuration submodules..."
git add .gitmodules plugins/
git commit -m "feat: Add plugin submodules (calendar, inbox, journal, reflection)

- Calendar: Timeline, monthly, weekly views
- Inbox: Quick capture, triage, tasks
- Journal: Daily entries, reviews, insights
- Reflection: Permanent notes, backlinks, graph"

echo ""
echo "✅ Tous les plugins sont configurés comme submodules!"
echo ""
echo "📝 Prochaines étapes:"
echo "  1. git push origin main"
echo "  2. Développer chaque plugin"
echo "  3. Migrer composant calendar existant → plugin calendar"
echo ""
