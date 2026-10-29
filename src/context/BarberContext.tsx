"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  AdminAlert,
  Appointment,
  Barber,
  BlacklistEntry,
  DepositPolicyType,
  INITIAL_GLOBAL_BLACKLIST,
  INITIAL_SHOPS,
  RevenueStats,
  Service,
  ShopSettings,
  TenantShop,
  TimeSlot,
  WaitlistEntry,
} from "@/data/mockData";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface NewShopInput {
  name: string;
  slug: string;
  phone: string;
  district?: string;
  monthlyFee: number;
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
  markAppointmentNoShow: (id: string) => {
    blacklistedPhone: string;
    notifiedWaitlist?: WaitlistEntry;
  };
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

  // Barbers / Employees & Chairs CRUD + Custom Pricing (Scoped to Current Shop)
  addBarber: (barberData: Omit<Barber, "id">) => Barber;
  updateBarber: (id: string, updated: Partial<Barber>) => void;
  deleteBarber: (id: string) => void;
  getServicePriceForBarber: (service: Service, barber?: Barber | null) => number;

  // Services CRUD (Scoped to Current Shop)
  updateService: (id: string, updated: Partial<Service>) => void;
  addService: (service: Omit<Service, "id">) => Service;
  deleteService: (id: string) => void;

  // Shop Schedule Settings (Scoped to Current Shop)
  updateShopSettings: (updated: Partial<ShopSettings>) => void;
  toggleClosedDay: (dayOfWeek: number) => void;
  getSlotsForDay: (dayId: string) => TimeSlot[];

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
};

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

// Helper component that syncs URL `?shop=[slug]` with context state
function ShopUrlQuerySync({
  onSlugChange,
}: {
  onSlugChange: (slugFromUrl: string | null) => void;
}) {
  const searchParams = useSearchParams();
  const shopParam = searchParams?.get("shop") || null;

  useEffect(() => {
    onSlugChange(shopParam);
  }, [shopParam, onSlugChange]);

  return null;
}

