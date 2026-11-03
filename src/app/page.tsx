"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  MessageSquare,
  Zap,
} from "lucide-react";
import {
  PWA_INSTALL_ROLE_KEY,
} from "@/components/AdminPinGate";
import {
  getLiveDaysMetadata,
  getTurkeyNow,
  toIsoDateString,
  Barber,
  Service,
  DayMetadata,
  TimeSlot,
  Appointment,
} from "@/data/mockData";
import {
  useBarber,
  normalizePhone,
  validateTurkishMobilePhone,
  generateVerificationCode,
  formatPhoneForWhatsApp,
  buildWhatsAppUrl,
  DEFAULT_SHOP_WHATSAPP_PHONE,
  minutesToTime,
  timeToMinutes,
  getShopBookingUrl,
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
    confirmAppointment,
    checkHasActiveAppointmentForDay,
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

  // Gerçek ustalar / koltuklar (isAnyOption hariç)
  const realBarbers = useMemo(
    () => barbers.filter((b) => !b.isAnyOption),
    [barbers]
  );

  // Adım 1 & 2: Dükkan / Usta ve Hizmet Seçimi (İlk personel varsayılan olarak seçili)
  const [selectedBarberId, setSelectedBarberId] = useState<string>("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Gerçek Zamanlı Canlı Tarih (new Date() - Türkiye Saati, Bugün + Önümüzdeki 7 Gün)
  const liveDays = useMemo(() => getLiveDaysMetadata(7), []);
  const todayMeta = liveDays[0];
  const tomorrowMeta = liveDays[1] || liveDays[0];

  // Slotun geçmiş olup olmadığını kontrol et (Bugün ise: şu anki saatten küçük veya 15 dk'dan az kalmışsa)
  const isSlotPassedOrImminent = useCallback(
    (slotTime: string, isTodayDay: boolean): boolean => {
      if (!isTodayDay) return false;
      const nowTr = getTurkeyNow();
      const currentMinutes = nowTr.getHours() * 60 + nowTr.getMinutes();
      const slotMinutes = timeToMinutes(slotTime);
      return slotMinutes < currentMinutes + 15;
    },
    []
  );

  // Bugün için mesai bitti mi veya alınabilecek geçerli boş saat kaldı mı?
  const isTodayWorkEnded = useMemo(() => {
    if (!todayMeta) return false;
    const isTodayClosed = shopSettings.closedDays.includes(todayMeta.dayOfWeek);
    if (isTodayClosed) return true;
    const todaySlots = getSlotsForDay(todayMeta.id);
    const hasRemainingSlot = todaySlots.some(
      (s) => s.state === "available" && !isSlotPassedOrImminent(s.time, true)
    );
    return !hasRemainingSlot;
  }, [todayMeta, shopSettings.closedDays, getSlotsForDay, isSlotPassedOrImminent]);

  // Adım 2: Gün ve Saat Seçimi (Mesai bittiyse varsayılan olarak Yarın seçili gelir)
  const [selectedDay, setSelectedDay] = useState<DayMetadata>(() => {
    const days = getLiveDaysMetadata(7);
    const tDay = days[0];
    const tomDay = days[1] || days[0];
    const nowTr = getTurkeyNow();
    const currentMins = nowTr.getHours() * 60 + nowTr.getMinutes();
    // 20:45 ve sonrasında bugün için randevu kalmamıştır
    if (currentMins >= 21 * 60 - 15) {
      return tomDay;
    }
    return tDay;
  });
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Akıllı UX: Mesai bittiyse ve bugün hiçbir boş saat kalmadıysa otomatik "Yarın" gününü seçili getir
  const [hasAutoSwitchedDay, setHasAutoSwitchedDay] = useState<boolean>(false);
  useEffect(() => {
    if (!hasAutoSwitchedDay && isTodayWorkEnded && tomorrowMeta) {
      setSelectedDay(tomorrowMeta);
      setHasAutoSwitchedDay(true);
    }
  }, [isTodayWorkEnded, tomorrowMeta, hasAutoSwitchedDay]);

  // Adım 3: İsim, Telefon ve Onay
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [canComeEarly, setCanComeEarly] = useState<boolean>(true);
  const [stage, setStage] = useState<VerificationStage>("idle");
  const [cardNumber, setCardNumber] = useState<string>("4543 •••• •••• 8890");
  const [formError, setFormError] = useState<string>("");
  const [confirmedAppointment, setConfirmedAppointment] =
    useState<Appointment | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Dükkan değiştiğinde seçimleri sıfırla (Sadece ve sadece dükkan slug'ı gerçekten değiştiğinde çalışır)
  const prevShopSlugRef = useRef<string>(currentShopSlug);
  useEffect(() => {
    if (prevShopSlugRef.current !== currentShopSlug) {
      prevShopSlugRef.current = currentShopSlug;
      const firstReal = realBarbers[0] || barbers[0];
      if (firstReal) {
        setSelectedBarberId(firstReal.id);
      }
      setSelectedSlot(null);
      setStage("idle");
      setConfirmedAppointment(null);
    }
  }, [currentShopSlug, realBarbers, barbers]);

  // Sayfa ilk açıldığında henüz berber seçilmemişse ilk personeli seç (Randevu eklenince sıfırlanmaz!)
  useEffect(() => {
    if (!selectedBarberId && realBarbers.length > 0) {
      setSelectedBarberId(realBarbers[0].id);
    }
  }, [realBarbers, selectedBarberId]);

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
    () =>
      barbers.find((b) => b.id === selectedBarberId) ||
      realBarbers[0] ||
      barbers[0] ||
      null,
    [barbers, realBarbers, selectedBarberId]
  );

  // Seçili personele / koltuğa özel günün slotları (Harun'un randevusu Ali'yi bloke etmez!)
  const currentDaySlots = useMemo(
    () => getSlotsForDay(selectedDay.id, selectedBarber?.id),
    [getSlotsForDay, selectedDay.id, selectedBarber?.id]
  );

  // Seçili gün bugün mü?
  const isSelectedDayToday = useMemo(() => {
    return Boolean(
      selectedDay.isToday ||
        selectedDay.isoDate === toIsoDateString(getTurkeyNow())
    );
  }, [selectedDay]);

  // Sadece boş (müsait) saatler
  const availableDaySlots = useMemo(
    () => currentDaySlots.filter((s) => s.state === "available"),
    [currentDaySlots]
  );

  // Bugün ise geçmiş saatleri eleyerek gerçek alınabilir boş saatleri bul
  const validAvailableSlots = useMemo(() => {
    return availableDaySlots.filter((slot) => {
      if (isSelectedDayToday) {
        return !isSlotPassedOrImminent(slot.time, true);
      }
      return true;
    });
  }, [availableDaySlots, isSelectedDayToday, isSlotPassedOrImminent]);

  // Geçmiş bir saat seçilmişse seçimi temizle
  useEffect(() => {
    if (
      selectedSlot &&
      isSelectedDayToday &&
      isSlotPassedOrImminent(selectedSlot.time, true)
    ) {
      setSelectedSlot(null);
    }
  }, [selectedSlot, isSelectedDayToday, isSlotPassedOrImminent]);

  // Seçili gün Bugün ise ve geçerli boş saat kalmamışsa müşteriyi otomatik Yarına geçir
  useEffect(() => {
    if (isSelectedDayToday && validAvailableSlots.length === 0 && tomorrowMeta) {
      setSelectedDay(tomorrowMeta);
      setSelectedSlot(null);
    }
  }, [isSelectedDayToday, validAvailableSlots.length, tomorrowMeta]);

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

    // 4 Haneli WhatsApp Onay Kodu (Örn: #4829)
    const verificationCode = generateVerificationCode();

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
        : "WhatsApp Onay Kodu Doğrulaması",
      depositAmount: withDeposit ? requiredDepositAmount : undefined,
      status: "confirmed", // Doğrudan onaylandı olarak kaydedilir
      verificationCode,
      reminderSent: false,
      bookingSource: "online",
      canComeEarly,
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

    // 1. Telefon Numarası Formatı ve Sahte/Tekrarlı Numara Doğrulaması (Anti-Spam)
    const phoneValidation = validateTurkishMobilePhone(customerPhone);
    if (!phoneValidation.isValid) {
      setFormError(
        phoneValidation.error ||
          "Lütfen 05XX XXX XX XX formatında geçerli bir cep telefonu numarası giriniz."
      );
      return;
    }

    // 4. Tek Aktif Randevu Sınırı:
    // Aynı telefon numarasıyla aynı gün içinde birden fazla aktif/bekleyen randevu alınmasını engelle
    const existingActive = checkHasActiveAppointmentForDay(
      phoneValidation.cleanPhone,
      selectedDay.id
    );
    if (existingActive) {
      setFormError(
        `Bu telefon numarasıyla ${selectedDay.chipLabel} için zaten aktif/bekleyen bir randevunuz var (Saat: ${existingActive.time}). Aynı gün içinde sadece tek bir randevu oluşturabilirsiniz.`
      );
      return;
    }

    if (isPhoneBlacklisted(customerPhone)) {
      setStage("deposit_required");
      return;
    }

    // Doğrudan 'pending' (Onay Bekliyor) statüsü ve 4 haneli kod ile kaydet
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
          <p className="mt-2 text-sm text-[#f3e8dc]/80">
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
          <p className="mt-2 text-sm text-[#f3e8dc]/80">
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
    <div className="mx-auto max-w-xl px-2.5 pb-20 pt-2 sm:px-4 sm:pt-4">
      {/* EN ÜSTTE DOĞRUDAN ADIM ADIM RANDEVU ALMA KUTUSU */}
      <div className="overflow-hidden rounded-2xl border border-[#dfc39e]/35 bg-[#141416] p-3 sm:p-5 shadow-xl">
        {/* 3 Adım Göstergesi */}
        {stage !== "confirmed" && (
          <div className="mb-3.5 grid grid-cols-3 gap-1.5">
            {stepsBar.map((item) => {
              const isActive = step === item.num;
              const isDone = step > item.num;
              return (
                <button
                  key={item.num}
                  type="button"
                  disabled={!isDone}
                  onClick={() => isDone && setStep(item.num)}
                  className={`flex items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center text-[11px] font-extrabold transition sm:text-xs ${
                    isActive
                      ? "border-[#f3e8dc]/70 bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b]"
                      : isDone
                      ? "cursor-pointer border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
                      : "cursor-default border-white/10 bg-[#111113] text-stone-500"
                  }`}
                >
                  {isDone && <Check className="h-3 w-3 shrink-0 stroke-[3]" />}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ADIM 1: DÜKKAN VE HİZMET SEÇİMİ (KOMPAKT & SIKI IZGARA) */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="space-y-3.5"
            >
              {/* Dükkan Seçimi */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-[#f3e8dc]">
                  <Store className="h-3.5 w-3.5 text-[#dfc39e]" />
                  <span>Berber Dükkanı Seçimi</span>
                </label>

                {!hasShopQueryParam && shops.length > 1 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {shops.map((shop) => {
                      const isCurrent = shop.slug === currentShop.slug;
                      return (
                        <button
                          key={shop.slug}
                          type="button"
                          onClick={() => setCurrentShopSlug(shop.slug)}
                          className={`flex flex-col items-start justify-between rounded-xl border-2 p-2.5 text-left transition ${
                            isCurrent
                              ? "border-[#f3e8dc] bg-[#1a191d] text-[#fdf8f5]"
                              : "border-white/10 bg-[#141417] text-stone-300 hover:border-white/20"
                          }`}
                        >
                          <div className="flex w-full items-center justify-between gap-1">
                            <span className="truncate text-xs font-black text-[#fdf8f5]">
                              {shop.name}
                            </span>
                            {isCurrent && (
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[#081510]">
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <span className="mt-0.5 truncate text-[10px] font-semibold text-[#dfc39e]">
                            {shop.district}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-[#dfc39e]/35 bg-[#141417] px-3 py-2">
                    <div>
                      <p className="text-sm font-black text-[#fdf8f5]">
                        {currentShop.name}
                      </p>
                      <p className="text-[11px] font-semibold text-[#dfc39e]">
                        {currentShop.district} • {shopSettings.openTime} -{" "}
                        {shopSettings.closeTime}
                      </p>
                    </div>
                    <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                      Seçili Salon ✓
                    </span>
                  </div>
                )}
              </div>

              {/* Usta / Koltuk Seçimi (Kompakt Grid) */}
              {realBarbers.length > 1 && (
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-[#f3e8dc]">
                    <User className="h-3.5 w-3.5 text-[#dfc39e]" />
                    <span>Usta / Koltuk Seçin</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {realBarbers.map((barber) => {
                      const isSelected = selectedBarber?.id === barber.id;
                      return (
                        <button
                          key={barber.id}
                          type="button"
                          onClick={() => setSelectedBarberId(barber.id)}
                          className={`flex items-center justify-between gap-2 rounded-xl border-2 p-2.5 text-left transition ${
                            isSelected
                              ? "border-[#f3e8dc] bg-[#1a191d] text-[#fdf8f5]"
                              : "border-white/10 bg-[#141417] text-stone-300 hover:border-white/20"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-[#fdf8f5]">
                              {barber.name}
                            </p>
                            <p className="truncate text-[10px] font-semibold text-[#dfc39e]">
                              {barber.chairName}
                            </p>
                          </div>
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              isSelected
                                ? "border-emerald-400 bg-emerald-500 text-[#081510]"
                                : "border-white/20 bg-transparent"
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hizmet Seçimi (SIKI KOMPAKT IZGARA - METRELERCE KAYDIRMA BİTTİ) */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-[#f3e8dc]">
                    <Scissors className="h-3.5 w-3.5 text-[#dfc39e]" />
                    <span>İşlem Seçin</span>
                  </label>
                  <span className="rounded-lg bg-[#dfc39e]/20 px-2 py-0.5 text-xs font-black text-[#f3e8dc]">
                    Toplam: {totalPrice} TL
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                        className={`flex flex-col justify-between rounded-xl border-2 p-2.5 text-left transition ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-950/30 text-[#fdf8f5]"
                            : "border-white/10 bg-[#141417] text-stone-300 hover:border-white/25"
                        }`}
                      >
                        <div className="flex w-full items-start justify-between gap-1">
                          <span className="text-xs font-bold leading-snug text-[#fdf8f5]">
                            {service.name}
                          </span>
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition ${
                              isSelected
                                ? "border-emerald-300 bg-emerald-500 text-[#081510]"
                                : "border-white/20 bg-transparent text-transparent"
                            }`}
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        </div>
                        <div className="mt-2 flex w-full items-baseline justify-between border-t border-white/5 pt-1">
                          <span className="text-[10px] text-stone-400">
                            {service.duration} dk
                          </span>
                          <span className="text-xs font-black text-[#dfc39e] sm:text-sm">
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] py-3 text-sm font-black text-[#1a110b] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
              >
                <span>Gün & Saat Seçimine Geç</span>
                <ChevronRight className="h-4 w-4 stroke-[3]" />
              </button>
            </motion.div>
          )}

          {/* ADIM 2: GÜN VE SAAT SEÇİMİ (KOMPAKT & GEÇMİŞ SAATLER TAMAMEN GİZLİ) */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="space-y-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-[#141417] px-2.5 py-1.5 text-xs font-bold text-[#f3e8dc] hover:border-white/30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Geri</span>
                </button>
                <span className="text-xs font-black text-[#fdf8f5] sm:text-sm">
                  Gün ve Boş Saat Seçin
                </span>
                <span className="rounded-lg bg-[#dfc39e]/20 px-2 py-0.5 text-xs font-bold text-[#f3e8dc]">
                  {selectedDay.fullDate}
                </span>
              </div>

              {/* Usta / Koltuk Seçimi (1'den Fazla Personel Varsa Şık ve Kompakt Tablar) */}
              {realBarbers.length > 1 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-[#f3e8dc]">
                      <User className="h-3.5 w-3.5 text-[#dfc39e]" />
                      <span>Berber / Koltuk Seçimi</span>
                    </label>
                    <span className="text-[10px] font-semibold text-[#dfc39e]">
                      {selectedBarber?.chairName}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {realBarbers.map((barber) => {
                      const isSelected = selectedBarber?.id === barber.id;
                      return (
                        <button
                          key={barber.id}
                          type="button"
                          onClick={() => {
                            setSelectedBarberId(barber.id);
                            setSelectedSlot(null); // Usta değişince seçili saati sıfırla
                          }}
                          className={`flex items-center justify-between gap-1.5 rounded-xl border-2 px-3 py-2 text-left transition ${
                            isSelected
                              ? "border-[#f3e8dc] bg-[#1a191d] text-[#fdf8f5] shadow-lg shadow-[#dfc39e]/15"
                              : "border-white/10 bg-[#141417] text-stone-300 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="block truncate text-xs font-black text-[#fdf8f5]">
                              {barber.name}
                            </span>
                            <span className="block truncate text-[10px] text-[#dfc39e]">
                              {barber.chairName}
                            </span>
                          </div>
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              isSelected
                                ? "border-emerald-400 bg-emerald-500 text-[#081510]"
                                : "border-white/20 bg-transparent"
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Gün Seçimi — Bugünden Başlayan 7 Gerçek Gün */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-[#f3e8dc]">
                  <CalendarDays className="h-3.5 w-3.5 text-[#dfc39e]" />
                  <span>1. Günü Seçin</span>
                </label>
                <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                  {liveDays.map((day) => {
                    const isSelected = selectedDay.id === day.id;
                    const isDayClosed = shopSettings.closedDays.includes(
                      day.dayOfWeek
                    );
                    const isDayToday = Boolean(
                      day.isToday || day.isoDate === toIsoDateString(getTurkeyNow())
                    );
                    const daySlots = getSlotsForDay(day.id, selectedBarber?.id);
                    const validDaySlots = daySlots.filter((s) => {
                      if (s.state !== "available") return false;
                      if (isDayToday && isSlotPassedOrImminent(s.time, true)) {
                        return false;
                      }
                      return true;
                    });
                    const freeCount = validDaySlots.length;
                    const isDayWorkEnded = isDayToday && freeCount === 0;

                    let badgeText = `${freeCount} Boş`;
                    let badgeClass = "bg-emerald-500/15 text-emerald-400";

                    if (isDayClosed) {
                      badgeText = "Kapalı";
                      badgeClass = "bg-rose-500/15 text-rose-400";
                    } else if (isDayWorkEnded) {
                      badgeText = "Bitti";
                      badgeClass = "bg-amber-500/15 text-amber-400";
                    } else if (freeCount === 0) {
                      badgeText = "Dolu";
                      badgeClass = "bg-stone-500/15 text-stone-400";
                    }

                    if (isSelected) {
                      badgeClass = "bg-[#1a110b]/20 text-[#1a110b]";
                    }

                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          setSelectedDay(day);
                          setSelectedSlot(null);
                        }}
                        className={`flex min-w-[96px] shrink-0 flex-col items-center justify-between rounded-xl border-2 px-2.5 py-2 transition ${
                          isSelected
                            ? "border-[#f3e8dc] bg-gradient-to-b from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b]"
                            : isDayClosed
                            ? "border-white/5 bg-[#111113] text-stone-500 opacity-60"
                            : "border-white/10 bg-[#141417] text-[#fdf8f5] hover:border-white/30"
                        }`}
                      >
                        <span className="whitespace-nowrap text-xs font-black tracking-tight">
                          {day.chipLabel}
                        </span>
                        <span
                          className={`mt-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold ${badgeClass}`}
                        >
                          {badgeText}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Saat Seçimi — SADECE GERÇEKTEN ALINABİLİR BOŞ SAATLER (GEÇMİŞLER TAMAMEN GİZLİ) */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-[#f3e8dc]">
                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                  <span>2. Boş Saati Seçin ({validAvailableSlots.length} Müsait Saat)</span>
                </label>

                {isSelectedDayClosed ? (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 text-center">
                    <CalendarX2 className="mx-auto h-6 w-6 text-rose-400" />
                    <p className="mt-1.5 text-sm font-extrabold text-[#fdf8f5]">
                      {selectedDay.fullDate} Günü Salon Kapalıdır
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      Lütfen yukarıdan başka bir gün seçiniz.
                    </p>
                  </div>
                ) : validAvailableSlots.length === 0 ? (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-center">
                    <Clock className="mx-auto h-6 w-6 text-amber-400" />
                    <p className="mt-1.5 text-sm font-extrabold text-[#fdf8f5]">
                      {isSelectedDayToday
                        ? "Bugün İçin Alınabilir Saat Kalmadı"
                        : "Bu Gün İçin Boş Saat Kalmadı"}
                    </p>
                    <p className="mt-0.5 text-xs text-[#f3e8dc]/80">
                      {isSelectedDayToday
                        ? "Mesai sona ermiştir. Yarına randevu alabilirsiniz."
                        : "Lütfen diğer günlerden birini seçiniz."}
                    </p>
                    {isSelectedDayToday && tomorrowMeta && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDay(tomorrowMeta);
                          setSelectedSlot(null);
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] px-4 py-2 text-xs font-extrabold text-[#1a110b]"
                      >
                        <span>👉 Yarının Saatlerini Gör</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
                    {validAvailableSlots.map((slot) => {
                      const isSelected = selectedSlot?.time === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`flex flex-col items-center justify-center rounded-xl border-2 py-2 sm:py-2.5 transition active:scale-95 ${
                            isSelected
                              ? "border-emerald-300 bg-emerald-500 text-[#06150f] font-black shadow-md shadow-emerald-500/20"
                              : "border-emerald-500/30 bg-[#131b16] text-[#fdf8f5] hover:border-emerald-400"
                          }`}
                        >
                          <span className="text-sm font-black sm:text-base">
                            {slot.time}
                          </span>
                          <span
                            className={`text-[9px] font-bold ${
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
                disabled={
                  !selectedSlot ||
                  isSelectedDayClosed ||
                  (isSelectedDayToday &&
                    isSlotPassedOrImminent(selectedSlot.time, true))
                }
                onClick={() => selectedSlot && setStep(3)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] py-3 text-sm font-black text-[#1a110b] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
              >
                <span>
                  {selectedSlot
                    ? `${selectedDay.chipLabel} ${selectedSlot.time} Randevusuna Devam Et`
                    : "Lütfen Bir Saat Seçin"}
                </span>
                <ChevronRight className="h-4 w-4 stroke-[3]" />
              </button>
            </motion.div>
          )}

          {/* ADIM 3: İSİM, TELEFON VE ONAY (KOMPAKT) */}
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
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#141417] px-3.5 py-2 text-xs font-extrabold text-[#f3e8dc] hover:border-white/30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Saat Değiştir</span>
                    </button>
                    <span className="text-sm font-extrabold text-[#fdf8f5]">
                      Son Adım: İsim ve Telefon
                    </span>
                  </div>

                  {/* Seçilen Randevu Özeti Kutusu */}
                  <div className="rounded-xl border border-[#dfc39e]/35 bg-[#141417] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#dfc39e]">
                          {currentShop.name} • {selectedBarber?.name}
                        </p>
                        <p className="mt-0.5 text-xs font-black text-[#fdf8f5] sm:text-sm">
                          {selectedServices.map((s) => s.name).join(" + ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block rounded-lg bg-emerald-500/20 px-2 py-0.5 text-xs font-black text-emerald-300">
                          {selectedDay.chipLabel} • Saat {selectedSlot?.time}
                        </span>
                        <p className="mt-0.5 text-xs font-black text-[#f3e8dc] sm:text-sm">
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
                  className="space-y-3 rounded-xl border border-white/10 bg-[#141417] p-3.5 sm:p-4"
                >
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#fdf8f5]">
                      Adınız Soyadınız *
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#dfc39e]" />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Örn: Ahmet Yılmaz"
                        className="w-full rounded-xl border border-white/15 bg-[#0d0d10] py-2.5 pl-9 pr-3 text-xs font-bold text-[#fdf8f5] placeholder-stone-500 outline-none transition focus:border-[#dfc39e]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#fdf8f5]">
                      Cep Telefonu Numaranız *
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="05XX XXX XX XX"
                        className="w-full rounded-xl border border-white/15 bg-[#0d0d10] py-2.5 pl-9 pr-3 text-xs font-bold text-[#fdf8f5] placeholder-stone-500 outline-none transition focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  {/* ⚡ Erken Saat Yedek Listesi Seçeneği */}
                  <div
                    onClick={() => setCanComeEarly((prev) => !prev)}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition select-none ${
                      canComeEarly
                        ? "border-amber-400/60 bg-gradient-to-r from-amber-950/40 via-[#241a12] to-[#16120f] shadow-sm"
                        : "border-white/10 bg-[#111113] opacity-75 hover:border-white/20"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        canComeEarly
                          ? "border-amber-300 bg-amber-500 text-[#1a110b]"
                          : "border-white/30 bg-transparent text-transparent"
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 text-xs font-black text-[#fdf8f5]">
                        <span>⚡ Daha erken bir saat boşalırsa haber ver (Yedek Liste)</span>
                      </p>
                      <p className="mt-0.5 text-[10px] leading-snug text-[#f3e8dc]/80">
                        Sizin saatinizden önce bir iptal olursa salonumuz sizi arayarak daha erken bir saate alabilir.
                      </p>
                    </div>
                  </div>

                  {formError && (
                    <p className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-300">
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 py-3 text-sm font-black text-[#06150f] shadow-lg shadow-emerald-500/20 transition hover:brightness-110 active:scale-[0.99]"
                  >
                    <span>✅ Randevuyu Tamamla</span>
                  </button>
                </form>
              )}

              {/* Kara Liste / Ön Kapora Durumu */}
              {(stage === "deposit_required" ||
                stage === "processing_deposit") && (
                <div className="rounded-3xl border-2 border-[#dfc39e] bg-[#151518] p-5">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-7 w-7 shrink-0 text-rose-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-[#fdf8f5]">
                        {isBlockedByShopPolicy
                          ? "Online Randevu Oluşturulamadı"
                          : `Randevu Onayı İçin ${requiredDepositAmount} TL Ön Kapora Gerekmektedir`}
                      </h3>
                      <p className="mt-1 text-xs text-[#f3e8dc]/85">
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
                      className="mt-4 w-full rounded-xl border border-white/20 bg-[#101012] py-3 text-xs font-bold text-[#f3e8dc]"
                    >
                      Geri Dön
                    </button>
                  ) : (
                    <>
                      <div className="mt-4 rounded-xl border border-white/10 bg-[#101012] p-3">
                        <div className="mb-2 flex items-center justify-between text-xs text-[#fdf8f5]">
                          <span className="flex items-center gap-1 font-bold">
                            <CreditCard className="h-4 w-4 text-[#dfc39e]" />
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
                          className="w-full rounded-lg border border-white/15 bg-[#151518] px-3 py-2 font-mono text-xs text-[#fdf8f5]"
                        />
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setStage("idle")}
                          className="rounded-xl border border-white/15 bg-[#101012] px-4 py-3 text-xs font-bold text-[#f3e8dc]"
                        >
                          Geri
                        </button>
                        <button
                          type="button"
                          disabled={stage === "processing_deposit"}
                          onClick={handleCompleteDepositBooking}
                          className="flex-1 rounded-xl bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] py-3 text-sm font-black text-[#1a110b]"
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

              {/* WHATSAPP ONAY KODU VE DOĞRULAMA EKRANI (OTOMATİK ONAY) */}
              {stage === "confirmed" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-3xl border-2 p-5 text-center shadow-2xl sm:p-7 transition-all ${
                    confirmedAppointment?.status === "confirmed"
                      ? "border-emerald-500/70 bg-gradient-to-b from-emerald-950/40 via-[#141517] to-[#0f1012]"
                      : "border-amber-500/70 bg-gradient-to-b from-amber-950/40 via-[#181513] to-[#111113]"
                  }`}
                >
                  {confirmedAppointment?.status === "confirmed" ? (
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="h-7 w-7 stroke-[2.5]" />
                    </div>
                  ) : (
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/20">
                      <Clock className="h-7 w-7 animate-pulse stroke-[2.5]" />
                    </div>
                  )}

                  {confirmedAppointment?.status === "confirmed" ? (
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-300">
                      ✅ ONAYLANDI • RANDEVUNUZ KESİNLEŞTİ
                    </span>
                  ) : (
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
                      ⏳ ONAY BEKLİYOR • WHATSAPP İLE GÖNDERİN
                    </span>
                  )}

                  <h3 className="mt-2 text-xl font-black text-[#fdf8f5] sm:text-2xl">
                    {confirmedAppointment?.status === "confirmed"
                      ? `Harika, Randevunuz Kesinleşti ${customerName}!`
                      : `Randevunuz Alındı, ${customerName}!`}
                  </h3>

                  {/* 1. DİKKAT ÇEKİCİ SARI/TURUNCU UYARI KUTUSU */}
                  <div className="mx-auto my-3.5 max-w-md rounded-2xl border-2 border-amber-400 bg-amber-500/20 p-3.5 sm:p-4 text-center shadow-lg shadow-amber-500/15">
                    <p className="text-xs sm:text-sm font-black leading-relaxed text-amber-200">
                      ⚠️ SON ADIM: Randevunuzun geçerli olması için aşağıdaki yeşil butona basarak randevu fişinizi WhatsApp&apos;tan berberinize göndermeniz ZORUNLUDUR.
                    </p>
                  </div>

                  {/* 2. EKRANDA ŞIK VE KOMPAKT RANDEVU ÖZETİ KARTI VE BUTON */}
                  {(() => {
                    const rawCode =
                      confirmedAppointment?.verificationCode || "#4829";
                    const vCode = rawCode.startsWith("#") ? rawCode : `#${rawCode}`;
                    const barberText =
                      confirmedAppointment?.barberName || selectedBarber?.name || "Usta";
                    const dateText =
                      selectedDay.fullDate ||
                      confirmedAppointment?.dateLabel ||
                      selectedDay.chipLabel;
                    const timeText =
                      confirmedAppointment?.time || selectedSlot?.time || "";
                    const serviceNamesText =
                      confirmedAppointment?.services?.map((s) => s.name).join(" + ") ||
                      selectedServices.map((s) => s.name).join(" + ") ||
                      "Saç Kesimi";
                    const isEarlyEligible = Boolean(
                      confirmedAppointment?.canComeEarly ?? canComeEarly
                    );

                    // 3. WHATSAPP TAM BİLDİRİM ŞABLONU
                    const waMessageLines = [
                      `✂️ *YENİ RANDEVU ONAYI* (${vCode})`,
                      `👤 *Müşteri:* ${customerName.trim()}`,
                      `💈 *Usta:* ${barberText}`,
                      `📅 *Tarih:* ${dateText} | ⏰ *Saat:* ${timeText}`,
                      `📋 *İşlem:* ${serviceNamesText}`,
                    ];
                    if (isEarlyEligible) {
                      waMessageLines.push("⚡ Not: Erken boşluk olursa gelebilir.");
                    }
                    const waMessage = waMessageLines.join("\n");

                    const waHref = buildWhatsAppUrl(
                      currentShop?.phone,
                      waMessage,
                      DEFAULT_SHOP_WHATSAPP_PHONE
                    );

                    const handleOpenWhatsApp = () => {
                      if (typeof window !== "undefined") {
                        window.open(waHref, "_blank", "noopener,noreferrer");
                      }
                    };

                    return (
                      <div className="mx-auto max-w-md space-y-3">
                        {/* Randevu Özeti Kartı (Butonun hemen üstünde) */}
                        <div className="rounded-2xl border border-white/15 bg-[#141417] p-3.5 sm:p-4 text-left shadow-xl space-y-2.5">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <span className="text-xs font-bold text-stone-400">
                              💈 Seçilen Usta:
                            </span>
                            <span className="text-xs sm:text-sm font-black text-[#fdf8f5]">
                              {barberText}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <span className="text-xs font-bold text-stone-400">
                              📅 Tarih:
                            </span>
                            <span className="text-xs sm:text-sm font-black text-[#fdf8f5]">
                              {dateText}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <span className="text-xs font-bold text-stone-400">
                              ⏰ Saat:
                            </span>
                            <span className="text-xs sm:text-sm font-black text-amber-300">
                              {timeText}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <span className="text-xs font-bold text-stone-400">
                              📋 İşlem:
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-[#fdf8f5] text-right truncate max-w-[200px] sm:max-w-[240px]">
                              {serviceNamesText}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-xs font-bold text-[#dfc39e]">
                              🔑 Onay Kodu:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-base font-black tracking-wider text-[#fdf8f5]">
                                {vCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(vCode)}
                                className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-stone-300 hover:bg-white/10"
                              >
                                {copiedCode ? "Kopyalandı" : "Kopyala"}
                              </button>
                            </div>
                          </div>

                          {isEarlyEligible && (
                            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-[11px] font-bold text-amber-300 flex items-center gap-1">
                              <Zap className="h-3 w-3 fill-amber-300 shrink-0" />
                              <span>⚡ Erken boşluk olursa haber verilecek</span>
                            </div>
                          )}
                        </div>

                        {/* BÜYÜK YEŞİL WHATSAPP BUTONU (window.open ile yeni sekmede açılır) */}
                        <button
                          type="button"
                          onClick={handleOpenWhatsApp}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 py-4 px-3 text-sm sm:text-base font-black text-[#081510] shadow-xl shadow-emerald-500/30 transition hover:brightness-110 active:scale-[0.99] cursor-pointer"
                        >
                          <MessageSquare className="h-5 w-5 fill-[#081510] shrink-0" />
                          <span className="text-center">
                            💬 WhatsApp&apos;tan Gönder ve Kesinleştir
                          </span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* KÜÇÜK VE GRİ YENİ RANDEVU AL / ANA SAYFAYA DÖN BUTONU */}
                  <div className="mt-4 pt-1 text-center">
                    <button
                      type="button"
                      onClick={handleResetWizard}
                      className="text-xs text-stone-400 hover:text-stone-200 underline underline-offset-4 transition cursor-pointer"
                    >
                      Yeni Randevu Al / Ana Sayfaya Dön
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
