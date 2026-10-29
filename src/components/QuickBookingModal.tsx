"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  PhoneCall,
  Lock,
  Check,
  User,
  Phone,
  Armchair,
  Scissors,
  CalendarDays,
  Clock,
  Save,
  Sun,
  Sparkles,
} from "lucide-react";
import { DAYS_METADATA, Appointment } from "@/data/mockData";
import {
  useBarber,
  minutesToTime,
  timeToMinutes,
} from "@/context/BarberContext";

type ModalTab = "phone" | "block";

interface QuickBookingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (title: string, subtitle: string) => void;
}

export default function QuickBookingModal({
  open,
  onClose,
  onSuccess,
}: QuickBookingModalProps) {
  const {
    currentShop,
    barbers,
    services,
    shopSettings,
    getSlotsForDay,
    getServicePriceForBarber,
    addAppointment,
    addBlockedTimeRange,
  } = useBarber();

  const realBarbers = useMemo(
    () => barbers.filter((b) => !b.isAnyOption),
    [barbers]
  );

  const [tab, setTab] = useState<ModalTab>("phone");
  const [error, setError] = useState<string>("");

  // Phone booking state (Pratik & Esnaf Dostu)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [barberId, setBarberId] = useState<string>("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [dayId, setDayId] = useState<string>(DAYS_METADATA[0].id);
  const [time, setTime] = useState<string>("");

  // Block state (Sade & Hızlı Saat Kapatma)
  const [blockBarberId, setBlockBarberId] = useState<string>("");
  const [blockDayId, setBlockDayId] = useState<string>(DAYS_METADATA[0].id);
  const [blockReason, setBlockReason] = useState<string>("");
  const [blockStart, setBlockStart] = useState<string>("");
  const [blockEnd, setBlockEnd] = useState<string>("");
  const [fullDay, setFullDay] = useState<boolean>(false);

  // Reset form ONLY when opened transitions from false to true
  useEffect(() => {
    if (!open) return;
    setError("");
    setCustomerName("");
    setCustomerPhone("");
    setBarberId(realBarbers[0]?.id || "");
    setServiceIds(services[0] ? [services[0].id] : []);
    setDayId(DAYS_METADATA[0].id);
    setTime("");
    setBlockBarberId(realBarbers[0]?.id || "");
    setBlockDayId(DAYS_METADATA[0].id);
    setBlockReason("");
    setBlockStart("");
    setBlockEnd("");
    setFullDay(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedBarber = realBarbers.find((b) => b.id === barberId) || null;
  const selectedServices = services.filter((s) => serviceIds.includes(s.id));
  const totalPrice = selectedServices.reduce(
    (sum, s) => sum + getServicePriceForBarber(s, selectedBarber),
    0
  );
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);

  const selectedDay =
    DAYS_METADATA.find((d) => d.id === dayId) || DAYS_METADATA[0];
  const blockDay =
    DAYS_METADATA.find((d) => d.id === blockDayId) || DAYS_METADATA[0];

  const phoneSlots = useMemo(() => getSlotsForDay(dayId), [getSlotsForDay, dayId]);
  const blockSlots = useMemo(
    () => getSlotsForDay(blockDayId),
    [getSlotsForDay, blockDayId]
  );

  const isPhoneDayClosed = shopSettings.closedDays.includes(selectedDay.dayOfWeek);
  const isBlockDayClosed = shopSettings.closedDays.includes(blockDay.dayOfWeek);

  // End time options for block
  const blockEndOptions = useMemo(() => {
    if (!blockStart) return [];
    const startM = timeToMinutes(blockStart);
    const opts = blockSlots
      .map((s) => s.time)
      .filter((t) => timeToMinutes(t) > startM);
    if (!opts.includes(shopSettings.closeTime)) opts.push(shopSettings.closeTime);
    return opts;
  }, [blockStart, blockSlots, shopSettings.closeTime]);

  const toggleService = (id: string) => {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSavePhoneBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedBarber) {
      setError("Lütfen bir çalışan / koltuk seçiniz.");
      return;
    }
    if (selectedServices.length === 0) {
      setError("Lütfen en az bir hizmet seçiniz.");
      return;
    }
    if (!time) {
      setError("Lütfen randevu saatini seçiniz.");
      return;
    }

    // İsim boşsa esnaf dostu varsayılan: "Misafir Müşteri"
    const finalName = customerName.trim() || "Misafir Müşteri";
    // Telefon boşsa dükkan telefonu veya belirtilmemiş ibaresi
    const finalPhone = customerPhone.trim() || currentShop.phone || "Telefon Belirtilmedi";

    const created: Appointment = addAppointment({
      dayId: selectedDay.id,
      dateLabel: `${selectedDay.label} (${selectedDay.dateStr})`,
      time,
      endTime: minutesToTime(timeToMinutes(time) + (totalDuration || 30)),
      customerName: finalName,
      customerPhone: finalPhone,
      barberId: selectedBarber.id,
      barberName: selectedBarber.name,
      chairLabel: selectedBarber.chairName,
      services: selectedServices.map((s) => ({
        name: s.name,
        price: getServicePriceForBarber(s, selectedBarber),
        duration: s.duration,
      })),
      totalPrice,
      totalDuration: totalDuration || 30,
      trustBadge: "first_time",
      trustDetail: "Hızlı / Telefon Randevusu • Berber Tarafından Eklendi",
      status: "upcoming",
      reminderSent: false,
      bookingSource: "phone",
      notes: customerPhone.trim() ? "Telefon randevusu" : "Hızlı Misafir Kaydı (Telefonsuz)",
    });

    onSuccess(
      `Hızlı Randevu Kaydedildi (${created.appointmentCode})`,
      `${created.customerName} • ${selectedDay.label} ${time} • ${selectedBarber.name} — Bu saat artık vitrinde DOLU olarak kapandı.`
    );
    onClose();
  };

  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const barber = realBarbers.find((b) => b.id === blockBarberId);
    if (!barber) {
      setError("Lütfen saati kapatılacak ustayı seçiniz.");
      return;
    }

    // Varsayılan neden: "Özel İzin / Kapalı"
    const finalReason = blockReason.trim() || "Özel İzin / Kapalı";

    const start = fullDay ? shopSettings.openTime : blockStart;
    const end = fullDay ? shopSettings.closeTime : blockEnd;

    if (!start || !end) {
      setError("Lütfen kapatılacak saati seçiniz veya 'Tüm Günü Kapat' butonuna tıklayınız.");
      return;
    }
    if (timeToMinutes(end) <= timeToMinutes(start)) {
      setError("Bitiş saati başlangıç saatinden sonra olmalıdır.");
      return;
    }

    addBlockedTimeRange({
      dayId: blockDay.id,
      dateLabel: `${blockDay.label} (${blockDay.dateStr})`,
      startTime: start,
      endTime: end,
      barberId: barber.id,
      barberName: barber.name,
      chairLabel: barber.chairName,
      reason: finalReason,
    });

    onSuccess(
      `Saat Kapatıldı: ${finalReason}`,
      `${barber.name} • ${blockDay.label} ${start} - ${end} arası randevuya kapatıldı.`
    );
    onClose();
  };

  const inputCls =
    "w-full rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3.5 py-2.5 text-sm text-[#fdf8f5] placeholder-[#e6ccb2]/40 outline-none focus:border-[#e6ccb2]/70";
  const labelCls =
    "mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#e6ccb2]";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="quick-booking-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[#e6ccb2]/45 bg-gradient-to-b from-[#241b16] via-[#1c1613] to-[#14100d] shadow-2xl shadow-black/80 sm:rounded-3xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#c88a53]/25 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#1a110b]">
                    {currentShop.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#c88a53]">
                    <Sparkles className="h-3 w-3" /> Hızlı & Esnaf Dostu
                  </span>
                </div>
                <h2 className="mt-1.5 text-lg font-extrabold text-[#fdf8f5]">
                  Hızlı Randevu Ekle / Saat Kapat
                </h2>
                <p className="text-xs text-[#e6ccb2]/70">
                  Telefon/misafir randevularını 2 saniyede kaydedin veya ustanın saatini kapatın.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#c88a53]/30 bg-[#14100d] text-[#e6ccb2] transition hover:border-[#e6ccb2]/60 hover:text-[#fdf8f5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2 border-b border-[#c88a53]/20 bg-[#14100d] p-2">
              {[
                { id: "phone" as ModalTab, label: "Hızlı / Telefon Randevusu", icon: PhoneCall },
                { id: "block" as ModalTab, label: "Usta Saati Kapat (Mola / İzin)", icon: Lock },
              ].map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTab(t.id);
                      setError("");
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs transition sm:text-sm ${
                      active
                        ? "border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] font-black text-[#120b07] shadow-lg shadow-[#c88a53]/25"
                        : "border-transparent font-bold text-[#e6ccb2]/80 hover:border-[#c88a53]/30 hover:bg-[#1c1613] hover:text-[#fdf8f5]"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 stroke-[2.5]" />
                    <span className="text-left font-bold leading-tight">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {tab === "phone" ? (
                <form id="phone-booking-form" onSubmit={handleSavePhoneBooking} className="space-y-4">
                  {/* Müşteri Bilgileri - Tamamen Opsiyonel */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className={labelCls}>
                          <User className="h-3.5 w-3.5 text-[#c88a53]" /> Müşteri Adı
                        </label>
                        <span className="text-[10px] text-[#e6ccb2]/50">İsteğe Bağlı (Boşsa &ldquo;Misafir&rdquo;)</span>
                      </div>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Misafir Müşteri"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className={labelCls}>
                          <Phone className="h-3.5 w-3.5 text-[#c88a53]" /> Telefon Numarası
                        </label>
                        <span className="text-[10px] text-[#e6ccb2]/50">İsteğe Bağlı</span>
                      </div>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="05XX XXX XX XX (Opsiyonel)"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* Çalışan / Koltuk */}
                  <div>
                    <label className={labelCls}>
                      <Armchair className="h-3.5 w-3.5 text-[#c88a53]" /> Çalışan / Koltuk *
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {realBarbers.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setBarberId(b.id)}
                          className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                            barberId === b.id
                              ? "border-[#e6ccb2]/60 bg-[#c88a53]/20 text-[#fdf8f5] shadow-md shadow-[#c88a53]/15"
                              : "border-[#c88a53]/20 bg-[#14100d] text-[#e6ccb2]/85 hover:border-[#c88a53]/50"
                          }`}
                        >
                          <span className="block font-extrabold">{b.name}</span>
                          <span className="block text-[11px] text-[#c88a53]">{b.chairName}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hizmet Seçimi */}
                  <div>
                    <label className={labelCls}>
                      <Scissors className="h-3.5 w-3.5 text-[#c88a53]" /> Hizmet Seçimi *
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {services.map((s) => {
                        const active = serviceIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleService(s.id)}
                            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                              active
                                ? "border-[#e6ccb2]/60 bg-[#c88a53]/20 text-[#fdf8f5]"
                                : "border-[#c88a53]/20 bg-[#14100d] text-[#e6ccb2]/85 hover:border-[#c88a53]/50"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                  active
                                    ? "border-[#e6ccb2]/60 bg-gradient-to-r from-[#b47b48] to-[#9a6334] text-[#1a110b]"
                                    : "border-[#c88a53]/35"
                                }`}
                              >
                                {active && <Check className="h-3 w-3 stroke-[3]" />}
                              </span>
                              <span className="font-bold">{s.name}</span>
                            </span>
                            <span className="shrink-0 font-extrabold text-[#c88a53]">
                              {getServicePriceForBarber(s, selectedBarber)} TL
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tarih */}
                  <div>
                    <label className={labelCls}>
                      <CalendarDays className="h-3.5 w-3.5 text-[#c88a53]" /> Tarih *
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {DAYS_METADATA.map((d) => {
                        const closed = shopSettings.closedDays.includes(d.dayOfWeek);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              setDayId(d.id);
                              setTime("");
                            }}
                            className={`flex min-w-[64px] shrink-0 flex-col items-center rounded-xl border px-2.5 py-2 text-xs transition ${
                              dayId === d.id
                                ? "border-[#e6ccb2]/60 bg-gradient-to-b from-[#c88a53]/35 to-[#1c1613] text-[#fdf8f5]"
                                : "border-[#c88a53]/20 bg-[#14100d] text-[#e6ccb2]/80 hover:border-[#c88a53]/50"
                            } ${closed ? "opacity-50" : ""}`}
                          >
                            <span className="text-[10px] font-semibold">{d.label}</span>
                            <span className="text-base font-black">{d.dayNumber}</span>
                            <span className="text-[9px] font-bold text-[#c88a53]">
                              {closed ? "KAPALI" : d.monthShort}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Saat */}
                  <div>
                    <label className={labelCls}>
                      <Clock className="h-3.5 w-3.5 text-[#c88a53]" /> Saat *
                    </label>
                    {isPhoneDayClosed ? (
                      <p className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs font-bold text-rose-300">
                        Bu gün haftalık tatil olarak kapalı. Başka bir gün seçiniz.
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {phoneSlots.map((slot) => {
                          const disabled = slot.state !== "available";
                          const active = time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={disabled}
                              onClick={() => setTime(slot.time)}
                              className={`rounded-lg border py-2 text-xs font-extrabold transition ${
                                active
                                  ? "border-[#e6ccb2]/60 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b]"
                                  : disabled
                                  ? "cursor-not-allowed border-[#c88a53]/10 bg-[#0d0a08] text-[#e6ccb2]/30 line-through"
                                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400"
                              }`}
                              title={
                                slot.state === "break"
                                  ? "Mola"
                                  : slot.state === "booked"
                                  ? `Dolu: ${slot.bookedBy || ""}`
                                  : "Müsait"
                              }
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Özet */}
                  <div className="flex items-center justify-between rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-4 py-3 text-xs">
                    <span className="text-[#e6ccb2]/80">
                      {selectedServices.length} hizmet • {totalDuration || 0} dk
                      {time && ` • ${selectedDay.label} ${time}`}
                    </span>
                    <span className="bg-gradient-to-r from-[#fdf8f5] to-[#c88a53] bg-clip-text text-lg font-black text-transparent">
                      {totalPrice} TL
                    </span>
                  </div>
                </form>
              ) : (
                /* TAB 2: SADELEŞTİRİLMİŞ USTA SAATİ KAPATMA */
                <form id="block-form" onSubmit={handleSaveBlock} className="space-y-4">
                  {/* Usta / Koltuk */}
                  <div>
                    <label className={labelCls}>
                      <Armchair className="h-3.5 w-3.5 text-[#c88a53]" /> Saati Kapatılacak Usta / Koltuk *
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {realBarbers.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setBlockBarberId(b.id)}
                          className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                            blockBarberId === b.id
                              ? "border-[#e6ccb2]/60 bg-[#c88a53]/20 text-[#fdf8f5]"
                              : "border-[#c88a53]/20 bg-[#14100d] text-[#e6ccb2]/85 hover:border-[#c88a53]/50"
                          }`}
                        >
                          <span className="block font-extrabold">{b.name}</span>
                          <span className="block text-[11px] text-[#c88a53]">{b.chairName}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tarih */}
                  <div>
                    <label className={labelCls}>
                      <CalendarDays className="h-3.5 w-3.5 text-[#c88a53]" /> Tarih *
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {DAYS_METADATA.map((d) => {
                        const closed = shopSettings.closedDays.includes(d.dayOfWeek);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              setBlockDayId(d.id);
                              setBlockStart("");
                              setBlockEnd("");
                            }}
                            className={`flex min-w-[64px] shrink-0 flex-col items-center rounded-xl border px-2.5 py-2 text-xs transition ${
                              blockDayId === d.id
                                ? "border-[#e6ccb2]/60 bg-gradient-to-b from-[#c88a53]/35 to-[#1c1613] text-[#fdf8f5]"
                                : "border-[#c88a53]/20 bg-[#14100d] text-[#e6ccb2]/80 hover:border-[#c88a53]/50"
                            } ${closed ? "opacity-50" : ""}`}
                          >
                            <span className="text-[10px] font-semibold">{d.label}</span>
                            <span className="text-base font-black">{d.dayNumber}</span>
                            <span className="text-[9px] font-bold text-[#c88a53]">
                              {closed ? "KAPALI" : d.monthShort}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tek Tuş: Tüm Günü Kapat */}
                  <button
                    type="button"
                    onClick={() => setFullDay((v) => !v)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-xs font-bold transition ${
                      fullDay
                        ? "border-rose-400/60 bg-rose-500/20 text-rose-200"
                        : "border-[#c88a53]/30 bg-[#14100d] text-[#e6ccb2] hover:border-[#c88a53]/60"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-[#c88a53]" />
                      Tüm Günü Kapat ({shopSettings.openTime} - {shopSettings.closeTime})
                    </span>
                    <span
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        fullDay ? "bg-rose-500" : "bg-[#261c16] ring-1 ring-[#c88a53]/40"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          fullDay ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </span>
                  </button>

                  {/* Belirli Saat Seçimi (Tüm gün seçili değilse) */}
                  {!fullDay && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>
                          <Clock className="h-3.5 w-3.5 text-[#c88a53]" /> Başlangıç Saati
                        </label>
                        <select
                          value={blockStart}
                          onChange={(e) => {
                            setBlockStart(e.target.value);
                            const startM = timeToMinutes(e.target.value);
                            setBlockEnd(
                              minutesToTime(
                                startM + Math.max(15, shopSettings.slotInterval || 30)
                              )
                            );
                          }}
                          className={inputCls}
                        >
                          <option value="">Seçiniz</option>
                          {blockSlots
                            .filter((s) => s.state !== "break")
                            .map((s) => (
                              <option key={s.time} value={s.time}>
                                {s.time}
                                {s.state === "booked" ? " (dolu)" : ""}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>
                          <Clock className="h-3.5 w-3.5 text-[#c88a53]" /> Bitiş Saati
                        </label>
                        <select
                          value={blockEnd}
                          onChange={(e) => setBlockEnd(e.target.value)}
                          disabled={!blockStart}
                          className={`${inputCls} disabled:opacity-50`}
                        >
                          {!blockStart && <option value="">Önce başlangıç seçin</option>}
                          {blockEndOptions.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Sade Not Alanı (Opsiyonel / Varsayılan "Özel İzin / Kapalı") */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className={labelCls}>
                        <Lock className="h-3.5 w-3.5 text-[#c88a53]" /> Kısa Not / Neden
                      </label>
                      <span className="text-[10px] text-[#e6ccb2]/50">İsteğe Bağlı (Varsayılan: Özel İzin / Kapalı)</span>
                    </div>
                    <input
                      type="text"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Özel İzin / Kapalı (veya Cuma Namazı, Yemek vb.)"
                      className={inputCls}
                    />
                  </div>

                  <p className="rounded-xl border border-[#c88a53]/20 bg-[#14100d] p-3 text-[11px] leading-relaxed text-[#e6ccb2]/70">
                    Kapatılan saatler Günlük Randevu Akışı&apos;nda kilitli kart olarak
                    görünür ve müşteri vitrininde (/?shop={currentShop.slug}) DOLU olarak
                    kapanır. İstenildiğinde tek tıkla &ldquo;Kilidi Aç&rdquo; butonuyla geri açılabilir.
                  </p>
                </form>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs font-bold text-rose-300">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-[#c88a53]/25 bg-[#14100d] p-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#c88a53]/30 bg-[#1c1613] px-4 py-2.5 text-xs font-bold text-[#e6ccb2] hover:text-[#fdf8f5]"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                form={tab === "phone" ? "phone-booking-form" : "block-form"}
                className="inline-flex items-center gap-2 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-5 py-2.5 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/30 transition hover:brightness-110 active:scale-95"
              >
                {tab === "phone" ? (
                  <>
                    <Save className="h-4 w-4" /> Randevuyu Kaydet (Hızlı)
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" /> Saati Kapat
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
