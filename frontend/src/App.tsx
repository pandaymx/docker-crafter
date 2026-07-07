import { useState, useEffect, useRef } from 'react';
import { useContainers } from './hooks/useContainers';
import { DesktopView } from './components/DesktopView';
import { WebView } from './components/WebView';
import { LayoutTemplate, MonitorSmartphone, Settings } from 'lucide-react';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      {/* Absolute Header for View Switcher */}
      <div className="absolute top-4 right-6 z-50" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center justify-center p-2 rounded-full bg-gray-800/80 backdrop-blur border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700/80 transition-all shadow-lg"
          aria-label="View Settings"
        >
          <Settings size={20} />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden py-1 z-50">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              View Mode
            </div>
            <button
              onClick={() => {
                setViewMode('desktop');
                setIsDropdownOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                viewMode === 'desktop'
                  ? 'bg-blue-600/10 text-blue-400'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <MonitorSmartphone size={16} />
              Desktop View
            </button>
            <button
              onClick={() => {
                setViewMode('web');
                setIsDropdownOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                viewMode === 'web'
                  ? 'bg-purple-600/10 text-purple-400'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <LayoutTemplate size={16} />
              Swimlanes View
            </button>
          </div>
        )}
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
