import { useState, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import { getSnapshotAtTime } from '../../core/doc/raw-doc';
import DashboardPanel from '../dashboard/DashboardPanel';
import AnimationPropertyPanel from './AnimationPropertyPanel';
import VisualEffectsPanel from './VisualEffectsPanel';
import styles from './PropertiesPanel.module.scss';

export interface PropertiesPanelProps {
  className?: string;
}

export default function PropertiesPanel({ className }: PropertiesPanelProps) {
  const { doc, currentTime, updateDocProperties, updateSnapshot } = useStore(
    useShallow((state) => ({
      doc: state.doc,
      currentTime: state.currentTime,
      updateDocProperties: state.updateDocProperties,
      updateSnapshot: state.updateSnapshot,
    })),
  );

  const [currentSnapshotIndex] = getSnapshotAtTime(doc, currentTime);
  const currentSnapshot = doc.snapshots[currentSnapshotIndex];
  const [activeSection, setActiveSection] = useState<
    'document' | 'snapshot' | 'animation' | 'effects'
  >('document');

  const handleDocPropertyChange = useCallback(
    (property: string, value: any) => {
      updateDocProperties({ [property]: value });
    },
    [updateDocProperties],
  );

  const handleSnapshotPropertyChange = useCallback(
    (property: string, value: any) => {
      if (currentSnapshot) {
        updateSnapshot(currentSnapshotIndex, {
          ...currentSnapshot,
          [property]: value,
        });
      }
    },
    [currentSnapshot, currentSnapshotIndex, updateSnapshot],
  );

  const panelActions = (
    <div className={styles.propertiesActions}>
      <div className={styles.sectionButtons}>
        <button
          type="button"
          className={`${styles.sectionButton} ${activeSection === 'document' ? styles.active : ''}`}
          onClick={() => setActiveSection('document')}
        >
          Document
        </button>
        <button
          type="button"
          className={`${styles.sectionButton} ${activeSection === 'snapshot' ? styles.active : ''}`}
          onClick={() => setActiveSection('snapshot')}
        >
          Snapshot #{currentSnapshotIndex + 1}
        </button>
        <button
          type="button"
          className={`${styles.sectionButton} ${activeSection === 'animation' ? styles.active : ''}`}
          onClick={() => setActiveSection('animation')}
        >
          Animation
        </button>
        <button
          type="button"
          className={`${styles.sectionButton} ${activeSection === 'effects' ? styles.active : ''}`}
          onClick={() => setActiveSection('effects')}
        >
          Effects
        </button>
      </div>
    </div>
  );

  return (
    <DashboardPanel
      id="properties"
      title="Properties"
      className={`${styles.propertiesPanel} ${className || ''}`}
      actions={panelActions}
      collapsible={true}
      resizable={true}
    >
      <div className={styles.propertiesContainer}>
        {activeSection === 'document' && (
          <div className={styles.documentProperties}>
            <div className={styles.propertyGroup}>
              <h4 className={styles.groupTitle}>Canvas</h4>

              <div className={styles.propertyRow}>
                <label className={styles.propertyLabel}>Width:</label>
                <input
                  type="number"
                  className={styles.numberInput}
                  value={doc.width}
                  min="320"
                  max="3840"
                  step="1"
                  onChange={(e) =>
                    handleDocPropertyChange('width', parseInt(e.target.value))
                  }
                />
                <span className={styles.unit}>px</span>
              </div>

              <div className={styles.propertyRow}>
                <label className={styles.propertyLabel}>Height:</label>
                <input
                  type="number"
                  className={styles.numberInput}
                  value={doc.height}
                  min="240"
                  max="2160"
                  step="1"
                  onChange={(e) =>
                    handleDocPropertyChange('height', parseInt(e.target.value))
                  }
                />
                <span className={styles.unit}>px</span>
              </div>
            </div>

            <div className={styles.propertyGroup}>
              <h4 className={styles.groupTitle}>Typography</h4>

              <div className={styles.propertyRow}>
                <label className={styles.propertyLabel}>Font Size:</label>
                <input
                  type="number"
                  className={styles.numberInput}
                  value={doc.fontSize}
                  min="8"
                  max="72"
                  step="1"
                  onChange={(e) =>
                    handleDocPropertyChange(
                      'fontSize',
                      parseInt(e.target.value),
                    )
                  }
                />
                <span className={styles.unit}>px</span>
              </div>

              <div className={styles.propertyRow}>
                <label className={styles.propertyLabel}>Line Height:</label>
                <input
                  type="number"
                  className={styles.numberInput}
                  value={doc.lineHeight}
                  min="10"
                  max="100"
                  step="1"
                  onChange={(e) =>
                    handleDocPropertyChange(
                      'lineHeight',
                      parseInt(e.target.value),
                    )
                  }
                />
                <span className={styles.unit}>px</span>
              </div>
            </div>

            <div className={styles.propertyGroup}>
              <h4 className={styles.groupTitle}>Padding</h4>

              <div className={styles.propertyRow}>
                <label className={styles.propertyLabel}>Top:</label>
                <input
                  type="number"
                  className={styles.numberInput}
                  value={doc.padding.top}
                  min="0"
                  max="200"
                  step="1"
                  onChange={(e) =>
                    handleDocPropertyChange('padding', {
                      ...doc.padding,
                      top: parseInt(e.target.value),
                    })
                  }
                />
                <span className={styles.unit}>px</span>
              </div>

              <div className={styles.propertyRow}>
                <label className={styles.propertyLabel}>Left:</label>
                <input
                  type="number"
                  className={styles.numberInput}
                  value={doc.padding.left}
                  min="0"
                  max="200"
                  step="1"
                  onChange={(e) =>
                    handleDocPropertyChange('padding', {
                      ...doc.padding,
                      left: parseInt(e.target.value),
                    })
                  }
                />
                <span className={styles.unit}>px</span>
              </div>

              <div className={styles.propertyRow}>
                <label className={styles.propertyLabel}>Bottom:</label>
                <input
                  type="number"
                  className={styles.numberInput}
                  value={doc.padding.bottom}
                  min="0"
                  max="200"
                  step="1"
                  onChange={(e) =>
                    handleDocPropertyChange('padding', {
                      ...doc.padding,
                      bottom: parseInt(e.target.value),
                    })
                  }
                />
                <span className={styles.unit}>px</span>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'snapshot' && currentSnapshot && (
          <div className={styles.snapshotProperties}>
            <div className={styles.propertyGroup}>
              <h4 className={styles.groupTitle}>Timing</h4>

              <div className={styles.propertyRow}>
                <label className={styles.propertyLabel}>Duration:</label>
                <input
                  type="number"
                  className={styles.numberInput}
                  value={currentSnapshot.duration}
                  min="100"
                  max="10000"
                  step="100"
                  onChange={(e) =>
                    handleSnapshotPropertyChange(
                      'duration',
                      parseInt(e.target.value),
                    )
                  }
                />
                <span className={styles.unit}>ms</span>
              </div>

              <div className={styles.propertyRow}>
                <label className={styles.propertyLabel}>Transition:</label>
                <input
                  type="number"
                  className={styles.numberInput}
                  value={currentSnapshot.transitionTime}
                  min="0"
                  max="5000"
                  step="50"
                  onChange={(e) =>
                    handleSnapshotPropertyChange(
                      'transitionTime',
                      parseInt(e.target.value),
                    )
                  }
                />
                <span className={styles.unit}>ms</span>
              </div>
            </div>

            <div className={styles.propertyGroup}>
              <h4 className={styles.groupTitle}>Code Info</h4>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Lines:</span>
                <span className={styles.infoValue}>
                  {currentSnapshot.code.split('\n').length}
                </span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Characters:</span>
                <span className={styles.infoValue}>
                  {currentSnapshot.code.length}
                </span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>ID:</span>
                <span className={styles.infoValue}>{currentSnapshot.id}</span>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'animation' && (
          <div className={styles.animationProperties}>
            <AnimationPropertyPanel
              selectedProperty={undefined}
              onPropertyUpdate={(property) => {
                console.log('Property updated:', property);
              }}
              onPropertyCreate={(property) => {
                console.log('Property created:', property);
              }}
              onPropertyDelete={(propertyId) => {
                console.log('Property deleted:', propertyId);
              }}
            />
          </div>
        )}

        {activeSection === 'effects' && (
          <div className={styles.effectsProperties}>
            <VisualEffectsPanel
              onEffectChange={(config) => {
                console.log('Effect changed:', config);
              }}
            />
          </div>
        )}
      </div>
    </DashboardPanel>
  );
}
