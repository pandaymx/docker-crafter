import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import {
  Loader2,
  Terminal as TerminalIcon,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@xterm/xterm/css/xterm.css';
import { getWsBaseUrl } from '../utils/api';
import { cn } from '../utils/cn';
import { Button } from './ui/Button';

export interface TerminalModalProps {
  containerId: string;
  containerName: string;
  onClose: () => void;
}

type ShellType = 'auto' | 'bash' | 'sh' | 'zsh';

export function TerminalModal({
  containerId,
  containerName,
  onClose,
}: TerminalModalProps) {
  const { t } = useTranslation();

  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [wsStatus, setWsStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('connecting');
  const [shellType, setShellType] = useState<ShellType>('auto');

  // Setup terminal and connection
  useEffect(() => {
    if (!terminalRef.current) return;

    // 1. Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#09090b', // zinc-950
        foreground: '#d4d4d8', // zinc-300
        cursor: '#22d3ee', // cyan-400
      },
      fontFamily: 'monospace',
      fontSize: 14,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // 2. Setup WebSocket connection
    const connectWS = () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }

      setWsStatus('connecting');
      const wsBase = getWsBaseUrl();
      const shellParam = shellType !== 'auto' ? `?shell=${shellType}` : '';
      const url = `${wsBase}/api/v1/containers/${containerId}/terminal${shellParam}`;

      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer'; // Important for binary messages
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        // Send initial resize
        ws.send(
          JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }),
        );
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          term.write(event.data);
        } else if (event.data instanceof ArrayBuffer) {
          term.write(new Uint8Array(event.data));
        }
      };

      ws.onclose = (event) => {
        setWsStatus('disconnected');
        const reason = event.reason || 'Connection closed';
        term.write(`\r\n\x1b[33m[${reason}]\x1b[0m\r\n`);
      };

      ws.onerror = () => {
        setWsStatus('error');
      };
    };

    connectWS();

    // 3. Handle terminal input
    const onDataDisposable = term.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // 4. Handle terminal resize events (when fitAddon.fit() changes term size)
    const onResizeDisposable = term.onResize(({ cols, rows }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    // 5. Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      onDataDisposable.dispose();
      onResizeDisposable.dispose();

      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [containerId, shellType]); // Re-run if containerId or shellType changes

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex flex-col w-full max-w-5xl h-[80vh] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-zinc-100 truncate flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-zinc-400" />
              {t('terminalModal.title', { name: containerName })}
            </h2>
            <div className="flex items-center gap-1.5 text-xs">
              {wsStatus === 'connected' && (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              )}
              {wsStatus === 'connecting' && (
                <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              )}
              {(wsStatus === 'disconnected' || wsStatus === 'error') && (
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              )}

              <span
                className={cn(
                  wsStatus === 'connected'
                    ? 'text-emerald-400'
                    : wsStatus === 'connecting'
                      ? 'text-blue-400'
                      : 'text-rose-400',
                )}
              >
                {wsStatus === 'connected'
                  ? 'Connected'
                  : wsStatus === 'connecting'
                    ? t('terminalModal.connecting')
                    : wsStatus === 'error'
                      ? t('terminalModal.fetchError')
                      : t('terminalModal.disconnected')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={shellType}
              onChange={(e) => setShellType(e.target.value as ShellType)}
              className="h-8 bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-300 px-2 py-1 outline-none focus:border-cyan-500"
            >
              <option value="auto">Auto (bash || sh)</option>
              <option value="bash">bash</option>
              <option value="sh">sh</option>
              <option value="zsh">zsh</option>
            </select>

            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              title={t('terminalModal.close')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Terminal Area */}
        <div className="flex-1 overflow-hidden p-4 bg-zinc-950">
          <div ref={terminalRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
