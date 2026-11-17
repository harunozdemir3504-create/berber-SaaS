"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import VipLandingPage from "@/components/VipLandingPage";
import ReelsAdStudio from "@/components/ReelsAdStudio";
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
  CalendarDays,
  MessageSquare,
  Zap,
  Edit2,
  Search,
  X,
  MapPin,
} from "lucide-react";
import {
  PWA_INSTALL_ROLE_KEY,
} from "@/components/AdminPinGate";
import {
  getLiveDaysMetadata,
  getTurkeyNow,
  toIsoDateString,
  toStrictIsoDate,
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
  const pathname = usePathname();
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
    updateAppointmentPhone,
    checkHasActiveAppointmentForDay,
    isPhoneBlacklisted,
    getSlotsForDay,
    getServicePriceForBarber,
    cancelAppointmentByCustomer,
    findCustomerAppointments,
  } = useBarber();

  const isRootLandingPage = pathname === "/" && !hasShopQueryParam;

  const handleOpenLiveDemo = useCallback(() => {
    const sampleShop =
      shops.find((s) => s.subscriptionStatus === "active") ||
      shops[0] ||
      currentShop;
    const sampleSlug = sampleShop?.slug || "atelier-noir";
    setCurrentShopSlug(sampleSlug);
    router.push(`/?shop=${sampleSlug}&demo=1`);
  }, [shops, currentShop, setCurrentShopSlug, router]);

  // 🎬 /?reels → Tam Otomatik Sesli Reels Reklam Stüdyosu
  const [reelsOpen, setReelsOpen] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).has("reels")) {
      setReelsOpen(true);
    }
  }, []);
  const handleCloseReels = useCallback(() => {
    setReelsOpen(false);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

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

  // Slotun geçmiş olup olmadığını kontrol et (Bugün ise: slot başlangıç saati şu anki saatten küçük veya eşitse geçmiş sayılır;
  // örn. saat 18:45 ise 18:30 dilimi geçmiş sayılır ve müşteri seçemez)
  const isSlotPassedOrImminent = useCallback(
    (slotTime: string, isTodayDay: boolean): boolean => {
      if (!isTodayDay) return false;
      const nowTr = getTurkeyNow();
      const currentMinutes = nowTr.getHours() * 60 + nowTr.getMinutes();
      const slotMinutes = timeToMinutes(slotTime);
      return slotMinutes <= currentMinutes;
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
    // 21:00 kapanış sonrasında bugün için randevu kalmamıştır
    if (currentMins >= 21 * 60) {
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
  const [canComeEarly, setCanComeEarly] = useState<boolean>(false);
  const [whatsappClicked, setWhatsappClicked] = useState<boolean>(false);
  const [stage, setStage] = useState<VerificationStage>("idle");
  const [cardNumber, setCardNumber] = useState<string>("4543 •••• •••• 8890");
  const [formError, setFormError] = useState<string>("");
  const [confirmedAppointment, setConfirmedAppointment] =
    useState<Appointment | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isEditingPhoneOnConfirm, setIsEditingPhoneOnConfirm] = useState<boolean>(false);
  const [tempPhoneOnConfirm, setTempPhoneOnConfirm] = useState<string>("");
  const [phoneEditError, setPhoneEditError] = useState<string>("");
  const [phoneEditSuccess, setPhoneEditSuccess] = useState<boolean>(false);
  const [copiedIban, setCopiedIban] = useState<boolean>(false);
  const [isCancelledOnConfirm, setIsCancelledOnConfirm] = useState<boolean>(false);

  // Randevumu Sorgula & İptal Et Modalı State'leri
  const [isLookupModalOpen, setIsLookupModalOpen] = useState<boolean>(false);
  const [lookupPhoneInput, setLookupPhoneInput] = useState<string>("");
  const [lookupResults, setLookupResults] = useState<Appointment[] | null>(null);
  const [lookupMessage, setLookupMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

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
      setCanComeEarly(false);
      setWhatsappClicked(false);
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
      if (valid.length > 0) {
        return [valid[0]]; // Her zaman tek seçim
      }
      if (services.length > 0) {
        return [services[0].id];
      }
      return [];
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

  // Seçili günün kesin YYYY-MM-DD tarihi
  const selectedDate = useMemo(
    () => toStrictIsoDate(selectedDay.isoDate || selectedDay.id),
    [selectedDay.isoDate, selectedDay.id]
  );

  // KESİN ÇÖZÜM: Gün değiştirildiğinde (selectedDate değiştiğinde) önceki günün saat seçim state'ini temizle
  useEffect(() => {
    setSelectedSlot(null);
    setFormError("");
  }, [selectedDate]);

  // Seçili personele / koltuğa ve seçili tarihe (selectedDate) özel günün slotları
  const currentDaySlots = useMemo(
    () => getSlotsForDay(selectedDate, selectedBarber?.id),
    [getSlotsForDay, selectedDate, selectedBarber?.id]
  );

  // Seçili gün bugün mü?
  const isSelectedDayToday = useMemo(() => {
    return Boolean(
      selectedDay.isToday ||
        selectedDay.isoDate === toIsoDateString(getTurkeyNow())
    );
  }, [selectedDay]);

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
    () =>
      selectedServices.reduce((sum, item) => sum + (Number(item.duration) || 30), 0) ||
      30,
    [selectedServices]
  );

  // Sadece boş (müsait) saatler
  const availableDaySlots = useMemo(
    () => currentDaySlots.filter((s) => s.state === "available"),
    [currentDaySlots]
  );

  // Seçilen süreye (örn: 45 dk, 60 dk) ve çalışma saatlerine göre gerçek alınabilir slotlar
  const validAvailableSlots = useMemo(() => {
    const closeM = shopSettings?.closeTime ? timeToMinutes(shopSettings.closeTime) : 21 * 60;
    const step = 30;
    const slotCount = Math.ceil((Number(totalDuration) || 30) / step);

    return availableDaySlots.filter((slot) => {
      // 1. Bugün ise geçmiş saatleri ele
      if (isSelectedDayToday && isSlotPassedOrImminent(slot.time, true)) {
        return false;
      }

      // 2. Kapanış saatini aşıyor mu?
      const startM = timeToMinutes(slot.time);
      if (startM + totalDuration > closeM) {
        return false;
      }

      // 3. 45 dk, 60 dk ve üzeri randevularda Math.ceil ile hesaplanan ardışık tüm slotların boş olduğunu doğrula
      if (slotCount > 1) {
        for (let i = 1; i < slotCount; i++) {
          const nextTime = minutesToTime(startM + i * step);
          const nextSlot = currentDaySlots.find((s) => s.time === nextTime);
          if (!nextSlot || nextSlot.state !== "available") {
            return false;
          }
        }
      }

      return true;
    });
  }, [availableDaySlots, isSelectedDayToday, isSlotPassedOrImminent, totalDuration, shopSettings?.closeTime, currentDaySlots]);

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


  const blacklistRecord = useMemo(
    () => isPhoneBlacklisted(customerPhone),
    [customerPhone, isPhoneBlacklisted]
  );

  const isNoShowPhone = Boolean(blacklistRecord);
  const requiredDepositAmount = currentShop.depositAmount || 100;
  const isBlockedByShopPolicy =
    currentShop.depositPolicy === "block_booking" && isNoShowPhone;

  const toggleService = (id: string) => {
    setSelectedServiceIds([id]);
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
    const isBlacklisted = Boolean(isPhoneBlacklisted(customerPhone.trim()));
    const depositAmountValue = isBlacklisted || withDeposit ? requiredDepositAmount : undefined;

    const created = addAppointment({
      dayId: selectedDate,
      date: selectedDate,
      appointment_date: selectedDate,
      appointment_time: selectedSlot.time,
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
      trustBadge: isBlacklisted ? "deposit_paid" : withDeposit ? "deposit_paid" : "first_time",
      trustDetail: isBlacklisted
        ? `${requiredDepositAmount} TL Kapora Zorunlu (Kara Liste - Gelmedi)`
        : withDeposit
        ? `${requiredDepositAmount} TL Kapora Alındı`
        : "WhatsApp Onay Kodu Doğrulaması",
      depositAmount: depositAmountValue,
      status: isBlacklisted ? "pending" : "confirmed", // Kara listedeki müşteri kesinlikle otomatik onaylanmaz; berber onayı bekler
      requiresDeposit: isBlacklisted,
      isBlacklisted: isBlacklisted,
      verificationCode,
      reminderSent: false,
      bookingSource: "online",
      canComeEarly: Boolean(canComeEarly),
    });

    setWhatsappClicked(false);
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
      selectedDate
    );
    if (existingActive) {
      setFormError(
        `Bu telefon numarasıyla ${selectedDay.chipLabel} için zaten aktif/bekleyen bir randevunuz var (Saat: ${existingActive.time}). Aynı gün içinde sadece tek bir randevu oluşturabilirsiniz.`
      );
      return;
    }

    // Kara listede olsa dahi randevu engellenmez, son adımda IBAN ve kapora dekontu uyarısı gösterilir
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
    setCanComeEarly(false);
    setWhatsappClicked(false);
    setConfirmedAppointment(null);
    setStage("idle");
    setIsEditingPhoneOnConfirm(false);
    setPhoneEditError("");
    setPhoneEditSuccess(false);
    setIsCancelledOnConfirm(false);
  };

  // Son Onay Ekranından Randevu İptali
  const handleCancelCurrentAppointment = () => {
    if (!confirmedAppointment?.id) return;
    cancelAppointmentByCustomer(confirmedAppointment.id);
    setIsCancelledOnConfirm(true);
  };

  // Randevumu Sorgula & İptal Et
  const handleLookupSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupMessage(null);
    const cleaned = lookupPhoneInput.trim();
    if (!cleaned || cleaned.replace(/\D/g, "").length < 10) {
      setLookupMessage({
        text: "Lütfen geçerli bir cep telefonu numarası giriniz (örn: 0532 123 45 67).",
        type: "error",
      });
      return;
    }
    const found = findCustomerAppointments(cleaned);
    const activeOnes = found.filter((a) => a.status !== "cancelled" && a.status !== "completed");
    setLookupResults(activeOnes);
    if (activeOnes.length === 0) {
      setLookupMessage({
        text: "Bu telefon numarasına ait aktif bir randevu bulunamadı.",
        type: "info",
      });
    }
  };

  const handleCancelFromLookup = (aptId: string) => {
    cancelAppointmentByCustomer(aptId);
    setLookupResults((prev) => (prev ? prev.filter((a) => a.id !== aptId) : []));
    setLookupMessage({
      text: "Randevunuz başarıyla iptal edildi. Seçtiğiniz saat takvimde anında boşa çıkarıldı.",
      type: "success",
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // 🎬 /?reels → şifresiz, doğrudan Reels Stüdyosu (landing/hydration beklemeden)
  if (reelsOpen) {
    return <ReelsAdStudio onClose={handleCloseReels} />;
  }

  // ANA KÖK DİZİN (/): Hiçbir dükkan parametresi (?shop=) olmadan girildiğinde B2B SaaS Tanıtım ve Satış Vitrini açılır
  if (isRootLandingPage) {
    return (
      <>
        <VipLandingPage
          onOpenLiveDemo={handleOpenLiveDemo}
          demoShopName={currentShop.name}
        />
        {reelsOpen && <ReelsAdStudio onClose={handleCloseReels} />}
      </>
    );
  }

  // Veri yüklenene kadar varsayılan dükkan veya eski logo flash'ını önle
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-20 pt-6">
        <div className="rounded-2xl border border-slate-800 bg-[#0b0f19] p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 animate-pulse bg-amber-500/20 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 animate-pulse rounded-full bg-amber-500/20" />
              <div className="h-3 w-28 animate-pulse rounded-full bg-amber-500/10" />
            </div>
          </div>
          <div className="h-24 w-full animate-pulse rounded-xl bg-white/5" />
          <div className="h-32 w-full animate-pulse rounded-xl bg-white/5" />
        </div>
      </div>
    );
  }

  // SİLİNEN / BİLİNMEYEN DÜKKAN EKRANI
  if (hydrated && !currentShopExists) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-24 pt-10">
        <div className="rounded-3xl border-2 border-rose-500/50 bg-[#1a1311] p-8 text-center shadow-2xl">
          <Ban className="mx-auto h-12 w-12 text-rose-400" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-100">
            Salon Bulunamadı
          </h1>
          <p className="mt-2 text-sm text-slate-300/80">
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
          <h1 className="mt-4 text-xl font-extrabold text-slate-100">
            Bu salonun online randevu sistemi geçici olarak kapalıdır
          </h1>
          <p className="mt-2 text-sm text-slate-300/80">
            <strong>{currentShop.name}</strong> ({currentShop.phone}) ile doğrudan
            iletişime geçebilirsiniz.
          </p>
        </div>
      </div>
    );
  }

  const stepsBar = [
    { num: 1, label: "1. Usta & Hizmet" },
    { num: 2, label: "2. Gün & Saat" },
    { num: 3, label: "3. İsim & Onay" },
  ];

  return (
    <div
      className={`mx-auto max-w-xl px-2.5 pt-2 sm:px-4 sm:pt-3 touch-manipulation select-none ${
        stage !== "confirmed" && (step === 1 || step === 2) ? "pb-28" : "pb-20"
      }`}
    >
      {/* 🌌 Premium Derin Uzay Siyahı Zemin + Asil Altın Hale */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[#090A0F]">
        <div className="absolute left-1/2 top-[-140px] h-[320px] w-[620px] -translate-x-1/2 rounded-full bg-[#D97706]/10 blur-[120px]" />
        <div className="absolute bottom-[-160px] right-[-120px] h-[280px] w-[380px] rounded-full bg-[#10B981]/[0.05] blur-[120px]" />
      </div>

      {/* ÜST BAR: MİNİMALİST SALON BİLGİ ŞERİDİ & RANDEVUMU SORGULA */}
      <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-[#131825]/70 px-2.5 py-1.5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2.5 text-[10px] font-semibold text-slate-400">
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0 text-[#F59E0B]" />
            <span className="truncate">{currentShop.district}</span>
          </span>
          <span className="h-3 w-px shrink-0 bg-slate-700" />
          <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
            <Clock className="h-3 w-3 text-[#10B981]" />
            {shopSettings.openTime}–{shopSettings.closeTime}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setLookupPhoneInput("");
            setLookupResults(null);
            setLookupMessage(null);
            setIsLookupModalOpen(true);
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-200 transition hover:bg-amber-500/20 cursor-pointer active:scale-95"
        >
          <Search className="h-3 w-3 text-[#F59E0B]" />
          <span>Randevumu Sorgula</span>
        </button>
      </div>

      {/* EN ÜSTTE DOĞRUDAN ADIM ADIM RANDEVU ALMA KUTUSU */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b0f19]/90 p-2.5 sm:p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
        {/* 3 Adım Göstergesi */}
        {stage !== "confirmed" && (
          <div className="mb-2.5 grid grid-cols-3 gap-1">
            {stepsBar.map((item) => {
              const isActive = step === item.num;
              const isDone = step > item.num;
              return (
                <button
                  key={item.num}
                  type="button"
                  disabled={!isDone}
                  onClick={() => isDone && setStep(item.num)}
                  className={`flex items-center justify-center gap-1 rounded-lg border px-1 py-1.5 text-center text-[10px] font-bold tracking-tight transition sm:text-[11px] ${
                    isActive
                      ? "border-amber-400/50 bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-[#1a1206] shadow-[0_0_14px_rgba(245,158,11,0.3)]"
                      : isDone
                      ? "cursor-pointer border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                      : "cursor-default border-slate-800 bg-[#131825] text-slate-500"
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
          {/* ADIM 1: USTA VE HİZMET SEÇİMİ (KOMPAKT & SIKI IZGARA) */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="space-y-3"
            >
              {/* Usta / Koltuk Seçimi (Kompakt 2 Sütunlu Lüks Kartlar) */}
              {realBarbers.length > 1 && (
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    <User className="h-3 w-3 text-[#F59E0B]" />
                    <span>Usta / Koltuk</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {realBarbers.map((barber) => {
                      const isSelected = selectedBarber?.id === barber.id;
                      return (
                        <button
                          key={barber.id}
                          type="button"
                          onClick={() => setSelectedBarberId(barber.id)}
                          className={`flex items-center gap-2 rounded-xl border p-2 text-left transition active:scale-[0.98] ${
                            isSelected
                              ? "border-[#10B981]/70 bg-[#10B981]/[0.08] shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_6px_18px_-8px_rgba(16,185,129,0.45)]"
                              : "border-slate-800 bg-[#131825] hover:border-slate-700"
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                              isSelected
                                ? "bg-[#10B981] text-[#04130d]"
                                : "bg-gradient-to-br from-[#D97706]/25 to-[#F59E0B]/10 text-[#F59E0B] ring-1 ring-amber-500/25"
                            }`}
                          >
                            {isSelected ? (
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            ) : (
                              barber.name.charAt(0).toUpperCase()
                            )}
                          </span>
                          <div className="min-w-0 leading-tight">
                            <p className="truncate text-[12px] font-bold text-slate-100">
                              {barber.name}
                            </p>
                            <p className="truncate text-[10px] font-medium text-slate-500">
                              {barber.chairName}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hizmet Seçimi (Kompakt 2 Sütunlu Premium Izgara) */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    <Scissors className="h-3 w-3 text-[#F59E0B]" />
                    <span>İşlem Seçin</span>
                  </label>
                  {selectedServices.length > 0 && (
                    <span className="rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      {selectedServices.length} seçildi
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
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
                        className={`relative flex flex-col justify-between rounded-xl border px-2.5 py-2 text-left transition active:scale-[0.98] ${
                          isSelected
                            ? "border-[#10B981]/70 bg-[#10B981]/[0.08] shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_6px_18px_-8px_rgba(16,185,129,0.45)]"
                            : "border-slate-800 bg-[#131825] hover:border-slate-700"
                        }`}
                      >
                        <div className="flex w-full items-start justify-between gap-1">
                          <span className="line-clamp-2 text-[12px] font-semibold leading-tight text-slate-100">
                            {service.name}
                          </span>
                          <span
                            className={`mt-px flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition ${
                              isSelected
                                ? "border-[#10B981] bg-[#10B981] text-[#04130d]"
                                : "border-slate-600 bg-transparent text-transparent"
                            }`}
                          >
                            <Check className="h-2 w-2 stroke-[3.5]" />
                          </span>
                        </div>
                        <div className="mt-1 flex w-full items-center justify-between">
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500">
                            <Clock className="h-2.5 w-2.5" />
                            {service.duration} dk
                          </span>
                          <span className="text-[12px] font-extrabold tabular-nums text-[#F59E0B]">
                            {effectivePrice} TL
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
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
              className="space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-0.5 rounded-lg border border-slate-800 bg-[#131825] px-2 py-1 text-[11px] font-semibold text-slate-300 hover:border-slate-700"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Geri</span>
                </button>
                {selectedBarber && (
                  <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-slate-400">
                    <User className="h-3 w-3 shrink-0 text-[#F59E0B]" />
                    <span className="truncate font-semibold text-slate-100">{selectedBarber.name}</span>
                    <span className="hidden truncate text-slate-500 sm:inline">• {selectedBarber.chairName}</span>
                  </span>
                )}
                <span className="shrink-0 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                  {selectedDay.fullDate}
                </span>
              </div>

              {/* Gün Seçimi — Bugünden Başlayan 7 Gerçek Gün */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  <CalendarDays className="h-3 w-3 text-[#F59E0B]" />
                  <span>Gün Seçin</span>
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
                      badgeClass = "bg-stone-500/15 text-slate-400";
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
                        className={`flex min-w-[84px] shrink-0 flex-col items-center justify-between rounded-lg border px-2 py-1.5 transition ${
                          isSelected
                            ? "border-amber-400/60 bg-gradient-to-b from-[#F59E0B] to-[#D97706] text-[#1a1206] shadow-[0_0_14px_rgba(245,158,11,0.3)]"
                            : isDayClosed
                            ? "border-slate-800/60 bg-[#0f131d] text-slate-500 opacity-60"
                            : "border-slate-800 bg-[#131825] text-slate-100 hover:border-slate-700"
                        }`}
                      >
                        <span className="whitespace-nowrap text-[11px] font-bold tracking-tight">
                          {day.chipLabel}
                        </span>
                        <span
                          className={`mt-0.5 rounded-full px-1.5 py-px text-[9px] font-bold ${badgeClass}`}
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
                <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  <Clock className="h-3 w-3 text-[#10B981]" />
                  <span>Boş Saat Seçin ({validAvailableSlots.length} Müsait)</span>
                </label>

                {isSelectedDayClosed ? (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 text-center">
                    <CalendarX2 className="mx-auto h-6 w-6 text-rose-400" />
                    <p className="mt-1.5 text-sm font-extrabold text-slate-100">
                      {selectedDay.fullDate} Günü Salon Kapalıdır
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Lütfen yukarıdan başka bir gün seçiniz.
                    </p>
                  </div>
                ) : validAvailableSlots.length === 0 ? (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-center">
                    <Clock className="mx-auto h-6 w-6 text-amber-400" />
                    <p className="mt-1.5 text-sm font-extrabold text-slate-100">
                      {isSelectedDayToday
                        ? "Bugün İçin Alınabilir Saat Kalmadı"
                        : "Bu Gün İçin Boş Saat Kalmadı"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-300/80">
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
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#D97706] px-4 py-2 text-xs font-extrabold text-[#1a110b]"
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
                          className={`flex flex-col items-center justify-center rounded-lg border py-1.5 transition active:scale-95 ${
                            isSelected
                              ? "border-[#10B981] bg-[#10B981] text-[#04130d] shadow-[0_0_16px_rgba(16,185,129,0.35)]"
                              : "border-slate-800 bg-[#131825] text-slate-100 hover:border-[#10B981]/50"
                          }`}
                        >
                          <span className="text-[13px] font-extrabold tabular-nums leading-tight">
                            {slot.time}
                          </span>
                          <span
                            className={`text-[9px] font-semibold leading-tight ${
                              isSelected ? "text-[#04130d]" : "text-emerald-400/80"
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
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/70 bg-[#131825] px-3.5 py-2 text-xs font-extrabold text-slate-300 hover:border-slate-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Saat Değiştir</span>
                    </button>
                    <span className="text-sm font-extrabold text-slate-100">
                      Son Adım: İsim ve Telefon
                    </span>
                  </div>

                  {/* Seçilen Randevu Özeti Kutusu */}
                  <div className="rounded-xl border border-amber-500/25 bg-[#131825] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
                          {currentShop.name} • {selectedBarber?.name}
                        </p>
                        <p className="mt-0.5 text-xs font-black text-slate-100 sm:text-sm">
                          {selectedServices.map((s) => s.name).join(" + ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block rounded-lg bg-emerald-500/20 px-2 py-0.5 text-xs font-black text-emerald-300">
                          {selectedDay.chipLabel} • Saat {selectedSlot?.time}
                        </span>
                        <p className="mt-0.5 text-xs font-black text-slate-300 sm:text-sm">
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
                  className="space-y-3 rounded-xl border border-slate-800 bg-[#131825] p-3.5 sm:p-4"
                >
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-100">
                      Adınız Soyadınız *
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F59E0B]" />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Örn: Ahmet Yılmaz"
                        className="w-full rounded-xl border border-slate-700/70 bg-[#090A0F] py-2.5 pl-9 pr-3 text-xs font-bold text-slate-100 placeholder-stone-500 outline-none transition focus:border-[#F59E0B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-100">
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
                        className="w-full rounded-xl border border-slate-700/70 bg-[#090A0F] py-2.5 pl-9 pr-3 text-xs font-bold text-slate-100 placeholder-stone-500 outline-none transition focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  {/* ⚡ Erken Saat Yedek Listesi Seçeneği */}
                  <div
                    onClick={() => setCanComeEarly((prev) => !prev)}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition select-none ${
                      canComeEarly
                        ? "border-amber-400/60 bg-gradient-to-r from-amber-950/40 via-[#241a12] to-[#16120f] shadow-sm"
                        : "border-slate-800 bg-[#0f131d] opacity-75 hover:border-slate-700"
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
                      <p className="flex items-center gap-1 text-xs font-black text-slate-100">
                        <span>⚡ Daha erken bir saat boşalırsa haber ver (Yedek Liste)</span>
                      </p>
                      <p className="mt-0.5 text-[10px] leading-snug text-slate-300/80">
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
                <div className="rounded-3xl border border-amber-500/40 bg-[#131825] p-5">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-7 w-7 shrink-0 text-rose-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-slate-100">
                        {isBlockedByShopPolicy
                          ? "Online Randevu Oluşturulamadı"
                          : `Randevu Onayı İçin ${requiredDepositAmount} TL Ön Kapora Gerekmektedir`}
                      </h3>
                      <p className="mt-1 text-xs text-slate-300/85">
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
                      className="mt-4 w-full rounded-xl border border-slate-700 bg-[#0f131d] py-3 text-xs font-bold text-slate-300"
                    >
                      Geri Dön
                    </button>
                  ) : (
                    <>
                      <div className="mt-4 rounded-xl border border-slate-800 bg-[#0f131d] p-3">
                        <div className="mb-2 flex items-center justify-between text-xs text-slate-100">
                          <span className="flex items-center gap-1 font-bold">
                            <CreditCard className="h-4 w-4 text-[#F59E0B]" />
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
                          className="w-full rounded-lg border border-slate-700/70 bg-[#131825] px-3 py-2 font-mono text-xs text-slate-100"
                        />
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setStage("idle")}
                          className="rounded-xl border border-slate-700/70 bg-[#0f131d] px-4 py-3 text-xs font-bold text-slate-300"
                        >
                          Geri
                        </button>
                        <button
                          type="button"
                          disabled={stage === "processing_deposit"}
                          onClick={handleCompleteDepositBooking}
                          className="flex-1 rounded-xl bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#D97706] py-3 text-sm font-black text-[#1a110b]"
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

              {/* WHATSAPP ONAY KODU VE DOĞRULAMA EKRANI (2 AŞAMALI SON EKRAN) */}
              {stage === "confirmed" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-3xl border-2 p-5 text-center shadow-2xl sm:p-7 transition-all ${
                    isCancelledOnConfirm
                      ? "border-rose-500/50 bg-gradient-to-b from-rose-950/40 via-[#181313] to-[#110e0e]"
                      : confirmedAppointment?.status === "confirmed" && whatsappClicked
                      ? "border-emerald-500/70 bg-gradient-to-b from-emerald-950/40 via-[#141517] to-[#0f1012]"
                      : "border-amber-500/80 bg-gradient-to-b from-amber-950/40 via-[#181513] to-[#111113]"
                  }`}
                >
                  {isCancelledOnConfirm ? (
                    <div className="space-y-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-lg shadow-rose-500/20">
                        <X className="h-7 w-7 stroke-[2.5]" />
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/50 bg-rose-500/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-rose-300">
                        ❌ RANDEVU İPTAL EDİLDİ
                      </span>
                      <h3 className="text-xl font-black text-slate-100 sm:text-2xl">
                        Randevunuz Başarıyla İptal Edildi
                      </h3>
                      <p className="mx-auto max-w-md text-xs sm:text-sm text-stone-300 leading-relaxed">
                        Seçmiş olduğunuz randevu saati ustanızın takviminde anında tekrar boşa çıkarıldı ve diğer müşterilere açıldı.
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleResetWizard}
                          className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-xs font-black text-[#1a110b] shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95"
                        >
                          ➕ Yeni Randevu Al
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
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

                        const displayPhone =
                          confirmedAppointment?.customerPhone || customerPhone || "";
                        const isBlacklistUser =
                          Boolean(isPhoneBlacklisted(displayPhone)) ||
                          Boolean(confirmedAppointment?.isBlacklisted) ||
                          Boolean(confirmedAppointment?.requiresDeposit);

                        const shopIban =
                          currentShop.iban || "TR33 0006 2000 0001 2345 6789 01";

                        // 4. WHATSAPP BİLDİRİM ŞABLONU
                        const waMessage = isBlacklistUser
                          ? [
                              `🚨 *KARA LİSTE / KAPORA ONAY TALEBİ* (${vCode})`,
                              `👤 *Müşteri:* ${customerName.trim()} (${displayPhone})`,
                              `📅 *Tarih:* ${dateText} - ${timeText} | *Usta:* ${barberText}`,
                              `💳 *Not:* Kapora ödemesini yaptım, dekontu iletiyorum. Onayınızı bekliyorum.`,
                            ].join("\n")
                          : [
                              `✂️ *YENİ RANDEVU ONAYI* (${vCode})`,
                              `👤 *Müşteri:* ${customerName.trim()}`,
                              `📞 *Kayıtlı Numara:* ${displayPhone}`,
                              `💈 *Usta:* ${barberText}`,
                              `📅 *Tarih:* ${dateText} | ⏰ *Saat:* ${timeText}`,
                              `📋 *İşlem:* ${serviceNamesText}`,
                              ...(isEarlyEligible
                                ? ["⚡ Not: Erken boşluk olursa gelebilir."]
                                : []),
                            ].join("\n");

                        // Seçilen ustanın kendi WhatsApp numarası varsa (barber.phone doluysa) ona,
                        // boş bırakılmışsa dükkanın ana telefon numarasına (currentShop.phone) yönlendir.
                        const appointedBarber =
                          (confirmedAppointment?.barberId
                            ? barbers.find((b) => b.id === confirmedAppointment.barberId)
                            : null) || selectedBarber;

                        const targetWhatsAppPhone =
                          (selectedBarber?.phone && selectedBarber.phone.trim() !== ""
                            ? selectedBarber.phone.trim()
                            : appointedBarber?.phone && appointedBarber.phone.trim() !== ""
                            ? appointedBarber.phone.trim()
                            : null) || currentShop?.phone;

                        const shopFallbackPhone = formatPhoneForWhatsApp(
                          currentShop?.phone,
                          DEFAULT_SHOP_WHATSAPP_PHONE
                        );

                        const waHref = buildWhatsAppUrl(
                          targetWhatsAppPhone,
                          waMessage,
                          shopFallbackPhone
                        );

                        const handleOpenWhatsApp = () => {
                          setWhatsappClicked(true);
                          if (typeof window !== "undefined") {
                            window.open(waHref, "_blank", "noopener,noreferrer");
                          }
                        };

                        const summaryCardEl = (
                          <div className="rounded-2xl border border-slate-700/70 bg-[#131825] p-3.5 sm:p-4 text-left shadow-xl space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="text-xs font-bold text-slate-400">
                                💈 Seçilen Usta:
                              </span>
                              <span className="text-xs sm:text-sm font-black text-slate-100">
                                {barberText}
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="text-xs font-bold text-slate-400">
                                📅 Tarih:
                              </span>
                              <span className="text-xs sm:text-sm font-black text-slate-100">
                                {dateText}
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="text-xs font-bold text-slate-400">
                                ⏰ Saat:
                              </span>
                              <span className="text-xs sm:text-sm font-black text-amber-300">
                                {timeText}
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="text-xs font-bold text-slate-400">
                                📋 İşlem:
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-slate-100 text-right truncate max-w-[200px] sm:max-w-[240px]">
                                {serviceNamesText}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-xs font-bold text-[#F59E0B]">
                                🔑 Onay Kodu:
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-base font-black tracking-wider text-slate-100">
                                  {vCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(vCode)}
                                  className="rounded-lg border border-slate-800 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-stone-300 hover:bg-white/10"
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
                        );

                        const phoneEditorEl = !isEditingPhoneOnConfirm ? (
                          <div className="rounded-2xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/15 via-[#1a1714] to-amber-500/10 p-3 sm:p-4 text-left shadow-lg shadow-amber-500/10">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                  <Phone className="h-5 w-5" />
                                </div>
                                <div>
                                  <span className="block text-xs font-bold text-amber-300 tracking-wide">
                                    📞 Kayıtlı Numaranız:
                                  </span>
                                  <span className="font-mono text-base sm:text-lg font-black tracking-wider text-slate-100">
                                    {displayPhone}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setTempPhoneOnConfirm(displayPhone);
                                  setPhoneEditError("");
                                  setIsEditingPhoneOnConfirm(true);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-white/10 px-3 py-2 text-xs font-bold text-stone-200 hover:bg-white/20 hover:text-white transition active:scale-95 cursor-pointer self-start sm:self-auto"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-amber-300" />
                                <span>✏️ Numarayı Düzenle</span>
                              </button>
                            </div>

                            {phoneEditSuccess && (
                              <div className="mt-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                                <Check className="h-3.5 w-3.5" />
                                <span>Telefon numaranız başarıyla güncellendi! WhatsApp linki yenilendi.</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-2xl border-2 border-amber-400 bg-[#161412] p-3.5 sm:p-4 text-left shadow-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                                <Phone className="h-4 w-4" />
                                Telefon Numaranızı Düzeltin
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsEditingPhoneOnConfirm(false)}
                                className="text-xs text-slate-400 hover:text-stone-200 cursor-pointer"
                              >
                                Vazgeç ✕
                              </button>
                            </div>

                            <div className="space-y-1">
                              <input
                                type="tel"
                                autoFocus
                                value={tempPhoneOnConfirm}
                                onChange={(e) => {
                                  setTempPhoneOnConfirm(e.target.value);
                                  setPhoneEditError("");
                                }}
                                placeholder="05XX XXX XX XX"
                                className="w-full rounded-xl border border-amber-400/50 bg-[#0d0c0b] px-3.5 py-2.5 font-mono text-sm sm:text-base font-bold text-slate-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 placeholder:text-slate-500"
                              />
                              {phoneEditError && (
                                <p className="text-[11px] font-bold text-rose-400">{phoneEditError}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const cleaned = tempPhoneOnConfirm.trim();
                                  if (!cleaned || cleaned.replace(/\D/g, "").length < 10) {
                                    setPhoneEditError(
                                      "Lütfen geçerli bir cep telefonu numarası girin (örn: 0532 123 45 67)."
                                    );
                                    return;
                                  }
                                  if (confirmedAppointment?.id) {
                                    updateAppointmentPhone(confirmedAppointment.id, cleaned);
                                    setConfirmedAppointment((prev) =>
                                      prev ? { ...prev, customerPhone: cleaned } : null
                                    );
                                  }
                                  setCustomerPhone(cleaned);
                                  setIsEditingPhoneOnConfirm(false);
                                  setPhoneEditSuccess(true);
                                  setTimeout(() => setPhoneEditSuccess(false), 3500);
                                }}
                                className="flex-1 rounded-xl bg-amber-400 py-2.5 text-xs sm:text-sm font-black text-[#14120e] hover:bg-amber-300 transition active:scale-95 cursor-pointer text-center"
                              >
                                Kaydet ve Güncelle
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsEditingPhoneOnConfirm(false)}
                                className="rounded-xl border border-slate-700/70 bg-white/5 px-3 py-2.5 text-xs font-bold text-stone-300 hover:bg-white/10 cursor-pointer"
                              >
                                İptal
                              </button>
                            </div>
                          </div>
                        );

                        // 1) KARA LİSTEDEKİ (KAPORA BEKLEYEN) MÜŞTERİ AKIŞI (Aynen Korunur)
                        if (isBlacklistUser) {
                          return (
                            <>
                              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-lg shadow-rose-500/25">
                                <Clock className="h-7 w-7 animate-pulse stroke-[2.5]" />
                              </div>

                              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-rose-500/80 bg-rose-500/25 px-4 py-1.5 text-xs sm:text-sm font-black uppercase tracking-wider text-rose-300 shadow-md shadow-rose-500/20 animate-pulse">
                                ⏳ RANDEVUNUZ ONAY BEKLİYOR (KAPORA ZORUNLU)
                              </span>

                              <h3 className="mt-2 text-xl font-black text-rose-100 sm:text-2xl">
                                Randevunuz Onay Bekliyor, {customerName}!
                              </h3>

                              <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm font-bold leading-relaxed text-rose-200">
                                Önceki randevunuza gelmediğiniz için bu randevunuz henüz <u>ONAYLANMAMIŞTIR</u>. Aşağıdaki IBAN&apos;a kapora ücretini gönderip yeşil butona basarak dekontu WhatsApp&apos;tan ilettiğinizde berberiniz randevunuzu onaylayacaktır.
                              </p>

                              {/* IBAN ve Kapora Kutusu */}
                              <div className="mx-auto my-3.5 max-w-md rounded-2xl border-2 border-rose-500 bg-rose-950/40 p-4 text-left shadow-lg shadow-rose-500/20 space-y-3">
                                <div className="flex items-start gap-3">
                                  <ShieldAlert className="h-6 w-6 shrink-0 text-rose-400" />
                                  <div>
                                    <h4 className="text-sm font-black text-rose-200">
                                      ⚠️ Kapora Gönderimi Zorunludur
                                    </h4>
                                    <p className="mt-1 text-xs font-bold leading-relaxed text-rose-100">
                                      Randevunuzun geçerli olması adına berberin IBAN hesabına kapora gönderip dekontu WhatsApp&apos;tan iletmeniz gerekmektedir.
                                    </p>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-rose-400/30 bg-black/40 p-3 space-y-2.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-stone-300">
                                      Zorunlu Kapora Tutarı:
                                    </span>
                                    <span className="font-black text-amber-300 text-sm">
                                      {requiredDepositAmount} TL
                                    </span>
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-800 pt-2">
                                    <div className="min-w-0">
                                      <span className="block text-[11px] font-bold text-slate-400">
                                        Berber IBAN Hesabı:
                                      </span>
                                      <span className="font-mono text-xs sm:text-sm font-black text-slate-100 break-all">
                                        {shopIban}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard?.writeText(shopIban);
                                        setCopiedIban(true);
                                        setTimeout(() => setCopiedIban(false), 2000);
                                      }}
                                      className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-rose-400/50 bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/30 transition cursor-pointer"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                      <span>{copiedIban ? "Kopyalandı! ✅" : "IBAN'ı Kopyala"}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="mx-auto max-w-md space-y-3">
                                {summaryCardEl}
                                {phoneEditorEl}

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

                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={handleCancelCurrentAppointment}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    <span>Randevumu İptal Et (Saati Boşa Çıkar)</span>
                                  </button>
                                </div>
                              </div>
                            </>
                          );
                        }

                        // 2) NORMAL MÜŞTERİ: 2 AŞAMALI SON EKRAN
                        // AŞAMA 1: Henüz WhatsApp Butonuna Basılmadı (whatsappClicked === false)
                        if (!whatsappClicked) {
                          return (
                            <div className="mx-auto max-w-md space-y-4">
                              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-500 bg-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/30">
                                <Clock className="h-8 w-8 animate-pulse stroke-[2.5]" />
                              </div>

                              <div className="rounded-2xl border-2 border-amber-500 bg-amber-500/15 p-4 text-center shadow-lg shadow-amber-500/15 space-y-2">
                                <h3 className="text-lg sm:text-xl font-black text-amber-400">
                                  ⏳ Son Bir Adım Kaldı!
                                </h3>
                                <p className="text-xs sm:text-sm font-extrabold leading-relaxed text-slate-100">
                                  Randevunuzun geçerli olması için aşağıdaki yeşil butona basıp WhatsApp onay mesajını gönderin.
                                </p>
                              </div>

                              {/* Yanıp Sönen / Dikkat Çeken Büyük Yeşil WhatsApp Butonu */}
                              <button
                                type="button"
                                onClick={handleOpenWhatsApp}
                                className="flex w-full animate-pulse items-center justify-center gap-2.5 rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 py-4 px-4 text-sm sm:text-base font-black text-[#081510] shadow-2xl shadow-emerald-500/40 ring-4 ring-emerald-500/30 transition hover:animate-none hover:brightness-110 active:scale-[0.99] cursor-pointer"
                              >
                                <MessageSquare className="h-5 w-5 fill-[#081510] shrink-0" />
                                <span className="text-center">
                                  💬 WhatsApp İle Randevuyu Onayla ve Bitir
                                </span>
                              </button>

                              {phoneEditorEl}

                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={handleCancelCurrentAppointment}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Randevumu İptal Et (Saati Boşa Çıkar)</span>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // AŞAMA 2: WhatsApp Butonuna Basıldıktan Sonraki Durum (whatsappClicked === true)
                        return (
                          <div className="mx-auto max-w-md space-y-3.5">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
                              <CheckCircle2 className="h-7 w-7 stroke-[2.5]" />
                            </div>

                            <h3 className="text-xl font-black text-emerald-300 sm:text-2xl">
                              ✅ Randevunuz Başarıyla Oluşturuldu!
                            </h3>

                            {summaryCardEl}

                            {phoneEditorEl}

                            {/* Yedek Link: WhatsApp açılmadıysa tekrar tıklayın */}
                            <div className="pt-1 text-center">
                              <button
                                type="button"
                                onClick={handleOpenWhatsApp}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition cursor-pointer"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>WhatsApp açılmadıysa tekrar tıklayın</span>
                              </button>
                            </div>

                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={handleCancelCurrentAppointment}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Randevumu İptal Et (Saati Boşa Çıkar)</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* KÜÇÜK VE GRİ YENİ RANDEVU AL / ANA SAYFAYA DÖN BUTONU */}
                      <div className="mt-4 pt-1 text-center">
                        <button
                          type="button"
                          onClick={handleResetWizard}
                          className="text-xs text-slate-400 hover:text-stone-200 underline underline-offset-4 transition cursor-pointer"
                        >
                          Yeni Randevu Al / Ana Sayfaya Dön
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 💰 SABİT ALT BAR: TOPLAM TUTAR & PARLAYAN ALTIN DEVAM ET BUTONU */}
      {stage !== "confirmed" && (step === 1 || step === 2) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-500/20 bg-[#0b0f19]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_32px_-8px_rgba(245,158,11,0.22)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F59E0B]/80 to-transparent" />
          <div className="mx-auto flex max-w-xl items-center gap-3 px-3 py-2.5 sm:px-4">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Toplam Tutar
              </p>
              <div className="mt-0.5 flex items-baseline gap-1.5 leading-none">
                <span className="bg-gradient-to-r from-[#FCD34D] via-[#F59E0B] to-[#D97706] bg-clip-text text-lg font-black tabular-nums text-transparent">
                  {totalPrice} TL
                </span>
                <span className="truncate text-[10px] font-medium text-slate-400">
                  {step === 1
                    ? selectedServices.length > 0
                      ? `${selectedServices.length} işlem • ${totalDuration} dk`
                      : "İşlem seçin"
                    : selectedSlot
                    ? `${selectedDay.chipLabel} • ${selectedSlot.time}`
                    : "Saat seçin"}
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={
                step === 1
                  ? selectedServices.length === 0
                  : !selectedSlot ||
                    isSelectedDayClosed ||
                    (isSelectedDayToday &&
                      isSlotPassedOrImminent(selectedSlot.time, true))
              }
              onClick={() => {
                if (step === 1) {
                  setStep(2);
                } else if (selectedSlot) {
                  setStep(3);
                }
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#D97706] px-5 py-2.5 text-[13px] font-black text-[#1a1206] shadow-[0_0_22px_rgba(245,158,11,0.45)] ring-1 ring-amber-300/40 transition hover:brightness-110 active:scale-[0.97] disabled:opacity-40 disabled:shadow-none"
            >
              <span>Devam Et</span>
              <ChevronRight className="h-4 w-4 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* 🔍 RANDEVUMU SORGULA / İPTAL ET MODALI */}
      <AnimatePresence>
        {isLookupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setIsLookupModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#0b0f19] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-[#F59E0B] border border-amber-500/30">
                    <Search className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-100">
                      Randevumu Sorgula & İptal Et
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Aktif randevunuzu sorgulayabilir veya tek tıkla iptal edebilirsiniz.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLookupModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Arama Formu */}
              <form onSubmit={handleLookupSearch} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300">
                    Kayıtlı Telefon Numaranız
                  </label>
                  <div className="relative mt-1">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={lookupPhoneInput}
                      onChange={(e) => setLookupPhoneInput(e.target.value)}
                      placeholder="05XX XXX XX XX"
                      className="w-full rounded-xl border border-slate-700/70 bg-[#0f131d] py-2.5 pl-9 pr-3 font-mono text-xs font-bold text-slate-100 focus:border-[#F59E0B] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#D97706] py-2.5 text-xs font-black text-[#1a110b] shadow-md shadow-amber-500/25 hover:brightness-110 active:scale-95"
                >
                  🔍 Randevularımı Getir
                </button>
              </form>

              {/* Mesaj Bildirimi */}
              {lookupMessage && (
                <div
                  className={`rounded-xl border p-3 text-xs font-bold ${
                    lookupMessage.type === "success"
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                      : lookupMessage.type === "error"
                      ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                      : "border-sky-500/40 bg-sky-500/15 text-sky-300"
                  }`}
                >
                  {lookupMessage.text}
                </div>
              )}

              {/* Sonuç Listesi */}
              {lookupResults && lookupResults.length > 0 && (
                <div className="space-y-3 pt-1">
                  <span className="block text-xs font-bold text-slate-300">
                    Aktif Randevularınız ({lookupResults.length}):
                  </span>
                  {lookupResults.map((apt) => (
                    <div
                      key={apt.id}
                      className="rounded-xl border border-slate-800 bg-[#0f131d] p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                        <span className="font-mono text-xs font-black text-[#F59E0B]">
                          {apt.verificationCode || apt.appointmentCode}
                        </span>
                        <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          Aktif Randevu
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">💈 Usta:</span>
                          <span className="font-bold text-slate-100">{apt.barberName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">📅 Tarih & Saat:</span>
                          <span className="font-bold text-amber-300">
                            {apt.dateLabel} - {apt.time}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs">
                        <span className="text-[10px] text-slate-400 block">✂️ İşlem:</span>
                        <span className="font-bold text-slate-100">
                          {apt.services.map((s) => s.name).join(" + ")}
                        </span>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
                        <span className="font-black text-[#F59E0B] text-xs">
                          {apt.totalPrice} TL
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCancelFromLookup(apt.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-black text-rose-300 hover:bg-rose-500/25 transition active:scale-95 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Randevuyu İptal Et</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
