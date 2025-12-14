/**
 * Markdown Parser for Logseq format
 * Handles [[links]], #tags, properties, blocks
 */

class MarkdownParser {
    constructor() {
        this.linkPattern = /\[\[([^\]]+)\]\]/g;
        this.tagPattern = /#[\w-]+/g;
        this.propertyPattern = /^(\w+)::\s*(.+)$/gm;
        this.blockRefPattern = /\(\(([a-f0-9-]+)\)\)/g;
    }

    /**
     * Parse Markdown content and extract metadata
     * @param {string} content - Raw markdown content
     * @returns {Object} - Parsed structure
     */
    parse(content) {
        return {
            content,
            links: this.extractLinks(content),
            tags: this.extractTags(content),
            properties: this.extractProperties(content),
            blockRefs: this.extractBlockRefs(content)
        };
    }

    /**
     * Extract [[page links]]
     */
    extractLinks(content) {
        const links = [];
        let match;
        
        while ((match = this.linkPattern.exec(content)) !== null) {
            links.push({
                text: match[1],
                start: match.index,
                end: match.index + match[0].length
            });
        }
        
        return links;
    }

    /**
     * Extract #tags
     */
    extractTags(content) {
        const tags = [];
        let match;
        
        while ((match = this.tagPattern.exec(content)) !== null) {
            tags.push({
                text: match[0],
                start: match.index,
                end: match.index + match[0].length
            });
        }
        
        return tags;
    }

    /**
     * Extract properties (key:: value)
     */
    extractProperties(content) {
        const properties = {};
        let match;
        
        while ((match = this.propertyPattern.exec(content)) !== null) {
            properties[match[1]] = match[2].trim();
        }
        
        return properties;
    }

    /**
     * Extract block references ((uuid))
     */
    extractBlockRefs(content) {
        const refs = [];
        let match;
        
        while ((match = this.blockRefPattern.exec(content)) !== null) {
            refs.push({
                uuid: match[1],
                start: match.index,
                end: match.index + match[0].length
            });
        }
        
        return refs;
    }

    /**
     * Convert [[links]] to clickable HTML
     */
    renderLinks(content) {
        return content.replace(this.linkPattern, (match, pageName) => {
            return `<a href="#" class="page-link" data-page="${pageName}">[[${pageName}]]</a>`;
        });
    }

    /**
     * Convert #tags to clickable HTML
     */
    renderTags(content) {
        return content.replace(this.tagPattern, (match) => {
            return `<span class="tag">${match}</span>`;
        });
    }

    /**
     * Render full content with all enhancements
     */
    render(content) {
        let rendered = content;
        rendered = this.renderLinks(rendered);
        rendered = this.renderTags(rendered);
        // Preserve line breaks
        rendered = rendered.replace(/\n/g, '<br>');
        return rendered;
    }

    /**
     * Format date for journal filename (YYYY_MM_DD)
     */
    static formatDateForFile(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}_${month}_${day}`;
    }

    /**
     * Format date for display
     */
    static formatDateForDisplay(date) {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('fr-FR', options);
    }

    /**
     * Get journal path for a date
     */
    static getJournalPath(date) {
        return `journals/${this.formatDateForFile(date)}.md`;
    }
}

window.MarkdownParser = MarkdownParser;
