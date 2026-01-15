/**
 * GitHub OAuth Handler
 * Gère le flux OAuth avec GitHub de manière sécurisée
 */

class GitHubOAuth {
  constructor() {
    this.clientId = null;
    this.authEndpoint = 'https://github.com/login/oauth/authorize';
    this.tokenEndpoint = '/api/oauth/token'; // Proxied via Cloudflare Worker
    this.scopes = ['repo']; // Accès aux repositories
    this.accessToken = null; // Token en mémoire uniquement
    this.tokenExpiry = null;
  }

  /**
   * Configure OAuth avec Client ID
   * @param {string} clientId - GitHub OAuth App Client ID
   */
  configure(clientId) {
    this.clientId = clientId;
  }

  /**
   * Vérifie si OAuth est configuré
   * @returns {boolean}
   */
  isConfigured() {
    return !!this.clientId;
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   * @returns {boolean}
   */
  isAuthenticated() {
    if (!this.accessToken) return false;
    if (!this.tokenExpiry) return false;

    // Vérifier si le token n'a pas expiré
    return Date.now() < this.tokenExpiry;
  }

  /**
   * Initie le flux OAuth
   * Redirige l'utilisateur vers GitHub pour autorisation
   */
  async login() {
    if (!this.isConfigured()) {
      throw new Error('OAuth not configured. Client ID missing.');
    }

    // Générer un state aléatoire pour protection CSRF
    const state = this.generateState();
    sessionStorage.setItem('oauth_state', state);

    // Stocker l'URL de retour
    sessionStorage.setItem('oauth_return_url', window.location.pathname);

    // Construire l'URL d'autorisation
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.getCallbackUrl(),
      scope: this.scopes.join(' '),
      state: state,
      allow_signup: 'false' // Pas de création de compte
    });

    // Rediriger vers GitHub
    window.location.href = `${this.authEndpoint}?${params.toString()}`;
  }

  /**
   * Gère le callback OAuth après autorisation
   * @param {string} code - Authorization code de GitHub
   * @param {string} state - State pour vérification CSRF
   */
  async handleCallback(code, state) {
    // Vérifier le state (protection CSRF)
    const expectedState = sessionStorage.getItem('oauth_state');
    if (state !== expectedState) {
      throw new Error('Invalid state parameter. Possible CSRF attack.');
    }

    // Nettoyer le state
    sessionStorage.removeItem('oauth_state');

    try {
      // Échanger le code contre un access token
      // Ceci est fait via notre backend serverless pour sécurité
      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: code,
          redirect_uri: this.getCallbackUrl()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OAuth token exchange failed: ${error.message}`);
      }

      const data = await response.json();

      // Stocker le token en mémoire uniquement (pas dans localStorage)
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;

      // Stocker le refresh token dans un cookie HttpOnly (via backend)
      // Le refresh token ne sera jamais accessible au JavaScript

      console.log('✅ OAuth authentication successful');

      // Rediriger vers l'URL de retour
      const returnUrl = sessionStorage.getItem('oauth_return_url') || '/';
      sessionStorage.removeItem('oauth_return_url');
      window.location.href = returnUrl;

    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }

  /**
   * Rafraîchit le access token avec le refresh token
   * Le refresh token est stocké dans un cookie HttpOnly côté serveur
   */
  async refreshToken() {
    try {
      const response = await fetch('/api/oauth/refresh', {
        method: 'POST',
        credentials: 'include' // Inclure les cookies HttpOnly
      });

      if (!response.ok) {
        // Refresh failed, besoin de se reconnecter
        this.logout();
        throw new Error('Token refresh failed. Please login again.');
      }

      const data = await response.json();

      // Mettre à jour le token en mémoire
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;

      console.log('✅ Token refreshed successfully');
      return this.accessToken;

    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Obtient un access token valide (rafraîchit si nécessaire)
   * @returns {Promise<string>} Access token
   */
  async getToken() {
    // Si pas de token, demander login
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login.');
    }

    // Si token va expirer dans moins de 5 minutes, rafraîchir
    const fiveMinutes = 5 * 60 * 1000;
    if (this.tokenExpiry && (this.tokenExpiry - Date.now()) < fiveMinutes) {
      await this.refreshToken();
    }

    return this.accessToken;
  }

  /**
   * Déconnexion - révoque le token et nettoie la session
   */
  async logout() {
    try {
      // Révoquer le token côté serveur
      await fetch('/api/oauth/revoke', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Token revocation error:', error);
    }

    // Nettoyer l'état local
    this.accessToken = null;
    this.tokenExpiry = null;
    sessionStorage.clear();

    console.log('✅ Logged out successfully');
  }

  /**
   * Génère un state aléatoire pour protection CSRF
   * @returns {string} State random
   */
  generateState() {
    // Utiliser Web Crypto API pour génération sécurisée
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Obtient l'URL de callback OAuth
   * @returns {string} Callback URL
   */
  getCallbackUrl() {
    const origin = window.location.origin;
    return `${origin}/oauth/callback`;
  }

  /**
   * Vérifie si on est sur la page de callback
   * @returns {boolean}
   */
  isCallbackPage() {
    return window.location.pathname === '/oauth/callback';
  }

  /**
   * Parse les paramètres OAuth de l'URL
   * @returns {Object} {code, state, error}
   */
  parseCallbackParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      code: params.get('code'),
      state: params.get('state'),
      error: params.get('error'),
      error_description: params.get('error_description')
    };
  }
}

// Singleton instance
const githubOAuth = new GitHubOAuth();

// Auto-configuration au chargement si Client ID disponible
document.addEventListener('DOMContentLoaded', () => {
  const clientId = window.GITHUB_OAUTH_CLIENT_ID || null;
  if (clientId) {
    githubOAuth.configure(clientId);
    console.log('✅ GitHub OAuth configured');
  }

  // Gérer automatiquement le callback OAuth si on est sur la page
  if (githubOAuth.isCallbackPage()) {
    const params = githubOAuth.parseCallbackParams();

    if (params.error) {
      console.error('OAuth error:', params.error_description || params.error);
      // Rediriger vers la page d'accueil avec message d'erreur
      window.location.href = '/?oauth_error=' + encodeURIComponent(params.error);
    } else if (params.code && params.state) {
      // Gérer le callback
      githubOAuth.handleCallback(params.code, params.state)
        .catch(error => {
          console.error('OAuth callback handling failed:', error);
          window.location.href = '/?oauth_error=callback_failed';
        });
    }
  }
});

// Exposer globalement
window.githubOAuth = githubOAuth;
