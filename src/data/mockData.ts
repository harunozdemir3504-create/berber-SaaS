export interface Barber {
  id: string;
  name: string;
  role: string;
  chairName: string;
  /**
   * Opsiyonel Usta WhatsApp Numarası.
   * Boş bırakılırsa dükkanın ana numarası (shop.phone) kullanılır.
   */
  phone?: string;
  rating: number;
  reviewCount: number;
  experience: string;
  earliestSlot: string;
  specialties: string[];
  isAnyOption?: boolean;
  badge?: string;
  avatarGradient: string;
  initials: string;
  /**
   * Kalfa / Usta Prim (Hakediş) Oranı (%)
   * Örn: Patron %100, Başberber Ahmet %50, Stilist Mert %40
   */
  commissionRate: number;
  /**
   * Kişiye (ustaya/koltuğa) özel hizmet fiyatları.
   * Key: service.id, Value: Bu ustaya özel TL fiyatı.
   * Tanımlanmamışsa hizmetin standart salon fiyatı kullanılır.
   */
  customPrices?: Record<string, number>;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category: "hair" | "beard" | "package" | "care";
  popular?: boolean;
  vip?: boolean;
}

export interface ShopSettings {
  openTime: string; // e.g. "09:00"
  closeTime: string; // e.g. "21:00"
  slotInterval: number; // e.g. 30 or 45 (minutes)
  breakEnabled: boolean;
  breakStart: string; // e.g. "13:00"
  breakEnd: string; // e.g. "14:00"
  closedDays: number[]; // 0 = Pazar, 1 = Pazartesi, 2 = Salı, 3 = Çarşamba, 4 = Perşembe, 5 = Cuma, 6 = Cumartesi
}

export type SlotState = "available" | "booked" | "break";

export interface TimeSlot {
  time: string;
  available: boolean;
  state: SlotState;
  waitlistCount?: number;
  bookedBy?: string;
}

export interface DayMetadata {
  id: string; // Gerçek ISO tarih: "YYYY-MM-DD" (Örn: "2026-11-02")
  isoDate: string; // "YYYY-MM-DD"
  label: string; // Örn: "Bugün", "Yarın", "4 Kas Çar"
  chipLabel: string; // Örn: "Bugün (2 Kas)", "Yarın (3 Kas)", "4 Kas Çar"
  dayName: string; // Örn: "Pazartesi"
  dayShort: string; // Örn: "Pzt"
  dateStr: string; // Örn: "2 Kas"
  fullDate: string; // Örn: "2 Kasım Pazartesi"
  dayNumber: string; // Örn: "2"
  monthShort: string; // Örn: "KAS"
  dayOfWeek: number; // 0 (Pazar) - 6 (Cumartesi)
  isToday?: boolean;
  isTomorrow?: boolean;
}

export type TrustBadgeType = "trusted" | "first_time" | "deposit_paid";
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "upcoming"
  | "completed"
  | "no_show"
  | "cancelled";

export interface Appointment {
  id: string;
  appointmentCode: string; // e.g., "#BRB-4829"
  verificationCode?: string; // 4 haneli WhatsApp onay kodu (Örn: "#4829")
  dayId: string; // Gerçek ISO tarih: "YYYY-MM-DD"
  date?: string; // Gerçek ISO tarih: "YYYY-MM-DD"
  appointment_date?: string; // Gerçek ISO tarih: "YYYY-MM-DD"
  dateLabel: string; // Örn: "Bugün (2 Kas)"
  time: string;
  appointment_time?: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  barberId: string;
  barberName: string;
  chairLabel: string;
  services: {
    name: string;
    price: number;
    duration: number;
  }[];
  totalPrice: number;
  totalDuration: number;
  trustBadge: TrustBadgeType;
  trustDetail: string;
  depositAmount?: number;
  status: AppointmentStatus;
  reminderSent: boolean;
  reminderSentAt?: string;
  notes?: string;
  bookingSource?: "online" | "phone" | "blocked";
  isBlockedSlot?: boolean;
  blockReason?: string;
  canComeEarly?: boolean; // Erken saat boşalırsa gelebilir (Yedek Liste)
  requiresDeposit?: boolean; // Kara liste / kapora onayı zorunlu müşteri
  isBlacklisted?: boolean; // No-Show kara listesindeki müşteri
}

export interface WaitlistEntry {
  id: string;
  customerName: string;
  customerPhone: string;
  dayId: string;
  requestedTime: string;
  requestedDateLabel: string;
  barberName: string;
  servicesSummary: string;
  totalPrice: number;
  createdAt: string;
  notified: boolean;
}

export interface BlacklistEntry {
  phone: string;
  name: string;
  missedDate: string;
  missedService: string;
  requiredDeposit: number;
  reportedByShopSlug: string;
  reportedByShopName: string;
}

export interface AdminAlert {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "new_booking" | "cancellation_waitlist" | "noshow_waitlist" | "reschedule" | "info";
  read: boolean;
  appointmentId?: string;
  customerName?: string;
  customerPhone?: string;
  time?: string;
  dateLabel?: string;
  servicesSummary?: string;
}

export interface RevenueStats {
  savedRevenue: number;
  waitlistFilled: number;
  preventedNoShows: number;
}

export type SubscriptionStatus = "active" | "suspended" | "expired";
export type DepositPolicyType = "require_deposit" | "block_booking";

