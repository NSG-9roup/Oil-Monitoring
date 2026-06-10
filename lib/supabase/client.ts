import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export function createClient() {
  const remember = typeof window !== 'undefined' && localStorage.getItem('oiltrack_remember_me') === 'true'
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: remember ? 60 * 60 * 24 * 365 : undefined,
      }
    }
  )
}

/**
 * Uploads a file to Supabase storage bucket with exponential backoff retries.
 */
export async function uploadWithRetry(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File | Blob,
  options: Record<string, unknown> = {},
  retries = 3,
  delayMs = 1000
): Promise<{ data: { path: string } | null; error: Error | null }> {
  let attempt = 0
  while (attempt < retries) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, options)

      if (!error) {
        return { data: data as { path: string }, error: null }
      }

      console.warn(`[Storage Upload] Attempt ${attempt + 1} failed: ${error.message}`)
      attempt++
      if (attempt >= retries) {
        return { data: null, error: error as unknown as Error }
      }
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)))
    } catch (err) {
      console.warn(`[Storage Upload] Attempt ${attempt + 1} threw exception:`, err)
      attempt++
      if (attempt >= retries) {
        return { data: null, error: err as Error }
      }
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)))
    }
  }
  return { data: null, error: new Error('Upload failed after max retries') }
}
