import {
  type CodeTheme,
  type VSCodeTheme,
  type ThemeImportResult,
  type TokenColor,
  BUILTIN_THEMES,
} from './types';

export class ThemeManager {
  private themes: Map<string, CodeTheme> = new Map();
  private currentThemeId: string = 'dark-plus';
  private storageKey = 'diffani-code-themes';
  private currentThemeKey = 'diffani-current-theme';

  constructor() {
    this.initializeBuiltinThemes();
    this.loadFromStorage();
    this.loadCurrentTheme();
  }

  /**
   * Initialize built-in themes
   */
  private initializeBuiltinThemes(): void {
    Object.entries(BUILTIN_THEMES).forEach(([id, themeData]) => {
      const theme: CodeTheme = {
        id,
        name: themeData.name!,
        type: themeData.type!,
        author: themeData.author,
        description: themeData.description,
        version: '1.0.0',
        colors: themeData.colors!,
        tokenColors: themeData.tokenColors!,
        metadata: {
          source: 'builtin',
          tags: ['builtin', themeData.type!],
        },
      };
      this.themes.set(id, theme);
    });
  }

  /**
   * Get all available themes
   */
  getAllThemes(): CodeTheme[] {
    return Array.from(this.themes.values());
  }

  /**
   * Get theme by ID
   */
  getTheme(id: string): CodeTheme | null {
    return this.themes.get(id) || null;
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): CodeTheme {
    return (
      this.themes.get(this.currentThemeId) || this.themes.get('dark-plus')!
    );
  }

  /**
   * Set current theme
   */
  setCurrentTheme(id: string): boolean {
    if (this.themes.has(id)) {
      this.currentThemeId = id;
      this.saveCurrentTheme();
      this.applyTheme(this.themes.get(id)!);
      return true;
    }
    return false;
  }

