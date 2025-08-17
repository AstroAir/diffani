import { useState, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import { 
  TransitionEffectType, 
  type TransitionConfig,
  DEFAULT_TRANSITION_CONFIG 
} from '../../core/transition/transition';
import { getEasingFunction } from '../../core/transition/easing';
import styles from './VisualEffectsPanel.module.scss';

export interface VisualEffectsPanelProps {
  onEffectChange?: (config: TransitionConfig) => void;
}

interface EffectPreset {
  id: string;
  name: string;
  description: string;
  config: TransitionConfig;
  preview: string;
}

const EFFECT_PRESETS: EffectPreset[] = [
  {
    id: 'fade-smooth',
    name: 'Smooth Fade',
    description: 'Gentle fade in/out transition',
    config: {
      ...DEFAULT_TRANSITION_CONFIG,
      effectType: TransitionEffectType.FADE,
      easingId: 'easeInOut',
      outDurationProportion: 0.3,
      inDurationProportion: 0.3,
    },
    preview: '○ → ◐ → ●',
  },
  {
    id: 'slide-dynamic',
    name: 'Dynamic Slide',
    description: 'Energetic sliding transition',
    config: {
      ...DEFAULT_TRANSITION_CONFIG,
      effectType: TransitionEffectType.SLIDE_LEFT,
      easingId: 'easeBackOut',
      slideDistance: 100,
    },
    preview: '← ← ←',
  },
  {
    id: 'scale-bounce',
    name: 'Bouncy Scale',
    description: 'Playful scaling with bounce',
    config: {
      ...DEFAULT_TRANSITION_CONFIG,
      effectType: TransitionEffectType.SCALE,
      easingId: 'easeBounceOut',
      scaleAmount: 0.5,
    },
    preview: '● ○ ●',
  },
  {
    id: 'crossfade-elegant',
    name: 'Elegant Crossfade',
    description: 'Sophisticated blended transition',
    config: {
      ...DEFAULT_TRANSITION_CONFIG,
      effectType: TransitionEffectType.CROSSFADE,
      easingId: 'easeSinInOut',
      moveDurationProportion: 0.8,
    },
    preview: '◐ ◑ ◒',
  },
  {
    id: 'zoom-dramatic',
    name: 'Dramatic Zoom',
    description: 'Cinematic zoom effect',
    config: {
      ...DEFAULT_TRANSITION_CONFIG,
      effectType: TransitionEffectType.ZOOM_IN,
      easingId: 'easeExpOut',
      scaleAmount: 2.0,
    },
    preview: '● ◉ ●',
  },
];

const EASING_OPTIONS = [
  { value: 'easeLinear', label: 'Linear', description: 'Constant speed' },
  { value: 'easeInOut', label: 'Ease In-Out', description: 'Smooth start and end' },
  { value: 'easeIn', label: 'Ease In', description: 'Slow start' },
  { value: 'easeOut', label: 'Ease Out', description: 'Slow end' },
  { value: 'easeBackOut', label: 'Back Out', description: 'Overshoot effect' },
  { value: 'easeBounceOut', label: 'Bounce Out', description: 'Bouncy effect' },
  { value: 'easeElasticOut', label: 'Elastic Out', description: 'Spring effect' },
  { value: 'easeSinInOut', label: 'Sine In-Out', description: 'Smooth sine wave' },
  { value: 'easeExpOut', label: 'Exponential Out', description: 'Fast then slow' },
];

export default function VisualEffectsPanel({ onEffectChange }: VisualEffectsPanelProps) {
  const { doc, updateSnapshot, currentTime } = useStore(
    useShallow((state) => ({
      doc: state.doc,
      updateSnapshot: state.updateSnapshot,
      currentTime: state.currentTime,
    })),
  );

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customConfig, setCustomConfig] = useState<TransitionConfig>(DEFAULT_TRANSITION_CONFIG);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePresetSelect = useCallback((preset: EffectPreset) => {
    setSelectedPreset(preset.id);
    setCustomConfig(preset.config);
    onEffectChange?.(preset.config);
  }, [onEffectChange]);

  const handleConfigChange = useCallback((updates: Partial<TransitionConfig>) => {
    const newConfig = { ...customConfig, ...updates };
    setCustomConfig(newConfig);
    setSelectedPreset(null); // Clear preset selection when customizing
    onEffectChange?.(newConfig);
  }, [customConfig, onEffectChange]);

  const handleApplyToCurrentSnapshot = useCallback(() => {
    const currentSnapshotIndex = doc.snapshots.findIndex((_, index) => {
      const snapshotTime = doc.snapshots.slice(0, index + 1)
        .reduce((sum, s) => sum + s.duration, 0);
      return currentTime <= snapshotTime;
    });

    if (currentSnapshotIndex >= 0) {
      const currentSnapshot = doc.snapshots[currentSnapshotIndex];
      updateSnapshot(currentSnapshotIndex, {
        ...currentSnapshot,
        // Apply transition config to snapshot (would need to extend snapshot type)
      });
    }
  }, [doc, currentTime, updateSnapshot]);

  const renderEffectPreview = (preset: EffectPreset) => {
    return (
      <div className={styles.effectPreview}>
        <div className={styles.previewAnimation}>
          {preset.preview}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.visualEffectsPanel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Visual Effects</h3>
        <button
          type="button"
          className={styles.advancedToggle}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Simple' : 'Advanced'}
        </button>
      </div>

      {/* Effect Presets */}
      <div className={styles.presetsSection}>
        <h4 className={styles.sectionTitle}>Effect Presets</h4>
        <div className={styles.presetGrid}>
          {EFFECT_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className={`${styles.presetCard} ${
                selectedPreset === preset.id ? styles.selected : ''
              }`}
              onClick={() => handlePresetSelect(preset)}
            >
              {renderEffectPreview(preset)}
              <div className={styles.presetInfo}>
                <h5 className={styles.presetName}>{preset.name}</h5>
                <p className={styles.presetDescription}>{preset.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Effect Configuration */}
      <div className={styles.configSection}>
        <h4 className={styles.sectionTitle}>Configuration</h4>
        
        <div className={styles.configGroup}>
          <label className={styles.configLabel}>Effect Type:</label>
          <select
            value={customConfig.effectType || TransitionEffectType.FADE}
            onChange={(e) => handleConfigChange({ 
              effectType: e.target.value as TransitionEffectType 
            })}
            className={styles.configSelect}
          >
            {Object.values(TransitionEffectType).map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.configGroup}>
          <label className={styles.configLabel}>Easing:</label>
          <select
            value={customConfig.easingId || 'easeInOut'}
            onChange={(e) => handleConfigChange({ easingId: e.target.value })}
            className={styles.configSelect}
          >
            {EASING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} title={option.description}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {showAdvanced && (
          <>
            <div className={styles.configGroup}>
              <label className={styles.configLabel}>
                Out Duration: {Math.round(customConfig.outDurationProportion * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={customConfig.outDurationProportion}
                onChange={(e) => handleConfigChange({ 
                  outDurationProportion: Number(e.target.value) 
                })}
                className={styles.configSlider}
              />
            </div>

            <div className={styles.configGroup}>
              <label className={styles.configLabel}>
                In Duration: {Math.round(customConfig.inDurationProportion * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={customConfig.inDurationProportion}
                onChange={(e) => handleConfigChange({ 
                  inDurationProportion: Number(e.target.value) 
                })}
                className={styles.configSlider}
              />
            </div>

            <div className={styles.configGroup}>
              <label className={styles.configLabel}>
                Move Duration: {Math.round(customConfig.moveDurationProportion * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={customConfig.moveDurationProportion}
                onChange={(e) => handleConfigChange({ 
                  moveDurationProportion: Number(e.target.value) 
                })}
                className={styles.configSlider}
              />
            </div>

            {(customConfig.effectType === TransitionEffectType.SLIDE_LEFT ||
              customConfig.effectType === TransitionEffectType.SLIDE_RIGHT ||
              customConfig.effectType === TransitionEffectType.SLIDE_UP ||
              customConfig.effectType === TransitionEffectType.SLIDE_DOWN) && (
              <div className={styles.configGroup}>
                <label className={styles.configLabel}>
                  Slide Distance: {customConfig.slideDistance || 50}px
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="10"
                  value={customConfig.slideDistance || 50}
                  onChange={(e) => handleConfigChange({ 
                    slideDistance: Number(e.target.value) 
                  })}
                  className={styles.configSlider}
                />
              </div>
            )}

            {(customConfig.effectType === TransitionEffectType.SCALE ||
              customConfig.effectType === TransitionEffectType.ZOOM_IN ||
              customConfig.effectType === TransitionEffectType.ZOOM_OUT) && (
              <div className={styles.configGroup}>
                <label className={styles.configLabel}>
                  Scale Amount: {customConfig.scaleAmount || 0.8}x
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={customConfig.scaleAmount || 0.8}
                  onChange={(e) => handleConfigChange({ 
                    scaleAmount: Number(e.target.value) 
                  })}
                  className={styles.configSlider}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actionsSection}>
        <button
          type="button"
          className={styles.applyButton}
          onClick={handleApplyToCurrentSnapshot}
        >
          Apply to Current Snapshot
        </button>
        
        <button
          type="button"
          className={styles.previewButton}
          onClick={() => {
            // Trigger preview animation
            console.log('Preview effect:', customConfig);
          }}
        >
          Preview Effect
        </button>
      </div>

      {/* Effect Info */}
      <div className={styles.infoSection}>
        <h4 className={styles.sectionTitle}>Effect Information</h4>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <label>Type:</label>
            <span>{customConfig.effectType || 'None'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Easing:</label>
            <span>{customConfig.easingId || 'Linear'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Total Duration:</label>
            <span>
              {Math.round(
                (customConfig.outDurationProportion + 
                 customConfig.inDurationProportion + 
                 customConfig.moveDurationProportion) * 100
              )}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
