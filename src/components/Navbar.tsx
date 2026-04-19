'use client'
// src/components/Navbar.tsx — with Contest tab + Search + Hall of Fame

import { useState, useEffect, useRef } from 'react'
import Link                    from 'next/link'
import { useRouter }           from 'next/navigation'
import { supabase }            from '@/lib/supabase'
import type { User }           from '@supabase/supabase-js'

type SearchResult = {
  id: string
  title_en: string
  genre: string | null
  district_id: string
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
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
        setQuery('')
        setResults([])
      }
      if (contestRef.current && !contestRef.current.contains(e.target as Node)) {
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
      const { data } = await supabase
        .from('films')
        .select('id, title_en, genre, district_id')
        .eq('status', 'active')
        .or(`title_en.ilike.%${query}%,genre.ilike.%${query}%`)
        .limit(6)
      setResults(data ?? [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function handleResultClick(filmId: string) {
    router.push(`/telangana/hyderabad/film/${filmId}`)
    setSearchOpen(false)
    setQuery('')
    setResults([])
  }

  const initial = user?.user_metadata?.name?.[0]?.toUpperCase()
             ?? user?.email?.[0]?.toUpperCase() ?? '?'

  const mainLinks = [
    { href: '/',                    label: 'Home'            },
    { href: '/telangana/hyderabad', label: 'Hyderabad Films' },
    { href: '/upload',              label: 'Upload'          },
  ]

  const contestLinks = [
    { href: '/contest',         label: '🏆 Active Contest'  },
    { href: '/contest/films',   label: '🎬 Contest Films'   },
    { href: '/contest/winners', label: '🏛️ Hall of Fame'    },
    { href: '/contest/enter',   label: '✍️ Enter Contest'   },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16 bg-[#0D0A06]/90 backdrop-blur-md border-b border-[#2E2010]">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-base">🎬</div>
        <div className="flex flex-col leading-none">
          <span className="text-[#D4A017] font-bold text-lg tracking-wide">CinemaVuru</span>
          <span className="text-[#7A6040] text-[10px] uppercase tracking-widest">సినిమా వూరు</span>
        </div>
      </Link>

      {/* Desktop nav links */}
      <ul className="hidden md:flex items-center gap-1 list-none">
        {mainLinks.map(l => (
          <li key={l.href}>
            <Link href={l.href}
              className="text-[#7A6040] hover:text-[#D4A017] hover:bg-[#D4A017]/10 px-3 py-1.5 rounded text-sm font-semibold uppercase tracking-wide transition">
              {l.label}
            </Link>
          </li>
        ))}

        {/* Contest dropdown */}
        <li ref={contestRef} className="relative">
          <button
            onClick={() => setContestOpen(o => !o)}
            className="text-[#7A6040] hover:text-[#D4A017] hover:bg-[#D4A017]/10 px-3 py-1.5 rounded text-sm font-semibold uppercase tracking-wide transition flex items-center gap-1"
          >
            🏆 Contest
            <span className="text-[10px] opacity-60">{contestOpen ? '▲' : '▼'}</span>
          </button>
          {contestOpen && (
            <div className="absolute top-full left-0 mt-1 bg-[#0D0A06] border border-[#2E2010] rounded-xl overflow-hidden shadow-xl min-w-[180px] z-50">
              {contestLinks.map(l => (
                <Link key={l.href} href={l.href}
                  onClick={() => setContestOpen(false)}
                  className="block px-4 py-3 text-sm text-[#7A6040] hover:text-[#D4A017] hover:bg-[#D4A017]/10 transition border-b border-[#2E2010] last:border-0">
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </li>
      </ul>

      {/* Desktop right side */}
      <div className="hidden md:flex items-center gap-2">

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
                  className="w-48 bg-[#1A1208] border border-[#D4A017]/40 text-[#FDF6E3] placeholder-[#7A6040] px-3 py-1.5 rounded text-sm outline-none focus:border-[#D4A017] transition"
                />
                {(results.length > 0 || searching) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1208] border border-[#2E2010] rounded-lg overflow-hidden shadow-xl min-w-[280px]">
                    {searching ? (
                      <div className="px-4 py-3 text-[#7A6040] text-sm">Searching...</div>
                    ) : (
                      results.map(film => (
                        <button key={film.id} onClick={() => handleResultClick(film.id)}
                          className="w-full text-left px-4 py-3 hover:bg-[#2E2010] transition flex items-center justify-between gap-3 border-b border-[#2E2010] last:border-0">
                          <span className="text-[#FDF6E3] text-sm font-medium truncate">{film.title_en}</span>
                          {film.genre && <span className="text-[#7A6040] text-xs shrink-0">{film.genre}</span>}
                        </button>
                      ))
                    )}
                    {!searching && results.length === 0 && query.trim() && (
                      <div className="px-4 py-3 text-[#7A6040] text-sm">No films found</div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={() => { setSearchOpen(false); setQuery(''); setResults([]) }}
                className="text-[#7A6040] hover:text-[#FF6B1A] transition text-lg">✕</button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)}
              className="text-[#7A6040] hover:text-[#D4A017] transition p-2 rounded hover:bg-[#D4A017]/10"
              title="Search films">
              🔍
            </button>
          )}
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-black font-bold text-sm">
              {initial}
            </div>
            <span className="text-sm text-[#7A6040] max-w-[120px] truncate">
              {user.user_metadata?.name ?? user.email}
            </span>
            <button onClick={handleLogout}
              className="border border-[#2E2010] text-[#7A6040] px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide hover:text-[#FF6B1A] hover:border-[#FF6B1A]/30 transition">
              Logout
            </button>
          </div>
        ) : (
          <>
            <Link href="/auth" className="border border-[#D4A017]/40 text-[#D4A017] px-4 py-1.5 rounded text-sm font-bold uppercase tracking-wide hover:bg-[#D4A017]/10 transition">Login</Link>
            <Link href="/auth" className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-4 py-1.5 rounded text-sm font-bold uppercase tracking-wide hover:opacity-90 transition">Join Free</Link>
          </>
        )}
      </div>

      {/* Mobile hamburger */}
      <button className="md:hidden text-[#D4A017] text-2xl" onClick={() => setOpen(o => !o)}>
        {open ? '✕' : '☰'}
      </button>

      {/* Mobile menu */}
      {open && (
        <div className="absolute top-16 left-0 right-0 bg-[#0D0A06] border-b border-[#2E2010] flex flex-col p-4 gap-3 md:hidden">
          {/* Mobile search */}
          <div className="relative">
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="🔍  Search films..."
              className="w-full bg-[#1A1208] border border-[#D4A017]/40 text-[#FDF6E3] placeholder-[#7A6040] px-3 py-2 rounded text-sm outline-none focus:border-[#D4A017] transition"
            />
            {(results.length > 0 || searching) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1208] border border-[#2E2010] rounded-lg overflow-hidden shadow-xl z-50">
                {searching ? (
                  <div className="px-4 py-3 text-[#7A6040] text-sm">Searching...</div>
                ) : results.map(film => (
                  <button key={film.id} onClick={() => { handleResultClick(film.id); setOpen(false) }}
                    className="w-full text-left px-4 py-3 hover:bg-[#2E2010] transition flex items-center justify-between gap-3 border-b border-[#2E2010] last:border-0">
                    <span className="text-[#FDF6E3] text-sm font-medium truncate">{film.title_en}</span>
                    {film.genre && <span className="text-[#7A6040] text-xs shrink-0">{film.genre}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {mainLinks.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="text-[#7A6040] hover:text-[#D4A017] text-sm uppercase tracking-wide font-semibold transition">
              {l.label}
            </Link>
          ))}

          {/* Mobile contest links */}
          <div className="border-t border-[#2E2010] pt-3">
            <p className="text-xs text-[#4A3020] uppercase tracking-widest mb-2">Contest</p>
            {contestLinks.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="block text-[#7A6040] hover:text-[#D4A017] text-sm tracking-wide font-semibold transition py-1.5">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex gap-2 mt-2 border-t border-[#2E2010] pt-3">
            {user ? (
              <button onClick={handleLogout}
                className="flex-1 border border-[#2E2010] text-[#7A6040] py-2 rounded text-sm font-bold uppercase">
                Logout
              </button>
            ) : (
              <>
                <Link href="/auth" className="flex-1 border border-[#D4A017]/40 text-[#D4A017] py-2 rounded text-sm font-bold uppercase text-center">Login</Link>
                <Link href="/auth" className="flex-1 bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black py-2 rounded text-sm font-bold uppercase text-center">Join Free</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
