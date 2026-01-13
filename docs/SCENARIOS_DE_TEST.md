# Scénarios de Test - Pensine Web

## 📋 Vue d'Ensemble

Ce document contient tous les scénarios de test pour valider le bon fonctionnement de Pensine Web et prévenir les régressions.

**Dernière mise à jour**: v0.0.22
**Responsable**: Équipe Développement

---

## ✅ Checklist Rapide Pré-Commit

Avant chaque commit, exécuter cette checklist minimale:

- [ ] App charge sans erreur console
- [ ] Calendrier affiche semaines correctement
- [ ] Clic sur jour ouvre éditeur
- [ ] Les 3 modes vue fonctionnent (</>, 👁️, ⬌)
- [ ] Sauvegarde journal fonctionne
- [ ] Configuration s'ouvre et affiche formulaire
- [ ] Pas de régression visuelle (layout)

---

## 🎯 Tests Fonctionnels

### T1: Initialisation Application

**Objectif**: Vérifier le chargement initial de l'application

#### T1.1 - Premier Chargement (Sans Config)
**Préconditions**: localStorage vide

**Étapes**:
1. Ouvrir http://localhost:8000
2. Observer l'affichage

**Résultat Attendu**:
- ✅ Wizard de configuration s'ouvre automatiquement
- ✅ Affiche étape 1/6 (Bienvenue)
- ✅ Pas d'erreur console

**Données Test**:
```javascript
// localStorage doit être vide
localStorage.clear();
```

#### T1.2 - Chargement avec Config Existante
**Préconditions**: Config valide dans localStorage

**Étapes**:
1. Avoir config dans localStorage
2. Ouvrir http://localhost:8000
3. Observer l'affichage

