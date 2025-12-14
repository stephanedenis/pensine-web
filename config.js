/**
 * Configuration initiale pour Pensine
 * Le token sera demandé au premier lancement et stocké localement dans le navigateur
 */

// Configuration par défaut (sans token ni informations personnelles)
window.PENSINE_DEFAULT_CONFIG = {
    owner: '',
    repo: '',
    branch: 'master',
    autoSync: false
};

// Token à configurer au premier lancement via wizard
// NEVER hardcode tokens here - use wizard or .pensine-config.json
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
