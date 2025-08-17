import { useState, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import { getSnapshotAtTime } from '../../core/doc/raw-doc';
import DashboardPanel from '../dashboard/DashboardPanel';
import EnhancedDragDropSnapshot from '../editing/EnhancedDragDropSnapshot';
import addIcon from '../../assets/icons/add.svg';
import minusIcon from '../../assets/icons/minus.svg';
import Icon from '../../view/icon';
import styles from './SnapshotsPanel.module.scss';

export interface SnapshotsPanelProps {
  className?: string;
}

export default function SnapshotsPanel({ className }: SnapshotsPanelProps) {
  const {
    doc,
    currentTime,
    gotoSnapshot,
    duplicateSnapshot,
    deleteSnapshot,
    updateSnapshot,
    reorderSnapshots,
  } = useStore(
    useShallow((state) => ({
      doc: state.doc,
      currentTime: state.currentTime,
      gotoSnapshot: state.gotoSnapshot,
      duplicateSnapshot: state.duplicateSnapshot,
      deleteSnapshot: state.deleteSnapshot,
      updateSnapshot: state.updateSnapshot,
      reorderSnapshots: state.reorderSnapshots,
    })),
  );

  const [currentSnapshotIndex] = getSnapshotAtTime(doc, currentTime);
  const [selectedSnapshots, setSelectedSnapshots] = useState<Set<number>>(
    new Set(),
  );
  const [editingSnapshot, setEditingSnapshot] = useState<number | null>(null);

  const handleSnapshotClick = useCallback(
    (index: number) => {
      gotoSnapshot(index);
    },
    [gotoSnapshot],
  );

  const handleSnapshotSelect = useCallback(
    (index: number, selected: boolean) => {
      setSelectedSnapshots((prev) => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(index);
        } else {
          newSet.delete(index);
        }
        return newSet;
      });
    },
    [],
  );

  const handleBulkDelete = useCallback(() => {
    const indices = Array.from(selectedSnapshots).sort((a, b) => b - a);
    indices.forEach((index) => {
      if (doc.snapshots.length > 1) {
        deleteSnapshot(index);
      }
    });
    setSelectedSnapshots(new Set());
  }, [selectedSnapshots, deleteSnapshot, doc.snapshots.length]);

  const handleDurationEdit = useCallback(
    (index: number, duration: number) => {
      const snapshot = doc.snapshots[index];
      if (snapshot && duration > 0) {
        updateSnapshot(index, {
          ...snapshot,
          duration: Math.max(100, duration), // Minimum 100ms
        });
      }
      setEditingSnapshot(null);
    },
    [doc.snapshots, updateSnapshot],
  );

  const panelActions = (
    <div className={styles.snapshotActions}>
      <button
        type="button"
        className={styles.addButton}
        onClick={() => duplicateSnapshot(doc.snapshots.length - 1)}
        title="Add new snapshot"
      >
        <Icon name={addIcon} />
      </button>

      {selectedSnapshots.size > 0 && (
        <button
          type="button"
          className={styles.deleteButton}
          onClick={handleBulkDelete}
          title={`Delete ${selectedSnapshots.size} snapshot(s)`}
          disabled={doc.snapshots.length <= selectedSnapshots.size}
        >
          <Icon name={minusIcon} />
          <span>{selectedSnapshots.size}</span>
        </button>
      )}

      <div className={styles.snapshotCount}>
        {doc.snapshots.length} snapshots
      </div>
    </div>
  );

  return (
    <DashboardPanel
      id="snapshots"
      title="Snapshots"
      className={`${styles.snapshotsPanel} ${className || ''}`}
      actions={panelActions}
      collapsible={true}
      resizable={true}
    >
      <div className={styles.snapshotsContainer}>
        <EnhancedDragDropSnapshot
          snapshots={doc.snapshots}
          currentSnapshotIndex={currentSnapshotIndex}
          selectedSnapshots={selectedSnapshots}
          editingSnapshot={editingSnapshot}
          onSnapshotClick={handleSnapshotClick}
          onSnapshotSelect={handleSnapshotSelect}
          onSnapshotReorder={reorderSnapshots}
          onSnapshotDelete={deleteSnapshot}
          onSnapshotDuplicate={duplicateSnapshot}
          onDurationEdit={handleDurationEdit}
          setEditingSnapshot={setEditingSnapshot}
          snapToGrid={true}
          showDropZones={true}
          enableMultiSelect={true}
          enableBatchOperations={true}
        />
      </div>
    </DashboardPanel>
  );
}
