import type { Metadata } from "next";
import { Rajdhani, Noto_Sans_Telugu } from "next/font/google";
import Link from "next/link";
import "./globals.css";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="te">
      <body className={`${rajdhani.variable} ${notoTelugu.variable} antialiased`}>
        {children}

        {/* ── Site Footer ── */}
        <footer className="relative z-10 border-t border-[#2E2010] mt-16">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">

              {/* Logo */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-xs">🎬</div>
                <span className="text-[#D4A017] font-bold text-sm">CinemaVuru</span>
                <span className="text-[#4A3020] text-xs">· సినిమా వూరు</span>
              </div>

              {/* Links */}
              <div className="flex items-center gap-6 text-xs text-[#4A3020]">
                <Link href="/telangana/hyderabad" className="hover:text-[#7A6040] transition">Films</Link>
                <Link href="/contest" className="hover:text-[#7A6040] transition">Contest</Link>
                <Link href="/contest/winners" className="hover:text-[#7A6040] transition">Hall of Fame</Link>
                <Link href="/terms" className="hover:text-[#7A6040] transition">Terms</Link>
                <Link href="/privacy" className="hover:text-[#7A6040] transition">Privacy</Link>
              </div>

              {/* Copyright */}
              <p className="text-[#4A3020] text-xs">
                © {new Date().getFullYear()} CinemaVuru. All rights reserved.
              </p>

            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}
