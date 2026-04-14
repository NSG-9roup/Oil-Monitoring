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
    }
    // Production: bisa connect ke Sentry/LogRocket di sini nanti (gratis tier tersedia)
  },

  warn: (message: string, data?: LogData) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, data ?? '')
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
