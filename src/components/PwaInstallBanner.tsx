"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Download,
  Sparkles,
  MoreVertical,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaInstallBannerProps {
  mode?: "customer" | "admin";
}

export default function PwaInstallBanner({
  mode = "admin",
}: PwaInstallBannerProps) {
  const isCustomer = mode === "customer";
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [guideTab, setGuideTab] = useState<"ios" | "android">("ios");
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Register Service Worker so Chrome/Android enables PWA install prompt
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // ignore service worker registration errors in dev
      });
    }

    // 2. Check if already running as installed standalone PWA
    const checkStandalone = () => {
      const standaloneMatch =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone ===
          true;
      setIsStandalone(Boolean(standaloneMatch));
    };

    checkStandalone();

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = () => checkStandalone();
    mediaQuery.addEventListener?.("change", handleMediaChange);

    // 3. Detect iOS (iPhone / iPad)
    const ua = window.navigator.userAgent || "";
    const iOSDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === "MacIntel" &&
        window.navigator.maxTouchPoints > 1);
    setIsIOS(iOSDevice);
    setGuideTab(iOSDevice ? "ios" : "android");

    // 4. Listen for Android/Chrome beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      try {
        localStorage.setItem(
          "vip_barber_pwa_role_v1",
          isCustomer ? "customer" : "admin"
        );
      } catch {
        // ignore storage errors
      }
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowGuideModal(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener?.("change", handleMediaChange);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isCustomer]);

  // Do not render if already installed/running in standalone mode or dismissed
  if (isStandalone || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    try {
      localStorage.setItem(
        "vip_barber_pwa_role_v1",
        isCustomer ? "customer" : "admin"
      );
    } catch {
      // ignore storage errors
    }

    // If Android/Chrome native install prompt is available, trigger it directly
    if (deferredPrompt && !isIOS) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setDeferredPrompt(null);
          setIsStandalone(true);
        }
        return;
      } catch {
        // Fallback to visual modal
      }
    }

    // For iPhone (iOS Safari) or browsers without active deferredPrompt, open visual guide modal
    setGuideTab(isIOS ? "ios" : "android");
    setShowGuideModal(true);
  };

  return (
    <>
      {/* BOTTOM SUBTLE & COMPACT PWA INSTALL BAR */}
      <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-[#14100d]/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Smartphone className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-[#c88a53]" />
            <p className="truncate text-[11px] font-medium text-stone-600 dark:text-stone-400">
              {isCustomer
                ? "Uygulamayı ana ekrana ekleyerek hızlı randevu alabilirsiniz"
                : "Berber panelini telefonunuza uygulama olarak ekleyin"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-600 bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-slate-950 shadow-sm transition-all duration-150 hover:bg-amber-400 active:scale-95 dark:border-[#c88a53]/40 dark:bg-[#c88a53]/15 dark:text-[#e6ccb2] dark:hover:bg-[#c88a53]/25"
            >
              <span>📲 Uygulamayı Yükle</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              title="Gizle"
              className="flex h-6 w-6 items-center justify-center rounded-lg text-stone-500 transition hover:text-stone-800 active:scale-95 dark:hover:text-stone-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* VISUAL INSTALLATION GUIDE MODAL (iOS Safari & Android) */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#e6ccb2]/50 bg-gradient-to-b from-[#241b16] via-[#1a1411] to-[#110d0b] p-5 shadow-2xl shadow-black/90 sm:p-6"
            >
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#14100d] text-stone-300 transition hover:border-white/30 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#e6ccb2]/50 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#140d08] shadow-lg shadow-[#c88a53]/30">
                  <Download className="h-6 w-6 stroke-[2.5]" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#e6ccb2]/40 bg-[#c88a53]/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#e6ccb2]">
                    <Sparkles className="h-3 w-3 text-[#c88a53]" />
                    {isCustomer ? "HIZLI ONLINE RANDEVU" : "VIP BERBER YÖNETİM"}
                  </span>
                  <h3 className="mt-1 text-base font-extrabold text-[#fdf8f5] sm:text-lg">
                    📱 Uygulamayı Ana Ekrana Yükle
                  </h3>
                </div>
              </div>

              {/* Device Selector Tabs */}
              <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-[#120e0c] p-1">
                <button
                  type="button"
                  onClick={() => setGuideTab("ios")}
                  className={`rounded-lg py-2 text-xs font-extrabold transition ${
                    guideTab === "ios"
                      ? "bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#140d08] shadow"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  🍎 iPhone (Safari)
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab("android")}
                  className={`rounded-lg py-2 text-xs font-extrabold transition ${
                    guideTab === "android"
                      ? "bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#140d08] shadow"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  🤖 Android (Chrome)
                </button>
              </div>

              {guideTab === "ios" ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-[#e6ccb2]/35 bg-[#14100d] p-3.5 text-center">
                    <p className="text-xs font-bold leading-relaxed text-[#fdf8f5] sm:text-sm">
                      Alttaki{" "}
                      <span className="text-[#e6ccb2] underline">
                        Paylaş (Share)
                      </span>{" "}
                      ikonuna basıp{" "}
                      <span className="text-[#c88a53]">
                        &ldquo;Ana Ekrana Ekle&rdquo;
                      </span>{" "}
                      seçeneğine tıklayın.
                    </p>
                  </div>

                  {/* Visual Step 1 */}
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#16120f] p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/15 text-sky-300">
                      <Share className="h-5 w-5" />
                    </div>
                    <div className="text-xs">
                      <span className="font-black text-[#e6ccb2]">
                        1. Adım:
                      </span>{" "}
                      <span className="text-stone-200">
                        Safari tarayıcısının en altındaki{" "}
                        <strong className="text-white">Paylaş</strong> (yukarı
                        oklu kutu) ikonuna dokunun.
                      </span>
                    </div>
                  </div>

                  {/* Visual Step 2 */}
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#16120f] p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e6ccb2]/40 bg-[#c88a53]/20 text-[#e6ccb2]">
                      <PlusSquare className="h-5 w-5" />
                    </div>
                    <div className="text-xs">
                      <span className="font-black text-[#e6ccb2]">
                        2. Adım:
                      </span>{" "}
                      <span className="text-stone-200">
                        Açılan menüyü biraz yukarı kaydırıp{" "}
                        <strong className="text-white">Ana Ekrana Ekle</strong>{" "}
                        seçeneğine basın.
                      </span>
                    </div>
                  </div>

                  {/* Visual Step 3 */}
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#16120f] p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="text-xs">
                      <span className="font-black text-[#e6ccb2]">
                        3. Adım:
                      </span>{" "}
                      <span className="text-stone-200">
                        Sağ üstteki <strong className="text-white">Ekle</strong>{" "}
                        butonuna basın. Artık ana ekranınızdan tek dokunuşla
                        açabilirsiniz!
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {deferredPrompt && (
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e6ccb2]/60 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3 text-xs font-black uppercase tracking-wider text-[#140d08] shadow-lg"
                    >
                      <Download className="h-4 w-4 stroke-[2.5]" />
                      <span>Şimdi Tek Tıkla Yükle</span>
                    </button>
                  )}

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#16120f] p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e6ccb2]/40 bg-[#c88a53]/20 text-[#e6ccb2]">
                      <MoreVertical className="h-5 w-5" />
                    </div>
                    <div className="text-xs">
                      <span className="font-black text-[#e6ccb2]">
                        1. Adım:
                      </span>{" "}
                      <span className="text-stone-200">
                        Chrome sağ üst köşedeki{" "}
                        <strong className="text-white">üç nokta (⋮)</strong>{" "}
                        menüsüne dokunun.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#16120f] p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div className="text-xs">
                      <span className="font-black text-[#e6ccb2]">
                        2. Adım:
                      </span>{" "}
                      <span className="text-stone-200">
                        <strong className="text-white">
                          Uygulamayı yükle
                        </strong>{" "}
                        veya{" "}
                        <strong className="text-white">Ana ekrana ekle</strong>{" "}
                        seçeneğine dokunun.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="mt-5 w-full rounded-2xl border border-[#e6ccb2]/45 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3 text-xs font-black uppercase tracking-wider text-[#140d08] shadow-lg transition hover:brightness-110"
              >
                Anladım, Kapat
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
