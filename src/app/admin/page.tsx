"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Users,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Scissors,
  Phone,
  BellRing,
  Crown,
  Plus,
  Filter,
  Check,
  Ban,
  Send,
  Settings,
  Calendar as CalendarIcon,
  Trash2,
  Edit3,
  Save,
  Coffee,
  CalendarOff,
  ExternalLink,
  X,
  UserPlus,
  Armchair,
  BadgeDollarSign,
  Copy,
  Share2,
  Lock,
  Unlock,
  PhoneCall,
  QrCode,
  AlertTriangle,
  RotateCcw,
  LogOut,
} from "lucide-react";
import { useBarber } from "@/context/BarberContext";
import AdminPinGate, { lockAdminSession } from "@/components/AdminPinGate";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import QuickBookingModal from "@/components/QuickBookingModal";
import QrPosterModal from "@/components/QrPosterModal";
import {
  Appointment,
  Barber,
  Service,
  TrustBadgeType,
  WEEKDAYS_TR,
} from "@/data/mockData";

type AdminTab = "appointments" | "barbers" | "services" | "schedule";

export default function AdminDashboardPage() {
  const {
    currentShop,
    currentShopSlug,
    appointments,
    waitlist,
    globalBlacklist,
    barbers,
    services,
    shopSettings,
    adminAlerts,
    stats,
    markAppointmentCompleted,
    markAppointmentNoShow,
    removeFromBlacklist,
    isPhoneBlacklisted,
    sendWhatsAppReminder,
    notifyWaitlistCustomer,
    addBarber,
    updateBarber,
    deleteBarber,
    getServicePriceForBarber,
    updateService,
    addService,
    deleteService,
    updateShopSettings,
    toggleClosedDay,
    updateCurrentShopDepositPolicy,
    getSlotsForDay,
    dismissAdminAlert,
    clearAllAdminAlerts,
    removeAppointmentOrBlock,
  } = useBarber();

  const [activeTab, setActiveTab] = useState<AdminTab>("appointments");
  const [isQuickModalOpen, setIsQuickModalOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    subtitle: string;
    type: "success" | "warning" | "whatsapp";
  } | null>(null);

  // Blacklist Confirmation & Deposit Modal State
  const [noShowConfirmModal, setNoShowConfirmModal] = useState<{
    isOpen: boolean;
    appointment: Appointment | null;
    depositAmount: number;
  }>({
    isOpen: false,
    appointment: null,
    depositAmount: 100,
  });

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

  // Barber / Employee & Chair Editing State
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null);
  const [editBarberName, setEditBarberName] = useState<string>("");
  const [editBarberRole, setEditBarberRole] = useState<string>("");
  const [editBarberChair, setEditBarberChair] = useState<string>("");
  const [editBarberExp, setEditBarberExp] = useState<string>("");
  const [editBarberBadge, setEditBarberBadge] = useState<string>("");
  const [editBarberPrices, setEditBarberPrices] = useState<
    Record<string, string>
  >({});

  // New Barber / Employee & Chair Creation State
  const [newBarberName, setNewBarberName] = useState<string>("");
  const [newBarberChair, setNewBarberChair] = useState<string>(
    "VIP Koltuk #4 (Platinum)"
  );
  const [newBarberRole, setNewBarberRole] = useState<string>(
    "Senior Barber & Stilist"
  );
  const [newBarberExp, setNewBarberExp] = useState<string>("10 Yıl Deneyim");
  const [newBarberBadge, setNewBarberBadge] = useState<string>(
    "VIP Uzman • Özel Tarife"
  );
  const [newBarberSpecs, setNewBarberSpecs] = useState<string>(
    "Anatomik Kesim, Skin Fade, Sakal Tasarımı"
  );
  const [newBarberPrices, setNewBarberPrices] = useState<
    Record<string, string>
  >({});

  // Service Editing & Creation State
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [editPrice, setEditPrice] = useState<number>(400);
  const [editDuration, setEditDuration] = useState<number>(30);

  const [newServiceName, setNewServiceName] = useState<string>("");
  const [newServiceDesc, setNewServiceDesc] = useState<string>("");
  const [newServicePrice, setNewServicePrice] = useState<string>("350");
  const [newServiceDuration, setNewServiceDuration] = useState<string>("30");
  const [newServiceVip, setNewServiceVip] = useState<boolean>(false);

  // Reset editing states when switching shop slug
  useEffect(() => {
    setEditingBarberId(null);
    setEditingServiceId(null);
    setBannerDismissed(false);
  }, [currentShopSlug, currentShop.subscriptionStatus]);

  const triggerToast = (
    title: string,
    subtitle: string,
    type: "success" | "warning" | "whatsapp"
  ) => {
    setToastMessage({ title, subtitle, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.title === title ? null : prev));
    }, 5000);
  };

  const handleCopyBookingLink = () => {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/?shop=${currentShop.slug}`
        : `http://localhost:3000/?shop=${currentShop.slug}`;
    navigator.clipboard?.writeText(shareUrl);
    setCopiedShareLink(true);
    triggerToast(
      "Instagram / WhatsApp Randevu Linki Kopyalandı!",
      `${shareUrl} linkini biyografinize veya WhatsApp otomatik mesajınıza yapıştırabilirsiniz.`,
      "success"
    );
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  const handleComplete = (apt: Appointment) => {
    markAppointmentCompleted(apt.id);
    triggerToast(
      `${apt.customerName} Randevusu Tamamlandı`,
      `${apt.totalPrice} TL tahsilat ${currentShop.name} kasasına kaydedildi.`,
      "success"
    );
  };

  const handleOpenNoShowModal = (apt: Appointment) => {
    setNoShowConfirmModal({
      isOpen: true,
      appointment: apt,
      depositAmount: currentShop.depositAmount || 100,
    });
  };

  const handleConfirmNoShow = () => {
    if (!noShowConfirmModal.appointment) return;
    const apt = noShowConfirmModal.appointment;
    const deposit = Number(noShowConfirmModal.depositAmount) || 100;
    const result = markAppointmentNoShow(apt.id, deposit);
    setNoShowConfirmModal({ isOpen: false, appointment: null, depositAmount: 100 });

    if (result.notifiedWaitlist) {
      triggerToast(
        `Ortak Kara Listeye Eklendi & Yedek Liste Devreye Girdi!`,
        `${apt.customerName} (${apt.customerPhone}) Ortak Güvenlik Ağına (${deposit} TL kapora şartıyla) eklendi. Yedek listedeki ${result.notifiedWaitlist.customerName} adlı müşteriye otomatik WhatsApp daveti gönderildi!`,
        "warning"
      );
    } else {
      triggerToast(
        `${apt.customerName} Ortak Kara Liste Ağına Alındı (No-Show)`,
        `${apt.customerPhone} numarası artık tüm dükkanlarda ${deposit} TL kapora şartıyla kara listede!`,
        "warning"
      );
    }
  };

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
    triggerToast(
      "Kara Listeden Çıkarıldı",
      `${targetName} başarıyla kara listeden kaldırıldı ve randevu durumu düzeltildi.`,
      "success"
    );
  };

  const handleSendReminder = (apt: Appointment) => {
    sendWhatsAppReminder(apt.id);
    triggerToast(
      `WhatsApp Hatırlatma Gönderildi`,
      `${apt.customerName} (${apt.customerPhone}) numarasına ${currentShop.name} saat ${apt.time} randevusu için onay mesajı iletildi.`,
      "whatsapp"
    );
  };

  // Start editing a barber & their custom prices
  const startEditBarber = (b: Barber) => {
    setEditingBarberId(b.id);
    setEditBarberName(b.name);
    setEditBarberRole(b.role);
    setEditBarberChair(b.chairName);
    setEditBarberExp(b.experience);
    setEditBarberBadge(b.badge || "");
    const priceMap: Record<string, string> = {};
    services.forEach((srv) => {
      const customVal = b.customPrices?.[srv.id];
      priceMap[srv.id] =
        customVal !== undefined ? String(customVal) : String(srv.price);
    });
    setEditBarberPrices(priceMap);
  };

  // Save edited barber & custom prices
  const handleSaveBarber = (b: Barber) => {
    if (!editBarberName.trim()) return;
    const cleanedCustomPrices: Record<string, number> = {};
    services.forEach((srv) => {
      const raw = editBarberPrices[srv.id];
      if (raw !== undefined && raw.trim() !== "") {
        const num = Number(raw);
        if (!Number.isNaN(num) && num > 0 && num !== srv.price) {
          cleanedCustomPrices[srv.id] = num;
        }
      }
    });

    const words = editBarberName.trim().split(" ");
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
        : editBarberName.trim().slice(0, 2).toUpperCase();

    updateBarber(b.id, {
      name: editBarberName.trim(),
      role: editBarberRole.trim(),
      chairName: editBarberChair.trim(),
      experience: editBarberExp.trim(),
      badge: editBarberBadge.trim() || undefined,
      initials: b.isAnyOption ? "VIP" : initials,
      customPrices: cleanedCustomPrices,
    });

    setEditingBarberId(null);
    triggerToast(
      `Çalışan, Koltuk & Özel Fiyatlar Güncellendi (${currentShop.name})`,
      `${editBarberName} (${editBarberChair}) bilgileri yalnızca ${currentShop.name} vitrinine kaydedildi.`,
      "success"
    );
  };

  // Create a new barber / employee & chair with custom prices
  const handleCreateBarber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarberName.trim() || !newBarberChair.trim()) return;

    const customPrices: Record<string, number> = {};
    services.forEach((srv) => {
      const raw = newBarberPrices[srv.id];
      if (raw !== undefined && raw.trim() !== "") {
        const num = Number(raw);
        if (!Number.isNaN(num) && num > 0 && num !== srv.price) {
          customPrices[srv.id] = num;
        }
      }
    });

    const words = newBarberName.trim().split(" ");
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
        : newBarberName.trim().slice(0, 2).toUpperCase();

    const specsArray = newBarberSpecs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    addBarber({
      name: newBarberName.trim(),
      role: newBarberRole.trim() || "VIP Barber & Stilist",
      chairName: newBarberChair.trim(),
      rating: 4.95,
      reviewCount: 120,
      experience: newBarberExp.trim() || "8 Yıl Deneyim",
      earliestSlot: newBarberChair.trim(),
      specialties:
        specsArray.length > 0 ? specsArray : ["Anatomik Kesim", "VIP Bakım"],
      badge: newBarberBadge.trim() || "VIP Uzman",
      avatarGradient: "from-[#3b281c] via-[#261a12] to-[#14100d]",
      initials,
      commissionRate: 50,
      customPrices,
    });

    triggerToast(
      `Yeni Çalışan ve Koltuk Eklendi (${currentShop.name})`,
      `${newBarberName} (${newBarberChair}) kişiye özel fiyat tarifesiyle sadece ${currentShop.name} vitrinine eklendi.`,
      "success"
    );

    setNewBarberName("");
    setNewBarberChair(`VIP Koltuk #${barbers.length + 1}`);
    setNewBarberPrices({});
  };

  // Start editing a service
  const startEditService = (srv: Service) => {
    setEditingServiceId(srv.id);
    setEditName(srv.name);
    setEditDesc(srv.description);
    setEditPrice(srv.price);
    setEditDuration(srv.duration);
  };

  // Save edited service
  const handleSaveService = (id: string) => {
    if (!editName.trim()) return;
    updateService(id, {
      name: editName.trim(),
      description: editDesc.trim(),
      price: Math.max(0, Number(editPrice) || 0),
      duration: Math.max(5, Number(editDuration) || 15),
    });
    setEditingServiceId(null);
    triggerToast(
      `Hizmet & Fiyat Güncellendi (${currentShop.name})`,
      `${editName} (${editPrice} TL / ${editDuration} dk) sadece ${currentShop.name} vitrininde güncellendi.`,
      "success"
    );
  };

  // Add a new service
  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    const priceNum = Math.max(0, Number(newServicePrice) || 300);
    const durNum = Math.max(5, Number(newServiceDuration) || 30);

    addService({
      name: newServiceName.trim(),
      description:
        newServiceDesc.trim() ||
        "Özel VIP bakım ve profesyonel şekillendirme hizmeti.",
      price: priceNum,
      duration: durNum,
      category: newServiceVip ? "package" : "hair",
      vip: newServiceVip,
      popular: !newServiceVip,
    });

    triggerToast(
      `Yeni Hizmet Eklendi (${currentShop.name})`,
      `${newServiceName} (${priceNum} TL / ${durNum} dk) ${currentShop.name} müşteri vitrinine eklendi.`,
      "success"
    );
    setNewServiceName("");
    setNewServiceDesc("");
    setNewServicePrice("350");
    setNewServiceDuration("30");
    setNewServiceVip(false);
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (filterStatus === "all") return apt.status !== "cancelled";
    return apt.status === filterStatus;
  });

  const previewSlots = getSlotsForDay("day-1");

  const renderTrustBadge = (badge: TrustBadgeType, detail: string) => {
    switch (badge) {
      case "trusted":
        return (
          <span
            title={detail}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Güvenilir Müşteri</span>
          </span>
        );
      case "first_time":
        return (
          <span
            title={detail}
            className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/15 px-2.5 py-0.5 text-xs font-bold text-sky-400"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>İlk Randevu</span>
          </span>
        );
      case "deposit_paid":
        return (
          <span
            title={detail}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#c88a53]/45 bg-[#c88a53]/20 px-2.5 py-0.5 text-xs font-bold text-[#e6ccb2] shadow-sm"
          >
            <Crown className="h-3.5 w-3.5 text-[#c88a53]" />
            <span>Kaporası Alındı</span>
          </span>
        );
    }
  };

  return (
    <AdminPinGate>
      <div className="relative mx-auto max-w-6xl px-3 pb-20 pt-3 sm:px-6 sm:pb-24 sm:pt-8">
      {/* HIZLI RANDEVU / SAAT KAPAT MODALI */}
      <QuickBookingModal
        open={isQuickModalOpen}
        onClose={() => setIsQuickModalOpen(false)}
        onSuccess={(title, subtitle) => {
          setFilterStatus("all");
          triggerToast(title, subtitle, "success");
        }}
      />

      {/* QR AFİŞ & AYNA KARTI MODALI */}
      <QrPosterModal
        open={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* Subtle Top Ambient Warm Bronze / Cognac Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 left-1/2 -z-10 h-60 w-full max-w-4xl -translate-x-1/2 rounded-full bg-gradient-to-r from-[#b47b48]/20 via-[#c88a53]/15 to-[#9a6334]/20 blur-3xl"
      />

      {/* PWA MOBİL UYGULAMA KURULUM REHBERİ / BUTONU (Ana ekrana eklenmediyse görünür) */}
      <PwaInstallBanner />

      {/* EN ÜSTTE ESNAF DOSTU ABONELİK SÜRESİ DOLDU UYARI BANDI (PANELI ASLA KİLİTLEMEZ) */}
      <AnimatePresence>
        {(currentShop.subscriptionStatus === "expired" ||
          currentShop.subscriptionStatus === "suspended") &&
          !bannerDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={{ duration: 0.2 }}
              className="relative mb-4 overflow-hidden rounded-2xl border-2 border-amber-500/70 bg-gradient-to-r from-[#381210] via-[#2a1510] to-[#1a120e] p-3.5 shadow-xl shadow-red-950/40 sm:mb-6 sm:p-5"
            >
              <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-red-500 via-amber-400 to-orange-500 animate-pulse" />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5 sm:gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/50 bg-gradient-to-br from-red-500/30 via-orange-500/25 to-amber-500/30 text-amber-300 shadow-inner sm:h-12 sm:w-12 sm:rounded-2xl">
                    <AlertTriangle className="h-5 w-5 stroke-[2.3] text-amber-300 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/60 bg-red-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-200 sm:px-3 sm:text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping sm:h-2 sm:w-2" />
                        ABONELİK UYARISI
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-200 sm:px-2.5 sm:text-[11px]">
                        Bitiş: {currentShop.subscriptionEndDate || "Süresi Doldu"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 sm:px-2.5 sm:text-[11px]">
                        <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        Panel Açık
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-bold leading-relaxed text-[#fdf8f5] sm:mt-2 sm:text-sm">
                      Abonelik süreniz dolmuştur. İşlemlerinize kesintisiz devam edebilirsiniz, yenileme için lütfen sistem yöneticisi ile iletişime geçin.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setBannerDismissed(true)}
                    className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-[11px] font-bold text-amber-200 transition hover:border-amber-400 hover:bg-amber-500/25 hover:text-white sm:px-3.5 sm:py-2 sm:text-xs"
                  >
                    Gizle
                  </button>
                </div>
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* PERSISTENT CUSTOMER CANCELLATION / WAITLIST ALERTS AT THE VERY TOP */}
      <AnimatePresence>
        {adminAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mb-4 space-y-2.5 sm:mb-6 sm:space-y-3"
          >
            {adminAlerts.map((alert) => (
              <div
                key={alert.id}
                className="relative flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border-2 border-[#c88a53] bg-gradient-to-r from-[#c88a53]/25 via-[#241b16] to-[#1c1613] p-3.5 shadow-lg shadow-[#c88a53]/25 sm:flex-row sm:items-center sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/25 sm:h-11 sm:w-11 sm:rounded-2xl">
                    <BellRing className="h-5 w-5 animate-bounce sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#1a110b] sm:px-2.5 sm:text-[10px]">
                        OTOMATİK YEDEK LİSTE BİLDİRİMİ ({currentShop.name})
                      </span>
                      <span className="text-[11px] text-[#e6ccb2]">
                        {alert.timestamp}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-extrabold text-[#fdf8f5] sm:mt-1.5 sm:text-base">
                      {alert.message}
                    </h3>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => dismissAdminAlert(alert.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#c88a53]/40 bg-[#14100d] px-2.5 py-1.5 text-[11px] font-bold text-[#e6ccb2] hover:bg-[#221a15] sm:px-3 sm:py-2 sm:text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Bildirimi Kapat</span>
                  </button>
                </div>
              </div>
            ))}
            {adminAlerts.length > 1 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearAllAdminAlerts}
                  className="text-xs font-semibold text-[#e6ccb2]/75 underline hover:text-[#e6ccb2]"
                >
                  Tüm Bildirimleri Temizle
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Action Notification Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            className={`mb-4 flex items-start justify-between gap-3 rounded-2xl border p-3.5 shadow-2xl sm:mb-6 sm:p-4 ${
              toastMessage.type === "warning"
                ? "border-[#c88a53]/60 bg-gradient-to-r from-[#281d15] via-[#1c1613] to-[#14100d] text-[#e6ccb2] shadow-[#c88a53]/20"
                : toastMessage.type === "whatsapp"
                ? "border-emerald-500/60 bg-gradient-to-r from-emerald-950/90 via-[#1c1613] to-[#14100d] text-emerald-200"
                : "border-emerald-500/50 bg-[#1c1613] text-[#fdf8f5]"
            }`}
          >
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9 ${
                  toastMessage.type === "warning"
                    ? "bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b]"
                    : "bg-emerald-500 text-[#1a110b]"
                }`}
              >
                {toastMessage.type === "warning" ? (
                  <BellRing className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : toastMessage.type === "whatsapp" ? (
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#fdf8f5] sm:text-sm">
                  {toastMessage.title}
                </h4>
                <p className="mt-0.5 text-[11px] text-[#e6ccb2]/85 sm:text-xs">
                  {toastMessage.subtitle}
                </p>
              </div>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs font-semibold text-[#e6ccb2]/75 hover:text-[#fdf8f5]"
            >
              Kapat
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header — Scoped to Current Tenant Shop + Copy Instagram/WhatsApp Link CTA */}
      <div className="mb-4 flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-[#1e1815] via-[#161311] to-[#110f0d] p-3.5 shadow-lg shadow-black/50 sm:mb-6 sm:gap-4 sm:p-5 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#1a110b] shadow-sm sm:px-3 sm:text-[11px]">
              BERBER YÖNETİM PANELİ
            </span>
            <span className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-sky-300 sm:px-2.5 sm:text-xs">
              /?shop={currentShop.slug}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold sm:px-2.5 sm:text-[11px] ${
                currentShop.subscriptionStatus === "active"
                  ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                  : "border border-red-500/60 bg-gradient-to-r from-red-600/25 via-amber-500/20 to-red-600/25 text-red-200 shadow-sm"
              }`}
            >
              {currentShop.subscriptionStatus === "active" ? (
                `Abonelik: Aktif (${currentShop.subscriptionEndDate || "Aktif"})`
              ) : (
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span>Süresi Doldu</span>
                  <span className="font-extrabold text-amber-300">({currentShop.subscriptionEndDate || "Süresi Geçti"})</span>
                </span>
              )}
            </span>
          </div>
          <h1 className="mt-1.5 text-lg font-extrabold tracking-tight text-[#fdf8f5] sm:mt-2 sm:text-3xl">
            {currentShop.name}{" "}
            <span className="bg-gradient-to-r from-[#e6ccb2] via-[#c88a53] to-[#b47b48] bg-clip-text text-sm font-bold text-transparent sm:text-2xl">
              • Salon Kontrol Merkezi
            </span>
          </h1>
          <p className="mt-0.5 hidden text-xs text-stone-400 sm:block">
            Burada yaptığınız tüm fiyat, koltuk, saat ve kapora değişiklikleri yalnızca{" "}
            <strong className="text-[#fdf8f5]">{currentShop.name}</strong> vitrinine kaydedilir.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-400/40 bg-purple-500/15 px-2.5 py-2 text-[11px] font-extrabold text-purple-200 shadow-sm transition hover:border-purple-300 hover:bg-purple-500/25 hover:text-white sm:px-4 sm:py-3 sm:text-xs"
          >
            <QrCode className="h-3.5 w-3.5 shrink-0 text-purple-300 sm:h-4 sm:w-4" />
            <span>QR Afiş Al</span>
          </button>

          <button
            type="button"
            onClick={handleCopyBookingLink}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-2.5 py-2 text-[11px] font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110 sm:px-4 sm:py-3 sm:text-xs"
          >
            {copiedShareLink ? (
              <>
                <Check className="h-3.5 w-3.5 shrink-0 stroke-[3] sm:h-4 sm:w-4" />
                <span>Link Kopyalandı!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 shrink-0 stroke-[2.5] sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Instagram/WhatsApp Randevu Linkini Kopyala</span>
                <span className="sm:hidden">Linki Kopyala</span>
              </>
            )}
          </button>

          <Link
            href={`/?shop=${currentShop.slug}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-500/10 px-2.5 py-2 text-[11px] font-extrabold text-sky-200 transition hover:border-sky-300 hover:bg-sky-500/20 hover:text-white sm:px-4 sm:py-3 sm:text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-sky-400 sm:h-4 sm:w-4" />
            <span>Müşteri Vitrini</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              lockAdminSession(currentShop.slug);
              if (typeof window !== "undefined") {
                window.location.href = "/admin";
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-2.5 py-2 text-[11px] font-extrabold text-rose-300 transition hover:bg-rose-500/20 sm:px-3.5 sm:py-3 sm:text-xs"
            title="Oturumu Kapat / Çıkış Yap"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* GELİR KORUMA ÖZETİ CARDS — COMPACT 3-COLUMN ON MOBILE */}
      <section aria-label="Gelir Koruma Özeti" className="mb-4 sm:mb-7">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <motion.div
            layout
            className="relative overflow-hidden rounded-xl border border-[#c88a53]/40 bg-gradient-to-br from-[#261d17] via-[#181412] to-[#12100e] p-2.5 shadow-lg shadow-[#c88a53]/15 transition-all hover:border-[#c88a53]/70 sm:rounded-2xl sm:p-5"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[10px] font-semibold text-[#e6ccb2] sm:text-xs">
                Kurtarılan Gelir
              </span>
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c88a53]/20 text-[#e6ccb2] ring-1 ring-[#c88a53]/35 sm:flex">
                <TrendingUp className="h-4 w-4 text-[#c88a53]" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1 sm:mt-3 sm:gap-2">
              <span className="bg-gradient-to-r from-[#fdf8f5] via-[#e6ccb2] to-[#c88a53] bg-clip-text text-sm font-extrabold tracking-tight text-transparent sm:text-3xl">
                {stats.savedRevenue.toLocaleString("tr-TR")} TL
              </span>
            </div>
            <p className="mt-1.5 hidden text-xs text-stone-400 sm:block">
              Kapora ve yedek liste ile boş kalmaktan kurtarılan aylık ciro
            </p>
          </motion.div>

          <motion.div
            layout
            className="relative overflow-hidden rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/25 via-[#161412] to-[#12100e] p-2.5 shadow-lg transition-all hover:border-emerald-500/50 sm:rounded-2xl sm:p-5"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[10px] font-semibold text-emerald-200 sm:text-xs">
                Yedek Doluluk
              </span>
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 sm:flex">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-1 sm:mt-3 sm:gap-2">
              <span className="text-sm font-extrabold tracking-tight text-[#fdf8f5] sm:text-3xl">
                {stats.waitlistFilled} Koltuk
              </span>
              <span className="hidden rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400 sm:inline-block">
                %100 Doluluk
              </span>
            </div>
            <p className="mt-1.5 hidden text-xs text-stone-400 sm:block">
              İptal edilen saatlerin otomatik WhatsApp bildirimi ile dolma sayısı
            </p>
          </motion.div>

          <motion.div
            layout
            className="relative overflow-hidden rounded-xl border border-rose-500/25 bg-gradient-to-br from-rose-950/25 via-[#161412] to-[#12100e] p-2.5 shadow-lg transition-all hover:border-rose-500/50 sm:rounded-2xl sm:p-5"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[10px] font-semibold text-rose-200 sm:text-xs">
                No-Show Kalkanı
              </span>
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30 sm:flex">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-1 sm:mt-3 sm:gap-2">
              <span className="text-sm font-extrabold tracking-tight text-[#fdf8f5] sm:text-3xl">
                {stats.preventedNoShows} Engellendi
              </span>
              <span className="hidden rounded-md border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-300 sm:inline-block">
                {currentShop.depositAmount} TL Kapora
              </span>
            </div>
            <p className="mt-1.5 hidden text-xs text-stone-400 sm:block">
              Ortak Kara Liste Ağı ({globalBlacklist.length} numara) ile önlenen gelmeme vakası
            </p>
          </motion.div>
        </div>
      </section>

      {/* ADMIN NAVIGATION TABS (4 MAJOR SECTIONS) */}
      <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-[#12100e] p-1.5 shadow-lg sm:mb-6 sm:gap-2 sm:p-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setActiveTab("appointments")}
          className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] transition-all sm:gap-2 sm:px-3 sm:py-3 sm:text-sm ${
            activeTab === "appointments"
              ? "border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black text-[#120b07] shadow-lg shadow-[#c88a53]/25"
              : "border-transparent font-bold text-stone-300 hover:border-white/15 hover:bg-[#1a1614] hover:text-[#fdf8f5]"
          }`}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 stroke-[2.5] sm:h-4 sm:w-4" />
          <span className="truncate">
            1. Randevular (
            {appointments.filter((a) => a.status !== "cancelled").length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("barbers")}
          className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] transition-all sm:gap-2 sm:px-3 sm:py-3 sm:text-sm ${
            activeTab === "barbers"
              ? "border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black text-[#120b07] shadow-lg shadow-[#c88a53]/25"
              : "border-transparent font-bold text-stone-300 hover:border-white/15 hover:bg-[#1a1614] hover:text-[#fdf8f5]"
          }`}
        >
          <Armchair className="h-3.5 w-3.5 shrink-0 stroke-[2.5] sm:h-4 sm:w-4" />
          <span className="truncate">2. Koltuk & Ustalar ({barbers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("services")}
          className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] transition-all sm:gap-2 sm:px-3 sm:py-3 sm:text-sm ${
            activeTab === "services"
              ? "border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black text-[#120b07] shadow-lg shadow-[#c88a53]/25"
              : "border-transparent font-bold text-stone-300 hover:border-white/15 hover:bg-[#1a1614] hover:text-[#fdf8f5]"
          }`}
        >
          <Scissors className="h-3.5 w-3.5 shrink-0 stroke-[2.5] sm:h-4 sm:w-4" />
          <span className="truncate">3. Hizmet & Fiyat ({services.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] transition-all sm:gap-2 sm:px-3 sm:py-3 sm:text-sm ${
            activeTab === "schedule"
              ? "border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black text-[#120b07] shadow-lg shadow-[#c88a53]/25"
              : "border-transparent font-bold text-stone-300 hover:border-white/15 hover:bg-[#1a1614] hover:text-[#fdf8f5]"
          }`}
        >
          <Settings className="h-3.5 w-3.5 shrink-0 stroke-[2.5] sm:h-4 sm:w-4" />
          <span className="truncate">4. Saat & Kapora</span>
        </button>
      </div>

      {/* TAB 1: GÜNLÜK RANDEVU AKIŞI */}
      {activeTab === "appointments" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#161311] p-4 transition-all">
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-sky-400" />
                  <h2 className="text-base font-bold text-[#fdf8f5]">
                    {currentShop.name} • Günlük Randevu Akışı (
                    {filteredAppointments.length})
                  </h2>
                </div>

                {/* + HIZLI RANDEVU / SAAT KAPAT — Parlak Bronz/Karamel CTA */}
                <button
                  type="button"
                  onClick={() => setIsQuickModalOpen(true)}
                  className="relative inline-flex items-center gap-2 rounded-xl border border-[#e6ccb2]/60 bg-gradient-to-r from-[#b47b48] via-[#d9a36a] to-[#9a6334] px-4 py-2.5 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/40 ring-2 ring-[#c88a53]/25 transition hover:scale-[1.02] hover:brightness-110 active:scale-[0.99] sm:text-sm"
                >
                  <span className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
                  </span>
                  <Plus className="h-4 w-4 stroke-[3]" />
                  <span>Hızlı Randevu / Saat Kapat</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Filter className="mr-1 h-3.5 w-3.5 text-sky-400" />
                {[
                  { id: "all", label: "Tümü" },
                  { id: "upcoming", label: "Bekleyen" },
                  { id: "completed", label: "Geldi (Tamamlanan)" },
                  { id: "no_show", label: "Gelmedi (No-Show)" },
                  { id: "cancelled", label: "İptal Edilenler" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterStatus(tab.id)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                      filterStatus === tab.id
                        ? "border-sky-400/50 bg-sky-500/20 font-extrabold text-sky-200 shadow-sm"
                        : "border-white/5 bg-[#110f0d] text-stone-400 hover:border-white/15 hover:text-[#fdf8f5]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#161311] p-8 text-center">
                <CalendarIcon className="mx-auto h-8 w-8 text-sky-400" />
                <h3 className="mt-2 text-base font-bold text-[#fdf8f5]">
                  Bu Filtrede Randevu Bulunmuyor
                </h3>
                <p className="mt-1 text-xs text-stone-400">
                  Müşteri vitrininden (`/?shop={currentShop.slug}`) yeni randevu
                  oluşturarak test edebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredAppointments.map((apt) => {
                  // KİLİTLİ SAAT (Usta Saati Kapatıldı) KARTI
                  if (apt.isBlockedSlot) {
                    return (
                      <motion.div
                        key={apt.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col justify-between gap-3 rounded-2xl border border-dashed border-amber-500/40 bg-[repeating-linear-gradient(135deg,#181412,#181412_10px,#14100e_10px,#14100e_20px)] p-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="flex min-w-[74px] flex-col items-center justify-center rounded-xl border border-amber-500/40 bg-[#12100e] px-2.5 py-2 text-center text-amber-300">
                            <Lock className="mb-0.5 h-3.5 w-3.5 text-amber-400" />
                            <span className="text-sm font-extrabold leading-none">{apt.time}</span>
                            <span className="mt-1 text-[10px] opacity-80">{apt.endTime}</span>
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                                Saat Kapatıldı
                              </span>
                              <h3 className="text-sm font-extrabold text-[#fdf8f5]">
                                {apt.blockReason}
                              </h3>
                            </div>
                            <p className="mt-1 text-xs text-stone-400">
                              {apt.barberName} ({apt.chairLabel}) • {apt.dateLabel}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            removeAppointmentOrBlock(apt.id);
                            triggerToast(
                              "Saat Kilidi Açıldı",
                              `${apt.time} - ${apt.endTime} arası tekrar randevuya açıldı.`,
                              "success"
                            );
                          }}
                          className="inline-flex items-center gap-1.5 self-end rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20 sm:self-center"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          <span>Kilidi Aç</span>
                        </button>
                      </motion.div>
                    );
                  }

                  const isCompleted = apt.status === "completed";
                  const isNoShow = apt.status === "no_show";
                  const isCancelled = apt.status === "cancelled";

                  return (
                    <motion.div
                      key={apt.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl border p-4 transition-all sm:p-5 ${
                        isCompleted
                          ? "border-emerald-500/30 bg-[#131715]"
                          : isNoShow || isCancelled
                          ? "border-rose-500/40 bg-rose-950/15"
                          : "border-white/10 bg-[#161311] hover:border-white/25"
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`flex min-w-[74px] flex-col items-center justify-center rounded-xl border px-2.5 py-2 text-center ${
                              isCompleted
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : isNoShow || isCancelled
                                ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                : "border-sky-500/35 bg-sky-500/10 text-sky-300"
                            }`}
                          >
                            <span className="text-base font-extrabold leading-none">
                              {apt.time}
                            </span>
                            <span className="mt-1 text-[10px] font-medium opacity-80">
                              {apt.endTime}
                            </span>
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded border border-white/15 bg-[#110f0d] px-2 py-0.5 font-mono text-xs font-bold text-sky-300">
                                {apt.appointmentCode}
                              </span>
                              <h3 className="text-base font-extrabold text-[#fdf8f5]">
                                {apt.customerName}
                              </h3>
                              {renderTrustBadge(
                                apt.trustBadge,
                                apt.trustDetail
                              )}
                              {apt.bookingSource === "phone" && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/40 bg-purple-500/15 px-2.5 py-0.5 text-[11px] font-bold text-purple-200">
                                  <PhoneCall className="h-3 w-3 text-purple-300" />
                                  Telefon Randevusu
                                </span>
                              )}

                              {isCompleted && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                                  <Check className="h-3 w-3 stroke-[3]" />
                                  Geldi • Tamamlandı
                                </span>
                              )}
                              {isNoShow && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
                                  <Ban className="h-3 w-3" />
                                  No-Show • Ortak Kara Listede
                                </span>
                              )}
                              {isCancelled && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
                                  İptal Edildi
                                </span>
                              )}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-400">
                              <span className="inline-flex items-center gap-1 font-medium text-[#fdf8f5]">
                                <Phone className="h-3 w-3 text-emerald-400" />
                                {apt.customerPhone}
                              </span>
                              <span className="text-stone-600">•</span>
                              <span className="inline-flex items-center gap-1 text-stone-300">
                                <Scissors className="h-3 w-3 text-sky-400" />
                                {apt.barberName} ({apt.chairLabel})
                              </span>
                            </div>

                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              {apt.services.map((srv, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-lg border border-white/10 bg-[#110f0d] px-2.5 py-1 text-xs font-medium text-stone-200"
                                >
                                  {srv.name}{" "}
                                  <span className="font-bold text-[#c88a53]">
                                    ({srv.price} TL)
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row items-center justify-between border-t border-white/10 pt-2.5 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                          <div className="bg-gradient-to-r from-[#fdf8f5] to-[#c88a53] bg-clip-text text-lg font-extrabold text-transparent">
                            {apt.totalPrice} TL
                          </div>
                          <div className="text-xs font-medium text-sky-400">
                            {apt.totalDuration} dk
                          </div>
                          {apt.depositAmount && (
                            <span className="mt-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                              {apt.depositAmount} TL Kapora Alındı
                            </span>
                          )}
                        </div>
                      </div>

                      {!isCancelled && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={isCompleted}
                              onClick={() => handleComplete(apt)}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                                isCompleted
                                  ? "cursor-default bg-emerald-500/20 text-emerald-400 opacity-60"
                                  : "bg-emerald-500 text-[#091510] shadow-sm hover:bg-emerald-400"
                              }`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                              <span>Geldi (Tamamla)</span>
                            </button>

                            {isPhoneBlacklisted(apt.customerPhone) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenRemoveBlacklistModal(
                                    apt.customerPhone,
                                    apt.customerName
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Kara Listeden Çıkar (Affet)</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isNoShow}
                                onClick={() => handleOpenNoShowModal(apt)}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                                  isNoShow
                                    ? "cursor-default border-rose-500/30 bg-rose-500/20 text-rose-300 opacity-60"
                                    : "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                                }`}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>
                                  Gelmedi (Ortak Kara Listeye Al - No-Show)
                                </span>
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSendReminder(apt)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                              apt.reminderSent
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                : "border-sky-500/35 bg-sky-500/10 text-sky-200 hover:border-sky-400 hover:bg-sky-500/20 hover:text-white"
                            }`}
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>
                              {apt.reminderSent
                                ? `WhatsApp Hatırlatma Gönderildi (${
                                    apt.reminderSentAt || "✓"
                                  })`
                                : "WhatsApp Hatırlatma Gönder"}
                            </span>
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-amber-500/25 bg-[#161311] p-5 transition-all hover:border-amber-500/45">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-[#fdf8f5]">
                    Akıllı Yedek Liste ({waitlist.length})
                  </h3>
                </div>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  Otomatik Bildirim
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-400">
                {currentShop.name} dolu saatleri için sıra bekleyen müşteriler.
              </p>

              <div className="mt-4 space-y-3">
                {waitlist.map((wl) => (
                  <div
                    key={wl.id}
                    className="rounded-xl border border-white/10 bg-[#110f0d] p-3.5 text-xs transition hover:border-amber-500/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#fdf8f5]">
                        {wl.customerName}
                      </span>
                      <span className="rounded bg-amber-500/15 px-2 py-0.5 font-bold text-amber-300">
                        {wl.requestedDateLabel} • {wl.requestedTime}
                      </span>
                    </div>
                    <p className="mt-1 text-stone-400">
                      {wl.barberName} • {wl.servicesSummary} (
                      <strong className="text-[#c88a53]">{wl.totalPrice} TL</strong>)
                    </p>
                    <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2">
                      <span className="text-[11px] text-stone-400">
                        {wl.customerPhone}
                      </span>
                      {wl.notified ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                          <Check className="h-3.5 w-3.5" />
                          WhatsApp Bildirimi Gönderildi
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            notifyWaitlistCustomer(wl.id);
                            triggerToast(
                              "Yedek Liste Müşterisi Çağrıldı",
                              `${wl.customerName} adlı müşteriye WhatsApp üzerinden boş koltuk daveti gönderildi.`,
                              "whatsapp"
                            );
                          }}
                          className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-bold text-emerald-300 transition hover:bg-emerald-500 hover:text-[#091510]"
                        >
                          WhatsApp ile Çağır
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-rose-500/25 bg-[#161311] p-5 transition-all hover:border-rose-500/45">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-[#fdf8f5]">
                    Ortak Kara Liste Ağı ({globalBlacklist.length})
                  </h3>
                </div>
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                  Global No-Show Shield
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-400">
                Tüm üye berber dükkanları arasında ortak paylaşılan No-Show
                veritabanı.
              </p>

              <div className="mt-4 max-h-96 space-y-2.5 overflow-y-auto pr-1">
                {globalBlacklist.length === 0 ? (
                  <div className="py-6 text-center text-xs text-stone-500">
                    Henüz kara listede kayıtlı müşteri bulunmuyor.
                  </div>
                ) : (
                  globalBlacklist.map((entry, idx) => (
                    <div
                      key={`${entry.phone}-${idx}`}
                      className="rounded-xl border border-rose-500/25 bg-rose-950/15 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-rose-300">
                          {entry.phone}
                        </span>
                        <span className="rounded bg-[#110f0d] px-2 py-0.5 text-[10px] font-bold text-stone-300">
                          Bildiren: {entry.reportedByShopName}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="font-semibold text-[#fdf8f5]">
                          {entry.name}
                        </p>
                        {entry.requiredDeposit ? (
                          <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                            {entry.requiredDeposit} TL Kapora Şartı
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] text-stone-400">
                        {entry.missedDate} ({entry.missedService})
                      </p>
                      <div className="mt-2.5 flex justify-end border-t border-rose-500/20 pt-2">
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
        </div>
      )}

      {/* TAB 2: KOLTUK & ÇALIŞAN (USTA) YÖNETİMİ + KİŞİYE ÖZEL FİYATLANDIRMA */}
      {activeTab === "barbers" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left 2 Columns: Existing Barbers & Chairs List */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#161311] p-4 transition-all">
              <div>
                <h2 className="text-base font-bold text-[#fdf8f5]">
                  {currentShop.name} • Koltuklar, Çalışanlar & Özel Fiyatlar (
                  {barbers.length})
                </h2>
                <p className="text-xs text-stone-400">
                  Her çalışan/koltuk için hizmet bazında özel fiyat
                  tanımlayabilirsiniz. Yalnızca bu dükkana (`{currentShop.slug}`)
                  uygulanır.
                </p>
              </div>
              <span className="rounded-lg border border-sky-500/35 bg-sky-500/15 px-2.5 py-1 text-xs font-bold text-sky-300">
                İzole Dükkan Kadrosu
              </span>
            </div>

            <div className="space-y-4">
              {barbers.map((barber, idx) => {
                const isEditing = editingBarberId === barber.id;
                const customCount = barber.customPrices
                  ? Object.keys(barber.customPrices).length
                  : 0;
                const avatarThemes = [
                  "from-purple-900/90 via-indigo-950 to-[#14100d] ring-purple-400/40",
                  "from-sky-900/90 via-slate-900 to-[#14100d] ring-sky-400/40",
                  "from-emerald-900/90 via-teal-950 to-[#14100d] ring-emerald-400/40",
                  "from-amber-900/90 via-orange-950 to-[#14100d] ring-amber-400/40",
                ];
                const avatarStyle = barber.isAnyOption
                  ? "from-[#b47b48] via-[#c88a53] to-[#8c5828] ring-[#c88a53]/45"
                  : avatarThemes[(idx - 1 + avatarThemes.length) % avatarThemes.length];

                return (
                  <div
                    key={barber.id}
                    className={`rounded-2xl border p-5 transition-all ${
                      isEditing
                        ? "border-[#e6ccb2]/60 bg-[#241b16] shadow-lg shadow-[#c88a53]/20"
                        : "border-white/10 bg-[#161311] hover:border-white/25"
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <h3 className="text-sm font-extrabold text-[#e6ccb2]">
                            Çalışan, Koltuk & Özel Fiyat Düzenle: {barber.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setEditingBarberId(null)}
                            className="text-xs text-stone-400 hover:text-[#fdf8f5]"
                          >
                            Kapat
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-stone-300">
                              Çalışan / Usta Adı
                            </label>
                            <input
                              type="text"
                              value={editBarberName}
                              onChange={(e) =>
                                setEditBarberName(e.target.value)
                              }
                              className="w-full rounded-xl border border-white/15 bg-[#110f0d] px-3 py-2 text-sm font-bold text-[#fdf8f5] outline-none focus:border-sky-400"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-sky-400">
                              Berber Koltuğu Adı / Numarası
                            </label>
                            <input
                              type="text"
                              value={editBarberChair}
                              onChange={(e) =>
                                setEditBarberChair(e.target.value)
                              }
                              className="w-full rounded-xl border border-white/15 bg-[#110f0d] px-3 py-2 text-sm font-bold text-sky-200 outline-none focus:border-sky-400"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-stone-300">
                              Ünvan / Rol
                            </label>
                            <input
                              type="text"
                              value={editBarberRole}
                              onChange={(e) =>
                                setEditBarberRole(e.target.value)
                              }
                              className="w-full rounded-xl border border-white/15 bg-[#110f0d] px-3 py-2 text-xs text-[#fdf8f5] outline-none focus:border-sky-400"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-stone-300">
                              Deneyim / Rozet
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={editBarberExp}
                                onChange={(e) =>
                                  setEditBarberExp(e.target.value)
                                }
                                placeholder="12 Yıl Deneyim"
                                className="w-full rounded-xl border border-white/15 bg-[#110f0d] px-3 py-2 text-xs text-[#fdf8f5] outline-none focus:border-sky-400"
                              />
                              <input
                                type="text"
                                value={editBarberBadge}
                                onChange={(e) =>
                                  setEditBarberBadge(e.target.value)
                                }
                                placeholder="Master Barber"
                                className="w-full rounded-xl border border-white/15 bg-[#110f0d] px-3 py-2 text-xs text-amber-200 outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Custom Per-Service Price Inputs for this Barber */}
                        <div className="rounded-xl border border-white/15 bg-[#110f0d] p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
                              <BadgeDollarSign className="h-4 w-4 text-amber-400" />
                              Bu Çalışana (Koltuğa) Özel Hizmet Fiyatları (TL)
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const next: Record<string, string> = {};
                                  services.forEach((s) => {
                                    next[s.id] = String(s.price + 100);
                                  });
                                  setEditBarberPrices(next);
                                }}
                                className="rounded-lg bg-amber-500/20 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-500 hover:text-[#1a110b]"
                              >
                                Tümüne +100 TL VIP Farkı Koy
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const next: Record<string, string> = {};
                                  services.forEach((s) => {
                                    next[s.id] = String(s.price);
                                  });
                                  setEditBarberPrices(next);
                                }}
                                className="rounded-lg border border-white/15 bg-[#181513] px-2 py-1 text-[10px] font-semibold text-stone-300 hover:text-white"
                              >
                                Standart Fiyatlara Eşitle
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {services.map((srv) => (
                              <div
                                key={srv.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#181513] px-3 py-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-[#fdf8f5]">
                                    {srv.name}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    value={
                                      editBarberPrices[srv.id] ?? srv.price
                                    }
                                    onChange={(e) =>
                                      setEditBarberPrices((prev) => ({
                                        ...prev,
                                        [srv.id]: e.target.value,
                                      }))
                                    }
                                    className="w-20 rounded-lg border border-white/15 bg-[#110f0d] px-2.5 py-1.5 text-right text-xs font-extrabold text-amber-300 outline-none focus:border-amber-400"
                                  />
                                  <span className="text-xs font-bold text-[#c88a53]">
                                    TL
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingBarberId(null)}
                            className="rounded-xl border border-white/15 bg-[#110f0d] px-4 py-2 text-xs font-semibold text-stone-300 hover:text-white"
                          >
                            Vazgeç
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveBarber(barber)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-5 py-2 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 hover:brightness-110"
                          >
                            <Save className="h-3.5 w-3.5" />
                            <span>Çalışan & Özel Fiyatları Kaydet</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div className="flex items-start gap-3.5">
                            <div
                              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarStyle} text-base font-extrabold text-[#fdf8f5] ring-1`}
                            >
                              {barber.isAnyOption ? (
                                <Scissors className="h-6 w-6 text-[#1a110b]" />
                              ) : (
                                barber.initials
                              )}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-extrabold text-[#fdf8f5]">
                                  {barber.name}
                                </h3>
                                <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/35 bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-bold text-sky-200">
                                  <Armchair className="h-3 w-3 text-sky-400" />
                                  {barber.chairName}
                                </span>
                                {customCount > 0 ? (
                                  <span className="rounded-full border border-amber-500/35 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                                    {customCount} Hizmette Kişiye Özel Fiyat
                                  </span>
                                ) : (
                                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                    Standart Salon Fiyatı
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-stone-400">
                                {barber.role} • {barber.experience}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-start">
                            <button
                              type="button"
                              onClick={() => startEditBarber(barber)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/35 bg-sky-500/15 px-3.5 py-2 text-xs font-bold text-sky-200 transition hover:bg-sky-500 hover:text-slate-950"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Koltuk & Özel Fiyat Düzenle</span>
                            </button>
                            {!barber.isAnyOption && (
                              <button
                                type="button"
                                onClick={() => {
                                  deleteBarber(barber.id);
                                  triggerToast(
                                    "Çalışan / Koltuk Silindi",
                                    `${barber.name} (${barber.chairName}) listeden kaldırıldı.`,
                                    "warning"
                                  );
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 transition hover:bg-rose-500 hover:text-white"
                                title="Çalışanı Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Per-Service Price Matrix for this Barber */}
                        <div className="mt-4 rounded-xl border border-white/10 bg-[#110f0d] p-3.5">
                          <div className="mb-2 flex items-center justify-between text-[11px]">
                            <span className="font-bold uppercase tracking-wider text-stone-400">
                              Bu Koltuğun / Çalışanın Hizmet Fiyat Tarifesi:
                            </span>
                            <span className="text-amber-300">
                              Kehribar/Altın renkli olanlar bu ustaya özel
                              fiyattır
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {services.map((srv) => {
                              const barberPrice = getServicePriceForBarber(
                                srv,
                                barber
                              );
                              const isCustom = barberPrice !== srv.price;
                              return (
                                <div
                                  key={srv.id}
                                  className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs ${
                                    isCustom
                                      ? "border-amber-500/45 bg-amber-500/15 text-[#fdf8f5]"
                                      : "border-white/10 bg-[#181513] text-stone-300"
                                  }`}
                                >
                                  <span className="truncate pr-2 font-medium">
                                    {srv.name}
                                  </span>
                                  <span
                                    className={`shrink-0 font-extrabold ${
                                      isCustom
                                        ? "text-amber-300"
                                        : "text-emerald-400"
                                    }`}
                                  >
                                    {barberPrice} TL
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Add New Barber / Employee & Chair Form with Custom Prices */}
          <div>
            <form
              onSubmit={handleCreateBarber}
              className="space-y-4 rounded-2xl border border-[#c88a53]/45 bg-[#1c1613] p-5 shadow-lg shadow-[#c88a53]/20 transition-all hover:border-[#c88a53]/70"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-md shadow-[#c88a53]/25">
                  <UserPlus className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#fdf8f5]">
                    Yeni Çalışan & Koltuk Ekle
                  </h3>
                  <p className="text-xs text-[#e6ccb2]/70">
                    {currentShop.name} kadrosuna özel fiyatla ekleyin
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#e6ccb2]">
                  Çalışan / Usta Adı Soyadı *
                </label>
                <input
                  type="text"
                  required
                  value={newBarberName}
                  onChange={(e) => setNewBarberName(e.target.value)}
                  placeholder="Örn: Usta Emirhan"
                  className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3.5 py-2.5 text-sm text-[#fdf8f5] placeholder-[#e6ccb2]/40 outline-none focus:border-[#c88a53]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#c88a53]">
                  Berber Koltuğu Adı / Numarası *
                </label>
                <input
                  type="text"
                  required
                  value={newBarberChair}
                  onChange={(e) => setNewBarberChair(e.target.value)}
                  placeholder="Örn: VIP Koltuk #4 (Platinum Suite)"
                  className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3.5 py-2.5 text-sm font-bold text-[#e6ccb2] outline-none focus:border-[#c88a53]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#e6ccb2]">
                    Ünvan / Rol
                  </label>
                  <input
                    type="text"
                    value={newBarberRole}
                    onChange={(e) => setNewBarberRole(e.target.value)}
                    className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-xs text-[#fdf8f5] outline-none focus:border-[#c88a53]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#e6ccb2]">
                    Deneyim
                  </label>
                  <input
                    type="text"
                    value={newBarberExp}
                    onChange={(e) => setNewBarberExp(e.target.value)}
                    className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-xs text-[#fdf8f5] outline-none focus:border-[#c88a53]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#e6ccb2]">
                  Uzmanlık Etiketleri (Virgülle Ayırın)
                </label>
                <input
                  type="text"
                  value={newBarberSpecs}
                  onChange={(e) => setNewBarberSpecs(e.target.value)}
                  className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-xs text-[#fdf8f5] outline-none focus:border-[#c88a53]"
                />
              </div>

              {/* Per-Service Custom Pricing for New Barber */}
              <div className="rounded-xl border border-[#c88a53]/25 bg-[#14100d] p-3.5">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-bold text-[#e6ccb2]">
                    <BadgeDollarSign className="h-4 w-4 text-[#c88a53]" />
                    Kişiye Özel Fiyatlar (İsteğe Bağlı)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next: Record<string, string> = {};
                      services.forEach((s) => {
                        next[s.id] = String(s.price + 100);
                      });
                      setNewBarberPrices(next);
                    }}
                    className="rounded bg-[#c88a53]/20 px-2 py-0.5 text-[10px] font-bold text-[#e6ccb2] hover:bg-gradient-to-r hover:from-[#b47b48] hover:via-[#c88a53] hover:to-[#9a6334] hover:text-[#1a110b]"
                  >
                    +100 TL VIP Tarife Doldur
                  </button>
                </div>
                <p className="mb-2.5 text-[11px] text-[#e6ccb2]/70">
                  Boş bırakılan hizmetlerde standart salon fiyatı geçerli olur:
                </p>

                <div className="space-y-2">
                  {services.map((srv) => (
                    <div
                      key={srv.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[#c88a53]/20 bg-[#1c1613] px-3 py-2 text-xs transition hover:border-[#c88a53]/45"
                    >
                      <span className="font-medium text-[#fdf8f5]">
                        {srv.name}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          placeholder={`${srv.price}`}
                          value={newBarberPrices[srv.id] || ""}
                          onChange={(e) =>
                            setNewBarberPrices((prev) => ({
                              ...prev,
                              [srv.id]: e.target.value,
                            }))
                          }
                          className="w-20 rounded-lg border border-[#c88a53]/30 bg-[#14100d] px-2.5 py-1 text-right text-xs font-bold text-[#e6ccb2] placeholder-[#e6ccb2]/40 outline-none focus:border-[#c88a53]"
                        />
                        <span className="text-[11px] font-semibold text-[#c88a53]">
                          TL
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3.5 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Çalışanı, Koltuğu ve Özel Fiyatları Ekle</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: HİZMET & FİYAT YÖNETİMİ */}
      {activeTab === "services" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#161311] p-4 transition-all">
              <div>
                <h2 className="text-base font-bold text-[#fdf8f5]">
                  {currentShop.name} • Hizmetler & Standart Salon Fiyatları (
                  {services.length})
                </h2>
                <p className="text-xs text-stone-400">
                  Burada yaptığınız fiyat ve süre değişiklikleri sadece{" "}
                  <strong className="text-sky-300">/?shop={currentShop.slug}</strong> vitrinine yansır.
                </p>
              </div>
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
                İzole Fiyat Listesi
              </span>
            </div>

            <div className="space-y-3">
              {services.map((srv) => {
                const isEditing = editingServiceId === srv.id;

                return (
                  <div
                    key={srv.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      isEditing
                        ? "border-[#e6ccb2]/60 bg-[#241b16] shadow-lg shadow-[#c88a53]/20"
                        : "border-white/10 bg-[#161311] hover:border-white/25"
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="sm:col-span-1">
                            <label className="mb-1 block text-[11px] font-bold text-stone-300">
                              Hizmet Adı
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded-xl border border-white/15 bg-[#110f0d] px-3 py-2 text-sm font-bold text-[#fdf8f5] outline-none focus:border-sky-400"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-[#c88a53]">
                              Fiyat (TL)
                            </label>
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) =>
                                setEditPrice(Number(e.target.value))
                              }
                              className="w-full rounded-xl border border-white/15 bg-[#110f0d] px-3 py-2 text-sm font-extrabold text-[#e6ccb2] outline-none focus:border-[#c88a53]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-sky-400">
                              Süre (Dakika)
                            </label>
                            <input
                              type="number"
                              value={editDuration}
                              onChange={(e) =>
                                setEditDuration(Number(e.target.value))
                              }
                              className="w-full rounded-xl border border-white/15 bg-[#110f0d] px-3 py-2 text-sm font-bold text-[#fdf8f5] outline-none focus:border-sky-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-stone-300">
                            Açıklama
                          </label>
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full rounded-xl border border-white/15 bg-[#110f0d] px-3 py-2 text-xs text-stone-200 outline-none focus:border-sky-400"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingServiceId(null)}
                            className="rounded-xl border border-white/15 bg-[#110f0d] px-3.5 py-2 text-xs font-semibold text-stone-300"
                          >
                            İptal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveService(srv.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-4 py-2 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 hover:brightness-110"
                          >
                            <Save className="h-3.5 w-3.5" />
                            <span>Değişiklikleri Kaydet</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold text-[#fdf8f5]">
                              {srv.name}
                            </h3>
                            {srv.vip && (
                              <span className="rounded-full border border-purple-400/50 bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-black text-purple-200">
                                VIP PAKET
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-stone-400">
                            {srv.description}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                updateService(srv.id, {
                                  price: srv.price + 100,
                                });
                                triggerToast(
                                  `${srv.name} Fiyatı Güncellendi`,
                                  `Yeni standart fiyat (${currentShop.name}): ${
                                    srv.price + 100
                                  } TL`,
                                  "success"
                                );
                              }}
                              className="rounded-lg border border-amber-500/35 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500 hover:text-[#1a110b]"
                            >
                              +100 TL Artır
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateService(srv.id, {
                                  duration: srv.duration + 15,
                                });
                                triggerToast(
                                  `${srv.name} Süresi Güncellendi`,
                                  `Yeni süre: ${srv.duration + 15} dk`,
                                  "success"
                                );
                              }}
                              className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-300 hover:border-sky-400 hover:bg-sky-500/20"
                            >
                              +15 dk Süre Ekle
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3 sm:border-0 sm:pt-0">
                          <div className="text-right">
                            <div className="bg-gradient-to-r from-[#fdf8f5] to-[#c88a53] bg-clip-text text-xl font-extrabold text-transparent">
                              {srv.price} TL
                            </div>
                            <div className="text-xs font-semibold text-sky-400">
                              {srv.duration} dk
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditService(srv)}
                              className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-[#110f0d] px-3 py-2 text-xs font-bold text-stone-200 transition hover:border-sky-400/50 hover:text-sky-200"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-sky-400" />
                              <span>Düzenle</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                deleteService(srv.id);
                                triggerToast(
                                  "Hizmet Silindi",
                                  `${srv.name} listeden kaldırıldı.`,
                                  "warning"
                                );
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 transition hover:bg-rose-500 hover:text-white"
                              title="Hizmeti Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <form
              onSubmit={handleCreateService}
              className="sticky top-24 space-y-4 rounded-2xl border border-[#c88a53]/45 bg-[#1c1613] p-5 shadow-lg shadow-[#c88a53]/20 transition-all hover:border-[#c88a53]/70"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-md shadow-[#c88a53]/25">
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#fdf8f5]">
                    Yeni Hizmet Ekle
                  </h3>
                  <p className="text-xs text-[#e6ccb2]/70">
                    Sadece {currentShop.name} vitrinine eklenir
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#e6ccb2]">
                  Hizmet Adı *
                </label>
                <input
                  type="text"
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="Örn: Kraliyet Buharlı Sakal Spa"
                  className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3.5 py-2.5 text-sm text-[#fdf8f5] placeholder-[#e6ccb2]/40 outline-none focus:border-[#c88a53]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#c88a53]">
                    Standart Fiyat (TL) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3.5 py-2.5 text-sm font-bold text-[#e6ccb2] outline-none focus:border-[#c88a53]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#e6ccb2]">
                    Süre (dk) *
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    step={5}
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3.5 py-2.5 text-sm font-bold text-[#fdf8f5] outline-none focus:border-[#c88a53]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#e6ccb2]">
                  Hizmet Açıklaması
                </label>
                <textarea
                  rows={2}
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="Müşteri ekranında görünecek kısa açıklama..."
                  className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] p-3 text-xs text-[#fdf8f5] placeholder-[#e6ccb2]/40 outline-none focus:border-[#c88a53]"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#c88a53]/25 bg-[#14100d] p-3 text-xs">
                <input
                  type="checkbox"
                  checked={newServiceVip}
                  onChange={(e) => setNewServiceVip(e.target.checked)}
                  className="h-4 w-4 accent-[#c88a53]"
                />
                <span className="font-semibold text-[#e6ccb2]">
                  VIP Paket Rozeti Ekle
                </span>
              </label>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3.5 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Hizmeti Listeye Ekle</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: ÇALIŞMA SAATLERİ, MOLA, TATİL VE BERBERE ÖZEL KAPORA POLİTİKASI */}
      {activeTab === "schedule" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Berbere Özel No-Show Kapora Politikası */}
            <div className="rounded-2xl border border-[#e6ccb2]/40 bg-[#1c1613] p-5 shadow-lg shadow-[#c88a53]/15">
              <div className="flex items-center gap-2.5 border-b border-[#c88a53]/20 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c88a53]/20 text-[#e6ccb2]">
                  <ShieldAlert className="h-5 w-5 text-[#c88a53]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#fdf8f5]">
                    {currentShop.name} • Ortak Kara Liste & Kapora Politikası
                  </h3>
                  <p className="text-xs text-[#e6ccb2]/70">
                    Ortak Kara Liste Ağında yakalanan müşterilere bu dükkanda uygulanacak kural
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    updateCurrentShopDepositPolicy(
                      "require_deposit",
                      currentShop.depositAmount || 100
                    );
                    triggerToast(
                      "Kapora Politikası Güncellendi",
                      `${currentShop.name}: Kara listedeki müşterilerden ${currentShop.depositAmount} TL ön kapora istenecek.`,
                      "success"
                    );
                  }}
                  className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                    currentShop.depositPolicy === "require_deposit"
                      ? "border-[#e6ccb2]/60 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#120b07] shadow-md"
                      : "border-[#c88a53]/25 bg-[#14100d] text-[#e6ccb2]"
                  }`}
                >
                  <span className="text-xs font-black uppercase">
                    1. Ön Kapora Zorunlu Tut (Önerilen)
                  </span>
                  <span
                    className={`mt-1 text-[11px] ${
                      currentShop.depositPolicy === "require_deposit"
                        ? " font-semibold text-[#120b07]/85"
                        : "text-[#e6ccb2]/70"
                    }`}
                  >
                    Başka berberde No-Show yapmış müşteriden ön kapora alarak randevuyu onaylar.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    updateCurrentShopDepositPolicy(
                      "block_booking",
                      currentShop.depositAmount || 100
                    );
                    triggerToast(
                      "Kapora Politikası Güncellendi",
                      `${currentShop.name}: Kara listedeki numaraların online randevu alması tamamen engellendi.`,
                      "warning"
                    );
                  }}
                  className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                    currentShop.depositPolicy === "block_booking"
                      ? "border-rose-400 bg-rose-500 text-white shadow-md"
                      : "border-[#c88a53]/25 bg-[#14100d] text-[#e6ccb2]"
                  }`}
                >
                  <span className="text-xs font-black uppercase">
                    2. Online Randevuyu Tamamen Engelle
                  </span>
                  <span
                    className={`mt-1 text-[11px] ${
                      currentShop.depositPolicy === "block_booking"
                        ? "font-semibold text-white/90"
                        : "text-[#e6ccb2]/70"
                    }`}
                  >
                    Ortak Kara Listedeki müşterilerin bu dükkandan randevu almasını kapatır.
                  </span>
                </button>
              </div>

              {currentShop.depositPolicy === "require_deposit" && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#c88a53]/25 bg-[#14100d] p-3.5">
                  <span className="text-xs font-bold text-[#e6ccb2]">
                    Bu Dükkan İçin Zorunlu Ön Kapora Tutarı (TL):
                  </span>
                  <div className="flex items-center gap-2">
                    {[100, 150, 200, 300].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          updateCurrentShopDepositPolicy(
                            "require_deposit",
                            amt
                          );
                          triggerToast(
                            "Kapora Tutarı Güncellendi",
                            `${currentShop.name} ön kapora tutarı ${amt} TL olarak kaydedildi.`,
                            "success"
                          );
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-black transition ${
                          currentShop.depositAmount === amt
                            ? "border-[#e6ccb2]/60 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#120b07]"
                            : "border-[#c88a53]/25 bg-[#1c1613] text-[#e6ccb2]"
                        }`}
                      >
                        {amt} TL
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-5 transition-all hover:border-[#c88a53]/60">
              <div className="flex items-center gap-2.5 border-b border-[#c88a53]/20 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c88a53]/15 text-[#c88a53]">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#fdf8f5]">
                    Açılış - Kapanış Saatleri ve Randevu Periyodu
                  </h3>
                  <p className="text-xs text-[#e6ccb2]/70">
                    {currentShop.name} müşteri ekranındaki saat kutucukları bu
                    ayarlara göre dinamik üretilir
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#e6ccb2]">
                    Dükkan Açılış Saati
                  </label>
                  <select
                    value={shopSettings.openTime}
                    onChange={(e) => {
                      updateShopSettings({ openTime: e.target.value });
                      triggerToast(
                        "Açılış Saati Güncellendi",
                        `Yeni açılış saati (${currentShop.name}): ${e.target.value}`,
                        "success"
                      );
                    }}
                    className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-4 py-3 text-sm font-bold text-[#fdf8f5] outline-none focus:border-[#c88a53]"
                  >
                    {[
                      "08:00",
                      "08:30",
                      "09:00",
                      "09:30",
                      "10:00",
                      "10:30",
                      "11:00",
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#e6ccb2]">
                    Dükkan Kapanış Saati
                  </label>
                  <select
                    value={shopSettings.closeTime}
                    onChange={(e) => {
                      updateShopSettings({ closeTime: e.target.value });
                      triggerToast(
                        "Kapanış Saati Güncellendi",
                        `Yeni kapanış saati (${currentShop.name}): ${e.target.value}`,
                        "success"
                      );
                    }}
                    className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-4 py-3 text-sm font-bold text-[#fdf8f5] outline-none focus:border-[#c88a53]"
                  >
                    {[
                      "18:00",
                      "19:00",
                      "19:30",
                      "20:00",
                      "20:30",
                      "21:00",
                      "21:30",
                      "22:00",
                      "23:00",
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#e6ccb2]">
                  Randevu Aralık Periyodu (Saat Kutucuğu Sıklığı)
                </label>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    { mins: 15, label: "Her 15 dk" },
                    { mins: 30, label: "Her 30 dk" },
                    { mins: 45, label: "Her 45 dk" },
                    { mins: 60, label: "Her 60 dk" },
                  ].map((opt) => {
                    const isSelected = shopSettings.slotInterval === opt.mins;
                    return (
                      <button
                        key={opt.mins}
                        type="button"
                        onClick={() => {
                          updateShopSettings({ slotInterval: opt.mins });
                          triggerToast(
                            "Randevu Periyodu Değiştirildi",
                            `Saat kutucukları artık her ${opt.mins} dakikada bir üretiliyor.`,
                            "success"
                          );
                        }}
                        className={`rounded-xl border py-3 text-xs font-extrabold transition ${
                          isSelected
                            ? "border-[#e6ccb2]/60 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/20"
                            : "border-[#c88a53]/25 bg-[#14100d] text-[#e6ccb2] hover:border-[#c88a53]/60"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-5 transition-all hover:border-[#c88a53]/60">
              <div className="flex items-center justify-between border-b border-[#c88a53]/20 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c88a53]/15 text-[#c88a53]">
                    <Coffee className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#fdf8f5]">
                      Günlük Sabit Mola / Öğle Arası Saati
                    </h3>
                    <p className="text-xs text-[#e6ccb2]/70">
                      Mola saatleri müşteri ekranında &ldquo;Öğle Arası /
                      Mola&rdquo; olarak kapatılır
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateShopSettings({
                      breakEnabled: !shopSettings.breakEnabled,
                    })
                  }
                  className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                    shopSettings.breakEnabled
                      ? "bg-emerald-500 text-[#1a110b]"
                      : "bg-[#14100d] text-[#e6ccb2]/70"
                  }`}
                >
                  {shopSettings.breakEnabled ? "Mola Aktif ✓" : "Mola Kapalı"}
                </button>
              </div>

              {shopSettings.breakEnabled && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#e6ccb2]">
                      Mola Başlangıç Saati
                    </label>
                    <select
                      value={shopSettings.breakStart}
                      onChange={(e) =>
                        updateShopSettings({ breakStart: e.target.value })
                      }
                      className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-4 py-3 text-sm font-bold text-[#e6ccb2] outline-none focus:border-[#c88a53]"
                    >
                      {[
                        "12:00",
                        "12:30",
                        "13:00",
                        "13:30",
                        "14:00",
                        "14:30",
                      ].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#e6ccb2]">
                      Mola Bitiş Saati
                    </label>
                    <select
                      value={shopSettings.breakEnd}
                      onChange={(e) =>
                        updateShopSettings({ breakEnd: e.target.value })
                      }
                      className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-4 py-3 text-sm font-bold text-[#e6ccb2] outline-none focus:border-[#c88a53]"
                    >
                      {[
                        "13:00",
                        "13:30",
                        "14:00",
                        "14:30",
                        "15:00",
                        "15:30",
                      ].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-5 transition-all hover:border-[#c88a53]/60">
              <div className="flex items-center gap-2.5 border-b border-[#c88a53]/20 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
                  <CalendarOff className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#fdf8f5]">
                    Haftalık Tatil Günleri Yönetimi
                  </h3>
                  <p className="text-xs text-[#e6ccb2]/70">
                    Kapalı seçilen günlerde müşteriler randevu oluşturamaz
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-7">
                {WEEKDAYS_TR.map((day) => {
                  const isClosed = shopSettings.closedDays.includes(
                    day.dayOfWeek
                  );
                  return (
                    <button
                      key={day.dayOfWeek}
                      type="button"
                      onClick={() => {
                        toggleClosedDay(day.dayOfWeek);
                        triggerToast(
                          `${day.name} Günü Güncellendi`,
                          isClosed
                            ? `${day.name} günü randevulara açıldı.`
                            : `${day.name} günü haftalık tatil (Kapalı) olarak işaretlendi.`,
                          isClosed ? "success" : "warning"
                        );
                      }}
                      className={`flex flex-col items-center justify-center rounded-xl border p-3 transition ${
                        isClosed
                          ? "border-rose-500/60 bg-rose-950/30 text-rose-300"
                          : "border-emerald-500/30 bg-emerald-950/15 text-emerald-300 hover:border-emerald-500/60"
                      }`}
                    >
                      <span className="text-xs font-extrabold">{day.name}</span>
                      <span
                        className={`mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-black ${
                          isClosed
                            ? "bg-rose-500 text-white"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {isClosed ? "KAPALI" : "AÇIK"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#c88a53]/45 bg-[#1c1613] p-5 shadow-lg shadow-[#c88a53]/20">
            <h3 className="text-sm font-extrabold text-[#e6ccb2]">
              {currentShop.name} • Takvim Önizlemesi ({previewSlots.length} Saat)
            </h3>
            <p className="mt-1 text-xs text-[#e6ccb2]/75">
              {shopSettings.openTime} - {shopSettings.closeTime} arası{" "}
              <strong>{shopSettings.slotInterval} dk</strong> periyotlarla
              üretilen gerçek zamanlı müşteri ekranı önizlemesi:
            </p>

            <div className="mt-4 grid max-h-[460px] grid-cols-3 gap-2 overflow-y-auto pr-1">
              {previewSlots.map((slot) => (
                <div
                  key={slot.time}
                  className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center ${
                    slot.state === "break"
                      ? "border-[#c88a53]/15 bg-[#14100d] text-[#e6ccb2]/50"
                      : slot.state === "booked"
                      ? "border-[#c88a53]/45 bg-[#c88a53]/15 text-[#e6ccb2]"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  <span className="text-xs font-extrabold">{slot.time}</span>
                  <span className="mt-0.5 text-[9px] font-bold uppercase">
                    {slot.state === "break"
                      ? "Mola"
                      : slot.state === "booked"
                      ? "Dolu"
                      : "Müsait"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: KARA LİSTEYE ALMA & KAPORA BELİRLEME ONAY MODALI */}
      <AnimatePresence>
        {noShowConfirmModal.isOpen && noShowConfirmModal.appointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() =>
                setNoShowConfirmModal({
                  isOpen: false,
                  appointment: null,
                  depositAmount: 100,
                })
              }
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
                    Kara Listeye Ekleme Onayı
                  </h3>
                  <p className="text-xs text-rose-300/80">
                    Müşteri Ortak No-Show Kalkanı Ağına eklenecektir
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-950/20 p-3.5 text-xs text-[#e6ccb2]">
                <p className="font-semibold text-[#fdf8f5]">
                  Bu müşteriyi kara listeye almak istediğinize emin misiniz?
                </p>
                <div className="mt-2 space-y-1 text-[11px] text-[#e6ccb2]/80">
                  <p>
                    • <strong>Müşteri:</strong>{" "}
                    {noShowConfirmModal.appointment.customerName}
                  </p>
                  <p>
                    • <strong>Telefon:</strong>{" "}
                    {noShowConfirmModal.appointment.customerPhone}
                  </p>
                  <p>
                    • <strong>Randevu Saati:</strong>{" "}
                    {noShowConfirmModal.appointment.time} (
                    {noShowConfirmModal.appointment.totalPrice} TL)
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs font-bold text-[#e6ccb2]">
                  Tekrar Randevu Alırken Talep Edilecek Ön Kapora (TL)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={noShowConfirmModal.depositAmount}
                    onChange={(e) =>
                      setNoShowConfirmModal((prev) => ({
                        ...prev,
                        depositAmount: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full rounded-xl border border-[#c88a53]/40 bg-[#14100d] px-3.5 py-2.5 text-sm font-bold text-[#fdf8f5] outline-none focus:border-rose-400"
                    placeholder="100"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-2.5 text-xs font-bold text-[#e6ccb2]/60">
                    TL
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#e6ccb2]/60">
                  Bu numara sonraki randevularında belirlenen bu kapora tutarını ödemek zorunda kalacaktır.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setNoShowConfirmModal({
                      isOpen: false,
                      appointment: null,
                      depositAmount: 100,
                    })
                  }
                  className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-4 py-2.5 text-xs font-bold text-[#e6ccb2] transition hover:bg-[#251e19]"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNoShow}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-900/30 transition hover:bg-rose-500"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Evet, Kara Listeye Ekle</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: KARA LİSTEDEN ÇIKARMA (AFFET / GERİ AL) ONAY MODALI */}
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
                    Müşterinin kısıtlaması kaldırılacaktır
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3.5 text-xs text-[#e6ccb2]">
                <p className="font-semibold text-[#fdf8f5]">
                  Bu müşteriyi kara listeden çıkarmak istediğinize emin misiniz?
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
                  Müşteri artık kapora zorunluluğu olmadan dilediği gibi randevu alabilir ve var olan No-Show randevusu normal durumuna geri döndürülür.
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
      </div>
    </AdminPinGate>
  );
}
