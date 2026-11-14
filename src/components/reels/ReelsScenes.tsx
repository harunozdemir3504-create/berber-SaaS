"use client";

/**
 * Reels Reklam Stüdyosu — Sahne görselleri (9:16 sahne, 360×640 mantıksal piksel).
 * Her sahne `stage` değerine göre aşama aşama animasyon gösterir; stage, seslendirme
 * ilerlemesiyle sürülür (bkz. reelsScripts.ts → stages).
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Armchair,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Instagram,
  Landmark,
  Lock,
  MessageCircle,
  Phone,
  QrCode,
  Scissors,
  Send,
  Sparkles,
  TrendingUp,
  UserX,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { ReelsAudio } from "@/lib/reelsAudio";
import type { ReelsModeId } from "./reelsScripts";
import { SALES_WHATSAPP_DISPLAY } from "./reelsScripts";

export interface SceneProps {
  stage: number;
  audio: ReelsAudio;
}

const GOLD = "#F59E0B";
const GREEN = "#10B981";

// ============================================================ ortak parçalar

export function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0a0a0e]">
      <motion.div
        className="absolute -left-24 -top-24 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "rgba(245,158,11,0.22)" }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "rgba(16,185,129,0.16)" }}
        animate={{ x: [0, -40, 0], y: [0, -30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      {/* Berber direği şeritleri */}
      {(["left-0", "right-0"] as const).map((side) => (
        <motion.div
          key={side}
          className={`absolute top-0 h-full w-[7px] ${side}`}
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #ef4444 0 14px, #f8fafc 14px 28px, #3b82f6 28px 42px, #f8fafc 42px 56px)",
            backgroundSize: "100% 79px",
            opacity: 0.85,
          }}
          animate={{ backgroundPositionY: [0, 79] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
    </div>
  );
}

/** 3D iPhone: perspektifte yavaşça dönen telefon gövdesi */
function Phone3D({
  children,
  width = 206,
  height = 410,
  tilt = true,
}: {
  children: React.ReactNode;
  width?: number;
  height?: number;
  tilt?: boolean;
}) {
  return (
    <div style={{ perspective: 900 }}>
      <motion.div
        animate={
          tilt
            ? { rotateY: [-17, 11, -17], rotateX: [7, -2, 7], y: [0, -6, 0] }
            : undefined
        }
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{ width, height, transformStyle: "preserve-3d" }}
        className="relative rounded-[36px] bg-gradient-to-br from-zinc-300 via-zinc-500 to-zinc-700 p-[3px] shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9),0_0_40px_rgba(245,158,11,0.18)]"
      >
        {/* yan tuşlar */}
        <div className="absolute -left-[3px] top-20 h-8 w-[3px] rounded-l bg-zinc-400" />
        <div className="absolute -left-[3px] top-32 h-12 w-[3px] rounded-l bg-zinc-400" />
        <div className="absolute -right-[3px] top-28 h-16 w-[3px] rounded-r bg-zinc-400" />
        <div className="relative h-full w-full overflow-hidden rounded-[33px] border-[5px] border-black bg-[#0f0f14]">
          {/* dynamic island */}
          <div className="absolute left-1/2 top-2 z-30 h-[18px] w-[62px] -translate-x-1/2 rounded-full bg-black" />
          {/* cam parlaması */}
          <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-tr from-white/0 via-white/[0.07] to-white/0" />
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function Finger({
  x,
  y,
  delay = 0,
}: {
  x: number;
  y: number;
  delay?: number;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute z-40 text-3xl drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]"
      style={{ left: 0, top: 0 }}
      initial={{ opacity: 0, x: x + 50, y: y + 70, scale: 1 }}
      animate={{
        opacity: [0, 1, 1, 1, 0],
        x: [x + 50, x, x, x, x],
        y: [y + 70, y, y, y, y],
        scale: [1, 1, 0.78, 1, 1],
      }}
      transition={{ delay, duration: 1.1, times: [0, 0.35, 0.55, 0.7, 1] }}
    >
      👆
    </motion.div>
  );
}

function Chip({
  children,
  tone = "gold",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "gold" | "green" | "red" | "white";
  className?: string;
}) {
  const tones = {
    gold: "border-amber-400/60 bg-amber-500/20 text-amber-300",
    green: "border-emerald-400/60 bg-emerald-500/20 text-emerald-300",
    red: "border-rose-400/60 bg-rose-500/20 text-rose-300",
    white: "border-white/30 bg-white/10 text-white",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Deterministik sahte QR deseni (21×21) */
function QrArt({ size = 120, color = "#111" }: { size?: number; color?: string }) {
  const N = 21;
  const cells = useMemo(() => {
    const out: boolean[][] = [];
    let seed = 1337;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const inFinder = (r: number, c: number) =>
      (r < 8 && c < 8) || (r < 8 && c > N - 9) || (r > N - 9 && c < 8);
    for (let r = 0; r < N; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < N; c++) {
        if (inFinder(r, c)) {
          row.push(false);
          continue;
        }
        row.push(rnd() > 0.5);
      }
      out.push(row);
    }
    return out;
  }, []);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} fill={color} />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill={color} />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${N} ${N}`} shapeRendering="crispEdges">
      <rect width={N} height={N} fill="#fff" />
      {cells.map((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={color} /> : null
        )
      )}
      {finder(0, 0)}
      {finder(N - 7, 0)}
      {finder(0, N - 7)}
    </svg>
  );
}

const tr = (n: number) => n.toLocaleString("tr-TR");

// ============================================================ MOD 1

/** M1 · Sahne 1 — Titreyen arama kartı + ❌ */
function M1S1({ stage }: SceneProps) {
  const missed = stage >= 1;
  const foam = [
    { l: 22, t: 120, s: 26, d: 0 },
    { l: 300, t: 150, s: 34, d: 0.4 },
    { l: 40, t: 380, s: 22, d: 0.8 },
    { l: 285, t: 400, s: 28, d: 0.2 },
    { l: 160, t: 95, s: 18, d: 0.6 },
  ];
  return (
    <div className="absolute inset-0">
      {foam.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-white/40 bg-white/15"
          style={{ left: b.l, top: b.t, width: b.s, height: b.s }}
          animate={{ y: [0, -18, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: b.d }}
        />
      ))}

      <div className="absolute left-0 right-0 top-[84px] flex flex-col items-center">
        <Chip tone="gold" className="mb-3">
          🧼 Elin köpüklü · 💈 Müşteri koltukta
        </Chip>

        <div className="relative">
          {/* arkadaki ek aramalar */}
          {[
            { y: -34, s: 0.9, o: 0.55, d: 0.4, n: "Kaan Bey" },
            { y: -62, s: 0.8, o: 0.35, d: 0.8, n: "Serkan" },
          ].map((g) => (
            <motion.div
              key={g.n}
              className="absolute left-1/2 w-[270px] -translate-x-1/2 rounded-3xl border border-white/10 bg-zinc-800/90 p-4"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: g.o, y: g.y, scale: g.s }}
              transition={{ delay: g.d, duration: 0.4 }}
              style={{ height: 150 }}
            >
              <span className="text-xs font-bold text-white/60">📞 {g.n} arıyor…</span>
            </motion.div>
          ))}

          <motion.div
            animate={
              missed
                ? { x: 0, rotate: 0, scale: 0.96 }
                : {
                    x: [0, -8, 8, -7, 7, -4, 4, 0],
                    rotate: [0, -3, 3, -2.5, 2.5, -1, 1, 0],
                  }
            }
            transition={
              missed
                ? { duration: 0.25 }
                : { duration: 0.55, repeat: Infinity, repeatDelay: 0.1 }
            }
            className={`relative w-[290px] overflow-hidden rounded-[28px] border p-5 shadow-2xl ${
              missed
                ? "border-rose-500/60 bg-zinc-900 opacity-80"
                : "border-white/20 bg-gradient-to-b from-zinc-700 to-zinc-900"
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              <Phone className="h-3.5 w-3.5" /> Gelen Arama · Randevu Hattı
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-2xl font-black text-black">
                M
              </div>
              <div>
                <div className="text-xl font-black text-white">Müşteri Murat</div>
                <div className="text-xs text-white/60">0532 ••• •• 47 · Randevu istiyor</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 shadow-lg shadow-rose-500/40">
                <Phone className="h-5 w-5 rotate-[135deg] text-white" />
              </div>
              <span className="text-[11px] font-bold text-white/50">
                {missed ? "Cevapsız" : "Çalıyor…"}
              </span>
              <motion.div
                animate={missed ? {} : { scale: [1, 1.18, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40"
              >
                <Phone className="h-5 w-5 text-white" />
              </motion.div>
            </div>
            {missed && (
              <div className="pointer-events-none absolute inset-0 bg-rose-950/50" />
            )}
          </motion.div>

          {missed && (
            <motion.div
              initial={{ scale: 0, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 14 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-[150px] leading-none drop-shadow-[0_0_30px_rgba(244,63,94,0.9)]">
                ❌
              </div>
            </motion.div>
          )}
        </div>

        <motion.div
          className="mt-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Chip tone="red">
            <Ban className="h-3.5 w-3.5" /> 17 cevapsız arama · tıraş yarım kaldı
          </Chip>
        </motion.div>
      </div>
    </div>
  );
}

/** M1 · Sahne 2 — 3D iPhone: kendi kendine seçilen saat + yeşil onay */
function M1S2({ stage }: SceneProps) {
  const slots = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30"];
  const [picked, setPicked] = useState(false);
  useEffect(() => {
    if (stage >= 1) {
      const t = window.setTimeout(() => setPicked(true), 900);
      return () => window.clearTimeout(t);
    }
  }, [stage]);
  const confirmed = stage >= 2;
  return (
    <div className="absolute inset-0">
      <div className="absolute left-0 right-0 top-[70px] flex justify-center">
        <div className="relative">
          <Phone3D>
            <div className="flex h-full flex-col px-3 pb-3 pt-9">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  VIP Randevu
                </span>
                <Scissors className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="mt-1 text-[15px] font-black text-white">Randevu Al</div>

              {stage < 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 space-y-2"
                >
                  <div className="flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-500/10 px-2.5 py-2 text-[11px] font-bold text-rose-300">
                    <span className="line-through">📲 Uygulama indir</span>
                    <X className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-500/10 px-2.5 py-2 text-[11px] font-bold text-rose-300">
                    <span className="line-through">✉️ SMS masrafı</span>
                    <X className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-2 text-[11px] font-black text-emerald-300">
                    <MessageCircle className="h-4 w-4" /> WhatsApp ile randevu
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/15 px-2.5 py-2 text-[11px] font-black text-amber-300">
                    <QrCode className="h-4 w-4" /> QR kod ile randevu
                  </div>
                </motion.div>
              )}

              {stage >= 1 && !confirmed && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">
                    Bugün · Saat seç
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {slots.map((s) => {
                      const isPick = picked && s === "14:30";
                      return (
                        <motion.div
                          key={s}
                          animate={isPick ? { scale: [1, 1.12, 1.04] } : {}}
                          className={`rounded-lg border py-2 text-center text-[13px] font-black ${
                            isPick
                              ? "border-amber-300 bg-amber-500 text-black shadow-lg shadow-amber-500/40"
                              : "border-white/15 bg-white/5 text-white/80"
                          }`}
                        >
                          {s}
                        </motion.div>
                      );
                    })}
                  </div>
                  <motion.div
                    animate={picked ? { opacity: 1 } : { opacity: 0.4 }}
                    className="mt-3 rounded-xl bg-emerald-500 py-2.5 text-center text-[12px] font-black text-white"
                  >
                    Randevuyu Onayla
                  </motion.div>
                </motion.div>
              )}

              {confirmed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 flex flex-1 flex-col items-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.25, 1] }}
                    transition={{ type: "spring", stiffness: 300, damping: 12 }}
                    className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.8)]"
                  >
                    <Check className="h-14 w-14 stroke-[4] text-white" />
                  </motion.div>
                  <div className="mt-3 text-[16px] font-black text-emerald-400">
                    ONAYLANDI!
                  </div>
                  <div className="mt-1 text-center text-[11px] text-white/70">
                    Bugün · 14:30
                    <br />
                    Usta Kemal · Saç + Sakal
                  </div>
                </motion.div>
              )}
            </div>
          </Phone3D>

          {stage >= 1 && !picked && <Finger x={128} y={205} delay={0.1} />}

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute -left-14 top-10 rotate-[-8deg]"
          >
            <Chip tone="red">📲 İndirme yok</Chip>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="absolute -right-14 top-24 rotate-[7deg]"
          >
            <Chip tone="green">SMS ₺0</Chip>
          </motion.div>
          {stage >= 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -right-12 bottom-24 rotate-[6deg]"
            >
              <Chip tone="gold">
                <Zap className="h-3.5 w-3.5" /> 10 saniye
              </Chip>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

/** M1 · Sahne 3 — Canlı 4.850 ₺ ciro sayacı + WhatsApp CTA */
function M1S3({ stage, audio }: SceneProps) {
  const TARGET = 4850;
  const [val, setVal] = useState(0);
  const audioRef = useRef(audio);
  audioRef.current = audio;

  useEffect(() => {
    const DUR = 3400;
    const t0 = performance.now();
    let raf = 0;
    let lastStep = 0;
    let done = false;
    const loop = (now: number) => {
      const p = Math.min(1, (now - t0) / DUR);
      const eased = 1 - Math.pow(1 - p, 2.2);
      const v = Math.round(eased * TARGET);
      setVal(v);
      const step = Math.floor(v / 250);
      if (step > lastStep) {
        lastStep = step;
        audioRef.current.play("cashTick");
      }
      if (p < 1) {
        raf = requestAnimationFrame(loop);
      } else if (!done) {
        done = true;
        setVal(TARGET);
        audioRef.current.play("cashRegister");
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const rows = [
    { n: "Saç + Sakal", p: 450, at: 400 },
    { n: "Cilt Bakımı", p: 300, at: 1100 },
    { n: "Saç Kesimi", p: 350, at: 1800 },
    { n: "VIP Paket", p: 650, at: 2500 },
  ];
  const [rowCount, setRowCount] = useState(0);
  useEffect(() => {
    const ts = rows.map((r, i) => window.setTimeout(() => setRowCount(i + 1), r.at));
    return () => ts.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pct = val / TARGET;

  return (
    <div className="absolute inset-0">
      <div className="absolute left-0 right-0 top-[78px] flex flex-col items-center px-6">
        <div className="w-full rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-zinc-800/95 to-zinc-950/95 p-4 shadow-[0_0_50px_rgba(16,185,129,0.25)]">
          <div className="flex items-center justify-between">
            <Chip tone="green">
              <motion.span
                className="h-2 w-2 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
              CANLI · Bugünkü Ciro
            </Chip>
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-center gap-1">
            <span className="text-[56px] font-black leading-none tabular-nums text-emerald-400 drop-shadow-[0_0_18px_rgba(16,185,129,0.7)]">
              {tr(val)}
            </span>
            <span className="text-3xl font-black text-emerald-300">₺</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400"
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          <div className="mt-3 space-y-1.5">
            {rows.slice(0, rowCount).map((r) => (
              <motion.div
                key={r.n}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-white"
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {r.n}
                </span>
                <span className="text-amber-300">+{r.p} ₺</span>
              </motion.div>
            ))}
          </div>
        </div>

        {stage >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="mt-4 w-full rounded-3xl border border-emerald-400/60 bg-gradient-to-b from-emerald-600 to-emerald-800 p-4 text-center shadow-[0_0_40px_rgba(16,185,129,0.5)]"
          >
            <div className="text-[11px] font-black uppercase tracking-widest text-emerald-100">
              7 Gün Ücretsiz Dene
            </div>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-white py-2.5 text-[15px] font-black text-emerald-700"
            >
              <MessageCircle className="h-5 w-5" /> WhatsApp&apos;tan Mesaj At
            </motion.div>
            <div className="mt-2 text-xs font-bold text-emerald-50">
              ⏱ 2 dakikada kuruyoruz · {SALES_WHATSAPP_DISPLAY}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ============================================================ MOD 2

/** M2 · Sahne 1 — Gelmeyen müşteriler + boş koltuk */
function M2S1({ stage }: SceneProps) {
  const rows = [
    { t: "13:00", n: "Ali Y.", ok: true },
    { t: "14:00", n: "Mehmet K.", ok: false, stageNeeded: 1 },
    { t: "15:00", n: "Burak D.", ok: false, stageNeeded: 1 },
    { t: "16:00", n: "Emre S.", ok: false, stageNeeded: 2 },
  ];
  return (
    <div className="absolute inset-0">
      <div className="absolute left-0 right-0 top-[80px] px-6">
        <div className="rounded-3xl border border-white/15 bg-zinc-900/90 p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-white/70">
              📅 Bugünkü Randevular
            </span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3 space-y-2">
            {rows.map((r, i) => {
              const noShow = !r.ok && stage >= (r.stageNeeded ?? 1);
              return (
                <motion.div
                  key={r.t}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.12 }}
                  className={`relative flex items-center justify-between overflow-hidden rounded-xl border px-3 py-2.5 ${
                    r.ok
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : noShow
                      ? "border-rose-500/60 bg-rose-500/15"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-black text-amber-300">{r.t}</span>
                    <span className="text-sm font-bold text-white">{r.n}</span>
                  </div>
                  {r.ok ? (
                    <span className="text-[11px] font-black text-emerald-400">✓ GELDİ</span>
                  ) : noShow ? (
                    <motion.span
                      initial={{ scale: 3, rotate: -20, opacity: 0 }}
                      animate={{ scale: 1, rotate: -6, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 420, damping: 16 }}
                      className="rounded-md border-2 border-rose-500 px-2 py-0.5 text-[12px] font-black text-rose-400"
                    >
                      GELMEDİ
                    </motion.span>
                  ) : (
                    <motion.span
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="text-base"
                    >
                      ⏳
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {stage >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex flex-col items-center"
          >
            <motion.div
              animate={{ rotate: [-3, 3, -3] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-rose-500/70 bg-rose-950/40"
            >
              <Armchair className="h-14 w-14 text-rose-300/80" />
            </motion.div>
            <div className="mt-2 text-lg font-black uppercase text-rose-400">
              Boş koltuk = Kayıp kazanç
            </div>
            <div className="text-3xl font-black tabular-nums text-rose-500">−1.350 ₺</div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/** M2 · Sahne 2 — Tek tuşla kara liste + otomatik IBAN kapora */
function M2S2({ stage }: SceneProps) {
  const banned = stage >= 1;
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    if (stage >= 1) {
      const t = window.setTimeout(() => setPressed(true), 50);
      return () => window.clearTimeout(t);
    }
  }, [stage]);
  return (
    <div className="absolute inset-0">
      <div className="absolute left-0 right-0 top-[76px] px-6">
        <Chip tone="gold" className="mb-2">
          <Crown className="h-3.5 w-3.5" /> VIP Sistem · Kara Liste Ağı
        </Chip>

        <div className="relative">
          <motion.div
            animate={banned ? { borderColor: "rgba(244,63,94,0.8)" } : {}}
            className="relative overflow-hidden rounded-3xl border border-white/20 bg-zinc-900/95 p-4 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-black ${
                  banned ? "bg-rose-600 text-white" : "bg-amber-500 text-black"
                }`}
              >
                {banned ? <UserX className="h-6 w-6" /> : "M"}
              </div>
              <div className="flex-1">
                <div className="text-lg font-black text-white">Mehmet K.</div>
                <div className="text-[11px] text-white/60">0532 ••• •• 11 · 3 kez gelmedi</div>
              </div>
            </div>
            <motion.div
              animate={
                pressed
                  ? { scale: [1, 0.93, 1], backgroundColor: "#7f1d1d" }
                  : { scale: 1 }
              }
              className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 text-sm font-black text-white shadow-lg shadow-rose-600/40"
            >
              <Ban className="h-5 w-5" />
              {banned ? "KARA LİSTEDE" : "Kara Listeye Al"}
            </motion.div>
            {banned && (
              <motion.div
                initial={{ scale: 4, rotate: -25, opacity: 0 }}
                animate={{ scale: 1, rotate: -9, opacity: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 15 }}
                className="absolute right-3 top-3 rounded-lg border-[3px] border-rose-500 bg-black/70 px-2.5 py-1 text-base font-black text-rose-500"
              >
                KARA LİSTE
              </motion.div>
            )}
          </motion.div>
          {!banned && <Finger x={140} y={78} delay={0.6} />}
        </div>

        {stage >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-3"
          >
            <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-300">
              <Lock className="h-4 w-4" /> Yeni randevu talebi · Mehmet K.
            </div>
            <div className="mt-1 text-[12px] font-bold text-white">
              ⚠️ Kara listede! Otomatik kapora şartı devrede
            </div>
          </motion.div>
        )}

        {stage >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="mt-3 rounded-2xl border border-emerald-400/60 bg-gradient-to-b from-emerald-900/70 to-zinc-900 p-3.5 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          >
            <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-300">
              <Landmark className="h-4 w-4" /> IBAN Kapora Şartı
            </div>
            <div className="mt-1.5 font-mono text-[13px] font-bold tracking-wide text-white">
              TR12 0006 2000 •••• •••• 7890
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-white/60">Gerekli kapora</span>
              <span className="text-xl font-black text-amber-300">150 ₺</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/** M2 · Sahne 3 — Yedek liste → WhatsApp → koltuk doldu */
function M2S3({ stage }: SceneProps) {
  const sent = stage >= 1;
  const filled = stage >= 2;
  const [reply, setReply] = useState(false);
  useEffect(() => {
    if (sent) {
      const t = window.setTimeout(() => setReply(true), 800);
      return () => window.clearTimeout(t);
    }
  }, [sent]);
  const waiters = ["Burak D.", "Emre S.", "Can T."];
  return (
    <div className="absolute inset-0">
      <div className="absolute left-0 right-0 top-[76px] px-6">
        <motion.div
          animate={
            filled
              ? { borderColor: "rgba(16,185,129,0.9)" }
              : { borderColor: ["rgba(245,158,11,0.9)", "rgba(245,158,11,0.2)", "rgba(245,158,11,0.9)"] }
          }
          transition={filled ? {} : { duration: 1.2, repeat: Infinity }}
          className={`flex items-center gap-3 rounded-3xl border-2 p-3.5 ${
            filled ? "bg-emerald-950/60" : "bg-zinc-900/90"
          }`}
        >
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
              filled ? "bg-emerald-500 text-white" : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {filled ? <CheckCircle2 className="h-8 w-8" /> : <Armchair className="h-8 w-8" />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-white/70">16:00 · Koltuk 2</div>
            <div
              className={`text-xl font-black ${filled ? "text-emerald-400" : "text-amber-300"}`}
            >
              {filled ? "DOLDU · Burak D." : "BOŞ KOLTUK!"}
            </div>
          </div>
          {filled && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 12 }}
            >
              <Chip tone="green">⏱ 1 dk</Chip>
            </motion.div>
          )}
        </motion.div>

        <div className="mt-3 rounded-3xl border border-white/15 bg-zinc-900/90 p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-white/60">
            <Users className="h-4 w-4 text-amber-400" /> Yedek Liste
          </div>
          <div className="mt-2 space-y-1.5">
            {waiters.map((w, i) => (
              <div
                key={w}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                  i === 0 && sent
                    ? "border-emerald-400/60 bg-emerald-500/15"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <span className="text-sm font-bold text-white">{w}</span>
                <motion.span
                  animate={i === 0 && !sent ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-[11px] font-black text-white"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {i === 0 && sent ? "Gönderildi" : "WhatsApp"}
                </motion.span>
              </div>
            ))}
          </div>
          {!sent && <Finger x={250} y={-84} delay={0.5} />}
        </div>

        {sent && (
          <div className="mt-3 space-y-2">
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              className="ml-auto max-w-[240px] rounded-2xl rounded-br-sm bg-emerald-600 px-3 py-2 text-[12px] font-bold text-white shadow-lg"
            >
              Merhaba Burak, 16:00 boşaldı 💈 Gelir misin? <Send className="ml-1 inline h-3 w-3" />
            </motion.div>
            {reply && (
              <motion.div
                initial={{ opacity: 0, x: -40, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                className="max-w-[200px] rounded-2xl rounded-bl-sm bg-zinc-700 px-3 py-2 text-[12px] font-bold text-white shadow-lg"
              >
                Geliyorum usta! 👍
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================ MOD 3

/** M3 · Sahne 1 — VIP prestij tacı */
function M3S1({ stage }: SceneProps) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        l: 20 + ((i * 53) % 320),
        t: 110 + ((i * 97) % 360),
        s: 8 + ((i * 7) % 14),
        d: (i % 6) * 0.3,
      })),
    []
  );
  return (
    <div className="absolute inset-0">
      {sparks.map((s, i) => (
        <motion.div
          key={i}
          className="absolute text-amber-300"
          style={{ left: s.l, top: s.t }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.2, 0.4], rotate: [0, 90, 180] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: s.d }}
        >
          <Sparkles style={{ width: s.s + 8, height: s.s + 8 }} />
        </motion.div>
      ))}

      <div className="absolute left-0 right-0 top-[110px] flex flex-col items-center">
        <motion.div
          initial={{ y: -80, opacity: 0, scale: 0.4, rotate: -20 }}
          animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-full bg-amber-500/40 blur-3xl" />
          <Crown className="relative h-40 w-40 fill-amber-400 stroke-amber-200 text-amber-300 drop-shadow-[0_0_30px_rgba(245,158,11,0.9)]" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 250, damping: 12 }}
          className="mt-2 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 bg-clip-text text-[92px] font-black leading-none tracking-tighter text-transparent drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]"
        >
          VIP
        </motion.div>

        {stage >= 1 && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            className="mt-1 flex items-center gap-2 rounded-full border border-amber-300/70 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 px-6 py-2 text-xl font-black uppercase tracking-[0.3em] text-black shadow-[0_0_30px_rgba(245,158,11,0.6)]"
          >
            <Scissors className="h-5 w-5" /> Prestij
          </motion.div>
        )}

        {stage >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, scale: [1, 1.06, 1] }}
            transition={{ scale: { duration: 0.9, repeat: Infinity } }}
            className="mt-5 text-2xl font-black uppercase text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.8)]"
          >
            Hazır mısın ustam? 💈
          </motion.div>
        )}
      </div>
    </div>
  );
}

/** M3 · Sahne 2 — Ayna + QR tarama + usta / saat listesi */
function M3S2({ stage }: SceneProps) {
  const barbers = [
    { n: "Kemal Usta", s: ["14:30", "15:00", "16:30"], c: "from-amber-400 to-orange-600" },
    { n: "Barış Usta", s: ["13:00", "15:30"], c: "from-sky-400 to-indigo-600" },
    { n: "Eren Usta", s: ["14:00", "17:00", "17:30"], c: "from-emerald-400 to-teal-600" },
  ];
  const scanning = stage === 1;
  const listed = stage >= 2;
  return (
    <div className="absolute inset-0">
      {/* AYNA */}
      <motion.div
        animate={
          stage >= 1
            ? { scale: 0.62, y: -92, opacity: 0.85 }
            : { scale: 1, y: 0, opacity: 1 }
        }
        transition={{ duration: 0.5 }}
        className="absolute left-1/2 top-[84px] -ml-[112px] h-[400px] w-[224px]"
        style={{ transformOrigin: "50% 0%" }}
      >
        <div className="relative h-full w-full rounded-[110px] border-[8px] border-amber-500 bg-gradient-to-br from-slate-200/25 via-slate-500/20 to-slate-900/60 p-4 shadow-[0_0_50px_rgba(245,158,11,0.35),inset_0_0_40px_rgba(255,255,255,0.12)]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[100px]">
            <motion.div
              className="absolute -inset-y-10 w-14 rotate-[22deg] bg-white/20 blur-md"
              animate={{ x: [-90, 300] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.8 }}
            />
          </div>
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="rounded-2xl bg-white p-2 shadow-xl">
              <QrArt size={118} />
            </div>
            <div className="rounded-full bg-amber-500 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-black">
              Randevu için okut
            </div>
          </div>
        </div>
      </motion.div>

      {/* TELEFON */}
      {stage >= 1 && (
        <motion.div
          initial={{ y: 380, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 18 }}
          className="absolute left-0 right-0 top-[196px] flex justify-center"
        >
          <Phone3D width={214} height={420}>
            <div className="relative h-full w-full">
              {scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950">
                  <div className="relative rounded-2xl bg-white p-2">
                    <QrArt size={104} />
                    <motion.div
                      className="absolute inset-x-0 h-1 rounded bg-emerald-400 shadow-[0_0_14px_3px_rgba(16,185,129,0.9)]"
                      animate={{ top: ["6%", "92%", "6%"] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                    />
                    {[
                      "-left-2 -top-2 border-l-4 border-t-4",
                      "-right-2 -top-2 border-r-4 border-t-4",
                      "-left-2 -bottom-2 border-l-4 border-b-4",
                      "-right-2 -bottom-2 border-r-4 border-b-4",
                    ].map((c) => (
                      <div key={c} className={`absolute h-5 w-5 border-emerald-400 ${c}`} />
                    ))}
                  </div>
                  <div className="mt-4 text-[11px] font-black uppercase tracking-wider text-emerald-400">
                    QR okunuyor…
                  </div>
                </div>
              )}
              {listed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-full flex-col px-3 pb-3 pt-9"
                >
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    VIP Salon
                  </div>
                  <div className="text-[14px] font-black text-white">Ustalarımız & Boş Saatler</div>
                  <div className="mt-2 space-y-2">
                    {barbers.map((b, i) => (
                      <motion.div
                        key={b.n}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.12 + i * 0.15 }}
                        className="rounded-xl border border-white/10 bg-white/[0.06] p-2"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${b.c} text-[11px] font-black text-white`}
                          >
                            {b.n[0]}
                          </div>
                          <span className="text-[12px] font-black text-white">{b.n}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {b.s.map((s) => (
                            <span
                              key={s}
                              className="rounded-md border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-black text-emerald-300"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </Phone3D>
        </motion.div>
      )}
    </div>
  );
}

/** M3 · Sahne 3 — 1 tıraş = 1 ay + ücretsiz deneme CTA */
function M3S3({ stage }: SceneProps) {
  return (
    <div className="absolute inset-0">
      <div className="absolute left-0 right-0 top-[76px] flex flex-col items-center px-6">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-sm font-black uppercase tracking-[0.3em] text-white/70">
            Ayda sadece
          </div>
          <div className="mt-1 flex items-center justify-center gap-3">
            <motion.div
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: -6 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 12 }}
              className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-500/15 px-4 py-3"
            >
              <Scissors className="h-8 w-8 text-amber-300" />
              <span className="text-3xl font-black text-amber-300">1 TIRAŞ</span>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-1 text-xl font-black uppercase text-white"
          >
            parası = 1 ay VIP sistem
          </motion.div>
        </motion.div>

        {stage >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 70, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 15 }}
            className="relative mt-4"
          >
            <Phone3D width={150} height={230}>
              <div className="flex h-full flex-col items-center px-2 pt-9">
                <Scissors className="h-6 w-6 text-amber-400" />
                <div className="mt-1 text-[11px] font-black text-white">TÜM DÜKKAN</div>
                <div className="mt-2 grid w-full grid-cols-2 gap-1">
                  {["Randevu", "Ciro", "Kara Liste", "QR"].map((l) => (
                    <div
                      key={l}
                      className="rounded-md border border-amber-400/40 bg-amber-500/15 py-1.5 text-center text-[9px] font-black text-amber-300"
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <div className="mt-2 rounded-md bg-emerald-500 px-2 py-1 text-[9px] font-black text-white">
                  ✓ Cebinde
                </div>
              </div>
            </Phone3D>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="absolute -right-24 top-6 rotate-[8deg]"
            >
              <Chip tone="green">Cebinde 📱</Chip>
            </motion.div>
          </motion.div>
        )}

        {stage >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-6 right-6 top-[318px]"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 py-2 text-center text-xl font-black uppercase tracking-wider text-black shadow-[0_0_30px_rgba(245,158,11,0.7)]"
            >
              🎁 Ücretsiz Deneme
            </motion.div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 py-2.5 text-[13px] font-black text-white">
                <Instagram className="h-4 w-4" /> DM At
              </div>
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-[13px] font-black text-white">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ============================================================ kayıt defteri

const SCENES: Record<ReelsModeId, React.ComponentType<SceneProps>[]> = {
  1: [M1S1, M1S2, M1S3],
  2: [M2S1, M2S2, M2S3],
  3: [M3S1, M3S2, M3S3],
};

export function ReelsScene({
  mode,
  sceneIndex,
  stage,
  audio,
}: {
  mode: ReelsModeId;
  sceneIndex: number;
  stage: number;
  audio: ReelsAudio;
}) {
  const C = SCENES[mode][sceneIndex];
  return <C stage={stage} audio={audio} />;
}

export const REELS_ACCENT = { GOLD, GREEN };
