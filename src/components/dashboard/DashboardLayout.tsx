import { ReactNode, useState, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import styles from './DashboardLayout.module.scss';

export interface PanelConfig {
  id: string;
  title: string;
  component: ReactNode;
  defaultSize?: { width?: string; height?: string };
  minSize?: { width?: string; height?: string };
  maxSize?: { width?: string; height?: string };
  collapsible?: boolean;
  resizable?: boolean;
  gridArea?: string;
}

export interface DashboardLayoutProps {
  panels: PanelConfig[];
  className?: string;
}

export interface PanelState {
  id: string;
  collapsed: boolean;
  size: { width: string; height: string };
  position: { row: number; col: number };
}

export default function DashboardLayout({ panels, className }: DashboardLayoutProps) {
  // Panel state management
  const [panelStates, setPanelStates] = useState<Record<string, PanelState>>(() => {
    const initialStates: Record<string, PanelState> = {};
    panels.forEach((panel, index) => {
      initialStates[panel.id] = {
        id: panel.id,
        collapsed: false,
        size: {
          width: panel.defaultSize?.width || 'auto',
          height: panel.defaultSize?.height || 'auto',
        },
        position: { row: Math.floor(index / 2), col: index % 2 },
      };
    });
    return initialStates;
  });

  // Handle panel collapse/expand
  const togglePanelCollapse = useCallback((panelId: string) => {
    setPanelStates(prev => ({
      ...prev,
      [panelId]: {
        ...prev[panelId],
        collapsed: !prev[panelId].collapsed,
      },
    }));
  }, []);

  // Handle panel resize
  const updatePanelSize = useCallback((panelId: string, size: { width: string; height: string }) => {
    setPanelStates(prev => ({
      ...prev,
      [panelId]: {
        ...prev[panelId],
        size,
      },
    }));
  }, []);

  // Generate CSS Grid template areas based on panel configuration
  const generateGridTemplate = () => {
    const areas = panels.map(panel => panel.gridArea || panel.id);
    return areas;
  };

  return (
    <div className={`${styles.dashboardLayout} ${className || ''}`}>
      <div className={styles.gridContainer}>
        {panels.map((panel) => {
          const panelState = panelStates[panel.id];
          const isCollapsed = panelState?.collapsed || false;
          
          return (
            <div
              key={panel.id}
              className={`${styles.gridItem} ${isCollapsed ? styles.collapsed : ''}`}
              style={{
                gridArea: panel.gridArea || panel.id,
                width: panelState?.size.width,
                height: panelState?.size.height,
              }}
              data-panel-id={panel.id}
            >
              <div className={styles.panelWrapper}>
                <div className={styles.panelHeader}>
                  <h3 className={styles.panelTitle}>{panel.title}</h3>
                  <div className={styles.panelActions}>
                    {panel.collapsible && (
                      <button
                        type="button"
                        className={styles.collapseButton}
                        onClick={() => togglePanelCollapse(panel.id)}
                        aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
                      >
                        {isCollapsed ? '▶' : '▼'}
                      </button>
                    )}
                  </div>
                </div>
                
                {!isCollapsed && (
                  <div className={styles.panelContent}>
                    {panel.component}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
