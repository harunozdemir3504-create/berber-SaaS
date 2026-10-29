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
} from "lucide-react";
import { useBarber } from "@/context/BarberContext";

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
      <header className="sticky top-0 z-40 border-b border-[#c88a53]/25 bg-[#0d0a08]/92 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          {/* Brand Identity — Dynamically reflects Super Admin, B2B SaaS Landing, or Isolated Tenant Shop */}
          {isSuperAdmin ? (
            <Link href="/super-admin" className="group flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/25">
                <Crown className="h-5 w-5 stroke-[2.3]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-[#fdf8f5] via-[#e6ccb2] to-[#c88a53] bg-clip-text text-sm font-extrabold tracking-wider text-transparent sm:text-base">
                    BERBER SAAS HQ
                  </span>
                  <span className="rounded-full border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#1a110b]">
                    SÜPER ADMİN
                  </span>
                </div>
                <p className="flex items-center gap-1 text-[11px] text-[#e6ccb2]/75">
                  <ShieldCheck className="h-3 w-3 text-[#c88a53]" />
                  <span>
                    Çoklu Dükkan Komuta Merkezi • {shops.length} Kayıtlı Salon
                  </span>
                </p>
              </div>
            </Link>
          ) : isSaaSLanding ? (
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/25">
                <Scissors className="h-5 w-5 -rotate-45 stroke-[2.3]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-[#fdf8f5] via-[#e6ccb2] to-[#c88a53] bg-clip-text text-sm font-extrabold tracking-wider text-transparent sm:text-base">
                    BERBER SHIELD PRO
                  </span>
                  <span className="rounded-full border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#1a110b]">
                    B2B SAAS
                  </span>
                </div>
                <p className="flex items-center gap-1 text-[11px] text-[#e6ccb2]/75">
                  <ShieldCheck className="h-3 w-3 text-[#c88a53]" />
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
              className="group flex items-center gap-3"
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#e6ccb2]/40 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition-transform duration-300 group-hover:scale-105">
                <Scissors className="h-5 w-5 -rotate-45 stroke-[2.3]" />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span
                    className={`relative inline-flex h-3 w-3 rounded-full border border-[#14100d] ${
                      currentShop.subscriptionStatus === "active"
                        ? "bg-emerald-400"
                        : "bg-rose-500"
                    }`}
                  ></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-[#fdf8f5] via-[#e6ccb2] to-[#c88a53] bg-clip-text text-sm font-extrabold tracking-wider text-transparent sm:text-base">
                    {currentShop.name.toUpperCase()}
                  </span>
                  {isShopAdmin && (
                    <span className="hidden rounded-full border border-[#c88a53]/45 bg-[#c88a53]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#e6ccb2] sm:inline-block">
                      PATRON PANELİ
                    </span>
                  )}
                </div>
                <p className="flex items-center gap-2 text-[11px] text-[#e6ccb2]/75">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[#c88a53]" />
                    {currentShop.district}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden items-center gap-1 sm:inline-flex">
                    <Phone className="h-3 w-3 text-[#c88a53]" />
                    {currentShop.phone}
                  </span>
                </p>
              </div>
            </Link>
          )}

          {/* Right Side Header Area — Strict Isolation on Customer View */}
          {isCustomerView ? (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1.5 rounded-xl border border-[#c88a53]/30 bg-[#1c1613] px-3 py-1.5 text-xs font-semibold text-[#e6ccb2] sm:flex">
                <ShieldCheck className="h-4 w-4 text-[#c88a53]" />
                <span>Resmi Online Randevu Vitrini</span>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-[#c88a53]/25 bg-[#14100d] px-2.5 py-1.5 text-[11px] font-bold text-[#e6ccb2]">
                <Lock className="h-3 w-3 text-[#c88a53]" />
                <span>256-Bit SSL</span>
              </div>
            </div>
          ) : isSaaSLanding ? (
            <div className="flex items-center gap-2">
              <Link
                href="/?shop=atelier-noir"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-3.5 py-2 text-xs font-black text-[#1a110b] shadow-md shadow-[#c88a53]/20 transition hover:brightness-110"
              >
                <Sparkles className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Canlı Demo Dükkan</span>
              </Link>
              <Link
                href="/admin?shop=atelier-noir"
                className="hidden items-center gap-1.5 rounded-xl border border-[#c88a53]/35 bg-[#1c1613] px-3 py-2 text-xs font-bold text-[#e6ccb2] transition hover:border-[#c88a53] sm:inline-flex"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-[#c88a53]" />
                <span>Berber Girişi</span>
              </Link>
            </div>
          ) : isShopAdmin ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/?shop=${currentShop.slug}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#c88a53]/40 bg-[#1c1613] px-3 py-2 text-xs font-bold text-[#e6ccb2] transition hover:border-[#c88a53] hover:bg-[#261d17]"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#c88a53]" />
                <span className="hidden sm:inline">Müşteri Vitrinini Gör</span>
                <span className="sm:hidden">Vitrin</span>
              </Link>
              <button
                onClick={resetDemoData}
                title="Tüm Demo Verilerini Varsayılana Sıfırla"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c88a53]/25 bg-[#1c1613] text-[#e6ccb2]/80 transition hover:border-[#c88a53]/60 hover:text-[#fdf8f5]"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="hidden items-center gap-1.5 rounded-xl border border-[#c88a53]/30 bg-[#1c1613] px-3 py-1.5 text-xs font-bold text-[#e6ccb2] hover:border-[#c88a53] sm:inline-flex"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#c88a53]" />
                <span>SaaS Satış Sayfası (/)</span>
              </Link>
              <button
                onClick={resetDemoData}
                title="Tüm Demo Verilerini Varsayılana Sıfırla"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#c88a53]/35 bg-[#1c1613] px-3 py-2 text-xs font-bold text-[#e6ccb2] transition hover:border-[#c88a53]/70 hover:text-[#fdf8f5]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#c88a53]" />
                <span className="hidden sm:inline">Demo Verilerini Sıfırla</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* FLOATING COLLAPSIBLE DEVELOPER QUICK SWITCHER (Bottom-Right Corner for Easy Testing) */}
      <div className="fixed bottom-4 right-4 z-50 print:hidden">
        {devSwitcherOpen ? (
          <div className="w-80 overflow-hidden rounded-2xl border border-[#e6ccb2]/45 bg-[#14100d]/95 p-4 shadow-2xl shadow-black/80 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-[#c88a53]/25 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#e6ccb2]/40 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b]">
                  <Wrench className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#fdf8f5]">
                    Geliştirici Hızlı Geçiş
                  </h4>
                  <p className="text-[10px] text-[#e6ccb2]/70">
                    Test Amaçlı Gizli SaaS Kısayolu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDevSwitcherOpen(false)}
                className="rounded-lg border border-[#c88a53]/30 bg-[#1c1613] p-1 text-[#e6ccb2] hover:text-[#fdf8f5]"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* 1. Current Mode Switcher */}
            <div className="mt-3">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#c88a53]">
                1. Ekran Modu Seçin ({currentShop.name}):
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <Link
                  href="/"
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-center text-[11px] font-bold transition ${
                    isSaaSLanding
                      ? "border-[#e6ccb2]/60 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black text-[#1a110b] shadow-md"
                      : "border-[#c88a53]/25 bg-[#1c1613] text-[#e6ccb2] hover:border-[#c88a53]/60"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>SaaS Tanıtım (/)</span>
                </Link>

                <Link
                  href={`/?shop=${currentShop.slug}`}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-center text-[11px] font-bold transition ${
                    isCustomerView
                      ? "border-[#e6ccb2]/60 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black text-[#1a110b] shadow-md"
                      : "border-[#c88a53]/25 bg-[#1c1613] text-[#e6ccb2] hover:border-[#c88a53]/60"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Müşteri Vitrini</span>
                </Link>

                <Link
                  href={`/admin?shop=${currentShop.slug}`}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-center text-[11px] font-bold transition ${
                    isShopAdmin
                      ? "border-[#e6ccb2]/60 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black text-[#1a110b] shadow-md"
                      : "border-[#c88a53]/25 bg-[#1c1613] text-[#e6ccb2] hover:border-[#c88a53]/60"
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Berber Admin ({upcomingCount})</span>
                </Link>

                <Link
                  href="/super-admin"
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-center text-[11px] font-bold transition ${
                    isSuperAdmin
                      ? "border-[#e6ccb2]/60 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black text-[#1a110b] shadow-md"
                      : "border-[#c88a53]/25 bg-[#1c1613] text-[#e6ccb2] hover:border-[#c88a53]/60"
                  }`}
                >
                  <Crown className="h-3.5 w-3.5" />
                  <span>Süper Admin</span>
                </Link>
              </div>
            </div>

            {/* 2. Tenant Shop Switcher */}
            <div className="mt-3 border-t border-[#c88a53]/20 pt-2.5">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#c88a53]">
                2. Aktif Berber Dükkanı Değiştir (Slug):
              </span>
              <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {shops.map((shop) => {
                  const isCurrent =
                    shop.slug === currentShop.slug &&
                    !isSuperAdmin &&
                    !isSaaSLanding;
                  const targetHref = isShopAdmin
                    ? `/admin?shop=${shop.slug}`
                    : `/?shop=${shop.slug}`;

                  return (
                    <Link
                      key={shop.slug}
                      href={targetHref}
                      className={`flex items-center justify-between rounded-xl border px-2.5 py-2 text-xs transition ${
                        isCurrent
                          ? "border-[#e6ccb2]/60 bg-[#261d17] font-bold text-[#fdf8f5]"
                          : "border-[#c88a53]/20 bg-[#1c1613] text-[#e6ccb2]/85 hover:border-[#c88a53]/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-[#c88a53]" />
                        <div className="truncate">
                          <p className="truncate font-bold leading-tight text-[#fdf8f5]">
                            {shop.name}
                          </p>
                          <p className="font-mono text-[10px] text-[#c88a53]">
                            ?shop={shop.slug}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                          shop.subscriptionStatus === "active"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {shop.subscriptionStatus === "active" ? "Aktif" : "Askıda"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[#c88a53]/20 pt-2.5 text-[11px]">
              <span className="text-[#e6ccb2]/70">
                Ortak Kara Liste: <strong>{globalBlacklist.length}</strong> numara
              </span>
              <button
                type="button"
                onClick={resetDemoData}
                className="inline-flex items-center gap-1 font-bold text-[#c88a53] hover:underline"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Sıfırla</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDevSwitcherOpen(true)}
            className="flex items-center gap-2 rounded-full border border-[#e6ccb2]/50 bg-[#14100d]/95 px-3.5 py-2 text-xs font-extrabold text-[#e6ccb2] shadow-xl shadow-black/70 backdrop-blur-md transition hover:border-[#c88a53] hover:bg-[#1c1613]"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b]">
              <Wrench className="h-3 w-3" />
            </span>
            <span>
              Dev Switcher (
              {isSuperAdmin
                ? "Süper Admin"
                : isSaaSLanding
                ? "SaaS Vitrin"
                : currentShop.slug}
              )
            </span>
            <ChevronUp className="h-3.5 w-3.5 text-[#c88a53]" />
          </button>
        )}
      </div>
    </>
  );
}
