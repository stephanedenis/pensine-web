# Session du 2025-12-14 : Sécurité et séparation des repos

**Durée** : ~3 heures  
**Version de départ** : v0.0.21-stable  
**Version finale** : v0.0.22  
**Contexte** : Restauration et amélioration de l'éditeur de configuration

---

## 📋 Objectifs de la session

1. Tester l'interface de configuration restaurée
2. Corriger les bugs trouvés
3. Améliorer l'UX de l'éditeur de config
4. Créer une documentation complète pour éviter les régressions
5. **[CRITIQUE]** Audit de sécurité et nettoyage des credentials

---

## 🔧 Problèmes rencontrés et solutions

### Problème #1 : Configuration 404 Not Found

**Symptôme** : Cliquer sur ⚙️ génère une erreur "Impossible d'ouvrir le fichier"

**Cause** : `openConfigFileInEditor()` ne chargeait que depuis GitHub API, pas localStorage

**Solution** :

```javascript
// Prioriser localStorage → GitHub → Wizard
const localSettings = localStorage.getItem('pensine-settings');
if (localSettings) {
    // Charger depuis localStorage
} else {
    // Fallback GitHub API
}
```

**Commit** : b34da91b6

---

### Problème #2 : Vue riche complètement blanche

**Symptôme** : Formulaire de config invisible en mode 👁️

**Cause racine** :

- `#editor-rich-view` avait la classe `.hidden` dans le HTML
- CSS `.hidden { display: none !important; }` écrasait tout

**Solution** :

1. Retirer `.hidden` du HTML
2. Laisser CSS `[data-mode="rich"]` gérer la visibilité
3. Forcer mode RICH pour FILE_TYPES.CONFIG

**Leçon** : ⚠️ Ne JAMAIS utiliser `.hidden` sur les éléments d'éditeur (règle critique)

**Commit** : b34da91b6

---

### Problème #3 : Boutons redondants dans le formulaire

**Symptôme** : Formulaire avait "💾 Save" et "< /> View Code" dupliquant le header

**Solution** :

1. Supprimer `<div class="config-actions">` du HTML généré
2. Implémenter synchronisation live :
   - `form.addEventListener('input')` → `updateConfigFromForm()`
   - `form.addEventListener('change')` → `updateConfigFromForm()`
3. Un seul bouton Save dans le header

**Bénéfice** : UX plus propre, synchronisation en temps réel form ↔ code

**Commit** : b69dc95de

---

### Problème #4 : Régression - App bloquée sur loading

**Symptôme** : Après suppression des boutons, page blanche avec spinner infini

**Cause** : Erreur de syntaxe JavaScript

```javascript
// Accolades manquantes dans renderConfigForm()
form.addEventListener('change', () => {
    this.updateConfigFromForm(config);
});
// ❌ Manque } } }, 100);
// ❌ Pas de return formHtml;
// ❌ Méthode updateConfigFromForm mal placée
```

**Diagnostic** : `node -c app.js` → `SyntaxError: Unexpected token '{'`

**Solution** :

```javascript
}); // close change listener
} // close if (form)
}, 100); // close setTimeout

return formHtml;
} catch (e) {
    return `<div class="error">Invalid JSON: ${e.message}</div>`;
}
} // close renderConfigForm

// Méthode séparée correctement
updateConfigFromForm(originalConfig) { ... }
```

**Leçon** : 🚨 Toujours valider avec `node -c` avant commit

**Commit** : 69237bff6

---

### Problème #5 : 🔴 CRITIQUE - Token GitHub exposé

**Découverte** : Suite à la question "est-ce qu'on a une clé ou autre identifiants dans le code?"

**Audit réalisé** :

```bash
grep -r "ghp_" --include="*.js" --include="*.json" --include="*.md"
```

**Résultat ALARMANT** :

- `pensine-web/config.js` ligne 15 : `window.PENSINE_INITIAL_TOKEN = 'ghp_***REDACTED***';`
- `pensine-web/test-playwright.js` ligne 97 : token hardcodé dans test
- `TESTS_EDITEUR_v0.0.19.md` : token dans documentation

**Risque** :

- ⚠️ Repo public sur GitHub
- ⚠️ Token avec accès complet (scope `repo`)
- ⚠️ N'importe qui peut cloner et obtenir le token
- ⚠️ Token dans l'historique git

**Actions correctives** :

1. ✅ Nettoyage code source :
   - `config.js` : `PENSINE_INITIAL_TOKEN = null`
   - `config.js` : `owner/repo` vidés
   - `test-playwright.js` : variables d'environnement
2. ✅ Protection future :
   - `.gitignore` : `.pensine-config.json`, `.env`, `*.secret`
   - `TEST_README.md` : instructions pour env vars
3. ⏳ Recommandations :
   - Révoquer token sur GitHub
   - Générer nouveau token (ne PAS committer)
   - Envisager nettoyage historique Git (BFG Repo-Cleaner)

**Commit** : 33e06598c

---

## 📚 Documentation créée

