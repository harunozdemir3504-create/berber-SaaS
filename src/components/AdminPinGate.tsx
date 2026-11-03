"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Lock,
  Scissors,
  ShieldCheck,
  Delete,
  Ban,
  Building2,
  KeyRound,
  Search,
  Check,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { useBarber } from "@/context/BarberContext";
import PwaInstallBanner from "@/components/PwaInstallBanner";

export const PERSISTENT_ADMIN_SESSION_KEY =
  "vip_barber_persistent_admin_session_v1";
export const PWA_INSTALL_ROLE_KEY = "vip_barber_pwa_role_v1";

export interface PersistentAdminSession {
  shopId: string;
  shopSlug: string;
  pinSnapshot: string;
  unlockedAt: string;
}

const sessionKey = (slug: string) =>
  `vip_barber_admin_unlocked_${slug.toLowerCase()}`;

export function readPersistentSession(): PersistentAdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PERSISTENT_ADMIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistentAdminSession;
    if (parsed && typeof parsed.shopSlug === "string" && parsed.shopSlug) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Salon Yönetici Girişi (Dükkan Seçimi + Özel Şifre + Kalıcı Beni Hatırla) — /admin sayfasını korur.
 * Berber dükkanını seçip şifresini 1 kere girdiğinde localStorage'a kaydedilir.
 * Ertesi gün PWA ikonundan (/admin) açtığında şifre sormadan doğrudan kendi dükkanına yönlendirilir.
 * Süper Admin dükkanı silerse veya şifresini değiştirirse oturum otomatik sonlandırılır.
 */
