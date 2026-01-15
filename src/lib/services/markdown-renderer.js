/**
 * Markdown Renderer using MarkdownIt
 * Inspired by OntoWave architecture
 */

class MarkdownRenderer {
    constructor() {
        this.md = null;
        this.initialized = false;
    }

    /**
     * Initialize MarkdownIt with plugins
     */
    init() {
        if (this.initialized || typeof markdownit === 'undefined') {
            return;
        }

        // Create MarkdownIt instance with options
        this.md = markdownit({
            html: true,          // Enable HTML tags in source
            linkify: true,       // Autoconvert URL-like text to links
            typographer: true,   // Enable smartquotes and other typographic replacements
            breaks: true,        // Convert \n in paragraphs into <br>
            highlight: (str, lang) => {
                if (lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
                    try {
                        return '<pre class="hljs"><code class="hljs language-' + lang + '">' +
                               hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                               '</code></pre>';
                    } catch (e) {
                        console.error('Highlight error:', e);
                    }
                }
                // Fallback for unknown languages
                return '<pre class="hljs"><code>' + this.escapeHtml(str) + '</code></pre>';
            }
        });

        // Add anchor plugin for headers (if available)
        if (typeof markdownItAnchor !== 'undefined') {
            this.md.use(markdownItAnchor.default, {
                permalink: markdownItAnchor.default.permalink.headerLink()
            });
        }

        // Add custom rules
        this.addCustomRules();

        this.initialized = true;
    }

    /**
     * Add custom rendering rules
     */
    addCustomRules() {
        // Custom link rendering (open external links in new tab)
        const defaultLinkOpenRender = this.md.renderer.rules.link_open || 
            ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

        this.md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
            const token = tokens[idx];
            const hrefIndex = token.attrIndex('href');
            
            if (hrefIndex >= 0) {
                const href = token.attrs[hrefIndex][1];
                // If external link, add target="_blank" and rel="noopener"
                if (href.startsWith('http://') || href.startsWith('https://')) {
                    token.attrPush(['target', '_blank']);
                    token.attrPush(['rel', 'noopener noreferrer']);
                }
            }
            
            return defaultLinkOpenRender(tokens, idx, options, env, self);
        };

        // Custom table rendering (add wrapper for responsiveness)
        const defaultTableOpenRender = this.md.renderer.rules.table_open || 
            ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

        this.md.renderer.rules.table_open = (tokens, idx, options, env, self) => {
            return '<div class="table-wrapper">' + defaultTableOpenRender(tokens, idx, options, env, self);
        };

        const defaultTableCloseRender = this.md.renderer.rules.table_close || 
            ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

        this.md.renderer.rules.table_close = (tokens, idx, options, env, self) => {
            return defaultTableCloseRender(tokens, idx, options, env, self) + '</div>';
        };
    }

    /**
     * Render markdown to HTML
     * @param {string} markdown - Markdown source
     * @returns {string} HTML
     */
    render(markdown) {
        if (!this.initialized) {
            this.init();
        }

        if (!this.md) {
            // Fallback to basic rendering if MarkdownIt not available
            return this.basicRender(markdown);
        }

        try {
            return this.md.render(markdown);
        } catch (error) {
            console.error('Markdown rendering error:', error);
            return '<div class="error">Erreur de rendu markdown: ' + error.message + '</div>';
        }
    }

    /**
     * Basic markdown rendering fallback
     * @param {string} markdown - Markdown source
     * @returns {string} HTML
     */
    basicRender(markdown) {
        let html = this.escapeHtml(markdown);
        
        // Headers
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Bold and italic
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        
        // Code blocks
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return '<pre><code class="language-' + (lang || '') + '">' + code + '</code></pre>';
        });
        
        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Paragraphs
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        return html;
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Render inline markdown (single line, no blocks)
     * @param {string} markdown - Markdown source
     * @returns {string} HTML
     */
    renderInline(markdown) {
        if (!this.initialized) {
            this.init();
        }

        if (!this.md || !this.md.renderInline) {
            // Fallback
            let html = this.escapeHtml(markdown);
            html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
            html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
            return html;
        }

        try {
            return this.md.renderInline(markdown);
        } catch (error) {
            console.error('Inline markdown rendering error:', error);
            return this.escapeHtml(markdown);
        }
    }
}

// Create global instance
const markdownRenderer = new MarkdownRenderer();
