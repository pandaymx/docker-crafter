import { LayoutTemplate, MonitorSmartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DesktopView } from './components/DesktopView';
import { WebView } from './components/WebView';
import { useContainers } from './hooks/useContainers';
import './index.css';

// Type declaration for Tauri window variable mock
declare global {
  interface Window {
    __TAURI__?: boolean;
  }
}

type ViewMode = 'desktop' | 'web';

function App() {
  const { workspaces, loading, error } = useContainers();

  // Environment-Aware Auto Detection
  const [viewMode, setViewMode] = useState<ViewMode>('web');

  useEffect(() => {
    // If running in Tauri or screen is wide enough, default to desktop (unless on mobile)
    const isTauri =
      typeof window !== 'undefined' && window.__TAURI__ !== undefined;
    const isMobile = window.innerWidth < 768; // basic Tailwind md breakpoint

    if (isTauri && !isMobile) {
      setViewMode('desktop');
    } else {
      setViewMode('web'); // fallback for web or mobile
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-400">
        Loading containers...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-950">
      {/* Absolute Header for View Switcher - useful for dev/demo */}
      <div className="absolute top-4 right-6 z-50 flex items-center bg-gray-800/80 backdrop-blur rounded-full p-1 border border-gray-700 shadow-lg">
        <button
          onClick={() => setViewMode('desktop')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            viewMode === 'desktop'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <MonitorSmartphone size={16} />
          <span className="hidden sm:inline">Desktop</span>
        </button>
        <button
          onClick={() => setViewMode('web')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            viewMode === 'web'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <LayoutTemplate size={16} />
          <span className="hidden sm:inline">Swimlanes</span>
        </button>
      </div>

      {/* Main View Area */}
      {viewMode === 'desktop' ? (
        <DesktopView workspaces={workspaces} />
      ) : (
        <WebView workspaces={workspaces} />
      )}
    </div>
  );
}

export default App;
