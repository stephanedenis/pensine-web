# Spécifications Techniques - Pensine Web v0.0.22+

## 🏗️ Architecture Globale

### Stack Technologique
- **Frontend**: Vanilla JavaScript (ES6+)
- **Server**: Python http.server (développement)
- **Storage**: 
  - IndexedDB (cache fichiers)
  - localStorage (configuration, settings)
- **API**: GitHub REST API v3 / Bitbucket / GitLab / Gitea
- **Dépendances CDN**:
  - MarkdownIt 14.0.0
  - markdown-it-anchor 9.0.1
  - highlight.js 11.9.0 (thème github-dark)

### Structure des Fichiers

```
pensine-web/
├── index.html              # Structure HTML principale
├── app.js                  # Logique application principale (1493 lignes)
├── styles/
│   ├── main.css           # Styles globaux
│   ├── calendar.css       # Styles calendrier
│   ├── editor.css         # Styles éditeur unifié (523 lignes)
│   └── wizard.css         # Styles wizard configuration
└── lib/
    ├── github-adapter.js  # Adaptateur API GitHub
    ├── storage.js         # Gestionnaire localStorage/IndexedDB
    ├── editor.js          # Éditeur texte (legacy)
    ├── config-wizard.js   # Wizard configuration multi-plateformes
    └── config-manager.js  # Gestionnaire configuration
```

---

## 🎯 Composants Principaux

### 1. PensineApp (app.js)

**Responsabilités**:
- Orchestration générale de l'application
- Gestion des vues (journal, calendrier, éditeur)
- Coordination entre les modules

**État Principal**:
```javascript
{
    currentDate: Date,
    currentFile: string,
    currentContent: string,
    currentFileType: string,  // FILE_TYPES enum
    currentViewMode: string,  // VIEW_MODES enum
    hasUnsavedChanges: boolean,
    calendarState: {
        currentView: string,
        weeksLoaded: { earliest: Date, latest: Date },
        weekStartDay: number
    }
}
```

**Constantes**:
```javascript
FILE_TYPES = {
    JOURNAL: 'journal',
    CONFIG: 'config',
    MARKDOWN: 'markdown',
    JSON: 'json',
    OTHER: 'other'
}

VIEW_MODES = {
    CODE: 'code',
    RICH: 'rich',
    SPLIT: 'split'
}
```

### 2. Éditeur Unifié

**Architecture**: Triple vue synchronisée
- **Vue Code**: `<textarea id="editor-code-textarea">`
- **Vue Enrichie**: `<div id="editor-rich-content">`
- **Vue Split**: Code + Enrichi côte à côte

**Layout Structure**:
```html
<div id="editor-container" data-mode="rich|code|split">
  <div class="editor-header">
    <div class="editor-title">
      <span id="editor-file-name">...</span>
      <span id="editor-file-type" class="file-type-badge">...</span>
    </div>
    <div class="editor-controls">
      <div class="view-mode-switcher">
        <button class="view-mode-btn" data-mode="code">&lt;/&gt;</button>
        <button class="view-mode-btn active" data-mode="rich">👁️</button>
        <button class="view-mode-btn" data-mode="split">⬌</button>
      </div>
      <button id="editor-save-btn">💾 Sauvegarder</button>
      <button id="editor-close-btn">✕</button>
    </div>
  </div>
  <div class="editor-content">
    <div id="editor-code-view" class="editor-pane">
      <textarea id="editor-code-textarea"></textarea>
    </div>
    <div id="editor-rich-view" class="editor-pane">
      <div id="editor-rich-content"></div>
    </div>
  </div>
</div>
```

**CSS Display Logic**:
```css
/* Mode CODE */
#editor-container[data-mode="code"] #editor-code-view { display: block; }
#editor-container[data-mode="code"] #editor-rich-view { display: none; }

/* Mode RICH */
#editor-container[data-mode="rich"] #editor-code-view { display: none; }
#editor-container[data-mode="rich"] #editor-rich-view { display: block; }

/* Mode SPLIT */
#editor-container[data-mode="split"] .editor-content { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
}
#editor-container[data-mode="split"] #editor-code-view,
#editor-container[data-mode="split"] #editor-rich-view { 
    display: block; 
}
```

**⚠️ RÈGLE CRITIQUE**: 
- **JAMAIS** ajouter classe `.hidden` sur `#editor-rich-view` ou `#editor-code-view`
- La classe `.hidden` a `display: none !important` qui surpasse le CSS
- Laisser le CSS `[data-mode]` gérer l'affichage

### 3. Rendu Enrichi par Type de Fichier

