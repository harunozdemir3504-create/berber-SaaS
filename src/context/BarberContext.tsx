"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Suspense,
} from "react";
import { useSearchParams, usePathname } from "next/navigation";
import {
  AdminAlert,
  Appointment,
  AppointmentStatus,
  Barber,
  BlacklistEntry,
  DepositPolicyType,
  INITIAL_GLOBAL_BLACKLIST,
  INITIAL_SHOPS,
  RevenueStats,
  Service,
  ShopSettings,
  TenantShop,
  SubscriptionStatus,
  TimeSlot,
  WaitlistEntry,
  resolveDayMetadata,
  getLiveDaysMetadata,
  toStrictIsoDate,
  getAppointmentIsoDate,
} from "@/data/mockData";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { triggerAutomaticBookingNotification } from "@/lib/notifications";
export {
  formatPhoneForWhatsApp,
  formatPhoneDisplay,
  buildWhatsAppUrl,
  DEFAULT_SHOP_WHATSAPP_PHONE,
} from "@/lib/whatsapp";
export {
  SITE_DOMAIN,
  SITE_URL,
  getShopBookingUrl,
  getShopDisplayUrl,
  getShopAdminUrl,
  getShopAdminDisplayUrl,
  generateShopSetupShareText,
} from "@/lib/siteConfig";

export interface UpdateShopDetailsInput {
  name?: string;
  phone?: string;
  district?: string;
  monthlyFee?: number;
  subtitle?: string;
  iban?: string;
  depositAmount?: number;
}

interface NewShopInput {
  name: string;
  slug: string;
  phone: string;
  district?: string;
  monthlyFee: number;
  adminPin?: string;
  subscriptionEndDate?: string;
}

interface BlockedTimeRangeInput {
  dayId: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  barberId: string;
  barberName: string;
  chairLabel: string;
  reason: string;
}

interface BarberContextType {
  // Multi-Tenant SaaS State
  shops: TenantShop[];
  currentShop: TenantShop;
  currentShopSlug: string;
  hasShopQueryParam: boolean;
  hydrated: boolean;
  setCurrentShopSlug: (slug: string) => void;
  addShop: (input: NewShopInput) => TenantShop;
  toggleShopSubscription: (slug: string) => void;
  updateShopSubscription: (slug: string, status: SubscriptionStatus, endDate?: string) => void;
  updateShopPinBySlug: (slug: string, newPin: string) => void;
  updateShopDetails: (slug: string, details: UpdateShopDetailsInput) => void;
  deleteShop: (slug: string) => void;
  currentShopExists: boolean;
  updateCurrentShopDepositPolicy: (policy: DepositPolicyType, amount: number) => void;
  updateCurrentShopPin: (newPin: string) => void;
  masterPin: string;
  updateMasterPin: (newPin: string) => void;

  // Current Tenant Isolated State
  appointments: Appointment[];
  waitlist: WaitlistEntry[];
  barbers: Barber[];
  services: Service[];
  shopSettings: ShopSettings;
  adminAlerts: AdminAlert[];
  stats: RevenueStats;

  // Shared Global Blacklist Network (Ortak Kara Liste Ağı)
  blacklist: BlacklistEntry[];
  globalBlacklist: BlacklistEntry[];

  // Appointments & Waitlist (Scoped to Current Shop, except No-Show writes to Global Blacklist)
  addAppointment: (apt: Omit<Appointment, "id" | "appointmentCode">) => Appointment;
  addBlockedTimeRange: (input: BlockedTimeRangeInput) => Appointment;
  removeAppointmentOrBlock: (id: string) => void;
  addWaitlistEntry: (
    entry: Omit<WaitlistEntry, "id" | "createdAt" | "notified">
  ) => WaitlistEntry;
  markAppointmentCompleted: (id: string) => void;
  confirmAppointment: (id: string) => void;
  checkHasActiveAppointmentForDay: (
    phone: string,
    dayId: string
  ) => Appointment | undefined;
  markAppointmentNoShow: (
    id: string,
    customDeposit?: number
  ) => {
    blacklistedPhone: string;
    notifiedWaitlist?: WaitlistEntry;
  };
  removeFromBlacklist: (phone: string) => void;
  sendWhatsAppReminder: (id: string) => void;
  notifyWaitlistCustomer: (id: string) => void;
  isPhoneBlacklisted: (phone: string) => BlacklistEntry | undefined;

  // Customer Self-Service (Lookup, Cancel, Reschedule - Scoped to Current Shop)
  findCustomerAppointments: (query: string) => Appointment[];
  cancelAppointmentByCustomer: (id: string) => {
    cancelledApt?: Appointment;
    notifiedCount: number;
    alertText: string;
  };
  rescheduleAppointmentByCustomer: (
    id: string,
    newDayId: string,
    newDateLabel: string,
    newTime: string
  ) => Appointment | undefined;
  shiftAppointmentToEarlySlot: (
    id: string,
    newTime: string,
    newDayId?: string,
    newDateLabel?: string
  ) => Appointment | undefined;

  // Barbers / Employees & Chairs CRUD + Custom Pricing (Scoped to Current Shop)
  addBarber: (barberData: Omit<Barber, "id">) => Barber;
  updateBarber: (id: string, updated: Partial<Barber>) => void;
  deleteBarber: (id: string) => void;
  updateAppointmentBarber: (
    appointmentId: string,
    barberId: string,
    barberName: string,
    chairLabel: string
  ) => void;
  updateAppointmentPhone: (appointmentId: string, newPhone: string) => void;
  getServicePriceForBarber: (service: Service, barber?: Barber | null) => number;

  // Services CRUD (Scoped to Current Shop)
  updateService: (id: string, updated: Partial<Service>) => void;
  addService: (service: Omit<Service, "id">) => Service;
  deleteService: (id: string) => void;

  // Shop Schedule Settings (Scoped to Current Shop)
  updateShopSettings: (updated: Partial<ShopSettings>) => void;
  toggleShopBreak: (targetDayId?: string) => void;
  toggleClosedDay: (dayOfWeek: number) => void;
  getSlotsForDay: (dayId: string, barberId?: string) => TimeSlot[];

  // Admin Alerts (Scoped to Current Shop)
  dismissAdminAlert: (id: string) => void;
  clearAllAdminAlerts: () => void;

  // Reset All Demo Data
  resetDemoData: () => void;
}

const STORAGE_KEYS = {
  SHOPS: "vip_barber_saas_shops_v4",
  GLOBAL_BLACKLIST: "vip_barber_saas_global_blacklist_v4",
  MASTER_PIN: "vip_barber_saas_master_pin_v4",
  DISMISSED_ALERTS: "vip_barber_dismissed_alerts_v1",
  DELETED_SHOPS: "vip_barber_deleted_slugs_v1",
};

export function getDeletedShopSlugs(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_SHOPS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

export function recordDeletedShopSlug(slug: string) {
  if (typeof window === "undefined" || !slug) return;
  try {
    const current = getDeletedShopSlugs();
    current.add(slug.toLowerCase().trim());
    localStorage.setItem(
      STORAGE_KEYS.DELETED_SHOPS,
      JSON.stringify(Array.from(current))
    );
  } catch {}
}

export function getDismissedAlertIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DISMISSED_ALERTS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

export function recordDismissedAlertId(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const current = getDismissedAlertIds();
    current.add(id);
    localStorage.setItem(
      STORAGE_KEYS.DISMISSED_ALERTS,
      JSON.stringify(Array.from(current))
    );
  } catch {}
}

const BarberContext = createContext<BarberContextType | undefined>(undefined);

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) {
    return "0" + digits;
  }
  return digits;
}

