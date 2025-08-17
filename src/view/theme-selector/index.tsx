import { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeManager } from '../../core/themes/theme-manager';
import {
  type CodeTheme,
  type ThemeImportResult,
} from '../../core/themes/types';
import { downloadBlob } from '../../utils/download';
import styles from './index.module.scss';

interface ThemeSelectorProps {
  onThemeChange?: (theme: CodeTheme) => void;
  onClose?: () => void;
}

export function ThemeSelector({ onThemeChange, onClose }: ThemeSelectorProps) {
  const [themeManager] = useState(() => new ThemeManager());
  const [themes, setThemes] = useState<CodeTheme[]>([]);
  const [currentTheme, setCurrentTheme] = useState<CodeTheme | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<
    'all' | 'light' | 'dark' | 'high-contrast'
  >('all');
  const [activeTab, setActiveTab] = useState<'browse' | 'import' | 'create'>(
    'browse',
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ThemeImportResult | null>(
    null,
  );

  // Create theme form state
  const [newThemeName, setNewThemeName] = useState('');
  const [baseThemeId, setBaseThemeId] = useState('dark-plus');
  const [customColors, setCustomColors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadThemes();
    setCurrentTheme(themeManager.getCurrentTheme());
  }, [themeManager, loadThemes]);

  const loadThemes = useCallback(() => {
    let filteredThemes = themeManager.getAllThemes();

    if (selectedType !== 'all') {
      filteredThemes = themeManager.getThemesByType(selectedType);
    }

    if (searchQuery) {
      filteredThemes = themeManager.searchThemes(searchQuery);
    }

    setThemes(filteredThemes);
  }, [themeManager, selectedType, searchQuery]);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  const handleThemeSelect = (theme: CodeTheme) => {
    themeManager.setCurrentTheme(theme.id);
    setCurrentTheme(theme);
    onThemeChange?.(theme);
  };

  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const content = await file.text();
      const result = themeManager.importVSCodeTheme(content, file.name);

      setImportResult(result);

      if (result.success && result.theme) {
        loadThemes();
        handleThemeSelect(result.theme);
      }
    } catch (error) {
      setImportResult({
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportTheme = (theme: CodeTheme) => {
    const vscodeTheme = themeManager.exportToVSCodeFormat(theme.id);
    if (vscodeTheme) {
      const blob = new Blob([vscodeTheme], { type: 'application/json' });
      downloadBlob(
        blob,
        `${theme.name.replace(/\s+/g, '-').toLowerCase()}.json`,
      );
    }
  };

  const handleDeleteTheme = (theme: CodeTheme) => {
    if (theme.metadata?.source === 'builtin') {
      alert('Cannot delete built-in themes');
      return;
    }

    if (confirm(`Are you sure you want to delete "${theme.name}"?`)) {
      themeManager.deleteTheme(theme.id);
      loadThemes();

      if (currentTheme?.id === theme.id) {
        const defaultTheme = themeManager.getCurrentTheme();
        setCurrentTheme(defaultTheme);
        onThemeChange?.(defaultTheme);
      }
    }
  };

  const handleCreateTheme = () => {
    if (!newThemeName.trim()) {
      alert('Please enter a theme name');
      return;
    }

    const customTheme = themeManager.createCustomTheme(
      newThemeName,
      baseThemeId,
      {
        colors: customColors,
      },
    );

    if (customTheme) {
      loadThemes();
      handleThemeSelect(customTheme);
      setNewThemeName('');
      setCustomColors({});
      setActiveTab('browse');
    }
  };

  const handleColorChange = (colorKey: string, value: string) => {
    setCustomColors((prev) => ({
      ...prev,
      [colorKey]: value,
    }));
  };

  const getThemePreview = (theme: CodeTheme) => {
    return {
      backgroundColor: theme.colors['editor.background'] || '#1e1e1e',
      color: theme.colors['editor.foreground'] || '#d4d4d4',
    };
  };

  const filteredThemes = themes.filter((theme) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        theme.name.toLowerCase().includes(query) ||
        theme.author?.toLowerCase().includes(query) ||
        theme.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className={styles.themeSelector}>
      <div className={styles.header}>
        <h2>Code Themes</h2>
        <button type="button" onClick={onClose} className={styles.closeButton}>
          ✕
        </button>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'browse' ? styles.active : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          Browse Themes
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'import' ? styles.active : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Import Theme
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'create' ? styles.active : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create Theme
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'browse' && (
          <div className={styles.browseTab}>
            <div className={styles.filters}>
              <input
                type="text"
                placeholder="Search themes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />

              <select
                value={selectedType}
                onChange={(e) =>
                  setSelectedType(
                    e.target.value as
                      | 'all'
                      | 'light'
                      | 'dark'
                      | 'high-contrast',
                  )
                }
                className={styles.typeFilter}
              >
                <option value="all">All Types</option>
                <option value="dark">Dark Themes</option>
                <option value="light">Light Themes</option>
                <option value="high-contrast">High Contrast</option>
              </select>
            </div>

            <div className={styles.themeGrid}>
              {filteredThemes.map((theme) => (
                <div
                  key={theme.id}
                  className={`${styles.themeCard} ${currentTheme?.id === theme.id ? styles.active : ''}`}
                  onClick={() => handleThemeSelect(theme)}
                >
                  <div
                    className={styles.themePreview}
                    style={getThemePreview(theme)}
                  >
                    <div className={styles.previewCode}>
                      <span className="token-keyword">function</span>{' '}
                      <span className="token-entity-name-function">
                        example
                      </span>
                      () {'{'}
                      <br />
                      {'  '}
                      <span className="token-comment">// Comment</span>
                      <br />
                      {'  '}
                      <span className="token-keyword">const</span>{' '}
                      <span className="token-variable">text</span> ={' '}
                      <span className="token-string">"Hello"</span>;
                      <br />
                      {'}'}
                    </div>
                  </div>

                  <div className={styles.themeInfo}>
                    <h3 className={styles.themeName}>{theme.name}</h3>
                    <div className={styles.themeMeta}>
                      <span className={styles.themeType}>{theme.type}</span>
                      {theme.author && (
                        <span className={styles.themeAuthor}>
                          by {theme.author}
                        </span>
                      )}
                    </div>

                    <div className={styles.themeActions}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportTheme(theme);
                        }}
                        className={styles.exportButton}
                      >
                        📤 Export
                      </button>

                      {theme.metadata?.source !== 'builtin' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTheme(theme);
                          }}
                          className={styles.deleteButton}
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className={styles.importTab}>
            <h3>Import VSCode Theme</h3>
            <p>Import a theme from a VSCode theme JSON file:</p>

            <div className={styles.importSection}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className={styles.fileInput}
                disabled={isImporting}
              />

              {isImporting && (
                <div className={styles.importing}>
                  <span>Importing theme...</span>
                </div>
              )}

              {importResult && (
                <div
                  className={`${styles.importResult} ${importResult.success ? styles.success : styles.error}`}
                >
                  {importResult.success ? (
                    <div>
                      <p>✅ Theme imported successfully!</p>
                      {importResult.warnings &&
                        importResult.warnings.length > 0 && (
                          <div className={styles.warnings}>
                            <p>Warnings:</p>
                            <ul>
                              {importResult.warnings.map((warning, index) => (
                                <li key={index}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  ) : (
                    <p>❌ {importResult.error}</p>
                  )}
                </div>
              )}
            </div>

            <div className={styles.importHelp}>
              <h4>How to get VSCode themes:</h4>
              <ol>
                <li>Open VSCode and go to Extensions</li>
                <li>Search for and install a theme extension</li>
                <li>Find the theme files in your VSCode extensions folder</li>
                <li>Look for JSON files in the theme's folder</li>
                <li>Import the JSON file here</li>
              </ol>

              <p>
                You can also find themes on the{' '}
                <a
                  href="https://marketplace.visualstudio.com/search?target=VSCode&category=Themes"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  VSCode Marketplace
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className={styles.createTab}>
            <h3>Create Custom Theme</h3>

            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label>Theme Name</label>
                <input
                  type="text"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="Enter theme name..."
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Base Theme</label>
                <select
                  value={baseThemeId}
                  onChange={(e) => setBaseThemeId(e.target.value)}
                  className={styles.select}
                >
                  {themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Custom Colors</label>
                <div className={styles.colorInputs}>
                  {[
                    { key: 'editor.background', label: 'Background' },
                    { key: 'editor.foreground', label: 'Foreground' },
                    {
                      key: 'editor.lineHighlightBackground',
                      label: 'Line Highlight',
                    },
                    { key: 'editor.selectionBackground', label: 'Selection' },
                    {
                      key: 'editorLineNumber.foreground',
                      label: 'Line Numbers',
                    },
                    { key: 'editorCursor.foreground', label: 'Cursor' },
                  ].map(({ key, label }) => (
                    <div key={key} className={styles.colorInput}>
                      <label>{label}</label>
                      <input
                        type="color"
                        value={customColors[key] || '#000000'}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        className={styles.colorPicker}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateTheme}
                className={styles.createButton}
                disabled={!newThemeName.trim()}
              >
                Create Theme
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
