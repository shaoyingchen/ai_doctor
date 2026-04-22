const envBase = import.meta.env.VITE_API_BASE_URL?.trim()

const runtimeBase =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000'

export const API_BASE_URL = envBase && envBase.length > 0 ? envBase : runtimeBase

export const API_BASE_WITH_PATH = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}