export function slugifyShopName(text: string): string {
  const trMap: Record<string, string> = {
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ı: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ş: "s",
    Ş: "s",
    ü: "u",
    Ü: "u",
  };
  return text
    .split("")
    .map((ch) => trMap[ch] || ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generateAppointmentCode(shopSlug?: string): string {
  const prefix = shopSlug
    ? shopSlug
        .replace(/[^a-zA-Z]/g, "")
        .slice(0, 3)
        .toUpperCase() || "BRB"
    : "BRB";
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `#${prefix}-${randomNum}`;
}

export function generateVerificationCode(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `#${randomNum}`;
}

export function validateTurkishMobilePhone(phone: string): {
  isValid: boolean;
  error?: string;
  cleanPhone: string;
  formattedPhone: string;
} {
  const digits = phone.replace(/\D/g, "");
  let normalized = digits;
  if (normalized.startsWith("90") && normalized.length === 12) {
    normalized = normalized.substring(2);
  }
  if (normalized.length === 10 && normalized.startsWith("5")) {
    normalized = "0" + normalized;
  }

  if (normalized.length !== 11 || !normalized.startsWith("05")) {
    return {
      isValid: false,
      error: "Lütfen 05XX XXX XX XX formatında geçerli bir cep telefonu numarası giriniz.",
      cleanPhone: normalized,
      formattedPhone: phone,
    };
  }

  const prefix3 = normalized.substring(0, 3);
  const validMobilePrefixes = ["050", "051", "052", "053", "054", "055", "056"];
  if (!validMobilePrefixes.includes(prefix3)) {
    return {
      isValid: false,
      error: "Geçersiz operatör kodu. Numaranız 053X, 054X, 055X veya 050X ile başlamalıdır.",
      cleanPhone: normalized,
      formattedPhone: phone,
    };
  }

  const restOfNumber = normalized.substring(2);
  const last7 = normalized.substring(4);
  const isAllSameLast7 = /^(\d)\1{6}$/.test(last7);
  const isAllSame9 = /^(\d)\1{8}$/.test(restOfNumber);
  const sequentialAsc = "0123456789012345";
  const sequentialDesc = "9876543210987654";
  const isSequential =
    sequentialAsc.includes(last7) || sequentialDesc.includes(last7);

  if (
    isAllSameLast7 ||
    isAllSame9 ||
    isSequential ||
    last7 === "0000000" ||
    restOfNumber === "5551234567" ||
    last7 === "1234567"
  ) {
    return {
      isValid: false,
      error: "Lütfen gerçek bir cep telefonu numarası giriniz (Sahte veya tekrarlı numara tespit edildi).",
      cleanPhone: normalized,
      formattedPhone: phone,
    };
  }

  const formatted = `${normalized.substring(0, 4)} ${normalized.substring(4, 7)} ${normalized.substring(7, 9)} ${normalized.substring(9, 11)}`;

  return {
    isValid: true,
    cleanPhone: normalized,
    formattedPhone: formatted,
  };
}

function deduplicateServices(list: Service[]): Service[] {
  const map = new Map<string, Service>();
  for (const item of list) {
    const key = item.name.trim().toLocaleLowerCase("tr-TR");
    if (map.has(key)) {
      const existing = map.get(key)!;
      map.set(key, {
        ...existing,
        price: item.price,
        duration: item.duration,
        description: item.description || existing.description,
        vip: item.vip ?? existing.vip,
      });
    } else {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

/**
 * Normalizes any legacy/hardcoded dayId ("day-1", etc.) or outdated dateLabel
 * into real-time Türkiye dates (new Date()) and sorts appointments chronologically (09:00 -> 21:00).
 * Ayrıca daha önce "Tamam" ile kapatılmış (dismissed) uyarıları kalıcı olarak filtreler.
 */
function sanitizeShopDates(shop: TenantShop): TenantShop {
  const dismissedSet = getDismissedAlertIds();

  const sanitizedAppointments = (shop.appointments || [])
    .map((apt) => {
      const strictDate = getAppointmentIsoDate(apt) || toStrictIsoDate(apt.dayId);
      const resolved = resolveDayMetadata(strictDate);
      return {
        ...apt,
        dayId: resolved.id,
        date: resolved.id,
        appointment_date: resolved.id,
        appointment_time: apt.time,
        dateLabel: resolved.chipLabel,
      };
    })
    .sort((a, b) => {
      if (a.dayId !== b.dayId) {
        return a.dayId.localeCompare(b.dayId);
      }
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });

  const sanitizedWaitlist = (shop.waitlist || []).map((wl) => {
    const strictDate = toStrictIsoDate(wl.dayId);
    const resolved = resolveDayMetadata(strictDate);
    return {
      ...wl,
      dayId: resolved.id,
      requestedDateLabel: resolved.label,
    };
  });

  const sanitizedAlerts = (shop.adminAlerts || []).filter(
    (a) => !dismissedSet.has(a.id)
  );

  return {
    ...shop,
    adminPin: shop.adminPin || "1234",
    shopSettings: {
      ...shop.shopSettings,
      breakEnabled: false,
    },
    barbers: (shop.barbers || []).map((b) => ({
      ...b,
      commissionRate:
        typeof b.commissionRate === "number" ? b.commissionRate : 50,
    })),
    services: deduplicateServices(shop.services || []),
    appointments: sanitizedAppointments,
    waitlist: sanitizedWaitlist,
    adminAlerts: sanitizedAlerts,
  };
}

/**
 * Supabase bulut verisini öncelikli ve kesin doğru kabul eder.
 * Silinen dükkan ve randevular ASLA geri diriltilmez.
 */
function mergeShopsSafely(
  localShops: TenantShop[],
  remoteShops: TenantShop[]
): TenantShop[] {
  const deletedSlugs = getDeletedShopSlugs();
  if (!Array.isArray(remoteShops) || remoteShops.length === 0) {
    return (localShops || []).filter(
      (s) => !deletedSlugs.has(s.slug.toLowerCase())
    );
  }
  return remoteShops
    .map(sanitizeShopDates)
    .filter((s) => !deletedSlugs.has(s.slug.toLowerCase()));
}

// Helper component that syncs URL (both `/:slug` path and `?shop=:slug` query) with context state
function ShopUrlQuerySync({
  onSlugChange,
}: {
  onSlugChange: (slugFromUrl: string | null) => void;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const shopParam = searchParams?.get("shop") || null;

  useEffect(() => {
    if (shopParam) {
      onSlugChange(shopParam);
      return;
    }

    if (pathname) {
      const parts = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
      let clean = parts[0]?.trim();
      if (clean?.toLowerCase() === "s" && parts[1]) {
        clean = parts[1].trim();
      }
      const reserved = [
        "admin",
        "super-admin",
        "api",
        "favicon.ico",
        "manifest.json",
        "sw.js",
      ];
      if (clean && !reserved.includes(clean.toLowerCase())) {
        onSlugChange(clean);
        return;
      }
    }

    onSlugChange(null);
  }, [shopParam, pathname, onSlugChange]);

  return null;
}

export function BarberProvider({ children }: { children: React.ReactNode }) {
  const [shops, setShops] = useState<TenantShop[]>(INITIAL_SHOPS);
  const [globalBlacklist, setGlobalBlacklist] = useState<BlacklistEntry[]>(
    INITIAL_GLOBAL_BLACKLIST
  );
  const [currentShopSlug, setCurrentShopSlugState] = useState<string>("atelier-noir");
  const [hasShopQueryParam, setHasShopQueryParam] = useState<boolean>(false);
  const [masterPin, setMasterPinState] = useState<string>("1923");
  const [hydrated, setHydrated] = useState(false);

  // Realtime çakışmasını (echo / ping-pong döngüsünü) önleyen istemci ve işlem kilitleri
  const clientIdRef = useRef<string>(
    `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );
  const inFlightWritesRef = useRef<number>(0);
  const lastLocalMutationAtRef = useRef<number>(0);
  const isApplyingRemoteRef = useRef<boolean>(false);

  const loadFromStorage = useCallback(() => {
    try {
      const deletedSlugs = getDeletedShopSlugs();
      const savedShops = localStorage.getItem(STORAGE_KEYS.SHOPS);
      const savedBlacklist = localStorage.getItem(STORAGE_KEYS.GLOBAL_BLACKLIST);
      const savedMasterPin = localStorage.getItem(STORAGE_KEYS.MASTER_PIN);

      if (savedShops) {
        const parsed: TenantShop[] = JSON.parse(savedShops);
        if (Array.isArray(parsed)) {
          const filtered = parsed
            .map(sanitizeShopDates)
            .filter((s) => !deletedSlugs.has(s.slug.toLowerCase()));
          setShops(filtered);
        }
      }

      if (savedBlacklist) {
        const parsedBl: BlacklistEntry[] = JSON.parse(savedBlacklist);
        if (Array.isArray(parsedBl) && parsedBl.length > 0) {
          setGlobalBlacklist(parsedBl);
        }
      }

      if (savedMasterPin && savedMasterPin.trim()) {
        setMasterPinState(savedMasterPin.trim());
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  // Doğrudan hem localStorage'a hem de Supabase'e anında güvenli yazma fonksiyonu (Optimistic Update + Tek Seferlik DB Yazımı)
  const syncDirectlyToCloud = useCallback(
    async (
      nextShops: TenantShop[],
      nextBlacklist?: BlacklistEntry[],
      nextMasterPin?: string
    ): Promise<void> => {
      lastLocalMutationAtRef.current = Date.now();
      try {
        localStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(nextShops));
        if (nextBlacklist) {
          localStorage.setItem(
            STORAGE_KEYS.GLOBAL_BLACKLIST,
            JSON.stringify(nextBlacklist)
          );
        }
        if (nextMasterPin) {
          localStorage.setItem(STORAGE_KEYS.MASTER_PIN, nextMasterPin);
        }
      } catch {
        // ignore
      }

      if (isSupabaseConfigured && supabase) {
        inFlightWritesRef.current += 1;
        lastLocalMutationAtRef.current = Date.now();
        try {
          const { error } = await supabase.from("app_state").upsert({
            key: "global_state",
            data: {
              shops: nextShops,
              globalBlacklist: nextBlacklist || globalBlacklist,
              masterPin: nextMasterPin || masterPin,
              updatedByClientId: clientIdRef.current,
            },
            updated_at: new Date().toISOString(),
          });
          if (error) {
            console.warn("Supabase direct sync error:", error.message);
          }
        } catch (err) {
          console.warn("Supabase direct sync exception:", err);
        } finally {
          inFlightWritesRef.current = Math.max(0, inFlightWritesRef.current - 1);
          lastLocalMutationAtRef.current = Date.now();
        }
      }
    },
    [globalBlacklist, masterPin]
  );

  // 1. Initial Load: First try Supabase, fallback to localStorage
  useEffect(() => {
    let isMounted = true;

    async function initData() {
      // Step A: Load from localStorage immediately so page is never empty
      loadFromStorage();

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const initialSlug = params.get("shop");
        if (initialSlug && initialSlug.trim()) {
          setCurrentShopSlugState(initialSlug.trim().toLowerCase());
          setHasShopQueryParam(true);
        } else {
          setHasShopQueryParam(false);
          try {
            const savedSessionRaw = localStorage.getItem(
              "vip_barber_persistent_admin_session_v1"
            );
            if (savedSessionRaw) {
              const parsed = JSON.parse(savedSessionRaw);
              if (parsed?.shopSlug) {
                setCurrentShopSlugState(String(parsed.shopSlug).toLowerCase());
              }
            }
          } catch {
            // ignore
          }
        }
      }

      // Step B: Pull latest state from Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from("app_state")
            .select("key, data")
            .eq("key", "global_state")
            .maybeSingle();

          if (error) {
            console.warn("Supabase fetch error:", error.message);
          } else if (data && data.data) {
            const remote = data.data as {
              shops?: TenantShop[];
              globalBlacklist?: BlacklistEntry[];
              masterPin?: string;
            };

            if (isMounted && Array.isArray(remote.shops)) {
              const deletedSlugs = getDeletedShopSlugs();
              const sanitizedRemote = remote.shops
                .map(sanitizeShopDates)
                .filter((s) => !deletedSlugs.has(s.slug.toLowerCase()));
              isApplyingRemoteRef.current = true;
              setShops(sanitizedRemote);
              try {
                localStorage.setItem(
                  STORAGE_KEYS.SHOPS,
                  JSON.stringify(sanitizedRemote)
                );
              } catch {}
            }

            if (isMounted && Array.isArray(remote.globalBlacklist)) {
              isApplyingRemoteRef.current = true;
              setGlobalBlacklist(remote.globalBlacklist);
            }

            if (isMounted && remote.masterPin) {
              isApplyingRemoteRef.current = true;
              setMasterPinState(remote.masterPin);
            }
          } else {
            // Tablo boş ise eldeki varsayılan dükkanları buluta ilk tohumlama (seed) olarak gönder
            const seedPayload = {
              shops: INITIAL_SHOPS,
              globalBlacklist: INITIAL_GLOBAL_BLACKLIST,
              masterPin: "1923",
              updatedByClientId: clientIdRef.current,
            };
            await supabase.from("app_state").upsert({
              key: "global_state",
              data: seedPayload,
              updated_at: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.warn("Supabase init error:", err);
        }
      }

      if (isMounted) {
        setHydrated(true);
      }
    }

    initData();

    // Realtime subscription: SADECE başka bir sekme veya cihazdan gelen güncellemeleri al.
    // Kendi yaptığımız UPDATE / upsert işlemlerinin yankısını (echo) yoksay ki kartlar asla gidip gelmesin!
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel("app_state_realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "app_state",
            filter: "key=eq.global_state",
          },
          (payload: any) => {
            const nextData = payload.new?.data;
            if (!nextData) return;

            // 1. Kendi istemcimizin yaptığı güncelleme yankısıysa (echo) kesinlikle yoksay
            if (
              nextData.updatedByClientId &&
              nextData.updatedByClientId === clientIdRef.current
            ) {
              return;
            }

            // 2. Şu an aktif bir yerel yazma işlemi varsa veya son 2.5 sn içinde yerel bir butona basıldıysa
            // eski bulut paketinin yerel Optimistic Update'i ezmesine izin verme
            if (
              inFlightWritesRef.current > 0 ||
              Date.now() - lastLocalMutationAtRef.current < 2500
            ) {
              return;
            }

            setShops((prevShops) => {
              if (Array.isArray(nextData.shops)) {
                const deletedSlugs = getDeletedShopSlugs();
                const sanitizedNext = nextData.shops
                  .map(sanitizeShopDates)
                  .filter((s: TenantShop) => !deletedSlugs.has(s.slug.toLowerCase()));
                if (JSON.stringify(prevShops) !== JSON.stringify(sanitizedNext)) {
                  isApplyingRemoteRef.current = true;
                  try {
                    localStorage.setItem(
                      STORAGE_KEYS.SHOPS,
                      JSON.stringify(sanitizedNext)
                    );
                  } catch {}
                  return sanitizedNext;
                }
              }
              return prevShops;
            });

            setGlobalBlacklist((prevBl) => {
              if (
                Array.isArray(nextData.globalBlacklist) &&
                JSON.stringify(prevBl) !== JSON.stringify(nextData.globalBlacklist)
              ) {
                isApplyingRemoteRef.current = true;
                return nextData.globalBlacklist;
              }
              return prevBl;
            });

            if (nextData.masterPin) {
              setMasterPinState((prev) => {
                if (prev !== nextData.masterPin) {
                  isApplyingRemoteRef.current = true;
                  return nextData.masterPin;
                }
                return prev;
              });
            }
          }
        )
        .subscribe();
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (
        inFlightWritesRef.current > 0 ||
        Date.now() - lastLocalMutationAtRef.current < 1500
      ) {
        return;
      }
      if (
        !e.key ||
        e.key === STORAGE_KEYS.SHOPS ||
        e.key === STORAGE_KEYS.GLOBAL_BLACKLIST ||
        e.key === STORAGE_KEYS.MASTER_PIN
      ) {
        loadFromStorage();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorageChange);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadFromStorage]);

  // 2. State her değiştiğinde: LocalStorage'a kaydet; eğer doğrudan syncDirectlyToCloud çağrılmadıysa yedek olarak buluta yaz
  useEffect(() => {
    if (!hydrated) return;

    // A) LocalStorage kaydet
    try {
      localStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(shops));
      localStorage.setItem(
        STORAGE_KEYS.GLOBAL_BLACKLIST,
        JSON.stringify(globalBlacklist)
      );
      localStorage.setItem(STORAGE_KEYS.MASTER_PIN, masterPin);
    } catch {
      // ignore
    }

    // Uzak sunucudan gelen güncelleme uygulanıyorsa tekrar buluta geri gönderme (sonsuz döngü önleme)
    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      return;
    }

    // Eğer syncDirectlyToCloud zaten az önce çalıştıysa ikinci kez (çift) upsert atma!
    if (
      inFlightWritesRef.current > 0 ||
      Date.now() - lastLocalMutationAtRef.current < 1500
    ) {
      return;
    }

    // B) Supabase Bulutuna Asenkron Kaydet (Sadece doğrudan sync çağrılmayan yan state değişimleri için)
    if (isSupabaseConfigured && supabase) {
      const timeout = setTimeout(async () => {
        if (
          inFlightWritesRef.current > 0 ||
          Date.now() - lastLocalMutationAtRef.current < 1200
        ) {
          return;
        }
        inFlightWritesRef.current += 1;
        lastLocalMutationAtRef.current = Date.now();
        try {
          await supabase!.from("app_state").upsert({
            key: "global_state",
            data: {
              shops,
              globalBlacklist,
              masterPin,
              updatedByClientId: clientIdRef.current,
            },
            updated_at: new Date().toISOString(),
          });
        } catch (err) {
          console.warn("Supabase sync write error:", err);
        } finally {
          inFlightWritesRef.current = Math.max(0, inFlightWritesRef.current - 1);
          lastLocalMutationAtRef.current = Date.now();
        }
      }, 400);

      return () => clearTimeout(timeout);
    }
  }, [shops, globalBlacklist, masterPin, hydrated]);

  const handleUrlSlugChange = useCallback((slugFromUrl: string | null) => {
    if (slugFromUrl && slugFromUrl.trim()) {
      const cleaned = slugFromUrl.trim().toLowerCase();
      setCurrentShopSlugState((prev) => (prev === cleaned ? prev : cleaned));
      setHasShopQueryParam(true);
    } else {
      setHasShopQueryParam(false);
    }
  }, []);

  const setCurrentShopSlug = useCallback((slug: string) => {
    const cleaned = slug.trim().toLowerCase();
    setCurrentShopSlugState(cleaned);
  }, []);

  const currentShop = useMemo(() => {
    return (
      shops.find((s) => s.slug.toLowerCase() === currentShopSlug.toLowerCase()) ||
      shops[0] ||
      INITIAL_SHOPS[0]
    );
  }, [shops, currentShopSlug]);

  // Is the requested shop (via ?shop=slug) actually registered? (false if deleted)
  const currentShopExists = useMemo(() => {
    if (shops.length === 0) return false;
    if (!hasShopQueryParam) return true;
    return shops.some(
      (s) => s.slug.toLowerCase() === currentShopSlug.toLowerCase()
    );
  }, [shops, currentShopSlug, hasShopQueryParam]);

  // Helper to update ONLY the current active shop in `shops` (Optimistic Local Update + Single Direct Cloud Write)
  const updateCurrentShop = useCallback(
    (updater: (shop: TenantShop) => TenantShop) => {
      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) =>
          shop.slug === currentShop.slug ? updater(shop) : shop
        );
        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [currentShop.slug, syncDirectlyToCloud]
  );

  // SUPER ADMIN: Add a new isolated Barber Shop Tenant
  const addShop = useCallback((input: NewShopInput): TenantShop => {
    const cleanSlug =
      slugifyShopName(input.slug || input.name) || `berber-${Date.now()}`;
    const displayName = input.name.trim() || "Yeni VIP Berber";

    const newTenant: TenantShop = {
      slug: cleanSlug,
      name: displayName,
      subtitle: "VIP Grooming & Gentlemen's Club",
      phone: input.phone.trim() || "0212 555 00 00",
      district: input.district?.trim() || "İstanbul",
      monthlyFee: Math.max(0, Number(input.monthlyFee) || 1000),
      subscriptionStatus: "active",
      subscriptionEndDate: input.subscriptionEndDate?.trim() || "30 Gün Sonra",
      createdAt: "Bugün",
      adminPin: input.adminPin?.trim() || "1234",
      depositPolicy: "require_deposit",
      depositAmount: 100,
      barbers: [
        {
          id: "any",
          name: "Fark Etmez (En Erken Saat)",
          role: `Akıllı Koltuk Eşleştirme • ${displayName} Standart Tarife`,
          chairName: "İlk Müsait VIP Koltuk",
          rating: 4.95,
          reviewCount: 120,
          experience: "Tüm Ustalar",
          earliestSlot: "Bugün En Erken",
          specialties: ["En Erken Saat Garantisi", "Standart Tarife", "Hızlı Onay"],
          isAnyOption: true,
          badge: "En Hızlı Seçenek",
          avatarGradient: "from-[#b47b48] via-[#c88a53] to-[#8c5828]",
          initials: "VIP",
          commissionRate: 50,
          customPrices: {},
        },
        {
          id: `${cleanSlug}-master`,
          name: `Başberber (${displayName.split(" ")[0]})`,
          role: "Kurucu & Master Barber",
          chairName: "VIP Koltuk #1 (Gold Deri Süit)",
          rating: 4.98,
          reviewCount: 85,
          experience: "14 Yıl Deneyim",
          earliestSlot: "VIP Koltuk #1",
          specialties: ["Anatomik Saç Kesimi", "Sıcak Havlu Sakal", "VIP Damat"],
          badge: "Master Barber • %100 Kasa",
          avatarGradient: "from-[#3b281c] via-[#261a12] to-[#14100d]",
          initials: "MB",
          commissionRate: 100,
          customPrices: {
            [`${cleanSlug}-haircut`]: 500,
          },
        },
        {
          id: `${cleanSlug}-stylist`,
          name: "Stilist Emir",
          role: "Senior Fade & Sakal Uzmanı",
          chairName: "Koltuk #2 (Studio Zone)",
          rating: 4.92,
          reviewCount: 64,
          experience: "8 Yıl Deneyim",
          earliestSlot: "Koltuk #2",
          specialties: ["Skin Fade", "Modern Crop", "Sakal Kontür"],
          badge: "Trend Uzmanı • %40 Prim",
          avatarGradient: "from-[#4a3222] via-[#2d1e15] to-[#14100d]",
          initials: "SE",
          commissionRate: 40,
          customPrices: {},
        },
      ],
      services: [
        {
          id: `${cleanSlug}-haircut`,
          name: "Saç Kesimi",
          description: "Kafa anatomisine özel saç kesimi, yıkama ve fön ile şekillendirme.",
          price: 400,
          duration: 30,
          category: "hair",
          popular: true,
        },
        {
          id: `${cleanSlug}-beard`,
          name: "Sakal Tıraşı & Tasarımı",
          description: "Sıcak havlu kompresi, geleneksel ustura ve organik sakal bakımı.",
          price: 200,
          duration: 15,
          category: "beard",
          popular: true,
        },
        {
          id: `${cleanSlug}-combo`,
          name: "Saç & Sakal Komple Bakım",
          description: "Anatomik saç kesimi, sıcak havlulu sakal tıraşı, yıkama ve maske.",
          price: 550,
          duration: 45,
          category: "package",
          popular: true,
        },
        {
          id: `${cleanSlug}-vip`,
          name: "VIP Damat & Özel Gün Paketi",
          description: "Özel koltukta tam bakım, cilt bakımı, keratin spa ve espresso ikramı.",
          price: 1500,
          duration: 90,
          category: "package",
          vip: true,
        },
      ],
      shopSettings: {
        openTime: "09:00",
        closeTime: "21:00",
        slotInterval: 30,
        breakEnabled: false,
        breakStart: "13:00",
        breakEnd: "14:00",
        closedDays: [0],
      },
      appointments: [],
      waitlist: [],
      adminAlerts: [],
      stats: {
        savedRevenue: 0,
        waitlistFilled: 0,
        preventedNoShows: 0,
      },
    };

    setShops((prev) => {
      const exists = prev.some((s) => s.slug === cleanSlug);
      const nextShops = exists
        ? prev.map((s) => (s.slug === cleanSlug ? newTenant : s))
        : [...prev, newTenant];
      void syncDirectlyToCloud(nextShops);
      return nextShops;
    });

    return newTenant;
  }, [syncDirectlyToCloud]);

  // SUPER ADMIN: Freeze / Activate / Expire Subscription Toggle
  const toggleShopSubscription = useCallback(
    (slug: string) => {
      setShops((prev) => {
        const nextShops = prev.map((shop) => {
          if (shop.slug !== slug) return shop;
          const nextStatus: SubscriptionStatus =
            shop.subscriptionStatus === "active" ? "expired" : "active";
          return {
            ...shop,
            subscriptionStatus: nextStatus,
            subscriptionEndDate:
              nextStatus === "active"
                ? "30 Gün Sonra"
                : shop.subscriptionEndDate || "Süresi Doldu",
          };
        });

        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [syncDirectlyToCloud]
  );

  // SUPER ADMIN: Explicitly Update Subscription Status & End Date
  const updateShopSubscription = useCallback(
    (slug: string, status: SubscriptionStatus, endDate?: string) => {
      setShops((prev) => {
        const nextShops = prev.map((shop) =>
          shop.slug === slug
            ? {
                ...shop,
                subscriptionStatus: status,
                subscriptionEndDate:
                  endDate !== undefined ? endDate : shop.subscriptionEndDate,
              }
            : shop
        );

        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [syncDirectlyToCloud]
  );

  // SUPER ADMIN: Update Specific Shop's PIN
  const updateShopPinBySlug = useCallback(
    (slug: string, newPin: string) => {
      const cleaned = newPin.trim();
      if (!cleaned) return;
      setShops((prevShops) => {
        const nextShops = prevShops.map((s) =>
          s.slug === slug ? { ...s, adminPin: cleaned } : s
        );

        void syncDirectlyToCloud(nextShops);

        try {
          const target = slug.trim().toLowerCase();
          localStorage.removeItem(`vip_barber_admin_unlocked_${target}`);
          sessionStorage.removeItem(`vip_barber_admin_unlocked_${target}`);
          const savedSessionRaw = localStorage.getItem(
            "vip_barber_persistent_admin_session_v1"
          );
          if (savedSessionRaw) {
            const parsed = JSON.parse(savedSessionRaw);
            if (parsed?.shopSlug?.toLowerCase() === target) {
              localStorage.removeItem("vip_barber_persistent_admin_session_v1");
            }
          }
        } catch {
          // ignore
        }

        return nextShops;
      });
    },
    [syncDirectlyToCloud]
  );

  // SUPER ADMIN & SHOP ADMIN: Update Shop Details (Name, Phone, District, Fee, Subtitle)
  const updateShopDetails = useCallback(
    (slug: string, details: UpdateShopDetailsInput) => {
      const targetSlug = slug.trim().toLowerCase();
      if (!targetSlug) return;

      setShops((prevShops) => {
        const nextShops = prevShops.map((s) => {
          if (s.slug.toLowerCase() !== targetSlug) return s;
          return {
            ...s,
            name:
              details.name !== undefined && details.name.trim()
                ? details.name.trim()
                : s.name,
            phone:
              details.phone !== undefined && details.phone.trim()
                ? details.phone.trim()
                : s.phone,
            district:
              details.district !== undefined && details.district.trim()
                ? details.district.trim()
                : s.district,
            monthlyFee:
              details.monthlyFee !== undefined
                ? Math.max(0, Number(details.monthlyFee) || 0)
                : s.monthlyFee,
            subtitle:
              details.subtitle !== undefined
                ? details.subtitle.trim()
                : s.subtitle,
            iban:
              details.iban !== undefined
                ? details.iban.trim()
                : s.iban,
            depositAmount:
              details.depositAmount !== undefined
                ? Math.max(0, Number(details.depositAmount) || 0)
                : s.depositAmount,
          };
        });

        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [syncDirectlyToCloud]
  );

  // SUPER ADMIN: Permanently delete a shop (and all of its data) from global_state
  const deleteShop = useCallback(
    (slug: string) => {
      const target = slug.trim().toLowerCase();
      if (!target) return;

      recordDeletedShopSlug(target);

      setShops((prevShops) => {
        const nextShops = prevShops.filter(
          (s) => s.slug.toLowerCase() !== target
        );

        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });

      // Silinen dükkanın açık admin oturumunu kapat
      try {
        localStorage.removeItem(`vip_barber_admin_unlocked_${target}`);
        sessionStorage.removeItem(`vip_barber_admin_unlocked_${target}`);
        const savedSessionRaw = localStorage.getItem(
          "vip_barber_persistent_admin_session_v1"
        );
        if (savedSessionRaw) {
          const parsed = JSON.parse(savedSessionRaw);
          if (parsed?.shopSlug?.toLowerCase() === target) {
            localStorage.removeItem("vip_barber_persistent_admin_session_v1");
          }
        }
      } catch {
        // ignore
      }
    },
    [syncDirectlyToCloud]
  );

  // SHOP ADMIN: Update Current Shop's Deposit Policy & Amount
  const updateCurrentShopDepositPolicy = useCallback(
    (policy: DepositPolicyType, amount: number) => {
      updateCurrentShop((shop) => ({
        ...shop,
        depositPolicy: policy,
        depositAmount: Math.max(0, Number(amount) || 100),
      }));
    },
    [updateCurrentShop]
  );

  // SHOP ADMIN: Update Current Shop's 4-Digit PIN
  const updateCurrentShopPin = useCallback(
    (newPin: string) => {
      const cleaned = newPin.trim();
      if (!cleaned) return;
      updateCurrentShop((shop) => ({
        ...shop,
        adminPin: cleaned,
      }));
    },
    [updateCurrentShop]
  );

  // SUPER ADMIN: Update Master PIN
  const updateMasterPin = useCallback((newPin: string) => {
    const cleaned = newPin.trim();
    if (!cleaned) return;
    setMasterPinState(cleaned);
  }, []);

  // GLOBAL BLACKLIST CHECK (Ortak Kara Liste Ağı)
  const isPhoneBlacklisted = useCallback(
    (phone: string): BlacklistEntry | undefined => {
      const clean = normalizePhone(phone);
      if (!clean || clean.length < 10) return undefined;
      return globalBlacklist.find((entry) => normalizePhone(entry.phone) === clean);
    },
    [globalBlacklist]
  );

  // Custom Per-Barber Price Resolver
  const getServicePriceForBarber = useCallback(
    (service: Service, barber?: Barber | null): number => {
      if (!barber || !barber.customPrices) return service.price;
      const customPrice = barber.customPrices[service.id];
      return typeof customPrice === "number" && !Number.isNaN(customPrice)
        ? customPrice
        : service.price;
    },
    []
  );

  // Dynamic Slot Generator for Current Shop (Koltuk / Personel Bazlı & Kesin YYYY-MM-DD Tarih Eşleştirmeli)
  const getSlotsForDay = useCallback(
    (dayId: string, barberId?: string): TimeSlot[] => {
      const { shopSettings, appointments, barbers } = currentShop;
      const realBarbers = barbers.filter((b) => !b.isAnyOption);
      // KESİN ÇÖZÜM: Seçili tarihi YYYY-MM-DD formatında birebir eşleştir
      const selectedDate = toStrictIsoDate(dayId);
      const startMins = timeToMinutes(shopSettings.openTime);
      const endMins = timeToMinutes(shopSettings.closeTime);
      const interval = Math.max(15, shopSettings.slotInterval || 30);

      const slots: TimeSlot[] = [];

      // SADECE seçili tarihe (appointment_date === selectedDate) ait aktif randevu ve mola bloklarını filtrele!
      // Başka günün randevusu veya molası asla diğer günlerde görünmez.
      const dayAppointments = appointments
        .filter((a) => {
          const appointmentDate = getAppointmentIsoDate(a);
          return (
            appointmentDate === selectedDate &&
            a.status !== "cancelled" &&
            a.status !== "no_show"
          );
        })
        .map((a) => {
          const startM = timeToMinutes(a.appointment_time || a.time);
          const dur = a.totalDuration || 30;
          const endM = a.endTime ? timeToMinutes(a.endTime) : startM + dur;
          return { ...a, startM, endM };
        });

      for (let m = startMins; m + interval <= endMins; m += interval) {
        const timeLabel = minutesToTime(m);

        // 1. Seçili güne (selectedDate) ait bloke edilmiş saat aralığı veya öğle molası kontrolü
        const shopBlock = dayAppointments.find((a) => {
          if (!a.isBlockedSlot) return false;
          // Eğer blokaj belirli bir ustaya özel ise ve başka bir usta sorgulanıyorsa bloke etmez
          if (
            barberId &&
            barberId !== "any" &&
            a.barberId &&
            a.barberId !== "all" &&
            a.barberId !== barberId
          ) {
            return false;
          }
          return m < a.endM && m + interval > a.startM;
        });

        if (shopBlock) {
          const isBreakBlock =
            shopBlock.blockReason?.toLowerCase().includes("mola") ||
            shopBlock.blockReason?.toLowerCase().includes("öğle") ||
            shopBlock.blockReason?.toLowerCase().includes("yemek") ||
            shopBlock.customerName?.toLowerCase().includes("mola");

          slots.push({
            time: timeLabel,
            available: false,
            state: isBreakBlock ? "break" : "booked",
            bookedBy: shopBlock.customerName || "Kapalı / Mola",
          });
          continue;
        }

        // 2. Personel / Koltuk Bazlı Doluluk Kontrolü (Sadece selectedDate === appointment_date için)
        if (barberId && barberId !== "any") {
          const activeApt = dayAppointments.find((a) => {
            if (a.isBlockedSlot) return false;
            const matchBarber =
              a.barberId === barberId ||
              (a.barberName &&
                a.barberName.toLowerCase().includes(barberId.toLowerCase()));
            if (!matchBarber) return false;
            return m < a.endM && m + interval > a.startM;
          });

          if (activeApt) {
            slots.push({
              time: timeLabel,
              available: false,
              state: "booked",
              bookedBy: `${activeApt.customerName} (${activeApt.barberName})`,
            });
          } else {
            slots.push({
              time: timeLabel,
              available: true,
              state: "available",
            });
          }
        } else {
          // "Fark Etmez / Tümü":
          // Bir saat sadece salondaki TÜM ustalar o gün o saatte meşgulse dolu sayılır; en az 1 usta boşsa saat boştur!
          const bookedBarberIds = new Set(
            dayAppointments
              .filter((a) => {
                if (a.isBlockedSlot) return false;
                return m < a.endM && m + interval > a.startM;
              })
              .map((a) => a.barberId)
          );

          const allBarbersBooked =
            realBarbers.length > 0 &&
            realBarbers.every((b) => bookedBarberIds.has(b.id));

          if (allBarbersBooked) {
            slots.push({
              time: timeLabel,
              available: false,
              state: "booked",
              bookedBy: "Tüm Koltuklar Dolu",
            });
          } else {
            slots.push({
              time: timeLabel,
              available: true,
              state: "available",
            });
          }
        }
      }

      return slots;
    },
    [currentShop]
  );

  // Add Appointment to Current Shop
  const addAppointment = useCallback(
    (newAptData: Omit<Appointment, "id" | "appointmentCode">): Appointment => {
      const selectedDate = toStrictIsoDate(
        newAptData.appointment_date || newAptData.date || newAptData.dayId
      );
      const resolvedDay = resolveDayMetadata(selectedDate);
      const isBlacklisted = Boolean(isPhoneBlacklisted(newAptData.customerPhone));
      // KESİN GÜVENLİK KİLİDİ: Kara listedeki müşteri ASLA confirmed olamaz!
      const safeStatus: AppointmentStatus = isBlacklisted ? "pending" : newAptData.status;
      const vCode =
        newAptData.verificationCode ||
        (safeStatus === "pending" ? generateVerificationCode() : undefined);
      const newApt: Appointment = {
        ...newAptData,
        status: safeStatus,
        requiresDeposit: isBlacklisted || newAptData.requiresDeposit,
        isBlacklisted: isBlacklisted || newAptData.isBlacklisted,
        dayId: selectedDate,
        date: selectedDate,
        appointment_date: selectedDate,
        appointment_time: newAptData.time,
        dateLabel: resolvedDay.chipLabel,
        id: `apt-${Date.now()}`,
        appointmentCode: generateAppointmentCode(currentShop.slug),
        verificationCode: vCode,
      };

      const servicesSummary = newApt.services.map((s) => s.name).join(" + ");
      const isOnlineCustomerBooking =
        !newApt.isBlockedSlot && newApt.bookingSource !== "phone";

      const now = new Date();
      const timeStampStr = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) => {
          if (shop.slug !== currentShop.slug) return shop;

          const newBookingAlert = isOnlineCustomerBooking
            ? [
                {
                  id: `alert-booking-${newApt.id}`,
                  title:
                    newApt.status === "pending"
                      ? `🔔 YENİ RANDEVU (${vCode || "Onay Bekliyor"}): ${newApt.customerName} - ${newApt.time}`
                      : `🔔 YENİ RANDEVU GELDİ: ${newApt.customerName} - ${newApt.time}`,
                  message: `${newApt.dateLabel} saat ${newApt.time} • ${servicesSummary} (${newApt.totalPrice} TL) • Tel: ${newApt.customerPhone}`,
                  timestamp: timeStampStr,
                  type: "new_booking" as const,
                  read: false,
                  appointmentId: newApt.id,
                  customerName: newApt.customerName,
                  customerPhone: newApt.customerPhone,
                  time: newApt.time,
                  dateLabel: newApt.dateLabel,
                  servicesSummary,
                },
                ...shop.adminAlerts,
              ]
            : shop.adminAlerts;

          return {
            ...shop,
            appointments: [...shop.appointments, newApt].sort((a, b) => {
              const dateA = getAppointmentIsoDate(a);
              const dateB = getAppointmentIsoDate(b);
              if (dateA !== dateB) return dateA.localeCompare(dateB);
              return timeToMinutes(a.time) - timeToMinutes(b.time);
            }),
            adminAlerts: newBookingAlert,
            stats: newApt.depositAmount
              ? {
                  ...shop.stats,
                  savedRevenue: shop.stats.savedRevenue + newApt.totalPrice,
                  preventedNoShows: shop.stats.preventedNoShows + 1,
                }
              : shop.stats,
          };
        });

        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });

      if (isOnlineCustomerBooking) {
        triggerAutomaticBookingNotification({
          appointmentId: newApt.id,
          appointmentCode: newApt.appointmentCode,
          shopSlug: currentShop.slug,
          shopName: currentShop.name,
          shopPhone: currentShop.phone,
          customerName: newApt.customerName,
          customerPhone: newApt.customerPhone,
          barberName: newApt.barberName,
          dateLabel: newApt.dateLabel,
          time: newApt.time,
          servicesSummary,
          totalPrice: newApt.totalPrice,
          createdAtIso: now.toISOString(),
        });
      }

      return newApt;
    },
    [currentShop.slug, currentShop.name, currentShop.phone, isPhoneBlacklisted, syncDirectlyToCloud]
  );

  // Add Blocked Time Range (Özel Durum / Saati Kapat)
  const addBlockedTimeRange = useCallback(
    (input: BlockedTimeRangeInput): Appointment => {
      const selectedDate = toStrictIsoDate(input.dayId);
      const resolvedDay = resolveDayMetadata(selectedDate);
      const startM = timeToMinutes(input.startTime);
      const rawEndM = timeToMinutes(input.endTime);
      const finalEndM = rawEndM > startM ? rawEndM : startM + 30;
      const finalEndTime = minutesToTime(finalEndM);
      const durationMins = finalEndM - startM;

      const blockedApt: Appointment = {
        id: `blk-${Date.now()}`,
        appointmentCode: `#KILIT-${Math.floor(100 + Math.random() * 900)}`,
        dayId: selectedDate,
        date: selectedDate,
        appointment_date: selectedDate,
        appointment_time: input.startTime,
        dateLabel: input.dateLabel || resolvedDay.chipLabel,
        time: input.startTime,
        endTime: finalEndTime,
        customerName: `Saat Kapatıldı: ${input.reason}`,
        customerPhone: currentShop.phone,
        barberId: input.barberId,
        barberName: input.barberName,
        chairLabel: input.chairLabel,
        services: [
          {
            name: `Özel Durum: ${input.reason}`,
            price: 0,
            duration: durationMins,
          },
        ],
        totalPrice: 0,
        totalDuration: durationMins,
        trustBadge: "trusted",
        trustDetail: `Berber Tarafından Kapatıldı (${input.startTime} - ${finalEndTime})`,
        status: "upcoming",
        reminderSent: true,
        bookingSource: "blocked",
        isBlockedSlot: true,
        blockReason: input.reason,
      };

      updateCurrentShop((shop) => ({
        ...shop,
        appointments: [...shop.appointments, blockedApt].sort((a, b) =>
          a.time.localeCompare(b.time)
        ),
      }));

      return blockedApt;
    },
    [currentShop.phone, updateCurrentShop]
  );

  // Remove / Unlock a Blocked Time Range or Appointment (Instant Cloud Sync)
  const removeAppointmentOrBlock = useCallback(
    (id: string) => {
      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) =>
          shop.slug === currentShop.slug
            ? {
                ...shop,
                appointments: shop.appointments.filter((a) => a.id !== id),
              }
            : shop
        );
        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [currentShop.slug, syncDirectlyToCloud]
  );

  // Update Staff / Chair assigned to an appointment
  const updateAppointmentBarber = useCallback(
    (
      appointmentId: string,
      barberId: string,
      barberName: string,
      chairLabel: string
    ) => {
      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) =>
          shop.slug === currentShop.slug
            ? {
                ...shop,
                appointments: shop.appointments.map((a) =>
                  a.id === appointmentId
                    ? { ...a, barberId, barberName, chairLabel }
                    : a
                ),
              }
            : shop
        );
        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [currentShop.slug, syncDirectlyToCloud]
  );

  // Update Customer Phone for an appointment (Scoped to Current Shop & Synced to Cloud)
  const updateAppointmentPhone = useCallback(
    (appointmentId: string, newPhone: string) => {
      const cleaned = newPhone.trim();
      if (!cleaned) return;

      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) => {
          if (shop.slug !== currentShop.slug) return shop;
          return {
            ...shop,
            appointments: shop.appointments.map((a) =>
              a.id === appointmentId ? { ...a, customerPhone: cleaned } : a
            ),
            adminAlerts: shop.adminAlerts.map((alert) =>
              alert.appointmentId === appointmentId
                ? {
                    ...alert,
                    customerPhone: cleaned,
                    message: alert.message.replace(/Tel:\s*[^\s•]+/, `Tel: ${cleaned}`),
                  }
                : alert
            ),
          };
        });
        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [currentShop.slug, syncDirectlyToCloud]
  );

  // Add Waitlist Entry to Current Shop
  const addWaitlistEntry = useCallback(
    (
      newEntryData: Omit<WaitlistEntry, "id" | "createdAt" | "notified">
    ): WaitlistEntry => {
      const selectedDate = toStrictIsoDate(newEntryData.dayId);
      const created: WaitlistEntry = {
        ...newEntryData,
        dayId: selectedDate,
        id: `wl-${Date.now()}`,
        createdAt: "Az önce",
        notified: false,
      };
      updateCurrentShop((shop) => ({
        ...shop,
        waitlist: [created, ...shop.waitlist],
      }));
      return created;
    },
    [updateCurrentShop]
  );

  // Mark Appointment Completed in Current Shop
  const markAppointmentCompleted = useCallback(
    (id: string) => {
      updateCurrentShop((shop) => ({
        ...shop,
        appointments: shop.appointments.map((apt) =>
          apt.id === id ? { ...apt, status: "completed" } : apt
        ),
      }));
    },
    [updateCurrentShop]
  );

  // Confirm Appointment (WhatsApp Onay Kodu Doğrulandı -> status: "confirmed")
  const confirmAppointment = useCallback(
    (id: string) => {
      updateCurrentShop((shop) => ({
        ...shop,
        appointments: shop.appointments.map((apt) =>
          apt.id === id ? { ...apt, status: "confirmed" as const } : apt
        ),
      }));
    },
    [updateCurrentShop]
  );

  // Check if a customer phone already has an active / pending appointment on target day
  const checkHasActiveAppointmentForDay = useCallback(
    (phone: string, dayId: string): Appointment | undefined => {
      const cleanPhone = normalizePhone(phone);
      const selectedDate = toStrictIsoDate(dayId);
      return currentShop.appointments.find((apt) => {
        if (apt.isBlockedSlot) return false;
        const sameDay = getAppointmentIsoDate(apt) === selectedDate;
        const samePhone = normalizePhone(apt.customerPhone) === cleanPhone;
        const isLive =
          apt.status === "pending" ||
          apt.status === "confirmed" ||
          apt.status === "upcoming";
        return sameDay && samePhone && isLive;
      });
    },
    [currentShop.appointments]
  );

  // Mark Appointment No-Show -> Adds to GLOBAL BLACKLIST NETWORK + Notifies Current Shop Waitlist
  const markAppointmentNoShow = useCallback(
    (
      id: string,
      customDeposit?: number
    ): { blacklistedPhone: string; notifiedWaitlist?: WaitlistEntry } => {
      const targetApt = currentShop.appointments.find((a) => a.id === id);
      let matchedWaitlist: WaitlistEntry | undefined;

      if (!targetApt) {
        return { blacklistedPhone: "" };
      }

      const cleanPhone = normalizePhone(targetApt.customerPhone);
      const depositToApply = typeof customDeposit === "number" && customDeposit >= 0
        ? customDeposit
        : currentShop.depositAmount || 100;

      // 1. Add to Global Blacklist Network (Ortak Kara Liste Ağı)
      setGlobalBlacklist((prev) => {
        const exists = prev.some((b) => normalizePhone(b.phone) === cleanPhone);
        const nextBl = exists
          ? prev.map((b) =>
              normalizePhone(b.phone) === cleanPhone
                ? {
                    ...b,
                    missedDate: `${targetApt.dateLabel} - ${targetApt.time}`,
                    missedService: `${targetApt.services
                      .map((s) => s.name)
                      .join(" + ")} (${targetApt.totalPrice} TL)`,
                    requiredDeposit: depositToApply,
                    reportedByShopSlug: currentShop.slug,
                    reportedByShopName: currentShop.name,
                  }
                : b
            )
          : [
              {
                phone: cleanPhone,
                name: targetApt.customerName,
                missedDate: `${targetApt.dateLabel} - ${targetApt.time}`,
                missedService: `${targetApt.services
                  .map((s) => s.name)
                  .join(" + ")} (${targetApt.totalPrice} TL)`,
                requiredDeposit: depositToApply,
                reportedByShopSlug: currentShop.slug,
                reportedByShopName: currentShop.name,
              },
              ...prev,
            ];
        return nextBl;
      });

      const targetDate = getAppointmentIsoDate(targetApt);

      // 2. Update Current Shop's Appointment, Waitlist, Stats & Alerts
      const candidate =
        currentShop.waitlist.find(
          (w) =>
            !w.notified &&
            toStrictIsoDate(w.dayId) === targetDate &&
            w.requestedTime === targetApt.time
        ) ||
        currentShop.waitlist.find(
          (w) => !w.notified && toStrictIsoDate(w.dayId) === targetDate
        );

      if (candidate) {
        matchedWaitlist = { ...candidate, notified: true };
      }

      updateCurrentShop((shop) => {
        const updatedWaitlist = candidate
          ? shop.waitlist.map((w) =>
              w.id === candidate.id ? { ...w, notified: true } : w
            )
          : shop.waitlist;

        const newAlerts = candidate
          ? [
              {
                id: `alert-${Date.now()}`,
                title: "No-Show Sonrası Yedek Liste Devreye Girdi",
                message: `Saat ${targetApt.time} randevusu No-Show olarak işaretlendi ve Ortak Kara Liste Ağına eklendi! Yedek listedeki ${candidate.customerName} adlı müşteriye otomatik WhatsApp daveti gönderildi.`,
                timestamp: "Az önce",
                type: "noshow_waitlist" as const,
                read: false,
              },
              ...shop.adminAlerts,
            ]
          : shop.adminAlerts;

        return {
          ...shop,
          appointments: shop.appointments.map((apt) =>
            apt.id === id ? { ...apt, status: "no_show" } : apt
          ),
          waitlist: updatedWaitlist,
          adminAlerts: newAlerts,
          stats: {
            savedRevenue:
              shop.stats.savedRevenue + (candidate ? candidate.totalPrice : 0),
            waitlistFilled: shop.stats.waitlistFilled + (candidate ? 1 : 0),
            preventedNoShows: shop.stats.preventedNoShows + 1,
          },
        };
      });

      return {
        blacklistedPhone: cleanPhone,
        notifiedWaitlist: matchedWaitlist,
      };
    },
    [currentShop, updateCurrentShop]
  );

  // Remove Phone from Global Blacklist Network
  const removeFromBlacklist = useCallback(
    (phone: string) => {
      const cleanPhone = normalizePhone(phone);
      if (!cleanPhone) return;

      let nextBlRef: BlacklistEntry[] | undefined;
      // 1. Remove from Global Blacklist
      setGlobalBlacklist((prev) => {
        const filtered = prev.filter(
          (entry) => normalizePhone(entry.phone) !== cleanPhone
        );
        nextBlRef = filtered;
        return filtered;
      });

      // 2. Revert appointments belonging to this customer marked as 'no_show'
      setShops((prevShops) => {
        const nextShops = prevShops.map((s) => ({
          ...s,
          appointments: s.appointments.map((apt) =>
            normalizePhone(apt.customerPhone) === cleanPhone &&
            apt.status === "no_show"
              ? { ...apt, status: "upcoming" as const }
              : apt
          ),
        }));
        void syncDirectlyToCloud(nextShops, nextBlRef);
        return nextShops;
      });
    },
    [syncDirectlyToCloud]
  );

  // Send WhatsApp Reminder
  const sendWhatsAppReminder = useCallback(
    (id: string) => {
      const now = new Date();
      const timeString = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      updateCurrentShop((shop) => ({
        ...shop,
        appointments: shop.appointments.map((apt) =>
          apt.id === id
            ? { ...apt, reminderSent: true, reminderSentAt: timeString }
            : apt
        ),
      }));
    },
    [updateCurrentShop]
  );

  // Notify Waitlist Customer
  const notifyWaitlistCustomer = useCallback(
    (id: string) => {
      const target = currentShop.waitlist.find((w) => w.id === id);
      if (!target) return;

      updateCurrentShop((shop) => ({
        ...shop,
        waitlist: shop.waitlist.map((w) =>
          w.id === id ? { ...w, notified: true } : w
        ),
        stats: {
          ...shop.stats,
          savedRevenue: shop.stats.savedRevenue + target.totalPrice,
          waitlistFilled: shop.stats.waitlistFilled + 1,
        },
      }));
    },
    [currentShop.waitlist, updateCurrentShop]
  );

  // Customer Self-Service: Find Appointments in Current Shop
  const findCustomerAppointments = useCallback(
    (query: string): Appointment[] => {
      const trimmed = query.trim();
      if (!trimmed) return [];

      const upper = trimmed.toUpperCase();
      const digits = normalizePhone(trimmed);

      return currentShop.appointments.filter((apt) => {
        if (apt.status === "cancelled") return false;
        const codeMatch =
          apt.appointmentCode.toUpperCase() === upper ||
          apt.appointmentCode.replace("#", "").toUpperCase() === upper;
        const phoneMatch =
          digits.length >= 7 &&
          normalizePhone(apt.customerPhone).includes(digits);
        return codeMatch || phoneMatch;
      });
    },
    [currentShop.appointments]
  );

  // Customer Self-Service: Cancel Appointment in Current Shop
  const cancelAppointmentByCustomer = useCallback(
    (
      id: string
    ): {
      cancelledApt?: Appointment;
      notifiedCount: number;
      alertText: string;
    } => {
      const targetApt = currentShop.appointments.find((a) => a.id === id);
      if (!targetApt) {
        return { notifiedCount: 0, alertText: "" };
      }

      const targetDate = getAppointmentIsoDate(targetApt);
      const matchingWaitlist = currentShop.waitlist.filter(
        (w) =>
          toStrictIsoDate(w.dayId) === targetDate &&
          w.requestedTime === targetApt.time
      );
      const count = matchingWaitlist.length;

      const alertText =
        count > 0
          ? `Saat ${targetApt.time} randevusu müşteri (${targetApt.customerName}) tarafından iptal edildi! Yedek listedeki ${count} kişiye otomatik WhatsApp bildirimi gönderildi.`
          : `Saat ${targetApt.time} randevusu müşteri (${targetApt.customerName}) tarafından iptal edildi! Saat dilimi takvimde tekrar 'Boş / Alınabilir' duruma geçti.`;

      updateCurrentShop((shop) => ({
        ...shop,
        appointments: shop.appointments.map((a) =>
          a.id === id ? { ...a, status: "cancelled" } : a
        ),
        waitlist:
          count > 0
            ? shop.waitlist.map((w) =>
                toStrictIsoDate(w.dayId) === targetDate &&
                w.requestedTime === targetApt.time
                  ? { ...w, notified: true }
                  : w
              )
            : shop.waitlist,
        stats:
          count > 0
            ? {
                ...shop.stats,
                savedRevenue: shop.stats.savedRevenue + targetApt.totalPrice,
                waitlistFilled: shop.stats.waitlistFilled + 1,
              }
            : shop.stats,
        adminAlerts: [
          {
            id: `alert-${Date.now()}`,
            title: "Müşteri İptali & Otomatik Yedek Liste Bildirimi",
            message: alertText,
            timestamp: "Az önce",
            type: "cancellation_waitlist",
            read: false,
          },
          ...shop.adminAlerts,
        ],
      }));

      return {
        cancelledApt: targetApt,
        notifiedCount: count,
        alertText,
      };
    },
    [currentShop, updateCurrentShop]
  );

  // Customer Self-Service: Reschedule Appointment in Current Shop
  const rescheduleAppointmentByCustomer = useCallback(
    (
      id: string,
      newDayId: string,
      newDateLabel: string,
      newTime: string
    ): Appointment | undefined => {
      const target = currentShop.appointments.find((a) => a.id === id);
      if (!target) return undefined;

      const selectedDate = toStrictIsoDate(newDayId);
      const newEndTime = minutesToTime(
        timeToMinutes(newTime) + target.totalDuration
      );
      const updatedApt: Appointment = {
        ...target,
        dayId: selectedDate,
        date: selectedDate,
        appointment_date: selectedDate,
        appointment_time: newTime,
        dateLabel: newDateLabel,
        time: newTime,
        endTime: newEndTime,
      };

      updateCurrentShop((shop) => ({
        ...shop,
        appointments: shop.appointments
          .map((a) => (a.id === id ? updatedApt : a))
          .sort((a, b) => a.time.localeCompare(b.time)),
        adminAlerts: [
          {
            id: `alert-${Date.now()}`,
            title: "Randevu Saati Değiştirildi",
            message: `${target.customerName} (${target.appointmentCode}) randevusunu ${target.time} saatinden ${newDateLabel} ${newTime} saatine taşıdı. Eski saat (${target.time}) boşa çıktı.`,
            timestamp: "Az önce",
            type: "reschedule",
            read: false,
          },
          ...shop.adminAlerts,
        ],
      }));

      return updatedApt;
    },
    [currentShop.appointments, updateCurrentShop]
  );

  // Berber Paneli: Erken Saate Alma & Eski Saati Anında Boşa Çıkarma (Çakışma / Çift Kayıt Engelli)
  const shiftAppointmentToEarlySlot = useCallback(
    (
      id: string,
      newTime: string,
      newDayId?: string,
      newDateLabel?: string
    ): Appointment | undefined => {
      let movedApt: Appointment | undefined;

      updateCurrentShop((shop) => {
        const target = shop.appointments.find((a) => a.id === id);
        if (!target) return shop;

        const targetDayId = toStrictIsoDate(newDayId || getAppointmentIsoDate(target));
        const targetDateLabel = newDateLabel || target.dateLabel;
        const newEndTime = minutesToTime(
          timeToMinutes(newTime) + (target.totalDuration || 30)
        );

        movedApt = {
          ...target,
          dayId: targetDayId,
          date: targetDayId,
          appointment_date: targetDayId,
          appointment_time: newTime,
          dateLabel: targetDateLabel,
          time: newTime,
          endTime: newEndTime,
          canComeEarly: false, // Erken saate alındı
          status: target.status === "pending" ? "confirmed" : target.status,
        };

        // Eski saat anında boşa çıkarıldı çünkü hedef randevunun zamanı newTime oldu
        // Tek ve güncel randevu nesnesi listeye yerleştirilir
        return {
          ...shop,
          appointments: shop.appointments
            .map((a) => (a.id === id ? movedApt! : a))
            .sort((a, b) => a.time.localeCompare(b.time)),
        };
      });

      return movedApt;
    },
    [updateCurrentShop]
  );

  // BARBERS / CHAIRS CRUD (Scoped to Current Shop)
  const addBarber = useCallback(
    (barberData: Omit<Barber, "id">): Barber => {
      const created: Barber = {
        ...barberData,
        id: `barber-${Date.now()}`,
      };

      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) =>
          shop.slug === currentShop.slug
            ? { ...shop, barbers: [...shop.barbers, created] }
            : shop
        );

        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });

      return created;
    },
    [currentShop.slug, syncDirectlyToCloud]
  );

  const updateBarber = useCallback(
    (id: string, updated: Partial<Barber>) => {
      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) =>
          shop.slug === currentShop.slug
            ? {
                ...shop,
                barbers: shop.barbers.map((b) =>
                  b.id === id ? { ...b, ...updated } : b
                ),
              }
            : shop
        );

        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [currentShop.slug, syncDirectlyToCloud]
  );

  const deleteBarber = useCallback(
    (id: string) => {
      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) =>
          shop.slug === currentShop.slug
            ? {
                ...shop,
                barbers: shop.barbers.filter((b) => b.id !== id || b.isAnyOption),
              }
            : shop
        );

        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [currentShop.slug, syncDirectlyToCloud]
  );

  // SERVICES CRUD (Scoped to Current Shop)
  const updateService = useCallback(
    (id: string, updated: Partial<Service>) => {
      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) =>
          shop.slug === currentShop.slug
            ? {
                ...shop,
                services: shop.services.map((s) =>
                  s.id === id ? { ...s, ...updated } : s
                ),
              }
            : shop
        );
        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [currentShop.slug, syncDirectlyToCloud]
  );

  const addService = useCallback(
    (serviceData: Omit<Service, "id">): Service => {
      const normalizedNewName = serviceData.name
        .trim()
        .toLocaleLowerCase("tr-TR");
      let resultService: Service = {
        ...serviceData,
        id: `srv-${Date.now()}`,
      };

      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) => {
          if (shop.slug !== currentShop.slug) return shop;
          const existing = shop.services.find(
            (s) => s.name.trim().toLocaleLowerCase("tr-TR") === normalizedNewName
          );
          if (existing) {
            resultService = {
              ...existing,
              ...serviceData,
              id: existing.id,
            };
            return {
              ...shop,
              services: shop.services.map((s) =>
                s.id === existing.id ? resultService : s
              ),
            };
          }
          return {
            ...shop,
            services: [...shop.services, resultService],
          };
        });
        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });

      return resultService;
    },
    [currentShop.slug, syncDirectlyToCloud]
  );

  const deleteService = useCallback(
    (id: string) => {
      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) =>
          shop.slug === currentShop.slug
            ? {
                ...shop,
                services: shop.services.filter((s) => s.id !== id),
              }
            : shop
        );
        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [currentShop.slug, syncDirectlyToCloud]
  );

  // SHOP SCHEDULE SETTINGS (Scoped to Current Shop)
  const updateShopSettings = useCallback(
    (updated: Partial<ShopSettings>) => {
      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) => {
          if (shop.slug !== currentShop.slug) return shop;
          
          let nextAppointments = shop.appointments;
          // Eğer mola kapatılıyorsa, mükerrer veya hayalet mola kayıtlarını temizle
          if (updated.breakEnabled === false) {
            nextAppointments = nextAppointments.filter(
              (a) =>
                !(
                  a.isBlockedSlot &&
                  (a.blockReason?.toLowerCase().includes("mola") ||
                    a.blockReason?.toLowerCase().includes("öğle") ||
                    a.blockReason?.toLowerCase().includes("yemek"))
                )
            );
          }

          return {
            ...shop,
            shopSettings: { ...shop.shopSettings, ...updated, breakEnabled: false },
            appointments: nextAppointments,
          };
        });
        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [currentShop.slug, syncDirectlyToCloud]
  );

  const toggleShopBreak = useCallback(
    (targetDayId?: string) => {
      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) => {
          if (shop.slug !== currentShop.slug) return shop;
          // KESİN ÇÖZÜM: Sadece seçili günün (YYYY-MM-DD) molasını aç/kapat! Diğer günleri ASLA etkileme.
          const selectedDate = toStrictIsoDate(
            targetDayId || getLiveDaysMetadata(1)[0].id
          );

          // Mola durumunu SADECE seçili tarihteki (appointment_date === selectedDate) kayıtlardan türet
          const hasBreakAlready = shop.appointments.some(
            (a) =>
              a.isBlockedSlot &&
              getAppointmentIsoDate(a) === selectedDate &&
              (a.blockReason?.toLowerCase().includes("mola") ||
                a.blockReason?.toLowerCase().includes("öğle") ||
                a.blockReason?.toLowerCase().includes("yemek") ||
                a.customerName?.toLowerCase().includes("mola"))
          );

          let nextAppointments = shop.appointments;

          if (hasBreakAlready) {
            // Mola varsa: Sadece seçili günün (selectedDate) mola kaydını sil
            nextAppointments = nextAppointments.filter(
              (a) =>
                !(
                  a.isBlockedSlot &&
                  getAppointmentIsoDate(a) === selectedDate &&
                  (a.blockReason?.toLowerCase().includes("mola") ||
                    a.blockReason?.toLowerCase().includes("öğle") ||
                    a.blockReason?.toLowerCase().includes("yemek") ||
                    a.customerName?.toLowerCase().includes("mola"))
                )
            );
          } else {
            // Mola yoksa: Sadece seçili güne (selectedDate) mola saatini ekle
            const resolvedDay = resolveDayMetadata(selectedDate);
            const bStart = shop.shopSettings.breakStart || "13:00";
            const bEnd = shop.shopSettings.breakEnd || "14:00";
            const breakBlock: Appointment = {
              id: `block-break-${selectedDate}-${Date.now()}`,
              appointmentCode: `#MOLA-${Date.now().toString().slice(-4)}`,
              dayId: selectedDate,
              date: selectedDate,
              appointment_date: selectedDate,
              appointment_time: bStart,
              dateLabel: resolvedDay.chipLabel,
              time: bStart,
              endTime: bEnd,
              customerName: "Öğle Molası",
              customerPhone: "",
              barberId: "all",
              barberName: "Tüm Salon",
              chairLabel: "Tüm Koltuklar",
              services: [],
              totalPrice: 0,
              totalDuration: 60,
              trustBadge: "trusted",
              trustDetail: "Salon Öğle Molası",
              status: "confirmed",
              reminderSent: false,
              isBlockedSlot: true,
              blockReason: "Yemek Molası",
            };
            nextAppointments = [...nextAppointments, breakBlock];
          }

          return {
            ...shop,
            shopSettings: {
              ...shop.shopSettings,
              breakEnabled: false,
            },
            appointments: nextAppointments,
          };
        });
        void syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [currentShop.slug, syncDirectlyToCloud]
  );

  const toggleClosedDay = useCallback(
    (dayOfWeek: number) => {
      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) => {
          if (shop.slug !== currentShop.slug) return shop;
          const exists = shop.shopSettings.closedDays.includes(dayOfWeek);
          return {
            ...shop,
            shopSettings: {
              ...shop.shopSettings,
              closedDays: exists
                ? shop.shopSettings.closedDays.filter((d) => d !== dayOfWeek)
                : [...shop.shopSettings.closedDays, dayOfWeek],
            },
          };
        });
        syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [currentShop.slug, syncDirectlyToCloud]
  );

  // ADMIN ALERTS (Scoped to Current Shop)
  const dismissAdminAlert = useCallback(
    (id: string) => {
      recordDismissedAlertId(id);
      setShops((prevShops) => {
        const nextShops = prevShops.map((shop) =>
          shop.slug === currentShop.slug
            ? {
                ...shop,
                adminAlerts: (shop.adminAlerts || []).filter((a) => a.id !== id),
              }
            : shop
        );
        syncDirectlyToCloud(nextShops);
        return nextShops;
      });
    },
    [currentShop.slug, syncDirectlyToCloud]
  );

  const clearAllAdminAlerts = useCallback(() => {
    (currentShop.adminAlerts || []).forEach((a) => recordDismissedAlertId(a.id));
    setShops((prevShops) => {
      const nextShops = prevShops.map((shop) =>
        shop.slug === currentShop.slug
          ? {
              ...shop,
              adminAlerts: [],
            }
          : shop
      );
      syncDirectlyToCloud(nextShops);
      return nextShops;
    });
  }, [currentShop.slug, currentShop.adminAlerts, syncDirectlyToCloud]);

  // RESET ALL DEMO DATA
  const resetDemoData = useCallback(() => {
    setShops(INITIAL_SHOPS);
    setGlobalBlacklist(INITIAL_GLOBAL_BLACKLIST);
    setMasterPinState("1923");
    try {
      localStorage.removeItem(STORAGE_KEYS.SHOPS);
      localStorage.removeItem(STORAGE_KEYS.GLOBAL_BLACKLIST);
      localStorage.removeItem(STORAGE_KEYS.MASTER_PIN);
    } catch {
      // ignore
    }
  }, []);

  return (
    <BarberContext.Provider
      value={{
        shops,
        currentShop,
        currentShopSlug: currentShop.slug,
        hasShopQueryParam,
        hydrated,
        setCurrentShopSlug,
        addShop,
        toggleShopSubscription,
        updateShopSubscription,
        updateShopPinBySlug,
        updateShopDetails,
        deleteShop,
        currentShopExists,
        updateCurrentShopDepositPolicy,
        updateCurrentShopPin,
        masterPin,
        updateMasterPin,
        appointments: currentShop.appointments,
        waitlist: currentShop.waitlist,
        barbers: currentShop.barbers,
        services: currentShop.services,
        shopSettings: currentShop.shopSettings,
        adminAlerts: currentShop.adminAlerts,
        stats: currentShop.stats,
        blacklist: globalBlacklist,
        globalBlacklist,
        addAppointment,
        addBlockedTimeRange,
        removeAppointmentOrBlock,
        addWaitlistEntry,
        markAppointmentCompleted,
        confirmAppointment,
        checkHasActiveAppointmentForDay,
        markAppointmentNoShow,
        removeFromBlacklist,
        sendWhatsAppReminder,
        notifyWaitlistCustomer,
        isPhoneBlacklisted,
        findCustomerAppointments,
        cancelAppointmentByCustomer,
        rescheduleAppointmentByCustomer,
        shiftAppointmentToEarlySlot,
        addBarber,
        updateBarber,
        deleteBarber,
        updateAppointmentBarber,
        updateAppointmentPhone,
        getServicePriceForBarber,
        updateService,
        addService,
        deleteService,
        updateShopSettings,
        toggleShopBreak,
        toggleClosedDay,
        getSlotsForDay,
        dismissAdminAlert,
        clearAllAdminAlerts,
        resetDemoData,
      }}
    >
      <Suspense fallback={null}>
        <ShopUrlQuerySync onSlugChange={handleUrlSlugChange} />
      </Suspense>
      {children}
    </BarberContext.Provider>
  );
}

export function useBarber() {
  const context = useContext(BarberContext);
  if (!context) {
    throw new Error("useBarber must be used within a BarberProvider");
  }
  return context;
}
