"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  TrendingUp,
  ShieldAlert,
  Plus,
  ExternalLink,
  LayoutDashboard,
  Power,
  Phone,
  MapPin,
  CheckCircle2,
  Ban,
  Crown,
  Scissors,
  Armchair,
  Link2,
  Sparkles,
  Copy,
  Check,
  Lock,
  KeyRound,
  LogOut,
} from "lucide-react";
import { useBarber, slugifyShopName } from "@/context/BarberContext";

export default function SuperAdminPage() {
  const {
    shops,
    globalBlacklist,
    addShop,
    toggleShopSubscription,
    masterPin,
    updateMasterPin,
  } = useBarber();

  // MASTER PIN AUTHENTICATION STATE (Default: 9999)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [newMasterPinInput, setNewMasterPinInput] = useState<string>("");
  const [showPinChange, setShowPinChange] = useState<boolean>(false);

  const [newShopName, setNewShopName] = useState<string>("");
  const [newShopSlug, setNewShopSlug] = useState<string>("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState<boolean>(false);
  const [newShopPhone, setNewShopPhone] = useState<string>("0532 800 50 60");
  const [newShopDistrict, setNewShopDistrict] = useState<string>(
    "Beşiktaş, İstanbul"
  );
  const [newShopFee, setNewShopFee] = useState<string>("1000");

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    subtitle: string;
    type: "success" | "warning";
  } | null>(null);

  const showToast = (
    title: string,
    subtitle: string,
    type: "success" | "warning" = "success"
  ) => {
    setToast({ title, subtitle, type });
    setTimeout(() => {
      setToast((prev) => (prev?.title === title ? null : prev));
    }, 5000);
  };

  const handleVerifyMasterPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === masterPin) {
      setIsUnlocked(true);
      setPinError("");
      setPinInput("");
    } else {
      setPinError(
        `Hatalı Master PIN kodu! Lütfen tekrar deneyin (Demo Master PIN: ${masterPin}).`
      );
    }
  };

  const handleSaveMasterPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMasterPinInput.trim().length < 4) return;
    updateMasterPin(newMasterPinInput.trim());
    setShowPinChange(false);
    setNewMasterPinInput("");
    showToast(
      "SaaS Kurucu Master PIN Güncellendi!",
      `Yeni Master PIN kodunuz '${newMasterPinInput.trim()}' olarak kaydedildi.`,
      "success"
    );
  };

  const activeShops = shops.filter((s) => s.subscriptionStatus === "active");
  const totalMRR = activeShops.reduce((sum, s) => sum + s.monthlyFee, 0);

  const handleNameChange = (val: string) => {
    setNewShopName(val);
    if (!slugManuallyEdited) {
      setNewShopSlug(slugifyShopName(val));
    }
  };

  const handleCreateShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;

    const finalSlug =
      slugifyShopName(newShopSlug || newShopName) || `salon-${Date.now()}`;
    const created = addShop({
      name: newShopName.trim(),
      slug: finalSlug,
      phone: newShopPhone.trim(),
      district: newShopDistrict.trim(),
      monthlyFee: Number(newShopFee) || 1000,
    });

    showToast(
      `Yeni Berber Dükkanı Oluşturuldu: ${created.name}`,
      `Özel Link: /?shop=${created.slug} — Varsayılan koltukları, ustaları, % prim oranları ve fiyat tarifesiyle izole olarak kuruldu!`,
      "success"
    );

    setNewShopName("");
    setNewShopSlug("");
    setSlugManuallyEdited(false);
    setNewShopFee("1000");
  };

  const handleCopyShopUrl = (slug: string) => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/?shop=${slug}`
        : `http://localhost:3000/?shop=${slug}`;
    navigator.clipboard?.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // MASTER PIN GUARD SCREEN (/super-admin)
  if (!isUnlocked) {
    return (
      <div className="relative mx-auto max-w-md px-4 pb-28 pt-12 sm:px-6 sm:pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 left-1/2 -z-10 h-64 w-full max-w-lg -translate-x-1/2 rounded-full bg-gradient-to-r from-[#b47b48]/25 via-[#c88a53]/20 to-[#9a6334]/25 blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="overflow-hidden rounded-3xl border border-[#e6ccb2]/50 bg-gradient-to-b from-[#241b16] via-[#1c1613] to-[#14100d] p-7 shadow-2xl shadow-black/80"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e6ccb2]/50 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/30">
            <Crown className="h-8 w-8 stroke-[2.3]" />
          </div>

          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6ccb2]/40 bg-[#c88a53]/20 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#e6ccb2]">
              <Lock className="h-3 w-3 text-[#c88a53]" />
              YAZILIM SAHİBİ GÜVENLİK KALKANI
            </span>
            <h1 className="mt-2.5 text-xl font-extrabold text-[#fdf8f5] sm:text-2xl">
              SaaS Kurucu (Master) Girişi
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-[#e6ccb2]/75">
              Tüm berber dükkanlarını, aylık abonelikleri ve Ortak Kara Liste
              Ağını yönetmek için 4 haneli Master PIN kodunu giriniz.
            </p>
          </div>

          <form onSubmit={handleVerifyMasterPin} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#e6ccb2]">
                <span>4 Haneli Master PIN Kodu</span>
                <span className="rounded-md border border-[#c88a53]/40 bg-[#c88a53]/15 px-2 py-0.5 font-mono text-[11px] font-extrabold text-[#e6ccb2]">
                  Demo Master PIN: {masterPin}
                </span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, ""));
                  setPinError("");
                }}
                placeholder="• • • •"
                className="w-full rounded-2xl border border-[#c88a53]/45 bg-[#14100d] py-3.5 text-center font-mono text-2xl font-black tracking-[0.5em] text-[#fdf8f5] placeholder-[#e6ccb2]/30 outline-none focus:border-[#e6ccb2]"
              />
            </div>

            {/* Numeric Quick Keypad */}
            <div className="grid grid-cols-5 gap-1.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    if (pinInput.length < 6) {
                      setPinInput((prev) => prev + digit);
                      setPinError("");
                    }
                  }}
                  className="rounded-xl border border-[#c88a53]/25 bg-[#14100d] py-2 font-mono text-sm font-bold text-[#e6ccb2] transition hover:border-[#c88a53] hover:bg-[#241b16] hover:text-[#fdf8f5]"
                >
                  {digit}
                </button>
              ))}
            </div>

            {pinError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-center text-xs font-bold text-rose-300">
                {pinError}
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3.5 text-xs font-black uppercase tracking-wider text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110"
            >
              <KeyRound className="h-4 w-4 stroke-[2.5]" />
              <span>Master Komuta Merkezini Aç</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPinInput(masterPin);
                setIsUnlocked(true);
              }}
              className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] py-2.5 text-[11px] font-bold text-[#e6ccb2] transition hover:border-[#c88a53]/70 hover:text-[#fdf8f5]"
            >
              Hızlı Test: Demo Master PIN ({masterPin}) ile Direkt Giriş Yap
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8">
      {/* Top Ambient Bronze Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 left-1/2 -z-10 h-64 w-full max-w-4xl -translate-x-1/2 rounded-full bg-gradient-to-r from-[#b47b48]/20 via-[#c88a53]/15 to-[#9a6334]/20 blur-3xl"
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`mb-6 flex items-center justify-between gap-4 rounded-2xl border p-4 shadow-2xl ${
              toast.type === "warning"
                ? "border-rose-500/50 bg-[#261414] text-rose-200"
                : "border-[#e6ccb2]/50 bg-[#241b16] text-[#fdf8f5] shadow-[#c88a53]/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  toast.type === "warning"
                    ? "bg-rose-500 text-white"
                    : "bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b]"
                }`}
              >
                {toast.type === "warning" ? (
                  <Ban className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#fdf8f5]">
                  {toast.title}
                </h4>
                <p className="mt-0.5 text-xs text-[#e6ccb2]/85">
                  {toast.subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-xs font-bold text-[#e6ccb2] hover:text-white"
            >
              Kapat
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Super Admin Hero Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#1a110b] shadow-sm">
              <Crown className="h-3.5 w-3.5" />
              SÜPER ADMİN KOMUTA MERKEZİ (/super-admin)
            </span>
            <span className="text-xs text-[#e6ccb2]/75">
              • Multi-Tenant SaaS & Ortak No-Show Kalkanı
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#fdf8f5] sm:text-3xl">
            Berber Dükkanları, Abonelikler &{" "}
            <span className="bg-gradient-to-r from-[#e6ccb2] via-[#c88a53] to-[#b47b48] bg-clip-text text-transparent">
              Ortak Kara Liste Ağı
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPinChange((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#c88a53]/35 bg-[#1c1613] px-3 py-2 text-xs font-bold text-[#e6ccb2] transition hover:border-[#c88a53]"
          >
            <KeyRound className="h-3.5 w-3.5 text-[#c88a53]" />
            <span>Master PIN: {masterPin}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsUnlocked(false);
              setPinInput("");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Paneli Kilitle</span>
          </button>
        </div>
      </div>

      {/* Optional Master PIN Change Bar */}
      <AnimatePresence>
        {showPinChange && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSaveMasterPin}
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e6ccb2]/45 bg-[#1c1613] p-4"
          >
            <div className="flex items-center gap-2.5 text-xs text-[#e6ccb2]">
              <KeyRound className="h-4 w-4 text-[#c88a53]" />
              <span>
                SaaS Kurucu Master PIN Kodunu Değiştir (Mevcut:{" "}
                <strong className="font-mono text-[#fdf8f5]">{masterPin}</strong>
                ):
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={newMasterPinInput}
                onChange={(e) =>
                  setNewMasterPinInput(e.target.value.replace(/\D/g, ""))
                }
                placeholder="Yeni 4 Haneli PIN"
                className="w-40 rounded-xl border border-[#c88a53]/40 bg-[#14100d] px-3 py-2 font-mono text-xs font-bold text-[#fdf8f5] outline-none focus:border-[#e6ccb2]"
              />
              <button
                type="submit"
                className="rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-4 py-2 text-xs font-black text-[#1a110b]"
              >
                Kaydet
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* TOP SAAS REVENUE & NETWORK METRICS (MRR, Active Shops, Global Blacklist) */}
      <section aria-label="SaaS Gelir Özeti" className="mb-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#c88a53]/35 bg-gradient-to-br from-[#261d17] via-[#1c1613] to-[#14100d] p-5 shadow-lg shadow-[#c88a53]/20 transition hover:border-[#c88a53]/65">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#e6ccb2]">
                Aktif Berber Sayısı
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c88a53]/20 text-[#e6ccb2] ring-1 ring-[#c88a53]/40">
                <Building2 className="h-5 w-5 text-[#c88a53]" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-black tracking-tight text-[#fdf8f5]">
                {activeShops.length}
              </span>
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                Toplam {shops.length} Dükkan
              </span>
            </div>
            <p className="mt-2 text-xs text-[#e6ccb2]/70">
              {shops.length - activeShops.length} dükkan ödeme bekliyor / askıda
            </p>
          </div>

          <div className="rounded-2xl border border-[#e6ccb2]/45 bg-gradient-to-br from-[#2c2018] via-[#1c1613] to-[#14100d] p-5 shadow-lg shadow-[#c88a53]/25 transition hover:border-[#e6ccb2]/75">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#e6ccb2]">
                Aylık Düzenli Gelir (MRR)
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b]">
                <TrendingUp className="h-5 w-5 stroke-[2.5]" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="bg-gradient-to-r from-[#fdf8f5] via-[#e6ccb2] to-[#c88a53] bg-clip-text text-3xl font-black tracking-tight text-transparent">
                {totalMRR.toLocaleString("tr-TR")} TL
              </span>
              <span className="text-xs font-bold text-[#c88a53]">/ Ay</span>
            </div>
            <p className="mt-2 text-xs text-[#e6ccb2]/70">
              Aktif aboneliklerden elde edilen aylık net SaaS yazılım geliri
            </p>
          </div>

          <div className="rounded-2xl border border-[#c88a53]/30 bg-[#1c1613] p-5 shadow-lg transition hover:border-[#c88a53]/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#e6ccb2]">
                Ortak Kara Listedeki Numara Sayısı
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-black tracking-tight text-[#fdf8f5]">
                {globalBlacklist.length}
              </span>
              <span className="rounded-md border border-[#c88a53]/35 bg-[#c88a53]/15 px-2 py-0.5 text-[11px] font-bold text-[#e6ccb2]">
                Global No-Show Shield
              </span>
            </div>
            <p className="mt-2 text-xs text-[#e6ccb2]/70">
              Tüm üye berber dükkanlarını ortak koruyan gerçek zamanlı kara liste
              ağı
            </p>
          </div>
        </div>
      </section>

      {/* MAIN GRID: TENANT SHOPS LIST (Left 2 cols) + ADD NEW SHOP FORM (Right 1 col) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Registered Barber Shops */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-4">
            <div>
              <h2 className="text-base font-extrabold text-[#fdf8f5]">
                Kayıtlı Berber Dükkanları (Tenants — {shops.length})
              </h2>
              <p className="text-xs text-[#e6ccb2]/70">
                Her dükkan kendi özel linki (`?shop=slug`), koltukları, PIN
                şifresi ve fiyatlarıyla %100 izole çalışır.
              </p>
            </div>
            <span className="rounded-lg border border-[#e6ccb2]/40 bg-[#c88a53]/20 px-2.5 py-1 text-xs font-bold text-[#e6ccb2]">
              Tam İzolasyon Aktif
            </span>
          </div>

          <div className="space-y-4">
            {shops.map((shop) => {
              const isActive = shop.subscriptionStatus === "active";
              const isCopied = copiedSlug === shop.slug;

              return (
                <motion.div
                  key={shop.slug}
                  layout
                  className={`rounded-2xl border p-5 transition-all ${
                    isActive
                      ? "border-[#c88a53]/30 bg-[#1c1613] shadow-lg shadow-[#c88a53]/10 hover:border-[#c88a53]/65"
                      : "border-rose-500/40 bg-gradient-to-br from-[#1c1613] via-[#1c1313] to-[#14100d]"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-base font-black ${
                          isActive
                            ? "border-[#e6ccb2]/50 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-md shadow-[#c88a53]/20"
                            : "border-rose-500/40 bg-rose-950/40 text-rose-300"
                        }`}
                      >
                        <Scissors className="h-6 w-6 -rotate-45" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-extrabold text-[#fdf8f5]">
                            {shop.name}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                              isActive
                                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                                : "border border-rose-500/40 bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {isActive
                              ? "Aylık Abonelik: Aktif"
                              : "Ödeme Bekliyor / Askıda"}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[#e6ccb2]/80">
                          <button
                            type="button"
                            onClick={() => handleCopyShopUrl(shop.slug)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#c88a53]/35 bg-[#14100d] px-2.5 py-1 font-mono text-xs font-bold text-[#e6ccb2] transition hover:border-[#c88a53]"
                            title="Müşteri Randevu Linkini Kopyala"
                          >
                            <Link2 className="h-3 w-3 text-[#c88a53]" />
                            <span>/?shop={shop.slug}</span>
                            {isCopied ? (
                              <Check className="ml-1 h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="ml-1 h-3 w-3 opacity-60" />
                            )}
                          </button>

                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#c88a53]" />
                            {shop.district}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-[#c88a53]" />
                            {shop.phone}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="rounded-lg border border-[#c88a53]/20 bg-[#14100d] px-2.5 py-1 text-[#e6ccb2]">
                            <Armchair className="mr-1 inline h-3 w-3 text-[#c88a53]" />
                            {shop.barbers.length} Koltuk/Usta
                          </span>
                          <span className="rounded-lg border border-[#c88a53]/20 bg-[#14100d] px-2.5 py-1 text-[#e6ccb2]">
                            <Scissors className="mr-1 inline h-3 w-3 text-[#c88a53]" />
                            {shop.services.length} Hizmet (Saç:{" "}
                            {shop.services[0]?.price || 400} TL)
                          </span>
                          <span className="rounded-lg border border-[#c88a53]/20 bg-[#14100d] px-2.5 py-1 font-mono text-[#e6ccb2]">
                            Salon PIN: {shop.adminPin || "1234"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row items-center justify-between border-t border-[#c88a53]/20 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                      <div className="text-right">
                        <span className="bg-gradient-to-r from-[#fdf8f5] to-[#c88a53] bg-clip-text text-xl font-black text-transparent">
                          {shop.monthlyFee.toLocaleString("tr-TR")} TL
                        </span>
                        <span className="block text-[11px] font-semibold text-[#e6ccb2]/65">
                          Aylık SaaS Paketi
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons on Each Shop Card */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-[#c88a53]/20 pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/?shop=${shop.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-3.5 py-2.5 text-xs font-black text-[#1a110b] shadow-md shadow-[#c88a53]/20 transition hover:brightness-110"
                      >
                        <ExternalLink className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span>Müşteri Vitrinine Git</span>
                      </Link>

                      <Link
                        href={`/admin?shop=${shop.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#c88a53]/45 bg-[#14100d] px-3.5 py-2.5 text-xs font-extrabold text-[#e6ccb2] transition hover:border-[#e6ccb2]/60 hover:bg-[#261d17] hover:text-[#fdf8f5]"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5 text-[#c88a53]" />
                        <span>Berberin Admin Paneline Gir</span>
                      </Link>
                    </div>

                    {/* Subscription Freeze / Activate Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleShopSubscription(shop.slug);
                        showToast(
                          isActive
                            ? `${shop.name} Aboneliği Donduruldu (Askıya Alındı)`
                            : `${shop.name} Aboneliği Aktif Edildi`,
                          isActive
                            ? `/?shop=${shop.slug} müşteri vitrini geçici olarak kapatıldı.`
                            : `/?shop=${shop.slug} müşteri vitrini tekrar online randevulara açıldı.`,
                          isActive ? "warning" : "success"
                        );
                      }}
                      className={`inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition ${
                        isActive
                          ? "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                          : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>
                        {isActive
                          ? "Aboneliği Dondur (Askıya Al)"
                          : "Aboneliği Aktif Et"}
                      </span>
                      <span
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          isActive
                            ? "bg-emerald-500"
                            : "bg-rose-950 ring-1 ring-rose-500/50"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            isActive ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* GLOBAL BLACKLIST NETWORK TABLE (Ortak Kara Liste Ağı) */}
          <div className="mt-8 rounded-2xl border border-[#c88a53]/30 bg-[#1c1613] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c88a53]/20 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#fdf8f5]">
                    Ortak Kara Liste Ağı (Global No-Show Shield —{" "}
                    {globalBlacklist.length} Numara)
                  </h3>
                  <p className="text-xs text-[#e6ccb2]/70">
                    Herhangi bir üye berberin &ldquo;Gelmedi (No-Show)&rdquo;
                    olarak işaretlediği numara tüm berberlerde anında yakalanır.
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-300">
                Tüm Dükkanlarda Senkronize
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {globalBlacklist.map((entry, idx) => (
                <div
                  key={`${entry.phone}-${idx}`}
                  className="flex flex-col justify-between rounded-xl border border-[#c88a53]/20 bg-[#14100d] p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-black text-rose-300">
                      {entry.phone}
                    </span>
                    <span className="rounded-md border border-[#c88a53]/35 bg-[#c88a53]/15 px-2 py-0.5 text-[10px] font-bold text-[#e6ccb2]">
                      Bildiren: {entry.reportedByShopName}
                    </span>
                  </div>
                  <p className="mt-1 font-bold text-[#fdf8f5]">{entry.name}</p>
                  <p className="mt-0.5 text-[11px] text-[#e6ccb2]/65">
                    {entry.missedDate} • {entry.missedService}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Add New Barber Shop Form */}
        <div>
          <form
            onSubmit={handleCreateShop}
            className="sticky top-24 space-y-4 rounded-2xl border border-[#e6ccb2]/45 bg-[#1c1613] p-5 shadow-xl shadow-[#c88a53]/20"
          >
            <div className="flex items-center gap-3 border-b border-[#c88a53]/20 pb-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-md shadow-[#c88a53]/25">
                <Plus className="h-5 w-5 stroke-[2.8]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#fdf8f5]">
                  Yeni Berber Dükkanı Ekle
                </h3>
                <p className="text-xs text-[#e6ccb2]/75">
                  Anında kendi koltukları ve özel linkiyle açılır
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#e6ccb2]">
                Dükkan Adı *
              </label>
              <input
                type="text"
                required
                value={newShopName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Örn: Efe Berber VIP Club"
                className="w-full rounded-xl border border-[#c88a53]/35 bg-[#14100d] px-3.5 py-2.5 text-sm font-bold text-[#fdf8f5] placeholder-[#e6ccb2]/40 outline-none focus:border-[#c88a53]"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center justify-between text-xs font-bold text-[#c88a53]">
                <span>Özel Link (Slug) *</span>
                <span className="font-mono text-[10px] text-[#e6ccb2]/70">
                  /?shop={newShopSlug || "efe-berber"}
                </span>
              </label>
              <input
                type="text"
                required
                value={newShopSlug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setNewShopSlug(slugifyShopName(e.target.value));
                }}
                placeholder="Örn: efe-berber"
                className="w-full rounded-xl border border-[#c88a53]/35 bg-[#14100d] px-3.5 py-2.5 font-mono text-sm font-bold text-[#e6ccb2] placeholder-[#e6ccb2]/40 outline-none focus:border-[#c88a53]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#e6ccb2]">
                Telefon Numarası *
              </label>
              <input
                type="text"
                required
                value={newShopPhone}
                onChange={(e) => setNewShopPhone(e.target.value)}
                placeholder="0532 800 50 60"
                className="w-full rounded-xl border border-[#c88a53]/35 bg-[#14100d] px-3.5 py-2.5 text-sm text-[#fdf8f5] outline-none focus:border-[#c88a53]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#e6ccb2]">
                  İlçe / Konum
                </label>
                <input
                  type="text"
                  value={newShopDistrict}
                  onChange={(e) => setNewShopDistrict(e.target.value)}
                  placeholder="Beşiktaş"
                  className="w-full rounded-xl border border-[#c88a53]/35 bg-[#14100d] px-3 py-2.5 text-xs text-[#fdf8f5] outline-none focus:border-[#c88a53]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#c88a53]">
                  Paket Ücreti (TL/Ay) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={100}
                  value={newShopFee}
                  onChange={(e) => setNewShopFee(e.target.value)}
                  className="w-full rounded-xl border border-[#c88a53]/35 bg-[#14100d] px-3 py-2.5 text-sm font-extrabold text-[#e6ccb2] outline-none focus:border-[#c88a53]"
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#c88a53]/25 bg-[#14100d] p-3 text-[11px] text-[#e6ccb2]/80">
              <div className="flex items-center gap-1.5 font-bold text-[#e6ccb2]">
                <Sparkles className="h-3.5 w-3.5 text-[#c88a53]" />
                <span>Otomatik Kurulum Paketi:</span>
              </div>
              <p className="mt-1 leading-relaxed">
                Dükkan eklendiği anda 3 varsayılan VIP koltuk/usta, kalfa prim
                oranları, 4 ana hizmet paketi, varsayılan PIN (1234) ve Ortak
                Kara Liste Kalkanı aktif olarak tanımlanır.
              </p>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3.5 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110"
            >
              <Plus className="h-4 w-4 stroke-[2.8]" />
              <span>Yeni Berber Dükkanını Oluştur</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
