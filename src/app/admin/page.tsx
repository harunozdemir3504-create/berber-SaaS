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
} from "lucide-react";
import { useBarber } from "@/context/BarberContext";
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
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    subtitle: string;
    type: "success" | "warning" | "whatsapp";
  } | null>(null);

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
  }, [currentShopSlug]);

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

  const handleNoShow = (apt: Appointment) => {
    const result = markAppointmentNoShow(apt.id);
    if (result.notifiedWaitlist) {
      triggerToast(
        `Ortak Kara Listeye Eklendi & Yedek Liste Devreye Girdi!`,
        `${apt.customerName} (${apt.customerPhone}) Ortak Güvenlik Ağına (${currentShop.name} bildirimiyle) eklendi. Yedek listedeki ${result.notifiedWaitlist.customerName} adlı müşteriye otomatik WhatsApp daveti gönderildi!`,
        "warning"
      );
    } else {
      triggerToast(
        `${apt.customerName} Ortak Kara Liste Ağına Alındı (No-Show)`,
        `${apt.customerPhone} numarası artık tüm üye berber dükkanlarında No-Show olarak işaretlendi!`,
        "warning"
      );
    }
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
    <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
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

      {/* PERSISTENT CUSTOMER CANCELLATION / WAITLIST ALERTS AT THE VERY TOP */}
      <AnimatePresence>
        {adminAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mb-6 space-y-3"
          >
            {adminAlerts.map((alert) => (
              <div
                key={alert.id}
                className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border-2 border-[#c88a53] bg-gradient-to-r from-[#c88a53]/25 via-[#241b16] to-[#1c1613] p-4 shadow-lg shadow-[#c88a53]/25 sm:flex-row sm:items-center sm:p-5"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/25">
                    <BellRing className="h-6 w-6 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#1a110b]">
                        OTOMATİK YEDEK LİSTE BİLDİRİMİ ({currentShop.name})
                      </span>
                      <span className="text-xs text-[#e6ccb2]">
                        {alert.timestamp}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-extrabold text-[#fdf8f5]">
                      {alert.message}
                    </h3>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => dismissAdminAlert(alert.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#c88a53]/40 bg-[#14100d] px-3 py-2 text-xs font-bold text-[#e6ccb2] hover:bg-[#221a15]"
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
            className={`mb-6 flex items-start justify-between gap-4 rounded-2xl border p-4 shadow-2xl ${
              toastMessage.type === "warning"
                ? "border-[#c88a53]/60 bg-gradient-to-r from-[#281d15] via-[#1c1613] to-[#14100d] text-[#e6ccb2] shadow-[#c88a53]/20"
                : toastMessage.type === "whatsapp"
                ? "border-emerald-500/60 bg-gradient-to-r from-emerald-950/90 via-[#1c1613] to-[#14100d] text-emerald-200"
                : "border-emerald-500/50 bg-[#1c1613] text-[#fdf8f5]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  toastMessage.type === "warning"
                    ? "bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b]"
                    : "bg-emerald-500 text-[#1a110b]"
                }`}
              >
                {toastMessage.type === "warning" ? (
                  <BellRing className="h-5 w-5" />
                ) : toastMessage.type === "whatsapp" ? (
                  <MessageSquare className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#fdf8f5]">
                  {toastMessage.title}
                </h4>
                <p className="mt-0.5 text-xs text-[#e6ccb2]/85">
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
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-[#c88a53]/30 bg-gradient-to-r from-[#241b16] via-[#1c1613] to-[#14100d] p-5 shadow-lg shadow-[#c88a53]/10 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#1a110b] shadow-sm">
              BERBER YÖNETİM PANELİ
            </span>
            <span className="rounded-lg border border-[#c88a53]/35 bg-[#14100d] px-2.5 py-0.5 font-mono text-xs font-bold text-[#e6ccb2]">
              /?shop={currentShop.slug}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                currentShop.subscriptionStatus === "active"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-rose-500/20 text-rose-300"
              }`}
            >
              {currentShop.subscriptionStatus === "active"
                ? "Abonelik: Aktif"
                : "Abonelik: Askıda"}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#fdf8f5] sm:text-3xl">
            {currentShop.name}{" "}
            <span className="bg-gradient-to-r from-[#e6ccb2] via-[#c88a53] to-[#b47b48] bg-clip-text text-lg font-bold text-transparent sm:text-2xl">
              • İzole Salon Kontrol Merkezi
            </span>
          </h1>
          <p className="mt-1 text-xs text-[#e6ccb2]/75">
            Burada yaptığınız tüm fiyat, koltuk, saat ve kapora değişiklikleri yalnızca{" "}
            <strong className="text-[#fdf8f5]">{currentShop.name}</strong> vitrinine kaydedilir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c88a53]/45 bg-[#14100d] px-4 py-3 text-xs font-extrabold text-[#e6ccb2] shadow-sm transition hover:border-[#e6ccb2]/70 hover:bg-[#241b16] hover:text-[#fdf8f5]"
          >
            <QrCode className="h-4 w-4 text-[#c88a53]" />
            <span>QR Ayna Afişi Al</span>
          </button>

          <button
            type="button"
            onClick={handleCopyBookingLink}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-4 py-3 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110"
          >
            {copiedShareLink ? (
              <>
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Randevu Linki Kopyalandı! (/?shop={currentShop.slug})</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 stroke-[2.5]" />
                <span>Instagram/WhatsApp Randevu Linkini Kopyala</span>
              </>
            )}
          </button>

          <Link
            href={`/?shop=${currentShop.slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c88a53]/40 bg-[#14100d] px-4 py-3 text-xs font-extrabold text-[#e6ccb2] transition hover:border-[#e6ccb2]/60 hover:bg-[#241b16]"
          >
            <ExternalLink className="h-4 w-4 text-[#c88a53]" />
            <span>Müşteri Vitrinini Gör</span>
          </Link>
        </div>
      </div>

      {/* GELİR KORUMA ÖZETİ CARDS */}
      <section aria-label="Gelir Koruma Özeti" className="mb-7">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <motion.div
            layout
            className="relative overflow-hidden rounded-2xl border border-[#c88a53]/45 bg-gradient-to-br from-[#261d17] via-[#1c1613] to-[#14100d] p-5 shadow-lg shadow-[#c88a53]/20 transition-all hover:border-[#c88a53]/70"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#e6ccb2]">
                Bu Ay Kurtarılan Gelir ({currentShop.name})
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c88a53]/20 text-[#e6ccb2] ring-1 ring-[#c88a53]/35">
                <TrendingUp className="h-5 w-5 text-[#c88a53]" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="bg-gradient-to-r from-[#fdf8f5] via-[#e6ccb2] to-[#c88a53] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
                {stats.savedRevenue.toLocaleString("tr-TR")} TL
              </span>
            </div>
            <p className="mt-2 text-xs text-[#e6ccb2]/70">
              Kapora ve yedek liste ile boş kalmaktan kurtarılan aylık ciro
            </p>
          </motion.div>

          <motion.div
            layout
            className="relative overflow-hidden rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-5 shadow-lg transition-all hover:border-[#c88a53]/60"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#e6ccb2]">
                Yedek Listeden Dolan Koltuk
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-[#fdf8f5]">
                {stats.waitlistFilled}
              </span>
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                %100 Doluluk
              </span>
            </div>
            <p className="mt-2 text-xs text-[#e6ccb2]/70">
              İptal edilen saatlerin otomatik WhatsApp bildirimi ile dolma
              sayısı
            </p>
          </motion.div>

          <motion.div
            layout
            className="relative overflow-hidden rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-5 shadow-lg transition-all hover:border-[#c88a53]/60"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#e6ccb2]">
                Engellenen No-Show & Ortak Kalkan
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-[#fdf8f5]">
                {stats.preventedNoShows}
              </span>
              <span className="rounded-md border border-[#c88a53]/30 bg-[#c88a53]/15 px-2 py-0.5 text-[11px] font-bold text-[#e6ccb2]">
                {currentShop.depositAmount} TL Kapora Koruması
              </span>
            </div>
            <p className="mt-2 text-xs text-[#e6ccb2]/70">
              Ortak Kara Liste Ağı ({globalBlacklist.length} numara) ile önlenen
              gelmeme vakası
            </p>
          </motion.div>
        </div>
      </section>

      {/* ADMIN NAVIGATION TABS (4 MAJOR SECTIONS) — High Contrast Text + Thin Bright Border (`border-[#e6ccb2]/50`) */}
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-[#c88a53]/30 bg-[#14100d] p-2 shadow-lg shadow-[#c88a53]/10 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setActiveTab("appointments")}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs transition-all sm:text-sm ${
            activeTab === "appointments"
              ? "border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black text-[#120b07] shadow-lg shadow-[#c88a53]/25"
              : "border-transparent font-bold text-[#e6ccb2]/80 hover:border-[#c88a53]/30 hover:bg-[#1c1613] hover:text-[#fdf8f5]"
          }`}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 stroke-[2.5]" />
          <span>
            1. Randevu Akışı (
            {appointments.filter((a) => a.status !== "cancelled").length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("barbers")}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs transition-all sm:text-sm ${
            activeTab === "barbers"
              ? "border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black text-[#120b07] shadow-lg shadow-[#c88a53]/25"
              : "border-transparent font-bold text-[#e6ccb2]/80 hover:border-[#c88a53]/30 hover:bg-[#1c1613] hover:text-[#fdf8f5]"
          }`}
        >
          <Armchair className="h-4 w-4 shrink-0 stroke-[2.5]" />
          <span>2. Koltuk & Çalışanlar ({barbers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("services")}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs transition-all sm:text-sm ${
            activeTab === "services"
              ? "border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black text-[#120b07] shadow-lg shadow-[#c88a53]/25"
              : "border-transparent font-bold text-[#e6ccb2]/80 hover:border-[#c88a53]/30 hover:bg-[#1c1613] hover:text-[#fdf8f5]"
          }`}
        >
          <Scissors className="h-4 w-4 shrink-0 stroke-[2.5]" />
          <span>3. Hizmet & Fiyatlar ({services.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs transition-all sm:text-sm ${
            activeTab === "schedule"
              ? "border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black text-[#120b07] shadow-lg shadow-[#c88a53]/25"
              : "border-transparent font-bold text-[#e6ccb2]/80 hover:border-[#c88a53]/30 hover:bg-[#1c1613] hover:text-[#fdf8f5]"
          }`}
        >
          <Settings className="h-4 w-4 shrink-0 stroke-[2.5]" />
          <span>4. Saatler, Mola & Kapora</span>
        </button>
      </div>

      {/* TAB 1: GÜNLÜK RANDEVU AKIŞI */}
      {activeTab === "appointments" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-4 transition-all hover:border-[#c88a53]/60">
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#c88a53]" />
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
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e6ccb2] opacity-70" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[#fdf8f5]" />
                  </span>
                  <Plus className="h-4 w-4 stroke-[3]" />
                  <span>Hızlı Randevu / Saat Kapat</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Filter className="mr-1 h-3.5 w-3.5 text-[#c88a53]" />
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
                        ? "border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black text-[#120b07] shadow-sm shadow-[#c88a53]/20"
                        : "border-transparent bg-[#14100d] text-[#e6ccb2]/75 hover:text-[#fdf8f5]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-8 text-center">
                <CalendarIcon className="mx-auto h-8 w-8 text-[#c88a53]" />
                <h3 className="mt-2 text-base font-bold text-[#fdf8f5]">
                  Bu Filtrede Randevu Bulunmuyor
                </h3>
                <p className="mt-1 text-xs text-[#e6ccb2]/70">
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
                        className="flex flex-col justify-between gap-3 rounded-2xl border border-dashed border-[#c88a53]/50 bg-[repeating-linear-gradient(135deg,#1c1613,#1c1613_10px,#18120f_10px,#18120f_20px)] p-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="flex min-w-[74px] flex-col items-center justify-center rounded-xl border border-[#c88a53]/40 bg-[#14100d] px-2.5 py-2 text-center text-[#e6ccb2]">
                            <Lock className="mb-0.5 h-3.5 w-3.5 text-[#c88a53]" />
                            <span className="text-sm font-extrabold leading-none">{apt.time}</span>
                            <span className="mt-1 text-[10px] opacity-80">{apt.endTime}</span>
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-[#e6ccb2]/40 bg-[#c88a53]/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#e6ccb2]">
                                Saat Kapatıldı
                              </span>
                              <h3 className="text-sm font-extrabold text-[#fdf8f5]">
                                {apt.blockReason}
                              </h3>
                            </div>
                            <p className="mt-1 text-xs text-[#e6ccb2]/75">
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
                          ? "border-emerald-500/30 bg-[#14100d]/85"
                          : isNoShow || isCancelled
                          ? "border-rose-500/40 bg-rose-950/15"
                          : "border-[#c88a53]/25 bg-[#1c1613] hover:border-[#c88a53]/60"
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
                                : "border-[#c88a53]/40 bg-[#c88a53]/15 text-[#e6ccb2]"
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
                              <span className="rounded border border-[#c88a53]/35 bg-[#14100d] px-2 py-0.5 font-mono text-xs font-bold text-[#e6ccb2]">
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
                                <span className="inline-flex items-center gap-1 rounded-full border border-[#e6ccb2]/40 bg-[#c88a53]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#e6ccb2]">
                                  <PhoneCall className="h-3 w-3 text-[#c88a53]" />
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

                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#e6ccb2]/75">
                              <span className="inline-flex items-center gap-1 font-medium text-[#fdf8f5]">
                                <Phone className="h-3 w-3 text-[#c88a53]" />
                                {apt.customerPhone}
                              </span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 text-[#e6ccb2]">
                                <Scissors className="h-3 w-3 text-[#c88a53]" />
                                {apt.barberName} ({apt.chairLabel})
                              </span>
                            </div>

                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              {apt.services.map((srv, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-lg border border-[#c88a53]/25 bg-[#14100d] px-2.5 py-1 text-xs font-medium text-[#fdf8f5]"
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

                        <div className="flex flex-row items-center justify-between border-t border-[#c88a53]/20 pt-2.5 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                          <div className="bg-gradient-to-r from-[#e6ccb2] to-[#c88a53] bg-clip-text text-lg font-extrabold text-transparent">
                            {apt.totalPrice} TL
                          </div>
                          <div className="text-xs text-[#e6ccb2]/70">
                            {apt.totalDuration} dk
                          </div>
                          {apt.depositAmount && (
                            <span className="mt-1 rounded bg-[#c88a53]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#e6ccb2]">
                              {apt.depositAmount} TL Kapora Alındı
                            </span>
                          )}
                        </div>
                      </div>

                      {!isCancelled && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#c88a53]/20 pt-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={isCompleted}
                              onClick={() => handleComplete(apt)}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                                isCompleted
                                  ? "cursor-default bg-emerald-500/20 text-emerald-400 opacity-60"
                                  : "bg-emerald-500 text-[#1a110b] shadow-sm hover:bg-emerald-400"
                              }`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                              <span>Geldi (Tamamla)</span>
                            </button>

                            <button
                              type="button"
                              disabled={isNoShow}
                              onClick={() => handleNoShow(apt)}
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
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSendReminder(apt)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                              apt.reminderSent
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                : "border-[#c88a53]/35 bg-[#14100d] text-[#e6ccb2] hover:border-[#c88a53]/70 hover:text-[#fdf8f5]"
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
            <div className="rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-5 transition-all hover:border-[#c88a53]/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-[#c88a53]" />
                  <h3 className="text-sm font-bold text-[#fdf8f5]">
                    Akıllı Yedek Liste ({waitlist.length})
                  </h3>
                </div>
                <span className="rounded-full bg-[#c88a53]/20 px-2 py-0.5 text-[10px] font-bold text-[#e6ccb2]">
                  Otomatik Bildirim
                </span>
              </div>
              <p className="mt-1 text-xs text-[#e6ccb2]/70">
                {currentShop.name} dolu saatleri için sıra bekleyen müşteriler.
              </p>

              <div className="mt-4 space-y-3">
                {waitlist.map((wl) => (
                  <div
                    key={wl.id}
                    className="rounded-xl border border-[#c88a53]/25 bg-[#14100d] p-3.5 text-xs transition hover:border-[#c88a53]/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#fdf8f5]">
                        {wl.customerName}
                      </span>
                      <span className="rounded bg-[#c88a53]/20 px-2 py-0.5 font-bold text-[#e6ccb2]">
                        {wl.requestedDateLabel} • {wl.requestedTime}
                      </span>
                    </div>
                    <p className="mt-1 text-[#e6ccb2]/75">
                      {wl.barberName} • {wl.servicesSummary} ({wl.totalPrice}{" "}
                      TL)
                    </p>
                    <div className="mt-2.5 flex items-center justify-between border-t border-[#c88a53]/20 pt-2">
                      <span className="text-[11px] text-[#e6ccb2]/60">
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
                          className="rounded-lg border border-[#e6ccb2]/40 bg-[#c88a53]/20 px-2.5 py-1 font-bold text-[#e6ccb2] transition hover:bg-gradient-to-r hover:from-[#b47b48] hover:via-[#c88a53] hover:to-[#9a6334] hover:text-[#1a110b]"
                        >
                          WhatsApp ile Çağır
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-5 transition-all hover:border-[#c88a53]/60">
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
              <p className="mt-1 text-xs text-[#e6ccb2]/70">
                Tüm üye berber dükkanları arasında ortak paylaşılan No-Show
                veritabanı.
              </p>

              <div className="mt-4 max-h-96 space-y-2.5 overflow-y-auto pr-1">
                {globalBlacklist.map((entry, idx) => (
                  <div
                    key={`${entry.phone}-${idx}`}
                    className="rounded-xl border border-rose-500/25 bg-rose-950/15 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-rose-300">
                        {entry.phone}
                      </span>
                      <span className="rounded bg-[#14100d] px-2 py-0.5 text-[10px] font-bold text-[#e6ccb2]">
                        Bildiren: {entry.reportedByShopName}
                      </span>
                    </div>
                    <p className="mt-1 font-semibold text-[#fdf8f5]">
                      {entry.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#e6ccb2]/70">
                      {entry.missedDate} ({entry.missedService})
                    </p>
                  </div>
                ))}
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
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-4 transition-all hover:border-[#c88a53]/60">
              <div>
                <h2 className="text-base font-bold text-[#fdf8f5]">
                  {currentShop.name} • Koltuklar, Çalışanlar & Özel Fiyatlar (
                  {barbers.length})
                </h2>
                <p className="text-xs text-[#e6ccb2]/70">
                  Her çalışan/koltuk için hizmet bazında özel fiyat
                  tanımlayabilirsiniz. Yalnızca bu dükkana (`{currentShop.slug}`)
                  uygulanır.
                </p>
              </div>
              <span className="rounded-lg border border-[#c88a53]/40 bg-[#c88a53]/15 px-2.5 py-1 text-xs font-bold text-[#e6ccb2]">
                İzole Dükkan Kadrosu
              </span>
            </div>

            <div className="space-y-4">
              {barbers.map((barber) => {
                const isEditing = editingBarberId === barber.id;
                const customCount = barber.customPrices
                  ? Object.keys(barber.customPrices).length
                  : 0;

                return (
                  <div
                    key={barber.id}
                    className={`rounded-2xl border p-5 transition-all ${
                      isEditing
                        ? "border-[#e6ccb2]/60 bg-[#241b16] shadow-lg shadow-[#c88a53]/20"
                        : "border-[#c88a53]/25 bg-[#1c1613] hover:border-[#c88a53]/60"
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[#c88a53]/25 pb-3">
                          <h3 className="text-sm font-extrabold text-[#e6ccb2]">
                            Çalışan, Koltuk & Özel Fiyat Düzenle: {barber.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setEditingBarberId(null)}
                            className="text-xs text-[#e6ccb2]/75 hover:text-[#fdf8f5]"
                          >
                            Kapat
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-[#e6ccb2]/80">
                              Çalışan / Usta Adı
                            </label>
                            <input
                              type="text"
                              value={editBarberName}
                              onChange={(e) =>
                                setEditBarberName(e.target.value)
                              }
                              className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-sm font-bold text-[#fdf8f5] outline-none focus:border-[#c88a53]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-[#c88a53]">
                              Berber Koltuğu Adı / Numarası
                            </label>
                            <input
                              type="text"
                              value={editBarberChair}
                              onChange={(e) =>
                                setEditBarberChair(e.target.value)
                              }
                              className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-sm font-bold text-[#e6ccb2] outline-none focus:border-[#c88a53]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-[#e6ccb2]/80">
                              Ünvan / Rol
                            </label>
                            <input
                              type="text"
                              value={editBarberRole}
                              onChange={(e) =>
                                setEditBarberRole(e.target.value)
                              }
                              className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-xs text-[#fdf8f5] outline-none focus:border-[#c88a53]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-[#e6ccb2]/80">
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
                                className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-xs text-[#fdf8f5] outline-none focus:border-[#c88a53]"
                              />
                              <input
                                type="text"
                                value={editBarberBadge}
                                onChange={(e) =>
                                  setEditBarberBadge(e.target.value)
                                }
                                placeholder="Master Barber"
                                className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-xs text-[#e6ccb2] outline-none focus:border-[#c88a53]"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Custom Per-Service Price Inputs for this Barber */}
                        <div className="rounded-xl border border-[#c88a53]/35 bg-[#14100d] p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#e6ccb2]">
                              <BadgeDollarSign className="h-4 w-4 text-[#c88a53]" />
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
                                className="rounded-lg bg-[#c88a53]/20 px-2 py-1 text-[10px] font-bold text-[#e6ccb2] hover:bg-gradient-to-r hover:from-[#b47b48] hover:via-[#c88a53] hover:to-[#9a6334] hover:text-[#1a110b]"
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
                                className="rounded-lg border border-[#c88a53]/25 bg-[#1c1613] px-2 py-1 text-[10px] font-semibold text-[#e6ccb2]"
                              >
                                Standart Fiyatlara Eşitle
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {services.map((srv) => (
                              <div
                                key={srv.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-[#c88a53]/20 bg-[#1c1613] px-3 py-2"
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
                                    className="w-20 rounded-lg border border-[#c88a53]/30 bg-[#14100d] px-2.5 py-1.5 text-right text-xs font-extrabold text-[#e6ccb2] outline-none focus:border-[#c88a53]"
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
                            className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-4 py-2 text-xs font-semibold text-[#e6ccb2]"
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
                              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${barber.avatarGradient} text-base font-extrabold text-[#fdf8f5] ring-1 ring-[#c88a53]/35`}
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
                                <span className="inline-flex items-center gap-1 rounded-full border border-[#c88a53]/40 bg-[#c88a53]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#e6ccb2]">
                                  <Armchair className="h-3 w-3 text-[#c88a53]" />
                                  {barber.chairName}
                                </span>
                                {customCount > 0 ? (
                                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                                    {customCount} Hizmette Kişiye Özel Fiyat
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-[#14100d] px-2.5 py-0.5 text-[10px] font-semibold text-[#e6ccb2]/70">
                                    Standart Salon Fiyatı
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-[#e6ccb2]/75">
                                {barber.role} • {barber.experience}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-start">
                            <button
                              type="button"
                              onClick={() => startEditBarber(barber)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#c88a53]/40 bg-[#c88a53]/15 px-3.5 py-2 text-xs font-bold text-[#e6ccb2] transition hover:bg-gradient-to-r hover:from-[#b47b48] hover:via-[#c88a53] hover:to-[#9a6334] hover:text-[#1a110b]"
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
                        <div className="mt-4 rounded-xl border border-[#c88a53]/20 bg-[#14100d] p-3.5">
                          <div className="mb-2 flex items-center justify-between text-[11px]">
                            <span className="font-bold uppercase tracking-wider text-[#e6ccb2]/80">
                              Bu Koltuğun / Çalışanın Hizmet Fiyat Tarifesi:
                            </span>
                            <span className="text-[#c88a53]">
                              Bronz/Karamel renkli olanlar bu ustaya özel
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
                                      ? "border-[#c88a53]/50 bg-[#c88a53]/15 text-[#fdf8f5]"
                                      : "border-[#c88a53]/15 bg-[#1c1613] text-[#e6ccb2]/80"
                                  }`}
                                >
                                  <span className="truncate pr-2 font-medium">
                                    {srv.name}
                                  </span>
                                  <span
                                    className={`shrink-0 font-extrabold ${
                                      isCustom
                                        ? "text-[#e6ccb2]"
                                        : "text-[#fdf8f5]"
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
            <div className="flex items-center justify-between rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-4 transition-all hover:border-[#c88a53]/60">
              <div>
                <h2 className="text-base font-bold text-[#fdf8f5]">
                  {currentShop.name} • Hizmetler & Standart Salon Fiyatları (
                  {services.length})
                </h2>
                <p className="text-xs text-[#e6ccb2]/70">
                  Burada yaptığınız fiyat ve süre değişiklikleri sadece{" "}
                  <strong>/?shop={currentShop.slug}</strong> vitrinine yansır.
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
                        : "border-[#c88a53]/25 bg-[#1c1613] hover:border-[#c88a53]/60"
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="sm:col-span-1">
                            <label className="mb-1 block text-[11px] font-bold text-[#e6ccb2]/80">
                              Hizmet Adı
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-sm font-bold text-[#fdf8f5] outline-none focus:border-[#c88a53]"
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
                              className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-sm font-extrabold text-[#e6ccb2] outline-none focus:border-[#c88a53]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-[#e6ccb2]/80">
                              Süre (Dakika)
                            </label>
                            <input
                              type="number"
                              value={editDuration}
                              onChange={(e) =>
                                setEditDuration(Number(e.target.value))
                              }
                              className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-sm font-bold text-[#fdf8f5] outline-none focus:border-[#c88a53]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-[#e6ccb2]/80">
                            Açıklama
                          </label>
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-xs text-[#e6ccb2] outline-none focus:border-[#c88a53]"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingServiceId(null)}
                            className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3.5 py-2 text-xs font-semibold text-[#e6ccb2]"
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
                              <span className="rounded-full border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-2 py-0.5 text-[10px] font-black text-[#1a110b]">
                                VIP
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[#e6ccb2]/70">
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
                              className="rounded-lg border border-[#c88a53]/35 bg-[#c88a53]/15 px-2.5 py-1 text-[11px] font-bold text-[#e6ccb2] transition hover:bg-gradient-to-r hover:from-[#b47b48] hover:via-[#c88a53] hover:to-[#9a6334] hover:text-[#1a110b]"
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
                              className="rounded-lg border border-[#c88a53]/25 bg-[#14100d] px-2.5 py-1 text-[11px] font-semibold text-[#e6ccb2] hover:border-[#c88a53]/60"
                            >
                              +15 dk Süre Ekle
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 border-t border-[#c88a53]/20 pt-3 sm:border-0 sm:pt-0">
                          <div className="text-right">
                            <div className="bg-gradient-to-r from-[#e6ccb2] to-[#c88a53] bg-clip-text text-xl font-extrabold text-transparent">
                              {srv.price} TL
                            </div>
                            <div className="text-xs font-semibold text-[#e6ccb2]/70">
                              {srv.duration} dk
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditService(srv)}
                              className="inline-flex items-center gap-1 rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-xs font-bold text-[#e6ccb2] transition hover:border-[#c88a53] hover:text-[#fdf8f5]"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
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
    </div>
  );
}
