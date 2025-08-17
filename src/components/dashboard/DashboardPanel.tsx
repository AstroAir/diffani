import { ReactNode, useState, useRef, useCallback } from 'react';
import styles from './DashboardPanel.module.scss';

export interface DashboardPanelProps {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  resizable?: boolean;
  actions?: ReactNode;
  loading?: boolean;
  error?: string;
  onResize?: (size: { width: number; height: number }) => void;
  onCollapse?: (collapsed: boolean) => void;
}

export default function DashboardPanel({
  id,
  title,
  children,
  className,
  collapsible = true,
  resizable = false,
  actions,
  loading = false,
  error,
  onResize,
  onCollapse,
}: DashboardPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const handleCollapseToggle = useCallback(() => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onCollapse?.(newCollapsed);
  }, [collapsed, onCollapse]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!resizable || !panelRef.current) return;
    
    e.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
    };
    setIsResizing(true);

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current || !panelRef.current) return;
      
      const deltaX = e.clientX - resizeStartRef.current.x;
      const deltaY = e.clientY - resizeStartRef.current.y;
      const newWidth = Math.max(200, resizeStartRef.current.width + deltaX);
      const newHeight = Math.max(150, resizeStartRef.current.height + deltaY);
      
      panelRef.current.style.width = `${newWidth}px`;
      panelRef.current.style.height = `${newHeight}px`;
      
      onResize?.({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [resizable, onResize]);

  return (
    <div
      ref={panelRef}
      className={`${styles.dashboardPanel} ${className || ''} ${collapsed ? styles.collapsed : ''} ${isResizing ? styles.resizing : ''}`}
      data-panel-id={id}
    >
      <div className={styles.panelHeader}>
        <div className={styles.headerLeft}>
          <h3 className={styles.panelTitle}>{title}</h3>
          {loading && <div className={styles.loadingIndicator} />}
        </div>
        
        <div className={styles.headerRight}>
          {actions && <div className={styles.panelActions}>{actions}</div>}
          
          {collapsible && (
            <button
              type="button"
              className={styles.collapseButton}
              onClick={handleCollapseToggle}
              aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
              title={collapsed ? 'Expand panel' : 'Collapse panel'}
            >
              <span className={`${styles.collapseIcon} ${collapsed ? styles.collapsed : ''}`}>
                ▼
              </span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠</span>
          <span className={styles.errorMessage}>{error}</span>
        </div>
      )}

      <div className={`${styles.panelContent} ${collapsed ? styles.hidden : ''}`}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Loading...</span>
          </div>
        ) : (
          children
        )}
      </div>

      {resizable && !collapsed && (
        <div
          className={styles.resizeHandle}
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        />
      )}
    </div>
  );
}
