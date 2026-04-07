/**
 * GitHub OAuth Client - Module ESM
 * Gère le flux OAuth GitHub côté client avec protection CSRF
 *
 * @module github-oauth
 */

const OAUTH_STATE_KEY = 'pensine-oauth-state';
const OAUTH_TOKEN_KEY = 'pensine-oauth-token';
const OAUTH_AUTH_ENDPOINT = 'https://github.com/login/oauth/authorize';
const OAUTH_SCOPES = 'repo';
const TOKEN_EXCHANGE_ENDPOINT = '/api/auth/github';

/**
 * Génère un state CSRF sécurisé via Web Crypto API
 * @returns {string} Chaîne hexadécimale aléatoire de 64 caractères
 */
function generateSecureState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Initie le flux OAuth GitHub
 * Génère un state CSRF, le stocke en sessionStorage et redirige vers GitHub
 *
 * @param {string} clientId - GitHub OAuth App Client ID
 * @param {string} redirectUri - URL de callback OAuth
 */
function startFlow(clientId, redirectUri) {
  if (!clientId) {
    throw new Error('clientId is required');
  }
  if (!redirectUri) {
    throw new Error('redirectUri is required');
  }

  const state = generateSecureState();
  sessionStorage.setItem(OAUTH_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: OAUTH_SCOPES,
    state: state
  });

  window.location.href = `${OAUTH_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Gère le callback OAuth
 * Valide le state CSRF et retourne le code d'autorisation
 *
 * @returns {{ code: string, state: string }}
 * @throws {Error} Si le state CSRF est invalide ou si GitHub a retourné une erreur
 */
function handleCallback() {
  const params = new URLSearchParams(window.location.search);

  const error = params.get('error');
  if (error) {
    const errorDescription = params.get('error_description') || error;
    throw new Error(`OAuth error: ${errorDescription}`);
  }

  const code = params.get('code');
  const state = params.get('state');

  if (!code || !state) {
    throw new Error('Missing code or state in OAuth callback');
  }

  const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  if (!expectedState) {
    throw new Error('No CSRF state found in session. Possible replay attack.');
  }
  if (state !== expectedState) {
    throw new Error('State mismatch: possible CSRF attack');
  }

  sessionStorage.removeItem(OAUTH_STATE_KEY);

  return { code, state };
}

/**
 * Échange le code OAuth contre un access token
 * Appel placeholder vers /api/auth/github
 *
 * @param {string} code - Authorization code reçu de GitHub
 * @returns {Promise<{ token: string }>} Token d'accès
 */
async function exchangeToken(code) {
  if (!code) {
    throw new Error('code is required');
  }

  const response = await fetch(TOKEN_EXCHANGE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code })
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      message = data.error || data.message || message;
    } catch (_parseError) {
      // Ignorer les erreurs de parsing JSON : le message HTTP est déjà suffisant
    }
    throw new Error(`Token exchange failed: ${message}`);
  }

  const data = await response.json();
  const token = data.token || data.access_token;
  if (!token) {
    throw new Error('Token exchange response missing token');
  }

  return { token };
}

/**
 * Stocke le token dans sessionStorage
 * Le token n'est jamais écrit dans les logs ni dans l'URL
 *
 * @param {string} token - GitHub access token
 */
function storeToken(token) {
  if (!token) {
    throw new Error('token is required');
  }
  sessionStorage.setItem(OAUTH_TOKEN_KEY, token);
}

/**
 * Récupère le token depuis sessionStorage
 * ⚠️ Ne jamais logger la valeur retournée — elle contient un token GitHub sensible
 *
 * @returns {string|null} Token ou null si absent
 */
function getToken() {
  return sessionStorage.getItem(OAUTH_TOKEN_KEY);
}

/**
 * Déconnexion : supprime le token et les données OAuth de la session
 */
function logout() {
  sessionStorage.removeItem(OAUTH_TOKEN_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
}

const GitHubOAuth = {
  startFlow,
  handleCallback,
  exchangeToken,
  storeToken,
  getToken,
  logout
};

export default GitHubOAuth;
export { startFlow, handleCallback, exchangeToken, storeToken, getToken, logout };
