/**
 * Pensine Word Counter Plugin
 *
 * Écoute editor:content-changed et affiche le nombre de mots/chars
 * id: 'word-counter', icon: '🔢'
 *
 * @version 1.0.0
 */

export default class WordCounterPlugin {
  constructor() {
    this._wordCount = 0;
    this._charCount = 0;
    this._uiElement = null;
  }

  get manifest() {
    return {
      id: 'word-counter',
      name: 'Word Counter',
      version: '1.0.0',
      icon: '🔢',
      description: "Affiche le nombre de mots et caractères dans l'éditeur"
    };
  }

  async activate(context) {
    this.context = context;
    const config = context.config?.getPluginConfig?.(this.manifest.id) || {};
    this._showChars = config.showCharCount !== false;
    this._position = config.position || 'bottom';
    this._createUI();
    context.events?.on?.(
      'editor:content-changed',
      (data) => this._updateCounts(data?.content ?? ''),
      this.manifest.id
    );
  }

  async deactivate() {
    this.context?.events?.clearNamespace?.(this.manifest.id);
    if (this._uiElement?.parentNode) {
      this._uiElement.parentNode.removeChild(this._uiElement);
    }
    this._uiElement = null;
    this.context = null;
  }

  _createUI() {
    this._uiElement = document.createElement('div');
    this._uiElement.id = 'word-counter-badge';
    this._uiElement.style.cssText = [
      'position:fixed',
      `${this._position === 'top' ? 'top:10px' : 'bottom:10px'}`,
      'right:10px',
      'padding:4px 10px',
      'background:rgba(0,0,0,.65)',
      'color:#fff',
      'border-radius:4px',
      'font-size:11px',
      'font-family:monospace',
      'z-index:800',
      'pointer-events:none',
      'opacity:.8'
    ].join(';');
    this._updateDisplay();
    document.body.appendChild(this._uiElement);
  }

  _updateCounts(content) {
    const words = content.trim() ? content.trim().split(/\s+/) : [];
    this._wordCount = words.length;
    this._charCount = content ? content.length : 0;
    this._updateDisplay();
    this.context?.events?.emit?.(`${this.manifest.id}:updated`, {
      words: this._wordCount,
      chars: this._charCount
    });
  }

  _updateDisplay() {
    if (!this._uiElement) return;
    let text = `${this._wordCount} mots`;
    if (this._showChars) {
      text += ` · ${this._charCount} car.`;
    }
    this._uiElement.textContent = text;
  }

  /** Retourne les statistiques actuelles */
  getStats() {
    return { words: this._wordCount, chars: this._charCount };
  }

  /** Remet les compteurs à zéro */
  reset() {
    this._wordCount = 0;
    this._charCount = 0;
    this._updateDisplay();
  }
}
