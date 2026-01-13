# Checklist Pré-Commit - Pensine Web

## 🎯 Validation Rapide (5 minutes)

Exécuter AVANT chaque `git commit`:

### ✅ Démarrage Application

- [ ] **Server lancé**: `python3 -m http.server 8000 --directory pensine-web`
- [ ] **Page charge**: http://localhost:8000 sans erreur 404
- [ ] **Console propre**: Aucune erreur rouge dans DevTools Console (F12)
- [ ] **Version affichée**: Header montre version correcte `v0.0.XX`

### ✅ Layout Visuel

- [ ] **Header intact**: Logo + version à gauche, navigation visible
- [ ] **Sidebar visible**: Boutons ⚙️, 📅, 📜 présents et alignés
- [ ] **Calendrier affiché**: Grille semaines × jours visible
- [ ] **Pas de blank screens**: Aucune section complètement vide/blanche

### ✅ Calendrier

- [ ] **52 semaines chargées**: Scroll révèle au moins 52 lignes
- [ ] **Semaine actuelle highlighted**: Ligne avec classe `.current-week`
- [ ] **Clic jour fonctionne**: Ouvre éditeur sans erreur console

### ✅ Éditeur Unifié

- [ ] **S'ouvre au clic**: Container `#editor-container` devient visible
- [ ] **Header éditeur complet**:
  - [ ] Nom fichier affiché (ex: `2024-12-14.md`)
  - [ ] Badge type affiché (ex: `journal`)
  - [ ] 3 boutons mode présents: `</>`, `👁️`, `⬌`
  - [ ] Bouton `💾 Sauvegarder` présent
  - [ ] Bouton `✕` fermer présent

- [ ] **Mode CODE fonctionne**:
  - [ ] Clic `</>` affiche textarea
  - [ ] Textarea contient texte markdown
  - [ ] Bouton `</>` a classe `.active`

- [ ] **Mode RICH fonctionne**:
  - [ ] Clic `👁️` affiche contenu rendu
  - [ ] Markdown rendu visible (titres, listes, etc.)
  - [ ] Pas de `<div>` vide
  - [ ] Bouton `👁️` a classe `.active`

- [ ] **Mode SPLIT fonctionne**:
  - [ ] Clic `⬌` affiche 2 panneaux
  - [ ] Gauche: textarea code
  - [ ] Droite: contenu rendu
  - [ ] Layout 50/50 (grille CSS)
  - [ ] Bouton `⬌` a classe `.active`

### ✅ Configuration

- [ ] **Ouverture**: Clic `⚙️` ouvre éditeur config
- [ ] **Formulaire affiché**: Mode RICH montre champs de config
- [ ] **Champs présents**: token, owner, repo, branch, etc.
- [ ] **Types affichés**: Badges `string`, `number`, `boolean` visibles
- [ ] **Pas de boutons bas formulaire**: Uniquement header controls

### ✅ Configuration Moderne (Settings UI)

- [ ] **Ouverture Settings**: Clic ⚙️ ouvre panneau `.settings-view`
- [ ] **Layout Settings**:
  - [ ] Sidebar onglets à gauche
  - [ ] Zone formulaire principale à droite
  - [ ] Header avec titre "Settings" et bouton ✕
  - [ ] Footer avec Save, Reset, Export, Import
- [ ] **Onglets présents**: Core + onglets plugins (Calendar, Inbox, Journal, Reflection)
- [ ] **Formulaire Core**:
  - [ ] Champs générés depuis JSON Schema
  - [ ] Types correctement rendus (string, number, boolean, select)
  - [ ] Validation HTML5 active (required, min, max, pattern)
  - [ ] Labels et help text affichés
- [ ] **Navigation onglets**: Clic onglet change formulaire dynamiquement
- [ ] **Onglet plugin (Calendar)**:
  - [ ] Formulaire spécifique plugin affiché
  - [ ] Champs: startWeekOn, showWeekNumbers, etc.
  - [ ] Valeurs actuelles chargées
- [ ] **Modification valeur**: Input déclenche changement état
- [ ] **Validation**: Valeur invalide empêche sauvegarde
- [ ] **Sauvegarde**: Bouton Save persiste config
- [ ] **Notification**: Toast "Configuration saved successfully" affiché
- [ ] **Persistance**: Reload page → config préservée
- [ ] **Export**: Bouton Export génère fichier `.pensine-config.json`
- [ ] **Import**: Bouton Import restaure config depuis fichier
- [ ] **Reset**: Bouton Reset restaure valeurs par défaut (avec confirmation)
- [ ] **Fermeture**: Bouton ✕ ou Escape ferme panneau

### ✅ Plugins Submodules

