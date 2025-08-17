/**
 * Comprehensive keyboard shortcuts system for Diffani
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  id: string;
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  category: string;
  action: () => void;
  preventDefault?: boolean;
  enabled?: boolean;
}

export interface KeyboardShortcutGroup {
  category: string;
  shortcuts: KeyboardShortcut[];
}

export class KeyboardShortcutManager {
  private static instance: KeyboardShortcutManager;
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private listeners: Set<(event: KeyboardEvent) => void> = new Set();
  private isEnabled = true;

  static getInstance(): KeyboardShortcutManager {
    if (!KeyboardShortcutManager.instance) {
      KeyboardShortcutManager.instance = new KeyboardShortcutManager();
    }
    return KeyboardShortcutManager.instance;
  }

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private createShortcutKey(shortcut: Omit<KeyboardShortcut, 'id' | 'action'>): string {
    const modifiers = [];
    if (shortcut.ctrlKey) modifiers.push('ctrl');
    if (shortcut.shiftKey) modifiers.push('shift');
    if (shortcut.altKey) modifiers.push('alt');
    if (shortcut.metaKey) modifiers.push('meta');
    
    return [...modifiers, shortcut.key.toLowerCase()].join('+');
  }

  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    return (
      event.key.toLowerCase() === shortcut.key.toLowerCase() &&
      !!event.ctrlKey === !!shortcut.ctrlKey &&
      !!event.shiftKey === !!shortcut.shiftKey &&
      !!event.altKey === !!shortcut.altKey &&
      !!event.metaKey === !!shortcut.metaKey
    );
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    // Skip if user is typing in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    for (const shortcut of this.shortcuts.values()) {
      if (shortcut.enabled !== false && this.matchesShortcut(event, shortcut)) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.action();
        break;
      }
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(event));
  }

  registerShortcut(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  unregisterShortcut(id: string): void {
    this.shortcuts.delete(id);
  }

  updateShortcut(id: string, updates: Partial<KeyboardShortcut>): void {
    const existing = this.shortcuts.get(id);
    if (existing) {
      this.shortcuts.set(id, { ...existing, ...updates });
    }
  }

  getShortcut(id: string): KeyboardShortcut | undefined {
    return this.shortcuts.get(id);
  }

  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcutsByCategory(category: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category);
  }

  getShortcutGroups(): KeyboardShortcutGroup[] {
    const groups = new Map<string, KeyboardShortcut[]>();
    
    for (const shortcut of this.shortcuts.values()) {
      if (!groups.has(shortcut.category)) {
        groups.set(shortcut.category, []);
      }
      groups.get(shortcut.category)!.push(shortcut);
    }

    return Array.from(groups.entries()).map(([category, shortcuts]) => ({
      category,
      shortcuts: shortcuts.sort((a, b) => a.description.localeCompare(b.description)),
    }));
  }

  addListener(listener: (event: KeyboardEvent) => void): void {
    this.listeners.add(listener);
  }

  removeListener(listener: (event: KeyboardEvent) => void): void {
    this.listeners.delete(listener);
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  isShortcutEnabled(): boolean {
    return this.isEnabled;
  }

  formatShortcut(shortcut: KeyboardShortcut): string {
    const modifiers = [];
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    if (shortcut.ctrlKey) modifiers.push(isMac ? '⌘' : 'Ctrl');
    if (shortcut.shiftKey) modifiers.push('⇧');
    if (shortcut.altKey) modifiers.push(isMac ? '⌥' : 'Alt');
    if (shortcut.metaKey) modifiers.push('⌘');
    
    const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
    return [...modifiers, key].join(isMac ? '' : '+');
  }

  dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.shortcuts.clear();
    this.listeners.clear();
  }
}

// React hook for keyboard shortcuts
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
  const manager = KeyboardShortcutManager.getInstance();
  const shortcutIds = useRef<string[]>([]);

  useEffect(() => {
    // Register shortcuts
    shortcuts.forEach(shortcut => {
      manager.registerShortcut(shortcut);
      shortcutIds.current.push(shortcut.id);
    });

    // Cleanup on unmount
    return () => {
      shortcutIds.current.forEach(id => {
        manager.unregisterShortcut(id);
      });
      shortcutIds.current = [];
    };
  }, [shortcuts, manager]);
}

// React hook for single keyboard shortcut
export function useKeyboardShortcut(
  key: string,
  action: () => void,
  options: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    preventDefault?: boolean;
    enabled?: boolean;
    description?: string;
    category?: string;
  } = {}
): void {
  const actionRef = useRef(action);
  actionRef.current = action;

  const shortcut = useCallback((): KeyboardShortcut => ({
    id: `shortcut-${key}-${Date.now()}`,
    key,
    ctrlKey: options.ctrlKey,
    shiftKey: options.shiftKey,
    altKey: options.altKey,
    metaKey: options.metaKey,
    preventDefault: options.preventDefault,
    enabled: options.enabled,
    description: options.description || `${key} shortcut`,
    category: options.category || 'General',
    action: () => actionRef.current(),
  }), [key, options]);

  useKeyboardShortcuts([shortcut()]);
}

// Predefined shortcuts for Diffani
export const DIFFANI_SHORTCUTS: KeyboardShortcut[] = [
  // Playback controls
  {
    id: 'play-pause',
    key: ' ',
    description: 'Play/Pause animation',
    category: 'Playback',
    action: () => {
      // Will be connected to store action
      console.log('Play/Pause triggered');
    },
  },
  {
    id: 'stop',
    key: 'Escape',
    description: 'Stop animation',
    category: 'Playback',
    action: () => {
      console.log('Stop triggered');
    },
  },
  {
    id: 'restart',
    key: 'Home',
    description: 'Restart animation',
    category: 'Playback',
    action: () => {
      console.log('Restart triggered');
    },
  },

  // Timeline navigation
  {
    id: 'next-frame',
    key: 'ArrowRight',
    description: 'Next frame',
    category: 'Timeline',
    action: () => {
      console.log('Next frame triggered');
    },
  },
  {
    id: 'prev-frame',
    key: 'ArrowLeft',
    description: 'Previous frame',
    category: 'Timeline',
    action: () => {
      console.log('Previous frame triggered');
    },
  },
  {
    id: 'jump-forward',
    key: 'ArrowRight',
    shiftKey: true,
    description: 'Jump forward 10 frames',
    category: 'Timeline',
    action: () => {
      console.log('Jump forward triggered');
    },
  },
  {
    id: 'jump-backward',
    key: 'ArrowLeft',
    shiftKey: true,
    description: 'Jump backward 10 frames',
    category: 'Timeline',
    action: () => {
      console.log('Jump backward triggered');
    },
  },

  // Snapshot management
  {
    id: 'add-snapshot',
    key: 'n',
    ctrlKey: true,
    description: 'Add new snapshot',
    category: 'Snapshots',
    action: () => {
      console.log('Add snapshot triggered');
    },
  },
  {
    id: 'duplicate-snapshot',
    key: 'd',
    ctrlKey: true,
    description: 'Duplicate current snapshot',
    category: 'Snapshots',
    action: () => {
      console.log('Duplicate snapshot triggered');
    },
  },
  {
    id: 'delete-snapshot',
    key: 'Delete',
    description: 'Delete selected snapshot',
    category: 'Snapshots',
    action: () => {
      console.log('Delete snapshot triggered');
    },
  },

  // Timeline editing
  {
    id: 'add-keyframe',
    key: 'k',
    description: 'Add keyframe at current time',
    category: 'Timeline',
    action: () => {
      console.log('Add keyframe triggered');
    },
  },
  {
    id: 'delete-keyframe',
    key: 'k',
    shiftKey: true,
    description: 'Delete keyframe at current time',
    category: 'Timeline',
    action: () => {
      console.log('Delete keyframe triggered');
    },
  },

  // View controls
  {
    id: 'zoom-in',
    key: '=',
    ctrlKey: true,
    description: 'Zoom in timeline',
    category: 'View',
    action: () => {
      console.log('Zoom in triggered');
    },
  },
  {
    id: 'zoom-out',
    key: '-',
    ctrlKey: true,
    description: 'Zoom out timeline',
    category: 'View',
    action: () => {
      console.log('Zoom out triggered');
    },
  },
  {
    id: 'fit-timeline',
    key: '0',
    ctrlKey: true,
    description: 'Fit timeline to view',
    category: 'View',
    action: () => {
      console.log('Fit timeline triggered');
    },
  },

  // Export
  {
    id: 'export',
    key: 'e',
    ctrlKey: true,
    description: 'Export animation',
    category: 'Export',
    action: () => {
      console.log('Export triggered');
    },
  },

  // General
  {
    id: 'save',
    key: 's',
    ctrlKey: true,
    description: 'Save project',
    category: 'General',
    action: () => {
      console.log('Save triggered');
    },
  },
  {
    id: 'undo',
    key: 'z',
    ctrlKey: true,
    description: 'Undo last action',
    category: 'General',
    action: () => {
      console.log('Undo triggered');
    },
  },
  {
    id: 'redo',
    key: 'y',
    ctrlKey: true,
    description: 'Redo last action',
    category: 'General',
    action: () => {
      console.log('Redo triggered');
    },
  },
  {
    id: 'help',
    key: '?',
    description: 'Show keyboard shortcuts help',
    category: 'General',
    action: () => {
      console.log('Help triggered');
    },
  },
];

// Utility functions
export function getShortcutText(shortcut: KeyboardShortcut): string {
  const manager = KeyboardShortcutManager.getInstance();
  return manager.formatShortcut(shortcut);
}

export function isShortcutActive(shortcut: KeyboardShortcut): boolean {
  return shortcut.enabled !== false;
}

export function createShortcutId(key: string, modifiers: string[] = []): string {
  return [...modifiers, key].join('+').toLowerCase();
}
