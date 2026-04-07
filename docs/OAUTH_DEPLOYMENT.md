# Guide de Déploiement OAuth - Pensine Web

## 🎯 Vue d'Ensemble

Ce guide vous permet de configurer l'authentification OAuth pour Pensine Web avec GitHub, en utilisant Cloudflare Workers comme backend serverless.

## 📋 Prérequis

- Compte GitHub
- Compte Cloudflare (gratuit)
- Node.js 18+ installé
- `wrangler` CLI : `npm install -g wrangler`

## 🔧 Étape 1 : Créer une GitHub OAuth App

### 1.1 Accéder aux Paramètres Développeur

1. Allez sur <https://github.com/settings/developers>
2. Cliquez sur **"OAuth Apps"**
3. Cliquez sur **"New OAuth App"**

### 1.2 Configuration de l'Application

Remplissez le formulaire :

**Pour le développement local :**

```
Application name: Pensine Web (Development)
Homepage URL: http://localhost:8001
Authorization callback URL: http://localhost:8001/oauth/callback
Application description: Personal knowledge management with GitHub
```

**Pour la production :**

```
Application name: Pensine Web
Homepage URL: https://pensine.dev
Authorization callback URL: https://pensine.dev/oauth/callback
Application description: Personal knowledge management with GitHub
```

### 1.3 Récupérer les Credentials

Après création, vous obtenez :

- ✅ **Client ID** : `Ov23li...` (public, peut être commité)
- ⚠️ **Client Secret** : `gho_...` (privé, NE JAMAIS commiter)

**Générez le Client Secret** et copiez-le immédiatement (impossible de le revoir).

```bash
# Sauvegardez-les temporairement
export GITHUB_CLIENT_ID="Ov23li..."
export GITHUB_CLIENT_SECRET="gho_..."
```

## 🚀 Étape 2 : Déployer le Cloudflare Worker

### 2.1 Installation de Wrangler

```bash
npm install -g wrangler

# Login Cloudflare
wrangler login
```

### 2.2 Créer un KV Namespace

```bash
# Créer le namespace pour stocker les refresh tokens
wrangler kv:namespace create "OAUTH_TOKENS"

# Notez l'ID retourné (ex: a1b2c3d4...)
```

### 2.3 Configurer wrangler.toml

```bash
cd workers

# Éditer wrangler.toml
nano wrangler.toml
```

Remplacez `your-kv-namespace-id` par l'ID du namespace créé :

```toml
kv_namespaces = [
    { binding = "OAUTH_TOKENS", id = "a1b2c3d4..." }
]
```

### 2.4 Ajouter les Secrets

```bash
# Ajouter le Client ID
wrangler secret put GITHUB_CLIENT_ID
# Collez votre Client ID quand demandé

# Ajouter le Client Secret
wrangler secret put GITHUB_CLIENT_SECRET
# Collez votre Client Secret quand demandé
```

### 2.5 Déployer le Worker

```bash
wrangler publish
```

Vous obtenez une URL comme : `https://pensine-oauth-worker.your-account.workers.dev`

### 2.6 Tester le Worker

```bash
curl https://pensine-oauth-worker.your-account.workers.dev/api/oauth/verify
# Devrait retourner : {"error":"Missing or invalid Authorization header"}
```

## 🔗 Étape 3 : Configurer le Frontend

### 3.1 Ajouter le Client ID au Frontend

Éditez `config.js` :

```javascript
// GitHub OAuth Configuration
window.GITHUB_OAUTH_CLIENT_ID = 'Ov23li...'; // Votre Client ID

// OAuth API Endpoint (Worker URL)
window.GITHUB_OAUTH_API = 'https://pensine-oauth-worker.your-account.workers.dev';
```

### 3.2 Ajouter le Script OAuth au HTML

Éditez `index.html` et ajoutez avant `</body>` :

```html
<!-- GitHub OAuth -->
<script src="lib/github-oauth.js"></script>
```

### 3.3 Modifier github-adapter.js

Le `GitHubAdapter` doit maintenant utiliser `githubOAuth` au lieu du PAT :

```javascript
async request(endpoint, options = {}) {
    // Obtenir un token valide via OAuth
    const token = await githubOAuth.getToken();

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers
    };

    // ... reste du code
}
```

## 🧪 Étape 4 : Tester l'Authentification

### 4.1 Lancer le Serveur de Développement

```bash
python3 -m http.server 8001
```

### 4.2 Ouvrir Pensine

```
http://localhost:8001
```

### 4.3 Se Connecter

1. Cliquez sur **"Se connecter avec GitHub"**
2. Autorisez l'application sur GitHub
3. Vous êtes redirigé vers Pensine authentifié

### 4.4 Vérifier le Token

Ouvrez DevTools Console :

