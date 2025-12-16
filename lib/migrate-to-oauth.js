/**
 * Migration Script - PAT to OAuth
 * Migre automatiquement les utilisateurs de Personal Access Token vers OAuth
 */

(async function migrateToOAuth() {
  // Attendre que le DOM soit chargé
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', migrateToOAuth);
    return;
  }

  console.log('🔍 Checking for legacy PAT...');

  // Vérifier si utilisateur a un ancien token PAT (chiffré)
  const oldToken = await window.tokenStorage.getToken();
  const oldOwner = localStorage.getItem('github-owner');
  const oldRepo = localStorage.getItem('github-repo');
  const oldBranch = localStorage.getItem('github-branch');

  // Si OAuth déjà configuré, ne rien faire
  if (window.githubOAuth && window.githubOAuth.isAuthenticated()) {
    console.log('✅ Already authenticated with OAuth');

    // Nettoyer les anciens tokens si présents
    if (oldToken) {
      console.log('🧹 Cleaning up old PAT...');
      await window.tokenStorage.removeToken();
      localStorage.removeItem('github-owner');
      localStorage.removeItem('github-repo');
      localStorage.removeItem('github-branch');
    }
    return;
  }

  // Si ancien token trouvé, proposer la migration
  if (oldToken) {
    console.log('⚠️ Legacy PAT found - migration required');

    // Sauvegarder la config pour après migration
    const legacyConfig = {
      owner: oldOwner,
      repo: oldRepo,
      branch: oldBranch || 'master'
    };
    sessionStorage.setItem('legacy_config', JSON.stringify(legacyConfig));

    // Afficher une modal de migration
    showMigrationModal(oldToken);
  }
})();

/**
 * Affiche une modal pour informer l'utilisateur de la migration
 */
