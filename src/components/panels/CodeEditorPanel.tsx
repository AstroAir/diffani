import { useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import { getSnapshotAtTime } from '../../core/doc/raw-doc';
import CodeEditor from '../../view/editor/code-editor';
import DashboardPanel from '../dashboard/DashboardPanel';
import styles from './CodeEditorPanel.module.scss';

export interface CodeEditorPanelProps {
  className?: string;
}

export default function CodeEditorPanel({ className }: CodeEditorPanelProps) {
  const { doc, currentTime, updateSnapshot } = useStore(
    useShallow((state) => ({
      doc: state.doc,
      currentTime: state.currentTime,
      updateSnapshot: state.updateSnapshot,
    })),
  );

  const [currentSnapshotIndex] = getSnapshotAtTime(doc, currentTime);
  const currentSnapshot = doc.snapshots[currentSnapshotIndex];

  const handleCodeUpdate = useCallback(
    (code: string) => {
      if (currentSnapshot) {
        updateSnapshot(currentSnapshotIndex, {
          ...currentSnapshot,
          code,
        });
      }
    },
    [currentSnapshot, currentSnapshotIndex, updateSnapshot],
  );

  const panelActions = (
    <div className={styles.editorActions}>
      <div className={styles.languageIndicator}>
        {doc.language.toUpperCase()}
      </div>
      <div className={styles.snapshotIndicator}>
        Snapshot #{currentSnapshotIndex}
      </div>
    </div>
  );

  return (
    <DashboardPanel
      id="editor"
      title="Code Editor"
      className={`${styles.codeEditorPanel} ${className || ''}`}
      actions={panelActions}
      collapsible={true}
      resizable={true}
    >
      <div className={styles.editorContainer}>
        <CodeEditor
          value={currentSnapshot?.code || ''}
          language={doc.language}
          onChange={handleCodeUpdate}
          className={styles.codeEditor}
        />
      </div>

      <div className={styles.editorFooter}>
        <div className={styles.editorStats}>
          <span className={styles.stat}>
            Lines: {(currentSnapshot?.code || '').split('\n').length}
          </span>
          <span className={styles.stat}>
            Characters: {(currentSnapshot?.code || '').length}
          </span>
        </div>

        <div className={styles.editorHints}>
          <span className={styles.hint}>
            <kbd>Ctrl</kbd> + <kbd>S</kbd> to save
          </span>
          <span className={styles.hint}>
            <kbd>Tab</kbd> to indent
          </span>
        </div>
      </div>
    </DashboardPanel>
  );
}
