import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  category: string;
  action: () => void;
  preventDefault?: boolean;
  disabled?: boolean;
}

export interface KeyboardShortcutGroup {
  [category: string]: KeyboardShortcut[];
}

export interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  ignoreInputs?: boolean;
}

const isInputElement = (element: Element): boolean => {
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    element.getAttribute('contenteditable') === 'true'
  );
};

const matchesShortcut = (event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
  const keyMatches = event.code === shortcut.key || event.key === shortcut.key;
  const ctrlMatches = !!event.ctrlKey === !!shortcut.ctrlKey;
  const shiftMatches = !!event.shiftKey === !!shortcut.shiftKey;
  const altMatches = !!event.altKey === !!shortcut.altKey;
  const metaMatches = !!event.metaKey === !!shortcut.metaKey;

  return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
};

export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
  ignoreInputs = true,
}: UseKeyboardShortcutsOptions) => {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore shortcuts when typing in inputs
      if (ignoreInputs && event.target && isInputElement(event.target as Element)) {
        return;
      }

      const activeShortcuts = shortcutsRef.current.filter(s => !s.disabled);

      for (const shortcut of activeShortcuts) {
        if (matchesShortcut(event, shortcut)) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          break; // Only execute the first matching shortcut
        }
      }
    },
    [enabled, ignoreInputs]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  const getShortcutsByCategory = useCallback((): KeyboardShortcutGroup => {
    const groups: KeyboardShortcutGroup = {};
    
    shortcuts.forEach(shortcut => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category].push(shortcut);
    });

    return groups;
  }, [shortcuts]);

  const formatShortcut = useCallback((shortcut: KeyboardShortcut): string => {
    const parts: string[] = [];
    
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.metaKey) parts.push('Cmd');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    
    // Format key name
    let keyName = shortcut.key;
    if (keyName.startsWith('Arrow')) {
      keyName = keyName.replace('Arrow', '');
    } else if (keyName === ' ') {
      keyName = 'Space';
    } else if (keyName.length === 1) {
      keyName = keyName.toUpperCase();
    }
    
    parts.push(keyName);
    
    return parts.join(' + ');
  }, []);

  return {
    getShortcutsByCategory,
    formatShortcut,
  };
};

// Predefined shortcut categories
export const SHORTCUT_CATEGORIES = {
  PLAYBACK: 'Playback',
  NAVIGATION: 'Navigation',
  EDITING: 'Editing',
  SNAPSHOTS: 'Snapshots',
  EXPORT: 'Export',
  VIEW: 'View',
  GENERAL: 'General',
} as const;

// Helper function to create shortcuts
export const createShortcut = (
  key: string,
  action: () => void,
  description: string,
  category: string = SHORTCUT_CATEGORIES.GENERAL,
  modifiers: Partial<Pick<KeyboardShortcut, 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>> = {}
): KeyboardShortcut => ({
  key,
  action,
  description,
  category,
  preventDefault: true,
  disabled: false,
  ...modifiers,
});

// Common shortcut patterns
export const createCtrlShortcut = (
  key: string,
  action: () => void,
  description: string,
  category?: string
): KeyboardShortcut => createShortcut(key, action, description, category, { ctrlKey: true });

export const createShiftShortcut = (
  key: string,
  action: () => void,
  description: string,
  category?: string
): KeyboardShortcut => createShortcut(key, action, description, category, { shiftKey: true });

export const createAltShortcut = (
  key: string,
  action: () => void,
  description: string,
  category?: string
): KeyboardShortcut => createShortcut(key, action, description, category, { altKey: true });
