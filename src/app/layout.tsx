import type { Metadata } from "next";
import { Rajdhani, Noto_Sans_Telugu } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import PWARegister from '@/components/PWARegister'
const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoTelugu = Noto_Sans_Telugu({
  variable: "--font-noto-telugu",
  subsets: ["telugu"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "CinemaVuru — District Cinema of Telangana",
  description:
    "The first hyperlocal short film platform for Telangana. Discover short films made by filmmakers from your own district.",
  keywords: ["short films", "Telangana", "Warangal", "Telugu cinema", "indie films"],
  openGraph: {
    title: "CinemaVuru — సినిమా వూరు",
    description: "Discover short films from your district. Made by local filmmakers, for local audiences.",
    type: "website",
  },
  // ← NEW: PWA manifest + icons
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-512.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CinemaVuru",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="te">
      <head>
        {/* ← NEW: PWA theme color — shows in browser chrome on mobile */}
        <meta name="theme-color" content="#FF6B1A" />
        {/* ← NEW: Makes it feel like a native app on iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CinemaVuru" />
        {/* ← NEW: Apple touch icon for iOS home screen */}
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />
      </head>
      <body className={`${rajdhani.variable} ${notoTelugu.variable} antialiased`}>
        <PWARegister />
        {children}

        {/* ── Site Footer ── */}
        <footer className="relative z-10 border-t border-[#2E2010] mt-16 bg-[#0D0A06]">
          <div className="max-w-6xl mx-auto px-6 py-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">

              {/* Logo */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-xs">🎬</div>
                <span className="text-[#FFB830] font-bold text-sm">CinemaVuru</span>
                <span className="text-[#A5A5A5] text-xs">· సినిమా వూరు</span>
              </div>

              {/* Links */}
              <div className="flex items-center gap-6 text-sm text-[#E8E8E8] font-medium">
                <Link href="/telangana/hyderabad" className="hover:text-[#FFB830] transition">Films</Link>
                <Link href="/contest" className="hover:text-[#FFB830] transition">Contest</Link>
                <Link href="/contest/winners" className="hover:text-[#FFB830] transition">Hall of Fame</Link>
                <Link href="/terms" className="hover:text-[#FFB830] transition">Terms</Link>
                <Link href="/privacy" className="hover:text-[#FFB830] transition">Privacy</Link>
              </div>

              {/* Copyright */}
              <p className="text-[#A5A5A5] text-xs">
                © {new Date().getFullYear()} CinemaVuru. All rights reserved.
              </p>

            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}