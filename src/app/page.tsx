"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors,
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  CreditCard,
  User,
  Phone,
  Lock,
  CheckCircle2,
  CalendarX2,
  Copy,
  Ban,
  Store,
  CalendarDays,
} from "lucide-react";
import {
  PWA_INSTALL_ROLE_KEY,
} from "@/components/AdminPinGate";
import {
  getLiveDaysMetadata,
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
  | "deposit_required"
  | "processing_deposit"
  | "confirmed";

export default function CustomerBookingPage() {
  const router = useRouter();
  const {
    shops,
    currentShop,
    currentShopSlug,
    currentShopExists,
    hasShopQueryParam,
    setCurrentShopSlug,
    hydrated,
    barbers,
    services,
    shopSettings,
    addAppointment,
    isPhoneBlacklisted,
    getSlotsForDay,
    getServicePriceForBarber,
  } = useBarber();

  // Akıllı PWA Yönlendirmesi (Yalnızca telefon ana ekranına 'Admin' olarak kurulmuş PWA standalone ise)
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) {
      try {
        const installedRole = localStorage.getItem(PWA_INSTALL_ROLE_KEY);
        // Sadece URL'de ?shop=... yoksa ve özel admin rolüyle kurulmuşsa admin'e yönlendir
        const params = new URLSearchParams(window.location.search);
        if (installedRole === "admin" && !params.get("shop")) {
          router.replace("/admin");
        }
      } catch {
        // ignore storage errors
      }
    }
  }, [hydrated, router]);

  // 3 Adımlı Ultra-Sade Randevu Sihirbazı (1: Dükkan & Hizmet, 2: Gün & Saat, 3: İsim, Telefon & Onay)
  const [step, setStep] = useState<number>(1);

  // Adım 1: Dükkan / Usta ve Hizmet Seçimi
  const [selectedBarberId, setSelectedBarberId] = useState<string>("any");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Gerçek Zamanlı Canlı Tarih (new Date() - Türkiye Saati, Bugün + Önümüzdeki 7 Gün)
  const liveDays = useMemo(() => getLiveDaysMetadata(7), []);

  // Adım 2: Gün ve Saat Seçimi (Varsayılan her zaman Bugün, geçmiş günler listelenmez)
  const [selectedDay, setSelectedDay] = useState<DayMetadata>(() => getLiveDaysMetadata(7)[0]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Adım 3: İsim, Telefon ve Onay
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [stage, setStage] = useState<VerificationStage>("idle");
  const [cardNumber, setCardNumber] = useState<string>("4543 •••• •••• 8890");
  const [formError, setFormError] = useState<string>("");
  const [confirmedAppointment, setConfirmedAppointment] =
    useState<Appointment | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Dükkan değiştiğinde seçimleri sıfırla
  useEffect(() => {
    setSelectedBarberId("any");
    setSelectedSlot(null);
    setStage("idle");
    setConfirmedAppointment(null);
  }, [currentShopSlug]);

  useEffect(() => {
    setSelectedServiceIds((prev) => {
      const valid = prev.filter((id) => services.some((s) => s.id === id));
      if (valid.length === 0 && services.length > 0) {
        return [services[0].id];
      }
      return valid;
    });
  }, [services]);

  const selectedBarber: Barber | null = useMemo(
    () => barbers.find((b) => b.id === selectedBarberId) || barbers[0] || null,
    [barbers, selectedBarberId]
  );

  const currentDaySlots = useMemo(
    () => getSlotsForDay(selectedDay.id),
    [getSlotsForDay, selectedDay.id]
  );

  // Sadece boş (müsait) saatler
  const availableDaySlots = useMemo(
    () => currentDaySlots.filter((s) => s.state === "available"),
    [currentDaySlots]
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

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    return minutesToTime(timeToMinutes(startTime) + durationMinutes);
  };

  const createFinalAppointment = (withDeposit: boolean) => {
    if (!selectedBarber || !selectedSlot) return;
    const fallbackRealBarber =
      barbers.find((b) => !b.isAnyOption) || selectedBarber;

    const created = addAppointment({
      dayId: selectedDay.id,
      dateLabel: selectedDay.chipLabel,
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
      trustBadge: withDeposit ? "deposit_paid" : "first_time",
      trustDetail: withDeposit
        ? `${requiredDepositAmount} TL Kapora Alındı`
        : "Online Hızlı Randevu",
      depositAmount: withDeposit ? requiredDepositAmount : undefined,
      status: "upcoming",
      reminderSent: false,
      bookingSource: "online",
    });

    setConfirmedAppointment(created);
    setStage("confirmed");
  };

  const handleCompleteBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!customerName.trim() || customerName.trim().length < 2) {
      setFormError("Lütfen adınızı ve soyadınızı yazınız.");
      return;
    }

    const cleanDigits = normalizePhone(customerPhone);
    if (cleanDigits.length < 10) {
      setFormError(
        "Lütfen geçerli bir telefon numarası yazınız (Örn: 0555 000 00 00)."
      );
      return;
    }

    if (isPhoneBlacklisted(customerPhone)) {
      setStage("deposit_required");
      return;
    }

    // Doğrudan kaydet ve arka planda berbere otomatik bildirim gönder
    createFinalAppointment(false);
  };

  const handleCompleteDepositBooking = () => {
    if (!selectedBarber || !selectedSlot) return;
    setStage("processing_deposit");
    setTimeout(() => {
      createFinalAppointment(true);
    }, 600);
  };

  const handleResetWizard = () => {
    setStep(1);
    setSelectedSlot(null);
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

  // SİLİNEN / BİLİNMEYEN DÜKKAN EKRANI
  if (hydrated && !currentShopExists) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-24 pt-10">
        <div className="rounded-3xl border-2 border-rose-500/50 bg-[#1a1311] p-8 text-center shadow-2xl">
          <Ban className="mx-auto h-12 w-12 text-rose-400" />
          <h1 className="mt-4 text-2xl font-extrabold text-[#fdf8f5]">
            Salon Bulunamadı
          </h1>
          <p className="mt-2 text-sm text-[#e6ccb2]/80">
            Aradığınız berber salonu sistemde kayıtlı değil veya hesabı kapatılmış.
          </p>
        </div>
      </div>
    );
  }

  // ASKIYA ALINMIŞ DÜKKAN EKRANI
  if (currentShop.subscriptionStatus === "suspended") {
    return (
      <div className="mx-auto max-w-xl px-4 pb-24 pt-10">
        <div className="rounded-3xl border-2 border-rose-500/50 bg-[#1a1311] p-8 text-center shadow-2xl">
          <Ban className="mx-auto h-12 w-12 text-rose-400" />
          <h1 className="mt-4 text-xl font-extrabold text-[#fdf8f5]">
            Bu salonun online randevu sistemi geçici olarak kapalıdır
          </h1>
          <p className="mt-2 text-sm text-[#e6ccb2]/80">
            <strong>{currentShop.name}</strong> ({currentShop.phone}) ile doğrudan
            iletişime geçebilirsiniz.
          </p>
        </div>
      </div>
    );
  }

  const stepsBar = [
    { num: 1, label: "1. Dükkan & Hizmet" },
    { num: 2, label: "2. Gün & Saat" },
    { num: 3, label: "3. İsim & Onay" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-3 pb-24 pt-3 sm:px-6 sm:pt-5">
      {/* EN ÜSTTE DOĞRUDAN ADIM ADIM RANDEVU ALMA KUTUSU */}
      <div className="overflow-hidden rounded-3xl border border-[#c88a53]/45 bg-gradient-to-b from-[#1e1814] via-[#161210] to-[#110e0c] p-4 shadow-2xl shadow-black/70 sm:p-6">
        {/* 3 Adım Göstergesi */}
        {stage !== "confirmed" && (
          <div className="mb-5 grid grid-cols-3 gap-2">
            {stepsBar.map((item) => {
              const isActive = step === item.num;
              const isDone = step > item.num;
              return (
                <button
                  key={item.num}
                  type="button"
                  disabled={!isDone}
                  onClick={() => isDone && setStep(item.num)}
                  className={`flex items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-xs font-extrabold transition sm:text-sm ${
                    isActive
                      ? "border-[#e6ccb2]/70 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/25"
                      : isDone
                      ? "cursor-pointer border-emerald-500/45 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                      : "cursor-default border-white/10 bg-[#120f0d] text-stone-500"
                  }`}
                >
                  {isDone && <Check className="h-4 w-4 shrink-0 stroke-[3]" />}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ADIM 1: DÜKKAN VE HİZMET SEÇİMİ (BÜYÜK, NET TIKLANABİLİR BUTONLAR) */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="space-y-5"
            >
              {/* Dükkan Seçimi (URL'de sabit dükkan yoksa tüm dükkanlar büyük butonlarla, varsa aktif dükkan başlığı) */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#e6ccb2]">
                  <Store className="h-4 w-4 text-[#c88a53]" />
                  <span>Berber Dükkanı Seçimi</span>
                </label>

                {!hasShopQueryParam && shops.length > 1 ? (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {shops.map((shop) => {
                      const isCurrent = shop.slug === currentShop.slug;
                      return (
                        <button
                          key={shop.slug}
                          type="button"
                          onClick={() => setCurrentShopSlug(shop.slug)}
                          className={`flex flex-col items-start justify-between rounded-2xl border-2 p-3.5 text-left transition ${
                            isCurrent
                              ? "border-[#e6ccb2] bg-gradient-to-br from-[#332419] via-[#211813] to-[#16120f] shadow-lg shadow-[#c88a53]/25"
                              : "border-white/10 bg-[#14110f] hover:border-[#c88a53]/50"
                          }`}
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="truncate text-sm font-black text-[#fdf8f5]">
                              {shop.name}
                            </span>
                            {isCurrent && (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[#081510]">
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <span className="mt-1 text-xs font-semibold text-[#c88a53]">
                            {shop.district}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-2xl border border-[#c88a53]/40 bg-[#14110f] px-4 py-3">
                    <div>
                      <p className="text-base font-black text-[#fdf8f5]">
                        {currentShop.name}
                      </p>
                      <p className="text-xs font-semibold text-[#c88a53]">
                        {currentShop.district} • {shopSettings.openTime} -{" "}
                        {shopSettings.closeTime}
                      </p>
                    </div>
                    <span className="rounded-xl bg-emerald-500/20 px-3 py-1 text-xs font-extrabold text-emerald-300">
                      Seçili Salon ✓
                    </span>
                  </div>
                )}
              </div>

              {/* Usta / Koltuk Seçimi (Büyük, sade butonlar) */}
              {barbers.length > 1 && (
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#e6ccb2]">
                    <User className="h-4 w-4 text-[#c88a53]" />
                    <span>Usta / Koltuk Seçin</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {barbers.map((barber) => {
                      const isSelected = selectedBarber?.id === barber.id;
                      return (
                        <button
                          key={barber.id}
                          type="button"
                          onClick={() => setSelectedBarberId(barber.id)}
                          className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition ${
                            isSelected
                              ? "border-[#e6ccb2] bg-gradient-to-r from-[#2e2118] to-[#1a1410] shadow-md shadow-[#c88a53]/20"
                              : "border-white/10 bg-[#14110f] hover:border-white/25"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold text-[#fdf8f5] sm:text-base">
                              {barber.name}
                            </p>
                            <p className="truncate text-xs font-semibold text-[#c88a53]">
                              {barber.chairName}
                            </p>
                          </div>
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                              isSelected
                                ? "border-emerald-400 bg-emerald-500 text-[#081510]"
                                : "border-white/25 bg-[#110e0c]"
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-4 w-4 stroke-[3]" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hizmet Seçimi (Büyük, net tıklanabilir butonlar) */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#e6ccb2]">
                    <Scissors className="h-4 w-4 text-[#c88a53]" />
                    <span>Yapılacak İşlemi Seçin</span>
                  </label>
                  <span className="rounded-lg bg-[#c88a53]/20 px-2.5 py-1 text-xs font-extrabold text-[#e6ccb2]">
                    Toplam: {totalPrice} TL
                  </span>
                </div>

                <div className="space-y-2.5">
                  {services.map((service: Service) => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    const effectivePrice = getServicePriceForBarber(
                      service,
                      selectedBarber
                    );

                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleService(service.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-4 text-left transition active:scale-[0.99] ${
                          isSelected
                            ? "border-emerald-400/80 bg-gradient-to-r from-emerald-950/60 via-[#241b15] to-[#16120f] shadow-lg shadow-emerald-950/40"
                            : "border-white/10 bg-[#14110f] hover:border-white/25"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border-2 transition ${
                              isSelected
                                ? "border-emerald-300 bg-emerald-500 text-[#081510]"
                                : "border-white/25 bg-[#110e0c] text-transparent"
                            }`}
                          >
                            <Check className="h-4 w-4 stroke-[3]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-extrabold text-[#fdf8f5] sm:text-lg">
                              {service.name}
                            </p>
                            <p className="text-xs font-semibold text-stone-400">
                              Süre: {service.duration} dakika
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="rounded-xl border border-[#c88a53]/40 bg-[#c88a53]/15 px-3 py-1.5 text-sm font-black text-[#e6ccb2] sm:text-base">
                            {effectivePrice} TL
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                disabled={selectedServices.length === 0}
                onClick={() => setStep(2)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#e6ccb2]/70 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-4 text-base font-black text-[#1a110b] shadow-xl shadow-[#c88a53]/30 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
              >
                <span>Gün ve Saat Seçimine Geç ({totalPrice} TL)</span>
                <ChevronRight className="h-5 w-5 stroke-[3]" />
              </button>
            </motion.div>
          )}

          {/* ADIM 2: GÜN VE SAAT SEÇİMİ (SADECE BOŞ SAATLER BÜYÜK KUTULAR HALİNDE) */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#14110f] px-3.5 py-2 text-xs font-extrabold text-[#e6ccb2] hover:border-white/30"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Geri</span>
                </button>
                <span className="text-sm font-extrabold text-[#fdf8f5]">
                  Gün ve Boş Saat Seçin
                </span>
                <span className="rounded-lg bg-[#c88a53]/20 px-2.5 py-1 text-xs font-bold text-[#e6ccb2]">
                  {selectedDay.fullDate}
                </span>
              </div>

              {/* Gün Seçimi — Bugünden Başlayan 7 Gerçek Gün (Yatay Kaydırılabilir Şık Kutular) */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#e6ccb2]">
                  <CalendarDays className="h-4 w-4 text-[#c88a53]" />
                  <span>1. Günü Seçin (7 Günlük Canlı Takvim)</span>
                </label>
                <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1.5">
                  {liveDays.map((day) => {
                    const isSelected = selectedDay.id === day.id;
                    const isDayClosed = shopSettings.closedDays.includes(
                      day.dayOfWeek
                    );
                    const freeCount = getSlotsForDay(day.id).filter(
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
                        className={`flex min-w-[116px] shrink-0 flex-col items-center justify-between rounded-2xl border-2 px-3.5 py-3 transition ${
                          isSelected
                            ? "border-[#e6ccb2] bg-gradient-to-b from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/25"
                            : isDayClosed
                            ? "border-white/5 bg-[#120f0d] text-stone-500 opacity-60"
                            : "border-white/10 bg-[#14110f] text-[#fdf8f5] hover:border-white/30"
                        }`}
                      >
                        <span className="whitespace-nowrap text-xs font-black tracking-tight sm:text-sm">
                          {day.chipLabel}
                        </span>
                        <span
                          className={`mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            isSelected
                              ? "bg-[#1a110b]/20 text-[#1a110b]"
                              : isDayClosed
                              ? "bg-rose-500/15 text-rose-400"
                              : "bg-emerald-500/15 text-emerald-400"
                          }`}
                        >
                          {isDayClosed ? "Kapalı" : `${freeCount} Boş Saat`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Saat Seçimi — SADECE BOŞ SAATLER BÜYÜK KUTULAR HALİNDE */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#e6ccb2]">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span>2. Boş Saati Seçin (Sadece Müsait Saatler)</span>
                </label>

                {isSelectedDayClosed ? (
                  <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-6 text-center">
                    <CalendarX2 className="mx-auto h-8 w-8 text-rose-400" />
                    <p className="mt-2 text-base font-extrabold text-[#fdf8f5]">
                      {selectedDay.fullDate} Günü Salon Kapalıdır
                    </p>
                    <p className="mt-1 text-xs text-stone-300">
                      Lütfen yukarıdan başka bir gün seçiniz.
                    </p>
                  </div>
                ) : availableDaySlots.length === 0 ? (
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-6 text-center">
                    <Clock className="mx-auto h-8 w-8 text-amber-400" />
                    <p className="mt-2 text-base font-extrabold text-[#fdf8f5]">
                      Bu Gün İçin Boş Saat Kalmadı
                    </p>
                    <p className="mt-1 text-xs text-stone-300">
                      Lütfen yukarıdaki günlerden bir diğerini seçiniz.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                    {availableDaySlots.map((slot) => {
                      const isSelected = selectedSlot?.time === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`flex flex-col items-center justify-center rounded-2xl border-2 py-4 transition active:scale-95 ${
                            isSelected
                              ? "border-emerald-200 bg-gradient-to-r from-emerald-500 to-teal-500 text-[#06150f] shadow-lg shadow-emerald-500/30"
                              : "border-emerald-500/35 bg-[#131b16] text-[#fdf8f5] hover:border-emerald-400 hover:bg-emerald-950/40"
                          }`}
                        >
                          <span className="text-lg font-black sm:text-xl">
                            {slot.time}
                          </span>
                          <span
                            className={`mt-0.5 text-[11px] font-extrabold ${
                              isSelected ? "text-[#06150f]" : "text-emerald-400"
                            }`}
                          >
                            {isSelected ? "Seçildi ✓" : "Müsait"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={!selectedSlot || isSelectedDayClosed}
                onClick={() => selectedSlot && setStep(3)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#e6ccb2]/70 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-4 text-base font-black text-[#1a110b] shadow-xl shadow-[#c88a53]/30 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
              >
                <span>
                  {selectedSlot
                    ? `${selectedDay.chipLabel} Saat ${selectedSlot.time} İçin Devam Et`
                    : "Lütfen Bir Saat Seçin"}
                </span>
                <ChevronRight className="h-5 w-5 stroke-[3]" />
              </button>
            </motion.div>
          )}

          {/* ADIM 3: İSİM, TELEFON VE KOCAMAN "✅ RANDEVUYU TAMAMLA" BUTONU */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              {stage !== "confirmed" && (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStage("idle");
                        setStep(2);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#14110f] px-3.5 py-2 text-xs font-extrabold text-[#e6ccb2] hover:border-white/30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Saat Değiştir</span>
                    </button>
                    <span className="text-sm font-extrabold text-[#fdf8f5]">
                      Son Adım: İsim ve Telefon
                    </span>
                  </div>

                  {/* Seçilen Randevu Özeti Kutusu */}
                  <div className="rounded-2xl border border-[#c88a53]/45 bg-[#14110f] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#c88a53]">
                          {currentShop.name} • {selectedBarber?.name}
                        </p>
                        <p className="mt-0.5 text-base font-black text-[#fdf8f5]">
                          {selectedServices.map((s) => s.name).join(" + ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block rounded-xl bg-emerald-500/20 px-3 py-1 text-sm font-black text-emerald-300">
                          {selectedDay.chipLabel} • Saat {selectedSlot?.time}
                        </span>
                        <p className="mt-1 text-base font-black text-[#e6ccb2]">
                          Toplam: {totalPrice} TL
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Form Alanı */}
              {stage === "idle" && (
                <form
                  onSubmit={handleCompleteBookingSubmit}
                  className="space-y-4 rounded-2xl border border-white/10 bg-[#14110f] p-4 sm:p-5"
                >
                  <div>
                    <label className="mb-1.5 block text-sm font-black text-[#fdf8f5]">
                      Adınız Soyadınız *
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#c88a53]" />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Örn: Ahmet Yılmaz"
                        className="w-full rounded-2xl border-2 border-white/15 bg-[#0e0c0a] py-3.5 pl-11 pr-4 text-base font-bold text-[#fdf8f5] placeholder-stone-500 outline-none transition focus:border-[#c88a53]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-black text-[#fdf8f5]">
                      Cep Telefonu Numaranız *
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-400" />
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="05XX XXX XX XX"
                        className="w-full rounded-2xl border-2 border-white/15 bg-[#0e0c0a] py-3.5 pl-11 pr-4 text-base font-bold text-[#fdf8f5] placeholder-stone-500 outline-none transition focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  {formError && (
                    <p className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm font-bold text-rose-300">
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-300/80 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 py-4 text-lg font-black text-[#06150f] shadow-xl shadow-emerald-500/30 transition hover:brightness-110 active:scale-[0.99]"
                  >
                    <span>✅ Randevuyu Tamamla</span>
                  </button>
                </form>
              )}

              {/* Kara Liste / Ön Kapora Durumu */}
              {(stage === "deposit_required" ||
                stage === "processing_deposit") && (
                <div className="rounded-3xl border-2 border-[#c88a53] bg-[#181310] p-5">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-7 w-7 shrink-0 text-rose-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-[#fdf8f5]">
                        {isBlockedByShopPolicy
                          ? "Online Randevu Oluşturulamadı"
                          : `Randevu Onayı İçin ${requiredDepositAmount} TL Ön Kapora Gerekmektedir`}
                      </h3>
                      <p className="mt-1 text-xs text-[#e6ccb2]/85">
                        {isBlockedByShopPolicy
                          ? `${currentShop.name} salon politikası gereği bu numara ile online randevu alınamamaktadır.`
                          : `Randevunuzu garantilemek için ${requiredDepositAmount} TL ön kapora ödemeniz gerekmektedir.`}
                      </p>
                    </div>
                  </div>

                  {isBlockedByShopPolicy ? (
                    <button
                      type="button"
                      onClick={() => setStage("idle")}
                      className="mt-4 w-full rounded-xl border border-white/20 bg-[#110e0c] py-3 text-xs font-bold text-[#e6ccb2]"
                    >
                      Geri Dön
                    </button>
                  ) : (
                    <>
                      <div className="mt-4 rounded-xl border border-white/10 bg-[#110e0c] p-3">
                        <div className="mb-2 flex items-center justify-between text-xs text-[#fdf8f5]">
                          <span className="flex items-center gap-1 font-bold">
                            <CreditCard className="h-4 w-4 text-[#c88a53]" />
                            Kapora Ödemesi ({requiredDepositAmount} TL)
                          </span>
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Lock className="h-3 w-3" /> 3D Secure
                          </span>
                        </div>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full rounded-lg border border-white/15 bg-[#181310] px-3 py-2 font-mono text-xs text-[#fdf8f5]"
                        />
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setStage("idle")}
                          className="rounded-xl border border-white/15 bg-[#110e0c] px-4 py-3 text-xs font-bold text-[#e6ccb2]"
                        >
                          Geri
                        </button>
                        <button
                          type="button"
                          disabled={stage === "processing_deposit"}
                          onClick={handleCompleteDepositBooking}
                          className="flex-1 rounded-xl bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3 text-sm font-black text-[#1a110b]"
                        >
                          {stage === "processing_deposit"
                            ? "Onaylanıyor..."
                            : `✅ ${requiredDepositAmount} TL Kapora Öde ve Tamamla`}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* RANDEVU ALINDI BAŞARI EKRANI */}
              {stage === "confirmed" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-3xl border-2 border-emerald-500/60 bg-gradient-to-b from-emerald-950/40 via-[#181411] to-[#120f0d] p-5 text-center shadow-2xl sm:p-6"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-[#06150f] shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
                  </div>

                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-300">
                    RANDEVUNUZ ALINDI • BERBERE OTOMATİK BİLDİRİLDİ 🔔
                  </span>

                  <h3 className="mt-2 text-2xl font-black text-[#fdf8f5]">
                    Teşekkürler, {customerName}!
                  </h3>
                  <p className="mt-1 text-xs text-stone-300">
                    Randevunuz berber ekranına sesli ve anlık bildirim olarak
                    iletildi.
                  </p>

                  {confirmedAppointment && (
                    <div className="mx-auto mt-3 max-w-xs rounded-2xl border border-[#c88a53]/40 bg-[#14100d] p-3">
                      <span className="block text-[10px] font-bold uppercase text-[#e6ccb2]">
                        Randevu Kodunuz
                      </span>
                      <div className="mt-1 flex items-center justify-center gap-2">
                        <span className="font-mono text-lg font-black text-[#e6ccb2]">
                          {confirmedAppointment.appointmentCode}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyCode(confirmedAppointment.appointmentCode)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#1c1613] px-2 py-1 text-[11px] font-bold text-[#e6ccb2]"
                        >
                          <Copy className="h-3 w-3" />
                          <span>{copiedCode ? "Kopyalandı" : "Kopyala"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-[#120f0d] p-4 text-left text-sm">
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span className="text-stone-400">Dükkan / Usta:</span>
                      <span className="font-bold text-[#fdf8f5]">
                        {currentShop.name} ({selectedBarber?.name})
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span className="text-stone-400">Tarih & Saat:</span>
                      <span className="font-black text-emerald-400">
                        {selectedDay.fullDate} • {selectedSlot?.time}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span className="text-stone-400">Hizmet:</span>
                      <span className="font-bold text-[#fdf8f5]">
                        {selectedServices.map((s) => s.name).join(" + ")}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="font-bold text-[#e6ccb2]">
                        Toplam Tutar:
                      </span>
                      <span className="text-base font-black text-[#c88a53]">
                        {totalPrice} TL
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2.5">
                    <a
                      href={buildWhatsAppUrl(
                        currentShop?.phone,
                        `Merhaba, ben ${
                          confirmedAppointment?.customerName ||
                          customerName.trim()
                        }. ${
                          confirmedAppointment?.dateLabel ||
                          selectedDay.fullDate
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
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-300/70 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 py-4 text-sm font-black text-[#081510] shadow-lg shadow-emerald-500/30 transition hover:brightness-110 active:scale-[0.99] sm:text-base"
                    >
                      <span>📲 Berbere WhatsApp&apos;tan Bildir</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleResetWizard}
                      className="w-full rounded-2xl border border-white/15 bg-[#14100d] py-3 text-xs font-bold text-[#e6ccb2] transition hover:border-[#c88a53]"
                    >
                      Yeni Randevu Oluştur
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
