import { type ReactNode } from 'react';
import { CodeEditor } from '../components/code-editor';
import { SnapshotList } from '../components/snapshot-list';
import { Timeline } from '../components/timeline';
import { ControlPanel } from '../components/control-panel';
import { ImportExportPanel } from '../components/import-export-panel';
import { EncodePanel } from '../components/encode-panel';

export interface DashboardPanel {
  id: string;
  title: string;
  component: ReactNode;
  defaultSize?: number;
}

/**
 * Dashboard panel configuration
 * Extracted from App component for better maintainability and performance
 */
export const createDashboardPanels = (): DashboardPanel[] => [
  {
    id: 'code-editor',
    title: 'Code Editor',
    component: <CodeEditor />,
    defaultSize: 40,
  },
  {
    id: 'snapshot-list',
    title: 'Snapshots',
    component: <SnapshotList />,
    defaultSize: 20,
  },
  {
    id: 'timeline',
    title: 'Timeline',
    component: <Timeline />,
    defaultSize: 15,
  },
  {
    id: 'control-panel',
    title: 'Controls',
    component: <ControlPanel />,
    defaultSize: 10,
  },
  {
    id: 'import-export',
    title: 'Import/Export',
    component: <ImportExportPanel />,
    defaultSize: 10,
  },
  {
    id: 'encode',
    title: 'Encode',
    component: <EncodePanel />,
    defaultSize: 5,
  },
];
