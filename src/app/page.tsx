"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors,
  Sparkles,
  Star,
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  BellRing,
  User,
  Phone,
  Crown,
  Lock,
  CheckCircle2,
  ArrowRight,
  Zap,
  MapPin,
  Info,
  Search,
  X,
  CalendarX2,
  RefreshCw,
  Coffee,
  Copy,
  Hash,
  AlertTriangle,
  Ban,
} from "lucide-react";
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
  const {
    currentShop,
    currentShopSlug,
    barbers,
    services,
    shopSettings,
    appointments,
    addAppointment,
    addWaitlistEntry,
    isPhoneBlacklisted,
    getSlotsForDay,
    getServicePriceForBarber,
    findCustomerAppointments,
    cancelAppointmentByCustomer,
    rescheduleAppointmentByCustomer,
  } = useBarber();

  // Wizard Step (1 to 4)
  const [step, setStep] = useState<number>(1);

  // Step 1: Barber Selection
  const [selectedBarberId, setSelectedBarberId] = useState<string>("any");

  // Reset wizard when switching tenant shop slug
  useEffect(() => {
    setStep(1);
    setSelectedBarberId("any");
    setSelectedSlot(null);
    setIsWaitlistMode(false);
    setStage("idle");
    setConfirmedAppointment(null);
  }, [currentShopSlug]);

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

  // Step 4: Customer Info & Trust Simulation
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [stage, setStage] = useState<VerificationStage>("idle");
  const [otpCode, setOtpCode] = useState<string>("8492");
  const [cardNumber, setCardNumber] = useState<string>("4543 •••• •••• 8890");
  const [formError, setFormError] = useState<string>("");
  const [confirmedAppointment, setConfirmedAppointment] =
    useState<Appointment | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Customer Self-Service Modal ("Randevumu Sorgula / İptal Et")
  const [isLookupOpen, setIsLookupOpen] = useState<boolean>(false);
  const [lookupQuery, setLookupQuery] = useState<string>("");
  const [lookupResults, setLookupResults] = useState<Appointment[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [cancelFeedback, setCancelFeedback] = useState<{
    code: string;
    time: string;
    notifiedCount: number;
    message: string;
  } | null>(null);
  const [rescheduleTargetId, setRescheduleTargetId] = useState<string | null>(
    null
  );
  const [rescheduleDay, setRescheduleDay] = useState<DayMetadata>(
    DAYS_METADATA[0]
  );
  const [rescheduleTime, setRescheduleTime] = useState<string>("");
  const [rescheduleSuccessMsg, setRescheduleSuccessMsg] = useState<string>("");

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

  const handleRunLookup = (customQuery?: string) => {
    const q = customQuery !== undefined ? customQuery : lookupQuery;
    if (customQuery !== undefined) setLookupQuery(customQuery);
    setCancelFeedback(null);
    setRescheduleSuccessMsg("");
    setRescheduleTargetId(null);

    const found = findCustomerAppointments(q);
    setLookupResults(found);
    setHasSearched(true);
  };

  useEffect(() => {
    if (hasSearched && lookupQuery.trim()) {
      setLookupResults(findCustomerAppointments(lookupQuery));
    }
  }, [appointments, hasSearched, lookupQuery, findCustomerAppointments]);

  const handleCancelFromModal = (apt: Appointment) => {
    const res = cancelAppointmentByCustomer(apt.id);
    setCancelFeedback({
      code: apt.appointmentCode,
      time: apt.time,
      notifiedCount: res.notifiedCount,
      message: res.alertText,
    });
    if (selectedSlot?.time === apt.time) {
      setSelectedSlot(null);
    }
  };

  const handleConfirmReschedule = (apt: Appointment) => {
    if (!rescheduleTime) return;
    const updated = rescheduleAppointmentByCustomer(
      apt.id,
      rescheduleDay.id,
      `${rescheduleDay.label} (${rescheduleDay.dateStr})`,
      rescheduleTime
    );
    if (updated) {
      setRescheduleSuccessMsg(
        `Randevunuz ${updated.dateLabel} saat ${updated.time} olarak başarıyla güncellendi!`
      );
      setRescheduleTargetId(null);
      setRescheduleTime("");
    }
  };

  const activeAppointmentsForQuickTest = useMemo(
    () => appointments.filter((a) => a.status === "upcoming"),
    [appointments]
  );

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

          <div className="mt-6 border-t border-[#c88a53]/20 pt-4">
            <Link
              href="/super-admin"
              className="inline-flex items-center gap-2 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-5 py-2.5 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110"
            >
              <Crown className="h-4 w-4" />
              <span>Süper Admin Panelinden Aboneliği Aktif Et (Test)</span>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

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
    <div className="mx-auto max-w-3xl px-4 pb-36 pt-6 sm:px-6 sm:pt-8">
      {/* VIP Salon Hero Header (Strictly Isolated to Current Tenant Shop) */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-[#c88a53]/30 bg-gradient-to-b from-[#241b16] via-[#1c1613] to-[#14100d] p-4 shadow-xl shadow-[#c88a53]/15 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#c88a53]/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-36 w-36 rounded-full bg-[#b47b48]/10 blur-2xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#e6ccb2]">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#c88a53]/40 bg-[#c88a53]/15 px-2.5 py-1 font-bold uppercase tracking-wider text-[#e6ccb2]">
              <Crown className="h-3.5 w-3.5 text-[#c88a53]" />
              {currentShop.name}
            </span>
            <span className="inline-flex items-center gap-1 text-[#e6ccb2]/80">
              <MapPin className="h-3.5 w-3.5 text-[#c88a53]" />
              {currentShop.district} • {shopSettings.openTime} -{" "}
              {shopSettings.closeTime}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsLookupOpen(true);
              setCancelFeedback(null);
              setRescheduleSuccessMsg("");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e6ccb2]/50 bg-[#c88a53]/20 px-3.5 py-2 text-xs font-extrabold text-[#fdf8f5] shadow-lg shadow-[#c88a53]/20 transition hover:bg-gradient-to-r hover:from-[#b47b48] hover:via-[#c88a53] hover:to-[#9a6334] hover:text-[#1a110b]"
          >
            <Search className="h-3.5 w-3.5 text-[#e6ccb2]" />
            <span>Randevumu Sorgula / İptal Et</span>
          </button>
        </div>

        <div className="relative mt-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h1 className="bg-gradient-to-r from-[#fdf8f5] via-[#e6ccb2] to-[#c88a53] bg-clip-text text-xl font-extrabold tracking-tight text-transparent sm:text-2xl">
              {currentShop.name} — Online Randevu
            </h1>
            <p className="mt-1 text-xs text-[#e6ccb2]/75 sm:text-sm">
              {currentShop.subtitle} • Ustanızı, koltuğunuzu ve hizmetinizi
              seçerek 30 saniyede randevunuzu onaylayın.
            </p>
          </div>
          <div className="flex items-center gap-1.5 self-start rounded-full border border-[#c88a53]/30 bg-[#14100d]/95 px-3 py-1 text-xs sm:self-auto">
            <Star className="h-3.5 w-3.5 fill-[#c88a53] text-[#c88a53]" />
            <span className="font-bold text-[#fdf8f5]">4.98</span>
            <span className="text-[#e6ccb2]/65">(VIP Salon)</span>
          </div>
        </div>

        {/* Stepper Bar with High Contrast Active Tab Border */}
        <div className="relative mt-5 grid grid-cols-4 gap-2">
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
                className={`group relative flex flex-col items-start rounded-xl border p-2.5 text-left transition-all duration-200 ${
                  isActive
                    ? "border-[#e6ccb2]/50 bg-gradient-to-br from-[#c88a53]/30 via-[#b47b48]/20 to-[#1c1613] shadow-lg shadow-[#c88a53]/20"
                    : isDone
                    ? "cursor-pointer border-[#c88a53]/25 bg-[#14100d]/90 hover:border-[#c88a53]/60"
                    : "cursor-default border-[#c88a53]/10 bg-[#0d0a08]/60 opacity-55"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-extrabold ${
                      isActive
                        ? "border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-sm"
                        : isDone
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-[#261c16] text-[#e6ccb2]/70"
                    }`}
                  >
                    {isDone ? <Check className="h-3 w-3 stroke-[3]" /> : item.num}
                  </span>
                  {isDone && (
                    <span className="text-[10px] font-semibold text-[#c88a53] group-hover:underline">
                      Değiştir
                    </span>
                  )}
                </div>
                <span className="mt-1.5 line-clamp-1 text-xs font-extrabold text-[#fdf8f5]">
                  {item.title}
                </span>
                <span className="line-clamp-1 text-[10px] text-[#e6ccb2]/80">
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
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-[#fdf8f5]">
                  1. Usta ve Berber Koltuğu Seçimi
                </h2>
                <p className="text-xs text-[#e6ccb2]/70">
                  {currentShop.name} bünyesindeki ustalar ve kişiye özel koltuk tarifeleri
                </p>
              </div>
              <span className="rounded-lg border border-[#c88a53]/25 bg-[#1c1613] px-2.5 py-1 text-xs font-semibold text-[#e6ccb2]">
                Adım 1 / 4
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {barbers.map((barber: Barber) => {
                const isSelected = selectedBarber?.id === barber.id;
                const firstService = services[0];
                const samplePrice = firstService
                  ? getServicePriceForBarber(firstService, barber)
                  : null;
                const hasCustomPricing =
                  barber.customPrices &&
                  Object.keys(barber.customPrices).length > 0;

                return (
                  <motion.div
                    key={barber.id}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setSelectedBarberId(barber.id)}
                    className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-4 transition-all duration-200 ${
                      isSelected
                        ? "border-[#e6ccb2]/50 bg-gradient-to-br from-[#281e18] via-[#1c1613] to-[#14100d] shadow-lg shadow-[#c88a53]/20"
                        : "border-[#c88a53]/25 bg-[#1c1613] hover:border-[#c88a53]/60 hover:bg-[#221a15]"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      {barber.badge ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            barber.isAnyOption
                              ? "border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-sm"
                              : "border border-[#c88a53]/35 bg-[#c88a53]/15 text-[#e6ccb2]"
                          }`}
                        >
                          {barber.isAnyOption ? (
                            <Zap className="h-3 w-3 fill-[#1a110b]" />
                          ) : (
                            <Sparkles className="h-3 w-3 text-[#c88a53]" />
                          )}
                          {barber.badge}
                        </span>
                      ) : (
                        <span />
                      )}

                      {firstService && samplePrice !== null && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            hasCustomPricing
                              ? "border border-[#c88a53]/40 bg-[#c88a53]/20 text-[#e6ccb2]"
                              : "bg-emerald-500/15 text-emerald-400"
                          }`}
                        >
                          {firstService.name}: {samplePrice} TL
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-3.5">
                      <div
                        className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${
                          barber.isAnyOption
                            ? "from-[#b47b48] via-[#c88a53] to-[#9a6334]"
                            : barber.avatarGradient
                        } text-base font-extrabold text-[#fdf8f5] shadow-inner ring-1 ring-[#c88a53]/35`}
                      >
                        {barber.isAnyOption ? (
                          <Scissors className="h-6 w-6 text-[#1a110b]" />
                        ) : (
                          <span>{barber.initials}</span>
                        )}
                        {isSelected && (
                          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] ring-2 ring-[#14100d]">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-[#fdf8f5] transition-colors group-hover:text-[#e6ccb2]">
                          {barber.name}
                        </h3>
                        <p className="text-xs text-[#e6ccb2]/70">{barber.role}</p>
                        <p className="mt-0.5 text-[11px] font-bold text-[#c88a53]">
                          {barber.chairName}
                        </p>

                        <div className="mt-2 flex items-center gap-3 text-xs text-[#e6ccb2]">
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Star className="h-3.5 w-3.5 fill-[#c88a53] text-[#c88a53]" />
                            {barber.rating}
                            <span className="font-normal text-[#e6ccb2]/60">
                              ({barber.reviewCount})
                            </span>
                          </span>
                          <span className="text-[#c88a53]/40">•</span>
                          <span className="text-[#e6ccb2]/75">
                            {barber.experience}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-[#c88a53]/20 pt-3">
                      {barber.specialties.map((spec) => (
                        <span
                          key={spec}
                          className="rounded-md border border-[#c88a53]/20 bg-[#14100d] px-2 py-0.5 text-[11px] text-[#e6ccb2]/85"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => selectedBarber && setStep(2)}
                disabled={!selectedBarber}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-4 text-sm font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
              >
                <span>Hizmet Seçimine İlerle ({selectedBarber?.name})</span>
                <ChevronRight className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </motion.section>
        )}

        {/* STEP 2: MULTI-SERVICE SELECTION */}
        {step === 2 && (
          <motion.section
            key="step-2"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c88a53]/25 bg-[#1c1613] text-[#e6ccb2] hover:border-[#c88a53]/60 hover:text-[#fdf8f5]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-lg font-extrabold text-[#fdf8f5]">
                    2. Hizmet Seçimi ({selectedBarber?.name})
                  </h2>
                  <p className="text-xs text-[#e6ccb2]/70">
                    {currentShop.name} güncel hizmet ve fiyat listesi
                  </p>
                </div>
              </div>
              <span className="rounded-lg border border-[#c88a53]/25 bg-[#1c1613] px-2.5 py-1 text-xs font-semibold text-[#e6ccb2]">
                Adım 2 / 4
              </span>
            </div>

            <div className="space-y-3">
              {services.map((service: Service) => {
                const isSelected = selectedServiceIds.includes(service.id);
                const effectivePrice = getServicePriceForBarber(
                  service,
                  selectedBarber
                );
                const isCustomPriced = effectivePrice !== service.price;

                return (
                  <motion.div
                    key={service.id}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => toggleService(service.id)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                      isSelected
                        ? "border-[#e6ccb2]/50 bg-gradient-to-r from-[#281e18] via-[#1c1613] to-[#14100d] shadow-lg shadow-[#c88a53]/20"
                        : "border-[#c88a53]/25 bg-[#1c1613] hover:border-[#c88a53]/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                            isSelected
                              ? "border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-sm"
                              : "border-[#c88a53]/35 bg-[#14100d] text-transparent"
                          }`}
                        >
                          <Check className="h-4 w-4 stroke-[3]" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-[#fdf8f5]">
                              {service.name}
                            </h3>
                            {service.vip && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#1a110b]">
                                <Crown className="h-3 w-3" />
                                VIP PAKET
                              </span>
                            )}
                            {isCustomPriced && (
                              <span className="rounded-full border border-[#c88a53]/40 bg-[#c88a53]/15 px-2 py-0.5 text-[10px] font-bold text-[#e6ccb2]">
                                {selectedBarber?.name} Özel Fiyatı
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-[#e6ccb2]/70">
                            {service.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isCustomPriced && (
                            <span className="text-xs text-[#e6ccb2]/45 line-through">
                              {service.price} TL
                            </span>
                          )}
                          <span className="bg-gradient-to-r from-[#e6ccb2] to-[#c88a53] bg-clip-text text-base font-extrabold text-transparent">
                            {effectivePrice} TL
                          </span>
                        </div>
                        <div className="mt-0.5 inline-flex items-center gap-1 rounded-md border border-[#c88a53]/20 bg-[#14100d] px-2 py-0.5 text-[11px] font-medium text-[#e6ccb2]">
                          <Clock className="h-3 w-3 text-[#c88a53]" />
                          {service.duration} dk
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* STEP 3: DYNAMIC DATE & TIME SELECTION */}
        {step === 3 && (
          <motion.section
            key="step-3"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c88a53]/25 bg-[#1c1613] text-[#e6ccb2] hover:border-[#c88a53]/60 hover:text-[#fdf8f5]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-lg font-extrabold text-[#fdf8f5]">
                    3. Tarih ve Saat Seçimi
                  </h2>
                  <p className="text-xs text-[#e6ccb2]/70">
                    {currentShop.name} çalışma saatleri: {shopSettings.openTime} -{" "}
                    {shopSettings.closeTime} ({shopSettings.slotInterval} dk
                    aralıklarla)
                  </p>
                </div>
              </div>
              <span className="rounded-lg border border-[#c88a53]/25 bg-[#1c1613] px-2.5 py-1 text-xs font-semibold text-[#e6ccb2]">
                Adım 3 / 4
              </span>
            </div>

            <div>
              <label className="mb-2.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#e6ccb2]/75">
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-[#c88a53]" />
                  Gün Seçiniz (Yatay Kaydırılabilir)
                </span>
                <span className="font-bold text-[#e6ccb2]">
                  {selectedDay.fullDate}
                </span>
              </label>

              <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-2 pt-0.5">
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
                      className={`flex min-w-[108px] shrink-0 flex-col items-center rounded-2xl border p-3 transition-all duration-200 ${
                        isSelected
                          ? isDayClosed
                            ? "border-rose-500 bg-rose-950/40 text-rose-200"
                            : "border-[#e6ccb2]/60 bg-gradient-to-b from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/25"
                          : isDayClosed
                          ? "border-[#c88a53]/10 bg-[#14100d]/70 text-[#e6ccb2]/40 opacity-75"
                          : "border-[#c88a53]/25 bg-[#1c1613] text-[#fdf8f5] hover:border-[#c88a53]/60"
                      }`}
                    >
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          isSelected
                            ? isDayClosed
                              ? "text-rose-300"
                              : "text-[#1a110b]/85"
                            : "text-[#e6ccb2]/70"
                        }`}
                      >
                        {day.label}
                      </span>
                      <span className="my-1 text-2xl font-extrabold tracking-tight">
                        {day.dayNumber}
                      </span>
                      {isDayClosed ? (
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">
                          Kapalı / Tatil
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold ${
                            isSelected ? "text-[#1a110b]" : "text-[#c88a53]"
                          }`}
                        >
                          {availableCount} Boş Saat
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {isSelectedDayClosed ? (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-950/15 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
                  <CalendarX2 className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-base font-bold text-[#fdf8f5]">
                  {selectedDay.fullDate} Günü Salonumuz Kapalıdır
                </h3>
                <p className="mx-auto mt-1 max-w-md text-xs text-[#e6ccb2]/75">
                  <strong>{currentShop.name}</strong> yönetim panelinden{" "}
                  <strong>{selectedDay.dayName}</strong> günü haftalık tatil
                  günü olarak belirlenmiştir. Lütfen açık bir gün seçiniz.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#c88a53]/25 bg-[#1c1613]/90 px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                    <span className="text-[#fdf8f5]">Müsait (Anında Onay)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#c88a53]"></span>
                    <span className="text-[#fdf8f5]">
                      Dolu —{" "}
                      <strong className="text-[#e6ccb2]">
                        Yedek Listeye Yazıl
                      </strong>
                    </span>
                  </div>
                  {shopSettings.breakEnabled && (
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#5c4738]"></span>
                      <span className="text-[#e6ccb2]/70">
                        Öğle Molası ({shopSettings.breakStart} -{" "}
                        {shopSettings.breakEnd})
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                  {currentDaySlots.map((slot) => {
                    const isSelected = selectedSlot?.time === slot.time;

                    if (slot.state === "break") {
                      return (
                        <div
                          key={slot.time}
                          className="flex cursor-not-allowed flex-col items-center justify-center rounded-xl border border-[#c88a53]/10 bg-[#14100d]/70 p-3 opacity-60"
                        >
                          <div className="flex items-center gap-1.5 text-[#e6ccb2]/50">
                            <Coffee className="h-3.5 w-3.5" />
                            <span className="text-sm font-bold">{slot.time}</span>
                          </div>
                          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#e6ccb2]/50">
                            Öğle Arası / Mola
                          </span>
                        </div>
                      );
                    }

                    if (slot.state === "available") {
                      return (
                        <motion.button
                          key={slot.time}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleSelectSlot(slot)}
                          className={`group relative flex flex-col items-center justify-center rounded-xl border p-3.5 transition-all ${
                            isSelected
                              ? "border-[#e6ccb2]/60 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/25"
                              : "border-[#c88a53]/25 bg-[#1c1613] text-[#fdf8f5] hover:border-[#c88a53]/60 hover:bg-[#241b16]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Clock
                              className={`h-3.5 w-3.5 ${
                                isSelected
                                  ? "text-[#1a110b]"
                                  : "text-emerald-400"
                              }`}
                            />
                            <span className="text-base font-extrabold">
                              {slot.time}
                            </span>
                          </div>
                          <span
                            className={`mt-1 text-[11px] font-medium ${
                              isSelected
                                ? "font-bold text-[#1a110b]"
                                : "text-emerald-400"
                            }`}
                          >
                            Müsait • Seç
                          </span>
                        </motion.button>
                      );
                    }

                    return (
                      <motion.button
                        key={slot.time}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSelectSlot(slot)}
                        className={`group relative flex flex-col items-center justify-center rounded-xl border p-3 transition-all ${
                          isSelected
                            ? "border-[#e6ccb2]/50 bg-[#c88a53]/20 text-[#fdf8f5] shadow-lg shadow-[#c88a53]/20 ring-2 ring-[#c88a53]/50"
                            : "border-[#c88a53]/15 bg-[#14100d] text-[#e6ccb2]/65 hover:border-[#c88a53]/50 hover:bg-[#1c1613]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold line-through opacity-70">
                            {slot.time}
                          </span>
                          <span className="rounded bg-[#261c16] px-1.5 py-0.5 text-[10px] font-semibold text-[#e6ccb2]/75">
                            Dolu
                          </span>
                        </div>
                        <span
                          className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold ${
                            isSelected
                              ? "text-[#e6ccb2]"
                              : "text-[#c88a53] group-hover:text-[#e6ccb2]"
                          }`}
                        >
                          <BellRing className="h-3 w-3 shrink-0" />
                          <span>Dolu - Yedek Listeye Yazıl</span>
                        </span>
                      </motion.button>
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
                  className="overflow-hidden rounded-2xl border border-[#c88a53]/45 bg-[#c88a53]/10 p-4 shadow-lg shadow-[#c88a53]/15"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b]">
                      <BellRing className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#e6ccb2]">
                        Akıllı Yedek Liste Modu Seçildi ({selectedDay.label} •{" "}
                        {selectedSlot.time})
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-[#fdf8f5]/85">
                        Bu saat şu an dolu. Yedek listeye kaydolduğunuzda, mevcut
                        randevu iptal edilirse veya müşteri gelmezse sistem size{" "}
                        <strong className="text-[#c88a53]">
                          otomatik WhatsApp bildirimi
                        </strong>{" "}
                        göndererek koltuğu öncelikli olarak size tahsis eder.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-2">
              <button
                type="button"
                disabled={!selectedSlot || isSelectedDayClosed}
                onClick={() => selectedSlot && setStep(4)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-4 text-sm font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>
                  {isWaitlistMode
                    ? `${selectedSlot?.time} Yedek Listesi İçin Bilgileri Gir`
                    : `${selectedDay.label} ${selectedSlot?.time || ""} Randevusunu Tamamla`}
                </span>
                <ChevronRight className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </motion.section>
        )}

        {/* STEP 4: CUSTOMER INFO & GLOBAL NO-SHOW SHIELD SIMULATION */}
        {step === 4 && (
          <motion.section
            key="step-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-5"
          >
            {stage !== "confirmed" && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStage("idle");
                      setStep(3);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c88a53]/25 bg-[#1c1613] text-[#e6ccb2] hover:border-[#c88a53]/60 hover:text-[#fdf8f5]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h2 className="text-lg font-extrabold text-[#fdf8f5]">
                      4. Müşteri Bilgisi & Ortak Güvenlik Ağı Kontrolü
                    </h2>
                    <p className="text-xs text-[#e6ccb2]/70">
                      Telefon numaranız Ortak Kara Liste Ağı (Global No-Show Shield) ile kontrol edilir
                    </p>
                  </div>
                </div>
                <span className="rounded-lg border border-[#c88a53]/25 bg-[#1c1613] px-2.5 py-1 text-xs font-semibold text-[#e6ccb2]">
                  Adım 4 / 4
                </span>
              </div>
            )}

            {stage !== "confirmed" && (
              <div className="rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-4 shadow-md shadow-[#c88a53]/10">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c88a53]/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c88a53]/15 text-[#c88a53]">
                      <Scissors className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-[#e6ccb2]/70">
                        {currentShop.name} • Seçilen Usta & Koltuk
                      </p>
                      <p className="text-sm font-bold text-[#fdf8f5]">
                        {selectedBarber?.name} •{" "}
                        <span className="text-[#c88a53]">
                          {selectedBarber?.chairName}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isWaitlistMode
                          ? "bg-[#c88a53]/20 text-[#e6ccb2]"
                          : "bg-emerald-500/15 text-emerald-400"
                      }`}
                    >
                      {isWaitlistMode ? "Yedek Liste Kaydı" : "Anında Randevu"}
                    </span>
                    <p className="mt-0.5 text-xs font-semibold text-[#e6ccb2]">
                      {selectedDay.fullDate} • {selectedSlot?.time}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-[#e6ccb2]/75">
                    <span className="font-semibold text-[#fdf8f5]">
                      Hizmetler:{" "}
                    </span>
                    {selectedServices
                      .map(
                        (s) =>
                          `${s.name} (${getServicePriceForBarber(
                            s,
                            selectedBarber
                          )} TL)`
                      )
                      .join(", ")}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#e6ccb2]/70">{totalDuration} dk</span>
                    <span className="bg-gradient-to-r from-[#e6ccb2] to-[#c88a53] bg-clip-text text-base font-extrabold text-transparent">
                      {totalPrice} TL
                    </span>
                  </div>
                </div>
              </div>
            )}

            {stage === "idle" || stage === "checking_trust" ? (
              <form
                onSubmit={handleInitiateVerification}
                className="space-y-4 rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-5 shadow-xl shadow-[#c88a53]/10"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#e6ccb2]">
                    Adınız Soyadınız
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c88a53]" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Örn: Kerem Alkan"
                      className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] py-3.5 pl-10 pr-4 text-sm text-[#fdf8f5] placeholder-[#e6ccb2]/40 outline-none transition focus:border-[#c88a53] focus:ring-2 focus:ring-[#c88a53]/20"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#e6ccb2]">
                      Cep Telefonu Numaranız
                    </label>
                    {customerPhone.length >= 10 && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                          isNoShowPhone
                            ? "border-rose-500/30 bg-rose-500/20 text-rose-400"
                            : "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                        }`}
                      >
                        {isNoShowPhone ? (
                          <>
                            <ShieldAlert className="h-3 w-3" />
                            Ortak Kara Listede Kayıtlı (No-Show)
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-3 w-3" />
                            Güven Skoru: Yüksek
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c88a53]" />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0555 000 00 00"
                      className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] py-3.5 pl-10 pr-4 text-sm text-[#fdf8f5] placeholder-[#e6ccb2]/40 outline-none transition focus:border-[#c88a53] focus:ring-2 focus:ring-[#c88a53]/20"
                    />
                  </div>

                  <div className="mt-3 rounded-xl border border-[#c88a53]/25 bg-[#14100d] p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#e6ccb2]">
                      <Info className="h-3.5 w-3.5 text-[#c88a53]" />
                      <span>
                        Ortak Kara Liste Ağı Test Butonları (Tek Tıkla Doldur):
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!customerName) setCustomerName("Murat Demir (Test)");
                          setCustomerPhone("05550000000");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                        <span>
                          Ortak Kara Liste Numarası Dene (05550000000)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!customerName) setCustomerName("Ahmet Yılmaz");
                          setCustomerPhone("05324567890");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Normal Müşteri Numarası Dene (05324567890)</span>
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isNoShowPhone && blacklistRecord && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="rounded-xl border border-rose-500/50 bg-gradient-to-br from-rose-950/35 via-[#241614] to-[#14100d] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                        <div className="text-xs leading-relaxed text-[#fdf8f5]">
                          <span className="font-extrabold text-rose-300">
                            Ortak Güvenlik Ağı (Global No-Show Shield) Uyarısı:{" "}
                          </span>
                          Bu telefon numarası sistemimize üye başka bir salonda (
                          <strong className="text-[#e6ccb2]">
                            {blacklistRecord.reportedByShopName}
                          </strong>
                          ) geçmiş randevusuna katılmadığı için Ortak Güvenlik Ağı
                          tarafından işaretlenmiştir.
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {formError && (
                  <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={stage === "checking_trust"}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-4 text-sm font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110 disabled:opacity-60"
                >
                  {stage === "checking_trust" ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1a110b] border-t-transparent" />
                      <span>Ortak Güvenlik Ağından Sorgulanıyor...</span>
                    </>
                  ) : (
                    <>
                      <span>Güven Skorunu Doğrula ve Devam Et</span>
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>
            ) : null}

            {/* CASE A: GLOBAL BLACKLIST DETECTED -> DEPOSIT OR BLOCK SCREEN */}
            {stage === "deposit_required" || stage === "processing_deposit" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="overflow-hidden rounded-3xl border-2 border-[#c88a53]/80 bg-gradient-to-b from-[#241b16] via-[#1c1613] to-[#14100d] p-6 shadow-bronze-glow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-300">
                      ORTAK KARA LİSTE AĞI TESPİTİ •{" "}
                      {blacklistRecord?.reportedByShopName || "ÜYE SALON BİLDİRİMİ"}
                    </span>
                    <h3 className="mt-2 text-lg font-extrabold text-[#fdf8f5] sm:text-xl">
                      Bu telefon numarası sistemimize üye başka bir salonda geçmiş randevusuna katılmadığı için Ortak Güvenlik Ağı tarafından işaretlenmiştir.
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#e6ccb2]/85">
                      Sistem kaydı: <strong>{customerPhone}</strong> numarası{" "}
                      <span className="font-bold text-[#e6ccb2]">
                        {blacklistRecord?.reportedByShopName || "Atelier Noir VIP"}
                      </span>{" "}
                      salonundaki{" "}
                      <span className="text-[#e6ccb2]">
                        {blacklistRecord?.missedDate || "14 Ekim 2026"}
                      </span>{" "}
                      randevusuna katılmamıştır (No-Show).{" "}
                      {isBlockedByShopPolicy ? (
                        <strong className="text-rose-300">
                          {currentShop.name} salon politikası gereği kara listedeki numaralara online randevu kapalıdır.
                        </strong>
                      ) : (
                        <>
                          <strong>{currentShop.name}</strong> randevunuzu
                          onaylamak için{" "}
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
                  <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-950/20 p-4 text-center">
                    <p className="text-xs font-bold text-rose-300">
                      Bu salon No-Show kaydı bulunan müşteriler için online randevuyu tamamen kapatmıştır.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStage("idle")}
                      className="mt-3 rounded-xl border border-[#c88a53]/40 bg-[#14100d] px-5 py-2.5 text-xs font-bold text-[#e6ccb2]"
                    >
                      Farklı Bir Numara İle Dene
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mt-5 space-y-2.5 rounded-2xl border border-[#c88a53]/25 bg-[#14100d] p-4 text-xs">
                      <div className="flex justify-between text-[#e6ccb2]/75">
                        <span>
                          Toplam Hizmet Tutarı ({selectedBarber?.name}):
                        </span>
                        <span className="font-semibold text-[#fdf8f5]">
                          {totalPrice} TL
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold text-[#c88a53]">
                        <span>
                          Şimdi Ödenecek No-Show Güvence Kaporası ({currentShop.name}):
                        </span>
                        <span>{requiredDepositAmount} TL</span>
                      </div>
                      <div className="flex justify-between border-t border-[#c88a53]/20 pt-2.5 text-sm font-bold text-emerald-400">
                        <span>Salonda Ödenecek Kalan Tutar:</span>
                        <span>
                          {Math.max(0, totalPrice - requiredDepositAmount)} TL
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#c88a53]/25 bg-[#1c1613] p-4">
                      <div className="mb-2.5 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-semibold text-[#fdf8f5]">
                          <CreditCard className="h-4 w-4 text-[#c88a53]" />
                          Hızlı 3D Secure Kapora Ödemesi (Simülasyon)
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                          <Lock className="h-3 w-3" /> 256-Bit SSL
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2.5 font-mono text-xs text-[#fdf8f5] sm:col-span-2"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            defaultValue="10/29"
                            className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2.5 text-center font-mono text-xs text-[#fdf8f5]"
                          />
                          <input
                            type="text"
                            defaultValue="842"
                            className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2.5 text-center font-mono text-xs text-[#fdf8f5]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setStage("idle")}
                        className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-4 py-3.5 text-xs font-semibold text-[#e6ccb2] transition hover:bg-[#221a15]"
                      >
                        Numarayı Değiştir
                      </button>
                      <button
                        type="button"
                        disabled={stage === "processing_deposit"}
                        onClick={handleCompleteDepositBooking}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3.5 text-sm font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110 disabled:opacity-60"
                      >
                        {stage === "processing_deposit" ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1a110b] border-t-transparent" />
                            <span>
                              {requiredDepositAmount} TL Kapora Tahsil Ediliyor...
                            </span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            <span>
                              {requiredDepositAmount} TL Kapora Öde ve Randevuyu
                              Onayla
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ) : null}

            {/* CASE B: TRUSTED / NORMAL PHONE -> WHATSAPP VERIFICATION SIMULATION */}
            {stage === "whatsapp_otp" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl border border-emerald-500/50 bg-gradient-to-b from-[#1c1613] via-[#131a15] to-[#14100d] p-6 shadow-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Ortak Güvenlik Ağı: Temiz • Kapora Gerektirmez
                    </span>
                    <h3 className="mt-2 text-lg font-extrabold text-[#fdf8f5]">
                      WhatsApp Hızlı Doğrulama Simülasyonu
                    </h3>
                    <p className="mt-1 text-xs text-[#e6ccb2]/80">
                      <strong>{customerPhone}</strong> numaralı WhatsApp
                      hattınıza 4 haneli onay kodunuz gönderildi.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-[#14100d] p-4">
                  <div className="flex items-center justify-between text-[11px] text-emerald-400">
                    <span className="font-bold">
                      WhatsApp • {currentShop.name}
                    </span>
                    <span>Şimdi</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#fdf8f5]">
                    Sayın <strong>{customerName}</strong>,{" "}
                    {selectedDay.fullDate} saat{" "}
                    <strong>{selectedSlot?.time}</strong> randevunuz için onay
                    kodunuz:{" "}
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-sm font-extrabold text-emerald-300">
                      {otpCode}
                    </span>
                  </p>
                </div>

                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-semibold text-[#e6ccb2]/75">
                    WhatsApp Doğrulama Kodu (Otomatik Dolduruldu)
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full rounded-xl border border-emerald-500/50 bg-[#14100d] py-3 text-center font-mono text-lg font-extrabold tracking-[0.4em] text-emerald-400 outline-none"
                  />
                </div>

                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStage("idle")}
                    className="rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-4 py-3.5 text-xs font-semibold text-[#e6ccb2] hover:bg-[#221a15]"
                  >
                    Geri Dön
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteWhatsAppBooking}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-extrabold text-[#1a110b] shadow-lg transition hover:bg-emerald-400"
                  >
                    <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                    <span>WhatsApp ile Doğrula ve Randevuyu Onayla</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* CONFIRMED DIGITAL VIP PASS + RANDEVU KODU */}
            {stage === "confirmed" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="overflow-hidden rounded-3xl border border-[#c88a53]/60 bg-gradient-to-b from-[#241b16] via-[#1c1613] to-[#14100d] p-6 text-center shadow-bronze-glow-lg"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/30">
                  <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
                </div>

                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#c88a53]/40 bg-[#c88a53]/15 px-3 py-1 text-xs font-bold text-[#e6ccb2]">
                  {isWaitlistMode
                    ? "AKILLI YEDEK LİSTE KAYDINIZ ALINDI"
                    : isNoShowPhone
                    ? `${requiredDepositAmount} TL KAPORA ALINDI • RANDEVU GARANTİLENDİ`
                    : "WHATSAPP DOĞRULANDI • RANDEVU ONAYLANDI"}
                </span>

                <h3 className="mt-3 text-2xl font-extrabold text-[#fdf8f5]">
                  Teşekkürler, {customerName}!
                </h3>

                {confirmedAppointment && (
                  <div className="mx-auto mt-4 max-w-sm rounded-2xl border border-[#c88a53]/50 bg-[#c88a53]/15 p-4 shadow-md shadow-[#c88a53]/15">
                    <span className="block text-[11px] font-bold uppercase tracking-widest text-[#e6ccb2]">
                      Randevu Kodunuz (Sorgulama & İptal İçin)
                    </span>
                    <div className="mt-1.5 flex items-center justify-center gap-3">
                      <span className="font-mono text-2xl font-black tracking-wider text-[#e6ccb2]">
                        {confirmedAppointment.appointmentCode}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyCode(confirmedAppointment.appointmentCode)
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-[#c88a53]/40 bg-[#14100d] px-2.5 py-1 text-xs font-semibold text-[#e6ccb2] hover:bg-gradient-to-r hover:from-[#b47b48] hover:via-[#c88a53] hover:to-[#9a6334] hover:text-[#1a110b]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>{copiedCode ? "Kopyalandı!" : "Kopyala"}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-5 space-y-2.5 rounded-2xl border border-[#c88a53]/25 bg-[#14100d] p-4 text-left text-xs">
                  <div className="flex items-center justify-between border-b border-[#c88a53]/20 pb-2.5">
                    <span className="font-bold uppercase tracking-wider text-[#c88a53]">
                      {currentShop.name} • Randevu Özeti Kartı
                    </span>
                    <span className="text-[#e6ccb2]/75">{customerPhone}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#c88a53]/15 pb-2">
                    <span className="text-[#e6ccb2]/70">Usta / Koltuk:</span>
                    <span className="font-bold text-[#fdf8f5]">
                      {selectedBarber?.name} ({selectedBarber?.chairName})
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#c88a53]/15 pb-2">
                    <span className="text-[#e6ccb2]/70">Tarih & Saat:</span>
                    <span className="font-bold text-[#e6ccb2]">
                      {selectedDay.fullDate} • {selectedSlot?.time}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#c88a53]/15 pb-2">
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
                      {totalPrice} TL{" "}
                      {isNoShowPhone && !isWaitlistMode && (
                        <span className="text-xs font-normal text-emerald-400">
                          ({requiredDepositAmount} TL Kapora Ödendi)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleResetWizard}
                    className="flex-1 rounded-xl border border-[#c88a53]/30 bg-[#14100d] py-3.5 text-xs font-bold text-[#e6ccb2] transition hover:border-[#c88a53]/60"
                  >
                    Yeni Randevu Oluştur
                  </button>
                  {confirmedAppointment && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsLookupOpen(true);
                        handleRunLookup(confirmedAppointment.appointmentCode);
                      }}
                      className="flex-1 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3.5 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110"
                    >
                      Randevumu Sorgula / Yönet
                    </button>
                  )}
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
            className="fixed inset-x-0 bottom-0 z-40 border-t border-[#c88a53]/30 bg-[#0d0a08]/95 p-4 backdrop-blur-xl"
          >
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#e6ccb2]/75">
                    {selectedServices.length} Hizmet (
                    {selectedBarber?.name.split(" ")[0]})
                  </span>
                  <span className="text-[#c88a53]/40">•</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#c88a53]">
                    <Clock className="h-3.5 w-3.5" />
                    {totalDuration} dk
                  </span>
                </div>
                <div className="text-xl font-extrabold text-[#fdf8f5]">
                  {totalPrice}{" "}
                  <span className="text-sm font-bold text-[#c88a53]">TL</span>
                </div>
              </div>

              <button
                type="button"
                disabled={selectedServices.length === 0}
                onClick={() => setStep(3)}
                className="flex items-center gap-2 rounded-2xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-6 py-3.5 text-sm font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110 disabled:opacity-40"
              >
                <span>Tarih & Saat Seç</span>
                <ChevronRight className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: MÜŞTERİ RANDEVU SORGULAMA / İPTAL / SAAT DEĞİŞTİRME EKRANI */}
      <AnimatePresence>
        {isLookupOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[#c88a53]/35 bg-[#1c1613] p-5 shadow-2xl shadow-[#c88a53]/20 sm:p-6"
            >
              <div className="flex items-center justify-between border-b border-[#c88a53]/25 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c88a53]/20 text-[#e6ccb2]">
                    <Search className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#fdf8f5] sm:text-lg">
                      {currentShop.name} • Randevumu Sorgula
                    </h3>
                    <p className="text-xs text-[#e6ccb2]/70">
                      Telefon numaranız veya Randevu Kodunuz ile yönetin
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLookupOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c88a53]/25 bg-[#14100d] text-[#e6ccb2] hover:border-[#c88a53]/60 hover:text-[#fdf8f5]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRunLookup();
                }}
                className="mt-4 flex gap-2"
              >
                <div className="relative flex-1">
                  <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c88a53]" />
                  <input
                    type="text"
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    placeholder="Örn: #BRB-4829 veya 0535 209 44 19"
                    className="w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] py-3 pl-10 pr-4 text-sm text-[#fdf8f5] placeholder-[#e6ccb2]/40 outline-none focus:border-[#c88a53]"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-5 py-3 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110"
                >
                  Sorgula
                </button>
              </form>

              {activeAppointmentsForQuickTest.length > 0 && (
                <div className="mt-3 rounded-xl border border-[#c88a53]/20 bg-[#14100d] p-3">
                  <span className="block text-[11px] font-semibold text-[#e6ccb2]/75">
                    Bu Salondaki Aktif Randevular (Tek Tıkla Sorgula):
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {activeAppointmentsForQuickTest.map((apt) => (
                      <button
                        key={apt.id}
                        type="button"
                        onClick={() => handleRunLookup(apt.appointmentCode)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#c88a53]/25 bg-[#1c1613] px-2.5 py-1 text-xs font-medium text-[#fdf8f5] transition hover:border-[#c88a53]/60 hover:text-[#e6ccb2]"
                      >
                        <span className="font-mono font-bold text-[#c88a53]">
                          {apt.appointmentCode}
                        </span>
                        <span>• {apt.time}</span>
                        <span className="text-[#e6ccb2]/60">
                          ({apt.customerName})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence>
                {cancelFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-4 rounded-2xl border border-[#c88a53]/60 bg-gradient-to-br from-[#c88a53]/20 via-[#1c1613] to-[#14100d] p-4 shadow-lg shadow-[#c88a53]/15"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b]">
                        <BellRing className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-extrabold text-[#e6ccb2]">
                          Randevu İptal Edildi & Saat Tekrar Boşa Çıktı!
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-[#fdf8f5]">
                          {cancelFeedback.message}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsLookupOpen(false);
                              setStep(3);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-3 py-1.5 text-xs font-black text-[#1a110b] shadow-md"
                          >
                            <span>
                              Takvimde Boşalan {cancelFeedback.time} Saatini Gör
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {rescheduleSuccessMsg && (
                <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3.5 text-xs font-semibold text-emerald-300">
                  {rescheduleSuccessMsg}
                </div>
              )}

              <div className="mt-4 space-y-3">
                {hasSearched &&
                  lookupResults.length === 0 &&
                  !cancelFeedback && (
                    <div className="rounded-2xl border border-[#c88a53]/25 bg-[#14100d] p-6 text-center">
                      <AlertTriangle className="mx-auto h-7 w-7 text-[#c88a53]" />
                      <p className="mt-2 text-sm font-bold text-[#fdf8f5]">
                        Bu Salonda Aktif Randevu Bulunamadı
                      </p>
                      <p className="mt-1 text-xs text-[#e6ccb2]/70">
                        Girdiğiniz telefon numarası veya randevu koduna ait{" "}
                        {currentShop.name} salonunda aktif bir randevu
                        bulunmuyor.
                      </p>
                    </div>
                  )}

                {lookupResults.map((apt) => {
                  const isRescheduling = rescheduleTargetId === apt.id;
                  const rescheduleSlots = getSlotsForDay(
                    rescheduleDay.id
                  ).filter((s) => s.state === "available");

                  return (
                    <div
                      key={apt.id}
                      className="rounded-2xl border border-[#c88a53]/25 bg-[#14100d] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c88a53]/20 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-[#c88a53]/20 px-2.5 py-1 font-mono text-xs font-black text-[#e6ccb2]">
                            {apt.appointmentCode}
                          </span>
                          <span className="text-sm font-extrabold text-[#fdf8f5]">
                            {apt.customerName}
                          </span>
                        </div>
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                          {apt.dateLabel} • Saat {apt.time}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-[#e6ccb2]">
                        <div className="flex justify-between">
                          <span className="text-[#e6ccb2]/65">
                            Usta / Koltuk:
                          </span>
                          <span className="font-semibold text-[#fdf8f5]">
                            {apt.barberName} ({apt.chairLabel})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#e6ccb2]/65">Hizmetler:</span>
                          <span className="font-semibold text-[#fdf8f5]">
                            {apt.services.map((s) => s.name).join(" + ")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#e6ccb2]/65">
                            Toplam Süre & Tutar:
                          </span>
                          <span className="font-bold text-[#c88a53]">
                            {apt.totalDuration} dk • {apt.totalPrice} TL
                          </span>
                        </div>
                      </div>

                      {apt.status === "upcoming" && (
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#c88a53]/20 pt-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleTargetId(
                                isRescheduling ? null : apt.id
                              );
                              setRescheduleTime("");
                            }}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#c88a53]/40 bg-[#c88a53]/15 py-2.5 text-xs font-bold text-[#e6ccb2] transition hover:bg-gradient-to-r hover:from-[#b47b48] hover:via-[#c88a53] hover:to-[#9a6334] hover:text-[#1a110b]"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>
                              {isRescheduling ? "Vazgeç" : "Saati Değiştir"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCancelFromModal(apt)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 py-2.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500 hover:text-white"
                          >
                            <CalendarX2 className="h-3.5 w-3.5" />
                            <span>Randevuyu İptal Et</span>
                          </button>
                        </div>
                      )}

                      <AnimatePresence>
                        {isRescheduling && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 overflow-hidden rounded-xl border border-[#c88a53]/25 bg-[#1c1613] p-3.5"
                          >
                            <p className="text-xs font-bold text-[#e6ccb2]">
                              Yeni Gün ve Müsait Saat Seçiniz:
                            </p>
                            <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1.5">
                              {DAYS_METADATA.filter(
                                (d) =>
                                  !shopSettings.closedDays.includes(d.dayOfWeek)
                              ).map((d) => (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => {
                                    setRescheduleDay(d);
                                    setRescheduleTime("");
                                  }}
                                  className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                    rescheduleDay.id === d.id
                                      ? "bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b]"
                                      : "bg-[#14100d] text-[#e6ccb2]/75"
                                  }`}
                                >
                                  {d.label} ({d.dateStr})
                                </button>
                              ))}
                            </div>

                            <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                              {rescheduleSlots.map((s) => (
                                <button
                                  key={s.time}
                                  type="button"
                                  onClick={() => setRescheduleTime(s.time)}
                                  className={`rounded-lg border py-1.5 text-xs font-bold transition ${
                                    rescheduleTime === s.time
                                      ? "border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b]"
                                      : "border-[#c88a53]/20 bg-[#14100d] text-[#fdf8f5] hover:border-[#c88a53]/50"
                                  }`}
                                >
                                  {s.time}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              disabled={!rescheduleTime}
                              onClick={() => handleConfirmReschedule(apt)}
                              className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-extrabold text-[#1a110b] transition hover:bg-emerald-400 disabled:opacity-40"
                            >
                              Yeni Saati Onayla ({rescheduleDay.label} •{" "}
                              {rescheduleTime || "Seçiniz"})
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