Pour prévenir les régressions futures :

### SPECIFICATIONS_TECHNIQUES.md (1735+ lignes)

- Architecture complète
- Interfaces de tous les composants
- Flows critiques avec diagrammes
- Règles critiques (`.hidden`, `space-between`, etc.)
- Leçons apprises des v0.0.20-21

### SCENARIOS_DE_TEST.md

- 70+ scénarios de test
- Organisation : T1-T10 (fonctionnel), R1-R4 (régression)
- Préconditions, étapes, résultats attendus
- Template de bug report

### TESTING_CHECKLIST.md

- Checklist pré-commit (6-8 min)
- 27 items de validation rapide
- 4 tests de régression critiques
- Commandes de validation (syntax, lint)
- Seuils qualité : 80% checklist, 100% régression

**Commit** : 021827f28

---

## 🎯 Séparation données / application

### Problématique

Repo mixte = données personnelles + code application public → Risque sécurité

### Solution : Séparation en 2 repos

#### 1. Renommer repo existant

```bash
# Via API GitHub
curl -X PATCH https://api.github.com/repos/stephanedenis/Pensine \
  -d '{"name":"Pensine-StephaneDenis"}'
```

**Résultat** :

- `Pensine` → `Pensine-StephaneDenis` (privé)
- Conserve tout l'historique des données
- Remote local mis à jour

#### 2. Créer nouveau repo public

```bash
# Via API GitHub
curl -X POST https://api.github.com/user/repos \
  -d '{"name":"pensine-web","private":false}'
```

**Contenu** :

- Code de l'application uniquement
- Sans données personnelles
- Sans tokens
- Historique propre (nouveau commit initial)
- LICENSE MIT
- README complet

#### 3. Nettoyage

```bash
# Supprimer pensine-web/ du repo données
cd Pensine-StephaneDenis
git rm -r pensine-web
git commit -m "refactor: Déplacer l'application vers repo séparé"
git push
```

**Commits** :

- Pensine-StephaneDenis : 666203e07
- pensine-web : c2e2d51 (initial)

---

## 📁 Structure finale

### Repo : stephanedenis/Pensine-StephaneDenis (privé)

```
Pensine-StephaneDenis/
├── journals/           # Journaux quotidiens
├── pages/              # Notes et pages
├── Perso/              # Données personnelles
├── Formation/          # Notes de formation
├── .pensine-config.json  # Config locale (non versionné)
└── README.md
```

### Repo : stephanedenis/pensine-web (public)

```
pensine-web/
├── index.html
├── app.js
├── config.js           # Sans token ni données perso
├── lib/                # Modules JavaScript
├── styles/             # CSS
├── docs/               # 📚 NOUVEAU
│   ├── SPECIFICATIONS_TECHNIQUES.md
│   ├── SCENARIOS_DE_TEST.md
│   ├── TESTING_CHECKLIST.md
│   └── journal-de-bord/
│       ├── README.md
│       └── 2025-12-14_securite-et-separation-repos.md
├── LICENSE             # MIT
├── README.md           # Instructions complètes
└── TEST_README.md      # Config tests
```

---

## 💡 Décisions techniques importantes

### 1. Priorité localStorage sur GitHub API

**Contexte** : Config peut exister dans localStorage sans être sur GitHub

**Décision** : Charger d'abord localStorage, puis GitHub, puis wizard

**Justification** :

- Plus rapide (pas d'API call)
- Fonctionne offline
- Respecte config locale de l'utilisateur

### 2. Synchronisation live form ↔ code

**Alternatives considérées** :

- A) Boutons "Save" et "View Code" dans formulaire
- B) Synchronisation automatique

**Choix** : B - Sync live avec event listeners

**Justification** :

- UX plus fluide
- Moins de clics
- Feedback immédiat
- Un seul source of truth (code textarea)

### 3. Séparation repos au lieu de branches

**Alternatives considérées** :

- A) Branches séparées dans même repo
- B) Submodules
- C) Deux repos indépendants

**Choix** : C - Repos séparés

**Justification** :

- Sécurité : aucune fuite possible
- Permissions GitHub distinctes
- Historique propre pour l'app
- Facilite contribution open-source
- Clone plus léger pour contributeurs

### 4. Documentation dans repo application

**Contexte** : Où mettre SPECS/TESTS/JOURNAL ?

**Décision** : `pensine-web/docs/` + `journal-de-bord/`

**Justification** :

- Docs techniques liées au code
- Facilite onboarding contributeurs
- Journal contextualise les décisions
- Traçabilité des évolutions

---

## 🎓 Leçons apprises

### ⚠️ Règles critiques à ne JAMAIS violer

1. **`.hidden` avec `!important`** :
   - Ne PAS utiliser sur éléments d'éditeur
   - Préférer CSS `[data-mode]` pour visibilité

2. **Validation syntaxe avant commit** :
   - TOUJOURS `node -c app.js`
   - Automatiser avec pre-commit hook

