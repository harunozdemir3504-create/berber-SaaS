"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scissors,
  ShieldCheck,
  RotateCcw,
  Crown,
  MapPin,
  Phone,
  ExternalLink,
  Lock,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useBarber } from "@/context/BarberContext";
import { useTheme } from "@/context/ThemeContext";
import { lockAdminSession } from "@/components/AdminPinGate";

export default function Navbar() {
  const pathname = usePathname();
  const {
    shops,
    currentShop,
    resetDemoData,
  } = useBarber();
  const { theme, toggleTheme } = useTheme();

  const isSuperAdmin = pathname?.startsWith("/super-admin");
  const isShopAdmin = pathname?.startsWith("/admin");

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-xl print:hidden transition-colors duration-200 ${
        isShopAdmin && theme === "light"
          ? "border-stone-200 bg-white/95 text-[#1a1a1a] shadow-sm"
          : "border-white/10 bg-[#0b0a09]/90 text-[#fdf8f5]"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
        {/* Brand Identity — Strictly Isolated by Route (/ vs /admin vs /super-admin) */}
        {isSuperAdmin ? (
          <Link href="/super-admin" className="group flex items-center gap-2.5 sm:gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-purple-400/50 bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-700 text-white shadow-lg shadow-purple-500/25 sm:h-10 sm:w-10">
              <Crown className="h-4 w-4 stroke-[2.3] sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="bg-gradient-to-r from-[#fdf8f5] via-purple-200 to-[#c88a53] bg-clip-text text-xs font-extrabold tracking-wider text-transparent sm:text-base">
                  BERBER SAAS HQ
                </span>
                <span className="rounded-full border border-purple-400/40 bg-purple-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-purple-200 sm:px-2.5 sm:text-[10px]">
                  SÜPER ADMİN
                </span>
              </div>
              <p className="hidden items-center gap-1 text-[11px] text-stone-400 sm:flex">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span>
                  Çoklu Dükkan Komuta Merkezi • {shops.length} Kayıtlı Salon
                </span>
              </p>
            </div>
          </Link>
        ) : (
          <Link
            href={
              isShopAdmin
                ? `/admin?shop=${currentShop.slug}`
                : `/?shop=${currentShop.slug}`
            }
            className="group flex items-center gap-2.5 sm:gap-3"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-[#e6ccb2]/40 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition-transform duration-300 group-hover:scale-105 sm:h-10 sm:w-10">
              <Scissors className="h-4 w-4 -rotate-45 stroke-[2.3] sm:h-5 sm:w-5" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full border border-[#14100d] sm:h-3 sm:w-3 ${
                    currentShop.subscriptionStatus === "active"
                      ? "bg-emerald-400"
                      : "bg-rose-500"
                  }`}
                ></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className={`text-xs font-extrabold tracking-wider sm:text-base ${
                    isShopAdmin && theme === "light"
                      ? "text-[#1a1a1a]"
                      : "bg-gradient-to-r from-[#fdf8f5] via-[#e6ccb2] to-[#c88a53] bg-clip-text text-transparent"
                  }`}
                >
                  {currentShop.name.toUpperCase()}
                </span>
                {isShopAdmin && (
                  <span
                    className={`hidden rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest sm:inline-block ${
                      theme === "light"
                        ? "border-sky-300 bg-sky-50 text-sky-800"
                        : "border-sky-400/35 bg-sky-500/15 text-sky-300"
                    }`}
                  >
                    YÖNETİM PANELİ
                  </span>
                )}
              </div>
              <p
                className={`flex items-center gap-1.5 text-[10px] sm:gap-2 sm:text-[11px] ${
                  isShopAdmin && theme === "light"
                    ? "text-stone-600"
                    : "text-stone-400"
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5 text-sky-400 sm:h-3 sm:w-3" />
                  {currentShop.district}
                </span>
                <span className="hidden text-stone-400 sm:inline">•</span>
                <span className="hidden items-center gap-1 sm:inline-flex">
                  <Phone className="h-3 w-3 text-emerald-500" />
                  {currentShop.phone}
                </span>
              </p>
            </div>
          </Link>
        )}

        {/* Right Side Header Area — Strictly Separated: Zero Admin Links on Customer Route (/) */}
        {isShopAdmin ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* ☀️ / 🌙 Tema Değiştirme Butonu (Gündüz / Gece Modu) */}
            <button
              type="button"
              onClick={toggleTheme}
              title={
                theme === "light"
                  ? "Gece Moduna Geç (Koyu Tema)"
                  : "Gündüz Moduna Geç (Aydınlık Tema)"
              }
              aria-label="Tema Değiştir"
              className={`group inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-black transition active:scale-95 sm:px-3 sm:py-2 sm:text-xs ${
                theme === "light"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-900 hover:border-amber-500/60 hover:bg-amber-500/20 shadow-sm"
                  : "border-amber-400/40 bg-amber-500/15 text-amber-300 hover:border-amber-400/80 hover:bg-amber-500/25 shadow-sm shadow-amber-500/10"
              }`}
            >
              {theme === "light" ? (
                <>
                  <Moon className="h-3.5 w-3.5 text-indigo-600 transition-transform group-hover:-rotate-12 fill-indigo-600/20 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Gece Modu</span>
                  <span className="sm:hidden">Gece</span>
                </>
              ) : (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400 transition-transform group-hover:rotate-45 fill-amber-400/20 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Gündüz Modu</span>
                  <span className="sm:hidden">Gündüz</span>
                </>
              )}
            </button>

            <Link
              href={`/${currentShop.slug}?preview=1`}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition sm:px-3 sm:py-2 sm:text-xs ${
                theme === "light"
                  ? "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 hover:border-sky-400 shadow-sm"
                  : "border-sky-500/35 bg-sky-500/10 text-sky-200 hover:border-sky-400 hover:bg-sky-500/20 hover:text-white"
              }`}
            >
              <ExternalLink className="h-3.5 w-3.5 text-sky-500 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Müşteri Ekranı</span>
              <span className="sm:hidden">Vitrin</span>
            </Link>
            <button
              onClick={() => {
                lockAdminSession(currentShop.slug);
                if (typeof window !== "undefined") {
                  window.location.href = "/admin";
                }
              }}
              title="Oturumu Kapat / Çıkış Yap"
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition sm:px-3 sm:py-2 sm:text-xs ${
                theme === "light"
                  ? "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 hover:border-rose-400 shadow-sm"
                  : "border-rose-500/35 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
              }`}
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        ) : isSuperAdmin ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={resetDemoData}
              title="Tüm Demo Verilerini Varsayılana Sıfırla"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#171412] px-2.5 py-1.5 text-[11px] font-bold text-stone-300 transition hover:border-amber-400/60 hover:text-amber-200 sm:px-3 sm:py-2 sm:text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Demo Verilerini Sıfırla</span>
            </button>
          </div>
        ) : (
          /* Customer View (/) — Purely Customer-Facing Badge, No Admin Transition */
          <div className="flex items-center gap-1.5">
            <div className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-2.5 py-1 text-[10px] font-bold text-emerald-300 sm:px-3 sm:py-1.5 sm:text-xs">
              <Lock className="h-3 w-3 text-emerald-400" />
              <span>Online Randevu</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
