"use client";
import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16 bg-[#0D0A06]/90 backdrop-blur-md border-b border-[#2E2010]">
      
      {/* Logo */}
      <div className="flex items-center gap-3 cursor-pointer">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-base">
          🎬
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[#D4A017] font-bold text-lg tracking-wide">CinemaVuru</span>
          <span className="text-[#7A6040] text-[10px] uppercase tracking-widest">సినిమా వూరు</span>
        </div>
      </div>

      {/* Desktop Links */}
      <ul className="hidden md:flex items-center gap-1 list-none">
        {["Home", "Districts", "Warangal Films", "Upload"].map((link) => (
          <li key={link}>
            <a
              href="#"
              className="text-[#7A6040] hover:text-[#D4A017] hover:bg-[#D4A017]/10 px-3 py-1.5 rounded text-sm font-semibold uppercase tracking-wide transition"
            >
              {link}
            </a>
          </li>
        ))}
      </ul>

      {/* Auth Buttons */}
      <div className="hidden md:flex items-center gap-2">
        <button className="border border-[#D4A017]/40 text-[#D4A017] px-4 py-1.5 rounded text-sm font-bold uppercase tracking-wide hover:bg-[#D4A017]/10 transition">
          Login
        </button>
        <button className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-4 py-1.5 rounded text-sm font-bold uppercase tracking-wide hover:opacity-90 transition">
          Join Free
        </button>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden text-[#D4A017] text-2xl"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-[#0D0A06] border-b border-[#2E2010] flex flex-col p-4 gap-3 md:hidden">
          {["Home", "Districts", "Warangal Films", "Upload"].map((link) => (
            <a key={link} href="#" className="text-[#7A6040] hover:text-[#D4A017] text-sm uppercase tracking-wide font-semibold transition">
              {link}
            </a>
          ))}
          <div className="flex gap-2 mt-2">
            <button className="flex-1 border border-[#D4A017]/40 text-[#D4A017] py-2 rounded text-sm font-bold uppercase">Login</button>
            <button className="flex-1 bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black py-2 rounded text-sm font-bold uppercase">Join Free</button>
          </div>
        </div>
      )}
    </nav>
  );
}
