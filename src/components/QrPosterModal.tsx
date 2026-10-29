"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer, Scissors, Camera, Clock, ShieldCheck } from "lucide-react";
import { useBarber } from "@/context/BarberContext";

interface QrPosterModalProps {
  open: boolean;
  onClose: () => void;
}

/** Aynaya asılacak "QR Kod & Afiş" üreticisi — Yazdır / PDF İndir (window.print) */
export default function QrPosterModal({ open, onClose }: QrPosterModalProps) {
  const { currentShop, shopSettings } = useBarber();

  const bookingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?shop=${currentShop.slug}`
      : `http://localhost:3000/?shop=${currentShop.slug}`;

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=10&ecc=M&color=1a110b&bgcolor=fdf8f5&data=${encodeURIComponent(
    bookingUrl
  )}`;

  const initials = currentShop.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm print:static print:bg-transparent print:p-0"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
            className="my-6 w-full max-w-md"
          >
            {/* Toolbar */}
            <div className="mb-3 flex items-center justify-between gap-2 print:hidden">
              <div>
                <h2 className="text-base font-extrabold text-[#fdf8f5]">
                  Dükkan QR Afişi (Ayna Kartı)
                </h2>
                <p className="text-[11px] text-[#e6ccb2]/70">
                  Yazdırıp aynaya veya kasaya asın. PDF için yazıcı olarak
                  &ldquo;PDF olarak kaydet&rdquo; seçin.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] px-3.5 py-2.5 text-xs font-black text-[#1a110b] shadow-lg shadow-[#c88a53]/30 hover:brightness-110"
                >
                  <Printer className="h-4 w-4" />
                  <span>Yazdır / PDF İndir</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c88a53]/30 bg-[#14100d] text-[#e6ccb2] hover:text-[#fdf8f5]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* POSTER */}
            <div className="print-area relative overflow-hidden rounded-[28px] border-2 border-[#c88a53]/70 bg-gradient-to-b from-[#241b16] via-[#16110d] to-[#0d0a08] p-7 text-center shadow-2xl shadow-[#c88a53]/20">
              {/* inner frame */}
              <div className="pointer-events-none absolute inset-3 rounded-[22px] border border-[#e6ccb2]/25" />
              <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-80 -translate-x-1/2 rounded-full bg-[#c88a53]/25 blur-3xl" />

              <div className="relative flex flex-col items-center justify-center print:min-h-[100vh] print:py-16">
                {/* Logo */}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e6ccb2]/60 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/40">
                  <Scissors className="h-8 w-8 -rotate-45 stroke-[2.3]" />
                </div>
                <span className="mt-2 font-mono text-[10px] font-bold tracking-[0.35em] text-[#c88a53]">
                  {initials} • EST. VIP
                </span>

                <h1 className="mt-2 bg-gradient-to-r from-[#fdf8f5] via-[#e6ccb2] to-[#c88a53] bg-clip-text text-2xl font-black uppercase tracking-wider text-transparent">
                  {currentShop.name}
                </h1>
                <p className="mt-0.5 text-[11px] text-[#e6ccb2]/70">
                  {currentShop.subtitle}
                </p>

                <div className="my-5 h-px w-40 bg-gradient-to-r from-transparent via-[#c88a53] to-transparent" />

                <h2 className="text-xl font-black leading-tight text-[#fdf8f5]">
                  Sıra Beklemeyin!
                </h2>
                <p className="mt-1.5 max-w-xs text-sm font-semibold leading-snug text-[#e6ccb2]">
                  Kameranızı Okutun, 10 Saniyede Randevunuzu Alın
                </p>

                {/* QR */}
                <div className="relative mt-5 rounded-3xl border-2 border-[#c88a53] bg-[#fdf8f5] p-3 shadow-xl shadow-[#c88a53]/30">
                  <span className="absolute -left-1 -top-1 h-6 w-6 rounded-tl-2xl border-l-4 border-t-4 border-[#c88a53]" />
                  <span className="absolute -right-1 -top-1 h-6 w-6 rounded-tr-2xl border-r-4 border-t-4 border-[#c88a53]" />
                  <span className="absolute -bottom-1 -left-1 h-6 w-6 rounded-bl-2xl border-b-4 border-l-4 border-[#c88a53]" />
                  <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-br-2xl border-b-4 border-r-4 border-[#c88a53]" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrSrc}
                    alt={`${currentShop.name} randevu QR kodu`}
                    width={220}
                    height={220}
                    className="h-[220px] w-[220px]"
                  />
                </div>

                <div className="mt-4 rounded-full border border-[#c88a53]/45 bg-[#14100d] px-4 py-1.5 font-mono text-[11px] font-bold text-[#e6ccb2]">
                  {bookingUrl.replace(/^https?:\/\//, "")}
                </div>

                <div className="mt-5 grid w-full grid-cols-3 gap-2 text-[10px] font-bold text-[#e6ccb2]">
                  <div className="flex flex-col items-center gap-1 rounded-xl border border-[#c88a53]/30 bg-[#14100d]/80 p-2">
                    <Camera className="h-4 w-4 text-[#c88a53]" />
                    1. Kamerayı Aç
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-xl border border-[#c88a53]/30 bg-[#14100d]/80 p-2">
                    <Scissors className="h-4 w-4 text-[#c88a53]" />
                    2. Usta &amp; Hizmet
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-xl border border-[#c88a53]/30 bg-[#14100d]/80 p-2">
                    <Clock className="h-4 w-4 text-[#c88a53]" />
                    3. Saatini Kap
                  </div>
                </div>

                <p className="mt-5 flex items-center gap-1.5 text-[10px] text-[#e6ccb2]/60">
                  <ShieldCheck className="h-3 w-3 text-[#c88a53]" />
                  {currentShop.district} • {shopSettings.openTime} -{" "}
                  {shopSettings.closeTime} • {currentShop.phone}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