export function BarberProvider({ children }: { children: React.ReactNode }) {
  const [shops, setShops] = useState<TenantShop[]>(INITIAL_SHOPS);
  const [globalBlacklist, setGlobalBlacklist] = useState<BlacklistEntry[]>(
    INITIAL_GLOBAL_BLACKLIST
  );
  const [currentShopSlug, setCurrentShopSlugState] = useState<string>("atelier-noir");
  const [hasShopQueryParam, setHasShopQueryParam] = useState<boolean>(false);
  const [masterPin, setMasterPinState] = useState<string>("9999");
  const [hydrated, setHydrated] = useState(false);

  const loadFromStorage = useCallback(() => {
    try {
      const savedShops = localStorage.getItem(STORAGE_KEYS.SHOPS);
      const savedBlacklist = localStorage.getItem(STORAGE_KEYS.GLOBAL_BLACKLIST);
      const savedMasterPin = localStorage.getItem(STORAGE_KEYS.MASTER_PIN);

      if (savedShops) {
        const parsed: TenantShop[] = JSON.parse(savedShops);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setShops(
            parsed.map((shop) => ({
              ...shop,
              adminPin: shop.adminPin || "1234",
              barbers: (shop.barbers || []).map((b) => ({
                ...b,
                commissionRate:
                  typeof b.commissionRate === "number" ? b.commissionRate : 50,
              })),
              services: deduplicateServices(shop.services || []),
            }))
          );
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

            if (isMounted && Array.isArray(remote.shops) && remote.shops.length > 0) {
              setShops(
                remote.shops.map((shop) => ({
                  ...shop,
                  adminPin: shop.adminPin || "1234",
                  barbers: (shop.barbers || []).map((b) => ({
                    ...b,
                    commissionRate:
                      typeof b.commissionRate === "number" ? b.commissionRate : 50,
                  })),
                  services: deduplicateServices(shop.services || []),
                }))
              );
            }

            if (isMounted && Array.isArray(remote.globalBlacklist)) {
              setGlobalBlacklist(remote.globalBlacklist);
            }

            if (isMounted && remote.masterPin) {
              setMasterPinState(remote.masterPin);
            }
          } else {
            // Tablo boş ise eldeki varsayılan dükkanları buluta ilk tohumlama (seed) olarak gönder
            const seedPayload = {
              shops: INITIAL_SHOPS,
              globalBlacklist: INITIAL_GLOBAL_BLACKLIST,
              masterPin: "9999",
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

    // Realtime subscription: başka bir sekme veya cihazdan gelen güncellemeleri anında al
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
            if (nextData) {
              setShops((prevShops) => {
                if (
                  Array.isArray(nextData.shops) &&
                  nextData.shops.length > 0 &&
                  JSON.stringify(prevShops) !== JSON.stringify(nextData.shops)
                ) {
                  return nextData.shops;
                }
                return prevShops;
              });

              setGlobalBlacklist((prevBl) => {
                if (
                  Array.isArray(nextData.globalBlacklist) &&
                  JSON.stringify(prevBl) !== JSON.stringify(nextData.globalBlacklist)
                ) {
                  return nextData.globalBlacklist;
                }
                return prevBl;
              });

              if (nextData.masterPin) {
                setMasterPinState((prev) => (prev !== nextData.masterPin ? nextData.masterPin : prev));
              }
            }
          }
        )
        .subscribe();
    }

    const handleStorageChange = () => {
      loadFromStorage();
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

  // 2. State her değiştiğinde: Hem localStorage'a hem de Supabase'e yaz
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

    // B) Supabase Bulutuna Asenkron Kaydet (Debounced / Safe)
    if (isSupabaseConfigured && supabase) {
      const timeout = setTimeout(async () => {
        try {
          await supabase!.from("app_state").upsert({
            key: "global_state",
            data: {
              shops,
              globalBlacklist,
              masterPin,
            },
            updated_at: new Date().toISOString(),
          });
        } catch (err) {
          console.warn("Supabase sync write error:", err);
        }
      }, 400);

      return () => clearTimeout(timeout);
    }
  }, [shops, globalBlacklist, masterPin, hydrated]);

  const handleUrlSlugChange = useCallback((slugFromUrl: string | null) => {
    if (slugFromUrl && slugFromUrl.trim()) {
      setCurrentShopSlugState(slugFromUrl.trim().toLowerCase());
      setHasShopQueryParam(true);
    } else {
      setHasShopQueryParam(false);
    }
  }, []);

  const setCurrentShopSlug = useCallback((slug: string) => {
    setCurrentShopSlugState(slug.trim().toLowerCase());
  }, []);

  const currentShop = useMemo(() => {
    return (
      shops.find((s) => s.slug.toLowerCase() === currentShopSlug.toLowerCase()) ||
      shops[0] ||
      INITIAL_SHOPS[0]
    );
  }, [shops, currentShopSlug]);

  // Helper to update ONLY the current active shop in `shops`
  const updateCurrentShop = useCallback(
    (updater: (shop: TenantShop) => TenantShop) => {
      setShops((prevShops) =>
        prevShops.map((shop) =>
          shop.slug === currentShop.slug ? updater(shop) : shop
        )
      );
    },
    [currentShop.slug]
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
      createdAt: "Bugün",
      adminPin: "1234",
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
        breakEnabled: true,
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
      if (exists) {
        return prev.map((s) => (s.slug === cleanSlug ? newTenant : s));
      }
      return [...prev, newTenant];
    });

    return newTenant;
  }, []);

  // SUPER ADMIN: Freeze / Activate Subscription Toggle
  const toggleShopSubscription = useCallback((slug: string) => {
    setShops((prev) =>
      prev.map((shop) =>
        shop.slug === slug
          ? {
              ...shop,
              subscriptionStatus:
                shop.subscriptionStatus === "active" ? "suspended" : "active",
            }
          : shop
      )
    );
  }, []);

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

  // Dynamic Slot Generator for Current Shop (Includes Phone Bookings & Blocked Time Ranges!)
  const getSlotsForDay = useCallback(
    (dayId: string): TimeSlot[] => {
      const { shopSettings, appointments, waitlist } = currentShop;
      const startMins = timeToMinutes(shopSettings.openTime);
      const endMins = timeToMinutes(shopSettings.closeTime);
      const interval = Math.max(15, shopSettings.slotInterval || 30);
      const breakStartMins = timeToMinutes(shopSettings.breakStart);
      const breakEndMins = timeToMinutes(shopSettings.breakEnd);

      const slots: TimeSlot[] = [];

      for (let m = startMins; m + interval <= endMins; m += interval) {
        const timeLabel = minutesToTime(m);

        const isBreak =
          shopSettings.breakEnabled && m >= breakStartMins && m < breakEndMins;

        if (isBreak) {
          slots.push({
            time: timeLabel,
            available: false,
            state: "break",
          });
          continue;
        }

        const activeApt = appointments.find((a) => {
          if (
            a.dayId !== dayId ||
            a.status === "cancelled" ||
            a.status === "no_show"
          ) {
            return false;
          }
          if (a.time === timeLabel) return true;
          if (a.isBlockedSlot) {
            const bStart = timeToMinutes(a.time);
            const bEnd = timeToMinutes(a.endTime);
            return m >= bStart && m < bEnd;
          }
          return false;
        });

        const waitingCount = waitlist.filter(
          (w) => w.dayId === dayId && w.requestedTime === timeLabel
        ).length;

        if (activeApt) {
          slots.push({
            time: timeLabel,
            available: false,
            state: "booked",
            waitlistCount: waitingCount > 0 ? waitingCount : 1,
            bookedBy: activeApt.customerName,
          });
        } else {
          slots.push({
            time: timeLabel,
            available: true,
            state: "available",
          });
        }
      }

      return slots;
    },
    [currentShop]
  );

  // Add Appointment to Current Shop
  const addAppointment = useCallback(
    (newAptData: Omit<Appointment, "id" | "appointmentCode">): Appointment => {
      const newApt: Appointment = {
        ...newAptData,
        id: `apt-${Date.now()}`,
        appointmentCode: generateAppointmentCode(currentShop.slug),
      };

      updateCurrentShop((shop) => ({
        ...shop,
        appointments: [...shop.appointments, newApt].sort((a, b) =>
          a.time.localeCompare(b.time)
        ),
        stats: newApt.depositAmount
          ? {
              ...shop.stats,
              savedRevenue: shop.stats.savedRevenue + newApt.totalPrice,
              preventedNoShows: shop.stats.preventedNoShows + 1,
            }
          : shop.stats,
      }));

      return newApt;
    },
    [currentShop.slug, updateCurrentShop]
  );

  // Add Blocked Time Range (Özel Durum / Saati Kapat)
  const addBlockedTimeRange = useCallback(
    (input: BlockedTimeRangeInput): Appointment => {
      const startM = timeToMinutes(input.startTime);
      const rawEndM = timeToMinutes(input.endTime);
      const finalEndM = rawEndM > startM ? rawEndM : startM + 30;
      const finalEndTime = minutesToTime(finalEndM);
      const durationMins = finalEndM - startM;

      const blockedApt: Appointment = {
        id: `blk-${Date.now()}`,
        appointmentCode: `#KILIT-${Math.floor(100 + Math.random() * 900)}`,
        dayId: input.dayId,
        dateLabel: input.dateLabel,
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

  // Remove / Unlock a Blocked Time Range or Appointment
  const removeAppointmentOrBlock = useCallback(
    (id: string) => {
      updateCurrentShop((shop) => ({
        ...shop,
        appointments: shop.appointments.filter((a) => a.id !== id),
      }));
    },
    [updateCurrentShop]
  );

  // Add Waitlist Entry to Current Shop
  const addWaitlistEntry = useCallback(
    (
      newEntryData: Omit<WaitlistEntry, "id" | "createdAt" | "notified">
    ): WaitlistEntry => {
      const created: WaitlistEntry = {
        ...newEntryData,
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

  // Mark Appointment No-Show -> Adds to GLOBAL BLACKLIST NETWORK + Notifies Current Shop Waitlist
  const markAppointmentNoShow = useCallback(
    (
      id: string
    ): { blacklistedPhone: string; notifiedWaitlist?: WaitlistEntry } => {
      const targetApt = currentShop.appointments.find((a) => a.id === id);
      let matchedWaitlist: WaitlistEntry | undefined;

      if (!targetApt) {
        return { blacklistedPhone: "" };
      }

      const cleanPhone = normalizePhone(targetApt.customerPhone);

      // 1. Add to Global Blacklist Network (Ortak Kara Liste Ağı)
      setGlobalBlacklist((prev) => {
        const exists = prev.some((b) => normalizePhone(b.phone) === cleanPhone);
        if (exists) {
          return prev.map((b) =>
            normalizePhone(b.phone) === cleanPhone
              ? {
                  ...b,
                  missedDate: `Bugün - ${targetApt.time}`,
                  missedService: `${targetApt.services
                    .map((s) => s.name)
                    .join(" + ")} (${targetApt.totalPrice} TL)`,
                  reportedByShopSlug: currentShop.slug,
                  reportedByShopName: currentShop.name,
                }
              : b
          );
        }
        return [
          {
            phone: cleanPhone,
            name: targetApt.customerName,
            missedDate: `Bugün - ${targetApt.time}`,
            missedService: `${targetApt.services
              .map((s) => s.name)
              .join(" + ")} (${targetApt.totalPrice} TL)`,
            requiredDeposit: currentShop.depositAmount || 100,
            reportedByShopSlug: currentShop.slug,
            reportedByShopName: currentShop.name,
          },
          ...prev,
        ];
      });

      // 2. Update Current Shop's Appointment, Waitlist, Stats & Alerts
      const candidate =
        currentShop.waitlist.find(
          (w) =>
            !w.notified &&
            w.dayId === targetApt.dayId &&
            w.requestedTime === targetApt.time
        ) || currentShop.waitlist.find((w) => !w.notified);

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

      const matchingWaitlist = currentShop.waitlist.filter(
        (w) =>
          w.dayId === targetApt.dayId && w.requestedTime === targetApt.time
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
                w.dayId === targetApt.dayId &&
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

      const newEndTime = minutesToTime(
        timeToMinutes(newTime) + target.totalDuration
      );
      const updatedApt: Appointment = {
        ...target,
        dayId: newDayId,
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

        // Doğrudan ve anında Supabase'e yaz (gecikme veya debounce beklemeden)
        if (isSupabaseConfigured && supabase) {
          supabase
            .from("app_state")
            .upsert({
              key: "global_state",
              data: {
                shops: nextShops,
                globalBlacklist,
                masterPin,
              },
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.warn("Supabase addBarber direct sync error:", error.message);
            });
        }

        return nextShops;
      });

      return created;
    },
    [currentShop.slug, globalBlacklist, masterPin]
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

        if (isSupabaseConfigured && supabase) {
          supabase
            .from("app_state")
            .upsert({
              key: "global_state",
              data: {
                shops: nextShops,
                globalBlacklist,
                masterPin,
              },
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.warn("Supabase updateBarber direct sync error:", error.message);
            });
        }

        return nextShops;
      });
    },
    [currentShop.slug, globalBlacklist, masterPin]
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

        if (isSupabaseConfigured && supabase) {
          supabase
            .from("app_state")
            .upsert({
              key: "global_state",
              data: {
                shops: nextShops,
                globalBlacklist,
                masterPin,
              },
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.warn("Supabase deleteBarber direct sync error:", error.message);
            });
        }

        return nextShops;
      });
    },
    [currentShop.slug, globalBlacklist, masterPin]
  );

  // SERVICES CRUD (Scoped to Current Shop)
  const updateService = useCallback(
    (id: string, updated: Partial<Service>) => {
      updateCurrentShop((shop) => ({
        ...shop,
        services: shop.services.map((s) =>
          s.id === id ? { ...s, ...updated } : s
        ),
      }));
    },
    [updateCurrentShop]
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

      updateCurrentShop((shop) => {
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

      return resultService;
    },
    [updateCurrentShop]
  );

  const deleteService = useCallback(
    (id: string) => {
      updateCurrentShop((shop) => ({
        ...shop,
        services: shop.services.filter((s) => s.id !== id),
      }));
    },
    [updateCurrentShop]
  );

  // SHOP SCHEDULE SETTINGS (Scoped to Current Shop)
  const updateShopSettings = useCallback(
    (updated: Partial<ShopSettings>) => {
      updateCurrentShop((shop) => ({
        ...shop,
        shopSettings: { ...shop.shopSettings, ...updated },
      }));
    },
    [updateCurrentShop]
  );

  const toggleClosedDay = useCallback(
    (dayOfWeek: number) => {
      updateCurrentShop((shop) => {
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
    },
    [updateCurrentShop]
  );

  // ADMIN ALERTS (Scoped to Current Shop)
  const dismissAdminAlert = useCallback(
    (id: string) => {
      updateCurrentShop((shop) => ({
        ...shop,
        adminAlerts: shop.adminAlerts.filter((a) => a.id !== id),
      }));
    },
    [updateCurrentShop]
  );

  const clearAllAdminAlerts = useCallback(() => {
    updateCurrentShop((shop) => ({
      ...shop,
      adminAlerts: [],
    }));
  }, [updateCurrentShop]);

  // RESET ALL DEMO DATA
  const resetDemoData = useCallback(() => {
    setShops(INITIAL_SHOPS);
    setGlobalBlacklist(INITIAL_GLOBAL_BLACKLIST);
    setMasterPinState("9999");
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
        markAppointmentNoShow,
        sendWhatsAppReminder,
        notifyWaitlistCustomer,
        isPhoneBlacklisted,
        findCustomerAppointments,
        cancelAppointmentByCustomer,
        rescheduleAppointmentByCustomer,
        addBarber,
        updateBarber,
        deleteBarber,
        getServicePriceForBarber,
        updateService,
        addService,
        deleteService,
        updateShopSettings,
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
