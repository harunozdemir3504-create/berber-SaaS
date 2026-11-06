"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Users,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Scissors,
  Phone,
  BellRing,
  Plus,
  Check,
  Ban,
  Settings,
  Calendar as CalendarIcon,
  CalendarDays,
  Trash2,
  Edit3,
  Save,
  Coffee,
  CalendarOff,
  ExternalLink,
  X,
  UserPlus,
  Armchair,
  Share2,
  Lock,
  Unlock,
  QrCode,
  AlertTriangle,
  RotateCcw,
  LogOut,
  User,
  Volume2,
  Copy,
  MapPin,
  ChevronDown,
  Zap,
  Sun,
  Moon,
  Download,
  PhoneCall,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import {
  useBarber,
  formatPhoneForWhatsApp,
  formatPhoneDisplay,
  buildWhatsAppUrl,
  minutesToTime,
  timeToMinutes,
  getShopBookingUrl,
  getShopDisplayUrl,
  SITE_DOMAIN,
  SITE_URL,
} from "@/context/BarberContext";
import AdminPinGate, { lockAdminSession } from "@/components/AdminPinGate";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import TimelineAppointmentCard from "@/components/TimelineAppointmentCard";
import QrPosterModal from "@/components/QrPosterModal";
import {
  Appointment,
  Barber,
  getLiveDaysMetadata,
  resolveDayMetadata,
  Service,
  WEEKDAYS_TR,
} from "@/data/mockData";
import {
  NewBookingNotificationPayload,
  playNewBookingChime,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
  subscribeToLiveBookingEvents,
} from "@/lib/notifications";

type BottomNavTab = "appointments" | "quick_add" | "other";
type AppointmentFilterTab = "active" | "early_backup" | "history";
type AdminDayViewMode = "today" | "tomorrow" | "calendar" | "all";
type OtherSubTab =
  | "shop_info"
  | "stats_blacklist"
  | "barbers"
  | "services"
  | "schedule";

