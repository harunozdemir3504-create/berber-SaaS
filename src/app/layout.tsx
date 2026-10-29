import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BarberProvider } from "@/context/BarberContext";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ATELIER NOIR | VIP Berber & Akıllı No-Show Randevu Sistemi",
  description:
    "Erkek berberleri ve VIP kuaförler için No-Show (Randevuya Gelmeme) Engelleyici ve Akıllı Randevu Sistemi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body
        className={`${inter.variable} font-sans min-h-screen bg-[#0d0a08] text-[#fdf8f5] antialiased selection:bg-[#c88a53] selection:text-[#1a110b]`}
      >
        <BarberProvider>
          {/* Ambient Warm Bronze & Cognac Leather Glow Behind Header */}
          <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 overflow-hidden">
            <div className="mx-auto h-[420px] w-[860px] -translate-y-1/2 rounded-full bg-gradient-to-r from-[#b47b48]/20 via-[#c88a53]/15 to-[#9a6334]/20 blur-[135px]" />
            <div className="mx-auto -mt-40 h-[260px] w-[520px] rounded-full bg-[#c88a53]/10 blur-[110px]" />
          </div>
          <Navbar />
          <main className="relative z-10">{children}</main>
        </BarberProvider>
      </body>
    </html>
  );
}
