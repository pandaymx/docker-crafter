import React from 'react';
import type { Workspace } from '../../types';
import { Folder, FolderGit2, Box } from 'lucide-react';

interface SidebarProps {
  workspaces: Workspace[];
  selectedWorkspace: string | null;
  onSelect: (name: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspaces,
  selectedWorkspace,
  onSelect,
}) => {
  return (
    <div className="w-64 bg-gray-900 text-gray-300 flex flex-col h-full border-r border-gray-800">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
          Workspaces
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {workspaces.map((ws) => {
          const isSelected = selectedWorkspace === ws.name;
          return (
            <button
              key={ws.name}
              onClick={() => onSelect(ws.name)}
              className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${isSelected ? 'bg-gray-800 text-white' : 'hover:bg-gray-800/50'}`}
            >
              {ws.type === 'compose' ? (
                <FolderGit2 size={16} className="text-blue-400" />
              ) : ws.type === 'custom' ? (
                <Folder size={16} className="text-green-400" />
              ) : (
                <Box size={16} className="text-gray-400" />
              )}
              <div className="flex-1 truncate text-sm">{ws.name}</div>
              <div
                className={`text-xs ${ws.runningCount === ws.totalCount && ws.totalCount > 0 ? 'text-green-400' : 'text-amber-400'}`}
              >
                [{ws.runningCount}/{ws.totalCount}]
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
