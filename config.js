/**
 * Configuration initiale pour Pensine
 * OAuth Client ID configuré pour GitHub OAuth App
 */

// OAuth Configuration
// Remplacer par votre Client ID après avoir créé la GitHub OAuth App
window.GITHUB_OAUTH_CLIENT_ID = 'YOUR_GITHUB_OAUTH_CLIENT_ID';

// OAuth Callback URL (doit correspondre à ce qui est configuré dans GitHub OAuth App)
window.OAUTH_CALLBACK_URL = window.location.origin + '/oauth-callback.html';

// Cloudflare Worker OAuth Backend URL
window.OAUTH_BACKEND_URL = 'https://pensine-oauth.YOUR_SUBDOMAIN.workers.dev';

// Configuration par défaut (sans token ni informations personnelles)
window.PENSINE_DEFAULT_CONFIG = {
    owner: '',
    repo: '',
    branch: 'master',
    autoSync: false
};

// Token à configurer au premier lancement via wizard
// NEVER hardcode tokens here - use OAuth flow or wizard
window.PENSINE_INITIAL_TOKEN = null;

// Auto-configuration au chargement
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si des paramètres existent déjà
    const existingSettings = localStorage.getItem('pensine-settings');

    if (!existingSettings && window.PENSINE_INITIAL_TOKEN) {
        // Première utilisation : appliquer la config avec le token initial
        const initialConfig = {
            ...window.PENSINE_DEFAULT_CONFIG,
            token: window.PENSINE_INITIAL_TOKEN
        };
        localStorage.setItem('pensine-settings', JSON.stringify(initialConfig));
        console.log('✅ Configuration GitHub appliquée automatiquement');
        console.log('Token stocké localement dans le navigateur');
    }
});
