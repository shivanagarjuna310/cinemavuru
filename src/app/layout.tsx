import type { Metadata } from "next";
import { Rajdhani, Noto_Sans_Telugu } from "next/font/google";
import "./globals.css";
import PWARegister from '@/components/PWARegister'
import FloatingUploadButton from '@/components/FloatingUploadButton'
import SiteFooter from '@/components/SiteFooter'
import { AuthProvider } from '@/components/AuthProvider'
import { Analytics } from '@vercel/analytics/next'
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
        {/* Apply saved theme before paint to avoid a flash. Default = dark. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('theme')==='light'){document.documentElement.classList.add('light')}}catch(e){}",
          }}
        />
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
        <AuthProvider>
        {children}

        {/* ── Site Footer (hidden on immersive routes like /reels) ── */}
        <SiteFooter />

        {/* Global "Share Your Film" floating action button */}
        <FloatingUploadButton />
        </AuthProvider>

        <Analytics />

      </body>
    </html>
  );
}