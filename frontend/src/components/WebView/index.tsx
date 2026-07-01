import React from 'react';
import type { Workspace } from '../../types';
import { KanbanBoard } from './KanbanBoard';

interface WebViewProps {
  workspaces: Workspace[];
}

export const WebView: React.FC<WebViewProps> = ({ workspaces }) => {
  return (
    <div className="flex flex-col h-screen w-full bg-[#0f1115]">
      <header className="h-14 border-b border-gray-800 bg-[#16191f] flex items-center px-6 shrink-0">
        <h1 className="text-lg font-bold text-gray-200">Container Swimlanes</h1>
      </header>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard workspaces={workspaces} />
      </div>
    </div>
  );
};