export interface TenantShop {
  slug: string;
  name: string;
  subtitle: string;
  phone: string;
  district: string;
  monthlyFee: number;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndDate?: string; // Örn: "25 Ekim 2026"
  createdAt: string;
  adminPin: string;
  depositPolicy: DepositPolicyType;
  depositAmount: number;
  iban?: string;
  logo_url?: string;
  barbers: Barber[];
  services: Service[];
  shopSettings: ShopSettings;
  appointments: Appointment[];
  waitlist: WaitlistEntry[];
  adminAlerts: AdminAlert[];
  stats: RevenueStats;
}

export const INITIAL_SHOP_SETTINGS: ShopSettings = {
  openTime: "09:00",
  closeTime: "21:00",
  slotInterval: 30,
  breakEnabled: false,
  breakStart: "13:00",
  breakEnd: "14:00",
  closedDays: [0], // Pazar günü varsayılan tatil/kapalı
};

export const WEEKDAYS_TR = [
  { dayOfWeek: 1, name: "Pazartesi", short: "Pzt" },
  { dayOfWeek: 2, name: "Salı", short: "Sal" },
  { dayOfWeek: 3, name: "Çarşamba", short: "Çar" },
  { dayOfWeek: 4, name: "Perşembe", short: "Per" },
  { dayOfWeek: 5, name: "Cuma", short: "Cum" },
  { dayOfWeek: 6, name: "Cumartesi", short: "Cmt" },
  { dayOfWeek: 0, name: "Pazar", short: "Paz" },
];

export const INITIAL_BARBERS: Barber[] = [
  {
    id: "any",
    name: "Fark Etmez (En Erken Saat)",
    role: "Akıllı Koltuk Eşleştirme • Standart Salon Tarifesi",
    chairName: "İlk Müsait VIP Koltuk",
    rating: 4.96,
    reviewCount: 1015,
    experience: "Tüm VIP Ustalar",
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
    id: "patron",
    name: "Patron (Salon Kurucusu)",
    role: "Salon Sahibi & VIP Kreatif Direktör",
    chairName: "VIP Koltuk #0 (Executive Patron Suite)",
    rating: 5.0,
    reviewCount: 512,
    experience: "22 Yıl Deneyim",
    earliestSlot: "Executive Koltuk #0",
    specialties: ["Bespoke Saç & Sakal", "VIP Damat Hazırlığı", "Kişiye Özel Stil Danışmanlığı"],
    badge: "Salon Sahibi • %100 Kasa",
    avatarGradient: "from-purple-900/90 via-indigo-950 to-[#14100d]",
    initials: "PT",
    commissionRate: 100,
    customPrices: {
      haircut: 600,
      beard: 300,
      "hair-beard-combo": 800,
      "vip-groom": 2000,
    },
  },
  {
    id: "harun",
    name: "Harun Usta",
    role: "Master Barber & Salon Sahibi",
    chairName: "VIP Koltuk #1 (Usta)",
    rating: 4.99,
    reviewCount: 520,
    experience: "16 Yıl Deneyim",
    earliestSlot: "VIP Koltuk #1",
    specialties: ["Anatomik Saç Tasarımı", "VIP Damat Paketi", "Klasik Makas Kesim"],
    badge: "Master Barber • Usta",
    avatarGradient: "from-sky-900/90 via-slate-900 to-[#14100d]",
    initials: "HU",
    commissionRate: 50,
    customPrices: {
      haircut: 500,
      beard: 250,
      "hair-beard-combo": 650,
      "vip-groom": 1800,
    },
  },
  {
    id: "omer",
    name: "Ömer Çırak",
    role: "Yardımcı Kalfa & Saç Yıkama / Fön Uzmanı",
    chairName: "Koltuk #2 (Çırak / Kalfa)",
    rating: 4.92,
    reviewCount: 318,
    experience: "3 Yıl Deneyim",
    earliestSlot: "Koltuk #2",
    specialties: ["Skin Fade & Taper", "Modern Crop", "Yıkama & Fön"],
    badge: "Çırak / Kalfa",
    avatarGradient: "from-emerald-900/90 via-teal-950 to-[#14100d]",
    initials: "ÖÇ",
    commissionRate: 40,
    customPrices: {
      haircut: 400,
    },
  },
  {
    id: "kerem",
    name: "Usta Kerem",
    role: "Geleneksel Ustura & Spa Uzmanı",
    chairName: "Koltuk #3 (Spa Lounge)",
    rating: 4.95,
    reviewCount: 255,
    experience: "12 Yıl Deneyim",
    earliestSlot: "Koltuk #3",
    specialties: ["Sıcak Havlu Ritüeli", "Kraliyet Sakal Tıraşı", "Medikal Cilt Bakımı"],
    badge: "Spa & Bakım • %45 Prim",
    avatarGradient: "from-rose-900/85 via-amber-950 to-[#14100d]",
    initials: "UK",
    commissionRate: 45,
    customPrices: {},
  },
];

export const BARBERS = INITIAL_BARBERS;

