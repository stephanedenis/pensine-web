# Test Manuel du Système de Configuration

## Pré-requis
```bash
# Démarrer le serveur local
python3 -m http.server 8000

# Ouvrir dans navigateur
firefox http://localhost:8000
```

## Tests à Effectuer

### 1. Initialisation (Console Browser - F12)

Vérifier dans la console :
```javascript
// Doit afficher "✅ Modern configuration system initialized"
```

Vérifier les objets globaux :
```javascript
console.log('EventBus:', !!window.eventBus);
console.log('PluginSystem:', !!window.pluginSystem);
console.log('ModernConfigManager:', !!window.modernConfigManager);
console.log('SettingsView:', !!window.app.settingsView);
// Tous doivent retourner true
```

### 2. Ouverture du Panneau Settings

**Action** : Cliquer sur le bouton Settings (⚙️)

**Résultat attendu** :
- ✅ Modal overlay s'affiche
- ✅ Panneau centré avec titre "Settings"
- ✅ Sidebar avec tabs : "Core" visible
- ✅ Si plugin calendar chargé : tab "📅 Calendar" visible
- ✅ Bouton fermer (×) en haut à droite

### 3. Onglet Core

**Action** : Cliquer sur l'onglet "Core"

**Résultat attendu** :
- ✅ Formulaire avec champs :
  - Theme (select : auto/light/dark)
  - Language (select : fr/en)
  - Storage Mode (select : github/local)
- ✅ Valeurs actuelles pré-remplies
- ✅ Labels bien formatés

### 4. Modification et Sauvegarde

**Action** :
1. Modifier une valeur (ex: Language → en)
2. Cliquer sur "Save"

**Résultat attendu** :
- ✅ Notification "Settings saved successfully" (toast vert)
- ✅ Toast disparaît après 3 secondes
- ✅ Config sauvegardée dans localStorage
- ✅ Vérifier : `localStorage.getItem('pensine-settings')` contient les nouvelles valeurs

### 5. Reset Plugin Config

**Si plugin calendar disponible** :

**Action** :
1. Aller dans l'onglet "📅 Calendar"
2. Modifier une valeur
3. Cliquer sur "Reset to Defaults"

**Résultat attendu** :
- ✅ Valeurs reviennent aux defaults du plugin
- ✅ Notification "Settings reset to defaults"

### 6. Export Configuration

**Action** :
1. Cliquer sur "Export"

**Résultat attendu** :
- ✅ Téléchargement d'un fichier `pensine-config-YYYYMMDD-HHMMSS.json`
- ✅ Fichier contient structure JSON valide :
```json
{
  "core": { ... },
  "plugins": { ... }
}
```

### 7. Import Configuration

**Action** :
1. Modifier quelques valeurs
2. Cliquer sur "Import"
3. Sélectionner le fichier exporté précédemment

**Résultat attendu** :
- ✅ Dialog de sélection de fichier s'ouvre
- ✅ Après import : valeurs restaurées
- ✅ Notification "Configuration imported successfully"

### 8. Validation des Erreurs

**Action** :
1. Si champ numérique présent (ex: monthsToDisplay dans calendar)
2. Entrer valeur hors limites (ex: 20 alors que max=12)
3. Cliquer Save

**Résultat attendu** :
- ✅ Notification d'erreur (rouge)
- ✅ Message indique la contrainte violée
- ✅ Formulaire reste ouvert
- ✅ Valeur invalide non sauvegardée

### 9. Fermeture du Panneau

**Action** :
- Cliquer sur le bouton × en haut à droite
- OU cliquer sur l'overlay (fond gris transparent)
- OU appuyer sur Escape

**Résultat attendu** :
- ✅ Panneau se ferme avec transition
- ✅ Retour à la vue normale

### 10. Fallback si Modern Config Échoue

**Test de régression** :

**Action** :
1. Ouvrir DevTools
2. Dans Console, exécuter : `delete window.app.settingsView;`
3. Cliquer sur bouton Settings

**Résultat attendu** :
- ✅ Message console : "⚠️ Modern settings view not available, falling back to config editor"
- ✅ Éditeur JSON brut s'ouvre avec .pensine-config.json
- ✅ Application ne plante pas

## Résultats Attendus Global

Sur 10 tests :
- **10/10 ✅** : Système parfaitement opérationnel
- **8-9/10 ✅** : Fonctionnel, quelques détails à ajuster
- **<8/10** : Problèmes nécessitant debug

## Debugging en Cas d'Échec

### Console Errors
```javascript
// Vérifier les imports
console.log(window.modernConfigManager);
console.log(window.app.modernConfigManager);
console.log(window.app.settingsView);
```

### Check DOM
```javascript
// Vérifier que le CSS est chargé
const link = document.querySelector('link[href*="settings.css"]');
console.log('Settings CSS loaded:', !!link);

// Vérifier que les scripts sont chargés
console.log('Scripts:', Array.from(document.querySelectorAll('script[type="module"]')).map(s => s.src));
```

### Check localStorage
```javascript
// Voir la config actuelle
console.log(JSON.parse(localStorage.getItem('pensine-settings')));
```

## Prochaines Étapes Après Tests

Si tous les tests passent :
1. ✅ Committer les résultats
2. ✅ Pusher vers GitHub
3. ✅ Documenter dans journal de bord
4. ✅ Ajouter schémas de config aux autres plugins (inbox, journal, reflection)