export default function AdminDashboardPage() {
  const {
    currentShop,
    currentShopSlug,
    appointments,
    waitlist,
    globalBlacklist,
    barbers,
    services,
    shopSettings,
    adminAlerts,
    stats,
    addAppointment,
    markAppointmentCompleted,
    confirmAppointment,
    markAppointmentNoShow,
    cancelAppointmentByCustomer,
    shiftAppointmentToEarlySlot,
    removeFromBlacklist,
    isPhoneBlacklisted,
    sendWhatsAppReminder,
    notifyWaitlistCustomer,
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
    updateCurrentShopDepositPolicy,
    updateCurrentShopPin,
    updateShopDetails,
    getSlotsForDay,
    dismissAdminAlert,
    clearAllAdminAlerts,
    removeAppointmentOrBlock,
    addBlockedTimeRange,
  } = useBarber();
  const { theme, toggleTheme } = useTheme();

  // Gerçek Zamanlı Canlı Tarih (new Date() - Türkiye Saati, Bugün + Önümüzdeki 7 Gün)
  const liveDays = useMemo(() => getLiveDaysMetadata(7), []);
  const todayDay = liveDays[0];
  const tomorrowDay = liveDays[1];

  // Alt Navigasyon (3 Temiz Sekme: 📅 Randevular | ➕ Hızlı Ekle | ⚙️ Diğer)
  const [bottomTab, setBottomTab] = useState<BottomNavTab>("appointments");
  const [appointmentFilter, setAppointmentFilter] =
    useState<AppointmentFilterTab>("active");
  // Koltuk / Personel Filtresi (Tümü | Harun Usta | Ali Usta vb.)
  const [adminStaffFilter, setAdminStaffFilter] = useState<string>("all");
  // Gün Seçici Şerit: Varsayılan olarak her zaman "Bugün" ("today") seçili gelir
  const [adminDayMode, setAdminDayMode] = useState<AdminDayViewMode>("today");
  const [selectedCalendarDayId, setSelectedCalendarDayId] = useState<string>(
    () => getLiveDaysMetadata(7)[2]?.id || getLiveDaysMetadata(7)[0].id
  );
  const [otherSubTab, setOtherSubTab] =
    useState<OtherSubTab>("shop_info");

  // Görünüm Modu: "timeline" (Takvim Çizelgesi) veya "list" (Liste Görünümü)
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline");

  // Hızlı QR Kod Modalı State'leri
  const [isQuickQrModalOpen, setIsQuickQrModalOpen] = useState<boolean>(false);
  const [copiedQuickQrLink, setCopiedQuickQrLink] = useState<boolean>(false);

  // Öğle Molası Buton Kilidi (Anti-Bug / Çift Tıklama Engeli)
  const [isTogglingBreak, setIsTogglingBreak] = useState<boolean>(false);

  // Sürükle - Bırak (Drag & Drop) ve Onay Modalı State'leri
  const [draggedApt, setDraggedApt] = useState<Appointment | null>(null);
  const [dragOverSlotTime, setDragOverSlotTime] = useState<string | null>(null);
  const [dragConfirmModal, setDragConfirmModal] = useState<{
    isOpen: boolean;
    appointment: Appointment | null;
    targetTime: string;
  }>({
    isOpen: false,
    appointment: null,
    targetTime: "",
  });

  // Mobil Dokunmatik Saat Değiştirme Modalı
  const [mobileRescheduleApt, setMobileRescheduleApt] = useState<Appointment | null>(null);

  // Takvim Randevu Tıklama & Bilgi/Aksiyon Modalı
  const [selectedDetailApt, setSelectedDetailApt] = useState<Appointment | null>(null);
  const dragMovedRef = useRef<boolean>(false);

  // SALON BİLGİLERİ DÜZENLEME STATE (Dükkan Adı, Telefon, İlçe, Slogan, IBAN, Kapora)
  const [shopNameInput, setShopNameInput] = useState<string>("");
  const [shopPhoneInput, setShopPhoneInput] = useState<string>("");
  const [shopDistrictInput, setShopDistrictInput] = useState<string>("");
  const [shopSubtitleInput, setShopSubtitleInput] = useState<string>("");
  const [shopPinInput, setShopPinInput] = useState<string>("");
  const [shopIbanInput, setShopIbanInput] = useState<string>("");
  const [shopDepositInput, setShopDepositInput] = useState<number>(100);
  const [isCopiedShopUrl, setIsCopiedShopUrl] = useState<boolean>(false);

  // ⛔ Saat Kapat / Mola Ekle Modalı State
  const [blockModal, setBlockModal] = useState<{
    isOpen: boolean;
    barberId: string;
    dayId: string;
    startTime: string;
    endTime: string;
    reason: string;
  }>({
    isOpen: false,
    barberId: "",
    dayId: "",
    startTime: "12:00",
    endTime: "13:00",
    reason: "Yemek Molası",
  });

  useEffect(() => {
    if (currentShop) {
      setShopNameInput(currentShop.name || "");
      setShopPhoneInput(currentShop.phone || "");
      setShopDistrictInput(currentShop.district || "");
      setShopSubtitleInput(currentShop.subtitle || "");
      setShopPinInput(currentShop.adminPin || "");
      setShopIbanInput(currentShop.iban || "TR33 0006 2000 0001 2345 6789 01");
      setShopDepositInput(currentShop.depositAmount || 100);
    }
  }, [
    currentShop?.slug,
    currentShop?.name,
    currentShop?.phone,
    currentShop?.district,
    currentShop?.subtitle,
    currentShop?.adminPin,
    currentShop?.iban,
    currentShop?.depositAmount,
  ]);

  const handleSaveShopInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = shopNameInput.trim();
    const trimmedPhone = shopPhoneInput.trim();
    const trimmedDistrict = shopDistrictInput.trim();
    const trimmedPin = shopPinInput.trim();

    if (!trimmedName) {
      setToastMessage({
        title: "Eksik Bilgi",
        subtitle: "Salon adı boş bırakılamaz.",
        type: "warning",
      });
      return;
    }
    if (!trimmedPhone) {
      setToastMessage({
        title: "Eksik Bilgi",
        subtitle: "İletişim telefon numarası boş bırakılamaz.",
        type: "warning",
      });
      return;
    }

    updateShopDetails(currentShop.slug, {
      name: trimmedName,
      phone: trimmedPhone,
      district: trimmedDistrict || "İstanbul",
      subtitle: shopSubtitleInput.trim(),
      iban: shopIbanInput.trim(),
      depositAmount: Math.max(0, Number(shopDepositInput) || 0),
    });

    if (shopDepositInput) {
      updateCurrentShopDepositPolicy("require_deposit", Math.max(0, Number(shopDepositInput) || 0));
    }

    if (trimmedPin && trimmedPin !== currentShop.adminPin) {
      updateCurrentShopPin(trimmedPin);
    }

    setToastMessage({
      title: "Salon Bilgileri Güncellendi",
      subtitle: `${trimmedName} salonunun profil, IBAN ve kapora bilgileri başarıyla kaydedildi.`,
      type: "success",
    });
  };

  const handleCopyShopPageUrl = () => {
    const url = getShopBookingUrl(currentShop.slug);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setIsCopiedShopUrl(true);
    setTimeout(() => setIsCopiedShopUrl(false), 2000);
    setToastMessage({
      title: "Link Kopyalandı",
      subtitle: `${url} adresi panoya kopyalandı.`,
      type: "success",
    });
  };

  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);
  const [notifPermission, setNotifPermission] = useState<string>("default");

  // Berber Panelinde Müşteri Telefonu Hızlı Düzenleme State'i
  const [editingPhoneAptId, setEditingPhoneAptId] = useState<string | null>(null);
  const [editingPhoneValue, setEditingPhoneValue] = useState<string>("");

  // Canlı Yeni Randevu Üst Uyarı State
  const [liveBookingBanner, setLiveBookingBanner] =
    useState<NewBookingNotificationPayload | null>(null);

  // ⚡ Boşalan Saat & Erken Gelebilir Akıllı Öneri Uyarısı
  const [earlyFillAlert, setEarlyFillAlert] = useState<{
    vacatedTime: string;
    dayLabel: string;
    candidates: Appointment[];
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<{
    title: string;
    subtitle: string;
    type: "success" | "warning" | "whatsapp";
  } | null>(null);

  // ➕ HIZLI EKLE (3 Kutuluk Ultra-Sade Form State: 1. İsim, 2. Saat, 3. Hizmet)
  const realBarbers = useMemo(
    () => barbers.filter((b) => !b.isAnyOption),
    [barbers]
  );
  const [quickName, setQuickName] = useState<string>("");
  const [quickPhone, setQuickPhone] = useState<string>("");
  const [quickDayId, setQuickDayId] = useState<string>(
    () => getLiveDaysMetadata(7)[0].id
  );
  const [quickTime, setQuickTime] = useState<string>("");
  const [quickServiceIds, setQuickServiceIds] = useState<string[]>([]);
  const [quickBarberId, setQuickBarberId] = useState<string>("");
  const [quickError, setQuickError] = useState<string>("");

  useEffect(() => {
    if (!quickBarberId && realBarbers.length > 0) {
      setQuickBarberId(realBarbers[0].id);
    }
  }, [realBarbers, quickBarberId]);

  useEffect(() => {
    if (quickServiceIds.length === 0 && services.length > 0) {
      setQuickServiceIds([services[0].id]);
    }
  }, [services, quickServiceIds.length]);

  // Kara Liste Modalları
  const [noShowConfirmModal, setNoShowConfirmModal] = useState<{
    isOpen: boolean;
    appointment: Appointment | null;
    depositAmount: number;
  }>({
    isOpen: false,
    appointment: null,
    depositAmount: 100,
  });

  const [removeBlacklistModal, setRemoveBlacklistModal] = useState<{
    isOpen: boolean;
    phone: string;
    customerName: string;
  }>({
    isOpen: false,
    phone: "",
    customerName: "",
  });

  // Diğer Sekmesi: Çalışan & Hizmet Düzenleme State
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null);
  const [editBarberName, setEditBarberName] = useState<string>("");
  const [editBarberRole, setEditBarberRole] = useState<string>("");
  const [editBarberChair, setEditBarberChair] = useState<string>("");
  const [editBarberExp, setEditBarberExp] = useState<string>("");
  const [editBarberBadge, setEditBarberBadge] = useState<string>("");
  const [editBarberPrices, setEditBarberPrices] = useState<
    Record<string, string>
  >({});

  const [newBarberName, setNewBarberName] = useState<string>("");
  const [newBarberChair, setNewBarberChair] = useState<string>("VIP Koltuk #4");
  const [newBarberRole, setNewBarberRole] = useState<string>("Usta Berber");

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [editPrice, setEditPrice] = useState<number>(400);
  const [editDuration, setEditDuration] = useState<number>(30);

  const [newServiceName, setNewServiceName] = useState<string>("");
  const [newServicePrice, setNewServicePrice] = useState<string>("400");
  const [newServiceDuration, setNewServiceDuration] = useState<string>("30");

  // OTOMATİK BİLDİRİM SİSTEMİ (Web Notification API + Sesli Uyarı + global_state / appointments Dinleyici)
  const knownAppointmentIdsRef = useRef<Set<string> | null>(null);
  const lastNotifiedAptIdRef = useRef<string | null>(null);

  const handleIncomingBookingNotification = useCallback(
    (payload: NewBookingNotificationPayload) => {
      if (
        payload.shopSlug &&
        payload.shopSlug.toLowerCase() !== currentShop.slug.toLowerCase()
      ) {
        return;
      }
      if (lastNotifiedAptIdRef.current === payload.appointmentId) {
        return;
      }
      lastNotifiedAptIdRef.current = payload.appointmentId;

      // Sessiz ve sade arka plan bildirimi (ekran pop-up ve ses kalabalığı yapmaz)
      sendBrowserNotification(payload);
    },
    [currentShop.slug]
  );

  // A) Tarayıcı bildirim izni kontrolü ve ilk etkileşimde izin isteme
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifPermission("unsupported");
      return;
    }
    setNotifPermission(Notification.permission);

    const unlockAudioAndNotificationOnInteraction = () => {
      if ("Notification" in window && Notification.permission === "default") {
        requestBrowserNotificationPermission().then((perm) =>
          setNotifPermission(perm)
        );
      }
    };

    window.addEventListener(
      "click",
      unlockAudioAndNotificationOnInteraction,
      { once: true }
    );
    return () => {
      window.removeEventListener(
        "click",
        unlockAudioAndNotificationOnInteraction
      );
    };
  }, []);

  // B) BroadcastChannel & localStorage üzerinden anlık yeni randevu dinleme
  useEffect(() => {
    const unsubscribe = subscribeToLiveBookingEvents((payload) => {
      handleIncomingBookingNotification(payload);
    });
    return unsubscribe;
  }, [handleIncomingBookingNotification]);

  // C) global_state / appointments listesi değiştiğinde (Supabase Realtime dahil) yeni randevuyu tespit et
  useEffect(() => {
    if (knownAppointmentIdsRef.current === null) {
      knownAppointmentIdsRef.current = new Set(appointments.map((a) => a.id));
      return;
    }

    const prevSet = knownAppointmentIdsRef.current;
    const newlyAdded = appointments.filter(
      (a) =>
        !prevSet.has(a.id) &&
        !a.isBlockedSlot &&
        a.bookingSource !== "phone" &&
        a.status === "upcoming"
    );

    knownAppointmentIdsRef.current = new Set(appointments.map((a) => a.id));

    if (newlyAdded.length > 0) {
      const latest = newlyAdded[newlyAdded.length - 1];
      handleIncomingBookingNotification({
        appointmentId: latest.id,
        appointmentCode: latest.appointmentCode,
        shopSlug: currentShop.slug,
        shopName: currentShop.name,
        shopPhone: currentShop.phone,
        customerName: latest.customerName,
        customerPhone: latest.customerPhone,
        barberName: latest.barberName,
        dateLabel: latest.dateLabel,
        time: latest.time,
        servicesSummary: latest.services.map((s) => s.name).join(" + "),
        totalPrice: latest.totalPrice,
        createdAtIso: new Date().toISOString(),
      });
    }
  }, [
    appointments,
    currentShop.slug,
    currentShop.name,
    currentShop.phone,
    handleIncomingBookingNotification,
  ]);

  // Dükkan değiştiğinde referansları sıfırla
  useEffect(() => {
    knownAppointmentIdsRef.current = new Set(appointments.map((a) => a.id));
    setEditingBarberId(null);
    setEditingServiceId(null);
    setBannerDismissed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentShopSlug]);

  const triggerToast = (
    title: string,
    subtitle: string,
    type: "success" | "warning" | "whatsapp"
  ) => {
    setToastMessage({ title, subtitle, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.title === title ? null : prev));
    }, 4500);
  };

  const handleSaveCustomerPhone = (aptId: string, aptCustomerName: string) => {
    const cleaned = editingPhoneValue.trim();
    if (!cleaned) {
      triggerToast("Uyarı", "Telefon numarası boş bırakılamaz.", "warning");
      return;
    }
    updateAppointmentPhone(aptId, cleaned);
    triggerToast(
      `${aptCustomerName} — Telefon Güncellendi ✅`,
      `Yeni numara: ${cleaned} olarak kaydedildi ve bulutla eşitlendi.`,
      "success"
    );
    setEditingPhoneAptId(null);
  };

  const handleEnableNotificationsAndSound = async () => {
    playNewBookingChime();
    const perm = await requestBrowserNotificationPermission();
    setNotifPermission(perm);
    triggerToast(
      "Sesli & Anlık Bildirim Test Edildi 🔔",
      perm === "granted"
        ? "Yeni randevu geldiğinde zil sesi çalacak ve bildirim çubuğuna uyarı düşecektir."
        : "Zil sesi aktif! Tarayıcı ayarlarından bildirim iznini de açabilirsiniz.",
      "success"
    );
  };

  const handleCopyBookingLink = () => {
    const shareUrl = getShopBookingUrl(currentShop.slug);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
    }
    setCopiedShareLink(true);
    triggerToast(
      "Müşteri Randevu Linki Kopyalandı!",
      `${shareUrl} linkini Instagram veya WhatsApp'ta paylaşabilirsiniz.`,
      "success"
    );
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  const handleComplete = (apt: Appointment) => {
    markAppointmentCompleted(apt.id);
  };

  const checkAndTriggerEarlyCandidates = (vacatedApt: Appointment) => {
    const aptDayMeta = resolveDayMetadata(vacatedApt.dayId);
    const vacatedMinutes = timeToMinutes(vacatedApt.time);
    const candidates = appointments.filter((a) => {
      if (a.id === vacatedApt.id) return false;
      const isLive =
        a.status === "upcoming" ||
        a.status === "confirmed" ||
        a.status === "pending";
      if (!isLive) return false;
      if (!a.canComeEarly) return false;
      if (resolveDayMetadata(a.dayId).id !== aptDayMeta.id) return false;
      // Koltuk / Usta kontrolü: Boşalan saat sadece o ustanın kendi erken gelebilecek müşterilerine önerilsin
      if (
        vacatedApt.barberId &&
        a.barberId &&
        a.barberId !== vacatedApt.barberId
      ) {
        return false;
      }
      return timeToMinutes(a.time) > vacatedMinutes;
    });

    if (candidates.length > 0) {
      setEarlyFillAlert({
        vacatedTime: vacatedApt.time,
        dayLabel: aptDayMeta.chipLabel,
        candidates,
      });
    }
  };

  const handleCancelAndBlacklist = (apt: Appointment) => {
    cancelAppointmentByCustomer(apt.id);
    markAppointmentNoShow(apt.id);
    triggerToast(
      `${apt.customerName} — İptal Edildi & Engellendi 🚫`,
      `${apt.customerPhone} numarası sahte randevu şüphesiyle kara listeye eklendi.`,
      "warning"
    );
    checkAndTriggerEarlyCandidates(apt);
  };

  const handleCancelByAdmin = (apt: Appointment) => {
    const res = cancelAppointmentByCustomer(apt.id);
    triggerToast(
      `${apt.customerName} — İptal Edildi ❌`,
      res.notifiedCount > 0
        ? `Randevu iptal edildi ve yedek listedeki ${res.notifiedCount} müşteriye bildirim gönderildi.`
        : `Saat ${apt.time} tekrar randevuya açıldı.`,
      "warning"
    );
    checkAndTriggerEarlyCandidates(apt);
  };

  const [expandedAptId, setExpandedAptId] = useState<string | null>(null);

  const toggleAptAccordion = (id: string) => {
    setExpandedAptId((prev) => (prev === id ? null : id));
  };

  const handleNoShow = (apt: Appointment) => {
    markAppointmentNoShow(apt.id);
    triggerToast(
      `${apt.customerName} — Gelmedi (No-Show)`,
      `Müşteri no-show olarak işaretlendi ve ortak kara liste ağına eklendi.`,
      "warning"
    );
    checkAndTriggerEarlyCandidates(apt);
  };

  const handleSendReminder = (
    apt: Appointment,
    actionType: "reminder" | "approval" = "reminder"
  ) => {
    sendWhatsAppReminder(apt.id);
    const formattedNo = formatPhoneForWhatsApp(apt.customerPhone);
    triggerToast(
      actionType === "approval"
        ? `WhatsApp Onay Mesajı Açıldı`
        : `WhatsApp Hatırlatma Mesajı Açıldı`,
      `${apt.customerName} (+${formattedNo}) için mesaj hazırlandı.`,
      "whatsapp"
    );
  };

  // ➕ HIZLI EKLE KAYDETME FONKSİYONU (3 Kutu: İsim, Saat, Hizmet)
  const quickSelectedDay = useMemo(
    () =>
      liveDays.find((d) => d.id === quickDayId) ||
      resolveDayMetadata(quickDayId),
    [liveDays, quickDayId]
  );
  const quickSelectedBarber =
    realBarbers.find((b) => b.id === quickBarberId) ||
    realBarbers[0] ||
    barbers[0];
  const quickSelectedServices = services.filter((s) =>
    quickServiceIds.includes(s.id)
  );
  const quickTotalPrice = quickSelectedServices.reduce(
    (sum, s) => sum + getServicePriceForBarber(s, quickSelectedBarber),
    0
  );
  const quickTotalDuration = quickSelectedServices.reduce(
    (sum, s) => sum + s.duration,
    0
  );
  const quickAvailableSlots = useMemo(
    () =>
      getSlotsForDay(quickDayId, quickSelectedBarber?.id).filter(
        (slot) => slot.state === "available"
      ),
    [getSlotsForDay, quickDayId, quickSelectedBarber?.id]
  );

  const toggleQuickService = (id: string) => {
    setQuickServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError("");

    if (!quickTime) {
      setQuickError("Lütfen boş saatlerden birini seçiniz.");
      return;
    }
    if (quickSelectedServices.length === 0) {
      setQuickError("Lütfen en az bir hizmet seçiniz.");
      return;
    }
    if (!quickSelectedBarber) {
      setQuickError("Çalışan bulunamadı.");
      return;
    }

    const finalName = quickName.trim() || "Misafir Müşteri";
    const finalPhone =
      quickPhone.trim() || currentShop.phone || "0555 000 00 00";

    const created = addAppointment({
      dayId: quickSelectedDay.id,
      dateLabel: quickSelectedDay.chipLabel,
      time: quickTime,
      endTime: minutesToTime(
        timeToMinutes(quickTime) + (quickTotalDuration || 30)
      ),
      customerName: finalName,
      customerPhone: finalPhone,
      barberId: quickSelectedBarber.id,
      barberName: quickSelectedBarber.name,
      chairLabel: quickSelectedBarber.chairName,
      services: quickSelectedServices.map((s) => ({
        name: s.name,
        price: getServicePriceForBarber(s, quickSelectedBarber),
        duration: s.duration,
      })),
      totalPrice: quickTotalPrice,
      totalDuration: quickTotalDuration || 30,
      trustBadge: "first_time",
      trustDetail: "Berber Tarafından Hızlı Eklendi",
      status: "upcoming",
      reminderSent: false,
      bookingSource: "phone",
    });

    setQuickName("");
    setQuickPhone("");
    setQuickTime("");
    setAppointmentFilter("active");
    if (quickSelectedDay.id === todayDay.id) {
      setAdminDayMode("today");
    } else if (quickSelectedDay.id === tomorrowDay.id) {
      setAdminDayMode("tomorrow");
    } else {
      setSelectedCalendarDayId(quickSelectedDay.id);
      setAdminDayMode("calendar");
    }
    setBottomTab("appointments");
    triggerToast(
      `Randevu Eklendi: ${created.customerName} (${created.time})`,
      `${quickSelectedDay.chipLabel} saat ${created.time} vitrinde dolu olarak kapatıldı.`,
      "success"
    );
  };

  // Kara Liste İşlemleri
  const handleOpenNoShowModal = (apt: Appointment) => {
    setNoShowConfirmModal({
      isOpen: true,
      appointment: apt,
      depositAmount: currentShop.depositAmount || 100,
    });
  };

  const handleConfirmNoShow = () => {
    if (!noShowConfirmModal.appointment) return;
    const apt = noShowConfirmModal.appointment;
    const deposit = Number(noShowConfirmModal.depositAmount) || 100;
    markAppointmentNoShow(apt.id, deposit);
    setNoShowConfirmModal({
      isOpen: false,
      appointment: null,
      depositAmount: 100,
    });
    triggerToast(
      `${apt.customerName} Kara Listeye Alındı`,
      `${apt.customerPhone} numarası ${deposit} TL kapora şartıyla kara listeye eklendi.`,
      "warning"
    );
  };

  const handleConfirmBlockTime = () => {
    const barber =
      barbers.find((b) => b.id === blockModal.barberId) ||
      barbers.find((b) => !b.isAnyOption) ||
      barbers[0];
    const dayMeta = resolveDayMetadata(blockModal.dayId || todayDay.id);

    addBlockedTimeRange({
      dayId: dayMeta.id,
      dateLabel: dayMeta.chipLabel,
      startTime: blockModal.startTime,
      endTime: blockModal.endTime,
      barberId: barber?.id || "any",
      barberName: barber?.name || "Tüm Salon",
      chairLabel: barber?.chairName || "Tüm Koltuklar",
      reason: blockModal.reason.trim() || "Mola",
    });

    setBlockModal((prev) => ({ ...prev, isOpen: false }));
    triggerToast(
      "Saat Başarıyla Kapatıldı ⛔",
      `${barber?.name} için ${blockModal.startTime} - ${blockModal.endTime} kapatıldı. Müşterilere dolu gözükür, ciroya eklenmez.`,
      "success"
    );
  };

  const activeDetailApt = useMemo(() => {
    if (!selectedDetailApt) return null;
    return (
      appointments.find((a) => a.id === selectedDetailApt.id) ||
      selectedDetailApt
    );
  }, [appointments, selectedDetailApt]);

  const detailAptWaUrl = useMemo(() => {
    if (!activeDetailApt) return "#";
    const resolvedDay = resolveDayMetadata(activeDetailApt.dayId);
    const dateLabel = resolvedDay.chipLabel;
    const srvText = activeDetailApt.services.map((s) => s.name).join(" + ");
    const bookingLink = getShopBookingUrl(currentShop.slug);
    const msg = `Merhaba ${activeDetailApt.customerName}, ${currentShop.name} randevunuz hk:\n📅 Tarih: ${dateLabel}\n⏰ Saat: ${activeDetailApt.time}\n💺 Koltuk: ${activeDetailApt.chairLabel || activeDetailApt.barberName}\n✂️ İşlem: ${srvText} (${activeDetailApt.totalPrice} TL)\nTakip: ${bookingLink}\nSizi bekliyoruz!`;
    return buildWhatsAppUrl(activeDetailApt.customerPhone, msg);
  }, [activeDetailApt, currentShop.name, currentShop.slug]);

  const currentTimelineDayId = useMemo(() => {
    if (adminDayMode === "today") return todayDay.id;
    if (adminDayMode === "tomorrow") return tomorrowDay.id;
    if (adminDayMode === "calendar") return selectedCalendarDayId;
    return todayDay.id;
  }, [adminDayMode, todayDay.id, tomorrowDay.id, selectedCalendarDayId]);

  const timelineAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (apt.status === "cancelled" || apt.status === "no_show") return false;
      const aptDayId = resolveDayMetadata(apt.dayId).id;
      if (aptDayId !== currentTimelineDayId) return false;
      if (
        adminStaffFilter !== "all" &&
        !apt.isBlockedSlot &&
        apt.barberId !== adminStaffFilter
      ) {
        return false;
      }
      return true;
    });
  }, [appointments, currentTimelineDayId, adminStaffFilter]);

  // Salon çalışma saatlerine (shopSettings) göre dinamik 30 dk aralıklı çizelge dilimleri
  const timelineSlots = useMemo(() => {
    const slots: string[] = [];
    let openM = shopSettings?.openTime ? timeToMinutes(shopSettings.openTime) : 9 * 60;
    let closeM = shopSettings?.closeTime ? timeToMinutes(shopSettings.closeTime) : 21 * 60;

    // Erken veya geç randevu varsa çizelgeyi dışına taşırmadan kapsayacak şekilde genişlet
    timelineAppointments.forEach((apt) => {
      const startM = timeToMinutes(apt.time);
      const endM = apt.endTime
        ? timeToMinutes(apt.endTime)
        : startM + (apt.totalDuration || 30);
      if (startM < openM) openM = startM;
      if (endM > closeM) closeM = endM;
    });

    for (let m = openM; m <= closeM; m += 30) {
      slots.push(minutesToTime(m));
    }
    return slots;
  }, [shopSettings?.openTime, shopSettings?.closeTime, timelineAppointments]);

  // Basit ve Sağlam Timeline Satır Haritası
  const timelineSlotMap = useMemo(() => {
    const parsedApts = timelineAppointments.map((apt) => {
      const startM = timeToMinutes(apt.time);
      const dur = apt.totalDuration || 30;
      const endM = apt.endTime ? timeToMinutes(apt.endTime) : startM + dur;
      return { apt, startM, endM };
    });

    const map = new Map<
      string,
      {
        startingApts: Appointment[];
        ongoingApts: Appointment[];
        startingBlocks: Appointment[];
        ongoingBlocks: Appointment[];
        freeBarbers: Barber[];
      }
    >();

    timelineSlots.forEach((slotTime) => {
      const slotM = timeToMinutes(slotTime);
      const slotInterval = 30;

      const startingApts: Appointment[] = [];
      const ongoingApts: Appointment[] = [];
      const startingBlocks: Appointment[] = [];
      const ongoingBlocks: Appointment[] = [];

      parsedApts.forEach(({ apt, startM, endM }) => {
        const isCovered = slotM < endM && slotM + slotInterval > startM;
        if (!isCovered) return;

        // Randevu bu 30 dk'lık dilimin içinde başlıyorsa "başlangıç satırı" burasıdır
        const startsHere = startM >= slotM && startM < slotM + slotInterval;

        if (apt.isBlockedSlot) {
          if (startsHere) {
            startingBlocks.push(apt);
          } else {
            ongoingBlocks.push(apt);
          }
        } else {
          if (startsHere) {
            startingApts.push(apt);
          } else {
            ongoingApts.push(apt);
          }
        }
      });

      const activeBarbers = adminStaffFilter === "all" ? realBarbers : realBarbers.filter((b) => b.id === adminStaffFilter);
      const freeBarbers = activeBarbers.filter((barber) => {
        const isBusy = parsedApts.some(({ apt, startM, endM }) => {
          const isCovered = slotM < endM && slotM + slotInterval > startM;
          if (!isCovered) return false;
          if (apt.barberId === "all" || apt.isBlockedSlot) return true;
          if (apt.barberId === barber.id) return true;
          if (apt.barberName && apt.barberName.toLowerCase().includes(barber.name.toLowerCase())) return true;
          return false;
        });
        return !isBusy;
      });

      map.set(slotTime, {
        startingApts,
        ongoingApts,
        startingBlocks,
        ongoingBlocks,
        freeBarbers,
      });
    });

    return map;
  }, [timelineAppointments, timelineSlots, adminStaffFilter, realBarbers]);

  // Kesintisiz tek blok kartlar için yerleşim: her kayıt için başlangıç/bitiş dakikası,
  // çakışan kayıtlar (farklı berberler) yan yana şeritlere (lane) bölünür.
  const timelineBlockLayout = useMemo(() => {
    const items = timelineAppointments
      .map((apt) => {
        const startM = timeToMinutes(apt.time);
        const dur = apt.totalDuration || 30;
        const endM = apt.endTime ? timeToMinutes(apt.endTime) : startM + dur;
        return { id: apt.id, startM, endM: Math.max(endM, startM + 30) };
      })
      .sort((a, b) => a.startM - b.startM || b.endM - a.endM);

    const layout = new Map<string, { startM: number; endM: number; lane: number; lanes: number }>();
    let cluster: { id: string; startM: number; endM: number; lane: number }[] = [];
    let laneEnds: number[] = [];
    let clusterEnd = -1;

    const flush = () => {
      const lanes = Math.max(1, laneEnds.length);
      cluster.forEach((c) => layout.set(c.id, { startM: c.startM, endM: c.endM, lane: c.lane, lanes }));
      cluster = [];
      laneEnds = [];
    };

    items.forEach((it) => {
      if (cluster.length > 0 && it.startM >= clusterEnd) flush();
      let lane = laneEnds.findIndex((end) => end <= it.startM);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.endM);
      } else {
        laneEnds[lane] = it.endM;
      }
      cluster.push({ ...it, lane });
      clusterEnd = Math.max(cluster.length === 1 ? it.endM : clusterEnd, it.endM);
    });
    if (cluster.length > 0) flush();

    return layout;
  }, [timelineAppointments]);

  // 30 dk = 64px (h-16). Kart, başladığı satırdan süresi kadar aşağı tek parça uzanır.
  const TIMELINE_SLOT_PX = 64;
  const getTimelineBlockStyle = (id: string, slotTime: string): React.CSSProperties => {
    const info = timelineBlockLayout.get(id);
    const slotM = timeToMinutes(slotTime);
    const startM = info?.startM ?? slotM;
    const endM = info?.endM ?? slotM + 30;
    const lane = info?.lane ?? 0;
    const lanes = info?.lanes ?? 1;
    const offsetPx = ((startM - slotM) / 30) * TIMELINE_SLOT_PX;
    const heightPx = ((endM - startM) / 30) * TIMELINE_SLOT_PX;
    return {
      position: "absolute",
      top: `${2 + offsetPx}px`,
      height: `calc(${heightPx}px - 4px)`,
      left: lanes > 1 ? `calc(${(lane / lanes) * 100}% + ${lane > 0 ? 2 : 0}px)` : 0,
      right: lanes > 1 ? `calc(${((lanes - lane - 1) / lanes) * 100}% + ${lane < lanes - 1 ? 2 : 0}px)` : 0,
      zIndex: 10,
    };
  };

  // Timeline kartı için kapladığı dilim/şerit bilgisi (memo'lu kartlara sadece ilkel değerler geçer)
  const getTimelineCardGeometry = (id: string, slotTime: string) => {
    const info = timelineBlockLayout.get(id);
    const slotM = timeToMinutes(slotTime);
    const startM = info?.startM ?? slotM;
    const endM = info?.endM ?? slotM + 30;
    return {
      offsetPx: ((startM - slotM) / 30) * TIMELINE_SLOT_PX,
      heightPx: ((endM - startM) / 30) * TIMELINE_SLOT_PX,
      slotCount: Math.max(1, Math.round((endM - startM) / 30)),
      lane: info?.lane ?? 0,
      lanes: info?.lanes ?? 1,
    };
  };

  // Memo'lu timeline kartları için SABİT (referansı değişmeyen) aksiyon fonksiyonları.
  // En güncel bağımlılıklar ref üzerinden okunur; böylece kartlar gereksiz yere yeniden render olmaz.
  const timelineActionsRef = useRef({ confirmAppointment, handleComplete, triggerToast });
  timelineActionsRef.current = { confirmAppointment, handleComplete, triggerToast };

  const handleTimelineOpen = useCallback((apt: Appointment) => {
    if (dragMovedRef.current) return;
    setSelectedDetailApt(apt);
  }, []);

  const handleTimelineConfirm = useCallback((apt: Appointment, isBlacklistApt: boolean) => {
    const { confirmAppointment: confirm, triggerToast: toast } = timelineActionsRef.current;
    confirm(apt.id);
    if (isBlacklistApt) {
      toast(
        `${apt.customerName} — Kapora Alındı & Onaylandı ✅`,
        "Kapora ödemesi doğrulandı ve randevu kesinleşti.",
        "success"
      );
    } else {
      toast(`${apt.customerName} — Onaylandı ✅`, "Randevu onaylandı.", "success");
    }
  }, []);

  const handleTimelineComplete = useCallback((apt: Appointment) => {
    const { handleComplete: complete, triggerToast: toast } = timelineActionsRef.current;
    complete(apt);
    toast("Randevu Tamamlandı ✅", `${apt.customerName} geldi ve işlem tamamlandı.`, "success");
  }, []);

  const handleTimelineMove = useCallback((apt: Appointment) => {
    setMobileRescheduleApt(apt);
  }, []);

  const handleTimelineDragStart = useCallback((e: React.DragEvent, apt: Appointment) => {
    dragMovedRef.current = true;
    e.dataTransfer.setData("text/plain", apt.id);
    setDraggedApt(apt);
  }, []);

  const handleTimelineDragEnd = useCallback(() => {
    setDraggedApt(null);
    setTimeout(() => {
      dragMovedRef.current = false;
    }, 150);
  }, []);


  // Sürükle-Bırak (Drop) Olayı ve Çakışma Kontrolü
  const handleDropOnSlot = (targetTime: string) => {
    setDragOverSlotTime(null);
    if (!draggedApt) return;
    if (draggedApt.time === targetTime) {
      setDraggedApt(null);
      return;
    }

    const duration = draggedApt.totalDuration || 30;
    const startM = timeToMinutes(targetTime);
    const endM = startM + duration;

    // Hedef saat diliminde çakışma var mı?
    const hasCollision = timelineAppointments.some((a) => {
      if (a.id === draggedApt.id) return false;
      if (
        draggedApt.barberId !== "any" &&
        a.barberId !== "any" &&
        a.barberId !== draggedApt.barberId
      ) {
        return false;
      }
      const aStartM = timeToMinutes(a.time);
      const aEndM = timeToMinutes(
        a.endTime || minutesToTime(aStartM + (a.totalDuration || 30))
      );
      return startM < aEndM && endM > aStartM;
    });

    if (hasCollision) {
      triggerToast(
        "Çakışma Uyarısı! ⚠️",
        `${targetTime} saat dilimi ve randevu süresi (${duration} dk) boyunca başka bir randevu veya mola bulunduğu için bu saate taşınamaz.`,
        "warning"
      );
      setDraggedApt(null);
      return;
    }

    setDragConfirmModal({
      isOpen: true,
      appointment: draggedApt,
      targetTime,
    });
    setDraggedApt(null);
  };

  const handleConfirmDragReschedule = () => {
    if (!dragConfirmModal.appointment || !dragConfirmModal.targetTime) return;
    const apt = dragConfirmModal.appointment;
    const newTime = dragConfirmModal.targetTime;
    const dayMeta = resolveDayMetadata(currentTimelineDayId);

    shiftAppointmentToEarlySlot(apt.id, newTime, dayMeta.id, dayMeta.chipLabel);
    setDragConfirmModal({ isOpen: false, appointment: null, targetTime: "" });

    triggerToast(
      "Randevu Saati Güncellendi! ⏰",
      `${apt.customerName} adlı müşterinin randevusu saat ${newTime} olarak taşındı. Eski saat (${apt.time}) anında boşa çıkarıldı.`,
      "success"
    );
  };

  // Mola durumunu doğrudan o günkü randevular/kayıtlar dizisinden türet (Derived State)
  const isBreakActiveToday = useMemo(() => {
    return appointments.some(
      (a) =>
        a.isBlockedSlot &&
        (a.dayId === currentTimelineDayId || !a.dayId) &&
        (a.blockReason?.toLowerCase().includes("mola") ||
          a.blockReason?.toLowerCase().includes("öğle") ||
          a.blockReason?.toLowerCase().includes("yemek"))
    );
  }, [appointments, currentTimelineDayId]);

  // Öğle Molası Korumalı Aç-Kapa (Çift Tıklama / Bug Engelli)
  const handleToggleBreakSecure = () => {
    if (isTogglingBreak) return;
    setIsTogglingBreak(true);

    const willEnable = !isBreakActiveToday;
    toggleShopBreak(currentTimelineDayId);

    triggerToast(
      willEnable ? "Öğle Molası Başlatıldı 🍽️" : "Öğle Molası Kaldırıldı ✅",
      willEnable
        ? `Saat ${shopSettings.breakStart || "13:00"} - ${shopSettings.breakEnd || "14:00"} arası randevulara kapatıldı.`
        : "Mola kaldırıldı. İlgili saatler takvimde anında tekrar randevuya açıldı.",
      "success"
    );

    setTimeout(() => {
      setIsTogglingBreak(false);
    }, 400);
  };

  const handleOpenRemoveBlacklistModal = (
    phone: string,
    customerName: string
  ) => {
    setRemoveBlacklistModal({
      isOpen: true,
      phone,
      customerName,
    });
  };

  const handleConfirmRemoveBlacklist = () => {
    if (!removeBlacklistModal.phone) return;
    removeFromBlacklist(removeBlacklistModal.phone);
    const targetName =
      removeBlacklistModal.customerName || removeBlacklistModal.phone;
    setRemoveBlacklistModal({ isOpen: false, phone: "", customerName: "" });
    triggerToast(
      "Kara Listeden Çıkarıldı",
      `${targetName} başarıyla kara listeden kaldırıldı.`,
      "success"
    );
  };

  // Usta & Hizmet Yönetimi Yardımcıları
  const startEditBarber = (b: Barber) => {
    setEditingBarberId(b.id);
    setEditBarberName(b.name);
    setEditBarberRole(b.role);
    setEditBarberChair(b.chairName);
    setEditBarberExp(b.experience);
    setEditBarberBadge(b.badge || "");
    const priceMap: Record<string, string> = {};
    services.forEach((srv) => {
      const customVal = b.customPrices?.[srv.id];
      priceMap[srv.id] =
        customVal !== undefined ? String(customVal) : String(srv.price);
    });
    setEditBarberPrices(priceMap);
  };

  const handleSaveBarber = (b: Barber) => {
    if (!editBarberName.trim()) return;
    const cleanedCustomPrices: Record<string, number> = {};
    services.forEach((srv) => {
      const raw = editBarberPrices[srv.id];
      if (raw !== undefined && raw.trim() !== "") {
        const num = Number(raw);
        if (!Number.isNaN(num) && num > 0 && num !== srv.price) {
          cleanedCustomPrices[srv.id] = num;
        }
      }
    });

    const words = editBarberName.trim().split(" ");
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
        : editBarberName.trim().slice(0, 2).toUpperCase();

    updateBarber(b.id, {
      name: editBarberName.trim(),
      role: editBarberRole.trim(),
      chairName: editBarberChair.trim(),
      experience: editBarberExp.trim(),
      badge: editBarberBadge.trim() || undefined,
      initials: b.isAnyOption ? "VIP" : initials,
      customPrices: cleanedCustomPrices,
    });

    setEditingBarberId(null);
    triggerToast("Usta Bilgileri Güncellendi", `${editBarberName} kaydedildi.`, "success");
  };

  const handleCreateBarber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarberName.trim() || !newBarberChair.trim()) return;
    const words = newBarberName.trim().split(" ");
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
        : newBarberName.trim().slice(0, 2).toUpperCase();

    addBarber({
      name: newBarberName.trim(),
      role: newBarberRole.trim() || "Usta Berber",
      chairName: newBarberChair.trim(),
      rating: 4.95,
      reviewCount: 50,
      experience: "10 Yıl Deneyim",
      earliestSlot: newBarberChair.trim(),
      specialties: ["Saç Kesimi", "Sakal Tıraşı"],
      badge: "VIP Uzman",
      avatarGradient: "from-[#3b281c] via-[#261a12] to-[#131316]",
      initials,
      commissionRate: 50,
      customPrices: {},
    });

    setNewBarberName("");
    setNewBarberChair(`VIP Koltuk #${barbers.length + 1}`);
    triggerToast("Yeni Usta Eklendi", `${newBarberName} kadroya eklendi.`, "success");
  };

  const startEditService = (srv: Service) => {
    setEditingServiceId(srv.id);
    setEditName(srv.name);
    setEditDesc(srv.description);
    setEditPrice(srv.price);
    setEditDuration(srv.duration);
  };

  const handleSaveService = (id: string) => {
    if (!editName.trim()) return;
    updateService(id, {
      name: editName.trim(),
      description: editDesc.trim(),
      price: Math.max(0, Number(editPrice) || 0),
      duration: Math.max(5, Number(editDuration) || 15),
    });
    setEditingServiceId(null);
    triggerToast("Hizmet Güncellendi", `${editName} kaydedildi.`, "success");
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    const priceNum = Math.max(0, Number(newServicePrice) || 300);
    const durNum = Math.max(5, Number(newServiceDuration) || 30);

    addService({
      name: newServiceName.trim(),
      description: "Profesyonel saç ve bakım işlemi.",
      price: priceNum,
      duration: durNum,
      category: "hair",
      popular: true,
    });

    setNewServiceName("");
    setNewServicePrice("400");
    setNewServiceDuration("30");
    triggerToast("Yeni Hizmet Eklendi", `${newServiceName} eklendi.`, "success");
  };

  // Randevu Listesi ve Gün Gün Ayrım Hesaplamaları (09:00 -> 21:00 Kronolojik Sıralama)
  const sortChronologically = useCallback((list: Appointment[]) => {
    return [...list].sort((a, b) => {
      const dayA = resolveDayMetadata(a.dayId).id;
      const dayB = resolveDayMetadata(b.dayId).id;
      if (dayA !== dayB) {
        return dayA.localeCompare(dayB);
      }
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });
  }, []);

  const activeAppointments = useMemo(
    () =>
      sortChronologically(
        appointments.filter(
          (apt) =>
            apt.status === "pending" ||
            apt.status === "confirmed" ||
            apt.status === "upcoming"
        )
      ),
    [appointments, sortChronologically]
  );

  const historyAppointments = useMemo(
    () =>
      sortChronologically(
        appointments.filter(
          (apt) =>
            apt.status === "completed" ||
            apt.status === "no_show" ||
            apt.status === "cancelled"
        )
      ),
    [appointments, sortChronologically]
  );

  const completedRevenue = useMemo(
    () =>
      appointments
        .filter((apt) => apt.status === "completed")
        .reduce((sum, apt) => sum + apt.totalPrice, 0),
    [appointments]
  );

  // 👥 PERSONEL / KOLTUK BAZLI CİRO HESAPLAMA (GÜNLÜK & AYLIK)
  const staffRevenueStats = useMemo(() => {
    const todayIso = todayDay.id;
    const currentMonthPrefix = todayIso.substring(0, 7); // "YYYY-MM"

    // Sadece tamamlanan randevuların cirosunu hesapla
    const completedApts = appointments.filter(
      (a) => a.status === "completed" && !a.isBlockedSlot
    );

    return realBarbers.map((b) => {
      const barberCompleted = completedApts.filter(
        (a) =>
          a.barberId === b.id ||
          a.barberName.toLowerCase().includes(b.name.toLowerCase())
      );

      const todayApts = barberCompleted.filter(
        (a) => resolveDayMetadata(a.dayId).id === todayIso
      );
      const todayRevenue = todayApts.reduce(
        (sum, a) => sum + (Number(a.totalPrice) || 0),
        0
      );

      const monthApts = barberCompleted.filter((a) => {
        const resolved = resolveDayMetadata(a.dayId).id;
        return resolved.startsWith(currentMonthPrefix);
      });
      const monthRevenue = monthApts.reduce(
        (sum, a) => sum + (Number(a.totalPrice) || 0),
        0
      );

      const totalRevenue = barberCompleted.reduce(
        (sum, a) => sum + (Number(a.totalPrice) || 0),
        0
      );

      return {
        barber: b,
        todayRevenue,
        todayCount: todayApts.length,
        monthRevenue,
        monthCount: monthApts.length,
        totalRevenue,
        totalCount: barberCompleted.length,
      };
    });
  }, [realBarbers, appointments, todayDay.id]);

  // Her Gün İçin Bekleyen Randevu Sayısı Rozeti (Badge) Hesaplayıcı
  const getPendingCountForDay = useCallback(
    (targetDayId: string) => {
      const normalizedTarget = resolveDayMetadata(targetDayId).id;
      return activeAppointments.filter(
        (apt) =>
          !apt.isBlockedSlot &&
          resolveDayMetadata(apt.dayId).id === normalizedTarget
      ).length;
    },
    [activeAppointments]
  );

  const todayPendingCount = useMemo(
    () => getPendingCountForDay(todayDay.id),
    [getPendingCountForDay, todayDay.id]
  );

  const tomorrowPendingCount = useMemo(
    () => getPendingCountForDay(tomorrowDay.id),
    [getPendingCountForDay, tomorrowDay.id]
  );

  const otherDaysPendingCount = useMemo(
    () =>
      activeAppointments.filter((apt) => {
        if (apt.isBlockedSlot) return false;
        const dId = resolveDayMetadata(apt.dayId).id;
        return dId !== todayDay.id && dId !== tomorrowDay.id;
      }).length,
    [activeAppointments, todayDay.id, tomorrowDay.id]
  );

  const allPendingCount = useMemo(
    () => activeAppointments.filter((apt) => !apt.isBlockedSlot).length,
    [activeAppointments]
  );

  // Seçili Gün Filtresi (Varsayılan: Bugün)
  const activeTargetDayId: string | null = useMemo(() => {
    if (adminDayMode === "today") return todayDay.id;
    if (adminDayMode === "tomorrow") return tomorrowDay.id;
    if (adminDayMode === "calendar") return selectedCalendarDayId;
    return null; // "all" (Tümü)
  }, [adminDayMode, todayDay.id, tomorrowDay.id, selectedCalendarDayId]);

  const activeTargetDayMeta = useMemo(
    () => (activeTargetDayId ? resolveDayMetadata(activeTargetDayId) : null),
    [activeTargetDayId]
  );

  const dayFilteredActiveAppointments = useMemo(() => {
    if (!activeTargetDayId) return activeAppointments;
    return activeAppointments.filter(
      (apt) => resolveDayMetadata(apt.dayId).id === activeTargetDayId
    );
  }, [activeAppointments, activeTargetDayId]);

  const dayFilteredHistoryAppointments = useMemo(() => {
    if (!activeTargetDayId) return historyAppointments;
    return historyAppointments.filter(
      (apt) => resolveDayMetadata(apt.dayId).id === activeTargetDayId
    );
  }, [historyAppointments, activeTargetDayId]);

  const dayEarlyBackupAppointments = useMemo(() => {
    return dayFilteredActiveAppointments.filter(
      (apt) =>
        apt.canComeEarly &&
        (apt.status === "upcoming" ||
          apt.status === "confirmed" ||
          apt.status === "pending")
    );
  }, [dayFilteredActiveAppointments]);

  const displayedAppointments = useMemo(() => {
    let baseList = dayFilteredActiveAppointments;
    if (appointmentFilter === "early_backup") baseList = dayEarlyBackupAppointments;
    if (appointmentFilter === "history") baseList = dayFilteredHistoryAppointments;

    if (adminStaffFilter === "all") return baseList;

    return baseList.filter((apt) => {
      if (apt.isBlockedSlot) return true;
      return (
        apt.barberId === adminStaffFilter ||
        (apt.barberName &&
          apt.barberName.toLowerCase().includes(adminStaffFilter.toLowerCase()))
      );
    });
  }, [
    appointmentFilter,
    adminStaffFilter,
    dayFilteredActiveAppointments,
    dayEarlyBackupAppointments,
    dayFilteredHistoryAppointments,
  ]);

  return (
    <AdminPinGate>
      <div className="admin-page-theme relative mx-auto max-w-3xl px-3 pb-32 pt-3 sm:px-6 sm:pt-5">
        {/* QR AFİŞ MODALI */}
        <QrPosterModal
          open={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
        />

        {/* ⚡ BOŞALAN SAAT & ERKEN GELEBİLİR AKILLI ÖNERİ KUTUSU */}
        <AnimatePresence>
          {earlyFillAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              className="mb-4 overflow-hidden rounded-3xl border-2 border-amber-500 bg-gradient-to-r from-amber-950 via-[#1f1710] to-[#16120e] p-4 shadow-2xl shadow-amber-500/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-[#1a110b] shadow-lg">
                    <Zap className="h-6 w-6 fill-[#1a110b]" />
                  </div>
                  <div>
                    <span className="inline-block rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-300">
                      ⚡ ERKEN SAAT YEDEK LİSTESİ ÖNERİSİ
                    </span>
                    <h3 className="mt-1 text-base font-black text-[#fdf8f5] sm:text-lg">
                      Bu saat boşaldı! ({earlyFillAlert.vacatedTime})
                    </h3>
                    <p className="mt-0.5 text-xs font-bold text-amber-200/90">
                      İleriki saatlerden erken gelebileceğini belirten müşterileriniz var, hemen arayıp saati doldurabilirsiniz:
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEarlyFillAlert(null)}
                  className="rounded-xl border border-amber-500/40 bg-black/40 p-2 text-stone-300 hover:bg-black/60 hover:text-white"
                  title="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3.5 space-y-2">
                {earlyFillAlert.candidates.map((cand) => {
                  const candWaText = `Merhaba ${cand.customerName}, ${currentShop.name} salonumuzda saat ${earlyFillAlert.vacatedTime} için erken randevu boşluğu oluştu. Normalde saat ${cand.time} olan randevunuzu bu saate çekmek ister misiniz? Detaylar: ${getShopBookingUrl(currentShop.slug)}`;
                  const candWaUrl = buildWhatsAppUrl(cand.customerPhone, candWaText);

                  return (
                    <div
                      key={cand.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/35 bg-black/50 p-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-[#fdf8f5]">
                            {cand.customerName}
                          </span>
                          <span className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-xs font-black text-amber-300">
                            Şu anki Saati: {cand.time}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-stone-400">
                          ✂️ {cand.services.map((s) => s.name).join(" + ")} • 👤 {cand.barberName}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const oldTime = cand.time;
                            shiftAppointmentToEarlySlot(
                              cand.id,
                              earlyFillAlert.vacatedTime,
                              resolveDayMetadata(cand.dayId).id,
                              resolveDayMetadata(cand.dayId).chipLabel
                            );
                            triggerToast(
                              `${cand.customerName} — Saat ${earlyFillAlert.vacatedTime}'e Taşındı! ⚡`,
                              `Eski saati (${oldTime}) anında boşa çıkarıldı ve diğer müşterilere açıldı.`,
                              "success"
                            );
                            setEarlyFillAlert(null);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-2 text-xs font-black text-[#1a110b] shadow-md shadow-amber-400/25 transition hover:brightness-110 active:scale-95"
                          title="Müşteriyi bu erken saate kaydırır ve eski saatini anında serbest bırakır"
                        >
                          <Zap className="h-3.5 w-3.5 fill-[#1a110b]" />
                          <span>⚡ Bu Saate Taşı ({earlyFillAlert.vacatedTime})</span>
                        </button>

                        <a
                          href={`tel:${cand.customerPhone}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black text-[#06150f] shadow-md shadow-emerald-500/20 transition hover:bg-emerald-400"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>📞 Hemen Ara</span>
                        </a>

                        <a
                          href={candWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                        >
                          <span>💬 WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Abonelik Süresi Doldu Uyarı Bandı */}
        {currentShop.subscriptionStatus !== "active" && !bannerDismissed && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/60 bg-[#2a1510] px-4 py-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span className="font-bold">
                Abonelik süreniz dolmuştur ({currentShop.subscriptionEndDate}). Paneliniz açıktır.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="font-bold underline"
            >
              Gizle
            </button>
          </div>
        )}

        {/* Anlık Aksiyon Bildirimi (Toast) */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/50 bg-[#161c18] p-3.5 text-xs shadow-xl"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-[#081510]">
                  {toastMessage.type === "whatsapp" ? (
                    <MessageSquare className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="font-black text-[#fdf8f5]">
                    {toastMessage.title}
                  </p>
                  <p className="text-[11px] text-stone-300">
                    {toastMessage.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="font-bold text-stone-400 hover:text-white"
              >
                Kapat
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===================================================================== */}
        {/* SEKME 1: 📅 RANDEVULAR (VARSAYILAN ANA EKRAN — GÜN GÜN AYRIMLI)      */}
        {/* ===================================================================== */}
        {bottomTab === "appointments" && (
          <div className="space-y-2">
            {/* 1. GÜN SEÇME ALANI: KOMPAKT TEK SATIR HAP/SEKME (PILL) BUTONLAR */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {/* [📅 Bugün (6 Kas) (count)] */}
              <button
                type="button"
                onClick={() => setAdminDayMode("today")}
                className={`h-10 shrink-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-black transition active:scale-95 cursor-pointer ${
                  adminDayMode === "today"
                    ? "border-[#f3e8dc] bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b] shadow-md shadow-[#dfc39e]/20"
                    : "border-stone-300 dark:border-white/10 bg-white dark:bg-[#141416] text-stone-700 dark:text-stone-300 hover:border-stone-400 dark:hover:border-white/20"
                }`}
              >
                <span>📅 Bugün ({todayDay.chipLabel.replace("Bugün (", "").replace(")", "")})</span>
                <span
                  className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-black ${
                    adminDayMode === "today"
                      ? "bg-[#1a110b] text-[#f3e8dc]"
                      : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {todayPendingCount}
                </span>
              </button>

              {/* [Yarın (7 Kas) (count)] */}
              <button
                type="button"
                onClick={() => setAdminDayMode("tomorrow")}
                className={`h-10 shrink-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-black transition active:scale-95 cursor-pointer ${
                  adminDayMode === "tomorrow"
                    ? "border-[#f3e8dc] bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b] shadow-md shadow-[#dfc39e]/20"
                    : "border-stone-300 dark:border-white/10 bg-white dark:bg-[#141416] text-stone-700 dark:text-stone-300 hover:border-stone-400 dark:hover:border-white/20"
                }`}
              >
                <span>Yarın ({tomorrowDay.chipLabel.replace("Yarın (", "").replace(")", "")})</span>
                <span
                  className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-black ${
                    adminDayMode === "tomorrow"
                      ? "bg-[#1a110b] text-[#f3e8dc]"
                      : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {tomorrowPendingCount}
                </span>
              </button>

              {/* [📆 Gün Seç (count)] */}
              <button
                type="button"
                onClick={() => setAdminDayMode("calendar")}
                className={`h-10 shrink-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-black transition active:scale-95 cursor-pointer ${
                  adminDayMode === "calendar"
                    ? "border-[#f3e8dc] bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b] shadow-md shadow-[#dfc39e]/20"
                    : "border-stone-300 dark:border-white/10 bg-white dark:bg-[#141416] text-stone-700 dark:text-stone-300 hover:border-stone-400 dark:hover:border-white/20"
                }`}
              >
                <span>
                  📆 Gün Seç {adminDayMode === "calendar" && activeTargetDayMeta ? `(${activeTargetDayMeta.chipLabel})` : ""}
                </span>
                <span
                  className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-black ${
                    adminDayMode === "calendar"
                      ? "bg-[#1a110b] text-[#f3e8dc]"
                      : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {otherDaysPendingCount}
                </span>
              </button>

              {/* [Tümü (count)] */}
              <button
                type="button"
                onClick={() => setAdminDayMode("all")}
                className={`h-10 shrink-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-black transition active:scale-95 cursor-pointer ${
                  adminDayMode === "all"
                    ? "border-[#f3e8dc] bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b] shadow-md shadow-[#dfc39e]/20"
                    : "border-stone-300 dark:border-white/10 bg-white dark:bg-[#141416] text-stone-700 dark:text-stone-300 hover:border-stone-400 dark:hover:border-white/20"
                }`}
              >
                <span>Tümü</span>
                <span
                  className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-black ${
                    adminDayMode === "all"
                      ? "bg-[#1a110b] text-[#f3e8dc]"
                      : "bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  {allPendingCount}
                </span>
              </button>
            </div>

            {/* İleri Tarih Seçim Şeridi (Sadece "Gün Seç" modunda kompakt ince satır) */}
            {adminDayMode === "calendar" && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-100/80 dark:bg-[#101012] px-3 py-2 text-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {liveDays.slice(2).map((d) => {
                    const isChosen = selectedCalendarDayId === d.id;
                    const count = getPendingCountForDay(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedCalendarDayId(d.id)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-black transition cursor-pointer ${
                          isChosen
                            ? "border-emerald-400 bg-emerald-500 text-[#06150f]"
                            : "border-stone-300 dark:border-white/15 bg-white dark:bg-[#141416] text-stone-700 dark:text-stone-300 hover:border-emerald-400"
                        }`}
                      >
                        <span>{d.chipLabel}</span>
                        <span className="text-[10px] opacity-80">({count})</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">Takvim:</span>
                  <input
                    type="date"
                    min={todayDay.isoDate}
                    value={selectedCalendarDayId}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedCalendarDayId(e.target.value);
                      }
                    }}
                    className="rounded-lg border border-stone-300 dark:border-white/15 bg-white dark:bg-[#181411] px-2.5 py-1 text-xs font-black text-stone-800 dark:text-[#fdf8f5] outline-none"
                  />
                </div>
              </div>
            )}

            {/* 2. SIKILAŞTIRILMIŞ DURUM FİLTRESİ (BEKLEYEN / YEDEK / GEÇMİŞ) */}
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-100 dark:bg-[#141416] p-1">
              <button
                type="button"
                onClick={() => setAppointmentFilter("active")}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-black transition cursor-pointer ${
                  appointmentFilter === "active"
                    ? "bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b] shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-[#fdf8f5]"
                }`}
              >
                <span>⏳ Bekleyen ({dayFilteredActiveAppointments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAppointmentFilter("early_backup")}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-black transition cursor-pointer ${
                  appointmentFilter === "early_backup"
                    ? "bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/50 shadow-sm"
                    : "text-amber-700 dark:text-amber-400/90 hover:text-amber-900 dark:hover:text-amber-300"
                }`}
              >
                <Zap className="h-3 w-3 fill-current" />
                <span>⚡ Yedek ({dayEarlyBackupAppointments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAppointmentFilter("history")}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-black transition cursor-pointer ${
                  appointmentFilter === "history"
                    ? "bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-[#fdf8f5]"
                }`}
              >
                <span>✅ Geçmiş ({dayFilteredHistoryAppointments.length})</span>
              </button>
            </div>

            {/* 3. SIKILAŞTIRILMIŞ KOLTUK FİLTRESİ */}
            {realBarbers.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 mr-0.5 flex items-center gap-1">
                  <User className="h-3 w-3 text-amber-600 dark:text-[#dfc39e]" /> Koltuk:
                </span>
                <button
                  type="button"
                  onClick={() => setAdminStaffFilter("all")}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-black transition cursor-pointer ${
                    adminStaffFilter === "all"
                      ? "border border-amber-600 dark:border-[#dfc39e] bg-amber-500/20 dark:bg-[#dfc39e] text-amber-950 dark:text-[#1a110b] shadow-sm"
                      : "border border-stone-200 dark:border-white/10 bg-white dark:bg-[#141416] text-stone-700 dark:text-stone-300 hover:border-stone-400 dark:hover:border-white/25"
                  }`}
                >
                  Tümü ({dayFilteredActiveAppointments.length})
                </button>
                {realBarbers.map((b) => {
                  const staffCount = dayFilteredActiveAppointments.filter(
                    (a) =>
                      !a.isBlockedSlot &&
                      (a.barberId === b.id ||
                        (a.barberName &&
                          a.barberName
                            .toLowerCase()
                            .includes(b.name.toLowerCase())))
                  ).length;
                  const isSelected = adminStaffFilter === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setAdminStaffFilter(b.id)}
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? "border border-amber-600 dark:border-[#dfc39e] bg-amber-500/20 dark:bg-[#dfc39e] text-amber-950 dark:text-[#1a110b] shadow-sm"
                          : "border border-stone-200 dark:border-white/10 bg-white dark:bg-[#141416] text-stone-700 dark:text-stone-300 hover:border-stone-400 dark:hover:border-white/25"
                      }`}
                    >
                      <span>{b.name}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                          isSelected
                            ? "bg-black/15 text-inherit"
                            : "bg-stone-200 dark:bg-white/10 text-stone-600 dark:text-stone-400"
                        }`}
                      >
                        {staffCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 4. SIKILAŞTIRILMIŞ GÖRÜNÜM SEÇİCİ & SAAT KAPAT */}
            <div className="flex flex-wrap items-center justify-between gap-2 py-0.5 mb-1.5">
              <div className="flex items-center rounded-xl border border-stone-200 dark:border-white/10 bg-stone-100 dark:bg-[#101012] p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("timeline")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black transition cursor-pointer ${
                    viewMode === "timeline"
                      ? "bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b] shadow-sm"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>📅 Takvim Çizelgesi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black transition cursor-pointer ${
                    viewMode === "list"
                      ? "bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b] shadow-sm"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>📋 Liste Görünümü</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const defaultBarber = realBarbers[0]?.id || "";
                    setBlockModal({
                      isOpen: true,
                      barberId: adminStaffFilter !== "all" ? adminStaffFilter : defaultBarber,
                      dayId: currentTimelineDayId,
                      startTime: "13:00",
                      endTime: "14:00",
                      reason: "Yemek Molası",
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-2.5 py-1 text-xs font-black text-amber-800 dark:text-amber-200 hover:bg-amber-500/25 transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
                  <span>⛔ Saat Kapat / Mola</span>
                </button>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* GÖRÜNÜM A: 📅 SAATLİK TAKVİM ÇİZELGESİ (TIMELINE SATIRLARI)          */}
            {/* ===================================================================== */}
            {viewMode === "timeline" && (
              <div className="w-full max-w-full overflow-hidden box-border space-y-3 rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#141416] p-3 sm:p-4 shadow-xl">
                <div className="flex flex-col gap-2 border-b border-stone-200 dark:border-white/10 pb-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-700 dark:text-[#dfc39e]">
                        ⏰ 30 Dakikalık Zaman Çizelgesi
                      </span>
                      <span className="rounded-md bg-stone-100 dark:bg-white/5 border border-stone-300 dark:border-white/10 px-2 py-0.5 text-[10px] text-stone-700 dark:text-stone-300 font-bold">
                        {resolveDayMetadata(currentTimelineDayId).chipLabel}
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-600 dark:text-amber-300/90 font-bold">
                      🖐️ Kartı tutup boş bir saate sürükleyip bırakabilirsiniz
                    </span>
                  </div>

                  {/* Eğer tüm günler seçiliyse çizelge için hızlı gün değiştirici */}
                  {adminDayMode === "all" && (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                      <span className="shrink-0 text-[10px] font-bold text-stone-500 dark:text-stone-400">
                        Çizelge Günü:
                      </span>
                      {liveDays.slice(0, 5).map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            if (d.id === todayDay.id) setAdminDayMode("today");
                            else if (d.id === tomorrowDay.id) setAdminDayMode("tomorrow");
                            else {
                              setAdminDayMode("calendar");
                              setSelectedCalendarDayId(d.id);
                            }
                          }}
                          className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                            currentTimelineDayId === d.id
                              ? "bg-[#dfc39e] text-[#1a110b]"
                              : "bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10"
                          }`}
                        >
                          {d.chipLabel}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Çizelge Satırları - Her saat alt alta dizilen, asla kaymayan standart satır */}
                <div className="w-full max-w-full box-border border-t border-stone-200 dark:border-white/10">
                  {timelineSlots.map((slotTime) => {
                    const slotData = timelineSlotMap.get(slotTime) || {
                      startingApts: [],
                      ongoingApts: [],
                      startingBlocks: [],
                      ongoingBlocks: [],
                      freeBarbers: realBarbers,
                    };

                    const hasStartingApts = slotData.startingApts.length > 0;
                    const hasStartingBlocks = slotData.startingBlocks.length > 0;
                    const hasOngoingApts = slotData.ongoingApts.length > 0;
                    const hasOngoingBlocks = slotData.ongoingBlocks.length > 0;
                    const hasAnyContent = hasStartingApts || hasStartingBlocks || hasOngoingApts || hasOngoingBlocks;

                    const isDragTarget = dragOverSlotTime === slotTime;

                    return (
                      <div
                        key={`timeline-row-${slotTime}`}
                        className="relative flex items-stretch h-16 w-full max-w-full box-border border-b border-stone-200 dark:border-white/10 transition-colors"
                      >
                        {/* Sol Sütun (w-16 shrink-0): Saat yazısı her satırda sabit h-16 */}
                        <div className="w-16 h-16 shrink-0 flex items-center justify-center font-mono text-xs font-bold text-stone-500 dark:text-stone-400 select-none">
                          {slotTime}
                        </div>

                        {/* Sağ Sütun: Randevu kartı başladığı satırda absolute olarak yerleşir ve süresi kadar aşağı uzanır */}
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverSlotTime !== slotTime) {
                              setDragOverSlotTime(slotTime);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverSlotTime === slotTime) {
                              setDragOverSlotTime(null);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDropOnSlot(slotTime);
                          }}
                          className={`relative flex-1 min-w-0 max-w-full h-16 ml-2 mr-1 box-border flex items-center transition-colors bg-transparent ${
                            isDragTarget
                              ? "bg-emerald-500/10 outline-2 outline-dashed outline-emerald-500 rounded-lg"
                              : ""
                          }`}
                        >
                          {/* 1. Kilitli / Mola Saatleri Başlangıcı (tek parça blok) */}
                          {hasStartingBlocks &&
                            slotData.startingBlocks.map((blk) => (
                                <div
                                  key={blk.id}
                                  style={getTimelineBlockStyle(blk.id, slotTime)}
                                  className="w-auto max-w-full overflow-hidden box-border rounded-lg px-2.5 py-2 flex items-start justify-between gap-2 transition-all duration-200 bg-stone-100 dark:bg-[#161618] border border-stone-300 dark:border-stone-600/50 shadow-sm"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                    <Lock className="h-4 w-4 text-stone-500 dark:text-stone-400 shrink-0" />
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                      <span className="text-xs font-black text-stone-800 dark:text-stone-200 block truncate">
                                        ⛔ Mola / Kapalı: {blk.blockReason || "Kapalı Saat"}
                                      </span>
                                      <span className="text-[10px] text-stone-500 dark:text-stone-400 block truncate">
                                        {blk.barberName} ({blk.time} - {blk.endTime})
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      removeAppointmentOrBlock(blk.id);
                                      triggerToast(
                                        "Saat Kilidi Açıldı",
                                        `${blk.time} saati tekrar randevuya açıldı.`,
                                        "success"
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800/80 px-2 py-1 text-[10px] font-black text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white transition-all duration-150 active:scale-95 cursor-pointer shrink-0"
                                  >
                                    <Unlock className="h-3 w-3" />
                                    <span>Kilidi Aç</span>
                                  </button>
                                </div>
                              ))}

                          {/* 2. Bu Saatte Başlayan Randevular (süresi kadar alt satırları tek parça kaplar; 30/60/90 dk özel düzen) */}
                          {hasStartingApts &&
                            slotData.startingApts.map((apt) => {
                              const geo = getTimelineCardGeometry(apt.id, slotTime);
                              const isBlacklistApt =
                                Boolean(apt.requiresDeposit) ||
                                Boolean(apt.isBlacklisted) ||
                                Boolean(isPhoneBlacklisted(apt.customerPhone));
                              return (
                                <TimelineAppointmentCard
                                  key={apt.id}
                                  apt={apt}
                                  isBlacklistApt={isBlacklistApt}
                                  offsetPx={geo.offsetPx}
                                  heightPx={geo.heightPx}
                                  slotCount={geo.slotCount}
                                  lane={geo.lane}
                                  lanes={geo.lanes}
                                  onOpen={handleTimelineOpen}
                                  onConfirm={handleTimelineConfirm}
                                  onComplete={handleTimelineComplete}
                                  onMove={handleTimelineMove}
                                  onDragStartApt={handleTimelineDragStart}
                                  onDragEndApt={handleTimelineDragEnd}
                                />
                              );
                            })}

                          {/* 4. Tamamen Boş Saat (randevu/mola kaplamıyorsa). Kaplanan alt satırlarda HİÇBİR ŞEY render edilmez. */}
                          {!hasAnyContent && (
                            <div className="flex items-center justify-between gap-2 w-full max-w-full min-w-0 overflow-hidden box-border h-full transition-opacity opacity-75 hover:opacity-100 bg-transparent">
                              <span className="truncate min-w-0 text-[11px] font-medium text-stone-500 dark:text-stone-400">
                                {isDragTarget
                                  ? "📍 Buraya Bırakın!"
                                  : adminStaffFilter === "all" && slotData.freeBarbers.length > 0
                                  ? `• Boş (${slotData.freeBarbers.length} Koltuk)`
                                  : "• Boş"}
                              </span>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickDayId(currentTimelineDayId);
                                    setQuickTime(slotTime);
                                    if (adminStaffFilter !== "all") {
                                      setQuickBarberId(adminStaffFilter);
                                    } else if (slotData.freeBarbers[0]?.id) {
                                      setQuickBarberId(slotData.freeBarbers[0].id);
                                    }
                                    setBottomTab("quick_add");
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition active:scale-95 cursor-pointer shadow-sm"
                                  title="Bu saate müşteri randevusu ekle"
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                  <span>Randevu Ekle</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const defaultBarber =
                                      adminStaffFilter !== "all"
                                        ? adminStaffFilter
                                        : slotData.freeBarbers[0]?.id || realBarbers[0]?.id || "";
                                    setBlockModal({
                                      isOpen: true,
                                      barberId: defaultBarber,
                                      dayId: currentTimelineDayId,
                                      startTime: slotTime,
                                      endTime: minutesToTime(timeToMinutes(slotTime) + 30),
                                      reason: "Yemek Molası",
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-stone-300 dark:border-white/10 bg-stone-100 dark:bg-white/5 px-2 py-1 text-[10px] font-bold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition active:scale-95 cursor-pointer"
                                  title="Saati kapat veya mola ver"
                                >
                                  <Lock className="h-2.5 w-2.5" />
                                  <span>Mola</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* GÖRÜNÜM B: 📋 LİSTE GÖRÜNÜMÜ                                          */}
            {/* ===================================================================== */}
            {viewMode === "list" && (
              <div className="space-y-3">
                {displayedAppointments.length === 0 ? (
                  <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#141416] p-8 text-center shadow-md">
                <CalendarIcon className="mx-auto h-10 w-10 text-amber-600 dark:text-[#dfc39e]" />
                <h3 className="mt-3 text-lg font-extrabold text-stone-900 dark:text-[#fdf8f5]">
                  {appointmentFilter === "active"
                    ? `${
                        activeTargetDayMeta
                          ? activeTargetDayMeta.chipLabel
                          : "Seçili Gün"
                      } İçin Bekleyen Randevu Yok`
                    : appointmentFilter === "early_backup"
                    ? `${
                        activeTargetDayMeta
                          ? activeTargetDayMeta.chipLabel
                          : "Seçili Gün"
                      } İçin Erken Gelebilecek Müşteri Yok`
                    : `${
                        activeTargetDayMeta
                          ? activeTargetDayMeta.chipLabel
                          : "Seçili Gün"
                      } İçin Geçmiş Randevu Yok`}
                </h3>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  {appointmentFilter === "early_backup"
                    ? "Müşteriler randevu alırken 'Daha erken bir saat boşalırsa haber ver' seçeneğini işaretlediğinde burada listelenir."
                    : appointmentFilter === "active"
                    ? "Alttaki '➕ Hızlı Ekle' menüsünden 3 saniyede yeni randevu ekleyebilirsiniz."
                    : "Tamamlanan veya iptal edilen randevular burada listelenir."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedAppointments.map((apt) => {
                  const resolvedAptDay = resolveDayMetadata(apt.dayId);
                  const cleanDateLabel = resolvedAptDay.chipLabel;

                  // Kilitli Saat Kartı
                  if (apt.isBlockedSlot) {
                    return (
                      <div
                        key={apt.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-[#171310] p-4"
                      >
                        <div>
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 py-1 text-sm font-black text-amber-300">
                            <Lock className="h-4 w-4" />
                            {apt.time} - {apt.endTime} ({cleanDateLabel})
                          </span>
                          <p className="mt-1.5 text-base font-extrabold text-stone-900 dark:text-[#fdf8f5]">
                            Saat Kapatıldı: {apt.blockReason} ({apt.barberName})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            removeAppointmentOrBlock(apt.id);
                            triggerToast(
                              "Saat Kilidi Açıldı",
                              `${apt.time} saati tekrar randevuya açıldı.`,
                              "success"
                            );
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/20 px-4 py-2.5 text-xs font-black text-emerald-300"
                        >
                          <Unlock className="h-4 w-4" />
                          <span>Kilidi Aç</span>
                        </button>
                      </div>
                    );
                  }

                  const isCompleted = apt.status === "completed";
                  const isPending = apt.status === "pending";
                  const isCancelled = apt.status === "cancelled";
                  const isNoShow = apt.status === "no_show";
                  const isBlacklistApt =
                    Boolean(apt.requiresDeposit) ||
                    Boolean(apt.isBlacklisted) ||
                    Boolean(isPhoneBlacklisted(apt.customerPhone));
                  const isExpanded = expandedAptId === apt.id;
                  const servicesSummary = apt.services
                    .map((s) => s.name)
                    .join(" + ");

                  const bookingLink = getShopBookingUrl(currentShop.slug);
                  const reminderText = `Merhaba ${apt.customerName}, ${currentShop.name} randevunuzu hatırlatmak isteriz. 📅 Tarih: ${cleanDateLabel} ⏰ Saat: ${apt.time} ✂️ İşlem: ${servicesSummary}. Randevu detayları: ${bookingLink} — Sizi bekliyoruz!`;
                  const approvalText = `Merhaba ${apt.customerName}, ${cleanDateLabel} saat ${apt.time} için ${currentShop.name} randevunuz onaylanmıştır. Randevu takip ve işlemleriniz: ${bookingLink} — Görüşmek üzere!`;
                  const reminderWhatsAppUrl = buildWhatsAppUrl(
                    apt.customerPhone,
                    reminderText
                  );
                  const approvalWhatsAppUrl = buildWhatsAppUrl(
                    apt.customerPhone,
                    approvalText
                  );

                  return (
                    <div
                      key={apt.id}
                      className={`overflow-hidden rounded-xl border transition-all pointer-events-auto ${
                        isExpanded
                          ? "border-amber-500 dark:border-[#dfc39e] bg-stone-50 dark:bg-[#161519] shadow-lg shadow-amber-500/10"
                          : isBlacklistApt && isPending
                          ? "border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-[#1c0d11] border-l-4 border-l-rose-500 shadow-sm"
                          : isPending
                          ? "border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-[#1b140f] border-l-4 border-l-amber-500 shadow-sm"
                          : isCompleted
                          ? "border-stone-200 dark:border-emerald-500/30 bg-stone-50 dark:bg-[#121614] border-l-4 border-l-emerald-600 shadow-sm"
                          : isCancelled || isNoShow
                          ? "border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-[#181212] border-l-4 border-l-rose-400 shadow-sm"
                          : "border-stone-200 dark:border-emerald-500/40 bg-white dark:bg-[#121914] border-l-4 border-l-emerald-500 shadow-sm hover:border-emerald-400"
                      }`}
                    >
                      {/* 1. KAPALI (VARSAYILAN) TEK SATIR: SAAT | MÜŞTERİ | HİZMET | DURUM */}
                      <div
                        onClick={() => toggleAptAccordion(apt.id)}
                        className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 select-none pointer-events-auto"
                      >
                        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                          {/* Saat Rozeti */}
                          <div className="shrink-0 rounded-lg border border-amber-300 dark:border-[#dfc39e]/40 bg-amber-100 dark:bg-[#dfc39e]/15 px-2 py-1 text-center font-mono text-xs font-black text-amber-950 dark:text-[#fdf8f5] sm:text-sm">
                            {apt.time}
                          </div>

                          {/* İsim ve Hizmet */}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-xs font-black text-stone-900 dark:text-[#fdf8f5] sm:text-sm">
                                {apt.customerName}
                              </span>
                              {/* Koltuk / Personel Rozeti */}
                              {apt.barberName && !apt.isBlockedSlot && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-stone-300 dark:border-[#dfc39e]/40 bg-stone-100 dark:bg-[#dfc39e]/15 px-1.5 py-0.5 text-[10px] font-black text-stone-700 dark:text-[#dfc39e]">
                                  <User className="h-2.5 w-2.5" />
                                  <span>{apt.barberName.replace(/\s*\(.*?\)/, "")}</span>
                                </span>
                              )}
                              {apt.status === "pending" && (
                                isPhoneBlacklisted(apt.customerPhone) || apt.requiresDeposit || apt.isBlacklisted ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-500 bg-rose-500/30 px-2.5 py-0.5 text-[10px] font-black text-rose-200 shadow-md shadow-rose-500/20 animate-pulse">
                                    🚨 KARA LİSTE - KAPORA BEKLİYOR
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/80 bg-amber-500/25 px-2 py-0.5 text-[10px] font-black text-amber-300 shadow-sm animate-pulse">
                                    <span>
                                      ⏳ Onay Bekliyor (
                                      {apt.verificationCode ||
                                        `#${apt.appointmentCode
                                          .replace(/\D/g, "")
                                          .slice(-4)}`}
                                      )
                                    </span>
                                  </span>
                                )
                              )}
                              {apt.status === "confirmed" && (
                                <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-black text-emerald-300">
                                  Onaylandı ✅
                                </span>
                              )}
                              {apt.canComeEarly &&
                                (apt.status === "upcoming" ||
                                  apt.status === "confirmed" ||
                                  apt.status === "pending") && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/60 bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-300 shadow-sm shadow-amber-400/20">
                                    <Zap className="h-2.5 w-2.5 fill-amber-300" />
                                    <span>Erken Gelebilir</span>
                                  </span>
                                )}
                              {isCompleted && (
                                <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-black text-emerald-300">
                                  Geldi
                                </span>
                              )}
                              {isCancelled && (
                                <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-black text-rose-300">
                                  İptal
                                </span>
                              )}
                              {isNoShow && (
                                <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-black text-rose-300">
                                  Gelmedi
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] font-medium text-stone-400">
                              ✂️ {servicesSummary}
                            </p>
                          </div>
                        </div>

                        {/* Tutar & Accordion Oku */}
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs font-black text-amber-700 dark:text-[#dfc39e] sm:text-sm">
                            {apt.totalPrice} TL
                          </span>
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-lg bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-400 transition-transform ${
                              isExpanded ? "rotate-180 text-[#dfc39e]" : ""
                            }`}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>

                      {/* 2. AÇIK (TIKLANINCA AÇILAN) DETAY & AKSİYON ALANI */}
                      {isExpanded && (
                        <div className="border-t border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#111113] p-3.5 sm:p-4 space-y-3 pointer-events-auto">
                          {/* Müşteri Bilgileri, Hizmet ve Tutar Özeti */}
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#161519] p-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-stone-400 font-semibold">Müşteri:</span>
                                <span className="text-sm font-black text-stone-900 dark:text-[#fdf8f5]">{apt.customerName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-stone-400 font-semibold">İşlem:</span>
                                <span className="font-bold text-stone-800 dark:text-[#f3e8dc]">
                                  {servicesSummary} ({apt.totalDuration || 30} dk)
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-stone-400">
                                <span>📅 {cleanDateLabel} • Saat {apt.time}</span>
                                {apt.barberName && <span>• 💺 {apt.chairLabel || apt.barberName}</span>}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs font-semibold text-stone-400">Toplam Tutar</span>
                              <span className="text-lg font-black text-amber-700 dark:text-[#dfc39e]">{apt.totalPrice} TL</span>
                            </div>
                          </div>

                          {/* Telefon Numarası & Düzenleme */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-400">Telefon:</span>
                              {editingPhoneAptId === apt.id ? (
                                <div
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-[#0d0c0b] p-1 shadow-md"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="ml-1 h-3.5 w-3.5 text-amber-300 shrink-0" />
                                  <input
                                    type="tel"
                                    autoFocus
                                    value={editingPhoneValue}
                                    onChange={(e) => setEditingPhoneValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleSaveCustomerPhone(apt.id, apt.customerName);
                                      } else if (e.key === "Escape") {
                                        setEditingPhoneAptId(null);
                                      }
                                    }}
                                    placeholder="05XX XXX XX XX"
                                    className="w-32 sm:w-36 bg-transparent px-1 py-0.5 font-mono text-xs font-bold text-[#fdf8f5] outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveCustomerPhone(apt.id, apt.customerName)}
                                    className="inline-flex items-center justify-center rounded bg-emerald-500 px-2 py-1 text-[11px] font-black text-[#06150f] hover:bg-emerald-400 transition cursor-pointer"
                                    title="Numarayı Kaydet"
                                  >
                                    <Check className="h-3 w-3 stroke-[3]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPhoneAptId(null)}
                                    className="inline-flex items-center justify-center rounded border border-white/20 bg-white/10 px-1.5 py-1 text-[11px] font-bold text-stone-300 hover:bg-white/20 transition cursor-pointer"
                                    title="İptal"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-2">
                                  <span className="font-mono text-sm font-black text-stone-900 dark:text-[#dfc39e]">
                                    {formatPhoneDisplay(apt.customerPhone)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingPhoneAptId(apt.id);
                                      setEditingPhoneValue(apt.customerPhone);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-stone-300 hover:bg-white/10 transition cursor-pointer"
                                    title="Numarayı Düzenle"
                                  >
                                    <Edit3 className="h-2.5 w-2.5" />
                                    <span>Düzenle</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Doğrudan İletişim Butonları */}
                            <div className="flex items-center gap-2">
                              <a
                                href={`tel:${apt.customerPhone}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition cursor-pointer"
                              >
                                <Phone className="h-3.5 w-3.5" />
                                <span>📞 Müşteriyi Ara</span>
                              </a>
                              <a
                                href={buildWhatsAppUrl(
                                  apt.customerPhone,
                                  `Merhaba ${apt.customerName}, ${currentShop.name} randevunuz hk: Tarih: ${cleanDateLabel}, Saat: ${apt.time}.`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/40 bg-[#25D366]/15 px-3 py-1.5 text-xs font-bold text-[#25D366] hover:bg-[#25D366]/25 transition cursor-pointer"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span>💬 WhatsApp</span>
                              </a>
                            </div>
                          </div>

                          {/* 🚨 Kara Liste / Kapora Bekliyor Uyarısı */}
                          {(apt.status === "pending" || isPhoneBlacklisted(apt.customerPhone) || apt.requiresDeposit || apt.isBlacklisted) && (
                            <div className="rounded-xl border border-rose-500/50 bg-rose-950/30 p-2.5 text-xs text-rose-200 flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                                <span>
                                  🚨 Kara Liste / Kapora Bekliyor: {apt.depositAmount || currentShop.depositAmount || 200} TL kapora dekontu bekleniyor.
                                </span>
                              </span>
                              {apt.verificationCode && (
                                <span className="font-mono font-black text-amber-300">
                                  Onay Kodu: {apt.verificationCode}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Aksiyon Butonları Izgarası */}
                          {apt.status === "pending" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  confirmAppointment(apt.id);
                                  triggerToast(
                                    `${apt.customerName} — Kapora Alındı & Onaylandı ✅`,
                                    "Kapora ödemesi doğrulandı ve randevu kesinleşti.",
                                    "success"
                                  );
                                }}
                                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2.5 px-4 text-xs font-black text-[#06150f] shadow-lg shadow-emerald-500/25 transition active:scale-[0.98] cursor-pointer"
                              >
                                <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                                <span>✅ Kaporayı Aldım, Onayla</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`${apt.customerName} randevusunu reddetmek / iptal etmek istediğinize emin misiniz?`)) {
                                    handleCancelByAdmin(apt);
                                    setExpandedAptId(null);
                                  }
                                }}
                                className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/60 bg-rose-600/20 hover:bg-rose-600/30 py-2.5 px-4 text-xs font-black text-rose-200 transition active:scale-[0.98] cursor-pointer"
                              >
                                <Ban className="h-4 w-4" />
                                <span>❌ Reddet / İptal Et</span>
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                              {!isCompleted && !isCancelled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleComplete(apt);
                                    setExpandedAptId(null);
                                  }}
                                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2 px-3 text-xs font-black text-[#06150f] transition active:scale-[0.98] cursor-pointer"
                                >
                                  <Check className="h-4 w-4 stroke-[3]" />
                                  <span>Geldi ✅</span>
                                </button>
                              )}

                              {!isCancelled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`${apt.customerName} randevusunu iptal etmek istediğinize emin misiniz?`)) {
                                      handleCancelByAdmin(apt);
                                      setExpandedAptId(null);
                                    }
                                  }}
                                  className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-500/15 hover:bg-rose-500/25 py-2 px-3 text-xs font-black text-rose-200 transition active:scale-[0.98] cursor-pointer"
                                >
                                  <X className="h-4 w-4" />
                                  <span>İptal Et ❌</span>
                                </button>
                              )}

                              {isPhoneBlacklisted(apt.customerPhone) ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRemoveBlacklistModal(apt.customerPhone, apt.customerName)}
                                  className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 py-2 px-3 text-xs font-black text-amber-300 transition active:scale-[0.98] cursor-pointer"
                                >
                                  <span>Kara Listeden Çıkar</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenNoShowModal(apt);
                                    setExpandedAptId(null);
                                  }}
                                  className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-500/20 hover:bg-rose-500/35 py-2 px-3 text-xs font-black text-rose-200 transition active:scale-[0.98] cursor-pointer"
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>Kara Listeye Al</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* SEKME 2: ➕ HIZLI EKLE (SADECE 3 KUTULUK EKRAN: İSİM, SAAT, HİZMET)   */}
        {/* ===================================================================== */}
        {bottomTab === "quick_add" && (
          <form
            onSubmit={handleSaveQuickAdd}
            className="space-y-5 rounded-3xl border border-[#dfc39e]/50 bg-[#141416] p-4 shadow-2xl sm:p-6"
          >
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-lg font-black text-[#fdf8f5] sm:text-xl">
                ➕ Hızlı Randevu Ekle
              </h2>
              <p className="text-xs text-stone-400">
                İsim, saat ve hizmeti seçip tek tuşla kaydedin.
              </p>
            </div>

            {/* KUTU 1: MÜŞTERİ İSMİ (ve İsteğe Bağlı Telefon) */}
            <div className="rounded-2xl border border-white/10 bg-[#101012] p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-[#f3e8dc]">
                <User className="h-4 w-4 text-[#dfc39e]" />
                <span>1. Müşteri İsmi</span>
              </label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <input
                  type="text"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Müşteri Adı (Boşsa: Misafir Müşteri)"
                  className="w-full rounded-xl border-2 border-white/15 bg-[#181411] px-4 py-3.5 text-base font-bold text-[#fdf8f5] placeholder-stone-500 outline-none focus:border-[#dfc39e]"
                />
                <input
                  type="tel"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="Telefon (İsteğe Bağlı: 05XX...)"
                  className="w-full rounded-xl border-2 border-white/15 bg-[#181411] px-4 py-3.5 text-base font-bold text-[#fdf8f5] placeholder-stone-500 outline-none focus:border-emerald-400"
                />
              </div>

              {realBarbers.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {realBarbers.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setQuickBarberId(b.id)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                        quickBarberId === b.id
                          ? "border-[#f3e8dc] bg-[#dfc39e] text-[#1a110b]"
                          : "border-white/10 bg-[#181411] text-stone-300"
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* KUTU 2: SAAT SEÇİMİ */}
            <div className="rounded-2xl border border-white/10 bg-[#101012] p-4">
              <div className="mb-2.5 flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm font-black uppercase text-[#f3e8dc]">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span>2. Gün & Saat Seçin ({quickSelectedDay.chipLabel})</span>
                </label>

                <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                  {liveDays.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setQuickDayId(d.id);
                        setQuickTime("");
                      }}
                      className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                        quickDayId === d.id
                          ? "border-[#f3e8dc] bg-[#dfc39e] text-[#1a110b]"
                          : "border-white/10 bg-[#181411] text-stone-300 hover:border-white/30"
                      }`}
                    >
                      {d.chipLabel}
                    </button>
                  ))}
                </div>
              </div>

              {quickAvailableSlots.length === 0 ? (
                <p className="rounded-xl bg-amber-500/10 p-3 text-center text-xs font-bold text-amber-300">
                  Bu gün için boş saat kalmadı. Başka bir gün seçiniz.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {quickAvailableSlots.map((slot) => {
                    const active = quickTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => setQuickTime(slot.time)}
                        className={`rounded-xl border-2 py-3 text-base font-black transition ${
                          active
                            ? "border-emerald-200 bg-emerald-500 text-[#06150f] shadow-md"
                            : "border-emerald-500/30 bg-[#151e18] text-emerald-300 hover:border-emerald-400"
                        }`}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* KUTU 3: HİZMET SEÇİMİ */}
            <div className="rounded-2xl border border-white/10 bg-[#101012] p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-black uppercase text-[#f3e8dc]">
                  <Scissors className="h-4 w-4 text-[#dfc39e]" />
                  <span>3. Hizmet Seçin</span>
                </label>
                <span className="text-sm font-black text-[#dfc39e]">
                  Toplam: {quickTotalPrice} TL
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {services.map((srv) => {
                  const active = quickServiceIds.includes(srv.id);
                  const price = getServicePriceForBarber(
                    srv,
                    quickSelectedBarber
                  );
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => toggleQuickService(srv.id)}
                      className={`flex items-center justify-between gap-2 rounded-xl border-2 px-3.5 py-3 text-left transition ${
                        active
                          ? "border-[#f3e8dc] bg-[#dfc39e]/25 text-[#fdf8f5]"
                          : "border-white/10 bg-[#181411] text-stone-300"
                      }`}
                    >
                      <span className="flex items-center gap-2 font-extrabold">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border ${
                            active
                              ? "border-emerald-400 bg-emerald-500 text-[#06150f]"
                              : "border-white/25"
                          }`}
                        >
                          {active && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </span>
                        <span className="text-sm">{srv.name}</span>
                      </span>
                      <span className="shrink-0 text-sm font-black text-[#f3e8dc]">
                        {price} TL
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {quickError && (
              <p className="rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-sm font-bold text-rose-300">
                {quickError}
              </p>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-300/80 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 py-4 text-lg font-black text-[#06150f] shadow-xl shadow-emerald-500/25 transition hover:brightness-110 active:scale-[0.99]"
            >
              <Save className="h-5 w-5 stroke-[2.5]" />
              <span>✅ Randevuyu Kaydet ({quickTotalPrice} TL)</span>
            </button>
          </form>
        )}

        {/* ===================================================================== */}
        {/* SEKME 3: ⚙️ DİĞER (SALON BİLGİLERİ, KARA LİSTE, İSTATİSTİK & AYARLAR) */}
        {/* ===================================================================== */}
        {bottomTab === "other" && (
          <div className="space-y-4">
            {/* 📱 DİĞER KISMI SOL ÜST: CANLI MÜŞTERİ QR KODU (TIKLAYINCA BÜYÜR) */}
            <div className="rounded-2xl border border-emerald-400/50 bg-gradient-to-r from-[#141b16] via-[#121614] to-[#141416] p-3.5 sm:p-4 shadow-xl shadow-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Sol Üst Karekod Kutusu - Tıklayınca Büyür */}
                <button
                  type="button"
                  onClick={() => setIsQuickQrModalOpen(true)}
                  className="group relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-white p-1.5 shadow-xl shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="Karekodu tam ekran büyütmek için dokunun"
                >
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=0&ecc=H&color=000000&bgcolor=ffffff&data=${encodeURIComponent(
                      getShopBookingUrl(currentShop.slug)
                    )}`}
                    alt="Randevu QR Kodu"
                    className="h-full w-full object-contain select-none"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity">
                    <QrCode className="h-5 w-5 text-emerald-300" />
                    <span className="text-[10px] font-black text-white mt-0.5">Büyüt 🔍</span>
                  </div>
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-[#fdf8f5] truncate">
                      Müşteri Randevu QR Kodu
                    </h3>
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-black text-emerald-300 shrink-0">
                      Canlı
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-300 truncate">
                    Karekoda dokunarak tam ekran büyütebilir ve müşterinize okutabilirsiniz.
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsQuickQrModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/25 border border-emerald-400/60 px-3 py-1.5 text-xs font-black text-emerald-200 hover:bg-emerald-500/35 transition active:scale-95 cursor-pointer shadow-sm"
                    >
                      <QrCode className="h-3.5 w-3.5 text-emerald-300 stroke-[2.5]" />
                      <span>📱 Hızlı QR Kod</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyBookingLink}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/20 active:scale-95 cursor-pointer"
                    >
                      <Share2 className="h-3.5 w-3.5 text-sky-400" />
                      <span>{copiedShareLink ? "Link Kopyalandı ✓" : "📋 Link Kopyala"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleEnableNotificationsAndSound}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer ${
                        notifPermission === "granted"
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                          : "border-amber-400/50 bg-amber-500/20 text-amber-200"
                      }`}
                      title="Sesli zil ve telefon bildirimini test et / aktif et"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>
                        {notifPermission === "granted"
                          ? "Sesli Bildirim Açık ✓"
                          : "🔔 Sesi & Bildirimi Aç"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfc39e]/40 bg-[#dfc39e]/15 px-3 py-2 text-xs font-black text-[#dfc39e] hover:bg-[#dfc39e]/25 transition cursor-pointer"
                >
                  <span>🖨️ Kapı Afiş Şablonu</span>
                </button>
              </div>
            </div>

            {/* Alt Kategori Seçici */}
            <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-[#141416] p-1.5 sm:grid-cols-5">
              <button
                type="button"
                onClick={() => setOtherSubTab("shop_info")}
                className={`rounded-xl py-2.5 text-xs font-black transition ${
                  otherSubTab === "shop_info"
                    ? "bg-[#dfc39e] text-[#1a110b]"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                🏢 Salon Bilgileri
              </button>
              <button
                type="button"
                onClick={() => setOtherSubTab("stats_blacklist")}
                className={`rounded-xl py-2.5 text-xs font-black transition ${
                  otherSubTab === "stats_blacklist"
                    ? "bg-[#dfc39e] text-[#1a110b]"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                📊 Ciro & Kara Liste
              </button>
              <button
                type="button"
                onClick={() => setOtherSubTab("barbers")}
                className={`rounded-xl py-2.5 text-xs font-black transition ${
                  otherSubTab === "barbers"
                    ? "bg-[#dfc39e] text-[#1a110b]"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                💺 Ustalar ({barbers.length})
              </button>
              <button
                type="button"
                onClick={() => setOtherSubTab("services")}
                className={`rounded-xl py-2.5 text-xs font-black transition ${
                  otherSubTab === "services"
                    ? "bg-[#dfc39e] text-[#1a110b]"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                ✂️ Hizmet & Fiyat
              </button>
              <button
                type="button"
                onClick={() => setOtherSubTab("schedule")}
                className={`rounded-xl py-2.5 text-xs font-black transition ${
                  otherSubTab === "schedule"
                    ? "bg-[#dfc39e] text-[#1a110b]"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                ⏰ Saat & Kapora
              </button>
            </div>

            {/* 3.0: SALON PROFİLİ & İLETİŞİM BİLGİLERİ (BERBER PANELİNDE DÜZENLENEBİLİR) */}
            {otherSubTab === "shop_info" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#dfc39e]/35 bg-gradient-to-br from-[#1a191d] via-[#161519] to-[#111113] p-4 sm:p-6 shadow-xl shadow-[#dfc39e]/15">
                  <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#dfc39e]/20 text-[#dfc39e]">
                          <Scissors className="h-4 w-4" />
                        </span>
                        <h3 className="text-base font-extrabold text-[#fdf8f5] sm:text-lg">
                          Salon Profil & İletişim Bilgileri
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-stone-400">
                        Müşterilerinizin randevu sayfasında ve WhatsApp bildirimlerinde gördüğü iletişim ve adres bilgilerinizi buradan güncelleyin.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyShopPageUrl}
                      className="inline-flex items-center gap-1.5 self-start rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/20 sm:self-auto"
                    >
                      <Share2 className="h-3.5 w-3.5 text-sky-400" />
                      <span>{isCopiedShopUrl ? "Link Kopyalandı!" : "Randevu Linkimi Kopyala"}</span>
                    </button>
                  </div>

                  <form onSubmit={handleSaveShopInfo} className="mt-5 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-[#f3e8dc]">
                          Salon / Berber Adı
                        </label>
                        <input
                          type="text"
                          required
                          value={shopNameInput}
                          onChange={(e) => setShopNameInput(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111113] px-3.5 py-2.5 text-xs font-bold text-[#fdf8f5] focus:border-[#dfc39e] focus:outline-none"
                          placeholder="Örn: Atelier Noir Beşiktaş"
                        />
                        <span className="mt-1 block text-[11px] text-stone-400">
                          Müşteri sayfasında başlık olarak görünür.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#f3e8dc]">
                          WhatsApp & Randevu Telefon Numarası
                        </label>
                        <div className="relative mt-1.5">
                          <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                          <input
                            type="tel"
                            required
                            value={shopPhoneInput}
                            onChange={(e) => setShopPhoneInput(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[#111113] py-2.5 pl-9 pr-3 text-xs font-bold text-[#fdf8f5] focus:border-[#dfc39e] focus:outline-none"
                            placeholder="0532 800 50 60"
                          />
                        </div>
                        <span className="mt-1 block text-[11px] text-stone-400">
                          Müşterilere gidecek otomatik WhatsApp onay linkleri bu numara ile ilişkilendirilir.
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-[#f3e8dc]">
                          İlçe / Konum / Adres
                        </label>
                        <div className="relative mt-1.5">
                          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                          <input
                            type="text"
                            value={shopDistrictInput}
                            onChange={(e) => setShopDistrictInput(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[#111113] py-2.5 pl-9 pr-3 text-xs font-bold text-[#fdf8f5] focus:border-[#dfc39e] focus:outline-none"
                            placeholder="Beşiktaş, İstanbul"
                          />
                        </div>
                        <span className="mt-1 block text-[11px] text-stone-400">
                          Müşteriler randevu alırken salonunuzun konumunu bu metin ile görür.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#f3e8dc]">
                          Slogan / Alt Başlık
                        </label>
                        <input
                          type="text"
                          value={shopSubtitleInput}
                          onChange={(e) => setShopSubtitleInput(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111113] px-3.5 py-2.5 text-xs font-bold text-[#fdf8f5] focus:border-[#dfc39e] focus:outline-none"
                          placeholder="VIP Grooming & Gentlemen's Club"
                        />
                        <span className="mt-1 block text-[11px] text-stone-400">
                          Salonunuzun tarzını yansıtan kısa tanıtım cümlesi.
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-[#f3e8dc]">
                          🏦 Berber IBAN Hesabı (Kapora İçin)
                        </label>
                        <input
                          type="text"
                          value={shopIbanInput}
                          onChange={(e) => setShopIbanInput(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111113] px-3.5 py-2.5 font-mono text-xs font-bold text-[#fdf8f5] focus:border-[#dfc39e] focus:outline-none"
                          placeholder="TR00 0000 0000 0000 0000 0000 00"
                        />
                        <span className="mt-1 block text-[11px] text-stone-400">
                          Kara listedeki müşterilerin randevularını kesinleştirmek için göndereceği banka IBAN bilgisi.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#f3e8dc]">
                          💰 Kara Liste Kapora Tutarı (TL)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="25"
                          value={shopDepositInput}
                          onChange={(e) => setShopDepositInput(Math.max(0, Number(e.target.value) || 0))}
                          className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111113] px-3.5 py-2.5 text-xs font-bold text-[#fdf8f5] focus:border-[#dfc39e] focus:outline-none"
                          placeholder="100"
                        />
                        <span className="mt-1 block text-[11px] text-stone-400">
                          Daha önce randevusuna gelmeyen müşterilerden talep edilecek güvence kapora bedeli.
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-[#f3e8dc]">
                          Dükkan Yönetim PIN Şifresi
                        </label>
                        <div className="relative mt-1.5">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                          <input
                            type="text"
                            maxLength={16}
                            value={shopPinInput}
                            onChange={(e) => setShopPinInput(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[#111113] py-2.5 pl-9 pr-3 text-xs font-bold text-[#fdf8f5] focus:border-[#dfc39e] focus:outline-none"
                            placeholder="1234"
                          />
                        </div>
                        <span className="mt-1 block text-[11px] text-stone-400">
                          Yönetim paneline giriş yaparken kullandığınız gizli PIN kodunuz.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#f3e8dc]">
                          Özel Müşteri Randevu Linkiniz
                        </label>
                        <div className="mt-1.5 flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={getShopBookingUrl(currentShop.slug)}
                            className="w-full rounded-xl border border-sky-500/30 bg-[#111113] px-3.5 py-2.5 font-mono text-xs font-bold text-sky-300 focus:outline-none cursor-default"
                          />
                          <button
                            type="button"
                            onClick={handleCopyShopPageUrl}
                            className="shrink-0 rounded-xl border border-sky-500/40 bg-sky-500/15 p-2.5 text-sky-300 hover:bg-sky-500/25"
                            title="Linki Kopyala"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="mt-1 block text-[11px] text-stone-400">
                          Instagram biyografinize veya WhatsApp durumunuza ekleyeceğiniz link.
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                      <div className="text-[11px] text-[#f3e8dc]/80">
                        ✨ Kaydettiğiniz tüm bilgiler tüm cihazlarda ve müşteri randevu sayfasında anında güncellenir.
                      </div>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] px-5 py-2.5 text-xs font-extrabold text-[#1a110b] shadow-lg shadow-[#dfc39e]/25 transition hover:brightness-110"
                      >
                        <Save className="h-4 w-4" />
                        <span>Salon Bilgilerini Kaydet</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 3A: CİRO HESAPLARI, KARA LİSTE VE HIZLI ARAÇLAR */}
            {otherSubTab === "stats_blacklist" && (
              <div className="space-y-5">
                {/* Gelir & İstatistik Kartları */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-emerald-500/30 bg-[#141416] p-4">
                    <span className="text-xs font-bold text-emerald-300">
                      Tamamlanan Ciro
                    </span>
                    <p className="mt-1 text-xl font-black text-[#fdf8f5]">
                      {completedRevenue.toLocaleString("tr-TR")} TL
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#dfc39e]/40 bg-[#141416] p-4">
                    <span className="text-xs font-bold text-[#f3e8dc]">
                      Kurtarılan Gelir
                    </span>
                    <p className="mt-1 text-xl font-black text-[#dfc39e]">
                      {stats.savedRevenue.toLocaleString("tr-TR")} TL
                    </p>
                  </div>
                  <div className="rounded-2xl border border-sky-500/30 bg-[#141416] p-4">
                    <span className="text-xs font-bold text-sky-300">
                      Yedek Doluluk
                    </span>
                    <p className="mt-1 text-xl font-black text-[#fdf8f5]">
                      {stats.waitlistFilled} Koltuk
                    </p>
                  </div>
                  <div className="rounded-2xl border border-rose-500/30 bg-[#141416] p-4">
                    <span className="text-xs font-bold text-rose-300">
                      No-Show Kalkanı
                    </span>
                    <p className="mt-1 text-xl font-black text-[#fdf8f5]">
                      {stats.preventedNoShows} Koruma
                    </p>
                  </div>
                </div>

                {/* 👥 Personel / Koltuk Bazlı Ciro Takibi (Harun Usta, Ömer Çırak vb.) */}
                <div className="rounded-2xl border border-[#dfc39e]/35 bg-[#141416] p-4 sm:p-5 shadow-lg">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-black text-[#fdf8f5]">
                        <Users className="h-4 w-4 text-[#dfc39e]" />
                        <span>Personel & Koltuk Ciro Takibi</span>
                      </h3>
                      <p className="mt-0.5 text-[11px] text-stone-400">
                        Harun Usta, Ömer Çırak ve diğer personellerin günlük ve aylık net kazanç dağılımı
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtherSubTab("barbers")}
                      className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-[#dfc39e]/40 bg-[#dfc39e]/15 px-3 py-1.5 text-[11px] font-black text-[#f3e8dc] transition hover:bg-[#dfc39e]/25"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Personel / Koltuk Yönet</span>
                    </button>
                  </div>

                  {/* Hızlı Özet Şeridi */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-stone-400">
                      Bugün:
                    </span>
                    {staffRevenueStats.map((item) => (
                      <span
                        key={`today-${item.barber.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfc39e]/30 bg-[#221a14] px-2.5 py-1 text-xs font-black text-[#fdf8f5]"
                      >
                        <span className="text-[#dfc39e]">{item.barber.name}:</span>
                        <span className="text-emerald-400">{item.todayRevenue.toLocaleString("tr-TR")} TL</span>
                      </span>
                    ))}
                    <span className="ml-2 text-[11px] font-bold text-stone-400">
                      Bu Ay:
                    </span>
                    {staffRevenueStats.map((item) => (
                      <span
                        key={`month-${item.barber.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#1c1815] px-2.5 py-1 text-xs font-semibold text-stone-300"
                      >
                        <span>{item.barber.name}:</span>
                        <span className="font-bold text-amber-300">{item.monthRevenue.toLocaleString("tr-TR")} TL</span>
                      </span>
                    ))}
                  </div>

                  {/* Personel Detay Kartları */}
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {staffRevenueStats.map((item) => (
                      <div
                        key={item.barber.id}
                        className="rounded-xl border border-white/10 bg-[#101012] p-3.5"
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <div className="min-w-0">
                            <span className="block truncate text-xs font-black text-[#fdf8f5]">
                              {item.barber.name}
                            </span>
                            <span className="text-[10px] text-[#dfc39e]">
                              {item.barber.chairName || item.barber.role}
                            </span>
                          </div>
                          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-stone-300">
                            {item.totalCount} Tamamlanan
                          </span>
                        </div>

                        <div className="mt-2.5 grid grid-cols-2 gap-2 text-center">
                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
                            <span className="block text-[10px] font-bold text-emerald-400">
                              Bugün
                            </span>
                            <p className="mt-0.5 text-sm font-black text-[#fdf8f5]">
                              {item.todayRevenue.toLocaleString("tr-TR")} TL
                            </p>
                            <span className="text-[9px] text-stone-400">
                              {item.todayCount} randevu
                            </span>
                          </div>
                          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                            <span className="block text-[10px] font-bold text-amber-300">
                              Bu Ay
                            </span>
                            <p className="mt-0.5 text-sm font-black text-[#fdf8f5]">
                              {item.monthRevenue.toLocaleString("tr-TR")} TL
                            </p>
                            <span className="text-[9px] text-stone-400">
                              {item.monthCount} randevu
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between rounded-lg bg-black/30 px-2.5 py-1 text-[11px]">
                          <span className="text-stone-400">Toplam Ciro:</span>
                          <span className="font-black text-[#dfc39e]">
                            {item.totalRevenue.toLocaleString("tr-TR")} TL
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hızlı Araçlar: QR Afiş, Müşteri Vitrini, Çıkış, Tema */}
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#141416] p-4">
                  <button
                    type="button"
                    onClick={() => setIsQuickQrModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/80 bg-emerald-500/25 px-3.5 py-2.5 text-xs font-black text-white hover:bg-emerald-500/35 transition active:scale-95 shadow-sm cursor-pointer"
                  >
                    <QrCode className="h-4 w-4 text-emerald-300 stroke-[2.5]" />
                    <span className="text-white font-black">📱 Hızlı QR Kod Göster</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-black transition ${
                      theme === "light"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20"
                        : "border-amber-400/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                    }`}
                  >
                    {theme === "light" ? (
                      <>
                        <Moon className="h-4 w-4 text-indigo-600 fill-indigo-600/20" />
                        <span>Gece Moduna Geç</span>
                      </>
                    ) : (
                      <>
                        <Sun className="h-4 w-4 text-amber-400 fill-amber-400/20" />
                        <span>Gündüz Moduna Geç</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-purple-400/40 bg-purple-500/15 px-3.5 py-2.5 text-xs font-black text-purple-200"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>QR Afiş Yazdır</span>
                  </button>
                  <Link
                    href={`/?shop=${currentShop.slug}&preview=1`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-500/15 px-3.5 py-2.5 text-xs font-black text-sky-200"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Müşteri Ekranını Gör</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      lockAdminSession(currentShop.slug);
                      if (typeof window !== "undefined") {
                        window.location.href = "/admin";
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3.5 py-2.5 text-xs font-black text-rose-300"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Çıkış Yap</span>
                  </button>
                </div>

                {/* Randevuya Gelmeyen Müşteriyi Kara Listeye Alma */}
                <div className="rounded-2xl border border-rose-500/35 bg-[#141416] p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-base font-black text-[#fdf8f5]">
                      <ShieldAlert className="h-5 w-5 text-rose-400" />
                      <span>Ortak Kara Liste ({globalBlacklist.length})</span>
                    </h3>
                    <span className="text-xs font-bold text-rose-300">
                      Kapora Koruması
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
                    Randevusuna gelmeyen müşterileri buradan kara listeye
                    alabilir veya affedebilirsiniz.
                  </p>

                  {activeAppointments.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                      <span className="block text-xs font-bold text-[#f3e8dc]">
                        Aktif Randevulardan Gelmeyen Varsa İşaretleyin:
                      </span>
                      {activeAppointments
                        .filter((a) => !a.isBlockedSlot)
                        .map((apt) => (
                          <div
                            key={apt.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#101012] px-3 py-2 text-xs"
                          >
                            <span className="font-bold text-[#fdf8f5]">
                              {apt.time} • {apt.customerName} (
                              {apt.customerPhone})
                            </span>
                            {isPhoneBlacklisted(apt.customerPhone) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenRemoveBlacklistModal(
                                    apt.customerPhone,
                                    apt.customerName
                                  )
                                }
                                className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-bold text-amber-300"
                              >
                                Kara Listeden Çıkar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenNoShowModal(apt)}
                                className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 font-bold text-rose-300"
                              >
                                Kara Listeye Al
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                    {globalBlacklist.map((entry, idx) => (
                      <div
                        key={`${entry.phone}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-500/25 bg-rose-950/15 p-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#fdf8f5]">
                            {entry.name} ({entry.phone})
                          </p>
                          <p className="text-[11px] text-stone-400">
                            {entry.missedDate} • {entry.requiredDeposit} TL
                            Kapora Şartı
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenRemoveBlacklistModal(
                              entry.phone,
                              entry.name
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 font-bold text-amber-300"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Çıkar</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Yedek Liste */}
                {waitlist.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/30 bg-[#141416] p-4">
                    <h3 className="text-sm font-black text-[#fdf8f5]">
                      Yedek Liste ({waitlist.length})
                    </h3>
                    <div className="mt-3 space-y-2">
                      {waitlist.map((wl) => (
                        <div
                          key={wl.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#101012] p-3 text-xs"
                        >
                          <div>
                            <p className="font-bold text-[#fdf8f5]">
                              {wl.customerName} ({wl.requestedTime})
                            </p>
                            <p className="text-stone-400">
                              {wl.servicesSummary} • {wl.customerPhone}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              notifyWaitlistCustomer(wl.id);
                              triggerToast(
                                "Yedek Müşteri Çağrıldı",
                                `${wl.customerName} bilgilendirildi.`,
                                "whatsapp"
                              );
                            }}
                            className="rounded-lg bg-emerald-500/20 px-3 py-1.5 font-bold text-emerald-300"
                          >
                            {wl.notified ? "Bildirildi ✓" : "Çağır"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3B: USTALAR & KOLTUKLAR */}
            {otherSubTab === "barbers" && (
              <div className="space-y-4">
                <form
                  onSubmit={handleCreateBarber}
                  className="rounded-2xl border border-[#dfc39e]/40 bg-[#141416] p-4"
                >
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-[#fdf8f5]">
                    <UserPlus className="h-4 w-4 text-[#dfc39e]" />
                    <span>Yeni Usta / Koltuk Ekle</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <input
                      type="text"
                      required
                      value={newBarberName}
                      onChange={(e) => setNewBarberName(e.target.value)}
                      placeholder="Usta Adı (Örn: Usta Ali)"
                      className="rounded-xl border border-white/15 bg-[#101012] px-3.5 py-2.5 text-sm text-[#fdf8f5]"
                    />
                    <input
                      type="text"
                      required
                      value={newBarberChair}
                      onChange={(e) => setNewBarberChair(e.target.value)}
                      placeholder="Koltuk Adı (Örn: Koltuk #4)"
                      className="rounded-xl border border-white/15 bg-[#101012] px-3.5 py-2.5 text-sm text-[#fdf8f5]"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-[#dfc39e] py-2.5 text-sm font-black text-[#1a110b]"
                    >
                      + Usta Ekle
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5">
                  {barbers.map((barber) => {
                    const isEditing = editingBarberId === barber.id;
                    return (
                      <div
                        key={barber.id}
                        className="rounded-2xl border border-white/10 bg-[#141416] p-4"
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div>
                                <label className="text-[11px] font-bold text-stone-400 block mb-1">Usta / Personel Adı</label>
                                <input
                                  type="text"
                                  value={editBarberName}
                                  onChange={(e) =>
                                    setEditBarberName(e.target.value)
                                  }
                                  className="w-full rounded-xl border border-white/15 bg-[#101012] px-3 py-2 text-sm font-bold text-[#fdf8f5]"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-bold text-stone-400 block mb-1">Koltuk Adı</label>
                                <input
                                  type="text"
                                  value={editBarberChair}
                                  onChange={(e) =>
                                    setEditBarberChair(e.target.value)
                                  }
                                  className="w-full rounded-xl border border-white/15 bg-[#101012] px-3 py-2 text-sm font-bold text-[#f3e8dc]"
                                />
                              </div>
                            </div>

                            {/* Koltuğa Özel Fiyatlandırma Bölümü */}
                            <div className="rounded-xl border border-white/10 bg-[#0d0d0f] p-3.5 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 border-b border-white/10 pb-2.5">
                                <div>
                                  <h4 className="text-xs font-black text-[#dfc39e] flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-[#dfc39e]" />
                                    <span>Koltuğa Özel Fiyatlandırma (Opsiyonel / Ekstra)</span>
                                  </h4>
                                  <p className="text-[11px] text-stone-400 mt-0.5">
                                    Varsayılan olarak her koltukta standart salon fiyatları geçerlidir. İsterseniz bu koltuk için özel fiyat tanımlayabilirsiniz.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const resetMap: Record<string, string> = {};
                                    services.forEach((s) => {
                                      resetMap[s.id] = String(s.price);
                                    });
                                    setEditBarberPrices(resetMap);
                                  }}
                                  className="self-start sm:self-auto text-[10px] font-bold text-stone-400 hover:text-[#dfc39e] underline transition cursor-pointer"
                                >
                                  Tümünü Standarta Eşitle
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {services.map((srv) => {
                                  const rawVal = editBarberPrices[srv.id];
                                  const currentVal = rawVal !== undefined ? rawVal : String(srv.price);
                                  const numVal = Number(currentVal);
                                  const isCustom = !Number.isNaN(numVal) && numVal !== srv.price && currentVal.trim() !== "";

                                  return (
                                    <div
                                      key={srv.id}
                                      className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                                        isCustom
                                          ? "border-amber-500/50 bg-gradient-to-r from-amber-950/30 to-[#191512]"
                                          : "border-white/5 bg-[#141416]"
                                      }`}
                                    >
                                      <div className="min-w-0 pr-2">
                                        <span className="text-xs font-black text-[#fdf8f5] block truncate">
                                          {srv.name}
                                        </span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[10px] text-stone-400">
                                            Standart: <strong className="text-stone-300 font-mono">{srv.price} TL</strong>
                                          </span>
                                          {isCustom && (
                                            <span className="text-[9px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                                              Özel Fiyat
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <input
                                          type="number"
                                          min="0"
                                          value={currentVal}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setEditBarberPrices((prev) => ({
                                              ...prev,
                                              [srv.id]: val,
                                            }));
                                          }}
                                          className={`w-20 rounded-lg border px-2 py-1 text-right text-xs font-mono font-black focus:outline-none transition ${
                                            isCustom
                                              ? "border-amber-400 bg-black/60 text-amber-300"
                                              : "border-white/15 bg-black/40 text-stone-200 focus:border-[#dfc39e]"
                                          }`}
                                          placeholder={String(srv.price)}
                                        />
                                        <span className="text-xs font-bold text-stone-400">TL</span>
                                        {isCustom && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditBarberPrices((prev) => ({
                                                ...prev,
                                                [srv.id]: String(srv.price),
                                              }));
                                            }}
                                            className="ml-1 text-[10px] font-bold text-stone-400 hover:text-white px-1.5 py-1 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                                            title="Standart fiyata dön"
                                          >
                                            Sıfırla
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingBarberId(null)}
                                className="rounded-xl border border-white/15 px-3.5 py-2 text-xs font-bold text-stone-300 hover:bg-white/5 transition cursor-pointer"
                              >
                                İptal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveBarber(barber)}
                                className="rounded-xl bg-[#dfc39e] hover:bg-[#ebd5b8] px-5 py-2 text-xs font-black text-[#1a110b] shadow-md transition active:scale-95 cursor-pointer"
                              >
                                Kaydet
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-black text-[#fdf8f5]">
                                {barber.name}
                              </p>
                              <p className="text-xs text-[#dfc39e]">
                                {barber.chairName}
                              </p>
                              <div className="mt-1">
                                {barber.customPrices && Object.keys(barber.customPrices).length > 0 ? (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-300">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    <span>Koltuğa Özel Fiyat ({Object.keys(barber.customPrices).length} Hizmet)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-stone-400">
                                    ✓ Standart Salon Fiyatı Geçerli
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditBarber(barber)}
                                className="rounded-xl border border-white/15 bg-[#101012] px-3 py-1.5 text-xs font-bold text-stone-200"
                              >
                                <Edit3 className="inline h-3.5 w-3.5 mr-1" />
                                Düzenle
                              </button>
                              {!barber.isAnyOption && (
                                <button
                                  type="button"
                                  onClick={() => deleteBarber(barber.id)}
                                  className="rounded-xl border border-rose-500/30 bg-rose-500/15 p-2 text-rose-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3C: HİZMETLER & FİYATLAR */}
            {otherSubTab === "services" && (
              <div className="space-y-4">
                <form
                  onSubmit={handleCreateService}
                  className="rounded-2xl border border-[#dfc39e]/40 bg-[#141416] p-4"
                >
                  <h3 className="mb-3 text-sm font-black text-[#fdf8f5]">
                    + Yeni Hizmet Ekle
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                    <input
                      type="text"
                      required
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      placeholder="Hizmet Adı"
                      className="rounded-xl border border-white/15 bg-[#101012] px-3.5 py-2.5 text-sm text-[#fdf8f5] sm:col-span-2"
                    />
                    <input
                      type="number"
                      required
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                      placeholder="Fiyat (TL)"
                      className="rounded-xl border border-white/15 bg-[#101012] px-3.5 py-2.5 text-sm text-[#fdf8f5]"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-[#dfc39e] py-2.5 text-sm font-black text-[#1a110b]"
                    >
                      + Hizmet Ekle
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5">
                  {services.map((srv) => {
                    const isEditing = editingServiceId === srv.id;
                    return (
                      <div
                        key={srv.id}
                        className="rounded-2xl border border-white/10 bg-[#141416] p-4"
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="rounded-xl border border-white/15 bg-[#101012] px-3 py-2 text-sm font-bold text-[#fdf8f5]"
                              />
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) =>
                                  setEditPrice(Number(e.target.value))
                                }
                                className="rounded-xl border border-white/15 bg-[#101012] px-3 py-2 text-sm font-bold text-[#f3e8dc]"
                              />
                              <input
                                type="number"
                                value={editDuration}
                                onChange={(e) =>
                                  setEditDuration(Number(e.target.value))
                                }
                                className="rounded-xl border border-white/15 bg-[#101012] px-3 py-2 text-sm font-bold text-sky-300"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingServiceId(null)}
                                className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-stone-300"
                              >
                                İptal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveService(srv.id)}
                                className="rounded-xl bg-[#dfc39e] px-4 py-1.5 text-xs font-black text-[#1a110b]"
                              >
                                Kaydet
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-black text-[#fdf8f5]">
                                {srv.name}
                              </p>
                              <p className="text-xs font-bold text-[#dfc39e]">
                                {srv.price} TL • {srv.duration} dk
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditService(srv)}
                                className="rounded-xl border border-white/15 bg-[#101012] px-3 py-1.5 text-xs font-bold text-stone-200"
                              >
                                Düzenle
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteService(srv.id)}
                                className="rounded-xl border border-rose-500/30 bg-rose-500/15 p-2 text-rose-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3D: SAATLER, TATİL GÜNLERİ VE KAPORA */}
            {otherSubTab === "schedule" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-[#fdf8f5]">
                    <Clock className="h-4 w-4 text-[#dfc39e]" />
                    <span>Açılış & Kapanış Saatleri</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-stone-400">
                        Açılış
                      </label>
                      <select
                        value={shopSettings.openTime}
                        onChange={(e) =>
                          updateShopSettings({ openTime: e.target.value })
                        }
                        className="w-full rounded-xl border border-white/15 bg-[#101012] px-3 py-2.5 text-sm font-bold text-[#fdf8f5]"
                      >
                        {[
                          "08:00",
                          "08:30",
                          "09:00",
                          "09:30",
                          "10:00",
                          "10:30",
                        ].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-stone-400">
                        Kapanış
                      </label>
                      <select
                        value={shopSettings.closeTime}
                        onChange={(e) =>
                          updateShopSettings({ closeTime: e.target.value })
                        }
                        className="w-full rounded-xl border border-white/15 bg-[#101012] px-3 py-2.5 text-sm font-bold text-[#fdf8f5]"
                      >
                        {[
                          "19:00",
                          "20:00",
                          "21:00",
                          "21:30",
                          "22:00",
                          "23:00",
                        ].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#141416] p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="flex items-center gap-2 text-sm font-black text-stone-900 dark:text-[#fdf8f5]">
                        <Coffee className="h-4 w-4 text-amber-600 dark:text-[#dfc39e]" />
                        Öğle Molası ({shopSettings.breakStart || "12:30"} - {shopSettings.breakEnd || "13:30"})
                      </span>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {isBreakActiveToday
                          ? "Öğle molası devrede; bu saatler randevuya kapalı."
                          : "Öğle molası kapalı; saatler randevuya açık."}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isTogglingBreak}
                      onClick={handleToggleBreakSecure}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black transition active:scale-95 cursor-pointer shadow-sm ${
                        isTogglingBreak
                          ? "cursor-wait opacity-60 bg-stone-200 dark:bg-white/10 text-stone-500 dark:text-stone-400"
                          : isBreakActiveToday
                          ? "bg-amber-500 hover:bg-amber-600 text-stone-950 font-black shadow-amber-500/20"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                      }`}
                    >
                      {isTogglingBreak
                        ? "⏳ İşleniyor..."
                        : isBreakActiveToday
                        ? "▶️ Öğle Molasını Aç (Saatleri Aktif Et)"
                        : `⏸️ Öğle Molasını Kapat (${shopSettings.breakStart || "12:30"} - ${shopSettings.breakEnd || "13:30"})`}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-[#fdf8f5]">
                    <CalendarOff className="h-4 w-4 text-rose-400" />
                    <span>Haftalık Tatil Günleri</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
                    {WEEKDAYS_TR.map((day) => {
                      const isClosed = shopSettings.closedDays.includes(
                        day.dayOfWeek
                      );
                      return (
                        <button
                          key={day.dayOfWeek}
                          type="button"
                          onClick={() => toggleClosedDay(day.dayOfWeek)}
                          className={`rounded-xl border py-2.5 text-xs font-black ${
                            isClosed
                              ? "border-rose-500 bg-rose-500/20 text-rose-300"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          }`}
                        >
                          {day.short}: {isClosed ? "KAPALI" : "AÇIK"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                  <h3 className="mb-2 text-sm font-black text-[#fdf8f5]">
                    Kara Liste Ön Kapora Tutarı (TL)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[100, 150, 200, 300].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() =>
                          updateCurrentShopDepositPolicy(
                            currentShop.depositPolicy,
                            amt
                          )
                        }
                        className={`rounded-xl border px-4 py-2 text-xs font-black ${
                          currentShop.depositAmount === amt
                            ? "border-[#f3e8dc] bg-[#dfc39e] text-[#1a110b]"
                            : "border-white/15 bg-[#101012] text-[#f3e8dc]"
                        }`}
                      >
                        {amt} TL
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* En Altta Sade PWA Yükleme Barı */}
        <PwaInstallBanner mode="admin" />

        {/* ===================================================================== */}
        {/* SABİT ALT NAVİGASYON BARI (BOTTOM NAVIGATION BAR — 3 TEMİZ SEKME)     */}
        {/* ===================================================================== */}
        <nav
          aria-label="Berber Alt Menü"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-[#dfc39e]/35 bg-[#0e0b09]/95 px-3 py-2 backdrop-blur-xl"
        >
          <div className="mx-auto grid max-w-xl grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setBottomTab("appointments")}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 text-xs font-black transition ${
                bottomTab === "appointments"
                  ? "bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b] shadow-lg shadow-[#dfc39e]/25"
                  : "text-stone-400 hover:text-[#fdf8f5]"
              }`}
            >
              <span className="text-base leading-none">📅</span>
              <span>Randevular ({activeAppointments.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setBottomTab("quick_add")}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 text-xs font-black transition ${
                bottomTab === "quick_add"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-[#06150f] shadow-lg shadow-emerald-500/25"
                  : "text-stone-400 hover:text-[#fdf8f5]"
              }`}
            >
              <span className="text-base leading-none">➕</span>
              <span>Hızlı Ekle</span>
            </button>

            <button
              type="button"
              onClick={() => setBottomTab("other")}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 text-xs font-black transition ${
                bottomTab === "other"
                  ? "bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b] shadow-lg shadow-[#dfc39e]/25"
                  : "text-stone-400 hover:text-[#fdf8f5]"
              }`}
            >
              <span className="text-base leading-none">⚙️</span>
              <span>Diğer</span>
            </button>
          </div>
        </nav>

        {/* MODAL 1: KARA LİSTEYE ALMA ONAY MODALI */}
        <AnimatePresence>
          {noShowConfirmModal.isOpen && noShowConfirmModal.appointment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                onClick={() =>
                  setNoShowConfirmModal({
                    isOpen: false,
                    appointment: null,
                    depositAmount: 100,
                  })
                }
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#1c1613] p-6 shadow-2xl"
              >
                <h3 className="text-base font-extrabold text-[#fdf8f5]">
                  Kara Listeye Ekle: {noShowConfirmModal.appointment.customerName}
                </h3>
                <p className="mt-1 text-xs text-stone-300">
                  Tekrar randevu alırken istenecek ön kapora tutarı (TL):
                </p>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={noShowConfirmModal.depositAmount}
                  onChange={(e) =>
                    setNoShowConfirmModal((prev) => ({
                      ...prev,
                      depositAmount: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="mt-3 w-full rounded-xl border border-white/20 bg-[#131316] px-3.5 py-2.5 text-sm font-bold text-[#fdf8f5]"
                />
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setNoShowConfirmModal({
                        isOpen: false,
                        appointment: null,
                        depositAmount: 100,
                      })
                    }
                    className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-stone-300"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmNoShow}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white"
                  >
                    Kara Listeye Ekle
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: KARA LİSTEDEN ÇIKARMA MODALI */}
        <AnimatePresence>
          {removeBlacklistModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                onClick={() =>
                  setRemoveBlacklistModal({
                    isOpen: false,
                    phone: "",
                    customerName: "",
                  })
                }
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#1c1613] p-6 shadow-2xl"
              >
                <h3 className="text-base font-extrabold text-[#fdf8f5]">
                  Kara Listeden Çıkar
                </h3>
                <p className="mt-2 text-xs text-stone-300">
                  <strong>{removeBlacklistModal.customerName}</strong> (
                  {removeBlacklistModal.phone}) adlı müşteriyi kara listeden
                  çıkarmak istediğinize emin misiniz?
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRemoveBlacklistModal({
                        isOpen: false,
                        phone: "",
                        customerName: "",
                      })
                    }
                    className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-stone-300"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRemoveBlacklist}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-[#131316]"
                  >
                    Evet, Çıkar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 3: ⛔ SAAT KAPAT / MOLA EKLE MODALI */}
        <AnimatePresence>
          {blockModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                onClick={() => setBlockModal((prev) => ({ ...prev, isOpen: false }))}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-md rounded-2xl border border-amber-500/50 bg-[#1c1613] p-5 sm:p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-[#fdf8f5]">
                        ⛔ Saat Kapat / Mola Ekle
                      </h3>
                      <p className="text-[11px] text-stone-400">
                        Bu saat müşteri ekranında dolu görünür, ciroya para olarak eklenmez.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBlockModal((prev) => ({ ...prev, isOpen: false }))}
                    className="rounded-lg p-1.5 text-stone-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Usta / Koltuk Seçimi */}
                  <div>
                    <label className="block text-xs font-bold text-[#f3e8dc]">
                      Usta / Koltuk
                    </label>
                    <select
                      value={blockModal.barberId}
                      onChange={(e) =>
                        setBlockModal((prev) => ({ ...prev, barberId: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-white/15 bg-[#131316] px-3.5 py-2.5 text-xs font-bold text-[#fdf8f5]"
                    >
                      {realBarbers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.chairName || b.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tarih Seçimi */}
                  <div>
                    <label className="block text-xs font-bold text-[#f3e8dc]">
                      Tarih
                    </label>
                    <select
                      value={blockModal.dayId}
                      onChange={(e) =>
                        setBlockModal((prev) => ({ ...prev, dayId: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-white/15 bg-[#131316] px-3.5 py-2.5 text-xs font-bold text-[#fdf8f5]"
                    >
                      {liveDays.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullDate || d.chipLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Saat Aralığı */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-[#f3e8dc]">
                        Başlangıç Saati
                      </label>
                      <input
                        type="time"
                        value={blockModal.startTime}
                        onChange={(e) =>
                          setBlockModal((prev) => ({ ...prev, startTime: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-white/15 bg-[#131316] px-3.5 py-2 text-xs font-black text-[#fdf8f5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#f3e8dc]">
                        Bitiş Saati
                      </label>
                      <input
                        type="time"
                        value={blockModal.endTime}
                        onChange={(e) =>
                          setBlockModal((prev) => ({ ...prev, endTime: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-white/15 bg-[#131316] px-3.5 py-2 text-xs font-black text-[#fdf8f5]"
                      />
                    </div>
                  </div>

                  {/* Kapatma Nedeni */}
                  <div>
                    <label className="block text-xs font-bold text-[#f3e8dc]">
                      Kapatma Nedeni / Mola Türü
                    </label>
                    <input
                      type="text"
                      value={blockModal.reason}
                      onChange={(e) =>
                        setBlockModal((prev) => ({ ...prev, reason: e.target.value }))
                      }
                      placeholder="Örn: Yemek Molası"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-[#131316] px-3.5 py-2 text-xs font-bold text-[#fdf8f5]"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {["🍽️ Yemek Molası", "☕ Dinlenme", "💼 Özel İş", "🧹 Temizlik / Bakım"].map(
                        (tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setBlockModal((prev) => ({ ...prev, reason: tag }))
                            }
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold transition ${
                              blockModal.reason === tag
                                ? "border-amber-400 bg-amber-400/20 text-amber-200"
                                : "border-white/10 bg-white/5 text-stone-400 hover:text-white"
                            }`}
                          >
                            {tag}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setBlockModal((prev) => ({ ...prev, isOpen: false }))}
                    className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold text-stone-300 hover:bg-white/5"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBlockTime}
                    className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-xs font-black text-[#1a110b] shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95"
                  >
                    ⛔ Saati Kapat / Molayı Başlat
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SÜRÜKLE - BIRAK SAAT DEĞİŞİKLİĞİ ONAY MODALI                         */}
          {/* ===================================================================== */}
          {dragConfirmModal.isOpen && dragConfirmModal.appointment && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl border border-white/20 bg-[#161619] p-5 shadow-2xl text-[#fdf8f5]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Clock className="h-6 w-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#fdf8f5]">
                      🔄 Saat Değişikliği Onayı
                    </h3>
                    <p className="text-xs text-stone-400 font-medium">
                      Randevu saatini taşımak üzeresiniz
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0d0d0f] p-4 space-y-2.5 mb-5">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-300">
                    <span>Müşteri:</span>
                    <span className="text-sm font-black text-[#fdf8f5]">
                      {dragConfirmModal.appointment.customerName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-stone-300">
                    <span>İşlem:</span>
                    <span className="text-xs font-extrabold text-[#dfc39e]">
                      {dragConfirmModal.appointment.services?.map((s) => s.name).join(", ") || "Hizmet"} ({dragConfirmModal.appointment.totalDuration || 30} dk)
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-3 rounded-xl bg-white/5 p-3 text-center border border-white/10">
                    <div className="text-center">
                      <span className="block text-[10px] font-bold text-stone-400 uppercase">Eski Saat</span>
                      <span className="text-sm font-black text-rose-300 line-through">
                        {dragConfirmModal.appointment.time}
                      </span>
                    </div>
                    <span className="text-emerald-400 text-lg font-black">➔</span>
                    <div className="text-center">
                      <span className="block text-[10px] font-bold text-stone-400 uppercase">Yeni Saat</span>
                      <span className="text-base font-black text-emerald-400">
                        {dragConfirmModal.targetTime}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-stone-400 text-center mb-5">
                  &quot;{dragConfirmModal.appointment.customerName}&quot; adlı müşterinin randevusu{" "}
                  <strong className="text-white font-bold">{dragConfirmModal.appointment.time}</strong> saatinden{" "}
                  ➔ <strong className="text-emerald-300 font-bold">{dragConfirmModal.targetTime}</strong> saatine taşınacaktır. Emin misiniz?
                </p>

                <div className="flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setDragConfirmModal({ isOpen: false, appointment: null, targetTime: "" })
                    }
                    className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-xs font-bold text-stone-300 hover:bg-white/5 transition"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDragReschedule}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-3 text-xs font-black text-[#06150f] shadow-lg shadow-emerald-500/25 transition hover:brightness-110 active:scale-95"
                  >
                    Evet, Taşı
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* HIZLI QR KOD (KAREKOD) MODALI                                         */}
          {/* ===================================================================== */}
          {isQuickQrModalOpen && (
            <div
              onClick={() => setIsQuickQrModalOpen(false)}
              className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto my-auto rounded-3xl border-2 border-emerald-400/40 bg-[#141416] p-5 sm:p-6 shadow-2xl text-center text-[#fdf8f5]"
              >
                {/* Kapat Butonu - Geniş, Yüksek Kontrastlı, Her Ekranda Kesinlikle Erişilebilir */}
                <button
                  type="button"
                  onClick={() => setIsQuickQrModalOpen(false)}
                  aria-label="Pencereyi Kapat"
                  className="absolute right-3.5 top-3.5 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-stone-800/95 border-2 border-white/30 text-white hover:bg-rose-500 hover:border-rose-500 shadow-xl transition-all active:scale-90 cursor-pointer"
                  title="Kapat"
                >
                  <X className="h-5 w-5 stroke-[2.5]" />
                </button>

                <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <QrCode className="h-5 w-5 stroke-[2.5]" />
                </div>

                <h3 className="text-base sm:text-lg font-black tracking-tight text-[#fdf8f5] pr-6 pl-2">
                  📱 Hızlı Müşteri QR Kodu
                </h3>
                <p className="mt-0.5 text-xs text-stone-400">
                  Müşteriniz kamerasını okutarak anında randevu oluşturabilir
                </p>

                {/* Büyük Net Karekod */}
                <div className="my-4 flex justify-center">
                  <div className="rounded-2xl border-4 border-white bg-white p-2.5 shadow-xl">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=10&ecc=H&color=000000&bgcolor=ffffff&data=${encodeURIComponent(
                        getShopBookingUrl(currentShop.slug)
                      )}`}
                      alt="Berber Randevu QR Kodu"
                      className="h-48 w-48 sm:h-52 sm:w-52 object-contain select-none"
                    />
                  </div>
                </div>

                <div className="mb-3.5 rounded-xl border border-white/10 bg-[#0d0d0f] p-3 text-left">
                  <div className="text-[11px] font-bold text-stone-400">Salon Adı:</div>
                  <div className="text-sm font-black text-emerald-400 truncate">
                    {currentShop.name}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-stone-400">Randevu Linki:</div>
                  <div className="text-xs font-mono text-stone-300 truncate">
                    {getShopBookingUrl(currentShop.slug)}
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Karekodu İndir Butonu */}
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&margin=20&ecc=H&format=png&data=${encodeURIComponent(
                      getShopBookingUrl(currentShop.slug)
                    )}`}
                    download={`${currentShop.slug}-randevu-qr.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-2.5 text-xs font-black text-[#06150f] shadow-lg shadow-emerald-500/25 transition hover:brightness-110 active:scale-98"
                  >
                    <Download className="h-4 w-4 stroke-[2.5]" />
                    <span>⬇️ Karekodu İndir (PNG)</span>
                  </a>

                  {/* Linki Kopyala Butonu */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.clipboard) {
                        navigator.clipboard.writeText(getShopBookingUrl(currentShop.slug));
                      }
                      setCopiedQuickQrLink(true);
                      triggerToast("Link Kopyalandı!", "Müşteri randevu bağlantısı panoya alındı.", "success");
                      setTimeout(() => setCopiedQuickQrLink(false), 2000);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-stone-200 hover:bg-white/10 transition"
                  >
                    {copiedQuickQrLink ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-300 font-black">Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>📋 Linki Kopyala</span>
                      </>
                    )}
                  </button>

                  {/* Şık Afiş Aç */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickQrModalOpen(false);
                      setIsQrModalOpen(true);
                    }}
                    className="w-full text-center text-xs font-bold text-[#dfc39e] hover:underline pt-0.5"
                  >
                    🖨️ Masaüstü / Kapı Afiş Şablonunu Aç
                  </button>

                  {/* Net Kapat Butonu */}
                  <button
                    type="button"
                    onClick={() => setIsQuickQrModalOpen(false)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 py-2.5 text-xs font-black text-stone-200 transition active:scale-98 cursor-pointer mt-1"
                  >
                    <X className="h-4 w-4" />
                    <span>Pencereyi Kapat</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* MOBİL VE DOKUNMATİK SAAT DEĞİŞTİRME SEÇİCİ MODALI                     */}
          {/* ===================================================================== */}
          {mobileRescheduleApt && (
            <div
              onClick={() => setMobileRescheduleApt(null)}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md max-h-[92vh] overflow-y-auto my-auto rounded-2xl border border-white/20 bg-[#161619] p-5 shadow-2xl text-[#fdf8f5]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#fdf8f5]">
                        Yeni Saat Seçin
                      </h3>
                      <p className="text-[11px] text-stone-400">
                        {mobileRescheduleApt.customerName} ({mobileRescheduleApt.time})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileRescheduleApt(null)}
                    className="rounded-lg p-1.5 text-stone-400 hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="py-4">
                  <p className="text-xs font-bold text-stone-300 mb-3">
                    Taşımak istediğiniz boş saat dilimine dokunun:
                  </p>

                  <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                    {timelineSlots.map((slotTime) => {
                      const isCurrent = slotTime === mobileRescheduleApt.time;
                      const duration = mobileRescheduleApt.totalDuration || 30;
                      const targetStartM = timeToMinutes(slotTime);
                      const targetEndM = targetStartM + duration;

                      const isOccupied = timelineAppointments.some((a) => {
                        if (a.id === mobileRescheduleApt.id) return false;
                        if (
                          mobileRescheduleApt.barberId !== "any" &&
                          a.barberId !== "any" &&
                          a.barberId !== mobileRescheduleApt.barberId
                        ) {
                          return false;
                        }
                        const aStartM = timeToMinutes(a.time);
                        const aEndM = timeToMinutes(
                          a.endTime || minutesToTime(aStartM + (a.totalDuration || 30))
                        );
                        return targetStartM < aEndM && targetEndM > aStartM;
                      });

                      return (
                        <button
                          key={slotTime}
                          type="button"
                          disabled={isOccupied || isCurrent}
                          onClick={() => {
                            const targetTime = slotTime;
                            const aptToMove = mobileRescheduleApt;
                            setMobileRescheduleApt(null);
                            setDragConfirmModal({
                              isOpen: true,
                              appointment: aptToMove,
                              targetTime,
                            });
                          }}
                          className={`rounded-xl py-2.5 text-center text-xs font-black transition ${
                            isCurrent
                              ? "border border-amber-500/50 bg-amber-500/10 text-amber-300 cursor-default"
                              : isOccupied
                              ? "border border-white/5 bg-white/5 text-stone-600 cursor-not-allowed opacity-40"
                              : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/20 active:scale-95"
                          }`}
                        >
                          {slotTime}
                          {isCurrent && <span className="block text-[9px] font-normal">Şu Anki</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setMobileRescheduleApt(null)}
                    className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-stone-300 hover:bg-white/5"
                  >
                    Vazgeç
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* 📅 TAKVİM RANDEVU DETAY, NORMAL ARAMA & WHATSAPP MODALI                */}
          {/* ===================================================================== */}
          {activeDetailApt && (
            <div
              onClick={() => setSelectedDetailApt(null)}
              className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md max-h-[92vh] overflow-y-auto my-auto rounded-3xl border border-stone-200 dark:border-white/20 bg-white dark:bg-gradient-to-b dark:from-[#18181c] dark:to-[#121214] p-5 sm:p-6 shadow-2xl text-stone-900 dark:text-[#fdf8f5]"
              >
                {/* Kapat Butonu */}
                <button
                  type="button"
                  onClick={() => setSelectedDetailApt(null)}
                  aria-label="Kapat"
                  className="absolute right-3.5 top-3.5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-stone-800/90 border border-white/25 text-white hover:bg-rose-500 hover:border-rose-500 shadow-xl transition-all active:scale-90 cursor-pointer"
                  title="Kapat"
                >
                  <X className="h-5 w-5 stroke-[2.5]" />
                </button>

                {/* Başlık Alanı */}
                <div className="flex items-center gap-3 pr-8 pb-3 border-b border-white/10">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dfc39e]/20 text-[#dfc39e] border border-[#dfc39e]/30 shrink-0">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-[#fdf8f5] truncate">
                      Randevu Detayları
                    </h3>
                    <p className="text-xs text-stone-400 truncate">
                      📅 {resolveDayMetadata(activeDetailApt.dayId).chipLabel} • ⏰ {activeDetailApt.time} - {activeDetailApt.endTime || minutesToTime(timeToMinutes(activeDetailApt.time) + (activeDetailApt.totalDuration || 30))}
                    </p>
                  </div>
                </div>

                {/* Müşteri Profil Kutusu */}
                <div className="mt-4 rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#101012] p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-stone-400 block">Müşteri</span>
                      <h4 className="text-lg font-black text-[#fdf8f5] truncate">
                        {activeDetailApt.customerName}
                      </h4>
                    </div>

                    <div className="shrink-0 text-right">
                      {activeDetailApt.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-black">
                          Geldi ✅
                        </span>
                      ) : activeDetailApt.status === "pending" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 text-xs font-black animate-pulse">
                          ⏳ Onay Bekliyor
                        </span>
                      ) : activeDetailApt.status === "cancelled" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 text-xs font-black">
                          İptal Edildi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-black">
                          ✅ Onaylandı
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Telefon Numarası - Boşluklu Format */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-xs font-bold text-stone-400">Telefon:</span>
                    <span className="font-mono text-sm font-black text-[#dfc39e] tracking-wider">
                      {formatPhoneDisplay(activeDetailApt.customerPhone)}
                    </span>
                  </div>

                  {activeDetailApt.canComeEarly && (
                    <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-amber-400/15 border border-amber-400/30 px-2.5 py-1 text-xs font-black text-amber-300">
                      <Zap className="h-3.5 w-3.5 fill-amber-300" />
                      <span>Erken Saat Boşalırsa Gelebilir</span>
                    </div>
                  )}

                  {(activeDetailApt.requiresDeposit || activeDetailApt.isBlacklisted || isPhoneBlacklisted(activeDetailApt.customerPhone)) && (
                    <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 text-xs font-black text-rose-300">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                      <span>🚨 Kapora Bekleyen Müşteri</span>
                    </div>
                  )}
                </div>

                {/* İLETİŞİM BUTONLARI (Normalden Arama & WhatsApp'tan Yazma) */}
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <a
                    href={`tel:${activeDetailApt.customerPhone}`}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-3 text-xs sm:text-sm font-black text-emerald-300 shadow-md shadow-emerald-500/10 transition active:scale-95"
                  >
                    <PhoneCall className="h-4 w-4 shrink-0 stroke-[2.5]" />
                    <span>📞 Müşteriyi Ara</span>
                  </a>

                  <a
                    href={detailAptWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] px-3 py-3 text-xs sm:text-sm font-black text-[#041a0b] shadow-md shadow-[#25D366]/20 transition active:scale-95"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 fill-current" />
                    <span>💬 WhatsApp</span>
                  </a>
                </div>

                {/* Randevu Ayrıntıları */}
                <div className="mt-4 rounded-2xl border border-white/10 bg-[#101012] p-3.5 space-y-2.5">
                  {/* Koltuk & Personel Bilgisi */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-400 flex items-center gap-1.5">
                      <Armchair className="h-3.5 w-3.5 text-[#dfc39e]" />
                      <span>Koltuk / Personel:</span>
                    </span>
                    <div className="text-right">
                      <span className="font-black text-[#fdf8f5] block">
                        {activeDetailApt.chairLabel || activeDetailApt.barberName}
                      </span>
                      {activeDetailApt.chairLabel && activeDetailApt.chairLabel !== activeDetailApt.barberName && (
                        <span className="text-[10px] text-stone-400">
                          {activeDetailApt.barberName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hizmetler Listesi */}
                  <div className="border-t border-white/5 pt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-400">
                      <span className="flex items-center gap-1">
                        <Scissors className="h-3 w-3 text-[#dfc39e]" />
                        <span>Seçilen Hizmetler:</span>
                      </span>
                      <span>{activeDetailApt.services.length} Hizmet</span>
                    </div>

                    {activeDetailApt.services.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs pl-2">
                        <span className="text-stone-300 font-medium">
                          • {s.name} ({s.duration} dk)
                        </span>
                        <span className="font-mono font-bold text-[#dfc39e]">
                          {s.price} TL
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Toplam Tutar & Süre */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                    <span className="text-xs font-bold text-stone-400">
                      Toplam Süre: <strong className="text-stone-200">{activeDetailApt.totalDuration || 30} dk</strong>
                    </span>
                    <span className="text-base font-black text-[#dfc39e]">
                      {activeDetailApt.totalPrice} TL
                    </span>
                  </div>
                </div>

                {/* Alt Hızlı İşlem Butonları */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {activeDetailApt.status === "pending" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => {
                          confirmAppointment(activeDetailApt.id);
                          triggerToast(
                            `${activeDetailApt.customerName} — Kapora Alındı & Onaylandı ✅`,
                            "Kapora ödemesi doğrulandı ve randevu kesinleşti.",
                            "success"
                          );
                          setSelectedDetailApt(null);
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3 px-4 text-xs sm:text-sm font-black text-[#06150f] shadow-lg shadow-emerald-500/25 transition active:scale-[0.98] cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                        <span>✅ Kaporayı Aldım, Onayla</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`${activeDetailApt.customerName} randevusunu reddetmek / iptal etmek istediğinize emin misiniz?`)) {
                            handleCancelByAdmin(activeDetailApt);
                            setSelectedDetailApt(null);
                          }
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/60 bg-rose-600/20 hover:bg-rose-600/30 py-3 px-4 text-xs sm:text-sm font-black text-rose-200 transition active:scale-[0.98] cursor-pointer"
                      >
                        <Ban className="h-4 w-4" />
                        <span>❌ Reddet / İptal Et</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {activeDetailApt.status !== "completed" && activeDetailApt.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => {
                            handleComplete(activeDetailApt);
                            triggerToast(
                              "Randevu Tamamlandı ✅",
                              `${activeDetailApt.customerName} geldi ve işlem tamamlandı.`,
                              "success"
                            );
                            setSelectedDetailApt(null);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2.5 text-xs font-black text-emerald-300 transition active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Geldi</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const aptToMove = activeDetailApt;
                          setSelectedDetailApt(null);
                          setMobileRescheduleApt(aptToMove);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2.5 text-xs font-black text-amber-300 transition active:scale-95 cursor-pointer"
                      >
                        <span>⇄ Saati Taşı</span>
                      </button>

                      {activeDetailApt.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`${activeDetailApt.customerName} randevusunu iptal etmek istediğinize emin misiniz? Saat tekrar boşa çıkarılacaktır.`)) {
                              handleCancelByAdmin(activeDetailApt);
                              setSelectedDetailApt(null);
                            }
                          }}
                          className="flex items-center justify-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2.5 text-xs font-bold text-rose-300 transition active:scale-95 cursor-pointer"
                          title="Randevuyu İptal Et"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>İptal</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminPinGate>
  );
}
