"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors,
  Sparkles,
  Star,
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  CreditCard,
  MessageSquare,
  BellRing,
  User,
  Phone,
  Crown,
  Lock,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Search,
  X,
  CalendarX2,
  RefreshCw,
  Copy,
  Ban,
  ChevronDown,
} from "lucide-react";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import {
  readPersistentSession,
  PWA_INSTALL_ROLE_KEY,
} from "@/components/AdminPinGate";
import {
  DAYS_METADATA,
  Barber,
  Service,
  DayMetadata,
  TimeSlot,
  Appointment,
} from "@/data/mockData";
import {
  useBarber,
  normalizePhone,
  formatPhoneForWhatsApp,
  buildWhatsAppUrl,
  DEFAULT_SHOP_WHATSAPP_PHONE,
  minutesToTime,
  timeToMinutes,
} from "@/context/BarberContext";

type VerificationStage =
  | "idle"
  | "checking_trust"
  | "deposit_required"
  | "processing_deposit"
  | "whatsapp_otp"
  | "confirmed";

export default function CustomerBookingPage() {
  const router = useRouter();
  const {
    shops,
    currentShop,
    currentShopSlug,
    currentShopExists,
    hydrated,
    barbers,
    services,
    shopSettings,
    addAppointment,
    addWaitlistEntry,
    isPhoneBlacklisted,
    getSlotsForDay,
    getServicePriceForBarber,
  } = useBarber();

  // Akıllı PWA & Oturum Yönlendirmesi (Berber vs Müşteri Ayrımı):
  // - Normal müşteri ana sayfadan (/) girdiğinde veya PWA'yı (/) üzerinden kurduğunda doğrudan randevu ekranında kalır.
  // - Eğer kullanıcı daha önce /admin üzerinden berber olarak giriş yapmışsa ("Beni Hatırla" aktifse)
  //   veya PWA'yı /admin sayfasındayken kurmuşsa, kendi yönetim paneline (/admin) yönlendirilir.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") === "1") {
      return;
    }

    const savedSession = readPersistentSession();
    if (savedSession) {
      const rememberedShop = shops.find(
        (s) => s.slug.toLowerCase() === savedSession.shopSlug.toLowerCase()
      );
      const currentPin = (rememberedShop?.adminPin || "1234").trim();
      if (rememberedShop && savedSession.pinSnapshot === currentPin) {
        router.replace(`/admin?shop=${rememberedShop.slug}`);
        return;
      }
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) {
      try {
        const installedRole = localStorage.getItem(PWA_INSTALL_ROLE_KEY);
        if (installedRole === "admin") {
          router.replace("/admin");
        }
      } catch {
        // ignore storage errors
      }
    }
  }, [hydrated, shops, router]);

  // Wizard Step (1 to 4)
  const [step, setStep] = useState<number>(1);

  // Compact Mobile UX Accordion States
  const [expandedBarberId, setExpandedBarberId] = useState<string | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  // Step 1: Barber Selection
  const [selectedBarberId, setSelectedBarberId] = useState<string>("any");
  const [barberSearchQuery, setBarberSearchQuery] = useState<string>("");

  // Reset wizard when switching tenant shop slug
  useEffect(() => {
    setStep(1);
    setSelectedBarberId("any");
    setBarberSearchQuery("");
    setSelectedSlot(null);
    setIsWaitlistMode(false);
    setStage("idle");
    setConfirmedAppointment(null);
  }, [currentShopSlug]);

  const filteredBarbers = useMemo(() => {
    const q = barberSearchQuery.trim().toLocaleLowerCase("tr-TR");
    if (!q) return barbers;
    return barbers.filter((b) => {
      const name = (b.name || "").toLocaleLowerCase("tr-TR");
      const role = (b.role || "").toLocaleLowerCase("tr-TR");
      const chair = (b.chairName || "").toLocaleLowerCase("tr-TR");
      const specs = (b.specialties || [])
        .map((s) => s.toLocaleLowerCase("tr-TR"))
        .join(" ");
      const isAny = b.isAnyOption;
      const anyMatch =
        isAny &&
        "fark etmez en erken ilk musait herhangi otomatik".includes(q);
      return (
        name.includes(q) ||
        role.includes(q) ||
        chair.includes(q) ||
        specs.includes(q) ||
        anyMatch
      );
    });
  }, [barbers, barberSearchQuery]);

  const selectedBarber = useMemo(
    () => barbers.find((b) => b.id === selectedBarberId) || barbers[0] || null,
    [barbers, selectedBarberId]
  );

  // Step 2: Services Selection (Multi-select)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedServiceIds((prev) => {
      const valid = prev.filter((id) => services.some((s) => s.id === id));
      if (valid.length === 0 && services.length > 0) {
        return [services[0].id];
      }
      return valid;
    });
  }, [services]);

  // Step 3: Date & Time Selection
  const [selectedDay, setSelectedDay] = useState<DayMetadata>(DAYS_METADATA[0]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isWaitlistMode, setIsWaitlistMode] = useState<boolean>(false);

  // Step 4: Customer Info & Confirmation
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [stage, setStage] = useState<VerificationStage>("idle");
  const [otpCode, setOtpCode] = useState<string>("8492");
  const [cardNumber, setCardNumber] = useState<string>("4543 •••• •••• 8890");
  const [formError, setFormError] = useState<string>("");
  const [confirmedAppointment, setConfirmedAppointment] =
    useState<Appointment | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const currentDaySlots = useMemo(
    () => getSlotsForDay(selectedDay.id),
    [getSlotsForDay, selectedDay.id]
  );

  const isSelectedDayClosed = useMemo(
    () => shopSettings.closedDays.includes(selectedDay.dayOfWeek),
    [shopSettings.closedDays, selectedDay.dayOfWeek]
  );

  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );

  const totalPrice = useMemo(
    () =>
      selectedServices.reduce(
        (sum, item) => sum + getServicePriceForBarber(item, selectedBarber),
        0
      ),
    [selectedServices, selectedBarber, getServicePriceForBarber]
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, item) => sum + item.duration, 0),
    [selectedServices]
  );

  const blacklistRecord = useMemo(
    () => isPhoneBlacklisted(customerPhone),
    [customerPhone, isPhoneBlacklisted]
  );

  const isNoShowPhone = Boolean(blacklistRecord);
  const requiredDepositAmount = currentShop.depositAmount || 100;
  const isBlockedByShopPolicy =
    currentShop.depositPolicy === "block_booking" && isNoShowPhone;

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    if (slot.state === "break") return;
    setSelectedSlot(slot);
    setIsWaitlistMode(slot.state === "booked");
  };

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    return minutesToTime(timeToMinutes(startTime) + durationMinutes);
  };

  const handleInitiateVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!customerName.trim() || customerName.trim().length < 2) {
      setFormError("Lütfen adınızı ve soyadınızı giriniz.");
      return;
    }

    const cleanDigits = normalizePhone(customerPhone);
    if (cleanDigits.length < 10) {
      setFormError(
        "Lütfen geçerli bir telefon numarası giriniz (Örn: 05550000000)."
      );
      return;
    }

    setStage("checking_trust");

    setTimeout(() => {
      if (isPhoneBlacklisted(customerPhone)) {
        setStage("deposit_required");
      } else {
        setStage("whatsapp_otp");
      }
    }, 600);
  };

  const handleCompleteDepositBooking = () => {
    if (!selectedBarber || !selectedSlot) return;
    setStage("processing_deposit");

    const fallbackRealBarber =
      barbers.find((b) => !b.isAnyOption) || selectedBarber;

    setTimeout(() => {
      if (isWaitlistMode) {
        addWaitlistEntry({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          dayId: selectedDay.id,
          requestedTime: selectedSlot.time,
          requestedDateLabel: selectedDay.label,
          barberName: selectedBarber.name,
          servicesSummary: selectedServices.map((s) => s.name).join(" + "),
          totalPrice,
        });
        setConfirmedAppointment(null);
      } else {
        const created = addAppointment({
          dayId: selectedDay.id,
          dateLabel: `${selectedDay.label} (${selectedDay.dateStr})`,
          time: selectedSlot.time,
          endTime: calculateEndTime(selectedSlot.time, totalDuration),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          barberId: selectedBarber.isAnyOption
            ? fallbackRealBarber.id
            : selectedBarber.id,
          barberName: selectedBarber.isAnyOption
            ? `${fallbackRealBarber.name} (Otomatik)`
            : selectedBarber.name,
          chairLabel: selectedBarber.chairName,
          services: selectedServices.map((s) => ({
            name: s.name,
            price: getServicePriceForBarber(s, selectedBarber),
            duration: s.duration,
          })),
          totalPrice,
          totalDuration,
          trustBadge: "deposit_paid",
          trustDetail: `${requiredDepositAmount} TL Kapora Alındı (Ortak Kara Liste Korumalı)`,
          depositAmount: requiredDepositAmount,
          status: "upcoming",
          reminderSent: true,
          reminderSentAt: "Şimdi",
        });
        setConfirmedAppointment(created);
      }
      setStage("confirmed");
    }, 900);
  };

  const handleCompleteWhatsAppBooking = () => {
    if (!selectedBarber || !selectedSlot) return;

    const fallbackRealBarber =
      barbers.find((b) => !b.isAnyOption) || selectedBarber;

    if (isWaitlistMode) {
      addWaitlistEntry({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        dayId: selectedDay.id,
        requestedTime: selectedSlot.time,
        requestedDateLabel: selectedDay.label,
        barberName: selectedBarber.name,
        servicesSummary: selectedServices.map((s) => s.name).join(" + "),
        totalPrice,
      });
      setConfirmedAppointment(null);
    } else {
      const created = addAppointment({
        dayId: selectedDay.id,
        dateLabel: `${selectedDay.label} (${selectedDay.dateStr})`,
        time: selectedSlot.time,
        endTime: calculateEndTime(selectedSlot.time, totalDuration),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        barberId: selectedBarber.isAnyOption
          ? fallbackRealBarber.id
          : selectedBarber.id,
        barberName: selectedBarber.isAnyOption
          ? `${fallbackRealBarber.name} (En Erken)`
          : selectedBarber.name,
        chairLabel: selectedBarber.chairName,
        services: selectedServices.map((s) => ({
          name: s.name,
          price: getServicePriceForBarber(s, selectedBarber),
          duration: s.duration,
        })),
        totalPrice,
        totalDuration,
        trustBadge: "first_time",
        trustDetail: "WhatsApp Doğrulandı • Güvenilir Profil",
        status: "upcoming",
        reminderSent: true,
        reminderSentAt: "Şimdi",
      });
      setConfirmedAppointment(created);
    }
    setStage("confirmed");
  };

  const handleResetWizard = () => {
    setStep(1);
    setSelectedSlot(null);
    setIsWaitlistMode(false);
    setCustomerName("");
    setCustomerPhone("");
    setConfirmedAppointment(null);
    setStage("idle");
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // DELETED / UNKNOWN SHOP GUARD SCREEN
  if (hydrated && !currentShopExists) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="overflow-hidden rounded-3xl border-2 border-rose-500/50 bg-gradient-to-b from-[#241616] via-[#1c1613] to-[#14100d] p-8 text-center shadow-2xl"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/20 text-rose-400">
            <Ban className="h-9 w-9" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-[#fdf8f5]">
            Salon Bulunamadı
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-[#e6ccb2]/80">
            Aradığınız berber salonu sistemde kayıtlı değil veya hesabı
            kapatılmış. Lütfen bağlantıyı kontrol edin.
          </p>
        </motion.div>
      </div>
    );
  }

  // SUBSCRIPTION FROZEN / SUSPENDED GUARD SCREEN
  if (currentShop.subscriptionStatus === "suspended") {
    return (
      <div className="mx-auto max-w-xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="overflow-hidden rounded-3xl border-2 border-rose-500/50 bg-gradient-to-b from-[#241616] via-[#1c1613] to-[#14100d] p-8 text-center shadow-2xl"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/20 text-rose-400">
            <Ban className="h-9 w-9" />
          </div>

          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-rose-300">
            ONLINE RANDEVU SİSTEMİ ASKIDA
          </span>

          <h1 className="mt-4 text-2xl font-extrabold text-[#fdf8f5]">
            Bu salonun online randevu sistemi geçici olarak kapalıdır
          </h1>

          <p className="mt-2.5 text-sm leading-relaxed text-[#e6ccb2]/80">
            <strong>{currentShop.name}</strong> ({currentShop.district}) şu anda online
            randevu kabul edememektedir. Randevu bilgisi için doğrudan salon ile
            iletişime geçebilirsiniz.
          </p>

          <div className="mt-6 rounded-2xl border border-[#c88a53]/25 bg-[#14100d] p-4 text-xs text-[#e6ccb2]">
            <div className="flex items-center justify-between border-b border-[#c88a53]/15 pb-2">
              <span className="text-[#e6ccb2]/65">Salon Adı:</span>
              <span className="font-bold text-[#fdf8f5]">{currentShop.name}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[#e6ccb2]/65">İletişim Telefonu:</span>
              <span className="font-bold text-[#c88a53]">{currentShop.phone}</span>
            </div>
          </div>

          <div className="mt-6 border-t border-[#c88a53]/20 pt-4 text-center">
            <p className="text-xs text-[#e6ccb2]/60">
              Lütfen detaylı bilgi için berber salonumuz ile iletişime geçiniz.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const getBarberVisualTheme = (barber: Barber, idx: number) => {
    if (barber.isAnyOption) {
      return {
        avatar: "from-[#b47b48] via-[#c88a53] to-[#8c5828]",
        ring: "ring-[#c88a53]/50",
        badge:
          "border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-sm",
        chairText: "text-[#c88a53]",
      };
    }
    const palettes = [
      {
        avatar: "from-purple-900/90 via-indigo-950 to-[#14100d]",
        ring: "ring-purple-400/40",
        badge: "border border-purple-400/35 bg-purple-500/15 text-purple-200",
        chairText: "text-purple-300",
      },
      {
        avatar: "from-sky-900/90 via-slate-900 to-[#14100d]",
        ring: "ring-sky-400/40",
        badge: "border border-sky-400/35 bg-sky-500/15 text-sky-200",
        chairText: "text-sky-300",
      },
      {
        avatar: "from-emerald-900/90 via-teal-950 to-[#14100d]",
        ring: "ring-emerald-400/40",
        badge: "border border-emerald-400/35 bg-emerald-500/15 text-emerald-200",
        chairText: "text-emerald-300",
      },
      {
        avatar: "from-amber-900/90 via-orange-950 to-[#14100d]",
        ring: "ring-amber-400/40",
        badge: "border border-amber-400/35 bg-amber-500/15 text-amber-200",
        chairText: "text-amber-300",
      },
    ];
    return palettes[(idx - 1 + palettes.length) % palettes.length];
  };

  const stepsInfo = [
    {
      num: 1,
      title: "Usta & Koltuk",
      subtitle: selectedBarber?.name.split(" ")[0] || "Seçiniz",
    },
    {
      num: 2,
      title: "Hizmetler",
      subtitle: `${selectedServices.length} Hizmet (${totalPrice} TL)`,
    },
    {
      num: 3,
      title: "Tarih & Saat",
      subtitle: selectedSlot
        ? `${selectedDay.label} ${selectedSlot.time}`
        : "Seçiniz",
    },
    { num: 4, title: "Güven & Onay", subtitle: "Hızlı Doğrulama" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-2.5 pb-24 pt-2 sm:px-6 sm:pb-32 sm:pt-6">
      {/* PWA "📱 Uygulamayı Ana Ekrana Yükle" Banner (Customer Mode) */}
      <PwaInstallBanner mode="customer" />

      {/* Isolated Customer Salon Info Header */}
      <div className="relative mb-2.5 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#1e1916] via-[#161311] to-[#110f0d] p-2.5 shadow-xl shadow-black/50 sm:mb-4 sm:p-4">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#c88a53]/15 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-xl border border-[#c88a53]/40 bg-[#c88a53]/15 px-2.5 py-1 text-[11px] font-extrabold text-[#e6ccb2] sm:text-xs">
              <Crown className="h-3.5 w-3.5 shrink-0 text-[#c88a53]" />
              <span className="truncate">{currentShop.name}</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-stone-300 sm:text-[11px]">
              <MapPin className="h-3 w-3 text-sky-400" />
              <span className="truncate">{currentShop.district}</span>
              <span className="text-stone-600">•</span>
              <Clock className="h-3 w-3 text-emerald-400" />
              {shopSettings.openTime}-{shopSettings.closeTime}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-[#fdf8f5] sm:text-xs">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              4.98
            </span>
          </div>
        </div>

        {/* Compact 4-Step Stepper Bar */}
        <div className="relative mt-2 grid grid-cols-4 gap-1 sm:mt-3 sm:gap-2">
          {stepsInfo.map((item) => {
            const isActive = step === item.num;
            const isDone = step > item.num;
            const canClick = item.num < step && stage !== "confirmed";

            return (
              <button
                key={item.num}
                type="button"
                disabled={!canClick}
                onClick={() => canClick && setStep(item.num)}
                className={`group relative flex flex-col items-start rounded-xl border px-2 py-1.5 text-left transition-all duration-200 sm:p-2 ${
                  isActive
                    ? "border-[#e6ccb2]/50 bg-gradient-to-br from-[#c88a53]/30 via-[#b47b48]/15 to-[#1c1613] shadow-md shadow-[#c88a53]/20"
                    : isDone
                    ? "cursor-pointer border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-400/60"
                    : "cursor-default border-white/10 bg-[#0d0a08]/60 opacity-60"
                }`}
              >
                <div className="flex w-full items-center gap-1.5">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold sm:h-4.5 sm:w-4.5 sm:text-[10px] ${
                      isActive
                        ? "border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b]"
                        : isDone
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-white/10 text-stone-400"
                    }`}
                  >
                    {isDone ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : item.num}
                  </span>
                  <span className=" truncate text-[10px] font-extrabold text-[#fdf8f5] sm:text-xs">
                    {item.title}
                  </span>
                </div>
                <span
                  className={`mt-0.5 w-full truncate text-[9px] sm:text-[10px] ${
                    isActive
                      ? "text-[#e6ccb2]"
                      : isDone
                      ? "text-emerald-300/80"
                      : "text-stone-400"
                  }`}
                >
                  {item.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wizard Step Content with Framer Motion */}
      <AnimatePresence mode="wait">
        {/* STEP 1: BARBER / CHAIR SELECTION */}
        {step === 1 && (
          <motion.section
            key="step-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-2.5 sm:space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="truncate text-sm font-extrabold text-[#fdf8f5] sm:text-base">
                1. Usta / Koltuk Seçin
              </h2>
              {barbers.length > 3 && (
                <div className="relative w-44 sm:w-56">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sky-400" />
                  <input
                    type="text"
                    value={barberSearchQuery}
                    onChange={(e) => setBarberSearchQuery(e.target.value)}
                    placeholder="Usta ara..."
                    className="w-full rounded-lg border border-white/15 bg-[#161311] py-1 pl-7 pr-6 text-[11px] text-[#fdf8f5] placeholder-stone-500 focus:border-sky-400/70 focus:outline-none sm:text-xs"
                  />
                  {barberSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBarberSearchQuery("")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Kompakt Berber Kartları Listesi */}
            {filteredBarbers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-[#14100d]/70 p-4 text-center">
                <p className="text-xs font-bold text-[#fdf8f5]">
                  &quot;{barberSearchQuery}&quot; ile eşleşen berber bulunamadı
                </p>
                <button
                  type="button"
                  onClick={() => setBarberSearchQuery("")}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-1 text-[11px] font-bold text-sky-200"
                >
                  <RefreshCw className="h-3 w-3" />
                  Tümünü Göster
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filteredBarbers.map((barber: Barber, idx: number) => {
                  const isSelected = selectedBarber?.id === barber.id;
                  const isExpanded = expandedBarberId === barber.id;
                  const firstService = services[0];
                  const samplePrice = firstService
                    ? getServicePriceForBarber(firstService, barber)
                    : null;
                  const hasCustomPricing =
                    barber.customPrices &&
                    Object.keys(barber.customPrices).length > 0;
                  const theme = getBarberVisualTheme(barber, idx);

                  return (
                    <div
                      key={barber.id}
                      onClick={() => setSelectedBarberId(barber.id)}
                      className={`group relative cursor-pointer overflow-hidden rounded-xl border p-2.5 transition-all duration-150 sm:p-3 ${
                        isSelected
                          ? "border-[#e6ccb2]/60 bg-gradient-to-br from-[#281e18] via-[#1c1613] to-[#14100d] shadow-md shadow-[#c88a53]/20"
                          : "border-white/10 bg-[#161311] hover:border-white/25 hover:bg-[#1d1815]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <div
                            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.avatar} text-xs font-extrabold text-[#fdf8f5] shadow-inner ring-1 sm:h-10 sm:w-10 ${theme.ring}`}
                          >
                            {barber.isAnyOption ? (
                              <Scissors className="h-4 w-4 text-[#1a110b]" />
                            ) : (
                              <span>{barber.initials}</span>
                            )}
                            {isSelected && (
                              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[#0c1410] ring-2 ring-[#14100d]">
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h3 className="truncate text-xs font-bold text-[#fdf8f5] sm:text-sm">
                                {barber.name}
                              </h3>
                              <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-amber-300">
                                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                {barber.rating}
                              </span>
                            </div>
                            <p className={`truncate text-[10px] font-semibold ${theme.chairText}`}>
                              {barber.chairName}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {firstService && samplePrice !== null && (
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                hasCustomPricing
                                  ? "border border-amber-500/35 bg-amber-500/15 text-amber-300"
                                  : "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                              }`}
                            >
                              {samplePrice} TL
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedBarberId((prev) =>
                                prev === barber.id ? null : barber.id
                              );
                            }}
                            title="Usta Detayları"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-stone-400 transition hover:border-white/25 hover:text-white"
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                isExpanded ? "rotate-180 text-[#e6ccb2]" : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Açılır-Kapanır Usta Detayları (Accordion) */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 border-t border-white/10 pt-2 text-[11px] text-stone-300">
                              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-stone-400">
                                <span>{barber.role}</span>
                                <span>
                                  Deneyim: <strong className="text-stone-200">{barber.experience}</strong> ({barber.reviewCount} yorum)
                                </span>
                              </div>
                              {barber.badge && (
                                <div className="mt-1">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${theme.badge}`}
                                  >
                                    <Sparkles className="h-2.5 w-2.5" />
                                    {barber.badge}
                                  </span>
                                </div>
                              )}
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {barber.specialties.map((spec) => (
                                  <span
                                    key={spec}
                                    className="rounded border border-white/10 bg-[#110f0d] px-1.5 py-0.5 text-[9px] text-stone-300"
                                  >
                                    {spec}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => selectedBarber && setStep(2)}
              disabled={!selectedBarber}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-2.5 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 sm:py-3 sm:text-sm"
            >
              <span>Hizmet Seçimine İlerle ({selectedBarber?.name})</span>
              <ChevronRight className="h-4 w-4 stroke-[2.5]" />
            </button>
          </motion.section>
        )}

        {/* STEP 2: MULTI-SERVICE SELECTION */}
        {step === 2 && (
          <motion.section
            key="step-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-2.5 sm:space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-[#161311] text-stone-300 hover:border-white/30 hover:text-[#fdf8f5]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-sm font-extrabold text-[#fdf8f5] sm:text-base">
                    2. Hizmet Seçimi ({selectedBarber?.name})
                  </h2>
                </div>
              </div>
              <span className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-300">
                {selectedServices.length} Seçili • {totalPrice} TL
              </span>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              {services.map((service: Service) => {
                const isSelected = selectedServiceIds.includes(service.id);
                const isExpanded = expandedServiceId === service.id;
                const effectivePrice = getServicePriceForBarber(
                  service,
                  selectedBarber
                );
                const isCustomPriced = effectivePrice !== service.price;

                return (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className={`cursor-pointer rounded-xl border px-3 py-2.5 transition-all duration-150 ${
                      isSelected
                        ? "border-[#e6ccb2]/55 bg-gradient-to-r from-[#281e18] via-[#1c1613] to-[#14100d] shadow-md shadow-[#c88a53]/15"
                        : "border-white/10 bg-[#161311] hover:border-white/25 hover:bg-[#1d1815]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            isSelected
                              ? "border-emerald-400/60 bg-emerald-500 text-[#0c1410]"
                              : "border-white/20 bg-[#110f0d] text-transparent"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="truncate text-xs font-bold text-[#fdf8f5] sm:text-sm">
                              {service.name}
                            </h3>
                            {service.vip && (
                              <span className="inline-flex items-center gap-0.5 rounded-full border border-purple-400/50 bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-purple-200">
                                <Crown className="h-2.5 w-2.5 text-purple-300" />
                                VIP
                              </span>
                            )}
                            {isCustomPriced && (
                              <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                                Özel
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="inline-flex items-center gap-0.5 rounded border border-sky-500/25 bg-sky-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                          <Clock className="h-2.5 w-2.5 text-sky-400" />
                          {service.duration} dk
                        </span>

                        <div className="text-right">
                          {isCustomPriced && (
                            <span className="mr-1 text-[10px] text-stone-500 line-through">
                              {service.price}
                            </span>
                          )}
                          <span className="bg-gradient-to-r from-[#fdf8f5] to-[#c88a53] bg-clip-text text-xs font-extrabold text-transparent sm:text-sm">
                            {effectivePrice} TL
                          </span>
                        </div>

                        {service.description && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedServiceId((prev) =>
                                prev === service.id ? null : service.id
                              );
                            }}
                            title="Hizmet Detayı"
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-stone-400 transition hover:border-white/25 hover:text-white"
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                isExpanded ? "rotate-180 text-[#e6ccb2]" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded && service.description && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <p className="mt-2 border-t border-white/10 pt-1.5 text-[11px] leading-relaxed text-stone-300">
                            {service.description}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* STEP 3: DYNAMIC DATE & TIME SELECTION */}
        {step === 3 && (
          <motion.section
            key="step-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-[#161311] text-stone-300 hover:border-white/30 hover:text-[#fdf8f5]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-sm font-extrabold text-[#fdf8f5] sm:text-base">
                    3. Gün ve Saat Seçin
                  </h2>
                </div>
              </div>
              <span className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-300">
                {selectedDay.fullDate}
              </span>
            </div>

            {/* Kompakt Yatay Gün Seçici */}
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 pt-0.5 sm:gap-2">
              {DAYS_METADATA.map((day) => {
                const isSelected = selectedDay.id === day.id;
                const isDayClosed = shopSettings.closedDays.includes(
                  day.dayOfWeek
                );
                const daySlots = getSlotsForDay(day.id);
                const availableCount = daySlots.filter(
                  (s) => s.state === "available"
                ).length;

                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => {
                      setSelectedDay(day);
                      setSelectedSlot(null);
                    }}
                    className={`flex min-w-[64px] shrink-0 flex-col items-center rounded-xl border px-2 py-1.5 transition-all duration-150 sm:min-w-[88px] sm:p-2.5 ${
                      isSelected
                        ? isDayClosed
                          ? "border-rose-500 bg-rose-950/40 text-rose-200"
                          : "border-[#e6ccb2]/60 bg-gradient-to-b from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-md shadow-[#c88a53]/25"
                        : isDayClosed
                        ? "border-white/5 bg-[#12100e]/70 text-stone-500 opacity-75"
                        : "border-white/10 bg-[#161311] text-[#fdf8f5] hover:border-white/25"
                    }`}
                  >
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider sm:text-[10px] ${
                        isSelected
                          ? isDayClosed
                            ? "text-rose-300"
                            : "text-[#1a110b]/85"
                          : "text-stone-400"
                      }`}
                    >
                      {day.label}
                    </span>
                    <span className="text-base font-extrabold tracking-tight sm:text-xl">
                      {day.dayNumber}
                    </span>
                    {isDayClosed ? (
                      <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[8px] font-bold text-rose-400 sm:text-[9px]">
                        Kapalı
                      </span>
                    ) : (
                      <span
                        className={`text-[8px] font-bold sm:text-[9px] ${
                          isSelected ? "text-[#1a110b]" : "text-emerald-400"
                        }`}
                      >
                        {availableCount} Boş
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {isSelectedDayClosed ? (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/15 p-4 text-center">
                <CalendarX2 className="mx-auto h-5 w-5 text-rose-400" />
                <h3 className="mt-1.5 text-sm font-bold text-[#fdf8f5]">
                  {selectedDay.fullDate} Günü Salonumuz Kapalıdır
                </h3>
                <p className="mt-0.5 text-[11px] text-stone-300">
                  Lütfen yukarıdan açık bir gün seçiniz.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#161311]/90 px-2.5 py-1.5 text-[10px] sm:text-xs">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-[#fdf8f5]">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Müsait
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      Dolu (Yedek Liste)
                    </span>
                  </div>
                  {shopSettings.breakEnabled && (
                    <span className="text-stone-400">
                      Mola: {shopSettings.breakStart}-{shopSettings.breakEnd}
                    </span>
                  )}
                </div>

                {/* Kompakt 4 Sütunlu Saat Izgarası (Kaydırma Zahmetini Bitirir) */}
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-6 sm:gap-2">
                  {currentDaySlots.map((slot) => {
                    const isSelected = selectedSlot?.time === slot.time;

                    if (slot.state === "break") {
                      return (
                        <div
                          key={slot.time}
                          className="flex cursor-not-allowed flex-col items-center justify-center rounded-xl border border-white/5 bg-[#12100e]/70 px-1.5 py-2 opacity-55"
                        >
                          <span className="text-xs font-bold text-stone-500">
                            {slot.time}
                          </span>
                          <span className="text-[8px] font-semibold uppercase text-stone-500">
                            Mola
                          </span>
                        </div>
                      );
                    }

                    if (slot.state === "available") {
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => handleSelectSlot(slot)}
                          className={`flex flex-col items-center justify-center rounded-xl border px-1.5 py-2 transition-all ${
                            isSelected
                              ? "border-emerald-300/70 bg-gradient-to-r from-emerald-500 to-teal-500 text-[#081510] shadow-md shadow-emerald-500/25"
                              : "border-emerald-500/20 bg-[#141916] text-[#fdf8f5] hover:border-emerald-400/60 hover:bg-emerald-950/30"
                          }`}
                        >
                          <span className="text-xs font-extrabold sm:text-sm">
                            {slot.time}
                          </span>
                          <span
                            className={`text-[9px] font-semibold ${
                              isSelected ? "text-[#081510]" : "text-emerald-400"
                            }`}
                          >
                            Müsait
                          </span>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => handleSelectSlot(slot)}
                        className={`flex flex-col items-center justify-center rounded-xl border px-1.5 py-2 transition-all ${
                          isSelected
                            ? "border-amber-400/60 bg-amber-500/20 text-[#fdf8f5] ring-1 ring-amber-400/50"
                            : "border-white/10 bg-[#141210] text-stone-400 hover:border-amber-500/45"
                        }`}
                      >
                        <span className="text-xs font-bold line-through opacity-75">
                          {slot.time}
                        </span>
                        <span className="flex items-center gap-0.5 text-[8px] font-semibold text-amber-400 sm:text-[9px]">
                          <BellRing className="h-2.5 w-2.5 shrink-0" />
                          Yedek
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <AnimatePresence>
              {selectedSlot && isWaitlistMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-xl border border-amber-500/45 bg-amber-500/10 p-2.5"
                >
                  <div className="flex items-center gap-2 text-xs text-amber-200">
                    <BellRing className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>
                      <strong>{selectedSlot.time}</strong> dolu. İptal olursa size{" "}
                      <strong className="text-amber-300">WhatsApp ile öncelik</strong>{" "}
                      verilir.
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              disabled={!selectedSlot || isSelectedDayClosed}
              onClick={() => selectedSlot && setStep(4)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:py-3.5 sm:text-sm"
            >
              <span>
                {isWaitlistMode
                  ? `${selectedSlot?.time} Yedek Listesi İçin Devam Et`
                  : `${selectedDay.label} ${selectedSlot?.time || ""} Randevusunu Tamamla`}
              </span>
              <ChevronRight className="h-4 w-4 stroke-[2.5]" />
            </button>
          </motion.section>
        )}

        {/* STEP 4: CUSTOMER INFO & CONFIRMATION */}
        {step === 4 && (
          <motion.section
            key="step-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-3"
          >
            {stage !== "confirmed" && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStage("idle");
                      setStep(3);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-[#161311] text-stone-300 hover:border-white/30 hover:text-[#fdf8f5]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <h2 className="text-sm font-extrabold text-[#fdf8f5] sm:text-base">
                    4. Müşteri Bilgileriniz ve Onay
                  </h2>
                </div>
                <span className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-300">
                  Adım 4 / 4
                </span>
              </div>
            )}

            {stage !== "confirmed" && (
              <div className="rounded-xl border border-white/10 bg-[#161311] p-3 shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#fdf8f5]">
                      {selectedBarber?.name}{" "}
                      <span className="text-sky-400">
                        ({selectedBarber?.chairName})
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-stone-400">
                      {selectedServices.map((s) => s.name).join(", ")} ({totalDuration} dk)
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-emerald-400">
                      {selectedDay.label} • {selectedSlot?.time}
                    </p>
                    <p className="bg-gradient-to-r from-[#fdf8f5] to-[#c88a53] bg-clip-text text-sm font-extrabold text-transparent">
                      {totalPrice} TL
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stage === "idle" || stage === "checking_trust" ? (
              <form
                onSubmit={handleInitiateVerification}
                className="space-y-3 rounded-2xl border border-white/10 bg-[#161311] p-3.5 shadow-xl sm:p-5"
              >
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-stone-300">
                    Adınız Soyadınız
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Adınız ve Soyadınız"
                      className="w-full rounded-xl border border-white/15 bg-[#110f0d] py-2.5 pl-9 pr-3 text-sm text-[#fdf8f5] placeholder-stone-500 outline-none transition focus:border-sky-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-stone-300">
                    Cep Telefonu Numaranız
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="05XX XXX XX XX"
                      className="w-full rounded-xl border border-white/15 bg-[#110f0d] py-2.5 pl-9 pr-3 text-sm text-[#fdf8f5] placeholder-stone-500 outline-none transition focus:border-emerald-400"
                    />
                  </div>
                </div>

                {formError && (
                  <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={stage === "checking_trust"}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110 disabled:opacity-60 sm:py-3.5 sm:text-sm"
                >
                  {stage === "checking_trust" ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1a110b] border-t-transparent" />
                      <span>Randevu Hazırlanıyor...</span>
                    </>
                  ) : (
                    <>
                      <span>Randevuyu Onayla ve Devam Et</span>
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>
            ) : null}

            {/* CASE A: DEPOSIT REQUIRED OR BLOCKED BY SHOP POLICY */}
            {stage === "deposit_required" || stage === "processing_deposit" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="overflow-hidden rounded-3xl border-2 border-[#c88a53]/80 bg-gradient-to-b from-[#241b16] via-[#1c1613] to-[#14100d] p-5 shadow-bronze-glow-lg sm:p-6"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                      ÖN KAPORA GÜVENCESİ
                    </span>
                    <h3 className="mt-1.5 text-base font-extrabold text-[#fdf8f5] sm:text-lg">
                      {isBlockedByShopPolicy
                        ? "Online Randevu Oluşturulamadı"
                        : "Randevu Onayı İçin Ön Kapora Gerekmektedir"}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#e6ccb2]/85">
                      {isBlockedByShopPolicy ? (
                        <strong className="text-rose-300">
                          {currentShop.name} salon politikası gereği bu numara ile online randevu oluşturulamamaktadır. Lütfen doğrudan salon ile iletişime geçiniz.
                        </strong>
                      ) : (
                        <>
                          <strong>{currentShop.name}</strong> randevunuzu
                          garantilemek için{" "}
                          <strong className="text-[#e6ccb2] underline">
                            {requiredDepositAmount} TL ön kapora
                          </strong>{" "}
                          ödemeniz gerekmektedir.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {isBlockedByShopPolicy ? (
                  <div className="mt-5 rounded-2xl border border-rose-500/40 bg-rose-950/20 p-4 text-center">
                    <button
                      type="button"
                      onClick={() => setStage("idle")}
                      className="rounded-xl border border-[#c88a53]/40 bg-[#14100d] px-5 py-2.5 text-xs font-bold text-[#e6ccb2]"
                    >
                      Geri Dön
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 space-y-2 rounded-2xl border border-[#c88a53]/25 bg-[#14100d] p-3.5 text-xs">
                      <div className="flex justify-between text-[#e6ccb2]/75">
                        <span>Toplam Hizmet Tutarı:</span>
                        <span className="font-semibold text-[#fdf8f5]">
                          {totalPrice} TL
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold text-[#c88a53]">
                        <span>Şimdi Ödenecek Ön Kapora:</span>
                        <span>{requiredDepositAmount} TL</span>
                      </div>
                      <div className="flex justify-between border-t border-[#c88a53]/20 pt-2 text-sm font-bold text-emerald-400">
                        <span>Salonda Ödenecek Kalan Tutar:</span>
                        <span>
                          {Math.max(0, totalPrice - requiredDepositAmount)} TL
                        </span>
                      </div>
                    </div>

                    <div className="mt-3.5 rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-3.5">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-semibold text-[#fdf8f5]">
                          <CreditCard className="h-4 w-4 text-[#c88a53]" />
                          3D Secure Kapora Ödemesi
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                          <Lock className="h-3 w-3" /> 256-Bit SSL
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 font-mono text-xs text-[#fdf8f5] sm:col-span-2"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            defaultValue="10/29"
                            className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-center font-mono text-xs text-[#fdf8f5]"
                          />
                          <input
                            type="text"
                            defaultValue="842"
                            className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-center font-mono text-xs text-[#fdf8f5]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setStage("idle")}
                        className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-4 py-3 text-xs font-semibold text-[#e6ccb2] transition hover:bg-[#221a15]"
                      >
                        Geri Dön
                      </button>
                      <button
                        type="button"
                        disabled={stage === "processing_deposit"}
                        onClick={handleCompleteDepositBooking}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110 disabled:opacity-60 sm:text-sm"
                      >
                        {stage === "processing_deposit" ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1a110b] border-t-transparent" />
                            <span>
                              {requiredDepositAmount} TL Tahsil Ediliyor...
                            </span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            <span>
                              {requiredDepositAmount} TL Kapora Öde ve Onayla
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ) : null}

            {/* CASE B: WHATSAPP VERIFICATION */}
            {stage === "whatsapp_otp" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl border border-emerald-500/50 bg-gradient-to-b from-[#1c1613] via-[#131a15] to-[#14100d] p-5 shadow-xl sm:p-6"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#fdf8f5] sm:text-lg">
                      WhatsApp Hızlı Onay Kodu
                    </h3>
                    <p className="mt-0.5 text-xs text-[#e6ccb2]/80">
                      <strong>{customerPhone}</strong> numaralı hattınıza 4
                      haneli onay kodunuz iletildi.
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-[#14100d] p-3.5">
                  <div className="flex items-center justify-between text-[11px] text-emerald-400">
                    <span className="font-bold">
                      WhatsApp • {currentShop.name}
                    </span>
                    <span>Şimdi</span>
                  </div>
                  <p className="mt-1 text-xs text-[#fdf8f5]">
                    Sayın <strong>{customerName}</strong>,{" "}
                    {selectedDay.fullDate} saat{" "}
                    <strong>{selectedSlot?.time}</strong> randevunuz için onay
                    kodunuz:{" "}
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-sm font-extrabold text-emerald-300">
                      {otpCode}
                    </span>
                  </p>
                </div>

                <div className="mt-3.5">
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full rounded-xl border border-emerald-500/50 bg-[#14100d] py-2.5 text-center font-mono text-lg font-extrabold tracking-[0.4em] text-emerald-400 outline-none"
                  />
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStage("idle")}
                    className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-4 py-3 text-xs font-semibold text-[#e6ccb2] hover:bg-[#221a15]"
                  >
                    Geri Dön
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteWhatsAppBooking}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-xs font-extrabold text-[#1a110b] shadow-lg transition hover:bg-emerald-400 sm:text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                    <span>Randevuyu Onayla</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* CONFIRMED DIGITAL VIP PASS */}
            {stage === "confirmed" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="overflow-hidden rounded-3xl border border-[#c88a53]/60 bg-gradient-to-b from-[#241b16] via-[#1c1613] to-[#14100d] p-5 text-center shadow-bronze-glow-lg sm:p-6"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/30">
                  <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
                </div>

                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#c88a53]/40 bg-[#c88a53]/15 px-3 py-1 text-xs font-bold text-[#e6ccb2]">
                  {isWaitlistMode
                    ? "YEDEK LİSTE KAYDINIZ ALINDI"
                    : "RANDEVUNUZ ALINDI • ONAYLANDI"}
                </span>

                <h3 className="mt-2.5 text-xl font-extrabold text-[#fdf8f5] sm:text-2xl">
                  Teşekkürler, {customerName}!
                </h3>

                {confirmedAppointment && (
                  <div className="mx-auto mt-3.5 max-w-sm rounded-2xl border border-[#c88a53]/50 bg-[#c88a53]/15 p-3.5 shadow-md shadow-[#c88a53]/15">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-[#e6ccb2]">
                      Randevu Kodunuz
                    </span>
                    <div className="mt-1 flex items-center justify-center gap-3">
                      <span className="font-mono text-xl font-black tracking-wider text-[#e6ccb2]">
                        {confirmedAppointment.appointmentCode}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyCode(confirmedAppointment.appointmentCode)
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-[#c88a53]/40 bg-[#14100d] px-2.5 py-1 text-xs font-semibold text-[#e6ccb2] hover:bg-[#c88a53] hover:text-[#1a110b]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>{copiedCode ? "Kopyalandı!" : "Kopyala"}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-2 rounded-2xl border border-[#c88a53]/25 bg-[#14100d] p-4 text-left text-xs">
                  <div className="flex items-center justify-between border-b border-[#c88a53]/20 pb-2">
                    <span className="font-bold uppercase tracking-wider text-[#c88a53]">
                      {currentShop.name} • Randevu Özeti
                    </span>
                    <span className="text-[#e6ccb2]/75">{customerPhone}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#c88a53]/15 pb-1.5">
                    <span className="text-[#e6ccb2]/70">Usta / Koltuk:</span>
                    <span className="font-bold text-[#fdf8f5]">
                      {selectedBarber?.name} ({selectedBarber?.chairName})
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#c88a53]/15 pb-1.5">
                    <span className="text-[#e6ccb2]/70">Tarih & Saat:</span>
                    <span className="font-bold text-[#e6ccb2]">
                      {selectedDay.fullDate} • {selectedSlot?.time}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#c88a53]/15 pb-1.5">
                    <span className="text-[#e6ccb2]/70">
                      İşlemler ({totalDuration} dk):
                    </span>
                    <span className="font-semibold text-[#fdf8f5]">
                      {selectedServices.map((s) => s.name).join(" + ")}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm">
                    <span className="font-semibold text-[#e6ccb2]">
                      Toplam Tutar:
                    </span>
                    <span className="font-extrabold text-[#c88a53]">
                      {totalPrice} TL
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  <a
                    href={buildWhatsAppUrl(
                      currentShop?.phone,
                      `Merhaba, ben ${
                        confirmedAppointment?.customerName || customerName.trim()
                      }. ${
                        confirmedAppointment?.dateLabel || selectedDay.fullDate
                      } saat ${
                        confirmedAppointment?.time || selectedSlot?.time || ""
                      } için ${
                        confirmedAppointment
                          ? confirmedAppointment.services
                              .map((s) => s.name)
                              .join(" + ")
                          : selectedServices.map((s) => s.name).join(" + ")
                      } randevusu oluşturdum.`,
                      DEFAULT_SHOP_WHATSAPP_PHONE
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`+${formatPhoneForWhatsApp(
                      currentShop?.phone,
                      DEFAULT_SHOP_WHATSAPP_PHONE
                    )} numaralı salon hattına WhatsApp mesajı gönder`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/60 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 py-3.5 text-xs font-black text-[#081510] shadow-lg shadow-emerald-500/25 transition hover:brightness-110 active:scale-[0.99] sm:text-sm"
                  >
                    <span>📲 Berbere WhatsApp&apos;tan Bildir</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleResetWizard}
                    className="w-full rounded-xl border border-[#c88a53]/40 bg-[#14100d] py-3 text-xs font-bold text-[#e6ccb2] transition hover:border-[#c88a53]"
                  >
                    Yeni Randevu Oluştur
                  </button>
                </div>
              </motion.div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* STICKY LIVE SUMMARY DOCK (FOR STEP 2) */}
      <AnimatePresence>
        {step === 2 && (
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0a09]/95 p-3.5 backdrop-blur-xl sm:p-4"
          >
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-stone-300">
                    {selectedServices.length} Hizmet (
                    {selectedBarber?.name.split(" ")[0]})
                  </span>
                  <span className="text-stone-600">•</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400">
                    <Clock className="h-3.5 w-3.5" />
                    {totalDuration} dk
                  </span>
                </div>
                <div className="text-lg font-extrabold text-[#fdf8f5] sm:text-xl">
                  {totalPrice}{" "}
                  <span className="text-sm font-bold text-[#c88a53]">TL</span>
                </div>
              </div>

              <button
                type="button"
                disabled={selectedServices.length === 0}
                onClick={() => setStep(3)}
                className="flex items-center gap-2 rounded-2xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-5 py-3 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110 disabled:opacity-40 sm:px-6 sm:py-3.5 sm:text-sm"
              >
                <span>Tarih & Saat Seç</span>
                <ChevronRight className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
