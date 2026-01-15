# GitHub Copilot Instructions - Pensine Web

## 🎯 Vue d'ensemble du projet

**Pensine Web** est une application web de gestion de notes et journaux utilisant GitHub comme backend de stockage. L'application est entièrement client-side (vanilla JavaScript) et s'exécute dans le navigateur.

### Architecture

- **Type** : Single Page Application (SPA)
- **Stack** : Vanilla JavaScript ES6+, pas de framework
- **Backend** : GitHub REST API v3 (pour stockage)
- **Style** : CSS pur, pas de préprocesseur
- **CDN** : MarkdownIt, markdown-it-anchor, highlight.js

## 📚 Documentation technique

Avant toute modification, consulter :

1. [`docs/SPECIFICATIONS_TECHNIQUES.md`](docs/SPECIFICATIONS_TECHNIQUES.md) - Architecture complète (1735+ lignes)
2. [`docs/SCENARIOS_DE_TEST.md`](docs/SCENARIOS_DE_TEST.md) - 70+ scénarios de test
3. [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md) - Validation pré-commit (6-8 min)
4. [`docs/journal-de-bord/`](docs/journal-de-bord/) - Historique des décisions techniques

## ⚠️ Règles critiques (NE JAMAIS VIOLER)

### 1. Classes CSS `.hidden`

```javascript
// ❌ INTERDIT sur les éléments d'éditeur
element.classList.add("hidden"); // CSS: display: none !important;

// ✅ CORRECT - Utiliser data-mode
editorContainer.setAttribute("data-mode", "code"); // CSS gère la visibilité
```

**Raison** : `.hidden` a `!important` qui écrase tout. Utiliser les attributs `[data-mode]` à la place.

### 2. Layout header éditeur

```css
/* ✅ CORRECT */
.editor-header {
  justify-content: space-between; /* Pas flex-end ! */
}
```

**Raison** : `flex-end` fait disparaître les boutons de gauche. `space-between` préserve l'espace pour les modes view.

### 3. Validation syntaxe avant commit

```bash
# ✅ TOUJOURS exécuter avant git commit
node -c app.js
node -c lib/*.js
```

**Raison** : Prévient les régressions de syntaxe qui bloquent l'app entière.

### 4. Sécurité des credentials

```javascript
// ❌ JAMAIS de tokens hardcodés
window.PENSINE_INITIAL_TOKEN = "ghp_...";

// ✅ CORRECT - Wizard uniquement, localStorage seulement
// Token fourni par l'utilisateur via config wizard
```

**Raison** : Repo public, tokens exposés = faille de sécurité critique.

### 5. Préservation types JSON

```javascript
// ✅ CORRECT - Rebuild avec types préservés
const value =
  input.type === "checkbox"
    ? input.checked
    : input.type === "number"
    ? parseFloat(input.value)
    : input.value;
```

**Raison** : Formulaire convertit tout en string. Reconstruire avec types originaux.

### 6. Event listeners avec guards

```javascript
// ❌ INTERDIT
form.addEventListener('submit', ...); // Si form n'existe pas → crash

// ✅ CORRECT
if (form) {
  form.addEventListener('submit', ...);
}
```

**Raison** : Éléments optionnels, vérifier existence avant attachment.

## 🔧 Patterns de code à suivre

### Structure des modules

```javascript
class ComponentName {
  constructor(dependencies) {
    this.dep = dependencies;
    this.init();
  }

  init() {
    // Initialisation avec guards
  }

  async methodName() {
    try {
      // Logique
    } catch (error) {
      console.error("Context:", error);
      throw error; // Ou gérer gracefully
    }
  }
}
```

### Gestion des promesses

```javascript
// ✅ CORRECT - Async/await avec try-catch
async function loadData() {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Load failed:", error);
    // Fallback ou propagation
  }
}
```

### Manipulation DOM

```javascript
// ✅ CORRECT - Vérifier existence
const element = document.getElementById("my-element");
if (!element) {
  console.warn("Element not found");
  return;
}
element.textContent = "Value";
```

## 📁 Structure des fichiers

