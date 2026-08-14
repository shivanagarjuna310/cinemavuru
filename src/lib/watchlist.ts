// Cross-component sync for the Supabase-backed "My List" watchlist.
// The save button dispatches this event after a change so the homepage rail
// (and any other mounted listener) reloads from the database.

export const WATCHLIST_EVENT = 'cv-watchlist'

export function notifyWatchlistChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(WATCHLIST_EVENT))
  }
}
