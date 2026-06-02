/**
 * Server-side environment variable validation
 * 
 * This module ensures all required environment variables are present
 * and properly configured at server startup.
 * 
 * Usage: Import this module in your server entry point (e.g., middleware.ts)
 * to validate environment variables before the app starts.
 */

const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
}

const missingEnvVars = Object.entries(requiredEnvVars)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .filter(([key, value]) => !value)
  .map(([key]) => key)

/**
 * Validates that all required environment variables are set
 * Throws an error immediately if any are missing
 * 
 * @throws {Error} If any required environment variable is missing
 */
export function validateServerEnv() {
  if (missingEnvVars.length > 0) {
    const missing = missingEnvVars.join(', ')
    throw new Error(
      `Missing required environment variables: ${missing}\n` +
      `Please check your .env.local file and ensure all variables are set.\n` +
      `See .env.local.example for the required format.`
    )
  }
}

/**
 * Get a validated server environment variable
 * Safe to use in server-side code after validateServerEnv() is called
 * 
 * @param key - The environment variable key
 * @returns The environment variable value (guaranteed to exist)
 * @throws {Error} If the variable is not set
 */
export function getServerEnv(key: keyof typeof requiredEnvVars): string {
  const value = requiredEnvVars[key]
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`)
  }
  return value
}

// Validate on module import (ensure this runs at startup)
// Validate environment variables on server startup
if (typeof window === 'undefined') {
  try {
    validateServerEnv()
  } catch (error) {
    // Log and re-throw to prevent silent failures
    console.error('[ENV_VALIDATION_ERROR]', error instanceof Error ? error.message : error)
    throw error
  }
}
