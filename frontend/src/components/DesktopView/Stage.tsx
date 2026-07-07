import { Box, Play, RefreshCw, Square } from 'lucide-react';
import React from 'react';
import type { Workspace } from '../../types';

interface StageProps {
  workspace: Workspace | null;
}

export const Stage: React.FC<StageProps> = ({ workspace }) => {
  if (!workspace) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-950">
        Select a workspace from the sidebar
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-950 overflow-hidden text-gray-200">
      {/* Batch Action Panel */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            {workspace.name}
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
              {workspace.type}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
            <Play size={14} /> Start All
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-900 hover:bg-red-800 text-red-100 rounded transition-colors">
            <Square size={14} /> Stop All
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition-colors">
            <RefreshCw size={14} /> Restart
          </button>
        </div>
      </div>

      {/* Container Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspace.containers.map((c) => (
            <div
              key={c.id}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 truncate">
                  <Box size={16} className="text-gray-500 shrink-0" />
                  <span className="font-medium truncate" title={c.name}>
                    {c.name || c.id.substring(0, 12)}
                  </span>
                </div>
                <div className="shrink-0 flex items-center">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${c.healthStatus === 'running' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : c.healthStatus === 'unhealthy' ? 'bg-amber-500' : 'bg-gray-600'}`}
                  ></span>
                </div>
              </div>
              <div
                className="text-xs text-gray-500 truncate mb-4"
                title={c.image}
              >
                {c.image}
              </div>
              <div className="mt-auto flex justify-between items-center text-xs">
                <span className="text-gray-400">{c.status}</span>
                <span className="capitalize text-gray-500">{c.state}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
