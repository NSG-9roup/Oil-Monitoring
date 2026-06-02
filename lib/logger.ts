/**
 * Logger utility — safe wrapper untuk console di semua environment
 * Di production, error tidak bocor ke browser console user
 */

const isDev = process.env.NODE_ENV === 'development'

type LogData = unknown

export const logger = {
  error: (message: string, data?: LogData) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`, data ?? '')
    } else if (typeof window === 'undefined') {
      // Server-side production logging for Cloud Observability (Temuan #7)
      // eslint-disable-next-line no-console
      console.error(`[PRODUCTION_ERROR] ${message}`, data ?? '')
    }
  },

  warn: (message: string, data?: LogData) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, data ?? '')
    } else if (typeof window === 'undefined') {
      // Server-side production logging for Cloud Observability (Temuan #7)
      // eslint-disable-next-line no-console
      console.warn(`[PRODUCTION_WARN] ${message}`, data ?? '')
    }
  },

  info: (message: string, data?: LogData) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}`, data ?? '')
    }
  },

  debug: (message: string, data?: LogData) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}`, data ?? '')
    }
  },
}
