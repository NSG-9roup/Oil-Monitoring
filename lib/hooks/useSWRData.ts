import useSWR, { SWRConfiguration } from 'swr'

interface FetcherOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}

// Generic fetcher for SWR
const fetcher = async (url: string, options?: FetcherOptions): Promise<unknown> => {
  const res = await fetch(url, {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const error = new Error(`API error: ${res.status}`)
    throw error
  }

  return res.json()
}

// Default SWR options with smart caching
const defaultOptions: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000, // 1 minute
  focusThrottleInterval: 300000, // 5 minutes
  errorRetryCount: 3,
  errorRetryInterval: 5000,
}

/**
 * Hook for fetching lab tests for a specific machine
 * @param machineId - The machine ID to fetch tests for
 * @returns Lab tests data with loading and error states
 */
export function useLabTests(machineId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    machineId ? `/api/customer/lab-tests?machine_id=${machineId}` : null,
    fetcher,
    {
      ...defaultOptions,
      revalidateOnFocus: false,
    }
  )

  return {
    tests: data?.data || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

/**
 * Hook for fetching all machines for current customer
 * @returns Machines data with loading and error states
 */
export function useMachines() {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/customer/machines`,
    fetcher,
    defaultOptions
  )

  return {
    machines: data?.data || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

/**
 * Hook for fetching maintenance actions
 * @param machineId - Optional machine ID to filter by
 * @returns Maintenance actions with loading and error states
 */
export function useMaintenanceActions(machineId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    machineId
      ? `/api/customer/maintenance-actions?machine_id=${machineId}`
      : `/api/customer/maintenance-actions`,
    fetcher,
    defaultOptions
  )

  return {
    actions: data?.data || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

/**
 * Hook for fetching maintenance action logs
 * @param actionId - Optional action ID to filter by
 * @returns Logs data with loading and error states
 */
export function useMaintenanceActionLogs(actionId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    actionId
      ? `/api/customer/maintenance-actions/${actionId}/logs`
      : `/api/customer/maintenance-action-logs`,
    fetcher,
    {
      ...defaultOptions,
      revalidateInterval: 30000, // Refresh every 30 seconds for logs
    }
  )

  return {
    logs: data?.data || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

/**
 * Hook for manual data fetching with custom options
 * @param url - API endpoint URL
 * @param options - SWR configuration options
 * @returns Data with loading and error states
 */
export function useFetch<T>(url: string | null, options?: Partial<SWRConfiguration>) {
  const { data, error, isLoading, mutate } = useSWR(
    url,
    fetcher,
    {
      ...defaultOptions,
      ...options,
    }
  )

  return {
    data: data as T | undefined,
    isLoading,
    error,
    refresh: mutate,
  }
}
