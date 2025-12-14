# Contributing to Pensine Web

Merci de votre intérêt pour contribuer à Pensine Web ! Ce document vous guide à travers le processus.

## 📋 Table des matières

- [Code of Conduct](#code-of-conduct)
- [Comment contribuer](#comment-contribuer)
- [Workflow de développement](#workflow-de-développement)
- [Standards de code](#standards-de-code)
- [Tests](#tests)
- [Documentation](#documentation)

## Code of Conduct

Ce projet adhère à un code de conduite. En participant, vous vous engagez à maintenir un environnement respectueux et inclusif.

## Comment contribuer

### Rapporter des bugs

Utilisez les GitHub Issues avec le template suivant (voir [`docs/SCENARIOS_DE_TEST.md`](docs/SCENARIOS_DE_TEST.md)) :

```markdown
**Description** : [Description claire du bug]

**Reproduction** :
1. Étape 1
2. Étape 2
3. Résultat observé

**Attendu** : [Comportement attendu]

**Environnement** :
- OS : [Linux/Windows/Mac]
- Navigateur : [Firefox/Chrome/Safari + version]
- Version app : [v0.0.X]

**Logs console** : [Copier erreurs F12]

**Screenshots** : [Si applicable]
```

### Proposer des features

1. Ouvrir une Issue décrivant :
   - Le problème que ça résout
   - La solution proposée
   - Les alternatives considérées
2. Attendre feedback avant d'implémenter
3. Respecter la philosophie "vanilla JS, client-side only"

### Soumettre des Pull Requests

1. Fork le projet
2. Créer une branche : `git checkout -b feature/ma-feature`
3. Développer en suivant les standards (voir ci-dessous)
4. Tester avec la checklist : [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md)
5. Commit : `git commit -m "feat: Description claire"`
6. Push : `git push origin feature/ma-feature`
7. Ouvrir une Pull Request

## Workflow de développement

### Setup initial

```bash
# Clone
git clone https://github.com/stephanedenis/pensine-web.git
cd pensine-web

# Ouvrir workspace
code pensine-web.code-workspace

# Extensions recommandées (VSCode les proposera)
# - GitHub Copilot
# - ESLint
# - Prettier
# - Markdown All in One
# - Playwright
# - Live Server
```

### Développement local

```bash
# Lancer serveur
python3 -m http.server 8000

# Ouvrir navigateur
firefox http://localhost:8000

# Configurer l'app (premier lancement)
# 1. Le wizard s'affiche
# 2. Entrer votre token GitHub (https://github.com/settings/tokens)
# 3. Configurer owner/repo/branch
```

### Avant chaque commit

**Checklist obligatoire** (6-8 min) - [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md) :

```bash
# 1. Validation syntaxe
node -c app.js
node -c lib/*.js

# 2. Recherche credentials (doit retourner 0 token réel)
grep -r "ghp_" --include="*.js" --include="*.json" .

# 3. Tests manuels rapides
# - App se charge (pas de spinner infini)
# - Calendrier s'affiche
# - Clic sur jour ouvre journal
# - Éditeur fonctionne (3 modes : </>, 👁️, ⬌)
# - Config ouvre et affiche formulaire
# - Sauvegarde fonctionne

# 4. Si tests OK → commit
git add -A
git commit -m "type: description"
```

### Types de commits

- `feat:` Nouvelle fonctionnalité
- `fix:` Correction de bug
- `docs:` Documentation uniquement
- `style:` Formatage (pas de changement logique)
- `refactor:` Refactoring (pas de changement fonctionnel)
- `test:` Ajout/modification tests
- `chore:` Tâches diverses (build, config, etc.)

## Standards de code

### JavaScript

```javascript
// ✅ Style à suivre

// 1. Classes avec constructeur
class MyComponent {
  constructor(dependencies) {
    this.dep = dependencies;
  }

  async methodName() {
    try {
      // Logique avec guards
      if (!this.dep) return;
      
      const result = await this.fetchData();
      return result;
    } catch (error) {
      console.error('Context:', error);
      throw error;
    }
  }
}

// 2. Fonctions avec guards
function processData(data) {
  if (!data) {
    console.warn('No data provided');
    return null;
  }
  
  // Traitement
  return result;
}

// 3. Event listeners avec vérification
const button = document.getElementById('my-button');
if (button) {
  button.addEventListener('click', handleClick);
}
```

### CSS

```css
/* ✅ Style à suivre */

/* 1. Commentaires de section */
/* =================================
   Section Name
   ================================= */

/* 2. Sélecteurs spécifiques */
.component-name {
  /* Props alphabétiques */
  display: flex;
  flex-direction: column;
  margin: 0;
}

/* 3. États avec attributs data */
[data-mode="code"] .code-view {
  display: block;
}

[data-mode="rich"] .rich-view {
  display: block;
}
```

### Markdown

```markdown
<!-- ✅ Style à suivre -->

# Titre niveau 1

Description claire et concise.

## Section

### Sous-section

- Liste à puces
  - Sous-item
- Item 2

**Gras** pour emphase, `code` pour références techniques.

\`\`\`javascript
// Blocs de code avec langue spécifiée
const example = 'value';
\`\`\`
```

## Tests

### Tests manuels

Suivre [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md) :
- 27 items de validation
- 4 tests de régression critiques
- Temps : 6-8 minutes

### Tests automatisés (Playwright)

```bash
# Config
export GITHUB_TEST_TOKEN="votre_token"
export GITHUB_TEST_OWNER="votre_username"
export GITHUB_TEST_REPO="votre_repo"

# Exécution
npx playwright test

# Debug
npx playwright test --debug
```

Voir [`TEST_README.md`](TEST_README.md) pour détails.

### Écrire des tests

Ajouter scénarios dans [`docs/SCENARIOS_DE_TEST.md`](docs/SCENARIOS_DE_TEST.md) :

```markdown
#### T11 : [Titre du test]

**Préconditions** :
- État initial requis

**Étapes** :
1. Action 1
2. Action 2
3. Vérification

**Résultat attendu** :
- Comportement exact attendu

**Données de test** :
- Valeurs spécifiques utilisées
```

## Documentation

### Où documenter quoi

1. **Code inline** : Pourquoi (pas quoi, le code le montre déjà)
2. **README.md** : Guide utilisateur, quick start
3. **docs/SPECIFICATIONS_TECHNIQUES.md** : Architecture, composants, flows
4. **docs/SCENARIOS_DE_TEST.md** : Cas de test détaillés
5. **docs/journal-de-bord/** : Décisions techniques, contexte historique

### Documenter une session de développement

Créer `docs/journal-de-bord/YYYY-MM-DD_sujet.md` avec :

```markdown
# Session du YYYY-MM-DD : [Titre]

**Version de départ** : vX.X.X
**Version finale** : vX.X.X
**Durée** : ~Xh

## Objectifs
- [ ] Objectif 1
- [ ] Objectif 2

## Problèmes rencontrés
### Problème #1 : [Titre]
**Cause** : Explication
**Solution** : Code ou approche
**Commit** : [hash]

## Décisions techniques
1. **[Sujet]** : Décision prise et justification

## Leçons apprises
- Règle critique identifiée
- Anti-pattern évité

## État final
- Commits : [liste]
- Fonctionnalités : [statut]
```

Voir [`docs/journal-de-bord/2025-12-14_securite-et-separation-repos.md`](docs/journal-de-bord/2025-12-14_securite-et-separation-repos.md) comme exemple.

## Règles critiques

⚠️ **À NE JAMAIS FAIRE** :

1. **Classe `.hidden` sur éditeur** : Utiliser `[data-mode]` à la place
2. **Tokens dans le code** : Jamais de credentials hardcodés
3. **Commit sans validation** : Toujours `node -c` avant commit
4. **Ignorer la documentation** : Lire specs avant de modifier
5. **Ajouter dépendances npm** : Rester vanilla JS

Voir [`.github/copilot-instructions.md`](.github/copilot-instructions.md) pour détails.

## Architecture du projet

### Vue d'ensemble

```
Client Browser
    ↓
index.html → app.js (PensineApp)
    ↓
    ├─→ config-wizard.js (première config)
    ├─→ github-adapter.js (API GitHub)
    ├─→ storage-manager.js (localStorage cache)
    ├─→ editor.js (éditeur unifié 3 modes)
    └─→ markdown-*.js (parsing & rendering)
    ↓
GitHub REST API v3 (user's repo)
```

### Composants clés

Voir [`docs/SPECIFICATIONS_TECHNIQUES.md`](docs/SPECIFICATIONS_TECHNIQUES.md) sections :
- 2.1 PensineApp (orchestration)
- 2.2 GitHubAdapter (API)
- 2.3 StorageManager (cache)
- 2.4 Editor (UI principale)
- 2.5+ Autres composants

## Ressources

### Documentation interne
- [README.md](README.md) - Guide utilisateur
- [docs/README.md](docs/README.md) - Index documentation
- [docs/SPECIFICATIONS_TECHNIQUES.md](docs/SPECIFICATIONS_TECHNIQUES.md) - Architecture (1735+ lignes)
- [docs/SCENARIOS_DE_TEST.md](docs/SCENARIOS_DE_TEST.md) - 70+ scénarios
- [docs/TESTING_CHECKLIST.md](docs/TESTING_CHECKLIST.md) - Checklist pré-commit
- [docs/journal-de-bord/](docs/journal-de-bord/) - Historique technique

### APIs externes
- [GitHub REST API v3](https://docs.github.com/en/rest)
- [MarkdownIt](https://markdown-it.github.io/)
- [Highlight.js](https://highlightjs.org/)

### Outils
- [Playwright](https://playwright.dev/) - Tests E2E
- [VSCode](https://code.visualstudio.com/) - Éditeur recommandé
- [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) - Dev server

## Questions ?

- **Bugs** : [GitHub Issues](https://github.com/stephanedenis/pensine-web/issues)
- **Discussions** : [GitHub Discussions](https://github.com/stephanedenis/pensine-web/discussions)
- **Contact** : [@stephanedenis](https://github.com/stephanedenis)

---

**Merci de contribuer à Pensine Web !** 🎉
