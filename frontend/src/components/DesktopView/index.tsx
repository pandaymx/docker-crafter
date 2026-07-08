import React, { useEffect, useState } from 'react';
import type { ContainerActionResults } from '../../hooks/useContainers';
import type { Workspace } from '../../types';
import { Sidebar } from './Sidebar';
import { Stage } from './Stage';

interface DesktopViewProps {
  workspaces: Workspace[];
  performAction: (
    action: 'start' | 'stop' | 'restart',
    containerIds: string[],
  ) => Promise<ContainerActionResults>;
  actionLoading: boolean;
}

export const DesktopView: React.FC<DesktopViewProps> = ({
  workspaces,
  performAction,
  actionLoading,
}) => {
  const [selectedWs, setSelectedWs] = useState<string | null>(null);

  // Auto-select first workspace if none selected
  useEffect(() => {
    if (workspaces.length > 0 && !selectedWs) {
      setSelectedWs(workspaces[0].name);
    }
  }, [workspaces, selectedWs]);

  const activeWorkspace = workspaces.find((w) => w.name === selectedWs) || null;

  return (
    <div className="flex h-screen w-full bg-gray-950 font-sans text-gray-200 overflow-hidden">
      <Sidebar
        workspaces={workspaces}
        selectedWorkspace={selectedWs}
        onSelect={setSelectedWs}
      />
      <Stage
        workspace={activeWorkspace}
        performAction={performAction}
        actionLoading={actionLoading}
      />
    </div>
  );
};
