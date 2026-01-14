# 📦 Guide de Publication NPM - @panini/plugin-interface

## TL;DR - Publication en 3 commandes

```bash
cd packages/plugin-interface
npm login
npm publish --tag alpha
```

## Prérequis

### 1. Compte NPM

Si vous n'avez pas de compte:
1. Créer un compte sur https://www.npmjs.com/signup
2. Vérifier votre email
3. Activer 2FA (recommandé)

### 2. Accès au package

Pour publier sous le scope `@panini`:
- Soit: Créer l'organisation `panini` sur NPM (Settings → Organizations)
- Soit: Publier sous votre username personnel en modifiant `package.json`:
  ```json
  {
    "name": "@votre-username/plugin-interface"
  }
  ```

---

## Étape par Étape

### Étape 1: Login NPM

```bash
cd packages/plugin-interface
npm login
```

**Prompt:**
```
Username: votre-username
Password: ******
Email: votre@email.com
Enter one-time password: 123456  # Si 2FA activé
```

**Vérification:**
```bash
npm whoami
# Output: votre-username
```

### Étape 2: Dry Run (Optionnel mais recommandé)

```bash
npm publish --dry-run --tag alpha
```

**Vérifier dans l'output:**
- ✅ Fichiers inclus sont corrects (dist/, src/, examples/, *.md)
- ✅ Fichiers exclus (node_modules/, *.test.ts, tsconfig.json)
- ✅ Package size raisonnable (~15-20 KB)

### Étape 3: Publication

```bash
npm publish --tag alpha
```

