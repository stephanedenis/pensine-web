/**
 * Modal Dialog - Modals de confirmation et d'information
 *
 * API:
 *   await ModalDialog.confirm('Supprimer ce fichier ?');
 *   await ModalDialog.confirm('Titre', { message: 'Détails...', confirmLabel: 'Supprimer' });
 *   ModalDialog.alert('Erreur critique', { type: 'error' });
 *
 * Retourne: Promise<boolean> (true = confirmé, false = annulé)
 */

class ModalDialog {
  constructor() {
    this.activeModal = null;
  }

  /**
   * Modal de confirmation (OK/Annuler)
   * @param {string} title
   * @param {Object} options
   * @param {string} [options.message] - Texte descriptif optionnel
   * @param {string} [options.confirmLabel='Confirmer']
   * @param {string} [options.cancelLabel='Annuler']
   * @param {'default'|'danger'} [options.type='default']
   * @returns {Promise<boolean>}
   */
  confirm(title, options = {}) {
    const {
      message = '',
      confirmLabel = 'Confirmer',
      cancelLabel = 'Annuler',
      type = 'default'
    } = options;

    return new Promise((resolve) => {
      this._show({
        title,
        message,
        type,
        buttons: [
          {
            label: cancelLabel,
            className: 'btn btn-secondary',
            action: () => resolve(false)
          },
          {
            label: confirmLabel,
            className: `btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`,
            action: () => resolve(true)
          }
        ]
      });
    });
  }

  /**
   * Modal d'information (OK uniquement)
   * @param {string} title
   * @param {Object} options
   * @param {string} [options.message]
   * @param {'info'|'error'|'warning'} [options.type='info']
   * @returns {Promise<void>}
   */
  alert(title, options = {}) {
    const { message = '', type = 'info' } = options;

    const icons = { info: 'ℹ️', error: '❌', warning: '⚠️' };

    return new Promise((resolve) => {
      this._show({
        title: `${icons[type] || ''} ${title}`,
        message,
        type,
        buttons: [
          {
            label: 'OK',
            className: 'btn btn-primary',
            action: () => resolve()
          }
        ]
      });
    });
  }

  /**
   * Créer et afficher la modal
   */
  _show({ title, message, buttons }) {
    // Fermer la modal active si existante
    if (this.activeModal) this._close();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'modal-title');

    overlay.innerHTML = `
      <div class="modal-panel">
        <div class="modal-header">
          <h3 id="modal-title" class="modal-title">${this._escapeHtml(title)}</h3>
        </div>
        ${message ? `<div class="modal-body"><p>${this._escapeHtml(message)}</p></div>` : ''}
        <div class="modal-footer"></div>
      </div>
    `;

    const footer = overlay.querySelector('.modal-footer');
    buttons.forEach(({ label, className, action }) => {
      const btn = document.createElement('button');
      btn.className = className;
      btn.textContent = label;
      btn.addEventListener('click', () => {
        this._close();
        action();
      });
      footer.appendChild(btn);
    });

    // Fermer sur clic overlay (hors panel)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this._close();
        // Appeler l'action du dernier bouton (annuler par convention)
        const lastBtn = buttons[0];
        if (lastBtn) lastBtn.action();
      }
    });

    // Fermer sur Escape
    this._keyHandler = (e) => {
      if (e.key === 'Escape') {
        this._close();
        const lastBtn = buttons[0];
        if (lastBtn) lastBtn.action();
      }
    };
    document.addEventListener('keydown', this._keyHandler);

    document.body.appendChild(overlay);
    this.activeModal = overlay;

    // Focus premier bouton
    requestAnimationFrame(() => {
      overlay.classList.add('modal-visible');
      const firstBtn = footer.querySelector('button');
      if (firstBtn) firstBtn.focus();
    });
  }

  _close() {
    if (!this.activeModal) return;
    this.activeModal.classList.remove('modal-visible');
    this.activeModal.addEventListener('transitionend', () => {
      if (this.activeModal && this.activeModal.parentNode) {
        this.activeModal.parentNode.removeChild(this.activeModal);
      }
      this.activeModal = null;
    }, { once: true });
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
}

// Singleton global
const modalDialog = new ModalDialog();
export default modalDialog;
