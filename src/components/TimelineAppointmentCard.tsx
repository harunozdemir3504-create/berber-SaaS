"use client";

import React, { memo } from "react";
import type { Appointment } from "@/data/mockData";
import { buildWhatsAppUrl, formatPhoneDisplay } from "@/lib/whatsapp";

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
  onConfirm: (apt: Appointment, isBlacklistApt: boolean) => void;
  onComplete: (apt: Appointment) => void;
  onMove: (apt: Appointment) => void;
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
  onDragStartApt,
  onDragEndApt,
}: TimelineAppointmentCardProps) {
  const duration = apt.totalDuration || slotCount * 30;
  const isCompleted = apt.status === "completed";
  const isPending = apt.status === "pending";
  const theme = getTimelineCardTheme(apt.status, isBlacklistApt);
  const servicesSummary = apt.services.map((s) => s.name).join(" + ") || "Hizmet";
  const phoneDisplay = formatPhoneDisplay(apt.customerPhone);
  const phoneHref = `tel:${(apt.customerPhone || "").replace(/[^\d+]/g, "")}`;
  const variant: "compact" | "hour" | "vip" =
    slotCount >= 3 ? "vip" : slotCount === 2 ? "hour" : "compact";

  const statusLabel =
    isBlacklistApt && isPending
      ? "🚨 KAPORA"
      : isPending
      ? "⏳ Onay Bekliyor"
      : isCompleted
      ? "Geldi ✅"
      : "✅ Onaylı";

  const style: React.CSSProperties = {
    position: "absolute",
    top: `${2 + offsetPx}px`,
    height: `calc(${heightPx}px - 4px)`,
    left: lanes > 1 ? `calc(${(lane / lanes) * 100}% + ${lane > 0 ? 2 : 0}px)` : 0,
    right:
      lanes > 1
        ? `calc(${((lanes - lane - 1) / lanes) * 100}% + ${lane < lanes - 1 ? 2 : 0}px)`
        : 0,
    zIndex: 10,
  };

  /* ---------------------------- Aksiyon Butonları ---------------------------- */
  const actions = (
    <div className="flex items-center gap-1 shrink-0">
      <span className={`font-mono text-xs sm:text-sm font-black mr-0.5 ${theme.price}`}>
        {apt.totalPrice} TL
      </span>
      {isPending && (
        <button
          type="button"
          disabled={isUpdating}
          onClick={(e) => {
            stop(e);
            if (isUpdating) return;
            onConfirm(apt, isBlacklistApt);
          }}
          className={`${BTN_BASE} bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm`}
          title={isBlacklistApt ? "Kaporayı onaylayın" : "Randevuyu onayla"}
        >
          {isUpdating ? "..." : isBlacklistApt ? "✅ Onayla" : "Onayla"}
        </button>
      )}
      {!isPending && !isCompleted && (
        <button
          type="button"
          disabled={isUpdating}
          onClick={(e) => {
            stop(e);
            if (isUpdating) return;
            onComplete(apt);
          }}
          className={`${BTN_BASE} border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25`}
          title="Müşteri Geldi"
        >
          {isUpdating ? "..." : "Geldi"}
        </button>
      )}
      <button
        type="button"
        disabled={isUpdating}
        onClick={(e) => {
          stop(e);
          if (isUpdating) return;
          onMove(apt);
        }}
        className={`${BTN_BASE} border border-stone-300 dark:border-white/10 bg-white/80 dark:bg-white/5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/15 font-bold`}
        title="Randevuyu Başka Saate Taşı"
      >
        Taşı
      </button>
    </div>
  );

  const statusBadge = (
    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] leading-none ${theme.badge}`}>
      {statusLabel}
    </span>
  );

  const earlyBadge = apt.canComeEarly ? (
    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] leading-none bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 font-black">
      ⚡ Erken Gelebilir
    </span>
  ) : null;

  const phoneLink = phoneDisplay ? (
    <a
      href={phoneHref}
      onClick={stop}
      className="font-mono text-[10px] sm:text-[11px] font-bold shrink-0 hover:underline active:scale-95 transition-transform touch-manipulation"
      title="Telefonu ara"
    >
      📞 {phoneDisplay}
    </a>
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
      className={`max-w-full overflow-hidden box-border rounded-lg flex flex-col transition-all duration-200 ease-out cursor-pointer hover:shadow-md hover:ring-2 hover:ring-[#dfc39e]/70 select-none touch-manipulation will-change-transform ${theme.container} ${
        variant === "compact"
          ? "px-2.5 py-1 justify-center gap-0.5"
          : variant === "hour"
          ? "px-3 py-2 justify-center gap-2"
          : "px-3 py-2 gap-1.5"
      }`}
    >
      {/* ============================ 30 DK: KOMPAKT ============================ */}
      {variant === "compact" && (
        <>
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <span className={`truncate text-sm sm:text-base font-bold leading-tight ${theme.title}`}>
                {apt.customerName}
              </span>
              {statusBadge}
              {earlyBadge}
            </div>
            {actions}
          </div>
          <div className="flex items-center gap-2 min-w-0 text-[11px] leading-tight text-stone-600 dark:text-stone-300">
            <span className="truncate min-w-0">✂️ {servicesSummary}</span>
            <span className="hidden sm:inline truncate shrink-0 max-w-[35%] text-stone-500 dark:text-stone-400">
              💈 {apt.barberName}
            </span>
          </div>
        </>
      )}

      {/* ========================= 60 DK: 1 SAATLİK DÜZEN ========================= */}
      {variant === "hour" && (
        <>
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="min-w-0 overflow-hidden">
              <div className={`truncate text-base font-bold leading-tight ${theme.title}`}>
                👤 {apt.customerName}
              </div>
              <div className="mt-1 flex items-center gap-1.5 min-w-0 overflow-hidden">
                <span className="shrink-0 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] leading-none font-black text-amber-700 dark:text-amber-300">
                  ⏱️ {formatDurationLabel(duration)}
                </span>
                {statusBadge}
                {earlyBadge}
              </div>
            </div>
            {actions}
          </div>
          <div className="flex items-center gap-2 min-w-0 rounded-md bg-white/60 dark:bg-white/[0.04] px-2 py-1.5 text-[11px] text-stone-700 dark:text-stone-300">
            <span className="truncate min-w-0 font-semibold">✂️ {servicesSummary}</span>
            <span className="truncate shrink-0 max-w-[30%] text-stone-500 dark:text-stone-400">
              💈 {apt.barberName}
            </span>
            {phoneLink && <span className="ml-auto shrink-0">{phoneLink}</span>}
          </div>
        </>
      )}

      {/* ===================== 90 DK+: VIP / UZUN İŞLEM DÜZENİ ===================== */}
      {variant === "vip" && (
        <>
          {/* 1. Katman: Üst Başlık */}
          <div className="flex items-start justify-between gap-2 min-w-0 shrink-0">
            <div className="min-w-0 overflow-hidden">
              <div className={`truncate text-base sm:text-lg font-bold leading-tight ${theme.title}`}>
                👤 {apt.customerName}
              </div>
              <div className="mt-1 flex items-center gap-1.5 min-w-0 overflow-hidden">
                <span className="shrink-0 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[9px] leading-none font-black text-amber-950 shadow-sm">
                  👑 VIP Paket • {duration} Dk
                </span>
                {statusBadge}
                {earlyBadge}
              </div>
            </div>
            {actions}
          </div>

          {/* 2. Katman: Orta Bilgi Bandı (boşluğu dolduran alan) */}
          <div
            className={`flex-1 min-h-0 flex flex-col justify-center gap-1 rounded-md border px-2.5 py-1.5 overflow-hidden ${theme.infoBox}`}
          >
            <p className="text-[11px] sm:text-xs leading-snug text-stone-800 dark:text-stone-200 line-clamp-2">
              <span className="font-black">✂️ İşlem:</span> {servicesSummary}
            </p>
            <p className="text-[10px] sm:text-[11px] leading-snug text-stone-600 dark:text-stone-400 truncate">
              <span className="font-bold">🕒 Süreç:</span> {apt.time} - {apt.endTime} ({slotCount} Saat
              Dilimi Kapalı) • <span className="font-bold">💈 Koltuk:</span> {apt.barberName}
            </p>
          </div>

          {/* 3. Katman: Alt Bar */}
          <div className="flex items-center gap-1.5 min-w-0 shrink-0 text-stone-700 dark:text-stone-300">
            <div className="min-w-0 truncate">{phoneLink}</div>
            <div className="ml-auto flex items-center gap-1 shrink-0">
              <a
                href={buildWhatsAppUrl(apt.customerPhone, `Merhaba ${apt.customerName}, `)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={stop}
                className={`${BTN_BASE} bg-[#25D366] hover:bg-[#1ebe5b] text-white shadow-sm`}
              >
                💬 WhatsApp Yaz
              </a>
              <a
                href={phoneHref}
                onClick={stop}
                className={`${BTN_BASE} bg-stone-900 hover:bg-stone-800 text-white dark:bg-[#dfc39e] dark:hover:bg-[#e8d1b0] dark:text-[#1a110b] shadow-sm`}
              >
                📞 Hemen Ara
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const TimelineAppointmentCard = memo(TimelineAppointmentCardBase);
export default TimelineAppointmentCard;
