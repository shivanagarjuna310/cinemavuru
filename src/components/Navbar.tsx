'use client'
// src/components/Navbar.tsx — with Contest tab + Search + Hall of Fame

import { useState, useEffect, useRef } from 'react'
import Link                    from 'next/link'
import { useRouter }           from 'next/navigation'
import { supabase }            from '@/lib/supabase'
import type { User }           from '@supabase/supabase-js'
import ThemeToggle             from './ThemeToggle'

type DistrictRel = { slug: string; states: { slug: string } | { slug: string }[] | null }
type SearchResult = {
  id: string
  title_en: string
  genre: string | null
  districts: DistrictRel | DistrictRel[] | null
}

// Build the correct film URL from its district/state (falls back gracefully)
function filmHref(film: SearchResult) {
  const d = Array.isArray(film.districts) ? film.districts[0] : film.districts
  const s = d && (Array.isArray(d.states) ? d.states[0] : d.states)
  const districtSlug = d?.slug ?? 'hyderabad'
  const stateSlug = s?.slug ?? 'telangana'
  return `/${stateSlug}/${districtSlug}/film/${film.id}`
}

export default function Navbar() {
  const router = useRouter()
  const [open, setOpen]               = useState(false)
  const [user, setUser]               = useState<User | null>(null)
  const [searchOpen, setSearchOpen]   = useState(false)
  const [query, setQuery]             = useState('')
  const [results, setResults]         = useState<SearchResult[]>([])
  const [searching, setSearching]     = useState(false)
  const [contestOpen, setContestOpen] = useState(false)
  const searchRef                     = useRef<HTMLDivElement>(null)
  const contestRef = useRef<HTMLLIElement>(null)
  const inputRef                      = useRef<HTMLInputElement>(null)
  const mobileRef                     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Close search when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      // Don't clear the search when the tap is inside the desktop search OR the
      // mobile menu — otherwise the result <Link> unmounts before the tap lands.
      const inSearch = searchRef.current?.contains(target)
      const inMobile = mobileRef.current?.contains(target)
      if (!inSearch && !inMobile) {
        setSearchOpen(false)
        setQuery('')
        setResults([])
      }
      if (contestRef.current && !contestRef.current.contains(target)) {
        setContestOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  // Search Supabase as user types (debounced 300ms)
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      // Strip characters that would break the PostgREST or() filter syntax
      const term = query.trim().replace(/[,()%*]/g, ' ')
      const { data } = await supabase
        .from('films')
        .select('id, title_en, genre, districts(slug, states(slug))')
        .eq('status', 'active')
        .or(`title_en.ilike.%${term}%,genre.ilike.%${term}%`)
        .limit(6)
      setResults((data as unknown as SearchResult[]) ?? [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function closeSearch() {
    setSearchOpen(false)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  const initial = user?.user_metadata?.name?.[0]?.toUpperCase()
             ?? user?.email?.[0]?.toUpperCase() ?? '?'

  const mainLinks = [
  { href: '/',       label: 'Home'   },
  { href: '/upload', label: 'Upload' },
  { href: '/about',  label: 'About'  },
]

  const contestLinks = [
    { href: '/contest',         label: '🏆 Active Contest'  },
    { href: '/contest/films',   label: '🎬 Contest Films'   },
    { href: '/contest/winners', label: '🏛️ Hall of Fame'    },
    { href: '/contest/enter',   label: '✍️ Enter Contest'   },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16 bg-[color:var(--bg)]/90 backdrop-blur-md border-b border-[color:var(--border)]">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-base">🎬</div>
        <div className="flex flex-col leading-none">
          <span className="text-[color:var(--accent)] font-bold text-lg tracking-wide">CinemaVuru</span>
          <span className="text-[color:var(--muted)] text-[10px] uppercase tracking-widest">సినిమా ఊరు</span>
        </div>
      </Link>

      {/* Desktop nav links */}
      <ul className="hidden md:flex items-center gap-1 list-none">
        {mainLinks.map(l => (
          <li key={l.href}>
            <Link href={l.href}
              className="text-[color:var(--muted)] hover:text-[color:var(--accent)] hover:bg-[#D4A017]/10 px-3 py-1.5 rounded text-sm font-semibold uppercase tracking-wide transition">
              {l.label}
            </Link>
          </li>
        ))}

        {/* Contest dropdown */}
        <li ref={contestRef} className="relative">
          <button
            onClick={() => setContestOpen(o => !o)}
            className="text-[color:var(--muted)] hover:text-[color:var(--accent)] hover:bg-[#D4A017]/10 px-3 py-1.5 rounded text-sm font-semibold uppercase tracking-wide transition flex items-center gap-1"
          >
            🏆 Contest
            <span className="text-[10px] opacity-60">{contestOpen ? '▲' : '▼'}</span>
          </button>
          {contestOpen && (
            <div className="absolute top-full left-0 mt-1 bg-[color:var(--bg)] border border-[color:var(--border)] rounded-xl overflow-hidden shadow-xl min-w-[180px] z-50">
              {contestLinks.map(l => (
                <Link key={l.href} href={l.href}
                  onClick={() => setContestOpen(false)}
                  className="block px-4 py-3 text-sm text-[color:var(--muted)] hover:text-[color:var(--accent)] hover:bg-[#D4A017]/10 transition border-b border-[color:var(--border)] last:border-0">
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </li>
      </ul>

      {/* Desktop right side */}
      <div className="hidden md:flex items-center gap-2">

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Search */}
        <div ref={searchRef} className="relative">
          {searchOpen ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search films..."
                  className="w-48 bg-[color:var(--surface)] border border-[color:var(--accent)]/40 text-[color:var(--text)] placeholder-[color:var(--muted)] px-3 py-1.5 rounded text-sm outline-none focus:border-[color:var(--accent)] transition"
                />
                {(results.length > 0 || searching) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg overflow-hidden shadow-xl min-w-[280px]">
                    {searching ? (
                      <div className="px-4 py-3 text-[color:var(--muted)] text-sm">Searching...</div>
                    ) : (
                      results.map(film => (
                        <Link key={film.id} href={filmHref(film)} onClick={closeSearch}
                          className="w-full text-left px-4 py-3 hover:bg-[color:var(--border)] transition flex items-center justify-between gap-3 border-b border-[color:var(--border)] last:border-0">
                          <span className="text-[color:var(--text)] text-sm font-medium truncate">{film.title_en}</span>
                          {film.genre && <span className="text-[color:var(--muted)] text-xs shrink-0">{film.genre}</span>}
                        </Link>
                      ))
                    )}
                    {!searching && results.length === 0 && query.trim() && (
                      <div className="px-4 py-3 text-[color:var(--muted)] text-sm">No films found</div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={() => { setSearchOpen(false); setQuery(''); setResults([]) }}
                className="text-[color:var(--muted)] hover:text-[color:var(--accent-hot)] transition text-lg">✕</button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)}
              className="text-[color:var(--muted)] hover:text-[color:var(--accent)] transition p-2 rounded hover:bg-[#D4A017]/10"
              title="Search films">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                <path d="M20 20L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-black font-bold text-sm group-hover:opacity-80 transition">
                {initial}
              </div>
              <span className="text-sm text-[color:var(--muted)] max-w-[120px] truncate group-hover:text-[color:var(--accent)] transition">
                {user.user_metadata?.name ?? user.email}
              </span>
            </Link>
            <button onClick={handleLogout}
              className="border border-[color:var(--border)] text-[color:var(--muted)] px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide hover:text-[color:var(--accent-hot)] hover:border-[color:var(--accent-hot)]/30 transition">
              Logout
            </button>
          </div>
        ) : (
          <>
            <Link href="/auth" className="border border-[color:var(--accent)]/40 text-[color:var(--accent)] px-4 py-1.5 rounded text-sm font-bold uppercase tracking-wide hover:bg-[#D4A017]/10 transition">Login</Link>
            <Link href="/auth" className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-4 py-1.5 rounded text-sm font-bold uppercase tracking-wide hover:opacity-90 transition">Join Free</Link>
          </>
        )}
      </div>

      {/* Mobile: theme toggle + hamburger */}
      <div className="md:hidden flex items-center gap-1">
        <ThemeToggle />
        <button className="text-[color:var(--accent)] text-2xl" onClick={() => setOpen(o => !o)}>
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div ref={mobileRef} className="absolute top-16 left-0 right-0 bg-[color:var(--bg)] border-b border-[color:var(--border)] flex flex-col p-4 gap-3 md:hidden">
          {/* Mobile search */}
          <div className="relative">
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search films..."
              className="w-full bg-[color:var(--surface)] border border-[color:var(--accent)]/40 text-[color:var(--text)] placeholder-[color:var(--muted)] px-3 py-2 rounded text-sm outline-none focus:border-[color:var(--accent)] transition"
            />
            {(results.length > 0 || searching) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg overflow-hidden shadow-xl z-50">
                {searching ? (
                  <div className="px-4 py-3 text-[color:var(--muted)] text-sm">Searching...</div>
                ) : results.map(film => (
                  <Link key={film.id}
                    href={filmHref(film)}
                    onClick={closeSearch}
                    className="block w-full px-4 py-3 hover:bg-[color:var(--border)] transition border-b border-[color:var(--border)] last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[color:var(--text)] text-sm font-medium truncate">{film.title_en}</span>
                      {film.genre && <span className="text-[color:var(--muted)] text-xs shrink-0">{film.genre}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {mainLinks.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="text-[color:var(--muted)] hover:text-[color:var(--accent)] text-sm uppercase tracking-wide font-semibold transition">
              {l.label}
            </Link>
          ))}

          {/* Mobile contest links */}
          <div className="border-t border-[color:var(--border)] pt-3">
            <p className="text-xs text-[color:var(--faint)] uppercase tracking-widest mb-2">Contest</p>
            {contestLinks.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="block text-[color:var(--muted)] hover:text-[color:var(--accent)] text-sm tracking-wide font-semibold transition py-1.5">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex gap-2 mt-2 border-t border-[color:var(--border)] pt-3">
            {user ? (
              <>
                <Link href="/profile" onClick={() => setOpen(false)}
                  className="flex-1 border border-[color:var(--accent)]/40 text-[color:var(--accent)] py-2 rounded text-sm font-bold uppercase text-center">
                  My Profile
                </Link>
                <button onClick={handleLogout}
                  className="flex-1 border border-[color:var(--border)] text-[color:var(--muted)] py-2 rounded text-sm font-bold uppercase">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/auth" className="flex-1 border border-[color:var(--accent)]/40 text-[color:var(--accent)] py-2 rounded text-sm font-bold uppercase text-center">Login</Link>
                <Link href="/auth" className="flex-1 bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black py-2 rounded text-sm font-bold uppercase text-center">Join Free</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