- [ ] **Plugins chargés**: `window.pluginSystem.plugins.size >= 4` en console
- [ ] **Plugins actifs**: `window.pluginSystem.activePlugins` contient 4 plugins
- [ ] **Manifests**: Chaque plugin a id, name, version, description
- [ ] **Onglets plugins**: Settings montre onglets Calendar, Inbox, Journal, Reflection
- [ ] **Config plugin**: Formulaire plugin s'affiche correctement
- [ ] **Schémas enregistrés**: `window.modernConfigManager.schemas` contient schémas plugins
- [ ] **EventBus**: `window.eventBus` existe et communique entre plugins
- [ ] **Disable plugin**: `disablePlugin('calendar')` masque calendrier
- [ ] **Enable plugin**: `enablePlugin('calendar')` restaure calendrier

### ✅ Sauvegarde

- [ ] **Modification détectée**: Éditer contenu active bouton save
- [ ] **Clic sauvegarde**: Bouton `💾` envoie requête GitHub
- [ ] **Message succès**: Toast/alert "✅ Fichier sauvegardé"
- [ ] **Bouton se désactive**: Redevient grisé après save

### ✅ Console Navigateur

Ouvrir DevTools (F12) → Console:

- [ ] **Aucune erreur rouge**: `Error`, `TypeError`, `Uncaught`
- [ ] **Avertissements acceptables**: `Warning` jaunes OK si non critiques
- [ ] **Logs info**: Messages bleus/noirs normaux

### ✅ Tests Régression Critiques

- [ ] **R1**: Éditeur mode RICH pas blanc (pas de classe `.hidden` avec `!important`)
- [ ] **R2**: Header éditeur layout correct (pas tous les éléments à droite)
- [ ] **R3**: Event listeners pas d'erreur "Cannot read property 'addEventListener' of null"
- [ ] **R4**: Config formulaire synchronise avec code textarea

---

## 🔧 Validation Syntaxe (1 minute)

```bash
# JavaScript
node -c pensine-web/app.js
node -c pensine-web/lib/github-adapter.js
node -c pensine-web/lib/storage.js
node -c pensine-web/lib/config-wizard.js

# HTML (optionnel, avec validator.nu)
# curl -H "Content-Type: text/html; charset=utf-8" \
#      --data-binary @pensine-web/index.html \
#      https://validator.nu/?out=text
```

**Résultat attendu**: Aucune erreur syntaxe

---

## 📝 Commit Message

Si tous les tests passent:

```bash
git add -A
git commit -m "type: Description courte"
git push
```

**Types valides**:
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction bug
- `refactor`: Refactorisation code
- `style`: CSS/UI changes
- `docs`: Documentation
- `test`: Ajout tests
- `chore`: Maintenance (deps, config)

**Exemples**:
```
feat: Ajouter support GitLab dans wizard
fix: Corriger layout header éditeur en mode split
refactor: Extraire logique markdown dans module séparé
style: Améliorer responsive calendrier mobile
docs: Ajouter scénarios test configuration
```

---

## ⚠️ Si Tests Échouent

**NE PAS COMMITTER** tant que tous les ✅ ne sont pas cochés.

**Actions correctives**:

1. **Erreur console**:
   - Identifier la ligne (DevTools montre fichier:ligne)
   - Vérifier event listeners sur éléments existants
   - Vérifier sélecteurs CSS (`getElementById`, `querySelector`)

2. **Layout cassé**:
   - Inspecter HTML structure (DevTools Elements)
   - Vérifier classes CSS appliquées
   - Vérifier attributs `[data-mode]`, `.hidden`, `.active`

3. **Éditeur vide/blanc**:
   - Vérifier `#editor-rich-view` n'a PAS classe `.hidden`
   - Vérifier CSS `[data-mode="rich"] #editor-rich-view { display: block; }`
   - Vérifier `getRichView()` retourne HTML valide

4. **Sauvegarde échoue**:
   - Console Network (F12 → Network): Voir requête API
   - Vérifier token valide
   - Vérifier payload JSON correct
   - Vérifier SHA à jour

---

## 🏷️ Tagging Version

Avant de créer un tag stable:

1. **Tous tests passent** (cette checklist + SCENARIOS_DE_TEST.md)
2. **CHANGELOG.md mis à jour**
3. **Aucune régression** vs version précédente

```bash
# Créer tag annoté
git tag -a v0.0.XX -m "Description version"

# Pousser tag
git push origin v0.0.XX
```

**Tag de restauration** (si régression future):
```bash
git tag -a v0.0.XX-stable -m "Point de restauration stable"
git push origin v0.0.XX-stable
```

---

## 📊 Temps Estimés

| Étape | Temps |
|-------|-------|
| Validation rapide | 3-5 min |
| Validation syntaxe | 1 min |
| Tests régression | 2 min |
| **TOTAL** | **8-10 min** |

**Investissement**: 6-8 minutes par commit pour éviter heures de debug régression.

---

## 🎯 Seuil Qualité Minimum

Pour committer, minimum requis:

- ✅ **80% checklist validation rapide** (22/27 items)
- ✅ **100% tests régression** (4/4 items)
- ✅ **0 erreur console** bloquante
- ✅ **Syntaxe JavaScript valide**

Si en dessous: **Corriger avant commit**.

---

**Version Checklist**: v1.0
**Compatible avec**: Pensine Web v0.0.22+
**Dernière mise à jour**: 2024-12-14