```
pensine-web/
├── index.html              # Point d'entrée
├── app.js                  # Orchestration principale (PensineApp class)
├── config.js               # Config par défaut (VIDE de credentials)
├── lib/
│   ├── config-wizard.js    # Assistant configuration
│   ├── github-adapter.js   # API GitHub
│   ├── storage-manager.js  # localStorage/IndexedDB
│   ├── editor.js           # Éditeur unifié
│   ├── markdown-parser.js  # Parsing Markdown
│   └── markdown-renderer.js # Rendu HTML
├── styles/
│   ├── main.css            # Styles globaux
│   ├── calendar.css        # Calendrier
│   ├── editor.css          # Éditeur
│   └── wizard.css          # Wizard config
└── docs/                   # Documentation technique
    ├── SPECIFICATIONS_TECHNIQUES.md
    ├── SCENARIOS_DE_TEST.md
    ├── TESTING_CHECKLIST.md
    └── journal-de-bord/
```

## 🔄 Workflow de développement

### Avant de coder

1. Lire [`docs/SPECIFICATIONS_TECHNIQUES.md`](docs/SPECIFICATIONS_TECHNIQUES.md) section concernée
2. Chercher dans [`docs/journal-de-bord/`](docs/journal-de-bord/) si le sujet a déjà été traité
3. Vérifier les scénarios de test existants dans [`docs/SCENARIOS_DE_TEST.md`](docs/SCENARIOS_DE_TEST.md)

### Pendant le développement

1. Suivre les patterns établis (voir ci-dessus)
2. Respecter les règles critiques (voir section ⚠️)
3. Tester localement avec `python3 -m http.server 8000`

### Avant de commiter

1. Exécuter [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md) (6-8 min)

   ```bash
   # Validation syntaxe
   node -c app.js
   node -c lib/*.js

   # Recherche credentials
   grep -r "ghp_" --include="*.js" --include="*.json"

   # Test rapide
   python3 -m http.server 8000 &
   firefox http://localhost:8000
   ```

2. Si régression détectée → consulter journal de bord pour contexte

### Après changement significatif

1. Mettre à jour [`docs/SPECIFICATIONS_TECHNIQUES.md`](docs/SPECIFICATIONS_TECHNIQUES.md) si architecture modifiée
2. Ajouter scénarios de test dans [`docs/SCENARIOS_DE_TEST.md`](docs/SCENARIOS_DE_TEST.md)
3. Documenter dans [`docs/journal-de-bord/`](docs/journal-de-bord/) (voir template)

## 🐛 Debugging

### App bloquée sur loading