export const INITIAL_SERVICES: Service[] = [
  {
    id: "haircut",
    name: "Saç Kesimi",
    description: "Kafa ve yüz anatomisine özel saç kesimi, rahatlatıcı yıkama ve fön ile şekillendirme.",
    price: 400,
    duration: 30,
    category: "hair",
    popular: true,
  },
  {
    id: "beard",
    name: "Sakal Tıraşı",
    description: "Sıcak havlu kompresi, geleneksel ustura ile hat belirginleştirme ve organik sakal iksiri.",
    price: 200,
    duration: 15,
    category: "beard",
    popular: true,
  },
  {
    id: "hair-beard-combo",
    name: "Saç & Sakal Komple Bakım",
    description: "Anatomik saç kesimi, sıcak havlulu sakal tasarımı, ense kontürü, yıkama ve baş masajı.",
    price: 550,
    duration: 45,
    category: "package",
    popular: true,
  },
  {
    id: "skin-care",
    name: "Buharlı Cilt Bakımı & Siyah Maske",
    description: "Ozon buharı ile gözenek temizliği, siyah karbon peeling maskesi ve nemlendirici serum terapisi.",
    price: 300,
    duration: 20,
    category: "care",
  },
  {
    id: "hair-spa",
    name: "Keratin Botoks & Saç Spa",
    description: "Yıpranmış saçlara özel yoğun keratin yüklemesi, saç derisi detoksu ve sıcak buhar bakımı.",
    price: 450,
    duration: 30,
    category: "care",
  },
  {
    id: "vip-groom",
    name: "VIP Damat Paketi",
    description: "Özel VIP odada saç & sakal tasarımı, ozon buharlı cilt bakımı, keratin maskesi, manikür ve espresso ikramı.",
    price: 1500,
    duration: 90,
    category: "package",
    vip: true,
  },
];

export const TR_MONTHS_SHORT = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

export const TR_MONTHS_FULL = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export const TR_DAYS_FULL = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];

export const TR_DAYS_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

/**
 * Cihazın gerçek güncel tarihini Türkiye saat dilimine (Europe/Istanbul, +03:00) göre döndürür.
 */
export function getTurkeyNow(): Date {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value || 0);
    const rawHour = get("hour");
    return new Date(
      get("year"),
      get("month") - 1,
      get("day"),
      rawHour === 24 ? 0 : rawHour,
      get("minute"),
      get("second")
    );
  } catch {
    return now;
  }
}

export function toIsoDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildDayMetadataFromDate(
  targetDate: Date,
  todayRef: Date = getTurkeyNow()
): DayMetadata {
  const cleanTarget = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  );
  const cleanToday = new Date(
    todayRef.getFullYear(),
    todayRef.getMonth(),
    todayRef.getDate()
  );

  const diffDays = Math.round(
    (cleanTarget.getTime() - cleanToday.getTime()) / (1000 * 60 * 60 * 24)
  );

  const dayNum = cleanTarget.getDate();
  const monthIdx = cleanTarget.getMonth();
  const dayOfWeek = cleanTarget.getDay();

  const monthShortTr = TR_MONTHS_SHORT[monthIdx] || "";
  const monthFullTr = TR_MONTHS_FULL[monthIdx] || "";
  const dayNameTr = TR_DAYS_FULL[dayOfWeek] || "";
  const dayShortTr = TR_DAYS_SHORT[dayOfWeek] || "";

  const isoDate = toIsoDateString(cleanTarget);
  const dateStr = `${dayNum} ${monthShortTr}`;
  const fullDate = `${dayNum} ${monthFullTr} ${dayNameTr}`;

  const isToday = diffDays === 0;
  const isTomorrow = diffDays === 1;

  const label = isToday
    ? "Bugün"
    : isTomorrow
    ? "Yarın"
    : `${dayNum} ${monthShortTr} ${dayShortTr}`;

  const chipLabel = isToday
    ? `Bugün (${dateStr})`
    : isTomorrow
    ? `Yarın (${dateStr})`
    : `${dayNum} ${monthShortTr} ${dayShortTr}`;

  return {
    id: isoDate,
    isoDate,
    label,
    chipLabel,
    dayName: dayNameTr,
    dayShort: dayShortTr,
    dateStr,
    fullDate,
    dayNumber: String(dayNum),
    monthShort: monthShortTr.toUpperCase(),
    dayOfWeek,
    isToday,
    isTomorrow,
  };
}

/**
 * Bugünden başlayarak önümüzdeki `count` günün (varsayılan 7 gün) gerçek zamanlı
 * tarih verilerini üretir. Geçmiş günler kesinlikle dahil edilmez.
 */
export function getLiveDaysMetadata(count: number = 7): DayMetadata[] {
  const today = getTurkeyNow();
  const days: DayMetadata[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + i
    );
    days.push(buildDayMetadataFromDate(d, today));
  }
  return days;
}

/**
 * Herhangi bir tarih girdisini kesin olarak "YYYY-MM-DD" formatına çevirir.
 * Geçmiş tarihleri ASLA bugüne kaydırmaz!
 */
export function toStrictIsoDate(rawDayId?: string | null): string {
  const today = getTurkeyNow();
  const todayIso = toIsoDateString(today);
  if (!rawDayId) return todayIso;

  const trimmed = rawDayId.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  if (/^day-\d+$/i.test(trimmed)) {
    const liveDays = getLiveDaysMetadata(14);
    const idx = Math.max(0, parseInt(trimmed.split("-")[1], 10) - 1);
    return (liveDays[Math.min(idx, liveDays.length - 1)] || liveDays[0]).isoDate;
  }

  return todayIso;
}

/**
 * Bir randevu veya mola kaydının kesin "YYYY-MM-DD" tarihini döndürür.
 * Eğer eski bir kayıtta dayId "day-1" formatındaysa ve dateLabel içinde açıkça
 * "7 Kas", "8 Kas" gibi bir tarih varsa, geçmiş günün bugüne kaymaması için dateLabel'dan gerçek tarihi çözer.
 */