**Détection de Type** (`detectFileType(path)`):
```javascript
// Priorité de détection:
1. Extension .json + nom contient "-config" → FILE_TYPES.CONFIG
2. Extension .json → FILE_TYPES.JSON
3. Extension .md + nom contient date ISO (yyyy-mm-dd) → FILE_TYPES.JOURNAL
4. Extension .md → FILE_TYPES.MARKDOWN
5. Autres → FILE_TYPES.OTHER
```

**Rendu Correspondant** (`getRichView(content, fileType)`):
```javascript
switch (fileType) {
    case FILE_TYPES.JOURNAL:
    case FILE_TYPES.MARKDOWN:
        return renderMarkdown(content);  // MarkdownIt + highlight.js
    
    case FILE_TYPES.CONFIG:
        return renderConfigForm(content);  // Formulaire dynamique
    
    case FILE_TYPES.JSON:
        return `<pre class="json-view">${JSON.stringify(parsed, null, 2)}</pre>`;
    
    default:
        return `<pre class="code-view">${escapeHtml(content)}</pre>`;
}
```

### 4. Formulaire de Configuration Dynamique

**Génération** (`renderConfigForm(jsonContent)`):
```javascript
// Parse JSON → Génère formulaire avec préservation des types
for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'boolean') {
        // <input type="checkbox">
    } else if (typeof value === 'number') {
        // <input type="number">
    } else {
        // <input type="text">
    }
    // + <span class="config-field-type">${typeof value}</span>
}
```

**Synchronisation Live**:
```javascript
form.addEventListener('input', () => {
    updateConfigFromForm(config);  // Met à jour textarea code
    hasUnsavedChanges = true;      // Active bouton save
    editor-save-btn.disabled = false;
});
```

**⚠️ RÈGLES**:
- Pas de boutons de sauvegarde dans le formulaire (redondants avec header)
- Synchronisation bidirectionnelle: Formulaire ↔ Code
- Préservation stricte des types (boolean/number/string)

### 5. Calendrier Hebdomadaire

**Structure**: Grille semaines × jours
- **Colonne gauche**: Mois (apparaît première semaine de chaque mois)
- **7 colonnes droite**: Jours de la semaine (configurable via `weekStartDay`)

**Chargement Progressif**:
```javascript
loadInitialWeeks():
    - Charge 52 semaines (26 avant, 25 après)
    - Scroll automatique vers semaine actuelle

handleScroll():
    - Détecte scroll top/bottom
    - Charge 10 semaines supplémentaires
    - Mise à jour calendarState.weeksLoaded
```

**Interaction**:
- Clic sur jour → Ouvre journal dans éditeur (`loadJournalByDate()`)
- Indicateur visuel pour jours avec contenu existant

### 6. Panneau Historique

**Structure**: Timeline des versions
- Liste des commits pour le fichier actuel
- Affichage: date, message, auteur

**Interaction**:
- Clic sur version → Ouvre dans éditeur en lecture seule
- Toggle via bouton `#toggle-history`

### 7. Wizard de Configuration

**Étapes** (5 steps):
1. **Plateforme**: GitHub / Bitbucket / GitLab / Gitea
2. **Token**: Instructions spécifiques par plateforme
3. **Dépôt**: owner, repo, branch
4. **Chemins**: defaultPath
5. **Ergonomie**: theme, autoSync, autoSave

**Structure Config Générée**:
```json
{
    "platform": "github",
    "token": "ghp_...",
    "owner": "username",
    "repo": "repository",
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

**Sauvegarde**: 
- Crée `.pensine-config.json` sur GitHub
- Sauvegarde dans localStorage (fallback)

---

## 🔄 Flows Critiques

### Flow 1: Ouverture Configuration

```
Utilisateur clique ⚙️ Configuration
    ↓
openConfigFileInEditor()
    ↓