1. Ouvrir DevTools Console (F12)
2. Chercher erreurs JavaScript (souvent syntaxe ou références undefined)
3. Vérifier `node -c app.js` pour syntaxe
4. Consulter [`docs/journal-de-bord/2025-12-14_securite-et-separation-repos.md`](docs/journal-de-bord/2025-12-14_securite-et-separation-repos.md) (problème #4)

### Éditeur vide ou invisible

1. Vérifier classe `.hidden` sur `#editor-rich-view` ou `#editor-code-view`
2. Inspecter attribut `[data-mode]` sur `#editor-container`
3. Console : `document.getElementById('editor-container').dataset.mode`
4. Voir [`docs/journal-de-bord/2025-12-14_securite-et-separation-repos.md`](docs/journal-de-bord/2025-12-14_securite-et-separation-repos.md) (problème #2)

### Configuration ne charge pas

1. Vérifier localStorage : `localStorage.getItem('pensine-settings')`
2. Ordre de priorité : localStorage → GitHub API → Wizard
3. Voir [`docs/journal-de-bord/2025-12-14_securite-et-separation-repos.md`](docs/journal-de-bord/2025-12-14_securite-et-separation-repos.md) (problème #1)

## 🔐 Sécurité

### Tokens GitHub

- **Utilisateur fournit via wizard** (première visite)
- **Stocké dans localStorage uniquement** (pas de commit)
- **Jamais dans le code source** (ni config.js, ni tests)
- **Variables d'environnement pour tests** : voir [`TEST_README.md`](TEST_README.md)

### Audit régulier

```bash
# Recherche tous tokens potentiels
grep -r "ghp_" --include="*.js" --include="*.json" .

# Résultat attendu : 0 token réel (seulement placeholders)
```

### GitHub Push Protection

- Activé sur le repo (détecte tokens automatiquement)
- Si push bloqué → redact token du commit, amend, re-push

## 🧪 Tests

### Tests manuels rapides

Voir [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md) - 27 items, 6-8 min

### Tests Playwright

```bash
export GITHUB_TEST_TOKEN="votre_token"
export GITHUB_TEST_OWNER="votre_username"
export GITHUB_TEST_REPO="votre_repo"
npx playwright test
```

Voir [`TEST_README.md`](TEST_README.md) pour détails

### Tests de régression critiques

1. **App loading** : Pas de spinner infini
2. **Config editor** : Formulaire s'affiche en mode riche
3. **View modes** : 3 boutons (</>, 👁️, ⬌) fonctionnent
4. **Calendar** : Clic sur jour ouvre journal

## 💡 Philosophie du projet

### Design decisions

- **Vanilla JS** : Pas de framework, maintenabilité simple
- **Client-side only** : Aucun serveur backend
- **GitHub as backend** : Données de l'utilisateur restent chez lui
- **Privacy-first** : Aucune télémétrie, aucun tracking
- **Offline-capable** : localStorage cache pour performance

### Anti-patterns à éviter

1. ❌ Ajouter des dépendances npm (rester vanilla)
2. ❌ Créer un build step (direct browser execution)
3. ❌ Complexifier l'architecture (keep it simple)
4. ❌ Stocker données côté serveur (GitHub only)
5. ❌ Ignorer la documentation (prévient régressions)

## 📞 Ressources

### Documentation interne

- [`README.md`](README.md) - Guide utilisateur
- [`docs/README.md`](docs/README.md) - Index documentation
- [`docs/VISION.md`](docs/VISION.md) - Vision "3e Hémisphère" et roadmap
- [`docs/PANINI_INTEGRATION_STRATEGY.md`](docs/PANINI_INTEGRATION_STRATEGY.md) - Écosystème Panini
- [`docs/SPECIFICATIONS_TECHNIQUES.md`](docs/SPECIFICATIONS_TECHNIQUES.md) - Architecture
- [`docs/journal-de-bord/`](docs/journal-de-bord/) - Historique technique

### APIs utilisées

- [GitHub REST API v3](https://docs.github.com/en/rest)
- [MarkdownIt](https://github.com/markdown-it/markdown-it)
- [Highlight.js](https://highlightjs.org/)

### Patterns JavaScript

- ES6+ Classes
- Async/await (pas de callbacks)
- Module pattern (IIFE si besoin d'encapsulation)
- Event-driven architecture

## 🎓 Pour les nouveaux contributeurs

1. Lire [`README.md`](README.md) pour comprendre l'usage
2. Parcourir [`docs/SPECIFICATIONS_TECHNIQUES.md`](docs/SPECIFICATIONS_TECHNIQUES.md) pour l'architecture
3. Lire [`docs/journal-de-bord/`](docs/journal-de-bord/) pour comprendre les décisions
4. Suivre [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md) avant chaque commit
5. Documenter vos sessions dans le journal de bord

**Principe** : Chaque ligne de code doit être compréhensible dans 6 mois par quelqu'un qui n'a jamais vu le projet.

## 🚀 Quick Start pour développer

```bash
# Clone
git clone https://github.com/stephanedenis/pensine-web.git
cd pensine-web

# Ouvrir dans VSCode
code pensine-web.code-workspace

# Lancer serveur
python3 -m http.server 8000

# Ouvrir navigateur
firefox http://localhost:8000

# Avant commit
node -c app.js && grep -r "ghp_" . --include="*.js"
```

---

**Version** : v0.0.22
**Dernière mise à jour** : 2025-12-14
**Mainteneur** : Stéphane Denis (@stephanedenis)