export function getAppointmentIsoDate(
  apt?: {
    appointment_date?: string | null;
    date?: string | null;
    dayId?: string | null;
    dateLabel?: string | null;
  } | null
): string {
  if (!apt) return "";
  const explicitIso = [apt.appointment_date, apt.date, apt.dayId].find(
    (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v.trim())
  );
  if (explicitIso) {
    return explicitIso.trim().slice(0, 10);
  }

  if (apt.dateLabel && typeof apt.dateLabel === "string") {
    const labelMatch = apt.dateLabel.match(
      /(\d{1,2})\s+(Oca|Şub|Mar|Nis|May|Haz|Tem|Ağu|Eyl|Eki|Kas|Ara)/i
    );
    if (labelMatch) {
      const dayNum = parseInt(labelMatch[1], 10);
      const monthName = labelMatch[2].toLocaleLowerCase("tr-TR");
      const monthIdx = TR_MONTHS_SHORT.findIndex(
        (m) => m.toLocaleLowerCase("tr-TR") === monthName
      );
      if (monthIdx !== -1 && dayNum >= 1 && dayNum <= 31) {
        const today = getTurkeyNow();
        const year = today.getFullYear();
        return toIsoDateString(new Date(year, monthIdx, dayNum));
      }
    }
  }

  const raw = apt.appointment_date || apt.date || apt.dayId || "";
  if (!raw) return "";
  return toStrictIsoDate(raw);
}

/**
 * Verilen ISO tarih veya eski "day-1", "day-2" kimliğini gerçek güncel DayMetadata'ya çevirir.
 * KESİN KURAL: Geçmiş veya ileri "YYYY-MM-DD" tarihlerini ASLA bugüne (liveDays[0]) çekmez!
 */
export function resolveDayMetadata(rawDayId?: string | null): DayMetadata {
  const liveDays = getLiveDaysMetadata(14);
  if (!rawDayId) return liveDays[0];

  const trimmed = rawDayId.trim();

  // Eski "day-1" .. "day-7" formatını bugünden itibaren gerçek günlere eşle
  if (/^day-\d+$/i.test(trimmed)) {
    const idx = Math.max(0, parseInt(trimmed.split("-")[1], 10) - 1);
    return liveDays[Math.min(idx, liveDays.length - 1)] || liveDays[0];
  }

  const isoCandidate = /^\d{4}-\d{2}-\d{2}/.test(trimmed)
    ? trimmed.slice(0, 10)
    : trimmed;

  // ISO "YYYY-MM-DD" formatı
  const matched = liveDays.find(
    (d) => d.id === isoCandidate || d.isoDate === isoCandidate
  );
  if (matched) return matched;

  if (/^\d{4}-\d{2}-\d{2}$/.test(isoCandidate)) {
    const [y, m, d] = isoCandidate.split("-").map(Number);
    const parsed = new Date(y, (m || 1) - 1, d || 1);
    const today = getTurkeyNow();
    return buildDayMetadataFromDate(parsed, today);
  }

  return liveDays[0];
}

export const DAYS_METADATA: DayMetadata[] = getLiveDaysMetadata(7);

