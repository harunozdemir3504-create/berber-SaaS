export interface Barber {
  id: string;
  name: string;
  role: string;
  chairName: string;
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
  id: string;
  label: string; // e.g., "Bugün", "Yarın", "Cuma"
  dayName: string; // e.g., "Çarşamba"
  dateStr: string; // e.g., "28 Eki"
  fullDate: string;
  dayNumber: string;
  monthShort: string;
  dayOfWeek: number; // 0 (Pazar) - 6 (Cumartesi)
  isToday?: boolean;
}

export type TrustBadgeType = "trusted" | "first_time" | "deposit_paid";
export type AppointmentStatus = "upcoming" | "completed" | "no_show" | "cancelled";

export interface Appointment {
  id: string;
  appointmentCode: string; // e.g., "#BRB-4829"
  dayId: string; // e.g., "day-1"
  dateLabel: string; // e.g., "Bugün (28 Eki)"
  time: string;
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
  type: "cancellation_waitlist" | "noshow_waitlist" | "reschedule" | "info";
  read: boolean;
}

export interface RevenueStats {
  savedRevenue: number;
  waitlistFilled: number;
  preventedNoShows: number;
}

export type SubscriptionStatus = "active" | "suspended";
export type DepositPolicyType = "require_deposit" | "block_booking";