  /**
   * Import VSCode theme from JSON
   */
  importVSCodeTheme(jsonData: string, filename?: string): ThemeImportResult {
    try {
      const vscodeTheme = JSON.parse(jsonData) as VSCodeTheme;

      // Validate theme structure
      if (!this.validateVSCodeTheme(vscodeTheme)) {
        return {
          success: false,
          error: 'Invalid VSCode theme format',
        };
      }

      // Convert to our theme format
      const theme = this.convertVSCodeTheme(vscodeTheme, filename);

      // Add to themes collection
      this.themes.set(theme.id, theme);
      this.saveToStorage();

      return {
        success: true,
        theme,
        warnings: this.getConversionWarnings(vscodeTheme),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse theme: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Export theme to VSCode format
   */
  exportToVSCodeFormat(themeId: string): string | null {
    const theme = this.themes.get(themeId);
    if (!theme) return null;

    const vscodeTheme: VSCodeTheme = {
      name: theme.name,
      type: theme.type === 'high-contrast' ? 'hc-black' : theme.type,
      colors: theme.colors,
      tokenColors: theme.tokenColors,
      semanticTokenColors: theme.semanticTokenColors,
    };

    return JSON.stringify(vscodeTheme, null, 2);
  }

  /**
   * Create custom theme
   */
  createCustomTheme(
    name: string,
    baseThemeId: string,
    customizations: Partial<CodeTheme>,
  ): CodeTheme | null {
    const baseTheme = this.themes.get(baseThemeId);
    if (!baseTheme) return null;

    const customTheme: CodeTheme = {
      ...baseTheme,
      id: this.generateThemeId(name),
      name,
      ...customizations,
      metadata: {
        source: 'custom',
        originalFile: undefined,
        importedAt: new Date(),
        tags: ['custom'],
      },
    };

    this.themes.set(customTheme.id, customTheme);
    this.saveToStorage();
    return customTheme;
  }

  /**
   * Delete custom theme
   */
  deleteTheme(id: string): boolean {
    const theme = this.themes.get(id);
    if (!theme || theme.metadata?.source === 'builtin') {
      return false;
    }

    this.themes.delete(id);

    // Switch to default theme if current theme was deleted
    if (this.currentThemeId === id) {
      this.setCurrentTheme('dark-plus');
    }

    this.saveToStorage();
    return true;
  }

  /**
   * Apply theme to the editor
   */
  private applyTheme(theme: CodeTheme): void {
    // Apply CSS custom properties for theme colors
    const root = document.documentElement;

    // Apply editor colors
    Object.entries(theme.colors).forEach(([property, value]) => {
      const cssProperty = `--theme-${property.replace(/\./g, '-')}`;
      root.style.setProperty(cssProperty, value);
    });

    // Apply token colors as CSS classes
    this.generateTokenColorCSS(theme.tokenColors);

    // Dispatch theme change event
    window.dispatchEvent(
      new CustomEvent('themeChanged', {
        detail: { theme },
      }),
    );
  }

  /**
   * Generate CSS for token colors
   */
  private generateTokenColorCSS(tokenColors: TokenColor[]): void {
    let css = '';

    tokenColors.forEach((tokenColor) => {
      const scopes = Array.isArray(tokenColor.scope)
        ? tokenColor.scope
        : [tokenColor.scope];

      scopes.forEach((scope) => {
        const className = `.token-${scope.replace(/\./g, '-').replace(/\s+/g, '-')}`;
        css += `${className} {\n`;

        if (tokenColor.settings.foreground) {
          css += `  color: ${tokenColor.settings.foreground};\n`;
        }

        if (tokenColor.settings.background) {
          css += `  background-color: ${tokenColor.settings.background};\n`;
        }

        if (tokenColor.settings.fontStyle) {
          const styles = tokenColor.settings.fontStyle.split(' ');
          styles.forEach((style) => {
            switch (style) {
              case 'italic':
                css += `  font-style: italic;\n`;
                break;
              case 'bold':
                css += `  font-weight: bold;\n`;
                break;
              case 'underline':
                css += `  text-decoration: underline;\n`;
                break;
              case 'strikethrough':
                css += `  text-decoration: line-through;\n`;
                break;
            }
          });
        }

        css += `}\n`;
      });
    });

    // Apply CSS to the document
    let styleElement = document.getElementById('theme-token-colors');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'theme-token-colors';
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = css;
  }

  /**
   * Convert VSCode theme to our format
   */
  private convertVSCodeTheme(
    vscodeTheme: VSCodeTheme,
    filename?: string,
  ): CodeTheme {
    const id = this.generateThemeId(vscodeTheme.name);

    return {
      id,
      name: vscodeTheme.name,
      type: this.convertThemeType(vscodeTheme.type),
      colors: vscodeTheme.colors,
      tokenColors: vscodeTheme.tokenColors,
      semanticTokenColors: vscodeTheme.semanticTokenColors,
      metadata: {
        source: 'vscode',
        originalFile: filename,
        importedAt: new Date(),
        tags: ['imported', 'vscode'],
      },
    };
  }

  /**
   * Convert VSCode theme type to our format
   */
  private convertThemeType(
    vscodeType: string,
  ): 'light' | 'dark' | 'high-contrast' {
    switch (vscodeType) {
      case 'light':
        return 'light';
      case 'hc-black':
      case 'hc-light':
        return 'high-contrast';
      case 'dark':
      default:
        return 'dark';
    }
  }

  /**
   * Validate VSCode theme structure
   */
  private validateVSCodeTheme(theme: unknown): theme is VSCodeTheme {
    return (
      theme &&
      typeof theme.name === 'string' &&
      typeof theme.type === 'string' &&
      typeof theme.colors === 'object' &&
      Array.isArray(theme.tokenColors)
    );
  }

  /**
   * Get conversion warnings
   */
  private getConversionWarnings(vscodeTheme: VSCodeTheme): string[] {
    const warnings: string[] = [];

    if (vscodeTheme.semanticHighlighting === false) {
      warnings.push('Semantic highlighting is disabled in this theme');
    }

    if (!vscodeTheme.colors['editor.background']) {
      warnings.push('Theme missing editor background color');
    }

    if (!vscodeTheme.colors['editor.foreground']) {
      warnings.push('Theme missing editor foreground color');
    }

    return warnings;
  }

  /**
   * Generate unique theme ID
   */
  private generateThemeId(name: string): string {
    const baseId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    let id = baseId;
    let counter = 1;

    while (this.themes.has(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }

    return id;
  }

  /**
   * Save themes to localStorage
   */
  private saveToStorage(): void {
    try {
      const customThemes = Array.from(this.themes.entries()).filter(
        ([, theme]) => theme.metadata?.source !== 'builtin',
      );

      localStorage.setItem(this.storageKey, JSON.stringify(customThemes));
    } catch (error) {
      console.error('Failed to save themes to storage:', error);
    }
  }

  /**
   * Load themes from localStorage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const customThemes = JSON.parse(data) as [string, CodeTheme][];
        customThemes.forEach(([id, theme]) => {
          this.themes.set(id, theme);
        });
      }
    } catch (error) {
      console.error('Failed to load themes from storage:', error);
    }
  }

  /**
   * Save current theme to localStorage
   */
  private saveCurrentTheme(): void {
    try {
      localStorage.setItem(this.currentThemeKey, this.currentThemeId);
    } catch (error) {
      console.error('Failed to save current theme:', error);
    }
  }

  /**
   * Load current theme from localStorage
   */
  private loadCurrentTheme(): void {
    try {
      const savedTheme = localStorage.getItem(this.currentThemeKey);
      if (savedTheme && this.themes.has(savedTheme)) {
        this.currentThemeId = savedTheme;
      }
      this.applyTheme(this.getCurrentTheme());
    } catch (error) {
      console.error('Failed to load current theme:', error);
    }
  }

  /**
   * Get themes by type
   */
  getThemesByType(type: 'light' | 'dark' | 'high-contrast'): CodeTheme[] {
    return Array.from(this.themes.values()).filter(
      (theme) => theme.type === type,
    );
  }

  /**
   * Search themes
   */
  searchThemes(query: string): CodeTheme[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.themes.values()).filter(
      (theme) =>
        theme.name.toLowerCase().includes(searchTerm) ||
        theme.author?.toLowerCase().includes(searchTerm) ||
        theme.description?.toLowerCase().includes(searchTerm) ||
        theme.metadata?.tags?.some((tag) =>
          tag.toLowerCase().includes(searchTerm),
        ),
    );
  }
}