const _D0 = DAYS_METADATA[0];
const _D1 = DAYS_METADATA[1] || _D0;
const _D2 = DAYS_METADATA[2] || _D0;

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "apt-0a",
    appointmentCode: "#BRB-0910",
    dayId: _D0.id,
    dateLabel: _D0.chipLabel,
    time: "09:00",
    endTime: "09:45",
    customerName: "Cemil Karadağ",
    customerPhone: "0532 104 88 19",
    barberId: "patron",
    barberName: "Patron (Salon Kurucusu)",
    chairLabel: "VIP Koltuk #0 (Executive Patron Suite)",
    services: [
      { name: "Saç & Sakal Komple Bakım", price: 800, duration: 45 },
    ],
    totalPrice: 800,
    totalDuration: 45,
    trustBadge: "trusted",
    trustDetail: "VIP Müşteri • %100 Katılım",
    status: "completed",
    reminderSent: true,
    reminderSentAt: "08:00",
    bookingSource: "online",
  },
  {
    id: "apt-0b",
    appointmentCode: "#BRB-0945",
    dayId: _D0.id,
    dateLabel: _D0.chipLabel,
    time: "09:30",
    endTime: "10:15",
    customerName: "Melih Gündüz",
    customerPhone: "0543 612 09 44",
    barberId: "mert",
    barberName: "Stilist Mert",
    chairLabel: "Koltuk #2 (Studio Zone)",
    services: [
      { name: "Saç Kesimi", price: 450, duration: 30 },
      { name: "Sakal Tıraşı", price: 200, duration: 15 },
    ],
    totalPrice: 650,
    totalDuration: 45,
    trustBadge: "trusted",
    trustDetail: "11 Başarılı Randevu • %100 Katılım",
    status: "completed",
    reminderSent: true,
    reminderSentAt: "08:15",
    bookingSource: "phone",
  },
  {
    id: "apt-1",
    appointmentCode: "#BRB-1042",
    dayId: _D0.id,
    dateLabel: _D0.chipLabel,
    time: "10:00",
    endTime: "10:45",
    customerName: "Burak Soylu",
    customerPhone: "0532 418 92 10",
    barberId: "ahmet",
    barberName: "Başberber Ahmet",
    chairLabel: "VIP Koltuk #1",
    services: [
      { name: "Saç Kesimi", price: 500, duration: 30 },
      { name: "Sakal Tıraşı", price: 250, duration: 15 },
    ],
    totalPrice: 750,
    totalDuration: 45,
    trustBadge: "trusted",
    trustDetail: "18 Başarılı Randevu • %100 Katılım",
    status: "completed",
    reminderSent: true,
    reminderSentAt: "08:30",
    bookingSource: "online",
  },
  {
    id: "apt-2",
    appointmentCode: "#BRB-2190",
    dayId: _D0.id,
    dateLabel: _D0.chipLabel,
    time: "10:30",
    endTime: "11:00",
    customerName: "Emre Karahan",
    customerPhone: "0544 892 31 04",
    barberId: "mert",
    barberName: "Stilist Mert",
    chairLabel: "Koltuk #2",
    services: [{ name: "Saç Kesimi", price: 450, duration: 30 }],
    totalPrice: 450,
    totalDuration: 30,
    trustBadge: "deposit_paid",
    trustDetail: "100 TL Kapora Alındı (Eski No-Show Kaydı)",
    depositAmount: 100,
    status: "upcoming",
    reminderSent: true,
    reminderSentAt: "09:00",
  },
  {
    id: "apt-3",
    appointmentCode: "#BRB-3085",
    dayId: _D0.id,
    dateLabel: _D0.chipLabel,
    time: "12:00",
    endTime: "13:30",
    customerName: "Kaan Demirtaş",
    customerPhone: "0533 710 55 88",
    barberId: "ahmet",
    barberName: "Başberber Ahmet",
    chairLabel: "VIP Koltuk #1",
    services: [{ name: "VIP Damat Paketi", price: 1800, duration: 90 }],
    totalPrice: 1800,
    totalDuration: 90,
    trustBadge: "trusted",
    trustDetail: "VIP Müşteri • 9 Başarılı Randevu",
    status: "upcoming",
    reminderSent: true,
    reminderSentAt: "10:00",
  },
  {
    id: "apt-4",
    appointmentCode: "#BRB-4829",
    dayId: _D0.id,
    dateLabel: _D0.chipLabel,
    time: "15:00",
    endTime: "15:45",
    customerName: "Tolga Çelik",
    customerPhone: "0535 209 44 19",
    barberId: "kerem",
    barberName: "Usta Kerem",
    chairLabel: "Koltuk #3",
    services: [
      { name: "Saç Kesimi", price: 400, duration: 30 },
      { name: "Sakal Tıraşı", price: 200, duration: 15 },
    ],
    totalPrice: 600,
    totalDuration: 45,
    trustBadge: "first_time",
    trustDetail: "İlk Randevu • WhatsApp Doğrulandı",
    status: "upcoming",
    reminderSent: false,
  },
  {
    id: "apt-5",
    appointmentCode: "#BRB-5512",
    dayId: _D0.id,
    dateLabel: _D0.chipLabel,
    time: "16:30",
    endTime: "17:15",
    customerName: "Oğuzhan Yıldırım",
    customerPhone: "0555 000 00 00",
    barberId: "mert",
    barberName: "Stilist Mert",
    chairLabel: "Koltuk #2",
    services: [
      { name: "Saç Kesimi", price: 450, duration: 30 },
      { name: "Sakal Tıraşı", price: 200, duration: 15 },
    ],
    totalPrice: 650,
    totalDuration: 45,
    trustBadge: "deposit_paid",
    trustDetail: "100 TL Kapora Alındı • Güvence Altında",
    depositAmount: 100,
    status: "upcoming",
    reminderSent: false,
  },
  {
    id: "apt-6",
    appointmentCode: "#BRB-6740",
    dayId: _D1.id,
    dateLabel: _D1.chipLabel,
    time: "11:00",
    endTime: "11:45",
    customerName: "Serkan Aksoy",
    customerPhone: "0530 911 64 22",
    barberId: "ahmet",
    barberName: "Başberber Ahmet",
    chairLabel: "VIP Koltuk #1",
    services: [{ name: "Saç & Sakal Komple Bakım", price: 650, duration: 45 }],
    totalPrice: 650,
    totalDuration: 45,
    trustBadge: "trusted",
    trustDetail: "24 Başarılı Randevu • Sadakat Üyesi",
    status: "upcoming",
    reminderSent: false,
  },
  {
    id: "apt-7",
    appointmentCode: "#BRB-7120",
    dayId: _D2.id,
    dateLabel: _D2.chipLabel,
    time: "14:00",
    endTime: "14:30",
    customerName: "Murat Bozdağ",
    customerPhone: "0532 718 44 10",
    barberId: "mert",
    barberName: "Stilist Mert",
    chairLabel: "Koltuk #2",
    services: [{ name: "Saç Kesimi", price: 450, duration: 30 }],
    totalPrice: 450,
    totalDuration: 30,
    trustBadge: "trusted",
    trustDetail: "Sadakat Üyesi",
    status: "upcoming",
    reminderSent: false,
  },
];

export const INITIAL_WAITLIST: WaitlistEntry[] = [
  {
    id: "wl-1",
    customerName: "Alperen Kaya",
    customerPhone: "0532 601 88 12",
    dayId: _D0.id,
    requestedTime: "15:00",
    requestedDateLabel: _D0.label,
    barberName: "Usta Kerem",
    servicesSummary: "Saç Kesimi + Sakal Tıraşı",
    totalPrice: 600,
    createdAt: "25 dk önce",
    notified: false,
  },
  {
    id: "wl-2",
    customerName: "Mertcan Aydın",
    customerPhone: "0543 772 10 95",
    dayId: _D0.id,
    requestedTime: "15:00",
    requestedDateLabel: _D0.label,
    barberName: "Fark Etmez (İlk Müsait)",
    servicesSummary: "Saç Kesimi",
    totalPrice: 400,
    createdAt: "12 dk önce",
    notified: false,
  },
  {
    id: "wl-3",
    customerName: "Hakan Şahin",
    customerPhone: "0536 994 21 00",
    dayId: _D0.id,
    requestedTime: "16:30",
    requestedDateLabel: _D0.label,
    barberName: "Stilist Mert",
    servicesSummary: "Saç & Sakal Komple Bakım",
    totalPrice: 550,
    createdAt: "5 dk önce",
    notified: false,
  },
  {
    id: "wl-4",
    customerName: "Onur Koçak",
    customerPhone: "0533 812 49 01",
    dayId: _D0.id,
    requestedTime: "12:00",
    requestedDateLabel: _D0.label,
    barberName: "Başberber Ahmet",
    servicesSummary: "VIP Damat Paketi",
    totalPrice: 1800,
    createdAt: "32 dk önce",
    notified: false,
  },
];