**Flags expliqués:**
- `--tag alpha`: Publie sous le tag "alpha" (n'affecte pas "latest")
  - Users doivent faire: `npm install @panini/plugin-interface@alpha`
  - Pas installé automatiquement par `npm install @panini/plugin-interface`

**Output attendu:**
```
npm notice 
npm notice 📦  @panini/plugin-interface@0.1.0-alpha.1
npm notice === Tarball Contents === 
npm notice ...
npm notice === Tarball Details === 
npm notice name:          @panini/plugin-interface
npm notice version:       0.1.0-alpha.1
npm notice ...
+ @panini/plugin-interface@0.1.0-alpha.1
```

### Étape 4: Vérification

#### Via NPM CLI

```bash
npm info @panini/plugin-interface

# Expected output:
# @panini/plugin-interface@0.1.0-alpha.1 | MIT | deps: 0 | versions: 1
# Common plugin interface for Panini ecosystem
# 
# dist-tags:
# alpha: 0.1.0-alpha.1
```

#### Via Web

1. Ouvrir https://www.npmjs.com/package/@panini/plugin-interface
2. Vérifier que version 0.1.0-alpha.1 apparaît
3. Vérifier que tag "alpha" est visible

### Étape 5: Test d'Installation

```bash
# Dans un répertoire temporaire
cd /tmp
mkdir test-panini-install
cd test-panini-install
npm init -y

# Installer la version alpha
npm install @panini/plugin-interface@alpha

# Vérifier l'installation
ls node_modules/@panini/plugin-interface/
# Devrait contenir: dist/, src/, examples/, package.json, README.md

# Tester l'import
node -e "
const { PaniniEvents } = require('@panini/plugin-interface');
console.log('Events imported:', Object.keys(PaniniEvents).length);
"
# Output: Events imported: 12
```

---

## Troubleshooting

### Erreur: "You must be logged in to publish"

**Solution:**
```bash
npm login
npm whoami  # Vérifier que vous êtes bien loggé
```

### Erreur: "403 Forbidden - @panini/plugin-interface"

**Cause**: Package scopé (@panini) nécessite accès à l'organisation.

**Solution 1** - Créer l'organisation:
1. Aller sur https://www.npmjs.com/settings/organizations/create
2. Créer l'organisation "panini"
3. Ajouter votre compte comme membre

**Solution 2** - Publier sous votre username:
```json
// package.json
{
  "name": "@stephanedenis/plugin-interface",  // Remplacer par votre username
  "publishConfig": {
    "access": "public"
  }
}
```

### Erreur: "Version 0.1.0-alpha.1 already exists"

**Cause**: Version déjà publiée (impossible de republier).

**Solution** - Bump la version:
```bash
npm version 0.1.0-alpha.2
# ou
npm version prerelease --preid=alpha
# Génère 0.1.0-alpha.2 automatiquement

npm publish --tag alpha
```

### Erreur: "Package size exceeds maximum"

**Cause**: Fichiers trop volumineux inclus.

**Solution** - Vérifier .npmignore:
```bash
# Voir ce qui sera inclus
npm pack --dry-run

# Exclure des fichiers
echo "node_modules/" >> .npmignore
echo "*.test.ts" >> .npmignore
echo "coverage/" >> .npmignore
```

### Package n'apparaît pas sur npmjs.com

**Cause**: CDN propagation delay (1-2 minutes).

**Solution**:
- Attendre 2 minutes
- Vider le cache navigateur
- Vérifier avec CLI: `npm info @panini/plugin-interface`

---

## Après la Publication

### 1. Créer GitHub Release

```bash
cd /home/stephane/GitHub/pensine-web

# Tag Git
git tag v0.1.0-alpha.1
git push origin v0.1.0-alpha.1

# Créer release sur GitHub UI:
# https://github.com/stephanedenis/pensine-web/releases/new
```

**Release Notes Template:**
```markdown
## 🎉 @panini/plugin-interface v0.1.0-alpha.1

First alpha release of the common plugin interface for Panini ecosystem!

### 🌟 Features
- TypeScript interfaces for cross-platform plugins
- EventBus with namespace cleanup
- ConfigManager with JSON Schema validation
- StorageAdapter abstraction
- Health monitoring

### 📦 Installation
```bash
npm install @panini/plugin-interface@alpha
```

### 📚 Documentation
- [README](packages/plugin-interface/README.md)
- [Architecture](packages/plugin-interface/ARCHITECTURE.md)
- [Quick Reference](packages/plugin-interface/QUICKREF.md)
- [Examples](packages/plugin-interface/examples/)

### ⚠️ Alpha Release
This is an alpha release. API may change before 1.0.0.
Feedback welcome via [issues](https://github.com/stephanedenis/pensine-web/issues)!
```

### 2. Mettre à jour Pensine

```bash
cd /home/stephane/GitHub/pensine-web

# Ajouter dépendance
npm install @panini/plugin-interface@alpha

# Mettre à jour imports
# Remplacer les imports locaux par imports NPM
```

**Avant:**
```javascript
// Dans src/core/panini-wrappers.js
import { PaniniPlugin } from '../../packages/plugin-interface/dist/index.js';
```

**Après:**
```javascript
import { PaniniPlugin } from '@panini/plugin-interface';
```

### 3. Tester en Production

```bash
# Lancer Pensine
python3 -m http.server 8000

# Dans console navigateur:
> listPlugins()
> await enablePlugin('word-counter')
> getPluginConfig('word-counter')
```

### 4. Annoncer

**Discord/Slack:**
```
🚀 @panini/plugin-interface v0.1.0-alpha.1 is live on NPM!

First alpha of the common plugin interface for Panini ecosystem.
Write plugins that work across Pensine, OntoWave, and PaniniFS!

npm install @panini/plugin-interface@alpha

Docs: https://www.npmjs.com/package/@panini/plugin-interface
Feedback: https://github.com/stephanedenis/pensine-web/issues
```

---

## Versions Futures

### Alpha suivant (bug fixes)

```bash
npm version 0.1.0-alpha.2
npm run build
npm test
npm publish --tag alpha
```

### Beta (stabilisation API)

```bash
npm version 0.1.0-beta.1
npm run build
npm test
npm publish --tag beta
```

### Stable 1.0.0

```bash
npm version 1.0.0
npm run build
npm test
npm publish  # Pas de --tag, devient "latest"
```

---

## Ressources

- **NPM Docs**: https://docs.npmjs.com/cli/v9/commands/npm-publish
- **Semantic Versioning**: https://semver.org/
- **NPM Tags**: https://docs.npmjs.com/cli/v9/commands/npm-dist-tag
- **NPM Organizations**: https://docs.npmjs.com/creating-an-organization

---

**Préparé par**: GitHub Copilot + Stéphane Denis  
**Date**: 14 janvier 2026  
**Package**: @panini/plugin-interface v0.1.0-alpha.1
