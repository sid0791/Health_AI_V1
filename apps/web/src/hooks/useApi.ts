/**
 * Custom hooks for API integration and state management
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { APIError } from '../services/api'

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  isSuccess: boolean
}

/**
 * Hook for managing API call state
 */
export function useApiState<T>(initialData: T | null = null): [
  ApiState<T>,
  {
    setLoading: (loading: boolean) => void
    setData: (data: T | null) => void
    setError: (error: string | null) => void
    reset: () => void
  }
] {
  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    loading: false,
    error: null,
    isSuccess: false,
  })

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ 
      ...prev, 
      loading, 
      error: loading ? null : prev.error 
    }))
  }, [])

  const setData = useCallback((data: T | null) => {
    setState({
      data,
      loading: false,
      error: null,
      isSuccess: data !== null,
    })
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      loading: false,
      error,
      isSuccess: false,
    }))
  }, [])

  const reset = useCallback(() => {
    setState({
      data: initialData,
      loading: false,
      error: null,
      isSuccess: false,
    })
  }, [initialData])

  return [state, { setLoading, setData, setError, reset }]
}

/**
 * Hook for making API calls with automatic state management
 */
export function useApiCall<T, P extends unknown[] = []>(
  apiFunction: (...args: P) => Promise<T>
): [
  ApiState<T>,
  {
    execute: (...args: P) => Promise<T | null>
    reset: () => void
  }
] {
  const [state, { setLoading, setData, setError, reset }] = useApiState<T>()

  const execute = useCallback(async (...args: P): Promise<T | null> => {
    try {
      setLoading(true)
      const result = await apiFunction(...args)
      setData(result)
      return result
    } catch (error) {
      const errorMessage = error instanceof APIError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred'
      
      setError(errorMessage)
      console.error('API call failed:', error)
      return null
    }
  }, [apiFunction, setLoading, setData, setError])

  return [state, { execute, reset }]
}

/**
 * Hook for debounced API calls (useful for search)
 */
export function useDebouncedApiCall<T, P extends unknown[] = []>(
  apiFunction: (...args: P) => Promise<T>,
  delay: number = 300
): [
  ApiState<T>,
  {
    execute: (...args: P) => Promise<T | null>
    cancel: () => void
    reset: () => void
  }
] {
  const [state, { setLoading, setData, setError, reset }] = useApiState<T>()
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const cancel = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      setTimeoutId(null)
      setLoading(false)
    }
  }, [timeoutId, setLoading])

  const execute = useCallback(async (...args: P): Promise<T | null> => {
    // Cancel previous timeout
    cancel()

    return new Promise((resolve) => {
      const newTimeoutId = setTimeout(async () => {
        try {
          setLoading(true)
          const result = await apiFunction(...args)
          setData(result)
          resolve(result)
        } catch (error) {
          const errorMessage = error instanceof APIError 
            ? error.message 
            : error instanceof Error 
            ? error.message 
            : 'An unexpected error occurred'
          
          setError(errorMessage)
          console.error('Debounced API call failed:', error)
          resolve(null)
        }
      }, delay)

      setTimeoutId(newTimeoutId)
    })
  }, [apiFunction, delay, cancel, setLoading, setData, setError])

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [timeoutId])

  return [state, { execute, cancel, reset }]
}

/**
 * Hook for automatic data fetching on component mount
 */
export function useAutoFetch<T, P extends unknown[] = []>(
  apiFunction: (...args: P) => Promise<T>,
  args: P,
  options: {
    enabled?: boolean
    refetchOnMount?: boolean
    retryCount?: number
    retryDelay?: number
  } = {}
): [ApiState<T>, { refetch: () => Promise<T | null>; reset: () => void }] {
  const { 
    enabled = true, 
    refetchOnMount = false, 
    retryCount = 0, 
    retryDelay = 1000 
  } = options

  const [state, { setLoading, setData, setError, reset }] = useApiState<T>()
  const [hasInitiallyFetched, setHasInitiallyFetched] = useState(false)

  // Stabilize args to prevent infinite loops
  const stableArgs = useMemo(() => args, [JSON.stringify(args)])

  const fetchData = useCallback(async (retryAttempt = 0): Promise<T | null> => {
    try {
      setLoading(true)
      const result = await apiFunction(...stableArgs)
      setData(result)
      setHasInitiallyFetched(true)
      return result
    } catch (error) {
      const errorMessage = error instanceof APIError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred'

      if (retryAttempt < retryCount) {
        // Retry after delay
        setTimeout(() => {
          fetchData(retryAttempt + 1)
        }, retryDelay)
        return null
      }
      
      setError(errorMessage)
      console.error('Auto-fetch failed:', error)
      setHasInitiallyFetched(true)
      return null
    }
  }, [apiFunction, stableArgs, retryCount, retryDelay, setLoading, setData, setError])

  const refetch = useCallback(() => {
    return fetchData()
  }, [fetchData])

  useEffect(() => {
    if (enabled && (!hasInitiallyFetched || refetchOnMount)) {
      fetchData()
    }
  }, [enabled, hasInitiallyFetched, refetchOnMount, fetchData])

  return [state, { refetch, reset }]
}

/**
 * Hook for managing form submission with API calls
 */
export function useFormSubmission<T, FormData>(
  submitFunction: (data: FormData) => Promise<T>
): [
  ApiState<T> & { isSubmitting: boolean },
  {
    submit: (data: FormData) => Promise<T | null>
    reset: () => void
  }
] {
  const [state, { setLoading, setData, setError, reset }] = useApiState<T>()

  const submit = useCallback(async (data: FormData): Promise<T | null> => {
    try {
      setLoading(true)
      const result = await submitFunction(data)
      setData(result)
      return result
    } catch (error) {
      const errorMessage = error instanceof APIError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : 'Submission failed'
      
      setError(errorMessage)
      console.error('Form submission failed:', error)
      return null
    }
  }, [submitFunction, setLoading, setData, setError])

  return [
    { ...state, isSubmitting: state.loading },
    { submit, reset }
  ]
}