import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import {
  TransitionEffectType,
  type TransitionConfig,
  DEFAULT_TRANSITION_CONFIG,
} from '../../core/transition/transition';
import {
  // EASING_FUNCTIONS, // Unused for now
  getEasingFunctionsByCategory,
  DEFAULT_EASING,
} from '../../core/transition/easing';
import { type DocSnapshot } from '../../core/doc/raw-doc';
import styles from './index.module.scss';

interface TransitionControlsProps {
  snapshotIndex: number;
  snapshot: DocSnapshot;
}

const EFFECT_TYPE_OPTIONS = [
  { value: TransitionEffectType.FADE, label: 'Fade' },
  { value: TransitionEffectType.CROSSFADE, label: 'Crossfade' },
  { value: TransitionEffectType.SLIDE_LEFT, label: 'Slide Left' },
  { value: TransitionEffectType.SLIDE_RIGHT, label: 'Slide Right' },
  { value: TransitionEffectType.SLIDE_UP, label: 'Slide Up' },
  { value: TransitionEffectType.SLIDE_DOWN, label: 'Slide Down' },
  { value: TransitionEffectType.SCALE, label: 'Scale' },
  { value: TransitionEffectType.ZOOM_IN, label: 'Zoom In' },
  { value: TransitionEffectType.ZOOM_OUT, label: 'Zoom Out' },
];

export function TransitionControls({
  snapshotIndex,
  snapshot,
}: TransitionControlsProps) {
  const { updateSnapshot } = useStore(
    useShallow((state) => ({
      updateSnapshot: state.updateSnapshot,
    })),
  );

  const [isExpanded, setIsExpanded] = useState(false);

  const currentConfig = {
    ...DEFAULT_TRANSITION_CONFIG,
    ...snapshot.transitionConfig,
  };

  const easingsByCategory = getEasingFunctionsByCategory();

  const handleConfigChange = (updates: Partial<TransitionConfig>) => {
    const newTransitionConfig = {
      ...currentConfig,
      ...updates,
    };

    updateSnapshot(snapshotIndex, {
      ...snapshot,
      transitionConfig: newTransitionConfig,
    });
  };

  const handleEffectTypeChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    handleConfigChange({
      effectType: event.target.value as TransitionEffectType,
    });
  };

  const handleEasingChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    handleConfigChange({
      easingId: event.target.value,
    });
  };

  // const handleDurationChange =
  //   (field: keyof TransitionConfig) =>
  //   (event: React.ChangeEvent<HTMLInputElement>) => {
  //     handleConfigChange({
  //       [field]: parseFloat(event.target.value),
  //     });
  //   };

  const handleSliderChange =
    (field: keyof TransitionConfig) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleConfigChange({
        [field]: parseFloat(event.target.value),
      });
    };

  return (
    <div className={styles.transitionControls}>
      <button
        type="button"
        className={styles.toggleButton}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        Transition Effects {isExpanded ? '▼' : '▶'}
      </button>

      {isExpanded && (
        <div className={styles.controlsPanel}>
          <div className={styles.section}>
            <label className={styles.label}>
              Effect Type:
              <select
                value={currentConfig.effectType || TransitionEffectType.FADE}
                onChange={handleEffectTypeChange}
                className={styles.select}
              >
                {EFFECT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>
              Easing Function:
              <select
                value={currentConfig.easingId || DEFAULT_EASING}
                onChange={handleEasingChange}
                className={styles.select}
              >
                {Object.entries(easingsByCategory).map(
                  ([category, easings]) => (
                    <optgroup key={category} label={category}>
                      {easings.map((easing) => (
                        <option key={easing.id} value={easing.id}>
                          {easing.name}
                        </option>
                      ))}
                    </optgroup>
                  ),
                )}
              </select>
            </label>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Duration Controls</h4>

            <label className={styles.label}>
              Out Duration:{' '}
              {(currentConfig.outDurationProportion * 100).toFixed(0)}%
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={currentConfig.outDurationProportion}
                onChange={handleSliderChange('outDurationProportion')}
                className={styles.slider}
              />
            </label>

            <label className={styles.label}>
              Move Duration:{' '}
              {(currentConfig.moveDurationProportion * 100).toFixed(0)}%
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={currentConfig.moveDurationProportion}
                onChange={handleSliderChange('moveDurationProportion')}
                className={styles.slider}
              />
            </label>

            <label className={styles.label}>
              In Duration:{' '}
              {(currentConfig.inDurationProportion * 100).toFixed(0)}%
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={currentConfig.inDurationProportion}
                onChange={handleSliderChange('inDurationProportion')}
                className={styles.slider}
              />
            </label>
          </div>

          {(currentConfig.effectType?.includes('slide') ||
            currentConfig.effectType === TransitionEffectType.SCALE ||
            currentConfig.effectType === TransitionEffectType.FADE) && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Effect Settings</h4>

              {currentConfig.effectType?.includes('slide') && (
                <label className={styles.label}>
                  Slide Distance: {currentConfig.slideDistance || 50}px
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={currentConfig.slideDistance || 50}
                    onChange={handleSliderChange('slideDistance')}
                    className={styles.slider}
                  />
                </label>
              )}

              {currentConfig.effectType === TransitionEffectType.SCALE && (
                <label className={styles.label}>
                  Scale Amount:{' '}
                  {((currentConfig.scaleAmount || 0.8) * 100).toFixed(0)}%
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={currentConfig.scaleAmount || 0.8}
                    onChange={handleSliderChange('scaleAmount')}
                    className={styles.slider}
                  />
                </label>
              )}

              {currentConfig.effectType === TransitionEffectType.FADE && (
                <label className={styles.label}>
                  Fade Opacity:{' '}
                  {((currentConfig.fadeOpacity || 0) * 100).toFixed(0)}%
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={currentConfig.fadeOpacity || 0}
                    onChange={handleSliderChange('fadeOpacity')}
                    className={styles.slider}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