3. **Sécurité des credentials** :
   - JAMAIS de tokens dans le code
   - `.gitignore` strict
   - Audit régulier (`grep -r "ghp_"`)

4. **Layout header éditeur** :
   - `justify-content: space-between` (pas `flex-end`)
   - Préserve espace pour modes view

5. **Préservation des types JSON** :
   - boolean → `<input type="checkbox">`
   - number → `<input type="number">`
   - Rebuild config avec types corrects

### 📝 Bonnes pratiques confirmées

1. **Documentation exhaustive prévient régressions**
   - 1735 lignes de specs = investissement rentable
   - Tests documentés = bugs évités

2. **Tests de régression systématiques**
   - Checklist 6-8 min avant chaque commit
   - Sauve des heures de debugging

3. **Audit sécurité régulier**
   - Question "avons-nous des secrets ?" révélatrice
   - grep patterns systématiques

4. **Séparation concerns = sécurité**
   - Données ≠ Application
   - Privé ≠ Public
   - Histoire ≠ Clean slate

### 🚫 Anti-patterns identifiés

1. **Assumptions sur structure fichiers** :
   - ❌ Assumer `.pensine-config.json` existe sur GitHub
   - ✅ Vérifier localStorage d'abord

2. **Event listeners sans vérification existence** :
   - ❌ `form.addEventListener()` sans `if (form)`
   - ✅ Guard clauses systématiques

3. **Modifications sans validation** :
   - ❌ Commit → Push → Test
   - ✅ Validate → Test local → Commit → Push

4. **Token auto-seeding "pratique"** :
   - ❌ `PENSINE_INITIAL_TOKEN = 'ghp_...'`
   - ✅ Wizard-only, localStorage-only

---

## 📊 Métriques de la session

### Code modifié

- Fichiers édités : 5
- Lignes ajoutées : ~2000 (docs incluses)
- Lignes supprimées : ~40 (cleanup)
- Bugs fixés : 5
- Vulnérabilités corrigées : 1 (critique)

### Commits

- Total : 6
- Fix : 4
- Docs : 1
- Security : 1
- Refactor : 1 (séparation repos)

### Tests

- Scénarios documentés : 70+
- Checklist items : 27
- Temps validation : 6-8 min

---

## 🎯 État final

### Version

**v0.0.22** - Stable et sécurisé

### Commits finaux

- Pensine-StephaneDenis : `666203e07`
- pensine-web : `c2e2d51` (initial)

### Repos

- ✅ <https://github.com/stephanedenis/Pensine-StephaneDenis> (privé)
- ✅ <https://github.com/stephanedenis/pensine-web> (public)

### Documentation

- ✅ SPECIFICATIONS_TECHNIQUES.md (1735 lignes)
- ✅ SCENARIOS_DE_TEST.md (70+ scénarios)
- ✅ TESTING_CHECKLIST.md (27 items)
- ✅ Journal de bord initialisé

### Sécurité

- ✅ Tokens retirés du code source
- ✅ `.gitignore` configuré
- ✅ Variables d'environnement documentées
- ⚠️ Token à révoquer (action utilisateur)

### Fonctionnalités

- ✅ Configuration ouvre depuis localStorage
- ✅ Formulaire s'affiche en mode riche
- ✅ Synchronisation live form ↔ code
- ✅ Single save button (UX propre)
- ✅ App se charge sans erreur

---

## 🚀 Actions post-session

### Immédiat (utilisateur)

1. [ ] Révoquer token GitHub exposé : <https://github.com/settings/tokens>
2. [ ] Générer nouveau token (DO NOT commit)
3. [ ] Tester app avec nouveau token

### Court terme

1. [ ] Implémenter pre-commit hook (validation syntaxe)
2. [ ] Ajouter tests Playwright pour config editor
3. [ ] Documenter workflow contribution dans pensine-web/README.md

### Moyen terme

1. [ ] Envisager nettoyage historique Git (BFG Repo-Cleaner)
2. [ ] Setup CI/CD pour validation automatique
3. [ ] Badges GitHub (tests, coverage) dans README

---

## 📖 Références

### Issues créées

- Aucune (session de fix)

### Pull Requests

- Aucune (direct commits sur master)

### Liens externes

- GitHub API Rename Repo : <https://docs.github.com/en/rest/repos/repos#update-a-repository>
- BFG Repo-Cleaner : <https://rtyley.github.io/bfg-repo-cleaner/>

### Commits clés

- b34da91b6 : Fix config loading from localStorage
- b69dc95de : Remove redundant form buttons + live sync
- 69237bff6 : Fix syntax error (missing braces)
- 021827f28 : Add comprehensive technical documentation
- 33e06598c : Security - Remove tokens from source
- 666203e07 : Refactor - Move app to separate repo

---

## 🙏 Remerciements

Session productive avec GitHub Copilot qui a permis :

- Identification proactive d'une faille de sécurité critique
- Documentation exhaustive pour prévenir régressions
- Séparation propre données/application
- Amélioration UX significative

**Durée totale** : ~3 heures bien investies ! 🎉
