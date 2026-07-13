/**
 * Detects if the frontend is running inside a Wails desktop environment.
 */
export function isWailsEnvironment(): boolean {
  return typeof (window as any).runtime !== 'undefined';
}

/**
 * Gets the base URL for API requests.
 *
 * - In Wails desktop environment, it returns `http://localhost:<PORT>` where `<PORT>` is the Gin port (default 8080).
 * - In Android hybrid or Web environment, it checks localStorage for `SERVER_IP`, falls back to `VITE_API_SERVER_URL`, or relative path.
 */
export function getApiBaseUrl(): string {
  // If in Wails, always point to the local Gin server running alongside Wails.
  if (isWailsEnvironment()) {
    // Port 8080 is the default configuration for Gin in this app.
    // If you change the Gin port, this needs to match.
    return 'http://localhost:8080';
  }

  // Check localStorage for user-configured IP (useful for Android / remote web)
  const storedIp = localStorage.getItem('SERVER_IP');
  if (storedIp) {
    return storedIp;
  }

  // Fallback to environment variable defined at build time
  const envUrl = import.meta.env.VITE_API_SERVER_URL;
  if (envUrl) {
    return envUrl;
  }

  // Fallback to relative path for standard web deployment
  return '';
}

/**
 * Gets the base URL for WebSocket connections.
 * It converts the `http://` or `https://` prefix from `getApiBaseUrl()` to `ws://` or `wss://`.
 */
export function getWsBaseUrl(): string {
  const apiBase = getApiBaseUrl();

  // If there's no base URL configured (relative path), construct WS URL from current location
  if (!apiBase) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  return apiBase
    .replace(/^http:\/\//, 'ws://')
    .replace(/^https:\/\//, 'wss://');
}
