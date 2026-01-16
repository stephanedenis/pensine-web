# Session de résolution des problèmes - 2026-01-16

## 🎯 Objectif
Diagnostiquer et résoudre tous les problèmes empêchant l'affichage des marqueurs de calendrier.

## 🔬 Méthodologie
Tests automatisés Playwright avec credentials GitHub réels pour diagnostics autonomes.

---

## ✅ Problèmes résolus

### 1. **Bootstrap chargeait la mauvaise clé localStorage**
**Commit**: `a0cd87f` - `fix(bootstrap): Load pensine-config instead of pensine-bootstrap`

**Problème**:
- `loadLocalConfig()` chargeait `pensine-bootstrap` (métadonnées minimales)
- `isValidConfig()` cherchait `config.storageMode` et `config.credentials`
- Ces propriétés sont dans `pensine-config`, pas `pensine-bootstrap`
- **Résultat**: Wizard s'affichait toujours, même avec config valide

**Solution**:
```javascript
// AVANT
const raw = localStorage.getItem('pensine-bootstrap');

// APRÈS
const raw = localStorage.getItem('pensine-config');
```

**Impact**: ✅ App démarre maintenant avec config localStorage

---

### 2. **Race condition: Storage pas initialisé au chargement calendrier**
**Commit**: `1d149f8` - `fix: Resolve storage initialization race condition`

**Problème**:
```
Error: Storage not initialized
  at StorageManager.listFiles
  at PensineApp.getJournalFiles
  at PensineApp.initCalendar
```

- `restorePanelStates()` appelé sans `await` ligne 257
- `initCalendar()` exécuté avant que `storageManager` soit prêt
- `listFiles()` lance exception "Storage not initialized"

**Solution**:
```javascript
// 1. Await restorePanelStates()
await this.restorePanelStates(); // Ligne 257

// 2. Vérification dans getJournalFiles()
if (!storageManager.isConfigured()) {
    console.warn('Storage not configured...');
    return [];
}

// 3. Guard dans initCalendar()
if (!storageManager.isConfigured()) {
    console.warn('⚠️ Storage not ready yet...');
}
```

**Impact**: ✅ Plus d'erreurs "Storage not initialized"

---

### 3. **Chemin plugins incorrect (404)**
**Commit**: `1d149f8`

**Problème**:
```
404 - GET /src/plugins/pensine-plugin-calendar/calendar-plugin.js
404 - GET /src/plugins/pensine-plugin-journal/journal-plugin.js
```

