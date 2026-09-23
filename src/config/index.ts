// Environment configuration for AI Doctor

interface AppConfig {
  // API
  apiBaseUrl: string

  // WebSocket
  wsUrl: string
  wsReconnectInterval: number
  wsMaxReconnectAttempts: number

  // Polling
  pollingInterval: number
  pollingEnabled: boolean

  // Performance
  enableVirtualScroll: boolean
  virtualScrollItemHeight: number
  virtualScrollOverscan: number

  // Features
  enableWebSocket: boolean
  enableBatchQuery: boolean

  // Debug
  debugMode: boolean
}

const getEnvString = (key: string, defaultValue: string): string => {
  return import.meta.env[key]?.trim() || defaultValue
}

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = import.meta.env[key]
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = import.meta.env[key]
  if (value === undefined || value === null) return defaultValue
  return value === 'true' || value === '1'
}

// Runtime base URL fallback
const runtimeBase =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000'

const runtimeWsBase =
  typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000`
    : 'ws://localhost:8000'

export const config: AppConfig = {
  // API
  apiBaseUrl: getEnvString('VITE_API_BASE_URL', runtimeBase),

  // WebSocket
  wsUrl: getEnvString('VITE_WS_URL', runtimeWsBase),
  wsReconnectInterval: getEnvNumber('VITE_WS_RECONNECT_INTERVAL', 3000),
  wsMaxReconnectAttempts: getEnvNumber('VITE_WS_MAX_RECONNECT_ATTEMPTS', 5),

  // Polling
  pollingInterval: getEnvNumber('VITE_POLLING_INTERVAL', 5000),
  pollingEnabled: getEnvBoolean('VITE_POLLING_ENABLED', true),

  // Performance
  enableVirtualScroll: getEnvBoolean('VITE_ENABLE_VIRTUAL_SCROLL', true),
  virtualScrollItemHeight: getEnvNumber('VITE_VIRTUAL_SCROLL_ITEM_HEIGHT', 80),
  virtualScrollOverscan: getEnvNumber('VITE_VIRTUAL_SCROLL_OVERSCAN', 5),

  // Features
  enableWebSocket: getEnvBoolean('VITE_ENABLE_WEBSOCKET', true),
  enableBatchQuery: getEnvBoolean('VITE_ENABLE_BATCH_QUERY', true),

  // Debug
  debugMode: getEnvBoolean('VITE_DEBUG_MODE', false),
}

// Helper function for API paths
export const getApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${config.apiBaseUrl}${normalizedPath}`
}

// Helper function for WebSocket URL
export const getWsUrl = (path: string = ''): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${config.wsUrl}${normalizedPath}`
}

// Log config in debug mode
if (config.debugMode) {
  console.log('[Config] Application configuration:', config)
}

export default config
