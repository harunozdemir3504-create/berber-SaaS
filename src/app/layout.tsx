import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/admin-theme.css";
import { BarberProvider } from "@/context/BarberContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#c88a53",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://viprandevusistemi.com.tr"),
  title: "VIP Berber Online Randevu",
  description:
    "VIP berber ve kuaför salonları için hızlı ve güvenli online randevu sistemi.",
  manifest: "/manifest.json",
  applicationName: "VIP Randevu",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VIP Randevu",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark touch-manipulation">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#c88a53" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="VIP Randevu" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('vip_barber_admin_theme_mode');
                  if (t === 'light') {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                    document.documentElement.setAttribute('data-theme', 'light');
                  } else {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} font-sans min-h-screen bg-[#0d0a08] text-[#fdf8f5] antialiased touch-manipulation select-none selection:bg-[#c88a53] selection:text-[#1a110b]`}
      >
        <ThemeProvider>
          <BarberProvider>
            {/* Ambient Warm Bronze & Cognac Leather Glow Behind Header */}
            <div className="dark-ambient-glow pointer-events-none fixed inset-x-0 top-0 -z-10 overflow-hidden">
              <div className="mx-auto h-[420px] w-[860px] -translate-y-1/2 rounded-full bg-gradient-to-r from-[#b47b48]/20 via-[#c88a53]/15 to-[#9a6334]/20 blur-[135px]" />
              <div className="mx-auto -mt-40 h-[260px] w-[520px] rounded-full bg-[#c88a53]/10 blur-[110px]" />
            </div>
            <Navbar />
            <main className="relative z-10 touch-manipulation select-none">{children}</main>
          </BarberProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
