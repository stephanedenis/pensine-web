#!/bin/bash
# Script d'installation de Microsoft Edge pour OpenSUSE Tumbleweed
# À exécuter avec : bash scripts/install-edge-opensuse.sh

set -e

echo "📦 Installation de Microsoft Edge sur OpenSUSE Tumbleweed"
echo ""

# Vérifier si on a les permissions sudo
if ! sudo -v; then
    echo "❌ Ce script nécessite les permissions sudo"
    exit 1
fi

echo "✅ Permissions sudo vérifiées"
echo ""

# 1. Importer la clé GPG Microsoft
echo "🔑 Importation de la clé GPG Microsoft..."
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc

# 2. Ajouter le dépôt Edge (si pas déjà présent)
echo "📝 Ajout du dépôt Microsoft Edge..."
if ! zypper lr | grep -q "microsoft-edge"; then
    sudo zypper addrepo https://packages.microsoft.com/yumrepos/edge microsoft-edge
else
    echo "   ℹ️  Dépôt déjà présent"
fi

# 3. Installer Edge
echo "📦 Installation de Microsoft Edge..."
sudo zypper refresh
sudo zypper install -y microsoft-edge-stable

# 4. Vérifier l'installation
echo ""
echo "🔍 Vérification de l'installation..."
if which microsoft-edge-stable > /dev/null 2>&1; then
    EDGE_VERSION=$(microsoft-edge-stable --version)
    echo "✅ Edge installé : $EDGE_VERSION"
else
    echo "❌ Edge non trouvé après installation"
    exit 1
fi

# 5. Installer les binaires Playwright pour Edge
echo ""
echo "🎭 Installation des binaires Playwright pour Edge..."
cd "$(dirname "$0")/.."
npx playwright install msedge

echo ""
echo "✅ Installation terminée !"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Remettre la config Playwright à msedge"
echo "   2. Lancer les tests : npx playwright test --project=msedge"
echo ""
