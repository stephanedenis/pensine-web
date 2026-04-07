/**
 * Toast Notifications - Feedback visuel éphémère
 *
 * API:
 *   ToastNotifications.show('Message', 'success');
 *   ToastNotifications.show('Message', 'warning', 5000);
 *   ToastNotifications.show('Message', 'error');
 *   ToastNotifications.show('Message', 'info');
 *
 * Types: 'success' | 'warning' | 'error' | 'info'
 * Durée par défaut: 3500ms (error: persistant jusqu'à dismiss)
 */

class ToastNotifications {
  constructor() {
    this.container = null;
    this.toasts = [];
  }

  /**
   * Initialiser le container de toasts (injection DOM unique)
   */
  _ensureContainer() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(this.container);
  }

  /**
   * Afficher un toast
   * @param {string} message - Message à afficher
   * @param {'success'|'warning'|'error'|'info'} type - Type de notification
   * @param {number|null} duration - Durée en ms, null = persistant
   */
  show(message, type = 'info', duration) {
    this._ensureContainer();

    // Durée par défaut selon le type
    if (duration === undefined) {
      duration = type === 'error' ? null : 3500;
    }

    const icons = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${this._escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Fermer">✕</button>
    `;

    // Bouton fermeture
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this._dismiss(toast);
    });

    this.container.appendChild(toast);

    // Animation entrée
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
    });

    // Auto-dismiss
    if (duration !== null) {
      setTimeout(() => this._dismiss(toast), duration);
    }

    this.toasts.push(toast);
    return toast;
  }

  /**
   * Fermer un toast avec animation de sortie
   */
  _dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');
    toast.addEventListener('transitionend', () => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      this.toasts = this.toasts.filter(t => t !== toast);
    }, { once: true });
  }

  /**
   * Fermer tous les toasts
   */
  dismissAll() {
    [...this.toasts].forEach(t => this._dismiss(t));
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
}

// Singleton global
const toastNotifications = new ToastNotifications();
export default toastNotifications;
