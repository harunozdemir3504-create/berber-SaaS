"use client";

/**
 * 🎬 Tam Otomatik Sesli Reels Reklam Stüdyosu (9:16)
 *
 * - Türkçe TTS (speechSynthesis, tr-TR, rate 1.08, pitch 0.92) ile sahne metinlerini okur.
 * - Web Audio API ile üretilen ses efektleri (ringtone, buzzer, ding, kasa).
 * - CapCut/TikTok tarzı kelime kelime patlayan altyazılar.
 * - 3 hazır senaryo + tam ekran "Kayıt Modu" (3-2-1 geri sayım).
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clapperboard,
  Maximize,
  Play,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  ReelsAudio,
  getTurkishVoices,
  onVoicesReady,
  pickBestVoice,
  ttsSupported,
} from "@/lib/reelsAudio";
import { SITE_DOMAIN } from "@/lib/siteConfig";
import {
  REELS_SCRIPTS,
  buildSpeech,
  chunkWords,
  estimateSpeechMs,
  estimateWordIndex,
  tokenize,
  type ReelsModeId,
  type ReelsSceneDef,
} from "./reels/reelsScripts";
import { Backdrop, ReelsScene } from "./reels/ReelsScenes";

const STAGE_W = 360;
const STAGE_H = 640;
const TTS_RATE = 1.08;
const TTS_PITCH = 0.92;
const SCENE_TAIL_MS = 450;
const GOLD = "#F59E0B";
const GREEN = "#10B981";

type Status = "idle" | "countdown" | "playing" | "ended";

const OUTLINE_SHADOW = [
  "-3px -3px 0 #000",
  "3px -3px 0 #000",
  "-3px 3px 0 #000",
  "3px 3px 0 #000",
  "0 -3px 0 #000",
  "0 3px 0 #000",
  "-3px 0 0 #000",
  "3px 0 0 #000",
  "0 6px 0 #000",
  "0 8px 14px rgba(0,0,0,0.75)",
].join(", ");

// ------------------------------------------------------------------ altyazı

function CapCutSubtitles({
  sceneKey,
  text,
  active,
}: {
  sceneKey: string;
  text: string;
  active: number;
}) {
  const words = useMemo(() => tokenize(text), [text]);
  const chunks = useMemo(() => chunkWords(words, 3), [words]);
  if (active < 0) return null;
  const ci = Math.max(
    0,
    chunks.findIndex((c) => active >= c.from && active <= c.to)
  );
  const chunk = chunks[ci];
  if (!chunk) return null;
  return (
    <motion.div
      key={`${sceneKey}-${ci}`}
      initial={{ scale: 0.7, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 520, damping: 22 }}
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-4 text-center"
    >
      {words.slice(chunk.from, chunk.to + 1).map((w, k) => {
        const gi = chunk.from + k;
        const isActive = gi === active;
        const color = isActive ? (gi % 2 === 0 ? GOLD : GREEN) : "#ffffff";
        return (
          <motion.span
            key={gi}
            animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -3 : 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 16 }}
            className={`inline-block text-2xl font-black uppercase leading-[1.15] tracking-tight ${
              isActive ? "scale-110" : ""
            }`}
            style={{ color, textShadow: OUTLINE_SHADOW }}
          >
            {w.text}
          </motion.span>
        );
      })}
    </motion.div>
  );
}

// ------------------------------------------------------------------ stüdyo

export default function ReelsAdStudio({
  onClose,
  initialMode = 1,
}: {
  onClose?: () => void;
  initialMode?: ReelsModeId;
}) {
  const [mode, setMode] = useState<ReelsModeId>(initialMode);
  const [status, setStatus] = useState<Status>("idle");
  const [recordMode, setRecordMode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [activeWord, setActiveWord] = useState(-1);
  const [stage, setStage] = useState(0);
  const [muted, setMuted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [scale, setScale] = useState(1);
  const [progress, setProgress] = useState(0);

  const script = useMemo(
    () => REELS_SCRIPTS.find((s) => s.id === mode) ?? REELS_SCRIPTS[0],
    [mode]
  );

  const audioRef = useRef<ReelsAudio>(new ReelsAudio());
  const runIdRef = useRef(0);
  const mutedRef = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recordRef = useRef(false);
  const fsRequestedRef = useRef(false);

  // ---- Türkçe sesleri yükle
  useEffect(() => {
    return onVoicesReady(() => {
      const list = getTurkishVoices();
      setVoices(list);
      setVoiceURI((prev) => prev || pickBestVoice(list)?.voiceURI || "");
    });
  }, []);

  useEffect(() => {
    voiceRef.current = pickBestVoice(voices, voiceURI);
  }, [voices, voiceURI]);

  useEffect(() => {
    mutedRef.current = muted;
    audioRef.current.setMuted(muted);
    if (muted && ttsSupported()) window.speechSynthesis.cancel();
  }, [muted]);

  useEffect(() => {
    recordRef.current = recordMode;
  }, [recordMode]);

  // ---- 9:16 sahneyi ekrana sığdır
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (recordMode) {
        setScale(Math.min(vw / STAGE_W, vh / STAGE_H));
      } else {
        const availW = Math.min(vw - 32, 420);
        const availH = Math.max(420, vh - (vw < 900 ? 330 : 150));
        setScale(Math.min(availW / STAGE_W, availH / STAGE_H, 1.25));
      }
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [recordMode]);

  // ---- yardımcılar
  const cancelSpeech = useCallback(() => {
    if (ttsSupported()) window.speechSynthesis.cancel();
  }, []);

  const exitBrowserFullscreen = useCallback(() => {
    if (fsRequestedRef.current && document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => {});
    }
    fsRequestedRef.current = false;
  }, []);

  const stopAll = useCallback(() => {
    runIdRef.current++;
    cancelSpeech();
    setStatus("idle");
    setCountdown(0);
    setActiveWord(-1);
    setStage(0);
    setSceneIdx(0);
    setProgress(0);
  }, [cancelSpeech]);

  const leaveRecordMode = useCallback(() => {
    stopAll();
    setRecordMode(false);
    exitBrowserFullscreen();
  }, [stopAll, exitBrowserFullscreen]);

  // Esc → kayıt modundan çık; tarayıcı tam ekrandan çıkınca da çık
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && recordRef.current) leaveRecordMode();
    };
    const onFs = () => {
      if (
        !document.fullscreenElement &&
        fsRequestedRef.current &&
        recordRef.current
      ) {
        fsRequestedRef.current = false;
        leaveRecordMode();
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [leaveRecordMode]);

  // Kapanışta her şeyi temizle
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      runIdRef.current++;
      if (ttsSupported()) window.speechSynthesis.cancel();
      audio.dispose();
      if (fsRequestedRef.current && document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  const sleep = useCallback(
    (ms: number, runId: number) =>
      new Promise<boolean>((resolve) => {
        window.setTimeout(() => resolve(runIdRef.current === runId), ms);
      }),
    []
  );

  /** Tek sahneyi oynatır: TTS + kelime senkronu + aşama (stage) efektleri. */
  const playScene = useCallback(
    (def: ReelsSceneDef, runId: number) =>
      new Promise<boolean>((resolve) => {
        const audio = audioRef.current;
        const words = tokenize(def.text);
        const total = words.length;
        const { spoken, starts } = buildSpeech(words);
        const est = estimateSpeechMs(def.text, TTS_RATE);
        const t0 = performance.now();

        let speechStartAt: number | null = null;
        let boundarySeen = false;
        let speechEnded = false;
        let speechFailed = false;
        let doneAt: number | null = null;
        let lastWord = -1;
        let curStage = 0;

        const useSpeech = ttsSupported() && !mutedRef.current;

        const advance = (idx: number) => {
          if (idx <= lastWord) return;
          lastWord = idx;
          setActiveWord(idx);
          const p = (idx + 1) / total;
          setProgress(p);
          const ns = def.stages.filter((t) => p >= t).length;
          if (ns > curStage) {
            curStage = ns;
            setStage(ns);
            const sfx = def.stageSfx[ns];
            if (sfx) audio.play(sfx);
          }
        };

        // sahne başlangıcı
        setStage(0);
        setActiveWord(-1);
        setProgress(0);
        const startSfx = def.stageSfx[0];
        if (startSfx) audio.play(startSfx);

        if (useSpeech) {
          try {
            const synth = window.speechSynthesis;
            synth.resume();
            const u = new SpeechSynthesisUtterance(spoken);
            u.lang = "tr-TR";
            u.rate = TTS_RATE;
            u.pitch = TTS_PITCH;
            u.volume = 1;
            const v = voiceRef.current;
            if (v) {
              u.voice = v;
              u.lang = v.lang || "tr-TR";
            }
            u.onstart = () => {
              speechStartAt = performance.now();
            };
            u.onboundary = (ev: SpeechSynthesisEvent) => {
              if (ev.name && ev.name !== "word") return;
              boundarySeen = true;
              let idx = 0;
              for (let i = 0; i < starts.length; i++) {
                if (starts[i] <= ev.charIndex) idx = i;
              }
              advance(idx);
            };
            u.onend = () => {
              speechEnded = true;
            };
            u.onerror = (ev: SpeechSynthesisErrorEvent) => {
              if (ev.error === "canceled" || ev.error === "interrupted") {
                speechEnded = true;
              } else {
                speechFailed = true;
              }
            };
            utterRef.current = u; // Chrome GC hatasına karşı referans tut
            synth.speak(u);
          } catch {
            speechFailed = true;
          }
        }

        const cleanup = () => window.clearInterval(iv);
        const iv = window.setInterval(() => {
          if (runIdRef.current !== runId) {
            cleanup();
            resolve(false);
            return;
          }
          const now = performance.now();
          const el = now - t0;

          // TTS hiç başlamadıysa yedek zamanlamaya geç
          if (useSpeech && speechStartAt === null && el > 1800) {
            speechFailed = true;
          }
          const timerDriven = !useSpeech || speechFailed;

          if (!boundarySeen && doneAt === null) {
            const base = timerDriven
              ? t0 + (useSpeech ? 1800 : 0)
              : speechStartAt;
            if (base !== null) {
              const e = Math.max(0, now - base);
              advance(Math.min(total - 1, estimateWordIndex(words, e, est)));
            }
          }

          const spokenDone = timerDriven
            ? el >= est + (useSpeech ? 1800 : 0)
            : speechEnded;

          if (doneAt === null && spokenDone && el >= def.minMs) {
            doneAt = now;
            advance(total - 1);
          }
          const safety = el > est * 2.5 + 5000;
          if ((doneAt !== null && now - doneAt >= SCENE_TAIL_MS) || safety) {
            cleanup();
            resolve(true);
          }
        }, 40);
      }),
    []
  );

  const startPlayback = useCallback(
    async (record: boolean) => {
      const audio = audioRef.current;
      audio.setMuted(mutedRef.current);
      audio.init(); // kullanıcı tıklaması içinde → ses kilidi açılır

      cancelSpeech();
      if (ttsSupported() && !mutedRef.current) {
        // iOS/Safari: konuşma motorunu kullanıcı hareketi içinde "uyandır"
        try {
          const prime = new SpeechSynthesisUtterance(" ");
          prime.volume = 0;
          window.speechSynthesis.speak(prime);
        } catch {
          /* ignore */
        }
      }

      const runId = ++runIdRef.current;
      setRecordMode(record);
      recordRef.current = record;
      setSceneIdx(0);
      setActiveWord(-1);
      setStage(0);
      setProgress(0);

      if (record) {
        try {
          if (!document.fullscreenElement) {
            fsRequestedRef.current = true;
            await document.documentElement.requestFullscreen?.();
          }
        } catch {
          fsRequestedRef.current = false;
        }
        setStatus("countdown");
        for (let n = 3; n >= 1; n--) {
          setCountdown(n);
          audio.play("countBeep");
          if (!(await sleep(1000, runId))) return;
        }
        setCountdown(0);
        audio.play("countGo");
        if (!(await sleep(250, runId))) return;
      } else {
        if (!(await sleep(150, runId))) return;
      }

      setStatus("playing");
      cancelSpeech();
      if (!(await sleep(80, runId))) return;

      for (let i = 0; i < script.scenes.length; i++) {
        setSceneIdx(i);
        if (i > 0) audio.play("whoosh");
        const alive = await playScene(script.scenes[i], runId);
        if (!alive) return;
      }
      if (!(await sleep(900, runId))) return;
      setStatus("ended");
    },
    [cancelSpeech, playScene, script, sleep]
  );

  const selectMode = (id: ReelsModeId) => {
    if (id === mode) return;
    stopAll();
    setMode(id);
  };

  const handleClose = () => {
    leaveRecordMode();
    onClose?.();
  };

  const testVoice = () => {
    if (!ttsSupported()) return;
    audioRef.current.init();
    cancelSpeech();
    const u = new SpeechSynthesisUtterance("Ustam, ben senin yeni randevu asistanınım.");
    u.lang = "tr-TR";
    u.rate = TTS_RATE;
    u.pitch = TTS_PITCH;
    const v = voiceRef.current;
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    utterRef.current = u;
    window.speechSynthesis.speak(u);
  };

  const currentScene = script.scenes[sceneIdx];
  const isBusy = status === "countdown" || status === "playing";
  const barProgress = (i: number) =>
    i < sceneIdx ? 1 : i === sceneIdx ? (status === "idle" ? 0 : progress) : 0;

  // ---------------------------------------------------------------- 9:16 sahne
  const stageFrame = (
    <div
      style={{ width: STAGE_W * scale, height: STAGE_H * scale }}
      className={`relative shrink-0 overflow-hidden ${
        recordMode ? "" : "rounded-[28px] shadow-[0_0_60px_rgba(245,158,11,0.25)] ring-1 ring-white/15"
      }`}
    >
      <div
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        className="relative overflow-hidden bg-black text-white"
      >
        <Backdrop />

        {/* Sahne içeriği */}
        {status !== "idle" && status !== "countdown" && (
          <motion.div
            key={`${mode}-${sceneIdx}`}
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.32 }}
            className="absolute inset-0"
          >
            <ReelsScene
              mode={mode}
              sceneIndex={sceneIdx}
              stage={stage}
              audio={audioRef.current}
            />
          </motion.div>
        )}

        {/* Üst: ilerleme + marka */}
        <div className="absolute inset-x-3 top-2.5 z-20 flex gap-1.5">
          {script.scenes.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${barProgress(i) * 100}%`, transition: "width 0.25s linear" }}
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-5 top-6 z-20 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-[13px]">
              💈
            </div>
            <span className="text-[12px] font-black uppercase tracking-wider text-white drop-shadow">
              VIP Randevu
            </span>
          </div>
          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
            ● Berberlere Özel
          </span>
        </div>

        {/* Altyazı (alt-orta) */}
        {status === "playing" && (
          <div className="absolute inset-x-0 bottom-[104px] z-20 flex min-h-[84px] items-end justify-center">
            <CapCutSubtitles
              sceneKey={`${mode}-${sceneIdx}`}
              text={currentScene.text}
              active={activeWord}
            />
          </div>
        )}

        {/* Alt filigran */}
        <div className="absolute inset-x-0 bottom-7 z-20 text-center text-[11px] font-black tracking-wide text-white/70 drop-shadow">
          {SITE_DOMAIN}
        </div>

        {/* Hazır ekranı */}
        {status === "idle" && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/55 px-8 text-center backdrop-blur-[2px]">
            <div className="text-6xl">🎬</div>
            <div className="mt-3 text-[11px] font-black uppercase tracking-[0.25em] text-amber-300">
              Reklam {script.id}
            </div>
            <div className="mt-1 text-3xl font-black uppercase leading-tight text-white">
              {script.title}
            </div>
            <div className="mt-2 text-xs font-bold text-white/60">
              9:16 · Sesli · Altyazılı · ~{script.approxSeconds} sn
            </div>
            <button
              type="button"
              onClick={() => startPlayback(false)}
              className="mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-black shadow-[0_0_30px_rgba(245,158,11,0.7)] transition hover:scale-105"
              aria-label="Önizlemeyi başlat"
            >
              <Play className="h-8 w-8 fill-black" />
            </button>
          </div>
        )}

        {/* Geri sayım */}
        {status === "countdown" && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black">
            <AnimatePresence mode="wait">
              {countdown > 0 && (
                <motion.div
                  key={countdown}
                  initial={{ scale: 2.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="text-[170px] font-black leading-none"
                  style={{ color: GOLD, textShadow: OUTLINE_SHADOW }}
                >
                  {countdown}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );

  // ---------------------------------------------------------------- KAYIT MODU
  if (recordMode) {
    return (
      <div
        className={`fixed inset-0 z-[300] flex items-center justify-center bg-black ${
          isBusy ? "cursor-none" : ""
        }`}
      >
        {stageFrame}
        {status === "ended" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="fixed inset-x-0 bottom-4 z-[310] flex justify-center gap-2"
          >
            <button
              type="button"
              onClick={() => startPlayback(true)}
              className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-black text-black shadow-xl"
            >
              <RotateCcw className="h-4 w-4" /> Tekrar Kaydet
            </button>
            <button
              type="button"
              onClick={leaveRecordMode}
              className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-4 py-2 text-xs font-black text-white shadow-xl"
            >
              <X className="h-4 w-4" /> Kayıt Modundan Çık
            </button>
          </motion.div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------- STÜDYO
  const tabBase =
    "rounded-xl border px-3 py-2 text-xs font-black transition sm:text-sm";
  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-[#07070a] text-white">
      <div className="mx-auto max-w-5xl px-3 pb-10 pt-3 sm:px-6 sm:pt-5">
        {/* Başlık */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300">
              <Clapperboard className="h-3.5 w-3.5" /> Reklam Stüdyosu
            </div>
            <h1 className="mt-1.5 text-base font-black leading-tight sm:text-2xl">
              🎬 Tam Otomatik Sesli Reels Reklam Stüdyosu{" "}
              <span className="text-amber-400">(9:16)</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20"
            aria-label="Stüdyoyu kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Senaryo butonları */}
        <div className="mt-3 flex flex-wrap gap-2">
          {REELS_SCRIPTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectMode(s.id)}
              className={`${tabBase} ${
                s.id === mode
                  ? "border-amber-300 bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/30"
                  : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              {s.tabLabel}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col items-center gap-5 md:flex-row md:items-start md:justify-center">
          {/* Sahne */}
          <div className="flex flex-col items-center gap-3">{stageFrame}</div>

          {/* Kontrol paneli */}
          <div className="w-full max-w-md space-y-3 md:w-[360px]">
            <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/50 to-zinc-900 p-3.5">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-300">
                📺 Kayıt İçin Tam Ekran Oynat
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                Tüm butonlar gizlenir, 3… 2… 1… geri sayımla 9:16 dikey video
                sesiyle, altyazısıyla ve animasyonlarıyla baştan sona oynar.
                Telefonun / bilgisayarın ekran kaydını başlat, sonra bu butona bas.
                Çıkış: <b>Esc</b>.
              </p>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => startPlayback(true)}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/30 transition hover:brightness-110 disabled:opacity-50"
              >
                <Maximize className="h-4 w-4" />
                🎬 Sesiyle Başlat &amp; Kayıt Moduna Geç
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {isBusy ? (
                <button
                  type="button"
                  onClick={stopAll}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-500/15 py-2.5 text-xs font-black text-rose-300"
                >
                  <Square className="h-4 w-4 fill-rose-300" /> Durdur
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startPlayback(false)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/15 py-2.5 text-xs font-black text-amber-300 transition hover:bg-amber-500/25"
                >
                  {status === "ended" ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 fill-amber-300" />
                  )}
                  {status === "ended" ? "Tekrar Oynat" : "Önizle (Sesli)"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  audioRef.current.init();
                  setMuted((m) => !m);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-black text-white/80 transition hover:bg-white/10"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {muted ? "Ses Kapalı" : "Ses Açık"}
              </button>
            </div>

            {/* Ses ayarı */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
              <div className="text-[11px] font-black uppercase tracking-wider text-white/60">
                🎙 Spiker Sesi (tr-TR · rate 1.08 · pitch 0.92)
              </div>
              {ttsSupported() && voices.length > 0 ? (
                <div className="mt-2 flex gap-2">
                  <select
                    value={voiceURI}
                    onChange={(e) => setVoiceURI(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-zinc-900 px-2 py-2 text-xs font-bold text-white outline-none"
                  >
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={testVoice}
                    className="rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 text-xs font-black text-amber-300"
                  >
                    Dene
                  </button>
                </div>
              ) : (
                <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] font-bold leading-relaxed text-amber-200">
                  {ttsSupported()
                    ? "Bu cihazda Türkçe (tr-TR) ses bulunamadı. Windows: Ayarlar → Zaman ve dil → Konuşma → Ses ekle → Türkçe. Altyazı ve ses efektleri yine de çalışır."
                    : "Bu tarayıcı konuşma sentezini (speechSynthesis) desteklemiyor. Chrome / Edge / Safari kullanın. Altyazı ve ses efektleri yine de çalışır."}
                </p>
              )}
            </div>

            {/* Sahne listesi */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
              <div className="text-[11px] font-black uppercase tracking-wider text-white/60">
                {script.title} · ~{script.approxSeconds} sn
              </div>
              <div className="mt-2 space-y-2">
                {script.scenes.map((s, i) => {
                  const on = isBusy && i === sceneIdx;
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border p-2.5 transition ${
                        on
                          ? "border-amber-400/70 bg-amber-500/15"
                          : "border-white/10 bg-black/20"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                        <span className={on ? "text-amber-300" : "text-white/50"}>
                          Sahne {i + 1}
                        </span>
                        <span className="text-white/40">{s.label}</span>
                      </div>
                      <p className="mt-1 text-[12px] font-bold leading-snug text-white/85">
                        “{s.text}”
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
