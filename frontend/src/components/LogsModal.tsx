import { ArrowDownToLine, Loader2, Wifi, WifiOff, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getWsBaseUrl } from '../utils/api';
import { cn } from '../utils/cn';
import { Button } from './ui/Button';

export interface LogsModalProps {
  containerId: string;
  containerName: string;
  onClose: () => void;
}

interface LogLine {
  id: number;
  type: 'stdout' | 'stderr';
  text: string;
}

const MAX_LINES = 1000;

export function LogsModal({
  containerId,
  containerName,
  onClose,
}: LogsModalProps) {
  const { t } = useTranslation();

  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isTruncated, setIsTruncated] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [wsStatus, setWsStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('connecting');

  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const lineIdCounter = useRef(0);
  const stdoutBuffer = useRef('');
  const stderrBuffer = useRef('');
  const retryCount = useRef(0);
  const reconnectTimeoutRef = useRef<Timer | null>(null);
  const maxRetries = 5;

  const scrollToBottom = useCallback(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScroll]);

  // Use effect to scroll when logs change
  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  const processLogData = useCallback(
    (type: 'stdout' | 'stderr', data: string) => {
      const buffer = type === 'stdout' ? stdoutBuffer : stderrBuffer;
      buffer.current += data;

      if (buffer.current.includes('\n')) {
        const parts = buffer.current.split('\n');
        // The last part is either an incomplete chunk or an empty string (if ends with \n)
        buffer.current = parts.pop() || '';

        setLogs((prev) => {
          const newLines = parts.map((text) => ({
            id: lineIdCounter.current++,
            type,
            text,
          }));

          const combined = [...prev, ...newLines];
          if (combined.length > MAX_LINES) {
            setIsTruncated(true);
            return combined.slice(combined.length - MAX_LINES);
          }
          return combined;
        });
      }
    },
    [],
  );

  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    setWsStatus('connecting');

    const wsBase = getWsBaseUrl();
    const url = `${wsBase}/api/v1/containers/${containerId}/logs/stream?tail=100`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      retryCount.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'stdout' || msg.type === 'stderr') {
          processLogData(msg.type, msg.data || '');
        } else {
          // Fallback if structured differently but JSON
          processLogData('stdout', event.data);
        }
      } catch {
        // Fallback for non-JSON text
        processLogData('stdout', event.data);
      }
    };

    ws.onclose = () => {
      if (retryCount.current < maxRetries) {
        setWsStatus('connecting');
        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 10000);
        retryCount.current++;
        reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
      } else {
        setWsStatus('disconnected');
      }
    };

    ws.onerror = () => {
      setWsStatus('error');
    };
  }, [containerId, processLogData]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        // Prevent reconnect loops on unmount
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex flex-col w-full max-w-4xl max-h-[80vh] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-zinc-100 truncate">
              {t('logsModal.title', { name: containerName })}
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
                    ? t('logsModal.refreshing')
                    : wsStatus === 'error'
                      ? t('logsModal.fetchError')
                      : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={autoScroll ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className="h-8 gap-1.5"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {t('logsModal.autoScroll')}
              </span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              title={t('logsModal.close')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Logs Area */}
        <div
          ref={logsContainerRef}
          className="flex-1 overflow-y-auto min-h-[40vh] max-h-[60vh] p-4 font-mono text-xs leading-relaxed"
        >
          {isTruncated && (
            <div className="mb-2 p-2 bg-zinc-900/50 text-amber-400/80 border border-amber-400/20 rounded-md text-center">
              {t('logsModal.truncatedWarning', { limit: MAX_LINES })}
            </div>
          )}

          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500 italic">
              {t('logsModal.empty')}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 whitespace-pre-wrap break-all">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    log.type === 'stderr' ? 'text-rose-400' : 'text-zinc-300',
                  )}
                >
                  {log.text}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
