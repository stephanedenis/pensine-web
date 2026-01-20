#!/bin/bash
# Script pour lancer les tests Playwright avec les variables d'environnement

# Charger les variables depuis .env si le fichier existe
if [ -f .env ]; then
    echo "📋 Chargement des variables depuis .env..."
    export $(grep -v '^#' .env | xargs)
    echo "✅ Variables chargées"
else
    echo "⚠️  Fichier .env non trouvé"
    echo "Copiez .env.example vers .env et ajoutez votre token GitHub"
    exit 1
fi

# Vérifier que les variables requises sont définies
if [ -z "$GITHUB_TEST_TOKEN" ]; then
    echo "❌ GITHUB_TEST_TOKEN n'est pas défini dans .env"
    exit 1
fi

echo ""
echo "🧪 Configuration des tests:"
echo "  - Owner: ${GITHUB_TEST_OWNER}"
echo "  - Repo: ${GITHUB_TEST_REPO}"
echo "  - Token: ${GITHUB_TEST_TOKEN:0:20}..."
echo ""

# Lancer les tests
echo "🚀 Lancement des tests Playwright..."
npx playwright test "$@"
