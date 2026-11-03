"use client";

import React, { useState, useEffect } from "react";
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
  RotateCcw,
  AlertTriangle,
  Edit2,
  Save,
  Trash2,
  CalendarDays,
  Clock,
} from "lucide-react";
import {
  useBarber,
  slugifyShopName,
  getShopBookingUrl,
  getShopDisplayUrl,
  SITE_DOMAIN,
  SITE_URL,
} from "@/context/BarberContext";
import { SubscriptionStatus } from "@/data/mockData";

export default function SuperAdminPage() {
  const {
    shops,
    globalBlacklist,
    removeFromBlacklist,
    addShop,
    toggleShopSubscription,
    updateShopSubscription,
    updateShopPinBySlug,
    updateShopDetails,
    deleteShop,
    masterPin,
    updateMasterPin,
  } = useBarber();

  // MASTER PIN AUTHENTICATION STATE
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("vip_barber_super_admin_unlocked") === "1") {
        setIsUnlocked(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [newMasterPinInput, setNewMasterPinInput] = useState<string>("");
  const [showPinChange, setShowPinChange] = useState<boolean>(false);

  // Shop Admin PIN Editing state
  const [editingShopPinSlug, setEditingShopPinSlug] = useState<string | null>(null);
  const [editingPinValue, setEditingPinValue] = useState<string>("");

  // Shop Subscription End Date Editing state
  const [editingEndDateSlug, setEditingEndDateSlug] = useState<string | null>(null);
  const [editingEndDateValue, setEditingEndDateValue] = useState<string>("");

  const [newShopName, setNewShopName] = useState<string>("");
  const [newShopSlug, setNewShopSlug] = useState<string>("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState<boolean>(false);
  const [newShopPhone, setNewShopPhone] = useState<string>("0532 800 50 60");
  const [newShopDistrict, setNewShopDistrict] = useState<string>(
    "Beşiktaş, İstanbul"
  );
  const [newShopFee, setNewShopFee] = useState<string>("1000");
  const [newShopPin, setNewShopPin] = useState<string>("1234");
  const [newShopEndDate, setNewShopEndDate] = useState<string>("30 Kasım 2026");

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    subtitle: string;
    type: "success" | "warning";
  } | null>(null);

  // Edit Shop Details Modal State (İsim, Telefon, İlçe, Ciro/Ücret vb.)
  const [editShopModal, setEditShopModal] = useState<{
    isOpen: boolean;
    slug: string;
    name: string;
    phone: string;
    district: string;
    monthlyFee: number;
    subtitle: string;
  } | null>(null);

  const handleOpenEditShopModal = (shop: (typeof shops)[0]) => {
    setEditShopModal({
      isOpen: true,
      slug: shop.slug,
      name: shop.name,
      phone: shop.phone,
      district: shop.district,
      monthlyFee: shop.monthlyFee,
      subtitle: shop.subtitle || "",
    });
  };

  const handleCloseEditShopModal = () => {
    setEditShopModal(null);
  };

  const handleSaveShopDetails = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editShopModal) return;

    const trimmedName = editShopModal.name.trim();
    const trimmedPhone = editShopModal.phone.trim();
    const trimmedDistrict = editShopModal.district.trim();

    if (!trimmedName) {
      showToast("Eksik Bilgi", "Berber / Dükkan adı boş bırakılamaz.", "warning");
      return;
    }
    if (!trimmedPhone) {
      showToast("Eksik Bilgi", "İletişim telefon numarası boş bırakılamaz.", "warning");
      return;
    }

    updateShopDetails(editShopModal.slug, {
      name: trimmedName,
      phone: trimmedPhone,
      district: trimmedDistrict || "İstanbul",
      monthlyFee: Number(editShopModal.monthlyFee) || 0,
      subtitle: editShopModal.subtitle.trim(),
    });

    showToast(
      "Dükkan Bilgileri Güncellendi",
      `${trimmedName} dükkanının bilgileri (telefon, konum, aylık ücret) başarıyla güncellendi.`,
      "success"
    );
    setEditShopModal(null);
  };

  // Delete Shop Confirmation Modal State
  const [deleteShopModal, setDeleteShopModal] = useState<{
    isOpen: boolean;
    slug: string;
    name: string;
  }>({ isOpen: false, slug: "", name: "" });

  const closeDeleteShopModal = () =>
    setDeleteShopModal({ isOpen: false, slug: "", name: "" });

  const handleConfirmDeleteShop = () => {
    if (!deleteShopModal.slug) return;
    const { slug, name } = deleteShopModal;
    deleteShop(slug);
    closeDeleteShopModal();
    if (editingShopPinSlug === slug) setEditingShopPinSlug(null);
    showToast(
      `${name} Silindi`,
      `/?shop=${slug} dükkanı ve tüm verileri sistemden kalıcı olarak kaldırıldı. Yönetim paneli artık erişilemez.`,
      "warning"
    );
  };

  // Blacklist Removal Confirmation Modal State
  const [removeBlacklistModal, setRemoveBlacklistModal] = useState<{
    isOpen: boolean;
    phone: string;
    customerName: string;
  }>({
    isOpen: false,
    phone: "",
    customerName: "",
  });

  const handleOpenRemoveBlacklistModal = (phone: string, customerName: string) => {
    setRemoveBlacklistModal({
      isOpen: true,
      phone,
      customerName,
    });
  };

  const handleConfirmRemoveBlacklist = () => {
    if (!removeBlacklistModal.phone) return;
    removeFromBlacklist(removeBlacklistModal.phone);
    const targetName = removeBlacklistModal.customerName || removeBlacklistModal.phone;
    setRemoveBlacklistModal({ isOpen: false, phone: "", customerName: "" });
    showToast(
      "Kara Listeden Çıkarıldı",
      `${targetName} Ortak Kara Liste Ağında affedildi ve tüm sistem genelinde kaldırıldı.`,
      "success"
    );
  };

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
      try {
        sessionStorage.setItem("vip_barber_super_admin_unlocked", "1");
      } catch {
        // ignore
      }
      setPinError("");
      setPinInput("");
    } else {
      setPinError("Hatalı Master PIN kodu! Lütfen tekrar deneyin.");
    }
  };

  const handleLogoutMaster = () => {
    try {
      sessionStorage.removeItem("vip_barber_super_admin_unlocked");
    } catch {
      // ignore
    }
    setIsUnlocked(false);
  };

  const handleSaveShopPin = (slug: string, shopName: string) => {
    if (!editingPinValue.trim()) return;
    updateShopPinBySlug(slug, editingPinValue.trim());
    setEditingShopPinSlug(null);
    setEditingPinValue("");
    showToast(
      `${shopName} Yönetim Şifresi Güncellendi`,
      `Dükkan için yeni giriş şifresi '${editingPinValue.trim()}' olarak kaydedildi.`,
      "success"
    );
  };

  const handleSaveShopEndDate = (
    slug: string,
    shopName: string,
    currentStatus: SubscriptionStatus
  ) => {
    if (!editingEndDateValue.trim()) return;
    updateShopSubscription(slug, currentStatus, editingEndDateValue.trim());
    setEditingEndDateSlug(null);
    setEditingEndDateValue("");
    showToast(
      `${shopName} Abonelik Bitiş Tarihi Güncellendi`,
      `Bitiş tarihi '${editingEndDateValue.trim()}' olarak kaydedildi.`,
      "success"
    );
  };

  const handleStatusSelect = (
    slug: string,
    shopName: string,
    nextStatus: SubscriptionStatus,
    currentEndDate?: string
  ) => {
    const nextEndDate =
      nextStatus === "active"
        ? currentEndDate && currentEndDate !== "Süresi Doldu"
          ? currentEndDate
          : "30 Gün Sonra"
        : currentEndDate || "Süresi Doldu";

    updateShopSubscription(slug, nextStatus, nextEndDate);
    showToast(
      nextStatus === "active"
        ? `${shopName} Aboneliği Aktif Edildi`
        : `${shopName} Aboneliği Süresi Doldu Olarak İşaretlendi`,
      nextStatus === "active"
        ? `Dükkan aboneliği aktif duruma alındı ve berber panelindeki uyarı kaldırıldı.`
        : `Berber panelinin en üstünde esnaf dostu uyarı bandı aktif edildi. İşlemler kesintisiz devam eder.`,
      nextStatus === "active" ? "success" : "warning"
    );
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
  const expiredShops = shops.filter(
    (s) => s.subscriptionStatus === "expired" || s.subscriptionStatus === "suspended"
  );
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
      adminPin: newShopPin.trim() || "1234",
      subscriptionEndDate: newShopEndDate.trim() || "30 Gün Sonra",
    });

    showToast(
      `Yeni Berber Dükkanı Oluşturuldu: ${created.name}`,
      `Özel Link: /?shop=${created.slug} — Yönetim Şifresi: ${created.adminPin} ile izole olarak kuruldu!`,
      "success"
    );

    setNewShopName("");
    setNewShopSlug("");
    setSlugManuallyEdited(false);
    setNewShopFee("1000");
    setNewShopPin("1234");
  };

  const handleCopyShopUrl = (slug: string) => {
    const url = getShopBookingUrl(slug);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopiedSlug(slug);
    showToast(
      "Randevu Linki Kopyalandı",
      `${url} adresi panoya kopyalandı.`,
      "success"
    );
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  // MASTER PIN GUARD SCREEN (/super-admin)
  if (!isUnlocked) {
    return (
      <div className="relative mx-auto max-w-md px-3 pb-20 pt-6 sm:px-6 sm:pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 left-1/2 -z-10 h-64 w-full max-w-lg -translate-x-1/2 rounded-full bg-gradient-to-r from-[#b47b48]/25 via-[#c88a53]/20 to-[#9a6334]/25 blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="overflow-hidden rounded-2xl border border-[#e6ccb2]/50 bg-gradient-to-b from-[#241b16] via-[#1c1613] to-[#14100d] p-4 shadow-2xl shadow-black/80 sm:rounded-3xl sm:p-7"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e6ccb2]/50 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/30 sm:h-16 sm:w-16">
            <Crown className="h-6 w-6 stroke-[2.3] sm:h-8 sm:w-8" />
          </div>

          <div className="mt-3 text-center sm:mt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6ccb2]/40 bg-[#c88a53]/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#e6ccb2] sm:px-3 sm:text-[11px]">
              <Lock className="h-3 w-3 text-[#c88a53]" />
              YAZILIM SAHİBİ GÜVENLİK KALKANI
            </span>
            <h1 className="mt-2 text-lg font-extrabold text-[#fdf8f5] sm:mt-2.5 sm:text-2xl">
              SaaS Kurucu (Master) Girişi
            </h1>
            <p className="mt-1 text-[11px] leading-relaxed text-[#e6ccb2]/75 sm:text-xs">
              Tüm berber dükkanlarını, aylık abonelikleri ve Ortak Kara Liste
              Ağını yönetmek için Master PIN kodunu giriniz.
            </p>
          </div>

          <form onSubmit={handleVerifyMasterPin} className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#e6ccb2]">
                Master PIN Kodu
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
                placeholder=""
                className="w-full rounded-xl border border-[#c88a53]/45 bg-[#14100d] py-2.5 text-center font-mono text-xl font-black tracking-[0.45em] text-[#fdf8f5] placeholder-[#e6ccb2]/30 outline-none focus:border-[#e6ccb2] sm:rounded-2xl sm:py-3.5 sm:text-2xl"
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
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-2.5 text-center text-xs font-bold text-rose-300">
                {pinError}
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3 text-xs font-black uppercase tracking-wider text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110 sm:rounded-2xl sm:py-3.5"
            >
              <KeyRound className="h-4 w-4 stroke-[2.5]" />
              <span>Master Komuta Merkezini Aç</span>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl px-3 pb-24 pt-3 sm:px-6 sm:pb-28 sm:pt-8">
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
            className={`mb-4 flex items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-2xl sm:mb-6 sm:p-4 ${
              toast.type === "warning"
                ? "border-rose-500/50 bg-[#261414] text-rose-200"
                : "border-[#e6ccb2]/50 bg-[#241b16] text-[#fdf8f5] shadow-[#c88a53]/20"
            }`}
          >
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${
                  toast.type === "warning"
                    ? "bg-rose-500 text-white"
                    : "bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b]"
                }`}
              >
                {toast.type === "warning" ? (
                  <Ban className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#fdf8f5] sm:text-sm">
                  {toast.title}
                </h4>
                <p className="mt-0.5 text-[11px] text-[#e6ccb2]/85 sm:text-xs">
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
      <div className="mb-4 flex flex-col justify-between gap-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/50 bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-200 shadow-sm sm:px-3 sm:text-[11px]">
              <Crown className="h-3 w-3 text-purple-300 sm:h-3.5 sm:w-3.5" />
              SÜPER ADMİN KOMUTA MERKEZİ (/super-admin)
            </span>
          </div>
          <h1 className="mt-1.5 text-lg font-extrabold tracking-tight text-[#fdf8f5] sm:mt-2 sm:text-3xl">
            Berber Dükkanları, Abonelikler &{" "}
            <span className="bg-gradient-to-r from-[#e6ccb2] via-[#c88a53] to-[#b47b48] bg-clip-text text-transparent">
              Ortak Kara Liste Ağı
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowPinChange((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-400/35 bg-purple-500/10 px-2.5 py-1.5 text-[11px] font-bold text-purple-200 transition hover:border-purple-400 hover:bg-purple-500/20 sm:px-3 sm:py-2 sm:text-xs"
          >
            <KeyRound className="h-3.5 w-3.5 text-purple-300" />
            <span>Master PIN: {masterPin}</span>
          </button>

          <button
            type="button"
            onClick={handleLogoutMaster}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/20 sm:px-3 sm:py-2 sm:text-xs"
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
            className="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-purple-400/40 bg-[#161311] p-3.5 sm:mb-6 sm:p-4"
          >
            <div className="flex items-center gap-2 text-xs text-stone-300">
              <KeyRound className="h-4 w-4 text-purple-400" />
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
                className="w-36 rounded-xl border border-white/15 bg-[#110f0d] px-3 py-1.5 font-mono text-xs font-bold text-[#fdf8f5] outline-none focus:border-purple-400 sm:w-40 sm:py-2"
              />
              <button
                type="submit"
                className="rounded-xl border border-purple-400/50 bg-gradient-to-r from-purple-500 to-indigo-500 px-3.5 py-1.5 text-xs font-black text-white sm:px-4 sm:py-2"
              >
                Kaydet
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* TOP SAAS REVENUE & NETWORK METRICS — COMPACT 3-COLUMN ON MOBILE */}
      <section aria-label="SaaS Gelir Özeti" className="mb-5 sm:mb-8">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-950/25 via-[#161412] to-[#12100e] p-2.5 shadow-lg transition hover:border-sky-400/60 sm:rounded-2xl sm:p-5">
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[10px] font-bold uppercase tracking-wider text-sky-200 sm:text-xs">
                Aktif Dükkan
              </span>
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/35 sm:flex">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-1 sm:mt-3 sm:gap-2.5">
              <span className="text-sm font-black tracking-tight text-[#fdf8f5] sm:text-3xl">
                {activeShops.length} Aktif
              </span>
              {expiredShops.length > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-500/40 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-300 sm:px-2 sm:text-[11px]">
                  {expiredShops.length} Doldu
                </span>
              )}
            </div>
            <p className="mt-2 hidden text-xs text-stone-400 sm:block">
              {expiredShops.length > 0
                ? `${expiredShops.length} dükkanın süresi doldu (esnaf panellerinde nazik uyarı devrede)`
                : "Tüm kayıtlı berberlerin abonelikleri aktif ve güncel"}
            </p>
          </div>

          <div className="rounded-xl border border-[#e6ccb2]/45 bg-gradient-to-br from-[#2c2018] via-[#1c1613] to-[#14100d] p-2.5 shadow-lg shadow-[#c88a53]/25 transition hover:border-[#e6ccb2]/75 sm:rounded-2xl sm:p-5">
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[10px] font-bold uppercase tracking-wider text-[#e6ccb2] sm:text-xs">
                Aylık Ciro (MRR)
              </span>
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] sm:flex">
                <TrendingUp className="h-5 w-5 stroke-[2.5]" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1 sm:mt-3 sm:gap-2">
              <span className="bg-gradient-to-r from-[#fdf8f5] via-[#e6ccb2] to-[#c88a53] bg-clip-text text-sm font-black tracking-tight text-transparent sm:text-3xl">
                {totalMRR.toLocaleString("tr-TR")} TL
              </span>
              <span className="hidden text-xs font-bold text-[#c88a53] sm:inline">/ Ay</span>
            </div>
            <p className="mt-2 hidden text-xs text-stone-400 sm:block">
              Aktif aboneliklerden elde edilen aylık net SaaS yazılım geliri
            </p>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-950/25 via-[#161412] to-[#12100e] p-2.5 shadow-lg transition hover:border-rose-500/60 sm:rounded-2xl sm:p-5">
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[10px] font-bold uppercase tracking-wider text-rose-200 sm:text-xs">
                Ortak Kara Liste
              </span>
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30 sm:flex">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-1 sm:mt-3 sm:gap-2.5">
              <span className="text-sm font-black tracking-tight text-[#fdf8f5] sm:text-3xl">
                {globalBlacklist.length} Numara
              </span>
              <span className="hidden rounded-md border border-rose-500/35 bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-300 sm:inline-block">
                Global Shield
              </span>
            </div>
            <p className="mt-2 hidden text-xs text-stone-400 sm:block">
              Tüm üye berber dükkanlarını ortak koruyan gerçek zamanlı kara liste ağı
            </p>
          </div>
        </div>
      </section>

      {/* MAIN GRID: TENANT SHOPS LIST (Left 2 cols) + ADD NEW SHOP FORM (Right 1 col) */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Registered Barber Shops */}
        <div className="space-y-3.5 sm:space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#161311] p-3.5 sm:p-4">
            <div>
              <h2 className="text-sm font-extrabold text-[#fdf8f5] sm:text-base">
                Kayıtlı Berber Dükkanları ({shops.length})
              </h2>
              <p className="text-[11px] text-stone-400 sm:text-xs">
                Her dükkan kendi özel linki, koltukları, şifresi ve fiyatlarıyla %100 izole çalışır.
              </p>
            </div>
            <span className="rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300 sm:px-2.5 sm:py-1 sm:text-xs">
              Tam İzolasyon Aktif
            </span>
          </div>

          <div className="space-y-3.5 sm:space-y-4">
            {shops.map((shop) => {
              const isActive = shop.subscriptionStatus === "active";
              const isExpired =
                shop.subscriptionStatus === "expired" ||
                shop.subscriptionStatus === "suspended";
              const isCopied = copiedSlug === shop.slug;

              return (
                <motion.div
                  key={shop.slug}
                  layout
                  className={`rounded-2xl border p-3.5 transition-all sm:p-5 ${
                    isActive
                      ? "border-white/10 bg-[#161311] shadow-lg hover:border-white/25"
                      : "border-red-500/60 bg-gradient-to-br from-[#2a1210] via-[#1e1210] to-[#14100d] shadow-lg shadow-red-950/30"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-base font-black ${
                          isActive
                            ? "border-[#e6ccb2]/50 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-md shadow-[#c88a53]/20"
                            : "border-red-500/60 bg-gradient-to-br from-red-500/25 to-amber-500/20 text-amber-300 shadow-md shadow-red-950/40"
                        }`}
                      >
                        <Scissors className="h-6 w-6 -rotate-45" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-extrabold text-[#fdf8f5]">
                            {shop.name}
                          </h3>

                          {/* BERBER İSMİNİN HEMEN YANINDA: BİLGİLERİ DÜZENLE BUTONU */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditShopModal(shop)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6ccb2]/35 bg-[#251a14] px-2.5 py-1 text-xs font-bold text-[#e6ccb2] transition hover:border-[#c88a53] hover:bg-[#32231b] hover:text-white"
                            title="Berber Bilgilerini Düzenle (Telefon, İsim, Konum, Aylık Ücret)"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-[#c88a53]" />
                            <span>Bilgileri Düzenle</span>
                          </button>

                          {/* DİKKAT ÇEKİCİ ABONELİK DURUM ROZETİ */}
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Abonelik: Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-red-500/80 bg-gradient-to-r from-red-600/35 via-orange-500/30 to-amber-500/35 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-200 shadow-md shadow-red-950/50 animate-pulse">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                              SÜRESİ DOLDU • YENİLEME BEKLENİYOR
                            </span>
                          )}
                        </div>

                        {/* İLETİŞİM VE DÜKKAN METRİKLERİ */}
                        <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-stone-300">
                          <button
                            type="button"
                            onClick={() => handleCopyShopUrl(shop.slug)}
                            className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 font-mono text-xs font-bold text-sky-300 transition hover:border-sky-400"
                            title="Müşteri Randevu Linkini Kopyala"
                          >
                            <Link2 className="h-3 w-3 text-sky-400" />
                            <span>{getShopDisplayUrl(shop.slug)}</span>
                            {isCopied ? (
                              <Check className="ml-1 h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="ml-1 h-3 w-3 opacity-60" />
                            )}
                          </button>

                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-sky-400" />
                            {shop.district}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-emerald-400" />
                            {shop.phone}
                          </span>
                          <span className="rounded-lg border border-white/10 bg-[#110f0d] px-2 py-0.5 text-[11px] text-stone-300">
                            <Armchair className="mr-1 inline h-3 w-3 text-sky-400" />
                            {shop.barbers.length} Koltuk
                          </span>
                          <span className="rounded-lg border border-white/10 bg-[#110f0d] px-2 py-0.5 text-[11px] text-stone-300">
                            <Scissors className="mr-1 inline h-3 w-3 text-[#c88a53]" />
                            {shop.services.length} Hizmet
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row items-center justify-between border-t border-white/10 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                      <div className="text-right">
                        <span className="bg-gradient-to-r from-[#fdf8f5] to-[#c88a53] bg-clip-text text-xl font-black text-transparent">
                          {shop.monthlyFee.toLocaleString("tr-TR")} TL
                        </span>
                        <span className="block text-[11px] font-semibold text-stone-400">
                          Aylık SaaS Paketi
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SÜPER ADMİN DÜKKAN YETKİ PANELİ: 1) AÇIK YÖNETİM ŞİFRESİ, 2) ABONELİK DURUMU SEÇİMİ, 3) BİTİŞ TARİHİ ATAMA */}
                  <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-[#110f0d] p-3.5 sm:grid-cols-3">
                    {/* 1. YÖNETİM ŞİFRESİ (DÜZ METİN & DÜZENLENEBİLİR) */}
                    <div className="flex flex-col justify-between rounded-xl border border-purple-500/30 bg-purple-950/15 p-2.5">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-300">
                        <KeyRound className="h-3.5 w-3.5 text-purple-400" />
                        Dükkan Yönetim Şifresi
                      </span>
                      {editingShopPinSlug === shop.slug ? (
                        <div className="mt-2 flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={16}
                            value={editingPinValue}
                            onChange={(e) => setEditingPinValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveShopPin(shop.slug, shop.name);
                              }
                            }}
                            className="w-full rounded-lg border border-purple-400 bg-[#1c1613] px-2.5 py-1 font-mono text-xs font-black text-[#fdf8f5] outline-none"
                            placeholder="Yeni şifre..."
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveShopPin(shop.slug, shop.name)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-black text-[#14100d] hover:bg-emerald-400"
                          >
                            <Save className="h-3 w-3 stroke-[2.5]" />
                            <span>Kaydet</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingShopPinSlug(null)}
                            className="rounded-lg px-1.5 py-1 text-xs text-stone-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="rounded-lg border border-purple-400/40 bg-purple-500/20 px-2.5 py-1 font-mono text-sm font-black tracking-wider text-white">
                            {shop.adminPin || "1234"}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingShopPinSlug(shop.slug);
                              setEditingPinValue(shop.adminPin || "1234");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-purple-400/35 bg-purple-500/15 px-2.5 py-1 text-[11px] font-bold text-purple-200 transition hover:border-purple-400 hover:bg-purple-500/25 hover:text-white"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Düzenle</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 2. ABONELİK DURUMU SEÇİMİ (AKTİF / SÜRESİ DOLDU) */}
                    <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#161311] p-2.5">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-300">
                        <Power className="h-3.5 w-3.5 text-[#c88a53]" />
                        Abonelik Durumu Seç
                      </span>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusSelect(
                              shop.slug,
                              shop.name,
                              "active",
                              shop.subscriptionEndDate
                            )
                          }
                          className={`flex items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-extrabold transition ${
                            isActive
                              ? "border-emerald-400 bg-emerald-500 text-[#0c1410] shadow-sm"
                              : "border-white/10 bg-[#110f0d] text-stone-400 hover:border-emerald-500/40 hover:text-emerald-300"
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Aktif</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusSelect(
                              shop.slug,
                              shop.name,
                              "expired",
                              shop.subscriptionEndDate
                            )
                          }
                          className={`flex items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-extrabold transition ${
                            isExpired
                              ? "border-red-400 bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-sm"
                              : "border-white/10 bg-[#110f0d] text-stone-400 hover:border-amber-500/40 hover:text-amber-300"
                          }`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Süresi Doldu</span>
                        </button>
                      </div>
                    </div>

                    {/* 3. ABONELİK BİTİŞ TARİHİ ATAMA / DÜZENLEME */}
                    <div className="flex flex-col justify-between rounded-xl border border-sky-500/25 bg-sky-950/10 p-2.5">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-300">
                        <CalendarDays className="h-3.5 w-3.5 text-sky-400" />
                        Abonelik Bitiş Tarihi
                      </span>
                      {editingEndDateSlug === shop.slug ? (
                        <div className="mt-2 flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingEndDateValue}
                            onChange={(e) => setEditingEndDateValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveShopEndDate(
                                  shop.slug,
                                  shop.name,
                                  shop.subscriptionStatus
                                );
                              }
                            }}
                            placeholder="Örn: 30 Aralık 2026"
                            className="w-full rounded-lg border border-sky-400 bg-[#1c1613] px-2.5 py-1 text-xs font-bold text-[#fdf8f5] outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveShopEndDate(
                                shop.slug,
                                shop.name,
                                shop.subscriptionStatus
                              )
                            }
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-black text-[#14100d] hover:bg-emerald-400"
                          >
                            <Save className="h-3 w-3 stroke-[2.5]" />
                            <span>Kaydet</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingEndDateSlug(null)}
                            className="rounded-lg px-1.5 py-1 text-xs text-stone-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-xs font-extrabold ${
                              isExpired ? "text-amber-300" : "text-[#fdf8f5]"
                            }`}
                          >
                            {shop.subscriptionEndDate ||
                              (isActive ? "30 Gün Sonra" : "Süresi Doldu")}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEndDateSlug(shop.slug);
                              setEditingEndDateValue(
                                shop.subscriptionEndDate || "30 Aralık 2026"
                              );
                            }}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-400/35 bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-200 transition hover:border-sky-400 hover:bg-sky-500/25 hover:text-white"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Tarih Ata</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons on Each Shop Card */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-white/10 pt-4">
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
                        className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-500/10 px-3.5 py-2.5 text-xs font-extrabold text-sky-200 transition hover:border-sky-300 hover:bg-sky-500/20 hover:text-white"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5 text-sky-400" />
                        <span>Berberin Admin Paneline Gir</span>
                      </Link>
                    </div>

                    {/* Delete Shop Button */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteShopModal({
                            isOpen: true,
                            slug: shop.slug,
                            name: shop.name,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-600/50 bg-rose-950/40 px-3.5 py-2.5 text-xs font-extrabold text-rose-300 transition hover:bg-rose-600 hover:text-white"
                        title="Dükkanı ve tüm verilerini kalıcı olarak sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Dükkanı Sil / Hesabı Kapat</span>
                      </button>
                    </div>
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
              {globalBlacklist.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-[#e6ccb2]/50">
                  Ortak Kara Liste Ağında kayıtlı numara bulunmuyor.
                </div>
              ) : (
                globalBlacklist.map((entry, idx) => (
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
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="font-bold text-[#fdf8f5]">{entry.name}</p>
                      {entry.requiredDeposit ? (
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                          {entry.requiredDeposit} TL Kapora
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#e6ccb2]/65">
                      {entry.missedDate} • {entry.missedService}
                    </p>
                    <div className="mt-3 flex justify-end border-t border-[#c88a53]/15 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenRemoveBlacklistModal(entry.phone, entry.name)
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/20"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Kara Listeden Çıkar (Affet)</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
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
                  {SITE_DOMAIN}/{newShopSlug || "efe-berber"}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-purple-300">
                  Yönetim Şifresi *
                </label>
                <input
                  type="text"
                  required
                  value={newShopPin}
                  onChange={(e) => setNewShopPin(e.target.value)}
                  placeholder="Özel Şifre Belirle"
                  className="w-full rounded-xl border border-purple-400/40 bg-[#14100d] px-3 py-2.5 font-mono text-xs font-black text-[#fdf8f5] outline-none focus:border-purple-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-sky-300">
                  Abonelik Bitiş Tarihi
                </label>
                <input
                  type="text"
                  value={newShopEndDate}
                  onChange={(e) => setNewShopEndDate(e.target.value)}
                  placeholder="30 Kasım 2026"
                  className="w-full rounded-xl border border-sky-400/40 bg-[#14100d] px-3 py-2.5 text-xs font-bold text-[#fdf8f5] outline-none focus:border-sky-400"
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
                oranları, 4 ana hizmet paketi, belirlediğiniz özel yönetim
                şifresi ve Ortak Kara Liste Kalkanı aktif olarak tanımlanır.
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

      {/* DÜKKAN SİLME / HESAP KAPATMA ONAY MODALI */}
      <AnimatePresence>
        {deleteShopModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDeleteShopModal}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/40 bg-[#1c1613] p-6 shadow-2xl shadow-rose-950/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/15 text-rose-400">
                  <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#fdf8f5]">
                    Dükkanı Sil / Hesabı Kapat
                  </h3>
                  <p className="text-xs text-rose-300/80">
                    Bu işlem geri alınamaz
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-950/20 p-3.5 text-xs text-[#e6ccb2]">
                <p className="font-semibold text-[#fdf8f5]">
                  Bu dükkanı ve tüm verilerini silmek istediğinize emin misiniz?
                </p>
                <div className="mt-2 space-y-1 text-[11px] text-[#e6ccb2]/80">
                  <p>
                    • <strong>Dükkan:</strong> {deleteShopModal.name}
                  </p>
                  <p>
                    • <strong>Link:</strong> {getShopDisplayUrl(deleteShopModal.slug)}
                  </p>
                </div>
                <p className="mt-2 text-[11px] text-rose-200/70">
                  Randevular, yedek liste, ustalar, hizmetler ve ayarlar kalıcı
                  olarak silinir. Müşteri vitrini ve berberin yönetim paneli
                  tamamen erişilemez hale gelir.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeDeleteShopModal}
                  className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-4 py-2.5 text-xs font-bold text-[#e6ccb2] transition hover:bg-[#251e19]"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteShop}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-900/30 transition hover:bg-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Evet, Kalıcı Olarak Sil</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KARA LİSTEDEN ÇIKARMA (AFFET) ONAY MODALI */}
      <AnimatePresence>
        {removeBlacklistModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() =>
                setRemoveBlacklistModal({
                  isOpen: false,
                  phone: "",
                  customerName: "",
                })
              }
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/40 bg-[#1c1613] p-6 shadow-2xl shadow-amber-950/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400">
                  <RotateCcw className="h-6 w-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#fdf8f5]">
                    Kara Listeden Çıkarma Onayı
                  </h3>
                  <p className="text-xs text-amber-300/80">
                    Süper Admin yetkisiyle global kara listeden silinir
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3.5 text-xs text-[#e6ccb2]">
                <p className="font-semibold text-[#fdf8f5]">
                  Bu müşteriyi Ortak Kara Liste Ağınden çıkarmak istediğinize emin misiniz?
                </p>
                <div className="mt-2 space-y-1 text-[11px] text-[#e6ccb2]/80">
                  <p>
                    • <strong>Müşteri:</strong> {removeBlacklistModal.customerName || "Kayıtlı Müşteri"}
                  </p>
                  <p>
                    • <strong>Telefon:</strong> {removeBlacklistModal.phone}
                  </p>
                </div>
                <p className="mt-2 text-[11px] text-amber-200/70">
                  Bu numara tüm berber dükkanlarının kara listesinden temizlenecek ve müşterinin No-Show randevuları normal statüye geri dönecektir.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setRemoveBlacklistModal({
                      isOpen: false,
                      phone: "",
                      customerName: "",
                    })
                  }
                  className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-4 py-2.5 text-xs font-bold text-[#e6ccb2] transition hover:bg-[#251e19]"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemoveBlacklist}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-600 px-4 py-2.5 text-xs font-bold text-[#14100d] shadow-lg shadow-amber-900/30 transition hover:bg-amber-500"
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Evet, Kara Listeden Çıkar</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BERBER BİLGİLERİ DÜZENLEME MODALI (SÜPER ADMİN) */}
      <AnimatePresence>
        {editShopModal?.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseEditShopModal}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#e6ccb2]/35 bg-[#1a1410] p-4 shadow-2xl shadow-[#c88a53]/20 sm:p-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b]">
                    <Edit2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#fdf8f5]">
                      Berber Bilgilerini Düzenle
                    </h3>
                    <p className="text-xs text-stone-400">
                      {SITE_DOMAIN}/{editShopModal.slug} için profil ve iletişim ayarları
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEditShopModal}
                  className="rounded-lg p-1 text-stone-400 hover:bg-white/5 hover:text-white"
                >
                  <span className="sr-only">Kapat</span>
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveShopDetails} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#e6ccb2]">
                    Berber / Salon Adı
                  </label>
                  <input
                    type="text"
                    required
                    value={editShopModal.name}
                    onChange={(e) =>
                      setEditShopModal((prev) =>
                        prev ? { ...prev, name: e.target.value } : null
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#120f0d] px-3.5 py-2.5 text-xs font-bold text-[#fdf8f5] focus:border-[#c88a53] focus:outline-none"
                    placeholder="Örn: Atelier Noir Beşiktaş"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-[#e6ccb2]">
                      Telefon Numarası
                    </label>
                    <div className="relative mt-1">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                      <input
                        type="tel"
                        required
                        value={editShopModal.phone}
                        onChange={(e) =>
                          setEditShopModal((prev) =>
                            prev ? { ...prev, phone: e.target.value } : null
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#120f0d] py-2.5 pl-9 pr-3 text-xs font-bold text-[#fdf8f5] focus:border-[#c88a53] focus:outline-none"
                        placeholder="0532 800 50 60"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#e6ccb2]">
                      İlçe / Konum
                    </label>
                    <div className="relative mt-1">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={editShopModal.district}
                        onChange={(e) =>
                          setEditShopModal((prev) =>
                            prev ? { ...prev, district: e.target.value } : null
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#120f0d] py-2.5 pl-9 pr-3 text-xs font-bold text-[#fdf8f5] focus:border-[#c88a53] focus:outline-none"
                        placeholder="Beşiktaş, İstanbul"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-[#e6ccb2]">
                      Aylık SaaS Ücreti (TL)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={editShopModal.monthlyFee}
                      onChange={(e) =>
                        setEditShopModal((prev) =>
                          prev
                            ? { ...prev, monthlyFee: Number(e.target.value) || 0 }
                            : null
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#120f0d] px-3.5 py-2.5 text-xs font-bold text-[#fdf8f5] focus:border-[#c88a53] focus:outline-none"
                      placeholder="1000"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#e6ccb2]">
                      Slogan / Alt Başlık
                    </label>
                    <input
                      type="text"
                      value={editShopModal.subtitle}
                      onChange={(e) =>
                        setEditShopModal((prev) =>
                          prev ? { ...prev, subtitle: e.target.value } : null
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#120f0d] px-3.5 py-2.5 text-xs font-bold text-[#fdf8f5] focus:border-[#c88a53] focus:outline-none"
                      placeholder="VIP Grooming & Gentlemen's Club"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-2.5 text-[11px] text-sky-200">
                  <span>
                    💡 <strong>Not:</strong> Bu bilgiler güncellendiğinde hem müşteri vitrini (<code>{getShopDisplayUrl(editShopModal.slug)}</code>) hem de esnafın yönetim paneli anında yeni bilgilerle senkronize olur.
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseEditShopModal}
                    className="rounded-xl border border-white/10 bg-[#14100d] px-4 py-2.5 text-xs font-bold text-stone-300 transition hover:bg-white/5"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-4 py-2.5 text-xs font-extrabold text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110"
                  >
                    <Save className="h-4 w-4" />
                    <span>Değişiklikleri Kaydet</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
