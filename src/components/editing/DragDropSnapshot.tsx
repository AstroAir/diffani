import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
  type SortableTransition,
  type Transform,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type RawSnapshot } from '../../core/doc/raw-doc';
import minusIcon from '../../assets/icons/minus.svg';
import Icon from '../../view/icon';
import styles from './DragDropSnapshot.module.scss';

export interface DragDropSnapshotProps {
  snapshots: RawSnapshot[];
  currentSnapshotIndex: number;
  selectedSnapshots: Set<number>;
  editingSnapshot: number | null;
  onSnapshotClick: (index: number) => void;
  onSnapshotSelect: (index: number, selected: boolean) => void;
  onSnapshotReorder: (oldIndex: number, newIndex: number) => void;
  onSnapshotDelete: (index: number) => void;
  onDurationEdit: (index: number, duration: number) => void;
  setEditingSnapshot: (index: number | null) => void;
}

interface SortableSnapshotItemProps {
  snapshot: RawSnapshot;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  isEditing: boolean;
  isDragging: boolean;
  canDelete: boolean;
  onSnapshotClick: (index: number) => void;
  onSnapshotSelect: (index: number, selected: boolean) => void;
  onSnapshotDelete: (index: number) => void;
  onDurationEdit: (index: number, duration: number) => void;
  setEditingSnapshot: (index: number | null) => void;
}

function SortableSnapshotItem({
  snapshot,
  index,
  isActive,
  isSelected,
  isEditing,
  isDragging,
  canDelete,
  onSnapshotClick,
  onSnapshotSelect,
  onSnapshotDelete,
  onDurationEdit,
  setEditingSnapshot,
}: SortableSnapshotItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: snapshot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const combinedIsDragging = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.snapshotItem} ${isActive ? styles.active : ''} ${
        isSelected ? styles.selected : ''
      } ${combinedIsDragging ? styles.dragging : ''}`}
      {...attributes}
    >
      <div className={styles.snapshotHeader}>
        <div
          className={styles.dragHandle}
          {...listeners}
          title="Drag to reorder"
          aria-label="Drag to reorder snapshot"
        >
          ⋮⋮
        </div>

        <input
          type="checkbox"
          className={styles.snapshotCheckbox}
          checked={isSelected}
          onChange={(e) => onSnapshotSelect(index, e.target.checked)}
          aria-label={`Select snapshot ${index}`}
        />

        <button
          type="button"
          className={styles.snapshotButton}
          onClick={() => onSnapshotClick(index)}
          aria-label={`Go to snapshot ${index}`}
        >
          <span className={styles.snapshotNumber}>#{index}</span>
          <div className={styles.snapshotProgress}>
            <div
              className={styles.progressBar}
              style={{ width: isActive ? '100%' : '0%' }}
            />
          </div>
        </button>

        {canDelete && (
          <button
            type="button"
            className={styles.deleteSnapshotButton}
            onClick={() => onSnapshotDelete(index)}
            title="Delete snapshot"
            aria-label={`Delete snapshot ${index}`}
          >
            <Icon name={minusIcon} />
          </button>
        )}
      </div>

      <div className={styles.snapshotDetails}>
        <div className={styles.snapshotProperty}>
          <label>Duration:</label>
          {isEditing ? (
            <input
              type="number"
              className={styles.durationInput}
              defaultValue={snapshot.duration}
              min="100"
              step="100"
              onBlur={(e) => onDurationEdit(index, parseInt(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onDurationEdit(index, parseInt(e.currentTarget.value));
                } else if (e.key === 'Escape') {
                  setEditingSnapshot(null);
                }
              }}
              autoFocus
              aria-label={`Edit duration for snapshot ${index}`}
            />
          ) : (
            <span
              className={styles.durationValue}
              onClick={() => setEditingSnapshot(index)}
              title="Click to edit"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setEditingSnapshot(index);
                }
              }}
              aria-label={`Duration: ${snapshot.duration}ms. Click to edit.`}
            >
              {snapshot.duration}ms
            </span>
          )}
        </div>

        <div className={styles.snapshotProperty}>
          <label>Transition:</label>
          <span className={styles.transitionValue} aria-label={`Transition time: ${snapshot.transitionTime}ms`}>
            {snapshot.transitionTime}ms
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DragDropSnapshot({
  snapshots,
  currentSnapshotIndex,
  selectedSnapshots,
  editingSnapshot,
  onSnapshotClick,
  onSnapshotSelect,
  onSnapshotReorder,
  onSnapshotDelete,
  onDurationEdit,
  setEditingSnapshot,
}: DragDropSnapshotProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = snapshots.findIndex((snapshot) => snapshot.id === active.id);
      const newIndex = snapshots.findIndex((snapshot) => snapshot.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onSnapshotReorder(oldIndex, newIndex);
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={snapshots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className={styles.snapshotsList} role="list" aria-label="Snapshots list">
          {snapshots.map((snapshot, index) => {
            const isActive = index === currentSnapshotIndex;
            const isSelected = selectedSnapshots.has(index);
            const isEditing = editingSnapshot === index;
            const isDragging = activeId === snapshot.id;
            const canDelete = snapshots.length > 1;

            return (
              <SortableSnapshotItem
                key={snapshot.id}
                snapshot={snapshot}
                index={index}
                isActive={isActive}
                isSelected={isSelected}
                isEditing={isEditing}
                isDragging={isDragging}
                canDelete={canDelete}
                onSnapshotClick={onSnapshotClick}
                onSnapshotSelect={onSnapshotSelect}
                onSnapshotDelete={onSnapshotDelete}
                onDurationEdit={onDurationEdit}
                setEditingSnapshot={setEditingSnapshot}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