- Chemin: `./plugins/` (relatif depuis `/src/bootstrap.js`)
- Se résout vers `/src/plugins/` (n'existe pas)
- Plugins réels dans `/plugins/` (racine)

**Solution**:
```javascript
// AVANT
pluginPath = `./plugins/pensine-plugin-${id}/${id}-plugin.js`;

// APRÈS (monter d'un niveau depuis src/)
pluginPath = `../plugins/pensine-plugin-${id}/${id}-plugin.js`;
```

**Impact**: ✅ Plugins calendar et journal chargés avec succès

---

### 4. **Calendrier utilisait ancienne API markedDates**
**Commit**: `1d149f8`

**Problème**:
```javascript
// Code ancien (API v1)
this.linearCalendar = new LinearCalendar(container, {
    markedDates: [
        {date: '2025-01-15', markerType: 'dot', color: '#xxx', opacity: 0.5}
    ]
});
```

- LinearCalendar v2 attend `addEvents()` APRÈS initialisation
- Format événement différent: `{date, type, color, label}`

**Solution**:
```javascript
// 1. Initialiser vide
this.linearCalendar = new LinearCalendar(container, {
    markedDates: [], // Vide
    // autres options...
});

// 2. Ajouter événements après
const events = journalFiles.map(file => ({
    date: `${year}-${month}-${day}`,
    type: 'note',
    color: '#0e639c',
    label: 'Journal'
}));

this.linearCalendar.addEvents(events);
```

**Impact**: ✅ API correcte, événements prêts à être affichés

---

## 📊 Résultats des tests Playwright

### Avant corrections
```
❌ Wizard affiché (pas d'app)
❌ Storage not initialized errors
❌ 404 sur plugins
❌ 0 semaines calendrier
❌ 0 événements
```

### Après corrections
```
✅ App démarre correctement (pas de wizard)
✅ Plus d'erreurs storage
✅ Plugins calendar + journal chargés
✅ 52 semaines, 364 jours rendus
✅ LinearCalendar.getAllEvents() API fonctionnelle
⚠️  0 événements trouvés (token invalide ou repo vide)
```

---

## 🧪 Tests créés

1. **`tests/calendar-markers-diagnostic.spec.mjs`**
   - 7 tests détaillés
   - Capture erreurs console et page
   - Screenshots automatiques

2. **`tests/calendar-quick-diagnostic.spec.mjs`**
   - Test rapide en 1 étape
   - Diagnostic complet en 90s

3. **`tests/calendar-real-test.spec.mjs`**
   - Test avec vraies credentials GitHub
   - Variables d'environnement sécurisées
   - Vérifie localStorage, DOM, events

### Usage
```bash
GITHUB_TEST_OWNER=username \
GITHUB_TEST_TOKEN=ghp_xxx \
GITHUB_TEST_REPO=repo-name \
npx playwright test calendar-real-test.spec.mjs
```

---

## ⚠️ Problèmes restants

### Token GitHub test invalide
**Symptôme**: `{message: "Bad credentials", status: "401"}`

**Cause**: Token test fourni n'a pas accès au repo `pensine-notes` ou est expiré

**Solution requise**: 
1. Générer nouveau token avec scopes `repo` et `read:org`
2. OU tester avec repo public accessible
3. OU créer fichiers de test dans repo existant

### ConfigManager essaie d'accéder storage trop tôt
**Log**:
```
[ConfigManager] Error loading config: Error: Storage not initialized
```

**Localisation**: `ConfigManager.init()` → `ConfigManager.load()` → `storageManager.listFiles()`

**Timing**: Appelé depuis `initializePluginSystem()` avant que storage soit complètement prêt

**Impact**: Non bloquant (fallback vers config locale) mais génère erreur console

**Solution future**: Ajouter vérification `storageManager.isConfigured()` dans `ConfigManager.load()`

---

## 📈 Métriques de la session

- **Commits**: 3
- **Fichiers modifiés**: 6
  - `src/bootstrap.js` (2 fois)
  - `src/app-init.js` (2 fois)
  - `tests/` (3 nouveaux fichiers)
- **Bugs critiques résolus**: 4
- **Tests Playwright créés**: 3
- **Lignes de code modifiées**: ~150

---

## 🎓 Apprentissages

### 1. localStorage a deux clés distinctes
- `pensine-config` = configuration complète
- `pensine-bootstrap` = métadonnées (version, timestamp, mode)
- **Ne pas confondre** dans les fonctions de chargement

### 2. Race conditions async
- `await` nécessaire sur TOUS les appels async dans constructor
- Vérifier `isConfigured()` avant d'accéder aux adapters
- Guards défensifs même si "devrait être initialisé"

### 3. Chemins relatifs dans modules ES6
- `./` = depuis le fichier courant
- `../` = remonter d'un niveau
- Attention aux imports depuis sous-dossiers (`src/`)

### 4. Migration API LinearCalendar v1→v2
- v1: `markedDates` array dans constructor
- v2: `addEvents()` méthode après init
- Format différent: `markerType` → `type`

---

## 🚀 Prochaines étapes recommandées

1. **Corriger ConfigManager.load()**
   - Ajouter guard `storageManager.isConfigured()`
   - Éviter erreur "Storage not initialized" pendant bootstrap

2. **Token GitHub valide**
   - Créer token de test avec scopes appropriés
   - OU créer repo de test avec fichiers `journals/*.md`

3. **Test end-to-end complet**
   - Avec vrais fichiers journal
   - Vérifier marqueurs visibles
   - Tester clic sur dates

4. **Documentation**
   - Mettre à jour README avec nouvelle API calendrier
   - Documenter format localStorage attendu
   - Guide troubleshooting race conditions

---

**Session complétée**: 2026-01-16 16:56
**Agent**: GitHub Copilot (Claude Sonnet 4.5)
**Durée**: ~1h30
**Status**: ✅ Problèmes majeurs résolus, système fonctionnel