export interface TenantShop {
  slug: string;
  name: string;
  subtitle: string;
  phone: string;
  district: string;
  monthlyFee: number;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
  adminPin: string;
  depositPolicy: DepositPolicyType;
  depositAmount: number;
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
  breakEnabled: true,
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
    avatarGradient: "from-[#4a3222] via-[#2b1d14] to-[#14100d]",
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
    id: "ahmet",
    name: "Başberber Ahmet",
    role: "Master Barber & Başkalfa",
    chairName: "VIP Koltuk #1 (Gold Suite)",
    rating: 4.98,
    reviewCount: 442,
    experience: "18 Yıl Deneyim",
    earliestSlot: "VIP Koltuk #1",
    specialties: ["Anatomik Saç Tasarımı", "VIP Damat Paketi", "Klasik Makas Kesim"],
    badge: "Master Barber • %50 Prim",
    avatarGradient: "from-[#3b281c] via-[#261a12] to-[#14100d]",
    initials: "BA",
    commissionRate: 50,
    customPrices: {
      haircut: 500,
      beard: 250,
      "hair-beard-combo": 650,
      "vip-groom": 1800,
    },
  },
  {
    id: "mert",
    name: "Stilist Mert",
    role: "Senior Hair & Fade Artist",
    chairName: "Koltuk #2 (Studio Zone)",
    rating: 4.93,
    reviewCount: 318,
    experience: "9 Yıl Deneyim",
    earliestSlot: "Koltuk #2",
    specialties: ["Skin Fade & Taper", "Modern Crop", "Sakal Kontür & Şekillendirme"],
    badge: "Trend Uzmanı • %40 Prim",
    avatarGradient: "from-[#4a3222] via-[#2d1e15] to-[#14100d]",
    initials: "SM",
    commissionRate: 40,
    customPrices: {
      haircut: 450,
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
    avatarGradient: "from-[#3d2b1f] via-[#241912] to-[#14100d]",
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

export const DAYS_METADATA: DayMetadata[] = [
  {
    id: "day-1",
    label: "Bugün",
    dayName: "Çarşamba",
    dateStr: "28 Eki",
    dayNumber: "28",
    monthShort: "EKİ",
    fullDate: "28 Ekim Çarşamba",
    dayOfWeek: 3,
    isToday: true,
  },
  {
    id: "day-2",
    label: "Yarın",
    dayName: "Perşembe",
    dateStr: "29 Eki",
    dayNumber: "29",
    monthShort: "EKİ",
    fullDate: "29 Ekim Perşembe",
    dayOfWeek: 4,
  },
  {
    id: "day-3",
    label: "Cuma",
    dayName: "Cuma",
    dateStr: "30 Eki",
    dayNumber: "30",
    monthShort: "EKİ",
    fullDate: "30 Ekim Cuma",
    dayOfWeek: 5,
  },
  {
    id: "day-4",
    label: "Cumartesi",
    dayName: "Cumartesi",
    dateStr: "31 Eki",
    dayNumber: "31",
    monthShort: "EKİ",
    fullDate: "31 Ekim Cumartesi",
    dayOfWeek: 6,
  },
  {
    id: "day-5",
    label: "Pazar",
    dayName: "Pazar",
    dateStr: "1 Kas",
    dayNumber: "01",
    monthShort: "KAS",
    fullDate: "1 Kasım Pazar",
    dayOfWeek: 0,
  },
  {
    id: "day-6",
    label: "Pazartesi",
    dayName: "Pazartesi",
    dateStr: "2 Kas",
    dayNumber: "02",
    monthShort: "KAS",
    fullDate: "2 Kasım Pazartesi",
    dayOfWeek: 1,
  },
  {
    id: "day-7",
    label: "Salı",
    dayName: "Salı",
    dateStr: "3 Kas",
    dayNumber: "03",
    monthShort: "KAS",
    fullDate: "3 Kasım Salı",
    dayOfWeek: 2,
  },
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "apt-0a",
    appointmentCode: "#BRB-0910",
    dayId: "day-1",
    dateLabel: "Bugün (28 Eki)",
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
    dayId: "day-1",
    dateLabel: "Bugün (28 Eki)",
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
    dayId: "day-1",
    dateLabel: "Bugün (28 Eki)",
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
    dayId: "day-1",
    dateLabel: "Bugün (28 Eki)",
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
    dayId: "day-1",
    dateLabel: "Bugün (28 Eki)",
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
    dayId: "day-1",
    dateLabel: "Bugün (28 Eki)",
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
    trustDetail: "İlk Randevu • WhatsApp OTP Doğrulandı",
    status: "upcoming",
    reminderSent: false,
  },
  {
    id: "apt-5",
    appointmentCode: "#BRB-5512",
    dayId: "day-1",
    dateLabel: "Bugün (28 Eki)",
    time: "16:00",
    endTime: "16:45",
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
    dayId: "day-1",
    dateLabel: "Bugün (28 Eki)",
    time: "17:30",
    endTime: "18:15",
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
];

export const INITIAL_WAITLIST: WaitlistEntry[] = [
  {
    id: "wl-1",
    customerName: "Alperen Kaya",
    customerPhone: "0532 601 88 12",
    dayId: "day-1",
    requestedTime: "15:00",
    requestedDateLabel: "Bugün",
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
    dayId: "day-1",
    requestedTime: "15:00",
    requestedDateLabel: "Bugün",
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
    dayId: "day-1",
    requestedTime: "16:00",
    requestedDateLabel: "Bugün",
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
    dayId: "day-1",
    requestedTime: "12:00",
    requestedDateLabel: "Bugün",
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
    missedDate: "14 Ekim 2026 - 17:00",
    missedService: "Saç & Sakal Komple Bakım (550 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "atelier-noir",
    reportedByShopName: "Atelier Noir VIP",
  },
  {
    phone: "05329001122",
    name: "Caner Pektaş",
    missedDate: "18 Ekim 2026 - 15:30",
    missedService: "VIP Damat Paketi (1500 TL)",
    requiredDeposit: 150,
    reportedByShopSlug: "makas-vip",
    reportedByShopName: "Makas VIP Barber Club",
  },
  {
    phone: "05428113344",
    name: "Gökhan Sarı",
    missedDate: "19 Ekim 2026 - 12:00",
    missedService: "Saç Kesimi + Sakal (600 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "atelier-noir",
    reportedByShopName: "Atelier Noir VIP",
  },
  {
    phone: "05334045566",
    name: "Barış Özkan",
    missedDate: "20 Ekim 2026 - 18:00",
    missedService: "Skin Fade & Sakal Tasarımı (500 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "makas-vip",
    reportedByShopName: "Makas VIP Barber Club",
  },
  {
    phone: "05456127788",
    name: "Cenk Yılmazer",
    missedDate: "21 Ekim 2026 - 14:00",
    missedService: "Saç Kesimi (400 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "salon-harun",
    reportedByShopName: "Salon Harun Gentlemen's",
  },
  {
    phone: "05302229900",
    name: "Sinan Akbulut",
    missedDate: "22 Ekim 2026 - 16:30",
    missedService: "Keratin Botoks & Saç Spa (450 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "atelier-noir",
    reportedByShopName: "Atelier Noir VIP",
  },
  {
    phone: "05359981123",
    name: "Volkan Erdem",
    missedDate: "23 Ekim 2026 - 11:00",
    missedService: "Saç & Sakal Komple Bakım (550 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "makas-vip",
    reportedByShopName: "Makas VIP Barber Club",
  },
  {
    phone: "05443318877",
    name: "Uğur Taşkın",
    missedDate: "24 Ekim 2026 - 19:00",
    missedService: "Saç Kesimi (450 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "atelier-noir",
    reportedByShopName: "Atelier Noir VIP",
  },
  {
    phone: "05367114455",
    name: "Koray Güler",
    missedDate: "25 Ekim 2026 - 15:00",
    missedService: "Buharlı Cilt Bakımı (300 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "salon-harun",
    reportedByShopName: "Salon Harun Gentlemen's",
  },
  {
    phone: "05381092233",
    name: "Tuna Soydan",
    missedDate: "26 Ekim 2026 - 17:30",
    missedService: "Saç Kesimi + Sakal Tıraşı (600 TL)",
    requiredDeposit: 100,
    reportedByShopSlug: "makas-vip",
    reportedByShopName: "Makas VIP Barber Club",
  },
  {
    phone: "05418826611",
    name: "Levent Çakır",
    missedDate: "26 Ekim 2026 - 18:30",
    missedService: "VIP Damat Paketi (1500 TL)",
    requiredDeposit: 150,
    reportedByShopSlug: "atelier-noir",
    reportedByShopName: "Atelier Noir VIP",
  },
  {
    phone: "05327654321",
    name: "Arda Kılıç",
    missedDate: "27 Ekim 2026 - 13:30",
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
    createdAt: "01 Ağustos 2026",
    adminPin: "1234",
    depositPolicy: "require_deposit",
    depositAmount: 100,
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
    createdAt: "15 Eylül 2026",
    adminPin: "1234",
    depositPolicy: "require_deposit",
    depositAmount: 150,
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
      breakEnabled: true,
      breakStart: "14:00",
      breakEnd: "15:00",
      closedDays: [0],
    },
    appointments: [
      {
        id: "makas-apt-0",
        appointmentCode: "#MKS-1012",
        dayId: "day-1",
        dateLabel: "Bugün (28 Eki)",
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
        dayId: "day-1",
        dateLabel: "Bugün (28 Eki)",
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
        dayId: "day-1",
        dateLabel: "Bugün (28 Eki)",
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
        dayId: "day-1",
        requestedTime: "15:30",
        requestedDateLabel: "Bugün",
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
    subscriptionStatus: "suspended", // Ödeme Bekliyor / Askıda
    createdAt: "02 Ekim 2026",
    adminPin: "1234",
    depositPolicy: "require_deposit",
    depositAmount: 100,
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
      breakEnabled: true,
      breakStart: "13:00",
      breakEnd: "14:00",
      closedDays: [0],
    },
    appointments: [
      {
        id: "harun-apt-1",
        appointmentCode: "#HRN-3011",
        dayId: "day-1",
        dateLabel: "Bugün (28 Eki)",
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
