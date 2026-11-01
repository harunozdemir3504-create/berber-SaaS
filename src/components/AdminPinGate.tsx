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
    <div className="relative mx-auto max-w-sm px-3 pb-12 pt-3 sm:px-4 sm:pb-20 sm:pt-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 left-1/2 -z-10 h-48 w-full -translate-x-1/2 rounded-full bg-gradient-to-r from-[#b47b48]/20 via-[#c88a53]/15 to-[#9a6334]/20 blur-3xl"
      />

      {/* PWA Yükleme Bandı (Giriş ekranında da görünür) */}
      <PwaInstallBanner />

      <motion.div
        key={shake}
        initial={shake ? { x: 0 } : { opacity: 0, y: 12 }}
        animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : { opacity: 1, y: 0 }}
        transition={{ duration: shake ? 0.35 : 0.2 }}
        className="rounded-2xl border border-[#e6ccb2]/45 bg-gradient-to-b from-[#241b16] via-[#1c1613] to-[#14100d] p-4 shadow-2xl shadow-black/80 sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-center gap-3 sm:flex-col sm:text-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-br from-[#b47b48] via-[#c88a53] to-[#9a6334] text-[#1a110b] shadow-md shadow-[#c88a53]/25 sm:mx-auto sm:h-14 sm:w-14 sm:rounded-2xl">
            <Scissors className="h-5 w-5 -rotate-45 stroke-[2.3] sm:h-7 sm:w-7" />
          </div>

          <div className="min-w-0 flex-1 sm:mt-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#e6ccb2]/40 bg-[#c88a53]/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#e6ccb2]">
              <Lock className="h-2.5 w-2.5 text-[#c88a53]" />
              BERBER GİRİŞ PANELİ
            </span>
            <h1 className="mt-0.5 text-base font-extrabold text-[#fdf8f5] sm:text-xl">
              Salon Yönetici Girişi
            </h1>
            <p className="text-[11px] leading-snug text-[#e6ccb2]/75 sm:text-xs">
              Dükkanınızı seçip şifrenizi girin; cihazınız sizi otomatik hatırlar.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            tryUnlock(pin);
          }}
        >
          {/* 1. DÜKKAN SEÇİMİ */}
          <div className="relative z-30 mt-3.5 sm:mt-5">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#e6ccb2]">
                <Building2 className="h-3.5 w-3.5 text-[#c88a53]" />
                <span>Dükkanınızı Seçiniz *</span>
              </label>
              {targetShop && (
                <span className="max-w-[150px] truncate text-[11px] font-extrabold text-[#c88a53]">
                  {targetShop.name}
                </span>
              )}
            </div>

            {/* Tek Tıkla Dükkan Seçim Kartları */}
            <div className="mb-2 grid max-h-36 grid-cols-1 gap-1.5 overflow-y-auto pr-0.5">
              {shops.map((s) => {
                const isSelected =
                  s.slug.toLowerCase() === selectedSlug.toLowerCase();
                return (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => handleSelectShop(s.slug)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                      isSelected
                        ? "border-[#e6ccb2] bg-gradient-to-r from-[#b47b48]/30 via-[#c88a53]/25 to-[#9a6334]/20 text-[#fdf8f5] shadow-sm"
                        : "border-white/10 bg-[#14100d] text-stone-300 hover:border-[#c88a53]/50 hover:text-white"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="block truncate font-extrabold">
                        {s.name}
                      </span>
                      <span className="block truncate text-[10px] text-stone-400">
                        {s.district || "Merkez"}
                      </span>
                    </div>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-[#e6ccb2] bg-[#c88a53] text-[#14100d]"
                          : "border-white/20 bg-transparent"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {shops.length > 3 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#c88a53]" />
                <input
                  type="text"
                  value={shopSearchQuery}
                  onChange={(e) => {
                    setShopSearchQuery(e.target.value);
                    setIsShopDropdownOpen(true);
                  }}
                  onFocus={() => setIsShopDropdownOpen(true)}
                  placeholder="Dükkan adı yazarak filtrele..."
                  className="w-full rounded-xl border border-[#c88a53]/35 bg-[#14100d] py-2 pl-9 pr-8 text-xs text-[#fdf8f5] placeholder-[#e6ccb2]/50 outline-none focus:border-[#e6ccb2]"
                />
                {shopSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setShopSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#e6ccb2]/60 hover:text-[#fdf8f5]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {isShopDropdownOpen && shopSearchQuery && (
              <div className="mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-[#c88a53]/45 bg-[#1c1613] p-1.5 shadow-2xl">
                {filteredShops.length === 0 ? (
                  <div className="p-2 text-center text-xs text-[#e6ccb2]/65">
                    Eşleşen dükkan bulunamadı.
                  </div>
                ) : (
                  filteredShops.map((s) => (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => handleSelectShop(s.slug)}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-[#fdf8f5] hover:bg-[#241b16]"
                    >
                      <span className="truncate font-bold">{s.name}</span>
                      <span className="text-[10px] text-[#c88a53]">Seç</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 2. ŞİFRE GİRİŞİ (TEMİZ & İPUÇSUZ) */}
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-bold text-[#e6ccb2]">
                Dükkan Yönetim Şifresi *
              </label>
              {pin && (
                <button
                  type="button"
                  onClick={() => setPin((p) => p.slice(0, -1))}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#c88a53] hover:text-[#fdf8f5]"
                >
                  <Delete className="h-3.5 w-3.5" />
                  <span>Sil</span>
                </button>
              )}
            </div>
            <input
              type="password"
              maxLength={16}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError("");
              }}
              placeholder="Şifrenizi giriniz"
              className="w-full rounded-xl border border-[#c88a53]/45 bg-[#14100d] py-2.5 text-center font-mono text-lg font-black tracking-[0.35em] text-[#fdf8f5] outline-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:tracking-normal placeholder:text-[#e6ccb2]/40 focus:border-[#e6ccb2]"
            />
          </div>

          {/* Kompakt 5x2 Hızlı Tuş Takımı */}
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => pressDigit(d)}
                className="rounded-xl border border-[#c88a53]/25 bg-[#14100d] py-2 font-mono text-sm font-black text-[#e6ccb2] transition hover:border-[#c88a53] hover:bg-[#241b16] hover:text-[#fdf8f5] active:scale-95"
              >
                {d}
              </button>
            ))}
          </div>

          {/* Beni Hatırla Aktif Rozeti */}
          <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-1.5 text-[11px] font-bold text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span>Beni Hatırla Aktif: Cihazınız oturumu açık tutar</span>
          </div>

          {error && (
            <div className="mt-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 p-2 text-center text-xs font-bold text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#e6ccb2]/50 bg-gradient-to-r from-[#b47b48] via-[#c88a53] to-[#9a6334] py-3 text-xs font-black uppercase tracking-wider text-[#1a110b] shadow-lg shadow-[#c88a53]/25 transition hover:brightness-110 active:scale-[0.99]"
          >
            <KeyRound className="h-4 w-4 stroke-[2.5]" />
            <span>
              {targetShop
                ? `${targetShop.name} Paneline Giriş Yap`
                : "Panele Giriş Yap"}
            </span>
          </button>
        </form>

        <p className="mt-2.5 flex items-center justify-center gap-1 text-[10px] text-[#e6ccb2]/50">
          <ShieldCheck className="h-3 w-3" />
          Şifrenizi unuttuysanız sistem yöneticinizle iletişime geçin.
        </p>
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
