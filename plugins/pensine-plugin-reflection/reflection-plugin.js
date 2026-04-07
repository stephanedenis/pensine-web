/**
 * Pensine Reflection Plugin
 *
 * Entrées de réflexion hebdomadaires dans reflections/YYYY-WNN.md
 * id: 'reflection', icon: '🪞'
 *
 * @version 1.0.0
 */

export default class ReflectionPlugin {
  constructor() {}

  get manifest() {
    return {
      id: 'reflection',
      name: 'Réflexions',
      version: '1.0.0',
      icon: '🪞',
      description: 'Entrées de réflexion hebdomadaires dans reflections/YYYY-WNN.md'
    };
  }

  async activate(context) {
    this.context = context;
    const config = context.config?.getPluginConfig?.(this.manifest.id) || {};
    this._folder = config.folder || 'reflections';
    this._createUI();
    context.events?.on?.(
      'reflection:open-week',
      (data) => {
        const date = data?.date ? new Date(data.date) : new Date();
        this.openWeek(date);
      },
      this.manifest.id
    );
  }

  async deactivate() {
    this.context?.events?.clearNamespace?.(this.manifest.id);
    if (this._btn?.parentNode) {
      this._btn.parentNode.removeChild(this._btn);
    }
    this.context = null;
  }

  /**
   * Calcule le numéro de semaine ISO 8601 pour une date donnée
   * @param {Date} date
   * @returns {number}
   */
  _getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * Retourne le chemin du fichier de réflexion pour la semaine donnée
   * @param {Date} date
   * @returns {string} e.g. "reflections/2025-W03.md"
   */
  getWeekPath(date = new Date()) {
    const year = date.getFullYear();
    const week = this._getISOWeek(date);
    return `${this._folder}/${year}-W${String(week).padStart(2, '0')}.md`;
  }

  _createUI() {
    this._btn = document.createElement('button');
    this._btn.id = 'reflection-week-btn';
    this._btn.textContent = '🪞';
    this._btn.title = 'Réflexion de la semaine';
    this._btn.style.cssText = [
      'position:fixed',
      'bottom:100px',
      'right:10px',
      'z-index:900',
      'font-size:20px',
      'background:none',
      'border:none',
      'cursor:pointer'
    ].join(';');
    this._btn.addEventListener('click', () => this.openWeek());
    document.body.appendChild(this._btn);
  }

  /**
   * Ouvre (ou crée) l'entrée de réflexion pour la semaine donnée
   * @param {Date} date
   */
  async openWeek(date = new Date()) {
    if (!this.context) return;
    const path = this.getWeekPath(date);
    try {
      await this.context.storage.readFile(path);
    } catch (_e) {
      const week = this._getISOWeek(date);
      const year = date.getFullYear();
      const header = [
        `# Réflexions — Semaine ${week} (${year})`,
        '',
        '## Points forts',
        '',
        '## Apprentissages',
        '',
        '## Pour la semaine prochaine',
        ''
      ].join('\n');
      await this.context.storage.writeFile(path, header).catch((err) => {
        console.error('[reflection] writeFile error:', err);
      });
    }
    this.context.router?.navigate?.(path);
    this.context.events?.emit?.(`${this.manifest.id}:week-opened`, { path });
  }
}