Tente charger depuis localStorage
    ↓ (si existe)
    ├─→ Crée JSON string
    │   ↓
    │   openInEditor('.pensine-config.json', content)
    │       ↓
    │       detectFileType() → FILE_TYPES.CONFIG
    │       ↓
    │       getRichView() → renderConfigForm()
    │       ↓
    │       switchEditorMode(VIEW_MODES.RICH)  // Force RICH pour CONFIG
    │       ↓
    │       Formulaire affiché avec event listeners
    │
    ↓ (si n'existe pas)
    └─→ Tente charger depuis GitHub
        ↓ (404)
        └─→ Affiche wizard ConfigWizard
```

### Flow 2: Modification Configuration

```
Utilisateur modifie champ formulaire
    ↓
Event 'input' ou 'change'
    ↓
updateConfigFromForm(originalConfig)
    ↓
    ├─→ Parse FormData
    ├─→ Reconstruit objet avec types préservés
    ├─→ Stringify → textarea code
    ├─→ hasUnsavedChanges = true
    └─→ editor-save-btn.disabled = false
    
Utilisateur clique 💾 Sauvegarder
    ↓
saveCurrentFile()
    ↓
    ├─→ githubAdapter.updateFile()
    ├─→ storageManager.saveSettings() (localStorage)
    ├─→ Mise à jour richContent si mode RICH/SPLIT
    └─→ Message succès
```

### Flow 3: Switch Mode Vue

```
Utilisateur clique bouton mode (</>, 👁️, ⬌)
    ↓
Event handler sur .view-mode-btn
    ↓
switchEditorMode(mode)
    ↓
    ├─→ Met à jour classes .active sur boutons
    ├─→ Set attribute [data-mode] sur #editor-container
    ├─→ Si mode RICH ou SPLIT:
    │       ↓
    │       getRichView(content, fileType)
    │       ↓
    │       Render nouveau contenu enrichi
    │
    └─→ CSS gère display: none/block automatiquement
```

### Flow 4: Calendrier → Journal

```
Utilisateur clique sur jour calendrier
    ↓
loadJournalByDate(date)
    ↓
Génère path: journals/yyyy-mm-dd.md
    ↓
    ├─→ Fichier existe?
    │   ├─→ OUI: githubAdapter.getFile()
    │   └─→ NON: Crée contenu template avec date
    │
    ↓
openInEditor(path, content)
    ↓
detectFileType() → FILE_TYPES.JOURNAL
    ↓
switchEditorMode(VIEW_MODES.RICH) ou dernière préférence
    ↓
Affiche markdown rendu avec MarkdownIt
```

---

## 🚨 Points de Vigilance (Leçons v0.0.20-v0.0.21)

### 1. Gestion CSS Display

**❌ MAUVAISE APPROCHE**:
```html
<div id="editor-rich-view" class="editor-pane hidden">
```
→ Classe `.hidden` avec `!important` surpasse tout CSS

**✅ BONNE APPROCHE**:
```html
<div id="editor-rich-view" class="editor-pane">
```
→ Laisser CSS `[data-mode]` gérer

### 2. Event Listeners

**❌ MAUVAIS**:
```javascript
document.getElementById('modal-cancel-btn').addEventListener(...)
// Si modal-cancel-btn n'existe plus → crash silencieux
```

**✅ BON**:
```javascript
// Avant d'attacher listener, vérifier existence
const btn = document.getElementById('modal-cancel-btn');
if (btn) {
    btn.addEventListener(...);
}

// OU utiliser delegation
document.addEventListener('click', (e) => {
    if (e.target.matches('#modal-cancel-btn')) {
        // Handle
    }
});
```

### 3. Layout Flexbox Header

**❌ MAUVAIS** (v0.0.20):
```css
.editor-header {
    justify-content: flex-end;  /* Tout à droite */
}
.editor-tabs { 
    margin: 0 auto;  /* Centré mais conflit */
}
```

**✅ BON** (v0.0.22):
```css
.editor-header {
    display: flex;
    justify-content: space-between;  /* Titre gauche, contrôles droite */
    align-items: center;
}
```

### 4. Préservation des Types JSON

**❌ MAUVAIS**:
```javascript
config[key] = formData.get(key);  // Tout devient string
```

**✅ BON**:
```javascript
if (typeof originalValue === 'boolean') {
    config[key] = value === 'on' || value === 'true';
} else if (typeof originalValue === 'number') {
    config[key] = Number(value);
} else {
    config[key] = value;
}
```

---

## 📦 Modules et Dépendances

### GitHubAdapter (lib/github-adapter.js)

**Interface**:
```javascript
configure(settings): void
isConfigured(): boolean
request(endpoint, options): Promise<Response>
getFile(path): Promise<{content, sha}>
updateFile(path, content, message?): Promise
createFile(path, content, message?): Promise
deleteFile(path, message?): Promise
listFiles(path): Promise<Array>
getCommits(path, options?): Promise<Array>
```

**Base URLs par Plateforme**:
- GitHub: `https://api.github.com`
- Bitbucket: `https://api.bitbucket.org/2.0`
- GitLab: `https://gitlab.com/api/v4`
- Gitea: `${baseUrl}/api/v1`

### StorageManager (lib/storage.js)

**Interface**:
```javascript
init(): Promise<void>
cacheFile(path, content, sha): Promise
getCachedFile(path): Promise<{path, content, sha, timestamp}>
clearCache(): Promise
saveSettings(settings): void
getSettings(): Object|null
clearSettings(): void
addRecentPage(pageName): void
getRecentPages(): Array<string>
```

**Stores**:
- **IndexedDB**: `PensineDB` v1
  - `files`: {path, content, sha, timestamp}
  - `metadata`: {key, value}
- **localStorage**: 
  - `pensine-settings`: Configuration JSON
  - `pensine-recent`: Array pages récentes
  - `editorViewMode`: Dernière vue éditeur

### ConfigWizard (lib/config-wizard.js)

**Interface**:
```javascript
show(): void
hide(): void
renderStep(): void
nextStep(): void
previousStep(): void
complete(): Promise<void>
```

**État**:
```javascript
{
    currentStep: number,
    config: {
        platform: string,
        git: { token, owner, repo, branch },
        paths: { defaultPath },
        ergonomie: { theme, autoSync, autoSave }
    }
}
```

---

## 🎨 Thèmes et Variables CSS

### Variables Principales
```css
:root {
    --bg-primary: #0d1117;
    --bg-secondary: #161b22;
    --bg-tertiary: #21262d;
    
    --text: #e6edf3;
    --text-secondary: #7d8590;
    --text-muted: #484f58;
    
    --border: #30363d;
    --border-hover: #484f58;
    
    --accent-primary: #238636;
    --accent-hover: #2ea043;
    
    --link: #58a6ff;
    --link-hover: #79c0ff;
}
```

### Responsive Breakpoints
```css
@media (max-width: 768px) {
    /* Mobile adjustments */
}

@media (max-width: 480px) {
    /* Small mobile */
}
```

---

## 🔐 Sécurité

### Token Storage
- **localStorage**: Token en clair (acceptable pour app locale)
- **⚠️ Jamais committer** `.pensine-config.json` avec token

### CORS
- GitHub API: CORS activé
- Pour autres plateformes: Vérifier headers CORS

### Rate Limiting
- GitHub: 5000 req/h (authentifié)
- Bitbucket: 1000 req/h
- GitLab: 2000 req/10 min

---

## 📝 Conventions de Code

### Naming
- Classes: PascalCase (`PensineApp`, `StorageManager`)
- Fonctions: camelCase (`openInEditor`, `saveCurrentFile`)
- Constantes: UPPER_SNAKE_CASE (`FILE_TYPES`, `VIEW_MODES`)
- CSS classes: kebab-case (`editor-header`, `view-mode-btn`)

### Commentaires
```javascript
/**
 * Description de la fonction
 * @param {Type} param - Description
 * @returns {Type} Description
 */
function exemple(param) {
    // Commentaire implémentation
}
```

### Commits
Format: `type: Description courte`
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction bug
- `refactor`: Refactorisation
- `docs`: Documentation
- `style`: CSS/UI
- `test`: Tests

---

## 🚀 Performance

### Optimisations Actuelles
1. **IndexedDB Cache**: Évite requêtes API répétées
2. **Chargement Progressif**: Calendrier charge par tranches
3. **Debounce**: Éviter saves multiples rapides
4. **localStorage Fallback**: Accès instantané config

### Métriques Cibles
- Temps chargement initial: < 2s
- Temps switch vue éditeur: < 100ms
- Temps ouverture journal: < 500ms (avec cache)

---

## 📚 Références API

### GitHub REST API v3
- Docs: https://docs.github.com/en/rest
- Endpoints utilisés:
  - `GET /repos/{owner}/{repo}/contents/{path}`
  - `PUT /repos/{owner}/{repo}/contents/{path}`
  - `DELETE /repos/{owner}/{repo}/contents/{path}`
  - `GET /repos/{owner}/{repo}/commits`

### MarkdownIt
- Docs: https://markdown-it.github.io/
- Plugins: markdown-it-anchor
- Config: `{ html: true, breaks: true, linkify: true }`

### Highlight.js
- Docs: https://highlightjs.org/
- Theme: github-dark
- Langage detection: Automatique

---

## 🔄 Version Actuelle: v0.0.22

**Tag Stable**: `v0.0.21-stable` (point de restauration)

**Changements depuis v0.0.21**:
- Restauration structure v0.0.19 (boutons mode)
- Fix: Charger config depuis localStorage prioritaire
- Fix: Formulaire config sans boutons redondants
- Fix: Synchronisation live formulaire ↔ code
- Fix: Mode RICH forcé pour fichiers CONFIG

**Prochaines Étapes**:
- [ ] Implémenter tests automatisés
- [ ] Améliorer wizard (validation, preview)
- [ ] Support multi-repos
- [ ] PWA (offline support)
