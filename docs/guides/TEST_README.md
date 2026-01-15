# Instructions pour les tests Playwright

## Configuration des credentials

Pour exécuter les tests, vous devez définir les variables d'environnement suivantes:

```bash
export GITHUB_TEST_TOKEN="votre_token_github"
export GITHUB_TEST_OWNER="votre_username"
export GITHUB_TEST_REPO="votre_repo"
```

Ou créez un fichier `.env` dans `pensine-web/` (ignoré par git):

```
GITHUB_TEST_TOKEN=ghp_votre_token_ici
GITHUB_TEST_OWNER=votre_username
GITHUB_TEST_REPO=votre_repo
```

## Exécution des tests

```bash
cd pensine-web
npx playwright test
```

⚠️ **IMPORTANT**: Ne commitez JAMAIS vos tokens dans le code source!