**Résultat Attendu**:
- ✅ App charge directement (pas de wizard)
- ✅ Calendrier LinearCalendar V2 affiché
- ✅ Vue centrée sur semaine actuelle
- ✅ Scroll infini fonctionnel
- ✅ Token validé (pas d'erreur)
- ✅ Plugins chargés (calendar, inbox, journal, reflection)

**Données Test**:
```json
{
  "platform": "github",
  "token": "ghp_validtoken123",
  "owner": "testuser",
  "repo": "Pensine",
  "branch": "master",
  "defaultPath": "journals",
  "theme": "dark",
  "autoSync": true,
  "autoSave": true,
  "calendarVisible": true,
  "historyVisible": false,
  "weekStartDay": 1
}
```

#### T1.3 - Chargement avec Token Invalide
**Préconditions**: Config avec token expiré

**Étapes**:
1. Avoir config avec token invalide
2. Ouvrir http://localhost:8000
3. Observer comportement

**Résultat Attendu**:
- ✅ Message erreur "Token GitHub invalide ou expiré"
- ✅ Wizard s'ouvre automatiquement
- ✅ Pas de crash application

---

### T2: Wizard Configuration

**Objectif**: Tester le parcours complet du wizard

#### T2.1 - Parcours Complet GitHub (PAT)
**Étapes**:
1. Ouvrir wizard (localStorage vide)
2. **Étape 1 (Bienvenue)**: Lire instructions
3. Cliquer "Suivant →"
4. **Étape 2 (Plateforme)**: Sélectionner "GitHub"
5. Cliquer "Suivant →"
6. **Étape 3 (Token)**: Entrer token `ghp_test123`
5. Cliquer "Suivant →"
6. **Étape 3**: Entrer owner `testuser`, repo `Pensine`, branch `master`
7. Cliquer "Suivant →"
8. **Étape 4**: Entrer defaultPath `journals`
9. Cliquer "Suivant →"
10. **Étape 5**: Sélectionner theme "dark", cocher autoSync et autoSave
11. Cliquer "🎉 Terminer"

**Résultat Attendu**:
- ✅ Chaque étape valide les champs requis
- ✅ Bouton "Suivant" désactivé si champs vides
- ✅ Bouton "← Précédent" fonctionne
- ✅ À la fin:
  - Fichier `.pensine-config.json` créé sur GitHub
  - Config sauvegardée dans localStorage
  - Wizard se ferme
  - App se charge avec nouvelle config

#### T2.2 - Validation Champs
**Étapes**:
1. Étape 2 (Token): Laisser vide
2. Observer bouton "Suivant"

**Résultat Attendu**:
- ✅ Bouton "Suivant" désactivé (attribut `disabled`)
- ✅ Impossible de progresser sans token

#### T2.3 - Navigation Avant/Arrière
**Étapes**:
1. Avancer jusqu'à étape 3
2. Cliquer "← Précédent"
3. Vérifier étape 2
4. Cliquer "Suivant →"
5. Vérifier étape 3

**Résultat Attendu**:
- ✅ Navigation fluide entre étapes
- ✅ Données saisies conservées
- ✅ Pas de perte d'état

#### T2.4 - Plateformes Alternatives
**Étapes**:
1. Tester avec Bitbucket, GitLab, Gitea
2. Vérifier instructions spécifiques chaque plateforme

**Résultat Attendu**:
- ✅ Instructions token adaptées par plateforme
- ✅ URLs API correctes
- ✅ Config finale contient `"platform": "bitbucket|gitlab|gitea"`

---

### T3: Calendrier

**Objectif**: Valider l'affichage et interactions calendrier

#### T3.1 - Affichage Initial
**Étapes**:
1. Charger app avec config valide
2. Observer calendrier

**Résultat Attendu**:
- ✅ 52 semaines affichées (grille 52 lignes × 8 colonnes)
- ✅ Colonne gauche: Noms des mois (première semaine de chaque mois)
- ✅ 7 colonnes droite: Jours semaine (Lun-Dim ou Dim-Sam selon config)
- ✅ Semaine actuelle highlightée (classe `.current-week`)
- ✅ Scroll automatique sur semaine actuelle
- ✅ Jours avec contenu ont indicateur visuel

#### T3.2 - Scroll Infini
**Étapes**:
1. Scroller tout en haut du calendrier
2. Attendre 500ms
3. Observer chargement

**Résultat Attendu**:
- ✅ 10 nouvelles semaines chargées au-dessus
- ✅ Position scroll préservée
- ✅ Message console "📅 10 semaines chargées avant"

**Répéter**: Scroller tout en bas
- ✅ 10 semaines chargées en dessous
- ✅ Message console "📅 10 semaines chargées après"

#### T3.3 - Clic sur Jour
**Étapes**:
1. Cliquer sur jour actuel
2. Observer éditeur

**Résultat Attendu**:
- ✅ Éditeur s'ouvre
- ✅ Fichier: `journals/yyyy-mm-dd.md`
- ✅ Badge type: `journal`
- ✅ Mode vue: RICH (👁️ actif)
- ✅ Contenu: Markdown rendu ou template si nouveau

#### T3.4 - Indicateurs Contenu
**Étapes**:
1. Créer journal pour demain
2. Recharger calendrier
3. Observer jour demain

**Résultat Attendu**:
- ✅ Jour avec contenu a classe `.has-content`
- ✅ Style visuel distinct (background différent)

#### T3.5 - Jour de Début Semaine Configurable
**Données Test**:
```json
{ "weekStartDay": 0 }  // Dimanche
{ "weekStartDay": 1 }  // Lundi
```

**Résultat Attendu**:
- ✅ Headers colonnes réordonnés
- ✅ Grille jours alignée correctement
- ✅ Semaine actuelle correctement identifiée

---

### T4: Éditeur Unifié

**Objectif**: Tester les 3 modes de vue et fonctionnalités éditeur

#### T4.1 - Ouverture Journal
**Étapes**:
1. Cliquer sur jour dans calendrier
2. Observer éditeur

**Résultat Attendu**:
- ✅ Container `#editor-container` visible (pas classe `.hidden`)
- ✅ Attribute `[data-mode="rich"]`
- ✅ Header affiche:
  - Nom fichier: `yyyy-mm-dd.md`
  - Badge type: `journal`
- ✅ Vue RICH affiche markdown rendu
- ✅ Vue CODE masquée (CSS `display: none`)

#### T4.2 - Switch Mode CODE
**Étapes**:
1. Ouvrir journal
2. Cliquer bouton `</>` (Code)
3. Observer changement

**Résultat Attendu**:
- ✅ Attribute change: `[data-mode="code"]`
- ✅ Bouton `</>` a classe `.active`
- ✅ Bouton `👁️` perd classe `.active`
- ✅ Vue CODE visible: `<textarea>` avec contenu markdown brut
- ✅ Vue RICH masquée
- ✅ Préférence sauvée: `localStorage.editorViewMode = "code"`

#### T4.3 - Switch Mode SPLIT
**Étapes**:
1. Ouvrir journal
2. Cliquer bouton `⬌` (Split)
3. Observer layout

**Résultat Attendu**:
- ✅ Attribute: `[data-mode="split"]`
- ✅ `.editor-content` devient grille 2 colonnes
- ✅ Vue CODE visible à gauche (textarea)
- ✅ Vue RICH visible à droite (rendu)
- ✅ Les deux vues affichées simultanément
- ✅ Largeur 50/50

#### T4.4 - Modification et Sauvegarde
**Étapes**:
1. Ouvrir journal en mode CODE
2. Modifier contenu textarea
3. Observer bouton sauvegarde
4. Cliquer "💾 Sauvegarder"
5. Observer résultat

**Résultat Attendu**:
- ✅ Après modification:
  - `hasUnsavedChanges = true`
  - Bouton "💾 Sauvegarder" activé (pas `disabled`)
- ✅ Après sauvegarde:
  - Requête API GitHub `PUT /repos/.../contents/journals/...`
  - Message succès "✅ Fichier sauvegardé"
  - Bouton redevient grisé/désactivé
  - `hasUnsavedChanges = false`
- ✅ En mode SPLIT: Vue RICH se met à jour automatiquement

#### T4.5 - Fermeture avec Modifications Non Sauvées
**Étapes**:
1. Ouvrir journal
2. Modifier contenu
3. Cliquer "✕" (Fermer)
4. Observer popup

**Résultat Attendu**:
- ✅ Popup `confirm()`: "Vous avez des modifications non sauvegardées. Fermer quand même ?"
- ✅ Si "Annuler": Éditeur reste ouvert
- ✅ Si "OK": Éditeur se ferme, modifications perdues

#### T4.6 - Fermeture sans Modifications
**Étapes**:
1. Ouvrir journal
2. Ne pas modifier
3. Cliquer "✕"

**Résultat Attendu**:
- ✅ Pas de popup
- ✅ Éditeur se ferme immédiatement
- ✅ Vue journal ou calendrier réaffichée

#### T4.7 - Raccourci Clavier Ctrl+S
**Étapes**:
1. Ouvrir journal
2. Modifier contenu
3. Presser `Ctrl+S` (ou `Cmd+S` Mac)

**Résultat Attendu**:
- ✅ Event `keydown` intercepté
- ✅ `e.preventDefault()` empêche save navigateur
- ✅ `saveCurrentFile()` appelée
- ✅ Fichier sauvegardé sur GitHub

---

### T5: Configuration (Formulaire)

**Objectif**: Tester l'édition configuration via formulaire

#### T5.1 - Ouverture Configuration
**Étapes**:
1. Cliquer bouton "⚙️ Configuration" (sidebar)
2. Observer éditeur

**Résultat Attendu**:
- ✅ Éditeur s'ouvre
- ✅ Fichier: `.pensine-config.json`
- ✅ Badge type: `config`
- ✅ **Mode forcé**: RICH (👁️ actif) même si dernière préférence était CODE
- ✅ Vue RICH affiche formulaire dynamique

#### T5.2 - Affichage Formulaire
**Données Config**:
```json
{
  "platform": "github",
  "token": "ghp_123",
  "owner": "user",
  "repo": "Pensine",
  "branch": "master",
  "defaultPath": "journals",
  "weekStartDay": 1,
  "autoSync": true,
  "autoSave": false
}
```

**Résultat Attendu**:
- ✅ Titre: `<h3>Configuration</h3>`
- ✅ Champ `platform`: `<input type="text">` avec valeur `github`
- ✅ Champ `token`: `<input type="text">` avec valeur masquée ou complète
- ✅ Champ `weekStartDay`: `<input type="number">` avec valeur `1`
- ✅ Champ `autoSync`: `<input type="checkbox" checked>`
- ✅ Champ `autoSave`: `<input type="checkbox">` (non coché)
- ✅ Chaque champ a badge type: `<span class="config-field-type">string|number|boolean</span>`
- ✅ **Pas de boutons** au bas du formulaire (redondants)

#### T5.3 - Modification Champ Texte
**Étapes**:
1. Ouvrir config
2. Modifier champ `defaultPath`: `journals` → `daily-notes`
3. Observer changements

**Résultat Attendu**:
- ✅ Event `input` déclenché
- ✅ `updateConfigFromForm()` appelée
- ✅ Textarea CODE mise à jour instantanément:
  ```json
  {
    ...
    "defaultPath": "daily-notes",
    ...
  }
  ```
- ✅ Bouton "💾 Sauvegarder" activé

#### T5.4 - Modification Checkbox
**Étapes**:
1. Ouvrir config
2. Décocher `autoSync`
3. Observer

**Résultat Attendu**:
- ✅ Event `change` déclenché
- ✅ Textarea CODE mise à jour:
  ```json
  { "autoSync": false }
  ```
- ✅ Type préservé: boolean, pas string "false"

#### T5.5 - Modification Number
**Étapes**:
1. Ouvrir config
2. Changer `weekStartDay`: `1` → `0`
3. Observer

**Résultat Attendu**:
- ✅ Textarea CODE mise à jour:
  ```json
  { "weekStartDay": 0 }
  ```
- ✅ Type préservé: number 0, pas string "0"

#### T5.6 - Synchronisation Split View
**Étapes**:
1. Ouvrir config
2. Switcher en mode SPLIT (⬌)
3. Modifier champ dans formulaire (droite)
4. Observer textarea (gauche)

**Résultat Attendu**:
- ✅ Textarea gauche se met à jour en temps réel
- ✅ JSON formaté (2 espaces indentation)
- ✅ Synchronisation bidirectionnelle

#### T5.7 - Sauvegarde Configuration
**Étapes**:
1. Ouvrir config
2. Modifier plusieurs champs
3. Cliquer "💾 Sauvegarder"
4. Observer résultats

**Résultat Attendu**:
- ✅ Requête GitHub `PUT /repos/.../contents/.pensine-config.json`
- ✅ localStorage mis à jour: `pensine-settings`
- ✅ GitHubAdapter reconfiguré avec nouveaux paramètres
- ✅ Message succès "✅ Fichier sauvegardé"
- ✅ Si modif `weekStartDay`: Calendrier se recharge avec nouveau début semaine

#### T5.8 - Configuration Absente (404)
**Préconditions**:
- localStorage vide
- Pas de `.pensine-config.json` sur GitHub

**Étapes**:
1. Cliquer "⚙️ Configuration"
2. Observer comportement

**Résultat Attendu**:
- ✅ Message: "Configuration introuvable. Veuillez créer une configuration."
- ✅ Wizard s'ouvre automatiquement (si `window.ConfigWizard` existe)
- ✅ Pas de crash

---

### T6: Rendu Markdown

**Objectif**: Tester le rendu des différents éléments Markdown

#### T6.1 - Titres (Headers)
**Données Test**:
```markdown
# Titre H1
## Titre H2
### Titre H3
```

**Résultat Attendu**:
- ✅ `<h1>` avec border-bottom
- ✅ `<h2>` sans border
- ✅ `<h3>` plus petit
- ✅ Couleur: `var(--text)`

#### T6.2 - Listes
**Données Test**:
```markdown
- Item 1
- Item 2
  - Sous-item 2.1
- Item 3

1. Premier
2. Deuxième
3. Troisième
```

**Résultat Attendu**:
- ✅ `<ul>` pour liste non ordonnée
- ✅ `<ol>` pour liste ordonnée
- ✅ Indentation sous-listes
- ✅ Puces/numéros affichés

#### T6.3 - Code Blocks
**Données Test**:
````markdown
```javascript
function hello() {
    console.log("Hello World");
}
```
````

**Résultat Attendu**:
- ✅ `<pre><code class="language-javascript">`
- ✅ Highlight.js appliqué
- ✅ Coloration syntaxe (keywords, strings, functions)
- ✅ Theme: github-dark
- ✅ Background: `var(--bg-secondary)`

#### T6.4 - Liens
**Données Test**:
```markdown
[Lien externe](https://github.com)
[Lien interne](./autre-page.md)
```

**Résultat Attendu**:
- ✅ `<a href="...">Lien</a>`
- ✅ Couleur: `var(--link)`
- ✅ Hover: `var(--link-hover)`

#### T6.5 - Inline Formatting
**Données Test**:
```markdown
**Gras** et *italique* et `code inline`
```

**Résultat Attendu**:
- ✅ `<strong>Gras</strong>`
- ✅ `<em>italique</em>`
- ✅ `<code>code inline</code>` avec background distinct

#### T6.6 - Blockquotes
**Données Test**:
```markdown
> Citation importante
> Sur plusieurs lignes
```

**Résultat Attendu**:
- ✅ `<blockquote>` avec border-left
- ✅ Background légèrement différent
- ✅ Padding approprié

#### T6.7 - Tables
**Données Test**:
```markdown
| Colonne 1 | Colonne 2 |
|-----------|-----------|
| Valeur 1  | Valeur 2  |
| Valeur 3  | Valeur 4  |
```

**Résultat Attendu**:
- ✅ `<table>` avec borders
- ✅ `<thead>` pour en-têtes
- ✅ `<tbody>` pour données
- ✅ Lignes alternées (stripe)

---

### T7: Panneau Historique

**Objectif**: Tester l'affichage et navigation historique

#### T7.1 - Toggle Panneau
**Étapes**:
1. Cliquer "📜 Historique" (toggle button)
2. Observer panneau
3. Re-cliquer
4. Observer fermeture

**Résultat Attendu**:
- ✅ Premier clic: Panneau s'ouvre (slide de droite)
- ✅ Classe `.open` ajoutée à `#history-sidebar`
- ✅ Deuxième clic: Panneau se ferme
- ✅ Animation smooth (transition CSS)

#### T7.2 - Chargement Historique
**Préconditions**: Journal avec plusieurs commits

**Étapes**:
1. Ouvrir journal existant
2. Ouvrir panneau historique
3. Observer liste

**Résultat Attendu**:
- ✅ Liste commits affichée (max 50)
- ✅ Chaque commit:
  - Date (format localisé)
  - Message commit
  - SHA court (7 chars)
  - Auteur
- ✅ Ordre chronologique (plus récent en haut)

#### T7.3 - Voir Version Historique
**Étapes**:
1. Ouvrir journal avec historique
2. Cliquer sur commit ancien
3. Observer éditeur

**Résultat Attendu**:
- ✅ Éditeur affiche contenu de cette version
- ✅ Badge: `journal (version du ${date})`
- ✅ Mode lecture seule ou indicateur version historique
- ✅ Bouton "Revenir à la version actuelle"

#### T7.4 - Historique Fichier Nouveau
**Préconditions**: Journal créé aujourd'hui (1 seul commit)

**Étapes**:
1. Ouvrir journal nouveau
2. Ouvrir historique
3. Observer

**Résultat Attendu**:
- ✅ 1 seul commit affiché
- ✅ Message: "Initial commit" ou message création

---

### T8: Gestion Erreurs

**Objectif**: Vérifier résilience et messages d'erreur

#### T8.1 - Perte Connexion Internet
**Étapes**:
1. Désactiver connexion réseau
2. Essayer ouvrir journal
3. Observer comportement

**Résultat Attendu**:
- ✅ Message erreur: "Erreur réseau: fetch failed"
- ✅ Pas de crash application
- ✅ Fallback sur cache si disponible

#### T8.2 - Token Révoqué
**Étapes**:
1. Utiliser token révoqué
2. Essayer opération GitHub
3. Observer erreur

**Résultat Attendu**:
- ✅ Message: "Token invalide ou révoqué"
- ✅ Proposition re-configuration
- ✅ Wizard disponible

#### T8.3 - Fichier Supprimé Externe
**Étapes**:
1. Ouvrir journal
2. Supprimer fichier sur GitHub (web)
3. Essayer sauvegarder dans app
4. Observer conflit

**Résultat Attendu**:
- ✅ Détection SHA mismatch
- ✅ Message erreur explicite
- ✅ Option forcer sauvegarde ou recharger

#### T8.4 - JSON Config Invalide
**Données Test**:
```json
{
  "platform": "github",
  "token": "abc"
  // JSON invalide (virgule finale, etc.)
}
```

**Résultat Attendu**:
- ✅ Parse error catchée
- ✅ Message: "Configuration JSON invalide"
- ✅ Vue enrichie affiche erreur, pas crash
- ✅ Vue CODE permet correction

---

### T9: Performance

**Objectif**: Valider temps réponse acceptables

#### T9.1 - Chargement Initial
**Mesure**: Performance API `performance.now()`

**Résultat Attendu**:
- ✅ Temps total < 2s (avec cache vide)
- ✅ Temps total < 500ms (avec cache)
- ✅ Affichage progressif (skeleton screens)

#### T9.2 - Switch Vue Éditeur
**Mesure**: Temps entre clic bouton et affichage

**Résultat Attendu**:
- ✅ Switch CODE ↔ RICH: < 100ms
- ✅ Pas de lag perceptible
- ✅ Transition smooth

#### T9.3 - Rendu Markdown Large
**Données Test**: Document 10,000 lignes

**Résultat Attendu**:
- ✅ Rendu complet < 1s
- ✅ Pas de freeze UI
- ✅ Scroll fluide

#### T9.4 - Scroll Calendrier
**Mesure**: FPS lors scroll rapide

**Résultat Attendu**:
- ✅ Maintien 60 FPS
- ✅ Chargement lazy semaines ne bloque pas
- ✅ Debounce scroll events

---

### T10: Responsive Design

**Objectif**: Vérifier adaptation mobile/tablette

#### T10.1 - Mobile (< 480px)
**Dispositifs Test**: iPhone SE, Samsung Galaxy S21

**Résultat Attendu**:
- ✅ Layout single-column
- ✅ Sidebar toggle (hamburger menu)
- ✅ Calendrier scroll horizontal si nécessaire
- ✅ Boutons taille tactile (min 44×44px)
- ✅ Mode SPLIT devient vertical

#### T10.2 - Tablette (768px)
**Dispositifs Test**: iPad, Android tablet

**Résultat Attendu**:
- ✅ Layout adaptatif
- ✅ Sidebar visible ou toggle
- ✅ Éditeur pleine largeur
- ✅ Mode SPLIT horizontal

---

## 🔍 Tests de Régression Critiques

Ces tests doivent TOUJOURS passer après chaque modification.

### R1: Éditeur Reste Fonctionnel
- [ ] Les 3 modes vue s'affichent (pas de page blanche)
- [ ] Pas de classe `.hidden` sur vues avec `!important`
- [ ] Header flexbox: `space-between` (pas `flex-end`)
- [ ] Event listeners attachés uniquement sur éléments existants

### R2: Configuration Éditable
- [ ] Formulaire s'affiche en mode RICH
- [ ] Types JSON préservés (boolean/number/string)
- [ ] Synchronisation live formulaire ↔ code
- [ ] Sauvegarde met à jour GitHub ET localStorage

### R3: Calendrier Chargeable
- [ ] 52 semaines initiales
- [ ] Scroll infini fonctionne
- [ ] Clic jour ouvre éditeur
- [ ] Pas de duplication semaines

### R4: Sauvegarde Persistante
- [ ] GitHub API appelée avec bon payload
- [ ] localStorage synchronisé
- [ ] Cache IndexedDB mis à jour
- [ ] Indicateur succès affiché

---

## 📊 Couverture de Test Cible

| Composant | Couverture Cible | Actuel |
|-----------|------------------|--------|
| PensineApp | 80% | Manuel |
| Éditeur Unifié | 90% | Manuel |
| Calendrier | 85% | Manuel |
| Configuration | 90% | Manuel |
| GitHubAdapter | 75% | Manuel |
| StorageManager | 80% | Manuel |

**Objectif**: Automatiser 70% des tests manuels d'ici v1.0.0

---

## 🚀 Exécution des Tests

### Tests Manuels
1. Ouvrir http://localhost:8000
2. Suivre scénarios ci-dessus
3. Cocher checklist
4. Noter anomalies

---

### T5: Système Configuration Moderne (SettingsView)

**Objectif**: Valider le système de configuration par plugin avec génération de formulaires dynamiques

#### T5.1 - Ouverture Settings
**Préconditions**: App initialisée avec config moderne

**Étapes**:
1. Cliquer bouton ⚙️ (Settings) dans la sidebar
2. Observer panneau

**Résultat Attendu**:
- ✅ Panneau `.settings-view` s'ouvre avec overlay
- ✅ Header "Settings" visible avec bouton fermer ✕
- ✅ Sidebar onglets visible à gauche
- ✅ Onglets présents: Core + plugins actifs (Calendar, Inbox, Journal, Reflection)
- ✅ Formulaire zone principale à droite
- ✅ Actions footer: Save, Reset, Export, Import

#### T5.2 - Navigation Onglets et Génération Formulaires
**Étapes**:
1. Ouvrir Settings → Core
2. Observer formulaire généré dynamiquement
3. Cliquer onglet "Calendar"
4. Observer changement formulaire

**Résultat Attendu**:
- ✅ Formulaire Core: config globale (theme, storage, etc.)
- ✅ Formulaire Calendar: champs spécifiques (`startWeekOn`, `showWeekNumbers`)
- ✅ Types champs: text, number, checkbox, select selon JSON Schema
- ✅ Validation HTML5 active (required, min, max, pattern)
- ✅ Labels et help text affichés

#### T5.3 - Validation et Sauvegarde
**Étapes**:
1. Modifier une valeur
2. Cliquer "Save"

**Résultat Attendu**:
- ✅ Notification "Configuration saved successfully"
- ✅ Config persistée (`.pensine-config.json` ou localStorage)
- ✅ Événement `config:saved` émis

#### T5.4 - Export/Import Configuration
**Étapes**:
1. Cliquer "Export" → Fichier téléchargé
2. Cliquer "Import" → Sélectionner fichier

**Résultat Attendu**:
- ✅ Export génère JSON valide `{ core: {}, plugins: {} }`
- ✅ Import restaure configuration
- ✅ Validation JSON Schema lors import

---

### T6: Plugins Submodules

**Objectif**: Valider le système de plugins avec architecture submodules Git

#### T6.1 - Plugins Chargés au Démarrage
**Étapes**:
1. Console développeur: `window.pluginSystem.plugins`

**Résultat Attendu**:
- ✅ Map avec 4 plugins: calendar, inbox, journal, reflection
- ✅ Chaque plugin a manifest (id, name, version)

#### T6.2 - Activation/Désactivation Plugin
**Étapes**:
1. Console: `await window.pluginSystem.disablePlugin('calendar')`
2. Observer UI calendrier

**Résultat Attendu**:
- ✅ Calendrier disparaît
- ✅ Événement `plugin:disabled` émis

#### T6.3 - Configuration Plugin dans Settings
**Étapes**:
1. Ouvrir Settings → Calendar
2. Modifier config
3. Sauvegarder

**Résultat Attendu**:
- ✅ Formulaire généré depuis schéma plugin
- ✅ Config plugin mise à jour dans `config.plugins.calendar`

---

### Tests Automatisés (Future)
```bash
# Playwright ou Cypress
npm test

# Tests spécifiques
npm test -- --grep "T4.1"

# Coverage
npm run test:coverage
```

---

## 📝 Rapport de Bug

Template pour signaler une régression:

```markdown
**Test Échoué**: [ID Test, ex: T4.2]
**Version**: v0.0.XX
**Navigateur**: Chrome 120 / Firefox 121 / Safari 17
**OS**: Linux / Windows / macOS

**Étapes Reproduction**:
1. ...
2. ...

**Résultat Attendu**:
...

**Résultat Actuel**:
...

**Erreur Console** (si applicable):
```
Error: ...
```

**Screenshot**: [lien]
```

---

## ✅ Validation Release

Avant de taguer une version stable:

- [ ] Tous tests T1-T10 passent
- [ ] Tous tests régression R1-R4 passent
- [ ] Pas d'erreur console sur navigateurs majeurs
- [ ] Performance < seuils définis
- [ ] Documentation mise à jour
- [ ] CHANGELOG complété
- [ ] Tag git créé: `git tag -a v0.0.XX -m "..."`

---

**Dernière Validation Complète**: [Date à remplir]
**Validée Par**: [Nom]
**Version Testée**: v0.0.22
