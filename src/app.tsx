import { useCallback, useEffect, useState, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import DashboardLayout, {
  type PanelConfig,
} from './components/dashboard/DashboardLayout';
import CodeEditorPanel from './components/panels/CodeEditorPanel';
import PreviewPanel from './components/panels/PreviewPanel';
import SnapshotsPanel from './components/panels/SnapshotsPanel';
import PropertiesPanel from './components/panels/PropertiesPanel';
import ToolsPanel from './components/panels/ToolsPanel';
import KeyboardShortcutsHelp from './components/ui/KeyboardShortcutsHelp';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { useStore } from './store';
import { getSnapshotAtTime, getSumDuration } from './core/doc/raw-doc';
import { StatusIndicator } from './view/status-indicator';
import {
  useKeyboardShortcuts,
  createShortcut,
  createCtrlShortcut,
  SHORTCUT_CATEGORIES,
  type KeyboardShortcut,
} from './hooks/useKeyboardShortcuts';
import styles from './app.module.scss';
import githubIcon from './assets/icons/github.svg';
import Icon from './view/icon';

export default function App() {
  const {
    doc,
    currentTime,
    updateSnapshot,
    playing,
    setPlaying,
    setCurrentTime,
    gotoSnapshot,
    duplicateSnapshot,
    deleteSnapshot,
    startEncodeTask,
  } = useStore(
    useShallow((state) => ({
      doc: state.doc,
      currentTime: state.currentTime,
      updateSnapshot: state.updateSnapshot,
      playing: state.playing,
      setPlaying: state.setPlaying,
      setCurrentTime: state.setCurrentTime,
      gotoSnapshot: state.gotoSnapshot,
      duplicateSnapshot: state.duplicateSnapshot,
      deleteSnapshot: state.deleteSnapshot,
      startEncodeTask: state.startEncodeTask,
    })),
  );

  const [showStatus, setShowStatus] = useState(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const [currentSnapshotIndex, currentSnapshotOffset] = getSnapshotAtTime(
    doc,
    currentTime,
  );
  const currentSnapShot = doc.snapshots[currentSnapshotIndex];

  const handleCodeUpdate = useCallback(
    (code: string) => {
      updateSnapshot(currentSnapshotIndex, {
        ...currentSnapShot,
        code,
      });
    },
    [currentSnapShot, currentSnapshotIndex, updateSnapshot],
  );

  // Memoize duration calculation
  const duration = useMemo(() => getSumDuration(doc), [doc]);

  // Define keyboard shortcuts with stable callbacks
  const shortcuts = useMemo((): KeyboardShortcut[] => {
    return [
      // Playback shortcuts
      createShortcut(
        ' ',
        () => setPlaying(!playing),
        'Play/Pause animation',
        SHORTCUT_CATEGORIES.PLAYBACK,
      ),
      createShortcut(
        'ArrowLeft',
        () => setCurrentTime(Math.max(0, currentTime - 1000)),
        'Seek backward 1s',
        SHORTCUT_CATEGORIES.PLAYBACK,
      ),
      createShortcut(
        'ArrowRight',
        () => setCurrentTime(Math.min(duration, currentTime + 1000)),
        'Seek forward 1s',
        SHORTCUT_CATEGORIES.PLAYBACK,
      ),
      createShortcut(
        'Home',
        () => setCurrentTime(0),
        'Go to beginning',
        SHORTCUT_CATEGORIES.PLAYBACK,
      ),
      createShortcut(
        'End',
        () => setCurrentTime(duration),
        'Go to end',
        SHORTCUT_CATEGORIES.PLAYBACK,
      ),
      createShortcut(
        'Escape',
        () => setPlaying(false),
        'Stop playback',
        SHORTCUT_CATEGORIES.PLAYBACK,
      ),

      // Navigation shortcuts
      createShortcut(
        'ArrowUp',
        () => {
          const newIndex = Math.max(0, currentSnapshotIndex - 1);
          gotoSnapshot(newIndex);
        },
        'Previous snapshot',
        SHORTCUT_CATEGORIES.NAVIGATION,
      ),
      createShortcut(
        'ArrowDown',
        () => {
          const newIndex = Math.min(
            doc.snapshots.length - 1,
            currentSnapshotIndex + 1,
          );
          gotoSnapshot(newIndex);
        },
        'Next snapshot',
        SHORTCUT_CATEGORIES.NAVIGATION,
      ),

      // Snapshot shortcuts
      createCtrlShortcut(
        'd',
        () => duplicateSnapshot(currentSnapshotIndex),
        'Duplicate current snapshot',
        SHORTCUT_CATEGORIES.SNAPSHOTS,
      ),
      createShortcut(
        'Delete',
        () => {
          if (doc.snapshots.length > 1) {
            deleteSnapshot(currentSnapshotIndex);
          }
        },
        'Delete current snapshot',
        SHORTCUT_CATEGORIES.SNAPSHOTS,
      ),

      // Export shortcuts
      createCtrlShortcut(
        'e',
        () => startEncodeTask(),
        'Export video',
        SHORTCUT_CATEGORIES.EXPORT,
      ),

      // View shortcuts
      createShortcut(
        '?',
        () => setShowShortcutsHelp(!showShortcutsHelp),
        'Toggle shortcuts help',
        SHORTCUT_CATEGORIES.VIEW,
      ),
      createShortcut(
        'F11',
        () => {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
        },
        'Toggle fullscreen',
        SHORTCUT_CATEGORIES.VIEW,
      ),
    ];
  }, [
    doc,
    playing,
    currentTime,
    currentSnapshotIndex,
    showShortcutsHelp,
    setPlaying,
    setCurrentTime,
    gotoSnapshot,
    duplicateSnapshot,
    deleteSnapshot,
    startEncodeTask,
  ]);

  // Use keyboard shortcuts hook
  const { getShortcutsByCategory, formatShortcut } = useKeyboardShortcuts({
    shortcuts,
    enabled: true,
    ignoreInputs: true,
  });

  // Define dashboard panels configuration
  const dashboardPanels: PanelConfig[] = [
    {
      id: 'editor',
      title: 'Code Editor',
      component: <CodeEditorPanel />,
      gridArea: 'editor',
      collapsible: true,
      resizable: true,
    },
    {
      id: 'preview',
      title: 'Preview',
      component: <PreviewPanel />,
      gridArea: 'preview',
      collapsible: true,
      resizable: true,
    },
    {
      id: 'snapshots',
      title: 'Snapshots',
      component: <SnapshotsPanel />,
      gridArea: 'snapshots',
      collapsible: true,
      resizable: true,
    },
    {
      id: 'properties',
      title: 'Properties',
      component: <PropertiesPanel />,
      gridArea: 'properties',
      collapsible: true,
      resizable: true,
    },
    {
      id: 'tools',
      title: 'Tools & Export',
      component: <ToolsPanel />,
      gridArea: 'tools',
      collapsible: true,
      resizable: true,
    },
  ];

  return (
    <ToastProvider>
      <ErrorBoundary>
        <div>
          <header className={styles.header}>
            <span className={styles.logo}>diffani</span>
            <a
              href="https://github.com/meowtec/diffani"
              target="_blank"
              rel="noreferrer"
              className={styles.githubLink}
            >
              <Icon name={githubIcon} />
            </a>
          </header>

          <DashboardLayout
            panels={dashboardPanels}
            className={styles.dashboard}
          />

          {/* Status Indicator */}
          {showStatus && (
            <StatusIndicator
              message="🎉 Dashboard optimized with drag-and-drop snapshots and comprehensive keyboard shortcuts! Press ? for help."
              type="success"
              duration={8000}
              onClose={() => setShowStatus(false)}
            />
          )}

          {/* Keyboard Shortcuts Help */}
          <KeyboardShortcutsHelp
            shortcuts={shortcuts}
            isVisible={showShortcutsHelp}
            onClose={() => setShowShortcutsHelp(false)}
            formatShortcut={formatShortcut}
            getShortcutsByCategory={getShortcutsByCategory}
          />
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}