// ORTAK KARA LİSTE AĞI (Global No-Show Shield - 12 Kayıtlı Numara)
export const INITIAL_GLOBAL_BLACKLIST: BlacklistEntry[] = [
  {
    phone: "05550000000",
    name: "Kayıtlı No-Show Müşterisi (Test)",
    missedDate: "Geçen Hafta - 17:00",
    missedService: "Saç & Sakal Komple Bakım (550 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "atelier-noir",
    reportedByShopName: "Atelier Noir VIP",
  },
  {
    phone: "05329001122",
    name: "Caner Pektaş",
    missedDate: "6 Gün Önce - 15:30",
    missedService: "VIP Damat Paketi (1500 TL)",
    requiredDeposit: 150,
    reportedByShopSlug: "makas-vip",
    reportedByShopName: "Makas VIP Barber Club",
  },
  {
    phone: "05428113344",
    name: "Gökhan Sarı",
    missedDate: "5 Gün Önce - 12:00",
    missedService: "Saç Kesimi + Sakal (600 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "atelier-noir",
    reportedByShopName: "Atelier Noir VIP",
  },
  {
    phone: "05334045566",
    name: "Barış Özkan",
    missedDate: "5 Gün Önce - 18:00",
    missedService: "Skin Fade & Sakal Tasarımı (500 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "makas-vip",
    reportedByShopName: "Makas VIP Barber Club",
  },
  {
    phone: "05456127788",
    name: "Cenk Yılmazer",
    missedDate: "4 Gün Önce - 14:00",
    missedService: "Saç Kesimi (400 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "salon-harun",
    reportedByShopName: "Salon Harun Gentlemen's",
  },
  {
    phone: "05302229900",
    name: "Sinan Akbulut",
    missedDate: "4 Gün Önce - 16:30",
    missedService: "Keratin Botoks & Saç Spa (450 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "atelier-noir",
    reportedByShopName: "Atelier Noir VIP",
  },
  {
    phone: "05359981123",
    name: "Volkan Erdem",
    missedDate: "3 Gün Önce - 11:00",
    missedService: "Saç & Sakal Komple Bakım (550 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "makas-vip",
    reportedByShopName: "Makas VIP Barber Club",
  },
  {
    phone: "05443318877",
    name: "Uğur Taşkın",
    missedDate: "3 Gün Önce - 19:00",
    missedService: "Saç Kesimi (450 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "atelier-noir",
    reportedByShopName: "Atelier Noir VIP",
  },
  {
    phone: "05367114455",
    name: "Koray Güler",
    missedDate: "2 Gün Önce - 15:00",
    missedService: "Buharlı Cilt Bakımı (300 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "salon-harun",
    reportedByShopName: "Salon Harun Gentlemen's",
  },
  {
    phone: "05381092233",
    name: "Tuna Soydan",
    missedDate: "2 Gün Önce - 17:30",
    missedService: "Saç Kesimi + Sakal Tıraşı (600 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "makas-vip",
    reportedByShopName: "Makas VIP Barber Club",
  },
  {
    phone: "05418826611",
    name: "Levent Çakır",
    missedDate: "Dün - 18:30",
    missedService: "VIP Damat Paketi (1500 TL)",
    requiredDeposit: 150,
    reportedByShopSlug: "atelier-noir",
    reportedByShopName: "Atelier Noir VIP",
  },
  {
    phone: "05327654321",
    name: "Arda Kılıç",
    missedDate: "Dün - 13:30",
    missedService: "Saç Kesimi (400 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "makas-vip",
    reportedByShopName: "Makas VIP Barber Club",
  },
];

export const INITIAL_BLACKLIST = INITIAL_GLOBAL_BLACKLIST;

