'use client'
// Single source of truth for auth. Reads the session ONCE (from local storage,
// instant) and subscribes ONCE to auth changes, then shares { user, loading }
// with the whole app via useAuth(). Components no longer read the session
// themselves — no duplicate reads, no per-page network calls.

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type AuthState = { user: User | null; loading: boolean }

const AuthContext = createContext<AuthState>({ user: null, loading: true })

/**
 * True when two sessions describe the same user in the same state.
 *
 * `updated_at` is compared as well as the id so a genuine USER_UPDATED event
 * still propagates, while a token refresh — which changes neither — does not.
 */
function sameUser(a: User | null, b: User | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.id === b.id && a.updated_at === b.updated_at
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(() => {
    let mounted = true

    // Supabase re-emits auth events on token refresh (roughly hourly) and when
    // a tab regains focus. Each one previously produced a fresh state object,
    // so `user` changed identity and every effect keyed on it refetched —
    // around 15 Supabase queries app-wide per event, including the 6-query
    // chain behind the contest payment screen. Returning the PREVIOUS state
    // object when nothing meaningful changed keeps `user` referentially stable
    // and lets React skip the re-render entirely.
    const apply = (user: User | null) => {
      if (!mounted) return
      setState((prev) => (!prev.loading && sameUser(prev.user, user) ? prev : { user, loading: false }))
    }

    supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user ?? null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
