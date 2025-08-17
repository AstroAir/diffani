import { useState, useCallback, useRef, useEffect } from 'react';
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
  DragOverlay,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type RawSnapshot } from '../../core/doc/raw-doc';
import minusIcon from '../../assets/icons/minus.svg';
import addIcon from '../../assets/icons/add.svg';
import Icon from '../../view/icon';
import styles from './EnhancedDragDropSnapshot.module.scss';

export interface EnhancedDragDropSnapshotProps {
  snapshots: RawSnapshot[];
  currentSnapshotIndex: number;
  selectedSnapshots: Set<number>;
  editingSnapshot: number | null;
  onSnapshotClick: (index: number) => void;
  onSnapshotSelect: (index: number, selected: boolean) => void;
  onSnapshotReorder: (oldIndex: number, newIndex: number) => void;
  onSnapshotDelete: (index: number) => void;
  onSnapshotDuplicate: (index: number) => void;
  onDurationEdit: (index: number, duration: number) => void;
  setEditingSnapshot: (index: number | null) => void;
  // Enhanced features
  snapToGrid?: boolean;
  gridSize?: number;
  showDropZones?: boolean;
  enableMultiSelect?: boolean;
  enableBatchOperations?: boolean;
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
  onSnapshotDuplicate: (index: number) => void;
  onDurationEdit: (index: number, duration: number) => void;
  setEditingSnapshot: (index: number | null) => void;
  enableMultiSelect: boolean;
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
  onSnapshotDuplicate,
  onDurationEdit,
  setEditingSnapshot,
  enableMultiSelect,
}: SortableSnapshotItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: snapshot.id });

  const [isHovered, setIsHovered] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const combinedIsDragging = isDragging || isSortableDragging;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSnapshotClick(index);
      } else if (e.key === 'Delete' && canDelete) {
        e.preventDefault();
        onSnapshotDelete(index);
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onSnapshotDuplicate(index);
      }
    },
    [index, canDelete, onSnapshotClick, onSnapshotDelete, onSnapshotDuplicate],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.snapshotItem} ${isActive ? styles.active : ''} ${
        isSelected ? styles.selected : ''
      } ${combinedIsDragging ? styles.dragging : ''} ${
        isHovered ? styles.hovered : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listitem"
      aria-label={`Snapshot ${index + 1}`}
      aria-selected={isSelected}
    >
      <div className={styles.snapshotHeader}>
        <div
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          aria-label="Drag handle"
        >
          ⋮⋮
        </div>

        {enableMultiSelect && (
          <input
            type="checkbox"
            className={styles.snapshotCheckbox}
            checked={isSelected}
            onChange={(e) => onSnapshotSelect(index, e.target.checked)}
            aria-label={`Select snapshot ${index + 1}`}
          />
        )}

        <button
          type="button"
          className={styles.snapshotButton}
          onClick={() => onSnapshotClick(index)}
          aria-label={`Go to snapshot ${index + 1}`}
        >
          <span className={styles.snapshotNumber}>{index + 1}</span>
          <div className={styles.snapshotProgress}>
            <div
              className={styles.progressBar}
              style={{ width: `${Math.min(100, (index + 1) * 20)}%` }}
            />
          </div>
        </button>

        <div className={styles.snapshotActions}>
          <button
            type="button"
            className={styles.duplicateButton}
            onClick={(e) => {
              e.stopPropagation();
              onSnapshotDuplicate(index);
            }}
            title="Duplicate snapshot"
            aria-label={`Duplicate snapshot ${index + 1}`}
          >
            <Icon name={addIcon} />
          </button>

          {canDelete && (
            <button
              type="button"
              className={styles.deleteSnapshotButton}
              onClick={(e) => {
                e.stopPropagation();
                onSnapshotDelete(index);
              }}
              title="Delete snapshot"
              aria-label={`Delete snapshot ${index + 1}`}
            >
              <Icon name={minusIcon} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.snapshotDetails}>
        <div className={styles.snapshotProperty}>
          <label>Duration:</label>
          {isEditing ? (
            <input
              type="number"
              className={styles.durationInput}
              value={snapshot.duration}
              onChange={(e) => onDurationEdit(index, Number(e.target.value))}
              onBlur={() => setEditingSnapshot(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setEditingSnapshot(null);
                }
              }}
              autoFocus
              min="100"
              step="100"
            />
          ) : (
            <span
              className={styles.durationValue}
              onClick={() => setEditingSnapshot(index)}
              tabIndex={0}
              role="button"
              aria-label="Click to edit duration"
            >
              {snapshot.duration}ms
            </span>
          )}
        </div>
        <div className={styles.snapshotProperty}>
          <label>Transition:</label>
          <span className={styles.transitionValue}>
            {snapshot.transitionTime}ms
          </span>
        </div>
      </div>

      {/* Enhanced visual feedback */}
      {combinedIsDragging && (
        <div className={styles.dragGhost}>
          <div className={styles.ghostContent}>Moving...</div>
        </div>
      )}
    </div>
  );
}

