import { useState, useEffect, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import { PresetManager as PresetManagerCore } from '../../core/presets/preset-manager';
import {
  type AnimationPreset,
  type PresetSearchFilters,
  PresetCategory,
  PRESET_CATEGORIES,
  COMMON_PRESET_TAGS,
} from '../../core/presets/types';
import { downloadBlob } from '../../utils/download';
import styles from './index.module.scss';

interface PresetManagerProps {
  onPresetApply?: (preset: AnimationPreset) => void;
  onClose?: () => void;
}

export function PresetManagerUI({
  onPresetApply,
  onClose,
}: PresetManagerProps) {
  const { doc, frameRate } = useStore(
    useShallow((state) => ({
      doc: state.doc,
      frameRate: state.frameRate,
    })),
  );

  const [presetManager] = useState(() => new PresetManagerCore());
  const [presets, setPresets] = useState<AnimationPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<AnimationPreset | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PresetSearchFilters>({});
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'import'>(
    'browse',
  );
  const [isLoading, setIsLoading] = useState(false);

  // New preset form state
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState<PresetCategory>(
    PresetCategory.GENERAL,
  );
  const [newPresetTags, setNewPresetTags] = useState<string[]>([]);

  // Load presets on mount
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const loadPresets = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = presetManager.searchPresets(searchQuery, filters);
      setPresets(result.presets);
    } catch (error) {
      console.error('Failed to load presets:', error);
    } finally {
      setIsLoading(false);
    }
  }, [presetManager, searchQuery, filters]);

  const handleApplyPreset = (preset: AnimationPreset) => {
    onPresetApply?.(preset);
    onClose?.();
  };

  const handleSaveCurrentAsPreset = async () => {
    if (!newPresetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    try {
      const currentConfig = {
        frameRate,
        defaultTransition: {
          outDurationProportion: 0.5,
          moveDurationProportion: 1.0,
          inDurationProportion: 0.5,
          easingId: 'quadInOut',
          effectType: 'fade' as const,
        },
        exportSettings: {
          format: 'webm' as const,
          quality: 'medium' as const,
          frameRate,
        },
        documentSettings: {
          fontSize: doc.fontSize,
          lineHeight: doc.lineHeight,
          theme: doc.theme,
          padding: doc.padding,
        },
      };

      const preset = presetManager.savePreset(currentConfig, {
        name: newPresetName,
        description: newPresetDescription,
        category: newPresetCategory,
        tags: newPresetTags,
      });

      setPresets([preset, ...presets]);
      setNewPresetName('');
      setNewPresetDescription('');
      setNewPresetTags([]);
      setActiveTab('browse');

      alert('Preset saved successfully!');
    } catch (error) {
      console.error('Failed to save preset:', error);
      alert('Failed to save preset');
    }
  };

  const handleDeletePreset = (preset: AnimationPreset) => {
    if (confirm(`Are you sure you want to delete "${preset.name}"?`)) {
      presetManager.deletePreset(preset.id);
      setPresets(presets.filter((p) => p.id !== preset.id));
      if (selectedPreset?.id === preset.id) {
        setSelectedPreset(null);
      }
    }
  };

  const handleExportPreset = (preset: AnimationPreset) => {
    const jsonData = presetManager.exportPreset(preset.id);
    if (jsonData) {
      const blob = new Blob([jsonData], { type: 'application/json' });
      downloadBlob(
        blob,
        `${preset.name.replace(/\s+/g, '-').toLowerCase()}.json`,
      );
    }
  };

  const handleImportPreset = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const jsonData = e.target?.result as string;
      const preset = presetManager.importPreset(jsonData);
      if (preset) {
        setPresets([preset, ...presets]);
        alert('Preset imported successfully!');
      } else {
        alert('Failed to import preset. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleTagToggle = (tag: string) => {
    setNewPresetTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const filteredPresets = useMemo(() => {
    return presets.filter((preset) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          preset.name.toLowerCase().includes(query) ||
          preset.description.toLowerCase().includes(query) ||
          preset.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [presets, searchQuery]);

  return (
    <div className={styles.presetManager}>
      <div className={styles.header}>
        <h2>Animation Presets</h2>
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
          Browse Presets
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'create' ? styles.active : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create Preset
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'import' ? styles.active : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Import/Export
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'browse' && (
          <div className={styles.browseTab}>
            <div className={styles.searchSection}>
              <input
                type="text"
                placeholder="Search presets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />

              <select
                value={filters.category || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    category: (e.target.value as PresetCategory) || undefined,
                  })
                }
                className={styles.categoryFilter}
              >
                <option value="">All Categories</option>
                {Object.entries(PRESET_CATEGORIES).map(([key, category]) => (
                  <option key={key} value={key}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.presetGrid}>
              {isLoading ? (
                <div className={styles.loading}>Loading presets...</div>
              ) : filteredPresets.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>
                    No presets found. Try adjusting your search or create a new
                    preset.
                  </p>
                </div>
              ) : (
                filteredPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className={`${styles.presetCard} ${selectedPreset?.id === preset.id ? styles.selected : ''}`}
                    onClick={() => setSelectedPreset(preset)}
                  >
                    <div className={styles.presetHeader}>
                      <h3 className={styles.presetName}>{preset.name}</h3>
                      <div className={styles.presetActions}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyPreset(preset);
                          }}
                          className={styles.applyButton}
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportPreset(preset);
                          }}
                          className={styles.exportButton}
                        >
                          📤
                        </button>
                        {!preset.metadata.verified && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePreset(preset);
                            }}
                            className={styles.deleteButton}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>

                    <p className={styles.presetDescription}>
                      {preset.description}
                    </p>

                    <div className={styles.presetMeta}>
                      <span className={styles.category}>
                        {PRESET_CATEGORIES[preset.category].icon}{' '}
                        {PRESET_CATEGORIES[preset.category].name}
                      </span>
                      <span className={styles.author}>by {preset.author}</span>
                    </div>

                    <div className={styles.presetTags}>
                      {preset.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className={styles.tag}>
                          {tag}
                        </span>
                      ))}
                      {preset.tags.length > 3 && (
                        <span className={styles.moreTagsIndicator}>
                          +{preset.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className={styles.createTab}>
            <h3>Save Current Settings as Preset</h3>

            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label>Preset Name *</label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Enter preset name..."
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  placeholder="Describe your preset..."
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Category</label>
                <select
                  value={newPresetCategory}
                  onChange={(e) =>
                    setNewPresetCategory(e.target.value as PresetCategory)
                  }
                  className={styles.select}
                >
                  {Object.entries(PRESET_CATEGORIES).map(([key, category]) => (
                    <option key={key} value={key}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Tags</label>
                <div className={styles.tagSelector}>
                  {COMMON_PRESET_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`${styles.tagButton} ${newPresetTags.includes(tag) ? styles.selected : ''}`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveCurrentAsPreset}
                className={styles.saveButton}
                disabled={!newPresetName.trim()}
              >
                Save Preset
              </button>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className={styles.importTab}>
            <h3>Import/Export Presets</h3>

            <div className={styles.importSection}>
              <h4>Import Preset</h4>
              <p>Import a preset from a JSON file:</p>
              <input
                type="file"
                accept=".json"
                onChange={handleImportPreset}
                className={styles.fileInput}
              />
            </div>

            <div className={styles.exportSection}>
              <h4>Export Presets</h4>
              <p>Select presets to export:</p>
              <div className={styles.exportList}>
                {presets.map((preset) => (
                  <div key={preset.id} className={styles.exportItem}>
                    <span>{preset.name}</span>
                    <button
                      type="button"
                      onClick={() => handleExportPreset(preset)}
                      className={styles.exportButton}
                    >
                      Export
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