function showMigrationModal(oldToken) {
  // Créer la modal
  const modal = document.createElement('div');
  modal.id = 'migration-modal';
  modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 12px;
        max-width: 600px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    `;

  modalContent.innerHTML = `
        <h2 style="margin-top: 0; color: #24292e;">🔒 Migration Sécurité Requise</h2>

        <p style="line-height: 1.6; color: #586069;">
            Pensine utilise maintenant <strong>GitHub OAuth</strong> pour une sécurité renforcée.
        </p>

        <div style="background: #fff5b1; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>⚠️ Pourquoi cette migration ?</strong>
            <ul style="margin: 10px 0 0 20px; line-height: 1.8;">
                <li>Votre token était stocké en clair dans localStorage</li>
                <li>Vulnérable aux attaques XSS</li>
                <li>OAuth offre une protection supérieure</li>
            </ul>
        </div>

        <div style="background: #d1f4e0; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>✅ Avantages OAuth :</strong>
            <ul style="margin: 10px 0 0 20px; line-height: 1.8;">
                <li>Token jamais stocké dans le navigateur</li>
                <li>Révocation facile depuis GitHub</li>
                <li>Expiration automatique</li>
                <li>Scopes limités et sécurisés</li>
            </ul>
        </div>

        <p style="line-height: 1.6; color: #586069;">
            <strong>Que va-t-il se passer ?</strong>
        </p>
        <ol style="line-height: 1.8; color: #586069;">
            <li>Votre ancien token sera supprimé</li>
            <li>Vous serez redirigé vers GitHub</li>
            <li>Autorisez Pensine (une seule fois)</li>
            <li>Vous reviendrez ici, connecté en OAuth</li>
        </ol>

        <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: flex-end;">
            <button id="revoke-and-migrate" style="
                padding: 12px 24px;
                background: #2ea44f;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
            ">
                🔒 Migrer vers OAuth
            </button>
            <button id="cancel-migration" style="
                padding: 12px 24px;
                background: #f6f8fa;
                color: #24292e;
                border: 1px solid #d1d5da;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
            ">
                Annuler
            </button>
        </div>

        <p style="font-size: 12px; color: #6a737d; margin-top: 20px;">
            💡 <strong>Note :</strong> Vous pouvez révoquer manuellement l'ancien token sur
            <a href="https://github.com/settings/tokens" target="_blank">github.com/settings/tokens</a>
        </p>
    `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Bouton de migration
  document.getElementById('revoke-and-migrate').addEventListener('click', async () => {
    // Masquer d'abord l'ancien token pour sécurité
    const maskedToken = oldToken.substring(0, 7) + '...' + oldToken.substring(oldToken.length - 4);

    console.log(`🔐 Suppression du token : ${maskedToken}`);

    // Supprimer l'ancien token
    localStorage.removeItem('github-token');
    localStorage.removeItem('github-owner');
    localStorage.removeItem('github-repo');
    localStorage.removeItem('github-branch');

    // Fermer la modal
    modal.remove();

    // Afficher un message de transition
    showMigrationInProgress();

    // Rediriger vers OAuth après 1 seconde
    setTimeout(() => {
      if (window.githubOAuth) {
        githubOAuth.login();
      } else {
        alert('OAuth non configuré. Veuillez contacter le support.');
      }
    }, 1000);
  });

  // Bouton annuler
  document.getElementById('cancel-migration').addEventListener('click', () => {
    modal.remove();

    // Afficher un avertissement
    console.warn('⚠️ Migration annulée - l\'ancien token est toujours actif');
    console.warn('⚠️ Votre sécurité est compromise. Migrez dès que possible.');

    // Optionnel : afficher un banner d'avertissement permanent
    showSecurityWarningBanner();
  });
}

/**
 * Affiche un message pendant la migration
 */
function showMigrationInProgress() {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
    `;

  overlay.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 20px;">🔐</div>
            <h2 style="margin: 0 0 10px 0;">Migration en cours...</h2>
            <p style="color: #586069;">Redirection vers GitHub OAuth</p>
            <div class="spinner" style="
                border: 4px solid #f3f3f3;
                border-top: 4px solid #2ea44f;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
            "></div>
        </div>
    `;

  // Ajouter l'animation
  const style = document.createElement('style');
  style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
  document.head.appendChild(style);

  document.body.appendChild(overlay);
}

/**
 * Affiche un banner d'avertissement si migration annulée
 */
function showSecurityWarningBanner() {
  const banner = document.createElement('div');
  banner.id = 'security-warning-banner';
  banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        background: #dc3545;
        color: white;
        padding: 12px 20px;
        text-align: center;
        z-index: 9999;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    `;

  banner.innerHTML = `
        <strong>⚠️ AVERTISSEMENT SÉCURITÉ</strong> -
        Votre token n'est pas sécurisé.
        <a href="#" id="migrate-now" style="color: white; text-decoration: underline; font-weight: bold;">
            Migrer vers OAuth maintenant
        </a>
        <button id="dismiss-warning" style="
            margin-left: 20px;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid white;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
        ">✕</button>
    `;

  document.body.appendChild(banner);

  // Décaler le contenu pour ne pas cacher le header
  document.body.style.marginTop = '50px';

  // Bouton migrer maintenant
  document.getElementById('migrate-now').addEventListener('click', async (e) => {
    e.preventDefault();
    banner.remove();
    document.body.style.marginTop = '0';
    const oldToken = await window.tokenStorage.getToken();
    showMigrationModal(oldToken);
  });

  // Bouton fermer
  document.getElementById('dismiss-warning').addEventListener('click', () => {
    banner.remove();
    document.body.style.marginTop = '0';
    // Stocker que l'utilisateur a dismissé (ne plus afficher pour cette session)
    sessionStorage.setItem('security_warning_dismissed', 'true');
  });

  // Ne pas réafficher si déjà dismissé dans cette session
  if (sessionStorage.getItem('security_warning_dismissed') === 'true') {
    banner.remove();
    document.body.style.marginTop = '0';
  }
}

console.log('✅ Migration script loaded');
