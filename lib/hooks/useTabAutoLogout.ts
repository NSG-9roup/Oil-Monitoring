'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Auto-logout when the browser tab is truly closed (not on refresh).
 *
 * How it works:
 * - On mount, we write a flag to sessionStorage: 'oiltrack_session_active'.
 * - sessionStorage persists across page refreshes (within the same tab),
 *   but is wiped when the tab is truly closed.
 * - On 'beforeunload', we set a short-lived pagehide_ts in sessionStorage.
 *   After a short delay (via a BroadcastChannel message), the next load
 *   can distinguish refresh from close.
 *
 * Simpler technique used here:
 * - On every page load, if 'oiltrack_tab_open' is NOT in sessionStorage
 *   it means this is a fresh tab open (not a refresh) — so we DON'T sign out.
 * - We write 'oiltrack_tab_open' immediately on mount.
 * - On 'pagehide' (fires before tab closes AND before refresh), we check
 *   event.persisted: if false it's a real close; if true it's going to bfcache.
 *   Combined with a tiny localStorage timeout trick we can detect tab close.
 */
export function useTabAutoLogout() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SESSION_KEY = 'oiltrack_tab_open'
    const CLOSE_TIMESTAMP_KEY = 'oiltrack_tab_close_ts'

    // Mark tab as open
    sessionStorage.setItem(SESSION_KEY, 'true')

    const handleBeforeUnload = () => {
      // Write a close timestamp to localStorage
      // If the page reloads, this will be cleared by the next mount immediately.
      // If the tab closes, this timestamp lingers and will be picked up on next open.
      localStorage.setItem(CLOSE_TIMESTAMP_KEY, Date.now().toString())
    }

    const handlePageHide = (event: PageTransitionEvent) => {
      // event.persisted = true means going to bfcache (back/forward navigation)
      // event.persisted = false means truly navigating away or closing
      if (!event.persisted) {
        // Remove sessionStorage flag on true close/navigate
        sessionStorage.removeItem(SESSION_KEY)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [])
}

/**
 * Sign out if the previous session ended due to tab close (not refresh).
 * Call this ONCE at the top of your auth layout or page.
 *
 * Logic:
 * - If sessionStorage has 'oiltrack_tab_open' → user is refreshing, keep session.
 * - If sessionStorage is EMPTY and localStorage has a recent close_ts → sign out.
 */
export async function signOutIfTabWasClosed() {
  if (typeof window === 'undefined') return

  const SESSION_KEY = 'oiltrack_tab_open'
  const CLOSE_TIMESTAMP_KEY = 'oiltrack_tab_close_ts'

  const tabWasOpen = sessionStorage.getItem(SESSION_KEY)
  const closeTs = localStorage.getItem(CLOSE_TIMESTAMP_KEY)

  if (!tabWasOpen && closeTs) {
    // Tab was previously closed (not refreshed). Sign out.
    localStorage.removeItem(CLOSE_TIMESTAMP_KEY)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
    return
  }

  // Clear stale close timestamp on refresh
  if (tabWasOpen && closeTs) {
    localStorage.removeItem(CLOSE_TIMESTAMP_KEY)
  }
}
