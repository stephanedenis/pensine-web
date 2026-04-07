# Instructions pour les tests Playwright

## 🔐 Configuration des credentials

### Méthode 1 : Fichier .env (recommandée)

1. **Copiez le fichier exemple** :

   ```bash
   cp .env.example .env
   ```

2. **Éditez `.env`** et ajoutez votre token GitHub :

   ```bash
   GITHUB_TEST_TOKEN=github_pat_11ACNELFY0...  # Votre token PAT
   GITHUB_TEST_OWNER=stephanedenis
   GITHUB_TEST_REPO=pensine-notes
   GITHUB_TEST_BRANCH=main
   ```

3. **Générer un nouveau token GitHub** (si nécessaire) :
   - Allez sur <https://github.com/settings/tokens>
   - Cliquez "Generate new token (classic)"
   - Sélectionnez au minimum le scope `repo` (full control)
   - Copiez le token généré

### Méthode 2 : Variables d'environnement inline

```bash
export GITHUB_TEST_TOKEN="github_pat_11ACNELFY0..."
export GITHUB_TEST_OWNER="stephanedenis"
export GITHUB_TEST_REPO="pensine-notes"
```

## 🧪 Exécution des tests

### Avec le script helper (charge automatiquement .env)

```bash
./scripts/test-with-env.sh
```

### Ou manuellement avec npx

```bash
cd pensine-web
source .env  # Charger les variables
npx playwright test
```

### Tests spécifiques

```bash
# Test wizard uniquement
./scripts/test-with-env.sh tests/wizard-real-token-test.spec.mjs

# Test config system
./scripts/test-with-env.sh tests/config-system-integration.spec.mjs
```

## ⚠️ Sécurité

- ✅ Le fichier `.env` est dans `.gitignore` (ne sera jamais commité)
- ✅ Utilisez toujours des variables d'environnement pour les credentials
- ❌ **JAMAIS** de tokens hardcodés dans le code source
- 🔒 GitHub Push Protection détectera et bloquera les tokens exposés

## 🔍 Vérification du token

Pour tester si votre token est valide :

```bash
curl -s -H "Authorization: Bearer $GITHUB_TEST_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     https://api.github.com/user | jq '.login'
```

Devrait afficher votre nom d'utilisateur GitHub.

## 📦 Tests disponibles

| Fichier                              | Description                      | Requiert token      |
| ------------------------------------ | -------------------------------- | ------------------- |
| `wizard-real-token-test.spec.mjs`    | Validation token dans wizard     | ✅ Oui              |
| `config-system-integration.spec.mjs` | Système de configuration moderne | ❌ Non (mode local) |
| `calendar-real-test.spec.mjs`        | Tests calendrier avec GitHub     | ✅ Oui              |
| `e2e/config-persistence.spec.mjs`    | Persistance configuration        | ✅ Oui              |
