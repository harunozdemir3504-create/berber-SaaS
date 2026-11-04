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
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import {
  useBarber,
  formatPhoneForWhatsApp,
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
    toggleClosedDay,
    updateCurrentShopDepositPolicy,
    updateCurrentShopPin,
    updateShopDetails,
    getSlotsForDay,
    dismissAdminAlert,
    clearAllAdminAlerts,
    removeAppointmentOrBlock,
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

  // SALON BİLGİLERİ DÜZENLEME STATE (Dükkan Adı, Telefon, İlçe, Slogan)
  const [shopNameInput, setShopNameInput] = useState<string>("");
  const [shopPhoneInput, setShopPhoneInput] = useState<string>("");
  const [shopDistrictInput, setShopDistrictInput] = useState<string>("");
  const [shopSubtitleInput, setShopSubtitleInput] = useState<string>("");
  const [shopPinInput, setShopPinInput] = useState<string>("");
  const [isCopiedShopUrl, setIsCopiedShopUrl] = useState<boolean>(false);

  useEffect(() => {
    if (currentShop) {
      setShopNameInput(currentShop.name || "");
      setShopPhoneInput(currentShop.phone || "");
      setShopDistrictInput(currentShop.district || "");
      setShopSubtitleInput(currentShop.subtitle || "");
      setShopPinInput(currentShop.adminPin || "");
    }
  }, [
    currentShop?.slug,
    currentShop?.name,
    currentShop?.phone,
    currentShop?.district,
    currentShop?.subtitle,
    currentShop?.adminPin,
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
    });

    if (trimmedPin && trimmedPin !== currentShop.adminPin) {
      updateCurrentShopPin(trimmedPin);
    }

    setToastMessage({
      title: "Salon Bilgileri Güncellendi",
      subtitle: `${trimmedName} salonunun telefon ve profil bilgileri başarıyla kaydedildi.`,
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

        {/* SADE ÜST BAŞLIK */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#141416] px-4 py-3 shadow-md">
          <div>
            <h1 className="text-base font-black text-[#fdf8f5] sm:text-lg">
              {currentShop.name}
            </h1>
            <p className="text-xs font-semibold text-[#dfc39e]">
              Berber Yönetim Ekranı
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* ☀️ / 🌙 Tema Toggle Butonu */}
            <button
              type="button"
              onClick={toggleTheme}
              title={
                theme === "light"
                  ? "Gece Moduna Geç (Koyu Tema)"
                  : "Gündüz Moduna Geç (Aydınlık Tema)"
              }
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold transition active:scale-95 ${
                theme === "light"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20"
                  : "border-amber-400/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
              }`}
            >
              {theme === "light" ? (
                <>
                  <Moon className="h-3.5 w-3.5 text-indigo-600 fill-indigo-600/20" />
                  <span>🌙 Gece Modu</span>
                </>
              ) : (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400 fill-amber-400/20" />
                  <span>☀️ Gündüz Modu</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleEnableNotificationsAndSound}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold transition ${
                notifPermission === "granted"
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : "border-amber-400/50 bg-amber-500/20 text-amber-200"
              }`}
              title="Sesli zil ve telefon bildirimini test et / aktif et"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>
                {notifPermission === "granted"
                  ? "Sesli Bildirim Açık"
                  : "🔔 Sesi & Bildirimi Aç"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopyBookingLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfc39e]/40 bg-[#1c1613] px-3 py-2 text-xs font-extrabold text-[#f3e8dc]"
            >
              <Share2 className="h-3.5 w-3.5 text-[#dfc39e]" />
              <span>{copiedShareLink ? "Kopyalandı ✓" : "Link Kopyala"}</span>
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* SEKME 1: 📅 RANDEVULAR (VARSAYILAN ANA EKRAN — GÜN GÜN AYRIMLI)      */}
        {/* ===================================================================== */}
        {bottomTab === "appointments" && (
          <div className="space-y-4">
            {/* YATAY GÜN SEÇİCİ ŞERİT: [Bugün] [Yarın] [Diğer Günler / Takvim] [Tümü] */}
            <div className="rounded-3xl border border-[#dfc39e]/45 bg-[#141416] p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#f3e8dc]">
                  <CalendarIcon className="h-3.5 w-3.5 text-[#dfc39e]" />
                  <span>
                    {activeTargetDayMeta
                      ? `${activeTargetDayMeta.chipLabel} — ${activeTargetDayMeta.fullDate}`
                      : "Tüm Günlerin Randevuları"}
                  </span>
                </span>
                <span className="rounded-lg bg-white/5 px-2 py-0.5 text-[11px] font-bold text-stone-400">
                  {shopSettings.openTime} → {shopSettings.closeTime} Sıralı
                </span>
              </div>

              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {/* 1. [Bugün] (Varsayılan Seçili) */}
                <button
                  type="button"
                  onClick={() => setAdminDayMode("today")}
                  className={`flex min-w-[115px] flex-1 shrink-0 items-center justify-between gap-2 rounded-2xl border-2 px-3.5 py-3 text-left transition ${
                    adminDayMode === "today"
                      ? "border-[#f3e8dc] bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b] shadow-lg shadow-[#dfc39e]/25"
                      : "border-white/10 bg-[#101012] text-[#fdf8f5] hover:border-white/25"
                  }`}
                >
                  <div>
                    <span className="block text-sm font-black leading-tight">
                      Bugün
                    </span>
                    <span
                      className={`text-[11px] font-extrabold ${
                        adminDayMode === "today"
                          ? "text-[#1a110b]/85"
                          : "text-[#dfc39e]"
                      }`}
                    >
                      {todayDay.dateStr}
                    </span>
                  </div>
                  <span
                    className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-black ${
                      adminDayMode === "today"
                        ? "bg-[#1a110b] text-[#f3e8dc]"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {todayPendingCount}
                  </span>
                </button>

                {/* 2. [Yarın] */}
                <button
                  type="button"
                  onClick={() => setAdminDayMode("tomorrow")}
                  className={`flex min-w-[115px] flex-1 shrink-0 items-center justify-between gap-2 rounded-2xl border-2 px-3.5 py-3 text-left transition ${
                    adminDayMode === "tomorrow"
                      ? "border-[#f3e8dc] bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b] shadow-lg shadow-[#dfc39e]/25"
                      : "border-white/10 bg-[#101012] text-[#fdf8f5] hover:border-white/25"
                  }`}
                >
                  <div>
                    <span className="block text-sm font-black leading-tight">
                      Yarın
                    </span>
                    <span
                      className={`text-[11px] font-extrabold ${
                        adminDayMode === "tomorrow"
                          ? "text-[#1a110b]/85"
                          : "text-[#dfc39e]"
                      }`}
                    >
                      {tomorrowDay.dateStr}
                    </span>
                  </div>
                  <span
                    className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-black ${
                      adminDayMode === "tomorrow"
                        ? "bg-[#1a110b] text-[#f3e8dc]"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {tomorrowPendingCount}
                  </span>
                </button>

                {/* 3. [Diğer Günler / Takvim] */}
                <button
                  type="button"
                  onClick={() => setAdminDayMode("calendar")}
                  className={`flex min-w-[155px] flex-1 shrink-0 items-center justify-between gap-2 rounded-2xl border-2 px-3.5 py-3 text-left transition ${
                    adminDayMode === "calendar"
                      ? "border-[#f3e8dc] bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b] shadow-lg shadow-[#dfc39e]/25"
                      : "border-white/10 bg-[#101012] text-[#fdf8f5] hover:border-white/25"
                  }`}
                >
                  <div>
                    <span className="block text-xs font-black leading-tight sm:text-sm">
                      Diğer Günler / Takvim
                    </span>
                    <span
                      className={`text-[11px] font-extrabold ${
                        adminDayMode === "calendar"
                          ? "text-[#1a110b]/85"
                          : "text-[#dfc39e]"
                      }`}
                    >
                      {adminDayMode === "calendar" && activeTargetDayMeta
                        ? activeTargetDayMeta.chipLabel
                        : "Gün Seç"}
                    </span>
                  </div>
                  <span
                    className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-black ${
                      adminDayMode === "calendar"
                        ? "bg-[#1a110b] text-[#f3e8dc]"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {otherDaysPendingCount}
                  </span>
                </button>

                {/* 4. [Tümü] */}
                <button
                  type="button"
                  onClick={() => setAdminDayMode("all")}
                  className={`flex min-w-[105px] shrink-0 items-center justify-between gap-2 rounded-2xl border-2 px-3.5 py-3 text-left transition ${
                    adminDayMode === "all"
                      ? "border-[#f3e8dc] bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b] shadow-lg shadow-[#dfc39e]/25"
                      : "border-white/10 bg-[#101012] text-[#fdf8f5] hover:border-white/25"
                  }`}
                >
                  <div>
                    <span className="block text-sm font-black leading-tight">
                      Tümü
                    </span>
                    <span
                      className={`text-[11px] font-extrabold ${
                        adminDayMode === "all"
                          ? "text-[#1a110b]/85"
                          : "text-stone-400"
                      }`}
                    >
                      Tüm Günler
                    </span>
                  </div>
                  <span
                    className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-black ${
                      adminDayMode === "all"
                        ? "bg-[#1a110b] text-[#f3e8dc]"
                        : "bg-white/10 text-[#f3e8dc]"
                    }`}
                  >
                    {allPendingCount}
                  </span>
                </button>
              </div>

              {/* Diğer Günler / Takvim Açılır Alt Şeridi */}
              {adminDayMode === "calendar" && (
                <div className="mt-3 space-y-2.5 border-t border-white/10 pt-3">
                  <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                    {liveDays.slice(2).map((d) => {
                      const isChosen = selectedCalendarDayId === d.id;
                      const count = getPendingCountForDay(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedCalendarDayId(d.id)}
                          className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${
                            isChosen
                              ? "border-emerald-400 bg-emerald-500 text-[#06150f]"
                              : "border-white/15 bg-[#101012] text-[#fdf8f5] hover:border-white/30"
                          }`}
                        >
                          <span>{d.chipLabel}</span>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                              isChosen
                                ? "bg-[#06150f]/20 text-[#06150f]"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#101012] px-3 py-2">
                    <span className="text-xs font-bold text-[#f3e8dc]">
                      📅 Takvimden İleri Bir Tarih Seçin:
                    </span>
                    <input
                      type="date"
                      min={todayDay.isoDate}
                      value={selectedCalendarDayId}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedCalendarDayId(e.target.value);
                        }
                      }}
                      className="rounded-lg border border-[#dfc39e]/50 bg-[#181411] px-3 py-1.5 text-xs font-black text-[#fdf8f5] outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bekleyenler, Erken Gelebilir ve Geçmiş Filtresi */}
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-[#141416] p-1.5">
              <button
                type="button"
                onClick={() => setAppointmentFilter("active")}
                className={`flex items-center justify-center gap-1 rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm font-black transition ${
                  appointmentFilter === "active"
                    ? "bg-gradient-to-r from-[#d4af7a] via-[#e5cbb0] to-[#c69d65] text-[#1a110b] shadow-md"
                    : "text-stone-400 hover:text-[#fdf8f5]"
                }`}
              >
                <span>
                  ⏳ Bekleyen ({dayFilteredActiveAppointments.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAppointmentFilter("early_backup")}
                className={`flex items-center justify-center gap-1 rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm font-black transition ${
                  appointmentFilter === "early_backup"
                    ? "bg-amber-500/25 text-amber-200 border border-amber-500/50 shadow-md shadow-amber-500/10"
                    : "text-amber-400/90 hover:text-amber-300"
                }`}
              >
                <Zap className="h-3.5 w-3.5 fill-amber-400" />
                <span>
                  ⚡ Yedek / Erken ({dayEarlyBackupAppointments.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAppointmentFilter("history")}
                className={`flex items-center justify-center gap-1 rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm font-black transition ${
                  appointmentFilter === "history"
                    ? "bg-emerald-500/25 text-emerald-200 border border-emerald-500/40"
                    : "text-stone-400 hover:text-[#fdf8f5]"
                }`}
              >
                <span>
                  ✅ Geçmiş ({dayFilteredHistoryAppointments.length})
                </span>
              </button>
            </div>

            {/* 👤 KOLTUK / PERSONEL HIZLI FİLTRE ŞERİDİ (Tümü | Harun Usta | Ali Usta ...) */}
            {realBarbers.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <span className="shrink-0 text-[11px] font-black uppercase tracking-wider text-stone-400 mr-1 flex items-center gap-1">
                  <User className="h-3 w-3 text-[#dfc39e]" /> Koltuk:
                </span>
                <button
                  type="button"
                  onClick={() => setAdminStaffFilter("all")}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-black transition ${
                    adminStaffFilter === "all"
                      ? "border border-[#dfc39e] bg-[#dfc39e] text-[#1a110b] shadow-sm"
                      : "border border-white/10 bg-[#141416] text-stone-300 hover:border-white/25 hover:text-white"
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
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-black transition flex items-center gap-1.5 ${
                        isSelected
                          ? "border border-[#dfc39e] bg-[#dfc39e] text-[#1a110b] shadow-sm"
                          : "border border-white/10 bg-[#141416] text-stone-300 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      <span>{b.name}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                          isSelected
                            ? "bg-[#1a110b]/20 text-[#1a110b]"
                            : "bg-white/10 text-stone-400"
                        }`}
                      >
                        {staffCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Randevu Kartları Listesi */}
            {displayedAppointments.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-[#141416] p-8 text-center">
                <CalendarIcon className="mx-auto h-10 w-10 text-[#dfc39e]" />
                <h3 className="mt-3 text-lg font-extrabold text-[#fdf8f5]">
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
                <p className="mt-1 text-sm text-stone-400">
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
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-amber-500/50 bg-[#171310] p-4"
                      >
                        <div>
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 py-1 text-sm font-black text-amber-300">
                            <Lock className="h-4 w-4" />
                            {apt.time} - {apt.endTime} ({cleanDateLabel})
                          </span>
                          <p className="mt-1.5 text-base font-extrabold text-[#fdf8f5]">
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
                  const isCancelled = apt.status === "cancelled";
                  const isNoShow = apt.status === "no_show";
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
                      className={`overflow-hidden rounded-xl border transition-all ${
                        isExpanded
                          ? "border-[#dfc39e] bg-[#161519] shadow-lg shadow-[#dfc39e]/15"
                          : isCompleted
                          ? "border-emerald-500/25 bg-[#121614] hover:border-emerald-500/40"
                          : isCancelled || isNoShow
                          ? "border-rose-500/25 bg-[#181212] hover:border-rose-500/40"
                          : "border-white/10 bg-[#141416] hover:border-[#dfc39e]/45"
                      }`}
                    >
                      {/* 1. KAPALI (VARSAYILAN) TEK SATIR: SAAT | MÜŞTERİ | HİZMET | DURUM */}
                      <div
                        onClick={() => toggleAptAccordion(apt.id)}
                        className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 select-none"
                      >
                        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                          {/* Saat Rozeti */}
                          <div className="shrink-0 rounded-lg border border-[#dfc39e]/40 bg-[#dfc39e]/15 px-2 py-1 text-center font-mono text-xs font-black text-[#fdf8f5] sm:text-sm">
                            {apt.time}
                          </div>

                          {/* İsim ve Hizmet */}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-xs font-black text-[#fdf8f5] sm:text-sm">
                                {apt.customerName}
                              </span>
                              {/* Koltuk / Personel Rozeti */}
                              {apt.barberName && !apt.isBlockedSlot && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-[#dfc39e]/40 bg-[#dfc39e]/15 px-1.5 py-0.5 text-[10px] font-black text-[#dfc39e]">
                                  <User className="h-2.5 w-2.5" />
                                  <span>{apt.barberName.replace(/\s*\(.*?\)/, "")}</span>
                                </span>
                              )}
                              {apt.status === "pending" && (
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
                          <span className="text-xs font-black text-[#dfc39e] sm:text-sm">
                            {apt.totalPrice} TL
                          </span>
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-stone-400 transition-transform ${
                              isExpanded ? "rotate-180 text-[#dfc39e]" : ""
                            }`}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>

                      {/* 2. AÇIK (TIKLANINCA AÇILAN) DETAY & AKSİYON ÇEKMECESİ */}
                      {isExpanded && (
                        <div className="border-t border-white/10 bg-[#111113] p-3 sm:p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-300">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Personel / Koltuk Seçimi & Değiştirme */}
                              <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#181411] px-2 py-1">
                                <span className="text-[11px] font-bold text-stone-400">👤 Personel:</span>
                                <select
                                  value={apt.barberId}
                                  onChange={(e) => {
                                    const selectedB = realBarbers.find((b) => b.id === e.target.value);
                                    if (selectedB) {
                                      updateAppointmentBarber(apt.id, selectedB.id, selectedB.name, selectedB.chairName);
                                    }
                                  }}
                                  className="bg-transparent font-black text-[#fdf8f5] outline-none text-xs cursor-pointer"
                                  title="Bu randevuyu tamamlayacak personeli seçin"
                                >
                                  {realBarbers.map((b) => (
                                    <option key={b.id} value={b.id} className="bg-[#181411] text-white">
                                      {b.name} ({b.chairName})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* ⚡ Erken Saate / Boş Saate Kaydırma (Eski Saati Anında Serbest Bırakır) */}
                              {(() => {
                                const daySlots = getSlotsForDay(apt.dayId, apt.barberId).filter(
                                  (s) => s.state === "available"
                                );
                                if (daySlots.length === 0) return null;
                                return (
                                  <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2 py-1">
                                    <span className="text-[11px] font-bold text-amber-300">⚡ Saati Taşı:</span>
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        const newTime = e.target.value;
                                        if (!newTime) return;
                                        const oldTime = apt.time;
                                        shiftAppointmentToEarlySlot(
                                          apt.id,
                                          newTime,
                                          resolveDayMetadata(apt.dayId).id,
                                          resolveDayMetadata(apt.dayId).chipLabel
                                        );
                                        triggerToast(
                                          `${apt.customerName} — Saat ${newTime}'e Taşındı! ⚡`,
                                          `Eski saat (${oldTime}) anında boşa çıkarıldı ve diğer müşterilere açıldı.`,
                                          "success"
                                        );
                                      }}
                                      className="bg-transparent font-black text-amber-200 outline-none text-xs cursor-pointer"
                                      title="Randevuyu boş bir saate kaydırın (Eski saat anında boşa çıkar)"
                                    >
                                      <option value="" disabled className="bg-[#181411] text-stone-400">
                                        Boş Saate Kaydır ({apt.time} ➔ ?)
                                      </option>
                                      {daySlots.map((s) => (
                                        <option key={s.time} value={s.time} className="bg-[#181411] text-emerald-300">
                                          🕒 {s.time} (Boş Saat)
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })()}

                              <span>•</span>
                              <span className="text-stone-400">
                                📅 {cleanDateLabel} - {apt.time}
                              </span>
                            </div>

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
                              <div className="inline-flex items-center gap-1.5">
                                <a
                                  href={`tel:${apt.customerPhone}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
                                  title="Müşteriyi Ara"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  <span>{apt.customerPhone}</span>
                                </a>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPhoneAptId(apt.id);
                                    setEditingPhoneValue(apt.customerPhone);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-400/20 hover:border-amber-400 transition cursor-pointer"
                                  title="Numarayı Düzenle"
                                >
                                  <Edit3 className="h-3 w-3" />
                                  <span>✏️ Düzenle</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* ⏳ WhatsApp Onay Kodu Bilgi Şeridi */}
                          {apt.status === "pending" && (
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-black text-amber-300">
                                  🔑 Onay Kodu:{" "}
                                  {apt.verificationCode ||
                                    `#${apt.appointmentCode
                                      .replace(/\D/g, "")
                                      .slice(-4)}`}
                                </span>
                                <span className="text-[11px] text-stone-300">
                                  • Müşteri WhatsApp üzerinden onay kodunu ilettiğinde aşağıdaki yeşil butona basarak onaylayın.
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Aksiyon Butonları Izgarası */}
                          {apt.status === "pending" ? (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <button
                                type="button"
                                onClick={() => {
                                  confirmAppointment(apt.id);
                                  triggerToast(
                                    `${apt.customerName} — Onaylandı ✅`,
                                    `WhatsApp onay kodu doğrulandı ve randevu kesinleşti.`,
                                    "success"
                                  );
                                }}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400 bg-emerald-500 py-2.5 px-3 text-xs font-black text-[#06150f] shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 active:scale-[0.98]"
                              >
                                <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                                <span>✅ Randevuyu Onayla</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleCancelAndBlacklist(apt);
                                  setExpandedAptId(null);
                                }}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/60 bg-rose-600/20 py-2.5 px-3 text-xs font-black text-rose-200 transition hover:bg-rose-600/30"
                              >
                                <Ban className="h-4 w-4" />
                                <span>🚫 İptal Et / Numarayı Engelle</span>
                              </button>

                              <a
                                href={`tel:${apt.customerPhone}`}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 py-2.5 px-3 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25"
                              >
                                <Phone className="h-3.5 w-3.5" />
                                <span>📞 Hemen Ara</span>
                              </a>

                              <a
                                href={buildWhatsAppUrl(
                                  apt.customerPhone,
                                  `Merhaba ${apt.customerName}, ${currentShop.name} randevunuz için onay kodunuzu (${apt.verificationCode || ""}) iletmenizi bekliyoruz.`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#dfc39e]/40 bg-[#dfc39e]/15 py-2.5 px-3 text-xs font-bold text-[#f3e8dc] transition hover:bg-[#dfc39e]/25"
                              >
                                <span>💬 Kod İste</span>
                              </a>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                              <a
                                href={`tel:${apt.customerPhone}`}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400/60 bg-emerald-500 px-3 py-2 text-xs font-black text-[#06150f] shadow-md shadow-emerald-500/25 transition hover:bg-emerald-400"
                              >
                                <Phone className="h-3.5 w-3.5 fill-[#06150f]" />
                                <span>📞 Hemen Ara</span>
                              </a>

                              <button
                                type="button"
                                disabled={isCompleted}
                                onClick={() => {
                                  handleComplete(apt);
                                  setExpandedAptId(null);
                                }}
                                className={`flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-black transition ${
                                  isCompleted
                                    ? "cursor-default bg-emerald-500/20 text-emerald-400 opacity-50"
                                    : "bg-emerald-500 text-[#06150f] hover:bg-emerald-400"
                                }`}
                              >
                                <span>Geldi ✅</span>
                              </button>

                              <button
                                type="button"
                                disabled={isCancelled}
                                onClick={() => {
                                  handleCancelByAdmin(apt);
                                  setExpandedAptId(null);
                                }}
                                className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-black transition ${
                                  isCancelled
                                    ? "cursor-default border-rose-500/20 bg-rose-500/10 text-rose-300 opacity-50"
                                    : "border-rose-500/50 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25"
                                }`}
                              >
                                <span>İptal Et ❌</span>
                              </button>

                              <button
                                type="button"
                                disabled={isNoShow}
                                onClick={() => {
                                  handleNoShow(apt);
                                  setExpandedAptId(null);
                                }}
                                className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-black transition ${
                                  isNoShow
                                    ? "cursor-default border-rose-500/20 bg-rose-500/10 text-rose-300 opacity-50"
                                    : "border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
                                }`}
                              >
                                <span>Gelmedi</span>
                              </button>

                              <a
                                href={reminderWhatsAppUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleSendReminder(apt, "reminder")}
                                className="flex items-center justify-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-950/40 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
                              >
                                <span>💬 Hatırlat</span>
                              </a>

                              <a
                                href={approvalWhatsAppUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleSendReminder(apt, "approval")}
                                className="flex items-center justify-center gap-1 rounded-xl border border-[#dfc39e]/40 bg-[#dfc39e]/15 py-2 text-xs font-bold text-[#f3e8dc] hover:bg-[#dfc39e]/25"
                              >
                                <span>✅ Onay</span>
                              </a>
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
          <div className="space-y-5">
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
                              <input
                                type="text"
                                value={editBarberName}
                                onChange={(e) =>
                                  setEditBarberName(e.target.value)
                                }
                                className="rounded-xl border border-white/15 bg-[#101012] px-3 py-2 text-sm font-bold text-[#fdf8f5]"
                              />
                              <input
                                type="text"
                                value={editBarberChair}
                                onChange={(e) =>
                                  setEditBarberChair(e.target.value)
                                }
                                className="rounded-xl border border-white/15 bg-[#101012] px-3 py-2 text-sm font-bold text-[#f3e8dc]"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingBarberId(null)}
                                className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-stone-300"
                              >
                                İptal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveBarber(barber)}
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
                                {barber.name}
                              </p>
                              <p className="text-xs text-[#dfc39e]">
                                {barber.chairName}
                              </p>
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

                <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-black text-[#fdf8f5]">
                      <Coffee className="h-4 w-4 text-[#dfc39e]" />
                      Öğle Molası ({shopSettings.breakStart} -{" "}
                      {shopSettings.breakEnd})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateShopSettings({
                          breakEnabled: !shopSettings.breakEnabled,
                        })
                      }
                      className={`rounded-xl px-3 py-1.5 text-xs font-black ${
                        shopSettings.breakEnabled
                          ? "bg-emerald-500 text-[#06150f]"
                          : "bg-white/10 text-stone-400"
                      }`}
                    >
                      {shopSettings.breakEnabled ? "Açık ✓" : "Kapalı"}
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
      </div>
    </AdminPinGate>
  );
}
