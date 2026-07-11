import {
  LayoutTemplate,
  MonitorSmartphone,
  Search,
  Settings,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DesktopView } from './components/DesktopView';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { LogsModal } from './components/LogsModal';
import { TerminalModal } from './components/TerminalModal';
import { ToastContainer } from './components/ui/Toast';
import { WebView } from './components/WebView';
import { useContainers } from './hooks/useContainers';
import { useDebounce } from './hooks/useDebounce';
import { ToastProvider } from './hooks/useToast';
import './index.css';

// Type declaration for Tauri window variable mock
declare global {
  interface Window {
    __TAURI__?: boolean;
  }
}

type ViewMode = 'desktop' | 'web';

function App() {
  const { t } = useTranslation();
  const {
    workspaces,
    loading,
    error,
    performSingleAction,
    performBatchAction,
  } = useContainers();

  // Environment-Aware Auto Detection
  const [viewMode, setViewMode] = useState<ViewMode>('web');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New State for Filtering and Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'running' | 'stopped'
  >('all');
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'compose' | 'standalone'
  >('all');
  const [sortBy, setSortBy] = useState<
    'name' | 'containers' | 'cpu' | 'memory'
  >('name');
  const [collapsedWorkspaces, setCollapsedWorkspaces] = useState<
    Record<string, boolean>
  >({});

  const [selectedLogContainer, setSelectedLogContainer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedTerminalContainer, setSelectedTerminalContainer] = useState<{
    id: string;
    name: string;
  } | null>(null);

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

  const filteredWorkspaces = useMemo(() => {
    let result = workspaces;

    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result
        .map((ws) => ({
          ...ws,
          containers: ws.containers.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.image.toLowerCase().includes(q) ||
              ws.projectName.toLowerCase().includes(q),
          ),
        }))
        .filter((ws) => ws.containers.length > 0);
    }

    if (statusFilter !== 'all') {
      result = result
        .map((ws) => ({
          ...ws,
          containers: ws.containers.filter((c) =>
            statusFilter === 'running'
              ? c.state === 'running'
              : c.state !== 'running',
          ),
        }))
        .filter((ws) => ws.containers.length > 0);
    }

    if (typeFilter !== 'all') {
      result = result.filter((ws) =>
        typeFilter === 'compose' ? ws.isCompose : !ws.isCompose,
      );
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.projectName.localeCompare(b.projectName);
        case 'containers':
          return b.containers.length - a.containers.length;
        case 'cpu': {
          const aCpu = a.containers.reduce((s, c) => s + (c.cpuUsage || 0), 0);
          const bCpu = b.containers.reduce((s, c) => s + (c.cpuUsage || 0), 0);
          return bCpu - aCpu;
        }
        case 'memory': {
          const aMem = a.containers.reduce(
            (s, c) => s + (c.memoryUsage || 0),
            0,
          );
          const bMem = b.containers.reduce(
            (s, c) => s + (c.memoryUsage || 0),
            0,
          );
          return bMem - aMem;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [workspaces, debouncedSearchQuery, statusFilter, typeFilter, sortBy]);

  const toggleCollapse = (projectName: string) => {
    setCollapsedWorkspaces((prev) => ({
      ...prev,
      [projectName]: !prev[projectName],
    }));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading containers...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full flex flex-col overflow-hidden bg-slate-950">
      {/* Search and Top Bar */}
      <div className="h-16 shrink-0 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-4 flex-1 max-w-4xl">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
            <input
              type="text"
              placeholder={t('filter.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            {(['all', 'running', 'stopped'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs rounded-md transition-colors capitalize ${
                  statusFilter === status
                    ? 'bg-slate-800 text-slate-200 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
                }`}
              >
                {t(
                  `filter.status${status.charAt(0).toUpperCase() + status.slice(1)}`,
                )}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            {(['all', 'compose', 'standalone'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1 text-xs rounded-md transition-colors capitalize ${
                  typeFilter === type
                    ? 'bg-slate-800 text-slate-200 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
                }`}
              >
                {t(
                  `filter.type${type.charAt(0).toUpperCase() + type.slice(1)}`,
                )}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-slate-600"
          >
            <option value="name">{t('filter.sortName')}</option>
            <option value="containers">{t('filter.sortContainers')}</option>
            <option value="cpu">{t('filter.sortCpu')}</option>
            <option value="memory">{t('filter.sortMemory')}</option>
          </select>
        </div>

        {/* View Switcher and Language Settings */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-center p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all shadow-sm"
              aria-label="View Settings"
            >
              <Settings size={18} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden py-1 z-50">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                      : 'text-slate-300 hover:bg-slate-700'
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
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <LayoutTemplate size={16} />
                  Swimlanes View
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'desktop' ? (
          <DesktopView
            workspaces={filteredWorkspaces}
            collapsedWorkspaces={collapsedWorkspaces}
            onToggleCollapse={toggleCollapse}
            performSingleAction={performSingleAction}
            performBatchAction={performBatchAction}
            onOpenLogs={(id, name) => setSelectedLogContainer({ id, name })}
            onOpenTerminal={(id, name) =>
              setSelectedTerminalContainer({ id, name })
            }
          />
        ) : (
          <WebView
            workspaces={filteredWorkspaces}
            collapsedWorkspaces={collapsedWorkspaces}
            onToggleCollapse={toggleCollapse}
            performSingleAction={performSingleAction}
            performBatchAction={performBatchAction}
            onOpenLogs={(id, name) => setSelectedLogContainer({ id, name })}
            onOpenTerminal={(id, name) =>
              setSelectedTerminalContainer({ id, name })
            }
          />
        )}
      </div>

      {/* Modals */}
      {selectedLogContainer && (
        <LogsModal
          containerId={selectedLogContainer.id}
          containerName={selectedLogContainer.name}
          onClose={() => setSelectedLogContainer(null)}
        />
      )}
      {selectedTerminalContainer && (
        <TerminalModal
          containerId={selectedTerminalContainer.id}
          containerName={selectedTerminalContainer.name}
          onClose={() => setSelectedTerminalContainer(null)}
        />
      )}
    </div>
  );
}

export default function AppWithProvider() {
  return (
    <ToastProvider>
      <App />
      <ToastContainer />
    </ToastProvider>
  );
}
