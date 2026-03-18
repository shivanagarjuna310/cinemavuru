'use client'
// src/components/Navbar.tsx

import { useState } from 'react'
import Link from 'next/link'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16 bg-[#0D0A06]/90 backdrop-blur-md border-b border-[#2E2010]">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 cursor-pointer">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-base">
          🎬
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[#D4A017] font-bold text-lg tracking-wide">CinemaVuru</span>
          <span className="text-[#7A6040] text-[10px] uppercase tracking-widest">సినిమా వూరు</span>
        </div>
      </Link>

      {/* Desktop links */}
      <ul className="hidden md:flex items-center gap-1 list-none">
        {[
          { href: '/',                     label: 'Home'            },
          { href: '/telangana/hyderabad',  label: 'Hyderabad Films' },
          { href: '/upload',               label: 'Upload'          },
        ].map(l => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-[#7A6040] hover:text-[#D4A017] hover:bg-[#D4A017]/10 px-3 py-1.5 rounded text-sm font-semibold uppercase tracking-wide transition"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Auth buttons */}
      <div className="hidden md:flex items-center gap-2">
        <Link href="/auth"
          className="border border-[#D4A017]/40 text-[#D4A017] px-4 py-1.5 rounded text-sm font-bold uppercase tracking-wide hover:bg-[#D4A017]/10 transition">
          Login
        </Link>
        <Link href="/auth"
          className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-4 py-1.5 rounded text-sm font-bold uppercase tracking-wide hover:opacity-90 transition">
          Join Free
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button className="md:hidden text-[#D4A017] text-2xl" onClick={() => setOpen(o => !o)}>
        {open ? '✕' : '☰'}
      </button>

      {/* Mobile menu */}
      {open && (
        <div className="absolute top-16 left-0 right-0 bg-[#0D0A06] border-b border-[#2E2010] flex flex-col p-4 gap-3 md:hidden">
          {[
            { href: '/',                    label: 'Home'            },
            { href: '/telangana/hyderabad', label: 'Hyderabad Films' },
            { href: '/upload',              label: 'Upload'          },
          ].map(l => (
            <Link key={l.href} href={l.href}
              onClick={() => setOpen(false)}
              className="text-[#7A6040] hover:text-[#D4A017] text-sm uppercase tracking-wide font-semibold transition">
              {l.label}
            </Link>
          ))}
          <div className="flex gap-2 mt-2">
            <Link href="/auth" className="flex-1 border border-[#D4A017]/40 text-[#D4A017] py-2 rounded text-sm font-bold uppercase text-center">Login</Link>
            <Link href="/auth" className="flex-1 bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black py-2 rounded text-sm font-bold uppercase text-center">Join Free</Link>
          </div>
        </div>
      )}
    </nav>
  )
}
