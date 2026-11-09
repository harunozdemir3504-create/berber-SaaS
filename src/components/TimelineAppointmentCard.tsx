"use client";

import React, { memo } from "react";
import type { Appointment } from "@/data/mockData";
import { buildWhatsAppUrl, formatPhoneDisplay } from "@/lib/whatsapp";
import { timeToMinutes, minutesToTime } from "@/context/BarberContext";

/* -------------------------------------------------------------------------- */
/*  Takvim Çizelgesi (Timeline) Randevu Kartı                                 */
/*  30 dk = kompakt | 60 dk = 1 saatlik düzen | 90 dk+ = VIP / uzun işlem       */
/* -------------------------------------------------------------------------- */

export interface TimelineCardTheme {
  container: string;
  badge: string;
  title: string;
  price: string;
  infoBox: string;
}

// Gündüz (Light) ve Gece (Dark) Moduna Uyumlu, hafif renk geçişli kart temaları
export const getTimelineCardTheme = (
  status: Appointment["status"],
  isBlacklistApt: boolean
): TimelineCardTheme => {
  const isPending = status === "pending";

  if (isBlacklistApt && isPending) {
    return {
      container:
        "bg-gradient-to-br from-rose-50/90 via-white to-rose-50/40 dark:from-[#2a0f16] dark:via-[#1c0d11] dark:to-[#22140c] border border-rose-300 dark:border-rose-500/70 border-l-4 border-l-rose-500 text-stone-900 dark:text-[#fdf8f5] shadow-sm",
      badge: "bg-rose-500 text-white font-black animate-pulse",
      title: "text-rose-950 dark:text-rose-100",
      price: "text-rose-700 dark:text-rose-300",
      infoBox: "border-rose-200/80 bg-white/70 dark:border-rose-500/25 dark:bg-white/[0.03]",
    };
  }

  if (isPending) {
    return {
      container:
        "bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 dark:from-[#251a0f] dark:via-[#1b140f] dark:to-[#1f1a0c] border border-amber-200 dark:border-amber-500/60 border-l-4 border-l-amber-500 text-stone-900 dark:text-[#fdf8f5] shadow-sm",
      badge:
        "bg-amber-100 dark:bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-black",
      title: "text-stone-900 dark:text-[#fdf8f5]",
      price: "text-amber-800 dark:text-[#dfc39e]",
      infoBox: "border-amber-200/80 bg-white/70 dark:border-amber-500/25 dark:bg-white/[0.03]",
    };
  }

  if (status === "completed") {
    return {
      container:
        "bg-gradient-to-br from-stone-50 via-white to-emerald-50/30 dark:from-[#0e1712] dark:via-[#101512] dark:to-[#16170f] border border-stone-200 dark:border-emerald-500/40 border-l-4 border-l-emerald-600 text-stone-900 dark:text-[#fdf8f5] shadow-sm",
      badge:
        "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-black",
      title: "text-stone-900 dark:text-[#fdf8f5]",
      price: "text-emerald-700 dark:text-[#dfc39e]",
      infoBox: "border-stone-200 bg-white/70 dark:border-emerald-500/20 dark:bg-white/[0.03]",
    };
  }

  if (status === "cancelled" || status === "no_show") {
    return {
      container:
        "bg-gradient-to-br from-red-50/80 via-white to-red-50/30 dark:from-[#1d1313] dark:via-[#181212] dark:to-[#161111] border border-red-200 dark:border-rose-500/40 border-l-4 border-l-red-400 text-stone-900 dark:text-[#fdf8f5] shadow-sm",
      badge: "bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-black",
      title: "text-stone-700 dark:text-stone-300 line-through",
      price: "text-stone-500 dark:text-stone-400",
      infoBox: "border-red-200/70 bg-white/70 dark:border-rose-500/20 dark:bg-white/[0.03]",
    };
  }

  // Onaylı / Yaklaşan Randevu
  return {
    container:
      "bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 dark:from-[#0f2018] dark:via-[#121914] dark:to-[#1f1b0f] border border-emerald-200 dark:border-emerald-500/50 border-l-4 border-l-emerald-500 dark:border-l-emerald-400 text-stone-900 dark:text-[#fdf8f5] shadow-sm",
    badge:
      "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-black",
    title: "text-stone-900 dark:text-[#fdf8f5]",
    price: "text-emerald-700 dark:text-[#dfc39e]",
    infoBox: "border-emerald-200/80 bg-white/70 dark:border-[#dfc39e]/20 dark:bg-white/[0.03]",
  };
};

