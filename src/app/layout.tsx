import type { Metadata } from "next";
import { Rajdhani, Noto_Sans_Telugu } from "next/font/google";
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
      </body>
    </html>
  );
}
