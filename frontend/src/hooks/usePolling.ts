import { useEffect, useRef } from 'react'

interface UsePollingOptions {
  /**
   * Polling interval in milliseconds
   */
  interval: number
  /**
   * Whether polling is enabled
   */
  enabled?: boolean
  /**
   * Callback when polling should stop (return true to stop)
   */
  shouldStop?: () => boolean
}

/**
 * Smart polling hook that automatically stops when condition is met
 * @param callback - Function to call on each poll
 * @param options - Polling configuration
 */
export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions
) {
  const { interval, enabled = true, shouldStop } = options
  const savedCallback = useRef(callback)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // Update callback ref
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Initial call
    void savedCallback.current()

    // Check if should stop immediately
    if (shouldStop && shouldStop()) {
      return
    }

    // Set up interval
    intervalRef.current = setInterval(() => {
      // Check if should stop before each call
      if (shouldStop && shouldStop()) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        return
      }

      void savedCallback.current()
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [interval, enabled, shouldStop])
}