const formatDurationLabel = (minutes: number) => {
  if (minutes < 60) return `${minutes} dk`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${minutes} dk (${h} Saat)` : `${minutes} dk (${h} sa ${m} dk)`;
};

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

const BTN_BASE =
  "inline-flex items-center justify-center rounded-md px-2 py-1 text-[10px] font-black transition-all duration-150 active:scale-95 cursor-pointer shrink-0 select-none touch-manipulation disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed";

export interface TimelineAppointmentCardProps {
  apt: Appointment;
  isBlacklistApt: boolean;
  /** Kartın başladığı satıra göre dikey kaydırma (px) */
  offsetPx: number;
  /** Kartın toplam yüksekliği (px, -4px boşluk hariç) */
  heightPx: number;
  /** Kapladığı 30 dakikalık dilim sayısı */
  slotCount: number;
  lane: number;
  lanes: number;
  isUpdating?: boolean;
  onOpen: (apt: Appointment) => void;
  onConfirm?: (apt: Appointment, isBlacklistApt: boolean) => void;
  onComplete?: (apt: Appointment) => void;
  onMove?: (apt: Appointment) => void;
  onCancel?: (apt: Appointment) => void;
  onDragStartApt: (e: React.DragEvent, apt: Appointment) => void;
  onDragEndApt: () => void;
}

function TimelineAppointmentCardBase({
  apt,
  isBlacklistApt,
  offsetPx,
  heightPx,
  slotCount,
  lane,
  lanes,
  isUpdating = false,
  onOpen,
  onConfirm,
  onComplete,
  onMove,
  onCancel,
  onDragStartApt,
  onDragEndApt,
}: TimelineAppointmentCardProps) {
  const duration = Number(apt.totalDuration) || 30;
  const safeSlotCount = Math.ceil((Number(duration) || 30) / 30);
  const safeHeightPx = safeSlotCount * 64;
  const startMinutes = timeToMinutes(apt.time);
  const endTimeLabel =
    apt.endTime && !String(apt.endTime).includes("NaN")
      ? apt.endTime
      : minutesToTime(startMinutes + duration);
  const isCompleted = apt.status === "completed";
  const isPending = apt.status === "pending";
  const theme = getTimelineCardTheme(apt.status, isBlacklistApt);
  const servicesSummary = apt.services.map((s) => s.name).join(" + ") || "Hizmet";
  const phoneDisplay = formatPhoneDisplay(apt.customerPhone);
  const phoneHref = `tel:${(apt.customerPhone || "").replace(/[^\d+]/g, "")}`;
  const variant: "compact" | "hour" | "vip" =
    safeSlotCount >= 3 ? "vip" : safeSlotCount === 2 ? "hour" : "compact";

  const statusLabel =
    isBlacklistApt && isPending
      ? "🚨 KAPORA"
      : isPending
      ? "⏳ Onay Bekliyor"
      : isCompleted
      ? "👍 Geldi"
      : "✅ Onaylı";

  const style: React.CSSProperties = {
    position: "absolute",
    top: `${2 + (Number.isFinite(offsetPx) ? offsetPx : 0)}px`,
    height: `calc(${safeHeightPx}px - 4px)`,
    left: lanes > 1 ? `calc(${(lane / lanes) * 100}% + ${lane > 0 ? 2 : 0}px)` : 0,
    right:
      lanes > 1
        ? `calc(${((lanes - lane - 1) / lanes) * 100}% + ${lane < lanes - 1 ? 2 : 0}px)`
        : 0,
    zIndex: 10,
  };

  const statusBadge = (
    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black leading-none ${theme.badge}`}>
      {statusLabel}
    </span>
  );

  const earlyBadge = apt.canComeEarly ? (
    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] leading-none bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 font-black">
      ⚡ Erken Gelebilir
    </span>
  ) : null;

  return (
    <div
      style={style}
      draggable={!isPending && !isBlacklistApt && !isUpdating}
      onDragStart={(e) => onDragStartApt(e, apt)}
      onDragEnd={onDragEndApt}
      onClick={(e) => {
        stop(e);
        onOpen(apt);
      }}
      className={`max-w-full overflow-hidden box-border rounded-xl flex flex-col transition-all duration-150 ease-out cursor-pointer active:scale-[0.99] hover:shadow-lg hover:ring-2 hover:ring-amber-400/80 dark:hover:ring-[#dfc39e]/80 select-none touch-manipulation will-change-transform ${theme.container} ${
        variant === "compact"
          ? "px-3 py-1.5 justify-center gap-1"
          : variant === "hour"
          ? "px-3.5 py-2.5 justify-center gap-2"
          : "px-4 py-3 gap-2"
      }`}
    >
      {/* ============================ 15 / 30 DK: KOMPAKT (1 SLOT - 64px) ============================ */}
      {variant === "compact" && (
        <>
          {/* Üst Satır: Müşteri Adı + Rozetler (Sol) ve Tutar (Sağ) */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <span className={`text-sm sm:text-base font-bold leading-tight truncate ${theme.title}`}>
                {apt.customerName}
              </span>
              {statusBadge}
              {earlyBadge}
            </div>
            <span className={`font-mono text-xs sm:text-sm font-black shrink-0 ${theme.price}`}>
              {apt.totalPrice} ₺
            </span>
          </div>

          {/* Alt Satır: İşlem Adı, Süre ve Koltuk/Usta */}
          <div className="flex items-center gap-2 min-w-0 text-[11px] leading-tight text-stone-600 dark:text-stone-300">
            <span className="truncate min-w-0 font-medium">✂️ {servicesSummary}</span>
            <span className="shrink-0 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] leading-none font-black text-amber-800 dark:text-amber-300">
              ⏱️ {duration} Dk ({apt.time} - {endTimeLabel})
            </span>
            {apt.barberName && (
              <span className="hidden sm:inline truncate shrink-0 max-w-[25%] text-stone-500 dark:text-stone-400">
                💈 {apt.barberName}
              </span>
            )}
          </div>
        </>
      )}

      {/* ========================= 45 / 60 DK: 2 SLOT DÜZENİ (128px) ========================= */}
      {variant === "hour" && (
        <>
          {/* Üst Satır: Müşteri Adı + Rozetler (Sol) ve Tutar (Sağ) */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <span className={`text-base sm:text-lg font-bold leading-tight truncate ${theme.title}`}>
                👤 {apt.customerName}
              </span>
              {statusBadge}
              {earlyBadge}
            </div>
            <span className={`font-mono text-sm sm:text-base font-black shrink-0 ${theme.price}`}>
              {apt.totalPrice} ₺
            </span>
          </div>

          {/* Alt Alan: İşlem Tam Adı, Süre ve Koltuk/Usta */}
          <div className="flex flex-col gap-1 min-w-0 rounded-lg bg-white/70 dark:bg-white/[0.04] p-2 text-xs text-stone-700 dark:text-stone-300 border border-stone-200/50 dark:border-white/5">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="truncate font-bold text-stone-900 dark:text-[#fdf8f5]">
                ✂️ {servicesSummary}
              </span>
              <span className="shrink-0 rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] leading-none font-black text-amber-800 dark:text-amber-300">
                ⏱️ {duration} Dk ({apt.time} - {endTimeLabel})
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 min-w-0 text-[11px] text-stone-500 dark:text-stone-400">
              <span className="truncate">💈 {apt.chairLabel || apt.barberName}</span>
              {phoneDisplay && <span className="shrink-0 font-mono">📞 {phoneDisplay}</span>}
            </div>
          </div>
        </>
      )}

      {/* ===================== 75 / 90 DK+: VIP / UZUN İŞLEM DÜZENİ (3+ SLOT - 192px+) ===================== */}
      {variant === "vip" && (
        <>
          {/* 1. Katman: Üst Başlık ve Tutar */}
          <div className="flex items-center justify-between gap-2 min-w-0 shrink-0">
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <span className={`text-base sm:text-xl font-bold leading-tight truncate ${theme.title}`}>
                👤 {apt.customerName}
              </span>
              <span className="shrink-0 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[9px] leading-none font-black text-amber-950 shadow-sm">
                👑 VIP
              </span>
              {statusBadge}
              {earlyBadge}
            </div>
            <span className={`font-mono text-base sm:text-lg font-black shrink-0 ${theme.price}`}>
              {apt.totalPrice} ₺
            </span>
          </div>

          {/* 2. Katman: Orta Bilgi Bandı */}
          <div
            className={`flex-1 min-h-0 flex flex-col justify-center gap-1.5 rounded-xl border px-3 py-2 overflow-hidden ${theme.infoBox}`}
          >
            <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-[#fdf8f5] line-clamp-2">
              ✂️ {servicesSummary}
            </p>
            <div className="flex items-center justify-between gap-2 text-[11px] text-stone-600 dark:text-stone-400">
              <span className="font-semibold">
                🕒 {apt.time} - {endTimeLabel} ({safeSlotCount} Dilim • {duration} Dk)
              </span>
              <span>💈 {apt.chairLabel || apt.barberName}</span>
            </div>
          </div>

          {/* 3. Katman: Alt Bilgi Barı */}
          {phoneDisplay && (
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-0.5">
              <span className="font-mono font-bold">📞 {phoneDisplay}</span>
              <span className="text-[10px] text-amber-600 dark:text-[#dfc39e] font-semibold">Dokunarak menüyü açın ➔</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const TimelineAppointmentCard = memo(TimelineAppointmentCardBase);
export default TimelineAppointmentCard;
