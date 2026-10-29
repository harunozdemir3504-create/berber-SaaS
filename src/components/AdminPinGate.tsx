"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, KeyRound, Scissors, ShieldCheck, Delete } from "lucide-react";
import { useBarber } from "@/context/BarberContext";

const sessionKey = (slug: string) => `vip_barber_admin_unlocked_${slug}`;

/**
 * Salon Yönetici Girişi (4 Haneli PIN) — /admin?shop=[slug] sayfasını korur.
 * Kilit durumu sekme oturumu boyunca (sessionStorage) dükkan bazında hatırlanır.
 */
export default function AdminPinGate({ children }: { children: React.ReactNode }) {
  const { currentShop, hydrated } = useBarber();
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [shake, setShake] = useState<number>(0);

  const correctPin = currentShop.adminPin || "1234";

  useEffect(() => {
    if (!hydrated) return;
    try {
      setUnlocked(sessionStorage.getItem(sessionKey(currentShop.slug)) === "1");
    } catch {
      setUnlocked(false);
    }
    setPin("");
    setError("");
    setChecked(true);
  }, [hydrated, currentShop.slug]);

  const tryUnlock = (value: string) => {
    if (value === correctPin) {
      try {
        sessionStorage.setItem(sessionKey(currentShop.slug), "1");
      } catch {
        // ignore
      }
      setUnlocked(true);
      setError("");
    } else {
      setError("Hatalı PIN kodu. Lütfen tekrar deneyin.");
      setShake((s) => s + 1);
      setPin("");
    }
  };

  const pressDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) {
      setTimeout(() => tryUnlock(next), 120);
    }
  };

  if (!hydrated || !checked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-xs text-[#e6ccb2]/60">
        Yükleniyor...
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="relative mx-auto max-w-sm px-4 pb-28 pt-12 sm:pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 left-1/2 -z-10 h-64 w-full -translate-x-1/2 rounded-full bg-gradient-to-r from-[#b47b48]/25 via-[#c88a53]/20 to-[#9a6334]/25 blur-3xl"
      />
      <motion.div
        key={shake}
        initial={shake ? { x: 0 } : { opacity: 0, y: 16 }}
        animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : { opacity: 1, y: 0 }}
        transition={{ duration: shake ? 0.35 : 0.25 }}
        className="overflow-hidden rounded-3xl border border-[#e6ccb2]/50 bg-gradient-to-b from-[#241b16] via-[#1c1613] to-[#14100d] p-7 shadow-2xl shadow-black/80"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e6ccb2]/50 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/30">
          <Scissors className="h-8 w-8 -rotate-45 stroke-[2.3]" />
        </div>

        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6ccb2]/40 bg-[#c88a53]/20 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#e6ccb2]">
            <Lock className="h-3 w-3 text-[#c88a53]" />
            {currentShop.name}
          </span>
          <h1 className="mt-2.5 text-xl font-extrabold text-[#fdf8f5]">
            Salon Yönetici Girişi
          </h1>
          <p className="mt-1 text-xs text-[#e6ccb2]/75">
            Patron paneline erişmek için 4 haneli PIN kodunuzu girin.
          </p>
        </div>

        {/* PIN dots */}
        <div className="mt-6 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded-full border transition ${
                i < pin.length
                  ? "border-[#e6ccb2] bg-gradient-to-r from-[#b47b48] to-[#c88a53] shadow-md shadow-[#c88a53]/40"
                  : "border-[#c88a53]/45 bg-[#14100d]"
              }`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => pressDigit(d)}
              className="rounded-2xl border border-[#c88a53]/25 bg-[#14100d] py-3.5 font-mono text-lg font-black text-[#e6ccb2] transition hover:border-[#c88a53] hover:bg-[#241b16] hover:text-[#fdf8f5] active:scale-95"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => pressDigit("0")}
            className="rounded-2xl border border-[#c88a53]/25 bg-[#14100d] py-3.5 font-mono text-lg font-black text-[#e6ccb2] transition hover:border-[#c88a53] hover:bg-[#241b16] hover:text-[#fdf8f5] active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="flex items-center justify-center rounded-2xl border border-[#c88a53]/25 bg-[#14100d] text-[#e6ccb2] transition hover:border-[#c88a53] active:scale-95"
            aria-label="Sil"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/30 p-2.5 text-center text-xs font-bold text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-[#c88a53]/30 bg-[#14100d] px-3 py-2 text-[11px] text-[#e6ccb2]/80">
          <KeyRound className="h-3.5 w-3.5 text-[#c88a53]" />
          <span>
            Demo PIN: <strong className="font-mono text-[#fdf8f5]">1234</strong>
          </span>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1 text-[10px] text-[#e6ccb2]/50">
          <ShieldCheck className="h-3 w-3" />
          PIN&apos;i panel içinden &ldquo;4. Saatler, Mola &amp; Kapora&rdquo; sekmesinde değiştirebilirsiniz.
        </p>
      </motion.div>
    </div>
  );
}

export function lockAdminSession(slug: string) {
  try {
    sessionStorage.removeItem(sessionKey(slug));
  } catch {
    // ignore
  }
}
