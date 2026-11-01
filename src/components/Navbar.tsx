"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scissors,
  ShieldCheck,
  Calendar,
  LayoutDashboard,
  RotateCcw,
  Crown,
  MapPin,
  Phone,
  Wrench,
  ChevronUp,
  ChevronDown,
  Building2,
  ExternalLink,
  Lock,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useBarber } from "@/context/BarberContext";
import { lockAdminSession } from "@/components/AdminPinGate";

export default function Navbar() {
  const pathname = usePathname();
  const {
    shops,
    currentShop,
    hasShopQueryParam,
    globalBlacklist,
    resetDemoData,
  } = useBarber();

  const isSuperAdmin = pathname?.startsWith("/super-admin");
  const isShopAdmin = pathname?.startsWith("/admin");
  const isRootPath = !isSuperAdmin && !isShopAdmin;
  const isSaaSLanding = isRootPath && !hasShopQueryParam;
  const isCustomerView = isRootPath && hasShopQueryParam;

  const [devSwitcherOpen, setDevSwitcherOpen] = useState<boolean>(false);

  const upcomingCount = currentShop.appointments.filter(
    (a) => a.status === "upcoming"
  ).length;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0a09]/90 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3.5">
          {/* Brand Identity — Dynamically reflects Super Admin, B2B SaaS Landing, or Isolated Tenant Shop */}
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
          ) : isSaaSLanding ? (
            <Link href="/" className="group flex items-center gap-2.5 sm:gap-3">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/25 sm:h-10 sm:w-10">
                <Scissors className="h-4 w-4 -rotate-45 stroke-[2.3] sm:h-5 sm:w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="bg-gradient-to-r from-[#fdf8f5] via-[#e6ccb2] to-[#c88a53] bg-clip-text text-xs font-extrabold tracking-wider text-transparent sm:text-base">
                    BERBER SHIELD PRO
                  </span>
                  <span className="rounded-full border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-sky-300 sm:px-2.5 sm:text-[10px]">
                    B2B SAAS
                  </span>
                </div>
                <p className="hidden items-center gap-1 text-[11px] text-stone-400 sm:flex">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  <span>
                    VIP Berberler İçin Gelir Koruma & Akıllı Randevu Yazılımı
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
                  <span className="bg-gradient-to-r from-[#fdf8f5] via-[#e6ccb2] to-[#c88a53] bg-clip-text text-xs font-extrabold tracking-wider text-transparent sm:text-base">
                    {currentShop.name.toUpperCase()}
                  </span>
                  {isShopAdmin && (
                    <span className="hidden rounded-full border border-sky-400/35 bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-300 sm:inline-block">
                      PATRON PANELİ
                    </span>
                  )}
                </div>
                <p className="flex items-center gap-1.5 text-[10px] text-stone-400 sm:gap-2 sm:text-[11px]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5 text-sky-400 sm:h-3 sm:w-3" />
                    {currentShop.district}
                  </span>
                  <span className="hidden text-stone-600 sm:inline">•</span>
                  <span className="hidden items-center gap-1 sm:inline-flex">
                    <Phone className="h-3 w-3 text-emerald-400" />
                    {currentShop.phone}
                  </span>
                </p>
              </div>
            </Link>
          )}

          {/* Right Side Header Area — Seamless Switch between Berber Admin & Customer View */}
          {isCustomerView ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href={`/admin?shop=${currentShop.slug}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#171412] px-2.5 py-1.5 text-[11px] font-bold text-stone-200 shadow-sm transition hover:border-sky-400/50 hover:bg-sky-950/30 hover:text-sky-200 sm:px-3 sm:py-2 sm:text-xs"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-sky-400" />
                <span className="hidden sm:inline">Berber Girişi (Admin)</span>
                <span className="sm:hidden">Berber Girişi</span>
              </Link>
              <div className="hidden items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 sm:flex">
                <Lock className="h-3 w-3 text-emerald-400" />
                <span>256-Bit SSL</span>
              </div>
            </div>
          ) : isSaaSLanding ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {shops.length > 0 && (
                <Link
                  href={`/?shop=${currentShop.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-2.5 py-1.5 text-[11px] font-black text-[#1a110b] shadow-md shadow-[#c88a53]/20 transition hover:brightness-110 sm:px-3.5 sm:py-2 sm:text-xs"
                >
                  <Sparkles className="h-3 w-3 stroke-[2.5] sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">Canlı Demo Dükkan</span>
                  <span className="sm:hidden">Demo</span>
                </Link>
              )}
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#171412] px-2.5 py-1.5 text-[11px] font-bold text-stone-200 transition hover:border-sky-400/50 hover:bg-sky-950/30 hover:text-sky-200 sm:px-3 sm:py-2 sm:text-xs"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-sky-400" />
                <span>Berber Girişi</span>
              </Link>
            </div>
          ) : isShopAdmin ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href={`/?shop=${currentShop.slug}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/35 bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-bold text-sky-200 transition hover:border-sky-400 hover:bg-sky-500/20 hover:text-white sm:px-3 sm:py-2 sm:text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5 text-sky-400" />
                <span className="hidden sm:inline">Müşteri Vitrinini Gör</span>
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/20 sm:px-3 sm:py-2 sm:text-xs"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/"
                className="hidden items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-200 hover:border-sky-400 sm:inline-flex"
              >
                <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                <span>SaaS Satış Sayfası (/)</span>
              </Link>
              <button
                onClick={resetDemoData}
                title="Tüm Demo Verilerini Varsayılana Sıfırla"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#171412] px-2.5 py-1.5 text-[11px] font-bold text-stone-300 transition hover:border-amber-400/60 hover:text-amber-200 sm:px-3 sm:py-2 sm:text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">Demo Verilerini Sıfırla</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* FLOATING COLLAPSIBLE DEVELOPER QUICK SWITCHER (Completely disabled to hide admin links from public) */}
    </>
  );
}