```javascript
// Vérifier l'authentification
githubOAuth.isAuthenticated()
// Devrait retourner : true

// Vérifier qu'il n'y a PAS de token dans localStorage
localStorage.getItem('github-token')
// Devrait retourner : null ✅ Sécurisé !
```

## 🔄 Étape 5 : Migration des Utilisateurs Existants

### 5.1 Créer un Script de Migration

```javascript
// migrate-to-oauth.js
async function migrateToOAuth() {
    // Vérifier si utilisateur a un ancien token PAT
    const oldToken = localStorage.getItem('github-token');

    if (oldToken) {
        alert(
            'Pensine utilise maintenant OAuth pour plus de sécurité.\n\n' +
            'Votre ancien token sera supprimé.\n' +
            'Veuillez vous reconnecter avec GitHub OAuth.'
        );

        // Supprimer l'ancien token
        localStorage.removeItem('github-token');
        localStorage.removeItem('github-owner');
        localStorage.removeItem('github-repo');

        // Rediriger vers OAuth
        githubOAuth.login();
    }
}

// Exécuter au chargement
document.addEventListener('DOMContentLoaded', migrateToOAuth);
```

### 5.2 Ajouter au HTML

```html
<script src="lib/migrate-to-oauth.js"></script>
```

## 📊 Étape 6 : Monitoring et Logs

### 6.1 Logs Cloudflare

```bash
# Voir les logs en temps réel
wrangler tail
```

### 6.2 Métriques

Dashboard Cloudflare → Workers → pensine-oauth-worker :

- Requêtes par seconde
- Taux d'erreur
- Latence

### 6.3 Alertes (Optionnel)

Configurer des alertes si :

- Taux d'erreur > 5%
- Latence > 1000ms
- Échecs d'authentification > 10/min

## 🔐 Étape 7 : Sécurité Production

### 7.1 Restreindre les CORS

Éditez `workers/oauth.js` :

```javascript
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': 'https://pensine.dev', // Votre domaine uniquement
    // ...
};
```

### 7.2 Rate Limiting

Ajoutez au Worker :

```javascript
// Limiter à 100 requêtes par IP par heure
const rateLimit = await env.RATE_LIMITER.get(clientIP);
if (rateLimit > 100) {
    return new Response('Too Many Requests', { status: 429 });
}
```

### 7.3 Monitoring GitHub

Vérifier régulièrement :

- <https://github.com/settings/applications>
- Révoquer les tokens suspects

## 🚨 Dépannage

### Erreur : "Invalid state parameter"

**Cause** : Le state OAuth a été modifié (CSRF attack ou session expirée)

**Solution** :

```javascript
// Nettoyer la session
sessionStorage.clear();
// Réessayer
githubOAuth.login();
```

### Erreur : "Token refresh failed"

**Cause** : Refresh token expiré (après 60 jours d'inactivité)

**Solution** : Se reconnecter

```javascript
githubOAuth.login();
```

### Worker ne déploie pas

**Vérifier** :

```bash
# Tester localement d'abord
wrangler dev

# Vérifier les secrets
wrangler secret list
```

### Callback URL mismatch

**Cause** : L'URL de callback ne correspond pas à celle configurée sur GitHub

**Solution** : Vérifier que les URLs correspondent exactement :

- GitHub OAuth App callback URL
- `getCallbackUrl()` dans `github-oauth.js`
- Routes dans `wrangler.toml`

## 📚 Ressources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [GitHub OAuth Flow](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps)
- [OWASP OAuth Security](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)

## 💡 Alternatives au Cloudflare Worker

Si vous préférez un autre provider :

### Vercel Edge Functions

```javascript
// api/oauth/token.js
export default async function handler(req, res) {
    // Même logique que le Worker
}
```

### AWS Lambda + API Gateway

```javascript
// lambda/oauth.js
exports.handler = async (event) => {
    // Même logique que le Worker
};
```

### Netlify Functions

```javascript
// netlify/functions/oauth.js
exports.handler = async (event) => {
    // Même logique que le Worker
};
```

## ✅ Checklist Finale

Avant de mettre en production :

- [ ] GitHub OAuth App créée
- [ ] Client Secret stocké de manière sécurisée
- [ ] Cloudflare Worker déployé
- [ ] KV namespace créé et configuré
- [ ] Secrets ajoutés (CLIENT_ID, CLIENT_SECRET)
- [ ] Frontend configuré avec Client ID
- [ ] CORS restreint au domaine production
- [ ] Tests d'authentification réussis
- [ ] Migration testée
- [ ] Documentation mise à jour
- [ ] Monitoring configuré

---

**Questions ?** Ouvrir une issue sur <https://github.com/stephanedenis/pensine-web/issues>

**Support** : Rejoindre notre Discord (lien dans README)

Bonne migration OAuth ! 🎉🔒
