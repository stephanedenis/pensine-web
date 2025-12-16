/**
 * Cloudflare Worker - OAuth Handler for Pensine Web
 *
 * Déploiement :
 * 1. npm install -g wrangler
 * 2. wrangler login
 * 3. wrangler publish
 *
 * Variables d'environnement (wrangler.toml) :
 * - GITHUB_CLIENT_ID
 * - GITHUB_CLIENT_SECRET
 * - ALLOWED_ORIGINS
 */

// Configuration CORS
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // À restreindre en production
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true'
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Gérer les requêtes OPTIONS (preflight CORS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: CORS_HEADERS
      });
    }

    try {
      // Route 1: Exchange authorization code for access token
      if (url.pathname === '/api/oauth/token' && request.method === 'POST') {
        return await handleTokenExchange(request, env);
      }

      // Route 2: Refresh access token
      if (url.pathname === '/api/oauth/refresh' && request.method === 'POST') {
        return await handleTokenRefresh(request, env);
      }

      // Route 3: Revoke token (logout)
      if (url.pathname === '/api/oauth/revoke' && request.method === 'POST') {
        return await handleTokenRevoke(request, env);
      }

      // Route 4: Verify token
      if (url.pathname === '/api/oauth/verify' && request.method === 'GET') {
        return await handleTokenVerify(request, env);
      }

      // 404 pour autres routes
      return new Response('Not Found', {
        status: 404,
        headers: CORS_HEADERS
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS
        }
      });
    }
  }
};

/**
 * Échange le code d'autorisation contre un access token
 */
async function handleTokenExchange(request, env) {
  const body = await request.json();
  const { code, redirect_uri } = body;

  if (!code) {
    return jsonResponse({ error: 'Missing authorization code' }, 400);
  }

  try {
    // Échanger le code contre un token via GitHub
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: redirect_uri
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return jsonResponse({
        error: tokenData.error,
        message: tokenData.error_description
      }, 400);
    }

    // Générer un refresh token sécurisé
    const refreshToken = await generateSecureToken();

    // Stocker le refresh token dans KV (Cloudflare Key-Value storage)
    // Expire après 60 jours
    if (env.OAUTH_TOKENS) {
      await env.OAUTH_TOKENS.put(
        `refresh:${refreshToken}`,
        JSON.stringify({
          access_token: tokenData.access_token,
          created_at: Date.now()
        }),
        { expirationTtl: 60 * 24 * 60 * 60 } // 60 jours
      );
    }

    // Retourner le access token au client
    // Le refresh token est envoyé en cookie HttpOnly
    const response = jsonResponse({
      access_token: tokenData.access_token,
      expires_in: 3600, // 1 heure (GitHub tokens n'expirent pas mais on impose une limite)
      token_type: 'bearer',
      scope: tokenData.scope
    });

    // Ajouter le refresh token en cookie HttpOnly sécurisé
    response.headers.append('Set-Cookie',
      `refresh_token=${refreshToken}; ` +
      `HttpOnly; ` +
      `Secure; ` +
      `SameSite=Strict; ` +
      `Max-Age=${60 * 24 * 60 * 60}; ` + // 60 jours
      `Path=/`
    );

    return response;

  } catch (error) {
    console.error('Token exchange error:', error);
    return jsonResponse({
      error: 'token_exchange_failed',
      message: error.message
    }, 500);
  }
}

/**
 * Rafraîchit un access token avec le refresh token
 */
async function handleTokenRefresh(request, env) {
  // Extraire le refresh token du cookie
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const refreshToken = cookies.refresh_token;

  if (!refreshToken) {
    return jsonResponse({ error: 'Missing refresh token' }, 401);
  }

  try {
    // Récupérer le token stocké depuis KV
    if (!env.OAUTH_TOKENS) {
      return jsonResponse({ error: 'Token storage not configured' }, 500);
    }

    const storedData = await env.OAUTH_TOKENS.get(`refresh:${refreshToken}`, 'json');

    if (!storedData) {
      return jsonResponse({
        error: 'Invalid or expired refresh token',
        message: 'Please login again'
      }, 401);
    }

    // Vérifier que le token GitHub est toujours valide
    const verifyResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${storedData.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!verifyResponse.ok) {
      // Token révoqué ou invalide
      await env.OAUTH_TOKENS.delete(`refresh:${refreshToken}`);
      return jsonResponse({
        error: 'Token revoked',
        message: 'Please login again'
      }, 401);
    }

    // Retourner le même access token (GitHub tokens ne se rafraîchissent pas)
    // En production OAuth, on générerait un nouveau token
    return jsonResponse({
      access_token: storedData.access_token,
      expires_in: 3600,
      token_type: 'bearer'
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return jsonResponse({
      error: 'token_refresh_failed',
      message: error.message
    }, 500);
  }
}

/**
 * Révoque un token (logout)
 */
async function handleTokenRevoke(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const refreshToken = cookies.refresh_token;

  if (refreshToken && env.OAUTH_TOKENS) {
    // Supprimer le refresh token du storage
    await env.OAUTH_TOKENS.delete(`refresh:${refreshToken}`);
  }

  // Supprimer le cookie
  const response = jsonResponse({ success: true });
  response.headers.append('Set-Cookie',
    'refresh_token=; ' +
    'HttpOnly; ' +
    'Secure; ' +
    'SameSite=Strict; ' +
    'Max-Age=0; ' +
    'Path=/'
  );

  return response;
}

/**
 * Vérifie la validité d'un token
 */
async function handleTokenVerify(request, env) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('token ')) {
    return jsonResponse({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.substring(6); // Remove 'token ' prefix

  try {
    // Vérifier auprès de GitHub
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      return jsonResponse({
        valid: false,
        error: 'Token invalid or expired'
      }, 401);
    }

    const userData = await response.json();

    return jsonResponse({
      valid: true,
      user: {
        login: userData.login,
        id: userData.id,
        name: userData.name,
        email: userData.email
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return jsonResponse({
      error: 'verification_failed',
      message: error.message
    }, 500);
  }
}

/**
 * Génère un token sécurisé aléatoire
 */
async function generateSecureToken() {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse les cookies d'une requête
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = value;
    });
  }
  return cookies;
}

/**
 * Crée une réponse JSON avec headers CORS
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
}