// Drop zone component for better visual feedback
function DropZone({ index, isActive }: { index: number; isActive: boolean }) {
  return (
    <div
      className={`${styles.dropZone} ${isActive ? styles.active : ''}`}
      data-drop-index={index}
    >
      <div className={styles.dropIndicator}>
        <span>Drop here</span>
      </div>
    </div>
  );
}

export default function EnhancedDragDropSnapshot({
  snapshots,
  currentSnapshotIndex,
  selectedSnapshots,
  editingSnapshot,
  onSnapshotClick,
  onSnapshotSelect,
  onSnapshotReorder,
  onSnapshotDelete,
  onSnapshotDuplicate,
  onDurationEdit,
  setEditingSnapshot,
  snapToGrid = false,
  gridSize = 20,
  showDropZones = true,
  enableMultiSelect = true,
  enableBatchOperations = true,
}: EnhancedDragDropSnapshotProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (over) {
        const overIndex = snapshots.findIndex((s) => s.id === over.id);
        setDragOverIndex(overIndex);
      }
    },
    [snapshots],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = snapshots.findIndex((s) => s.id === active.id);
        const newIndex = snapshots.findIndex((s) => s.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          onSnapshotReorder(oldIndex, newIndex);
        }
      }

      setActiveId(null);
      setDragOverIndex(null);
    },
    [snapshots, onSnapshotReorder],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setDragOverIndex(null);
  }, []);

  const activeSnapshot = activeId
    ? snapshots.find((s) => s.id === activeId)
    : null;
  const activeIndex = activeSnapshot
    ? snapshots.findIndex((s) => s.id === activeSnapshot.id)
    : -1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={snapshots.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={containerRef}
          className={styles.snapshotsList}
          role="list"
          aria-label="Snapshots list"
        >
          {snapshots.map((snapshot, index) => {
            const isActive = index === currentSnapshotIndex;
            const isSelected = selectedSnapshots.has(index);
            const isEditing = editingSnapshot === index;
            const isDragging = activeId === snapshot.id;
            const canDelete = snapshots.length > 1;

            return (
              <div key={snapshot.id}>
                {showDropZones && index === 0 && (
                  <DropZone index={-1} isActive={dragOverIndex === -1} />
                )}

                <SortableSnapshotItem
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
                  onSnapshotDuplicate={onSnapshotDuplicate}
                  onDurationEdit={onDurationEdit}
                  setEditingSnapshot={setEditingSnapshot}
                  enableMultiSelect={enableMultiSelect}
                />

                {showDropZones && (
                  <DropZone index={index} isActive={dragOverIndex === index} />
                )}
              </div>
            );
          })}

          {snapshots.length === 0 && (
            <div className={styles.emptyState}>
              <p>
                No snapshots yet. Create your first snapshot to get started.
              </p>
            </div>
          )}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeSnapshot && (
          <div className={styles.dragOverlay}>
            <div className={styles.snapshotItem}>
              <div className={styles.snapshotHeader}>
                <div className={styles.dragHandle}>⋮⋮</div>
                <div className={styles.snapshotButton}>
                  <span className={styles.snapshotNumber}>
                    {activeIndex + 1}
                  </span>
                  <div className={styles.snapshotProgress}>
                    <div
                      className={styles.progressBar}
                      style={{
                        width: `${Math.min(100, (activeIndex + 1) * 20)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