export default function AdminPinGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { shops, currentShopSlug, setCurrentShopSlug, hydrated } = useBarber();

  const hasInitializedRef = useRef<boolean>(false);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [authenticatedSlug, setAuthenticatedSlug] = useState<string | null>(
    null
  );
  const [shopSearchQuery, setShopSearchQuery] = useState<string>("");
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const [pin, setPin] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [shake, setShake] = useState<number>(0);

  const filteredShops = useMemo(() => {
    const q = shopSearchQuery.trim().toLocaleLowerCase("tr-TR");
    if (!q) return shops;
    return shops.filter((s) => {
      const name = (s.name || "").toLocaleLowerCase("tr-TR");
      const district = (s.district || "").toLocaleLowerCase("tr-TR");
      const slug = (s.slug || "").toLocaleLowerCase("tr-TR");
      return name.includes(q) || district.includes(q) || slug.includes(q);
    });
  }, [shops, shopSearchQuery]);

  // 1. One-time initialization: Check persistent localStorage session ("Beni Hatırla") & URL (?shop=slug)
  useEffect(() => {
    if (!hydrated || hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (shops.length === 0) {
      lockAdminSession();
      setAuthenticatedSlug(null);
      setChecked(true);
      return;
    }

    let urlSlug = "";
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const paramSlug = urlParams.get("shop");
      if (paramSlug && paramSlug.trim()) {
        urlSlug = paramSlug.trim().toLowerCase();
      }
    }

    const savedSession = readPersistentSession();

    // A) If a persistent session exists and URL either has no ?shop or matches the saved shop
    if (
      savedSession &&
      (!urlSlug || urlSlug === savedSession.shopSlug.toLowerCase())
    ) {
      const rememberedShop = shops.find(
        (s) =>
          s.slug.toLowerCase() === savedSession.shopSlug.toLowerCase() ||
          (savedSession.shopId &&
            s.slug.toLowerCase() === savedSession.shopId.toLowerCase())
      );

      // Security check 1: Was the shop deleted by Super Admin?
      if (!rememberedShop) {
        lockAdminSession();
        const fallback = shops[0].slug;
        setSelectedSlug(fallback);
        setCurrentShopSlug(fallback);
        setAuthenticatedSlug(null);
        setError(
          "Kayıtlı dükkanınız sistem yöneticisi tarafından silindiği için oturumunuz sonlandırıldı."
        );
        setChecked(true);
        return;
      }

      // Security check 2: Was the shop's password changed by Super Admin?
      const currentPin = (rememberedShop.adminPin || "1234").trim();
      if (savedSession.pinSnapshot !== currentPin) {
        lockAdminSession(rememberedShop.slug);
        setSelectedSlug(rememberedShop.slug);
        setCurrentShopSlug(rememberedShop.slug);
        setAuthenticatedSlug(null);
        setError(
          "Dükkan yönetim şifreniz güncellendiği için güvenlik nedeniyle tekrar giriş yapmanız gerekmektedir."
        );
        setChecked(true);
        return;
      }

      // Valid persistent session -> auto-login without asking password!
      setSelectedSlug(rememberedShop.slug);
      setCurrentShopSlug(rememberedShop.slug);
      setAuthenticatedSlug(rememberedShop.slug);
      router.replace(`/admin?shop=${rememberedShop.slug}`, { scroll: false });
      setChecked(true);
      return;
    }

    // B) If URL specifies a shop that was deleted
    if (urlSlug && !shops.some((s) => s.slug.toLowerCase() === urlSlug)) {
      lockAdminSession(urlSlug);
      const fallback = shops[0].slug;
      setSelectedSlug(fallback);
      setCurrentShopSlug(fallback);
      setAuthenticatedSlug(null);
      setError("Bu dükkanın hesabı kapatılmış veya sistemden silinmiştir.");
      setChecked(true);
      return;
    }

    const initialSlug =
      urlSlug ||
      (shops.some((s) => s.slug.toLowerCase() === currentShopSlug.toLowerCase())
        ? currentShopSlug
        : shops[0].slug);

    setSelectedSlug(initialSlug);
    setCurrentShopSlug(initialSlug);

    const matchedShop = shops.find(
      (s) => s.slug.toLowerCase() === initialSlug.toLowerCase()
    );

    try {
      const savedToken =
        localStorage.getItem(sessionKey(initialSlug)) ||
        sessionStorage.getItem(sessionKey(initialSlug));
      const expectedPin = (matchedShop?.adminPin || "1234").trim();
      if (matchedShop && savedToken === expectedPin) {
        setAuthenticatedSlug(matchedShop.slug);
        router.replace(`/admin?shop=${matchedShop.slug}`, { scroll: false });
      } else {
        setAuthenticatedSlug(null);
      }
    } catch {
      setAuthenticatedSlug(null);
    }

    setChecked(true);
  }, [hydrated, shops, currentShopSlug, setCurrentShopSlug, router]);

  // 2. Real-time security guard: React to shop deletions or password changes by Super Admin
  useEffect(() => {
    if (!hydrated || !hasInitializedRef.current) return;

    if (shops.length === 0) {
      lockAdminSession();
      setAuthenticatedSlug(null);
      return;
    }

    if (!selectedSlug) return;

    const currentSelectedObj = shops.find(
      (s) => s.slug.toLowerCase() === selectedSlug.toLowerCase()
    );

    // If the active shop was deleted by Super Admin
    if (!currentSelectedObj) {
      lockAdminSession(selectedSlug);
      const nextShop = shops[0].slug;
      setAuthenticatedSlug(null);
      setSelectedSlug(nextShop);
      setCurrentShopSlug(nextShop);
      router.replace(`/admin?shop=${nextShop}`, { scroll: false });
      setError("Seçili dükkan sistemden silindiği için oturum kapatıldı.");
      return;
    }

    // If currently authenticated, verify stored token/pinSnapshot still matches current shop password
    if (authenticatedSlug) {
      try {
        const expectedPin = (currentSelectedObj.adminPin || "1234").trim();
        const savedSession = readPersistentSession();
        const savedToken =
          localStorage.getItem(sessionKey(currentSelectedObj.slug)) ||
          sessionStorage.getItem(sessionKey(currentSelectedObj.slug));

        const isSessionPinValid =
          (savedSession &&
            savedSession.shopSlug.toLowerCase() ===
              currentSelectedObj.slug.toLowerCase() &&
            savedSession.pinSnapshot === expectedPin) ||
          savedToken === expectedPin;

        if (!isSessionPinValid) {
          lockAdminSession(currentSelectedObj.slug);
          setAuthenticatedSlug(null);
          setError(
            "Dükkan şifresi değiştirildiği için oturumunuz güvenlik amacıyla sonlandırıldı."
          );
        }
      } catch {
        setAuthenticatedSlug(null);
      }
    }
  }, [
    shops,
    hydrated,
    selectedSlug,
    authenticatedSlug,
    setCurrentShopSlug,
    router,
  ]);

  const targetShop = useMemo(
    () =>
      shops.find((s) => s.slug.toLowerCase() === selectedSlug.toLowerCase()),
    [shops, selectedSlug]
  );

  const handleSelectShop = (slug: string) => {
    const shopObj = shops.find(
      (s) => s.slug.toLowerCase() === slug.toLowerCase()
    );
    if (!shopObj) return;

    setSelectedSlug(shopObj.slug);
    setCurrentShopSlug(shopObj.slug);
    setPin("");
    setError("");
    setIsShopDropdownOpen(false);
    setShopSearchQuery("");

    router.replace(`/admin?shop=${shopObj.slug}`, { scroll: false });

    try {
      const savedToken =
        localStorage.getItem(sessionKey(shopObj.slug)) ||
        sessionStorage.getItem(sessionKey(shopObj.slug));
      const expectedPin = (shopObj.adminPin || "1234").trim();
      if (savedToken === expectedPin) {
        setAuthenticatedSlug(shopObj.slug);
      } else {
        setAuthenticatedSlug(null);
      }
    } catch {
      setAuthenticatedSlug(null);
    }
  };

  const tryUnlock = (value: string) => {
    if (!targetShop) {
      setError("Lütfen geçerli bir dükkan seçiniz.");
      return;
    }

    const correctPin = (targetShop.adminPin || "1234").trim();

    if (value.trim() === correctPin) {
      try {
        const persistentSession: PersistentAdminSession = {
          shopId: targetShop.slug,
          shopSlug: targetShop.slug,
          pinSnapshot: correctPin,
          unlockedAt: new Date().toISOString(),
        };
        localStorage.setItem(
          PERSISTENT_ADMIN_SESSION_KEY,
          JSON.stringify(persistentSession)
        );
        localStorage.setItem(PWA_INSTALL_ROLE_KEY, "admin");
        localStorage.setItem(sessionKey(targetShop.slug), correctPin);
        sessionStorage.setItem(sessionKey(targetShop.slug), correctPin);
      } catch {
        // ignore storage errors
      }

      setCurrentShopSlug(targetShop.slug);
      router.replace(`/admin?shop=${targetShop.slug}`, { scroll: false });

      setAuthenticatedSlug(targetShop.slug);
      setError("");
      setPin("");
    } else {
      setError(
        "Hatalı şifre! Lütfen dükkanınız için belirlenen özel şifreyi giriniz."
      );
      setShake((s) => s + 1);
      setPin("");
    }
  };

  const pressDigit = (d: string) => {
    if (pin.length >= 16) return;
    const next = pin + d;
    setPin(next);
    setError("");
  };

  if (!hydrated || !checked) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-xs text-[#e6ccb2]/60">
        Yükleniyor...
      </div>
    );
  }

  // If no shops exist in system at all
  if (shops.length === 0) {
    return (
      <div className="relative mx-auto max-w-sm px-4 pb-16 pt-6 sm:pt-16">
        <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-b from-[#241616] via-[#1c1613] to-[#14100d] p-5 text-center shadow-2xl shadow-black/80">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/20 text-rose-400">
            <Ban className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-lg font-extrabold text-[#fdf8f5]">
            Kayıtlı Dükkan Yok
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#e6ccb2]/75">
            Sistemde henüz kayıtlı bir berber dükkanı bulunmamaktadır. Lütfen
            Süper Admin paneli üzerinden dükkan oluşturun.
          </p>
        </div>
      </div>
    );
  }

  const isCurrentlyAuthenticated =
    Boolean(authenticatedSlug) &&
    Boolean(targetShop) &&
    targetShop!.slug.toLowerCase() === authenticatedSlug!.toLowerCase() &&
    currentShopSlug.toLowerCase() === authenticatedSlug!.toLowerCase();

  if (isCurrentlyAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 py-8">
      {/* PWA Yükleme Bandı */}
      <div className="w-full max-w-sm mb-3">
        <PwaInstallBanner />
      </div>

      <motion.div
        key={shake}
        initial={shake ? { x: 0 } : { opacity: 0, y: 10 }}
        animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : { opacity: 1, y: 0 }}
        transition={{ duration: shake ? 0.3 : 0.18 }}
        className="w-full max-w-sm rounded-2xl border border-[#c88a53]/40 bg-[#161210] p-5 shadow-2xl shadow-black/80 sm:p-6"
      >
        {/* Ortalanmış VIP İkon ve Başlık */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e6ccb2]/50 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-lg shadow-[#c88a53]/25">
            <Scissors className="h-6 w-6 -rotate-45 stroke-[2.5]" />
          </div>
          <h1 className="mt-3 text-base font-extrabold text-[#fdf8f5] sm:text-lg">
            Salon Yönetici Girişi
          </h1>
          <p className="mt-0.5 text-xs font-bold text-[#c88a53]">
            {targetShop ? targetShop.name : "VIP Berber Yönetim Paneli"}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            tryUnlock(pin);
          }}
          className="mt-4"
        >
          {/* Dükkan Seçimi (Çoklu Dükkanda Şık Dropdown) */}
          {shops.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-bold text-[#e6ccb2]">
                Dükkanınızı Seçiniz *
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#c88a53]" />
                <select
                  value={selectedSlug}
                  onChange={(e) => handleSelectShop(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-[#c88a53]/35 bg-[#120f0d] py-2.5 pl-9 pr-8 text-xs font-bold text-[#fdf8f5] outline-none transition focus:border-[#e6ccb2] focus:ring-1 focus:ring-[#c88a53]"
                >
                  {shops.map((s) => (
                    <option
                      key={s.slug}
                      value={s.slug}
                      className="bg-[#1a1410] text-[#fdf8f5]"
                    >
                      {s.name} ({s.district || "Merkez"})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#c88a53]">
                  ▾
                </div>
              </div>
            </div>
          )}

          {/* Şifre Giriş Alanı (Odaklandığında Altın Sarısı Parlayan) */}
          <div className={shops.length > 1 ? "mt-3" : "mt-1"}>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-bold text-[#e6ccb2]">
                Yönetim PIN / Şifre *
              </label>
              {pin && (
                <button
                  type="button"
                  onClick={() => setPin("")}
                  className="text-[10px] text-stone-400 hover:text-white"
                >
                  Temizle
                </button>
              )}
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c88a53]" />
              <input
                type={showPassword ? "text" : "password"}
                inputMode="numeric"
                maxLength={16}
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError("");
                }}
                placeholder="PIN kodunuzu giriniz"
                className="w-full rounded-xl border border-[#c88a53]/40 bg-[#120f0d] py-3 pl-10 pr-10 text-center font-mono text-base font-black tracking-widest text-[#fdf8f5] outline-none transition focus:border-[#e6ccb2] focus:ring-2 focus:ring-[#c88a53]/40 placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:tracking-normal placeholder:text-stone-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#e6ccb2]"
                tabIndex={-1}
                title={showPassword ? "Şifreyi Gizle" : "Şifreyi Göster"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 p-2 text-center text-xs font-bold text-rose-300">
              {error}
            </div>
          )}

          {/* Tam Genişlikte Giriş Yap Butonu */}
          <button
            type="submit"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3 text-xs font-black uppercase tracking-wider text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110 active:scale-[0.99]"
          >
            <KeyRound className="h-4 w-4 stroke-[2.5]" />
            <span>Giriş Yap</span>
          </button>
        </form>

        <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-emerald-400/90">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span>Beni Hatırla: Cihazınız oturumu otomatik açık tutar</span>
        </div>
      </motion.div>
    </div>
  );
}

export function lockAdminSession(slug?: string) {
  try {
    localStorage.removeItem(PERSISTENT_ADMIN_SESSION_KEY);
    localStorage.removeItem(PWA_INSTALL_ROLE_KEY);
    if (slug) {
      localStorage.removeItem(sessionKey(slug));
      sessionStorage.removeItem(sessionKey(slug));
    }
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("vip_barber_admin_unlocked_")) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("vip_barber_admin_unlocked_")) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    // ignore
  }
}