// 3 VARSAYILAN TENANT (BERBER DÜKKANI)
export const INITIAL_SHOPS: TenantShop[] = [
  {
    slug: "atelier-noir",
    name: "Atelier Noir VIP",
    subtitle: "VIP Grooming Lounge & Bespoke Barber",
    phone: "0212 801 44 00",
    district: "Nişantaşı, İstanbul",
    monthlyFee: 1500,
    subscriptionStatus: "active",
    subscriptionEndDate: "30 Kasım 2026",
    createdAt: "01 Ağustos 2026",
    adminPin: "1234",
    depositPolicy: "require_deposit",
    depositAmount: 100,
    iban: "TR33 0006 2000 0001 2345 6789 01",
    barbers: INITIAL_BARBERS,
    services: INITIAL_SERVICES,
    shopSettings: INITIAL_SHOP_SETTINGS,
    appointments: INITIAL_APPOINTMENTS,
    waitlist: INITIAL_WAITLIST,
    adminAlerts: [],
    stats: {
      savedRevenue: 8400,
      waitlistFilled: 14,
      preventedNoShows: 6,
    },
  },
  {
    slug: "makas-vip",
    name: "Makas VIP Barber Club",
    subtitle: "Executive Men's Club & Fade Studio",
    phone: "0212 912 77 10",
    district: "Etiler, İstanbul",
    monthlyFee: 1000,
    subscriptionStatus: "active",
    subscriptionEndDate: "15 Aralık 2026",
    createdAt: "15 Eylül 2026",
    adminPin: "1234",
    depositPolicy: "require_deposit",
    depositAmount: 150,
    iban: "TR56 0006 2000 0001 9876 5432 01",
    barbers: [
      {
        id: "any",
        name: "Fark Etmez (En Erken Saat)",
        role: "Akıllı Koltuk Eşleştirme • Makas VIP Standart Tarife",
        chairName: "İlk Müsait Makas VIP Koltuk",
        rating: 4.94,
        reviewCount: 680,
        experience: "Tüm Makas VIP Ustaları",
        earliestSlot: "Bugün En Erken",
        specialties: ["En Erken Saat", "Standart Tarife", "Hızlı Onay"],
        isAnyOption: true,
        badge: "En Hızlı Seçenek",
        avatarGradient: "from-[#b47b48] via-[#c88a53] to-[#8c5828]",
        initials: "VIP",
        commissionRate: 50,
        customPrices: {},
      },
      {
        id: "kaan-usta",
        name: "Başberber Kaan",
        role: "Makas VIP Kurucu & Master Stylist",
        chairName: "Koltuk #1 (Executive Deri Süit)",
        rating: 4.99,
        reviewCount: 390,
        experience: "16 Yıl Deneyim",
        earliestSlot: "Executive Koltuk #1",
        specialties: ["Executive Makas Kesim", "Anatomik Sakal", "VIP Damat"],
        badge: "Kurucu Usta • %100 Kasa",
        avatarGradient: "from-[#3b281c] via-[#261a12] to-[#14100d]",
        initials: "BK",
        commissionRate: 100,
        customPrices: {
          "makas-haircut": 650,
          "makas-beard": 350,
          "makas-combo": 900,
        },
      },
      {
        id: "baran-usta",
        name: "Stilist Baran",
        role: "Fade & Razor Art Specialist",
        chairName: "Koltuk #2 (Fade Loft)",
        rating: 4.92,
        reviewCount: 215,
        experience: "8 Yıl Deneyim",
        earliestSlot: "Koltuk #2",
        specialties: ["Zero Skin Fade", "Crop & Texture", "Buharlı Sakal"],
        badge: "Fade Uzmanı • %40 Prim",
        avatarGradient: "from-[#4a3222] via-[#2d1e15] to-[#14100d]",
        initials: "SB",
        commissionRate: 40,
        customPrices: {},
      },
    ],
    services: [
      {
        id: "makas-haircut",
        name: "Executive Saç Kesimi",
        description: "Makas VIP imzalı anatomik saç kesimi, sıcak havlu ve şekillendirme.",
        price: 500,
        duration: 30,
        category: "hair",
        popular: true,
      },
      {
        id: "makas-beard",
        name: "Kraliyet Ustura Sakal Tıraşı",
        description: "Çift sıcak havlu ritüeli, ustura kontür ve organik sedir ağacı sakal yağı.",
        price: 250,
        duration: 15,
        category: "beard",
        popular: true,
      },
      {
        id: "makas-combo",
        name: "Makas VIP Gold Paket (Saç + Sakal + Bakım)",
        description: "Saç kesimi, sıcak havlu sakal tasarımı, karbon maske ve espresso ikramı.",
        price: 700,
        duration: 45,
        category: "package",
        vip: true,
      },
      {
        id: "makas-groom",
        name: "Platinum Damat & Özel Gün Paketi",
        description: "Özel süitte tam gün hazırlık, saç-sakal, cilt bakımı, manikür ve VIP ikramlar.",
        price: 1800,
        duration: 90,
        category: "package",
        vip: true,
      },
    ],
    shopSettings: {
      openTime: "10:00",
      closeTime: "22:00",
      slotInterval: 30,
      breakEnabled: false,
      breakStart: "14:00",
      breakEnd: "15:00",
      closedDays: [0],
    },
    appointments: [
      {
        id: "makas-apt-0",
        appointmentCode: "#MKS-1012",
        dayId: _D0.id,
        dateLabel: _D0.chipLabel,
        time: "10:00",
        endTime: "10:30",
        customerName: "Kerem Aktürkoğlu",
        customerPhone: "0532 490 12 34",
        barberId: "baran-usta",
        barberName: "Stilist Baran",
        chairLabel: "Koltuk #2 (Fade Loft)",
        services: [{ name: "Executive Saç Kesimi", price: 500, duration: 30 }],
        totalPrice: 500,
        totalDuration: 30,
        trustBadge: "trusted",
        trustDetail: "9 Başarılı Randevu • %100 Katılım",
        status: "completed",
        reminderSent: true,
        reminderSentAt: "08:30",
      },
      {
        id: "makas-apt-1",
        appointmentCode: "#MKS-8821",
        dayId: _D0.id,
        dateLabel: _D0.chipLabel,
        time: "11:00",
        endTime: "11:45",
        customerName: "Efe Çamoğlu",
        customerPhone: "0532 511 40 22",
        barberId: "kaan-usta",
        barberName: "Başberber Kaan",
        chairLabel: "Koltuk #1 (Executive Deri Süit)",
        services: [{ name: "Makas VIP Gold Paket", price: 900, duration: 45 }],
        totalPrice: 900,
        totalDuration: 45,
        trustBadge: "trusted",
        trustDetail: "12 Başarılı Randevu • %100 Katılım",
        status: "upcoming",
        reminderSent: true,
        reminderSentAt: "09:30",
      },
      {
        id: "makas-apt-2",
        appointmentCode: "#MKS-4109",
        dayId: _D0.id,
        dateLabel: _D0.chipLabel,
        time: "15:30",
        endTime: "16:00",
        customerName: "Dorukhan Yaman",
        customerPhone: "0542 308 19 80",
        barberId: "baran-usta",
        barberName: "Stilist Baran",
        chairLabel: "Koltuk #2 (Fade Loft)",
        services: [{ name: "Executive Saç Kesimi", price: 500, duration: 30 }],
        totalPrice: 500,
        totalDuration: 30,
        trustBadge: "first_time",
        trustDetail: "İlk Randevu • WhatsApp Onaylı",
        status: "upcoming",
        reminderSent: false,
      },
    ],
    waitlist: [
      {
        id: "makas-wl-1",
        customerName: "Batuhan Güzel",
        customerPhone: "0533 619 82 00",
        dayId: _D0.id,
        requestedTime: "15:30",
        requestedDateLabel: _D0.label,
        barberName: "Stilist Baran",
        servicesSummary: "Executive Saç Kesimi",
        totalPrice: 500,
        createdAt: "18 dk önce",
        notified: false,
      },
    ],
    adminAlerts: [],
    stats: {
      savedRevenue: 6200,
      waitlistFilled: 9,
      preventedNoShows: 4,
    },
  },
  {
    slug: "salon-harun",
    name: "Salon Harun Gentlemen's",
    subtitle: "Signature Hair & Traditional Shave Club",
    phone: "0216 449 30 90",
    district: "Moda, Kadıköy",
    monthlyFee: 1000,
    subscriptionStatus: "expired", // Süresi Doldu (Nazik uyarı bildirimi aktif)
    subscriptionEndDate: "01 Kasım 2026",
    createdAt: "01 Eylül 2026",
    adminPin: "1234",
    depositPolicy: "require_deposit",
    depositAmount: 100,
    iban: "TR12 0006 2000 0001 5555 4444 01",
    barbers: [
      {
        id: "any",
        name: "Fark Etmez (En Erken Saat)",
        role: "Akıllı Koltuk Eşleştirme • Standart Tarife",
        chairName: "İlk Müsait Koltuk",
        rating: 4.97,
        reviewCount: 520,
        experience: "Tüm Ustalar",
        earliestSlot: "Bugün En Erken",
        specialties: ["En Erken Saat", "Standart Tarife"],
        isAnyOption: true,
        badge: "En Hızlı Seçenek",
        avatarGradient: "from-[#b47b48] via-[#c88a53] to-[#8c5828]",
        initials: "VIP",
        commissionRate: 50,
        customPrices: {},
      },
      {
        id: "harun-usta",
        name: "Master Harun",
        role: "Salon Sahibi & Başberber",
        chairName: "VIP Koltuk #1 (Cognac Suite)",
        rating: 4.99,
        reviewCount: 410,
        experience: "15 Yıl Deneyim",
        earliestSlot: "VIP Koltuk #1",
        specialties: ["İmza Kesim", "Sıcak Havlu Sakal", "VIP Damat"],
        badge: "Master Barber • %100 Kasa",
        avatarGradient: "from-[#3b281c] via-[#261a12] to-[#14100d]",
        initials: "MH",
        commissionRate: 100,
        customPrices: {
          "harun-haircut": 550,
          "harun-beard": 300,
        },
      },
    ],
    services: [
      {
        id: "harun-haircut",
        name: "Saç Kesimi",
        description: "Yüz hatlarına uygun özel tasarım saç kesimi, yıkama ve fön.",
        price: 450,
        duration: 30,
        category: "hair",
        popular: true,
      },
      {
        id: "harun-beard",
        name: "Sakal Tıraşı",
        description: "Sıcak havlu kompresi ve ustura ile sakal şekillendirme.",
        price: 250,
        duration: 15,
        category: "beard",
        popular: true,
      },
      {
        id: "harun-vip",
        name: "Gentlemen's Komple Bakım",
        description: "Saç kesimi, sakal tasarımı, buharlı cilt bakımı ve saç spa.",
        price: 900,
        duration: 60,
        category: "package",
        vip: true,
      },
    ],
    shopSettings: {
      openTime: "09:30",
      closeTime: "21:00",
      slotInterval: 30,
      breakEnabled: false,
      breakStart: "13:00",
      breakEnd: "14:00",
      closedDays: [0],
    },
    appointments: [
      {
        id: "harun-apt-1",
        appointmentCode: "#HRN-3011",
        dayId: _D0.id,
        dateLabel: _D0.chipLabel,
        time: "14:00",
        endTime: "15:00",
        customerName: "Kemal Arslan",
        customerPhone: "0535 442 18 90",
        barberId: "harun-usta",
        barberName: "Master Harun",
        chairLabel: "VIP Koltuk #1 (Cognac Suite)",
        services: [{ name: "Gentlemen's Komple Bakım", price: 900, duration: 60 }],
        totalPrice: 900,
        totalDuration: 60,
        trustBadge: "trusted",
        trustDetail: "8 Başarılı Randevu",
        status: "upcoming",
        reminderSent: true,
        reminderSentAt: "11:00",
      },
    ],
    waitlist: [],
    adminAlerts: [],
    stats: {
      savedRevenue: 4500,
      waitlistFilled: 7,
      preventedNoShows: 3,
    },
  },
];
