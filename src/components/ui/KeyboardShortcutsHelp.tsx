import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyboardShortcutManager,
  type KeyboardShortcutGroup,
} from '../../utils/keyboard';
import { useKeyboardShortcut } from '../../utils/keyboard';
import styles from './KeyboardShortcutsHelp.module.scss';

export interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export default function KeyboardShortcutsHelp({
  isOpen,
  onClose,
  className,
}: KeyboardShortcutsHelpProps) {
  const [shortcutGroups, setShortcutGroups] = useState<KeyboardShortcutGroup[]>(
    [],
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const manager = KeyboardShortcutManager.getInstance();

  // Close on Escape key
  useKeyboardShortcut('Escape', onClose, {
    enabled: isOpen,
    description: 'Close keyboard shortcuts help',
    category: 'Help',
  });

  // Load shortcuts
  useEffect(() => {
    if (isOpen) {
      const groups = manager.getShortcutGroups();
      setShortcutGroups(groups);
    }
  }, [isOpen, manager]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter shortcuts based on search and category
  const filteredGroups = React.useMemo(() => {
    let filtered = shortcutGroups;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(
        (group) => group.category === selectedCategory,
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered
        .map((group) => ({
          ...group,
          shortcuts: group.shortcuts.filter(
            (shortcut) =>
              shortcut.description
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              shortcut.key.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
        }))
        .filter((group) => group.shortcuts.length > 0);
    }

    return filtered;
  }, [shortcutGroups, selectedCategory, searchTerm]);

  // Get all categories
  const categories = React.useMemo(() => {
    const cats = [
      'All',
      ...new Set(shortcutGroups.map((group) => group.category)),
    ];
    return cats.sort();
  }, [shortcutGroups]);

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
    },
    [],
  );

  const handleCategoryChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedCategory(event.target.value);
    },
    [],
  );

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('All');
  }, []);

  return (
    <div
      className={`${styles.overlay} ${className || ''}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 id="shortcuts-title" className={styles.title}>
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close keyboard shortcuts help"
          >
            ×
          </button>
        </div>

        <div className={styles.controls}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchTerm}
              onChange={handleSearchChange}
              className={styles.searchInput}
              aria-label="Search keyboard shortcuts"
            />
            {searchTerm && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={clearSearch}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className={styles.categorySelect}
            aria-label="Filter by category"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.content}>
          {filteredGroups.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No shortcuts found</p>
              {(searchTerm || selectedCategory !== 'All') && (
                <button
                  type="button"
                  className={styles.clearFiltersButton}
                  onClick={clearSearch}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.category} className={styles.group}>
                <h3 className={styles.groupTitle}>{group.category}</h3>
                <div className={styles.shortcuts}>
                  {group.shortcuts.map((shortcut) => (
                    <div key={shortcut.id} className={styles.shortcut}>
                      <div className={styles.shortcutKey}>
                        {manager.formatShortcut(shortcut)}
                      </div>
                      <div className={styles.shortcutDescription}>
                        {shortcut.description}
                      </div>
                      {shortcut.enabled === false && (
                        <div className={styles.disabledBadge}>Disabled</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.stats}>
            {filteredGroups.reduce(
              (total, group) => total + group.shortcuts.length,
              0,
            )}{' '}
            shortcuts
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
          <div className={styles.hint}>
            Press <kbd>Escape</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for managing keyboard shortcuts help visibility
export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const show = useCallback(() => setIsOpen(true), []);
  const hide = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Register global shortcut to show help
  useKeyboardShortcut('?', show, {
    description: 'Show keyboard shortcuts help',
    category: 'Help',
  });

  useKeyboardShortcut('F1', show, {
    description: 'Show keyboard shortcuts help',
    category: 'Help',
  });

  return {
    isOpen,
    show,
    hide,
    toggle,
    KeyboardShortcutsHelp: (
      props: Omit<KeyboardShortcutsHelpProps, 'isOpen' | 'onClose'>,
    ) => <KeyboardShortcutsHelp {...props} isOpen={isOpen} onClose={hide} />,
  };
}
