import { buildWhatsAppUrl, formatPhoneForWhatsApp, DEFAULT_SHOP_WHATSAPP_PHONE } from "@/lib/whatsapp";
import { getShopBookingUrl } from "@/lib/siteConfig";

export interface NewBookingNotificationPayload {
  appointmentId: string;
  appointmentCode: string;
  shopSlug: string;
  shopName: string;
  shopPhone: string;
  customerName: string;
  customerPhone: string;
  barberName: string;
  dateLabel: string;
  time: string;
  servicesSummary: string;
  totalPrice: number;
  createdAtIso: string;
}

const BROADCAST_CHANNEL_NAME = "vip_barber_live_booking_channel_v1";
export const LAST_BOOKING_STORAGE_KEY = "vip_barber_last_booking_event_v1";

/**
 * AudioContext kullanarak harici ses dosyasına ihtiyaç duymadan
 * net, şık ve dikkat çekici bir resepsiyon / berber zil sesi (3 tonlu armonik çan) çalar.
 */
export function playNewBookingChime(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const notes = [
      { freq: 587.33, start: 0, duration: 0.22 }, // D5
      { freq: 880.0, start: 0.16, duration: 0.26 }, // A5
      { freq: 1174.66, start: 0.34, duration: 0.55 }, // D6
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(
        0.32,
        ctx.currentTime + start + 0.025
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + start + duration
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.02);
    });
  } catch {
    // Tarayıcı otomatik ses kısıtlaması varsa sessizce geç
  }
}

/**
 * Tarayıcı Web Notification API iznini kontrol eder / ister.
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Telefon veya bilgisayarın bildirim çubuğuna (Web Notification API / Service Worker)
 * otomatik "🔔 YENİ RANDEVU GELDİ" bildirimi düşürür.
 */
export async function sendBrowserNotification(
  payload: NewBookingNotificationPayload
): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission !== "granted") {
    return;
  }

  const title = `🔔 YENİ RANDEVU GELDİ: ${payload.customerName} - ${payload.time}`;
  const body = `${payload.dateLabel} • Saat ${payload.time} • ${payload.servicesSummary} (${payload.totalPrice} TL) — Tel: ${payload.customerPhone}`;
  const targetUrl = `/admin?shop=${payload.shopSlug}`;

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && "showNotification" in registration) {
        await registration.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: `booking-${payload.appointmentId}`,
          data: { url: targetUrl },
        });
        return;
      }
    }

    const notification = new Notification(title, {
      body,
      icon: "/icon-192.png",
      tag: `booking-${payload.appointmentId}`,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // ignore notification errors on restricted environments
  }
}

/**
 * Müşteri "Randevuyu Tamamla" butonuna bastığı an arka planda:
 * 1) Sekmeler arası BroadcastChannel + localStorage event tetikler
 * 2) /api/notify-booking arka plan webhook endpoint'ine otomatik bildirim isteği gönderir
 */
export async function triggerAutomaticBookingNotification(
  payload: NewBookingNotificationPayload
): Promise<{
  barberWhatsAppUrl: string;
  customerApprovalWhatsAppUrl: string;
}> {
  const bookingUrl = getShopBookingUrl(payload.shopSlug);
  const customerToBarberText = `Merhaba, ben ${payload.customerName}. ${payload.dateLabel} saat ${payload.time} için ${payload.servicesSummary} randevusu oluşturdum. Randevu Takip: ${bookingUrl}`;
  const barberToCustomerApprovalText = `Merhaba ${payload.customerName}, ${payload.dateLabel} saat ${payload.time} için ${payload.shopName} randevunuz onaylanmıştır. Randevu Takip ve İptal: ${bookingUrl} — Görüşmek üzere!`;

  const barberWhatsAppUrl = buildWhatsAppUrl(
    payload.shopPhone,
    customerToBarberText,
    DEFAULT_SHOP_WHATSAPP_PHONE
  );
  const customerApprovalWhatsAppUrl = buildWhatsAppUrl(
    payload.customerPhone,
    barberToCustomerApprovalText,
    DEFAULT_SHOP_WHATSAPP_PHONE
  );

  if (typeof window !== "undefined") {
    // 1. Anında yerel sekme / pencere yayını (BroadcastChannel + localStorage)
    try {
      localStorage.setItem(
        LAST_BOOKING_STORAGE_KEY,
        JSON.stringify({
          ...payload,
          barberWhatsAppUrl,
          customerApprovalWhatsAppUrl,
        })
      );
    } catch {
      // ignore storage errors
    }

    try {
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.postMessage({
          type: "NEW_BOOKING_CREATED",
          payload,
        });
        channel.close();
      }
    } catch {
      // ignore BroadcastChannel errors
    }

    // 2. Arka plan Webhook / API çağrısı (kullanıcı ekstra tuşa basmadan otomatik çalışır)
    fetch("/api/notify-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        formattedShopPhone: formatPhoneForWhatsApp(
          payload.shopPhone,
          DEFAULT_SHOP_WHATSAPP_PHONE
        ),
        formattedCustomerPhone: formatPhoneForWhatsApp(
          payload.customerPhone,
          DEFAULT_SHOP_WHATSAPP_PHONE
        ),
        barberWhatsAppUrl,
        customerApprovalWhatsAppUrl,
      }),
    }).catch(() => {
      // Arka plan isteği çevrimdışı modda hata verirse kullanıcı akışını kesme
    });
  }

  return {
    barberWhatsAppUrl,
    customerApprovalWhatsAppUrl,
  };
}

/**
 * /admin sayfasında gerçek zamanlı yeni randevu bildirimlerini dinler
 */
export function subscribeToLiveBookingEvents(
  onNewBooking: (payload: NewBookingNotificationPayload) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let channel: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === "NEW_BOOKING_CREATED" && event.data?.payload) {
          onNewBooking(event.data.payload as NewBookingNotificationPayload);
        }
      };
    } catch {
      channel = null;
    }
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === LAST_BOOKING_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as NewBookingNotificationPayload;
        if (parsed && parsed.appointmentId) {
          onNewBooking(parsed);
        }
      } catch {
        // ignore parse errors
      }
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    if (channel) {
      try {
        channel.close();
      } catch {
        // ignore
      }
    }
  };
}
