import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  getTurkeyNow,
  toIsoDateString,
  toStrictIsoDate,
  TenantShop,
  Appointment,
} from "@/data/mockData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VATANSMS_WP_BASE_URL = (
  process.env.VATANSMS_WP_BASE_URL || "https://api.toplusmspaketleri.com"
)
  .trim()
  .replace(/\/+$/, "");

/**
 * VatanSMS / TopluSMSPaketleri WhatsApp mesaj gönderme endpoint adayları.
 * Eğer .env içinde tam adres olarak VATANSMS_WP_API_URL verilmişse doğrudan o kullanılır.
 * Aksi halde https://api.toplusmspaketleri.com Base URL üzerindeki WhatsApp gönderim uç noktası kullanılır.
 */
function getVatanSmsWhatsAppEndpoints(): string[] {
  const explicitUrl = (process.env.VATANSMS_WP_API_URL || "").trim();
  if (explicitUrl) {
    return [explicitUrl];
  }
  return [
    `${VATANSMS_WP_BASE_URL}/api/v1/whatsapp/send`,
    `${VATANSMS_WP_BASE_URL}/api/v1/messages/send`,
    `${VATANSMS_WP_BASE_URL}/api/whatsapp/v1/messages/send`,
    `${VATANSMS_WP_BASE_URL}/api/v1/wabusiness/message/send`,
  ];
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== "string") return -1;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return -1;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  return h * 60 + m;
}

function normalizePhoneForWhatsAppApi(rawPhone: string): string {
  const digits = (rawPhone || "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) {
    return `90${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("05")) {
    return `9${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("905")) {
    return digits;
  }
  return digits;
}

function getAppointmentIso(apt: Appointment): string {
  if (
    apt.appointment_date &&
    /^\d{4}-\d{2}-\d{2}$/.test(apt.appointment_date)
  ) {
    return apt.appointment_date;
  }
  if (apt.date && /^\d{4}-\d{2}-\d{2}$/.test(apt.date)) {
    return apt.date;
  }
  return toStrictIsoDate(apt.dayId);
}

/**
 * Bir dükkanın WhatsApp otomatik hatırlatma için yetkili/aktif olup olmadığını kontrol eder.
 * GÜVENLİK KURALI:
 * - Varsayılan olarak tüm mevcut dükkanlarda whatsapp_enabled = false kabul edilir.
 * - Sadece whatsapp_enabled === true olan VEYA .env içindeki ACTIVE_WP_SHOP_ID ile eşleşen dükkanlar çalışır.
 * - Diğer tüm mevcut dükkanlar tamamen pas geçilir.
 */
function isShopAuthorizedForWhatsApp(
  shop: TenantShop,
  activeWpShopIds: string[]
): boolean {
  if (!shop) return false;
  if (
    shop.subscriptionStatus === "suspended" ||
    shop.subscriptionStatus === "expired"
  ) {
    return false;
  }

  // 1) Veritabanında açıkça whatsapp_enabled === true olarak işaretlenmiş mi? (Varsayılan: false)
  const explicitFlag = Boolean(
    shop.whatsapp_enabled ??
      shop.whatsappEnabled ??
      shop.shopSettings?.whatsapp_enabled ??
      shop.shopSettings?.whatsappEnabled ??
      false
  );

  // 2) .env içindeki ACTIVE_WP_SHOP_ID ile eşleşiyor mu? (id, slug veya name)
  const shopIdentifiers = [shop.id, shop.slug, shop.name]
    .filter((val): val is string => Boolean(val && typeof val === "string"))
    .map((val) => val.trim().toLowerCase());

  const matchesEnvShopId =
    activeWpShopIds.length > 0 &&
    activeWpShopIds.some((envId) => shopIdentifiers.includes(envId));

  return explicitFlag || matchesEnvShopId;
}

function isApiBodySignalingError(parsed: unknown): {
  isError: boolean;
  reason?: string;
} {
  if (!parsed || typeof parsed !== "object") {
    return { isError: false };
  }
  const obj = parsed as Record<string, unknown>;

  if (obj.success === false || obj.ok === false || obj.status === false) {
    return {
      isError: true,
      reason: String(
        obj.message || obj.error || obj.description || "API yanıtı başarısız (false) döndü."
      ),
    };
  }

  if (
    typeof obj.status === "string" &&
    ["error", "failed", "fail", "disconnected"].includes(
      obj.status.trim().toLowerCase()
    )
  ) {
    return {
      isError: true,
      reason: String(
        obj.message || obj.error || `API status="${obj.status}" döndü.`
      ),
    };
  }

  if (typeof obj.code === "number" && obj.code >= 400) {
    return {
      isError: true,
      reason: String(
        obj.message || obj.error || `API hata kodu (${obj.code}) döndü.`
      ),
    };
  }

  if (typeof obj.error === "string" && obj.error.trim().length > 0) {
    return {
      isError: true,
      reason: obj.error.trim(),
    };
  }

  return { isError: false };
}

async function sendWhatsAppViaVatanSms(params: {
  phone: string;
  message: string;
  apiKey: string;
}): Promise<{
  ok: boolean;
  endpointUsed?: string;
  status?: number;
  responseText?: string;
  error?: string;
}> {
  const { phone, message, apiKey } = params;
  const endpoints = getVatanSmsWhatsAppEndpoints();
  const deviceIdRaw = (process.env.VATANSMS_WP_DEVICE_ID || "").trim();
  const numericDeviceId =
    deviceIdRaw && /^\d+$/.test(deviceIdRaw) ? Number(deviceIdRaw) : undefined;

  const payload: Record<string, unknown> = {
    phone,
    number: phone,
    to: phone,
    receiver: phone,
    phones: [phone],
    message,
    text: message,
    message_type: "normal",
    payload: {
      text_message: {
        message,
      },
    },
    ...(deviceIdRaw
      ? {
          device_id: numericDeviceId ?? deviceIdRaw,
          business_device_id: numericDeviceId ?? deviceIdRaw,
        }
      : {}),
  };

  let lastResult: {
    ok: boolean;
    endpointUsed?: string;
    status?: number;
    responseText?: string;
    error?: string;
  } = {
    ok: false,
    error: "Hiçbir VatanSMS WhatsApp endpoint adayına ulaşılamadı.",
  };

  for (let i = 0; i < endpoints.length; i++) {
    const endpoint = endpoints[i];
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text().catch(() => "");
      let parsedBody: unknown = null;
      if (responseText) {
        try {
          parsedBody = JSON.parse(responseText);
        } catch {
          parsedBody = null;
        }
      }

      // Eğer varsayılan rotalardan biri 404 döndüyse ve sırada başka aday varsa bir sonrakini dene
      if (response.status === 404 && i < endpoints.length - 1) {
        lastResult = {
          ok: false,
          endpointUsed: endpoint,
          status: response.status,
          responseText,
          error: `Endpoint 404 döndü (${endpoint})`,
        };
        continue;
      }

      const bodyErr = isApiBodySignalingError(parsedBody);
      if (!response.ok || bodyErr.isError) {
        return {
          ok: false,
          endpointUsed: endpoint,
          status: response.status,
          responseText,
          error:
            bodyErr.reason ||
            `HTTP ${response.status}: ${responseText || response.statusText || "Bilinmeyen API hatası"}`,
        };
      }

      return {
        ok: true,
        endpointUsed: endpoint,
        status: response.status,
        responseText,
      };
    } catch (err) {
      lastResult = {
        ok: false,
        endpointUsed: endpoint,
        error:
          (err as Error)?.message ||
          "VatanSMS WhatsApp API ağ (network) hatası.",
      };
    }
  }

  return lastResult;
}

async function runWhatsAppReminderCron() {
  const wpApiKey = (process.env.VATANSMS_WP_API_KEY || "").trim();
  const rawActiveWpShopId = (process.env.ACTIVE_WP_SHOP_ID || "").trim();
  const activeWpShopIds = rawActiveWpShopId
    ? rawActiveWpShopId
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const nowTr = getTurkeyNow();
  const todayIso = toIsoDateString(nowTr);
  const currentMinutes = nowTr.getHours() * 60 + nowTr.getMinutes();
  const nowTimeLabel = `${String(nowTr.getHours()).padStart(2, "0")}:${String(
    nowTr.getMinutes()
  ).padStart(2, "0")}`;

  // Eksik ortam değişkenlerini konsola detaylı logla ama 500 fırlatma
  if (!wpApiKey) {
    console.warn(
      "[VatanSMS WP Cron Uyarı]: VATANSMS_WP_API_KEY ortam değişkeni tanımlı değil! Mesaj gönderimi yapılamayacak."
    );
  }
  if (activeWpShopIds.length === 0) {
    console.warn(
      "[VatanSMS WP Cron Uyarı]: ACTIVE_WP_SHOP_ID ortam değişkeni tanımlı değil! Sadece veritabanında whatsapp_enabled === true olan dükkanlar kontrol edilecek."
    );
  }

  if (!isSupabaseConfigured || !supabase) {
    console.error(
      "[VatanSMS WP Cron Hata]: Supabase bağlantı değişkenleri (NEXT_PUBLIC_SUPABASE_URL / KEY) tanımlı değil."
    );
    return {
      ok: false,
      status: "skipped",
      reason: "Supabase bağlantı değişkenleri tanımlı değil.",
      checkedAtTurkeyTime: `${todayIso} ${nowTimeLabel}`,
      sentCount: 0,
      sentAppointments: [],
    };
  }

  const { data: row, error: fetchError } = await supabase
    .from("app_state")
    .select("key, data")
    .eq("key", "global_state")
    .maybeSingle();

  if (fetchError) {
    console.error("[VatanSMS WP Cron Supabase Fetch Error]:", fetchError);
    return {
      ok: false,
      status: "error",
      reason: `Supabase veri çekme hatası: ${fetchError.message}`,
      checkedAtTurkeyTime: `${todayIso} ${nowTimeLabel}`,
      sentCount: 0,
      sentAppointments: [],
    };
  }

  const globalData = (row?.data || {}) as {
    shops?: TenantShop[];
    globalBlacklist?: unknown[];
    masterPin?: string;
    updatedByClientId?: string;
  };

  const shops: TenantShop[] = Array.isArray(globalData.shops)
    ? globalData.shops
    : [];

  if (shops.length === 0) {
    return {
      ok: true,
      status: "no_shops",
      reason: "Kayıtlı dükkan bulunamadı.",
      checkedAtTurkeyTime: `${todayIso} ${nowTimeLabel}`,
      sentCount: 0,
      sentAppointments: [],
    };
  }

  // SADECE WhatsApp hatırlatması açık olan veya ACTIVE_WP_SHOP_ID ile eşleşen dükkanları filtrele
  const authorizedShops = shops.filter((shop) =>
    isShopAuthorizedForWhatsApp(shop, activeWpShopIds)
  );

  if (authorizedShops.length === 0) {
    console.info(
      `[VatanSMS WP Cron Bilgi]: Aktif WhatsApp hatırlatması açık dükkan bulunamadı (ACTIVE_WP_SHOP_ID="${rawActiveWpShopId || "BOŞ"}", toplam dükkan=${shops.length}). Diğer tüm dükkanlar güvenlik kuralı gereği pas geçildi.`
    );
    return {
      ok: true,
      status: "no_authorized_shop",
      reason:
        "WhatsApp hatırlatması aktif olan (whatsapp_enabled === true veya ACTIVE_WP_SHOP_ID ile eşleşen) dükkan bulunamadı. Mevcut dükkanlar korundu ve pas geçildi.",
      checkedAtTurkeyTime: `${todayIso} ${nowTimeLabel}`,
      activeWpShopIdConfigured: Boolean(rawActiveWpShopId),
      apiKeyConfigured: Boolean(wpApiKey),
      totalShopsChecked: shops.length,
      authorizedShopCount: 0,
      sentCount: 0,
      sentAppointments: [],
    };
  }

  if (!wpApiKey) {
    return {
      ok: false,
      status: "missing_api_key",
      reason:
        "VATANSMS_WP_API_KEY tanımlı olmadığı için yetkili dükkanın yaklaşan randevularına WhatsApp mesajı gönderilemedi.",
      checkedAtTurkeyTime: `${todayIso} ${nowTimeLabel}`,
      authorizedShops: authorizedShops.map((s) => s.slug),
      sentCount: 0,
      sentAppointments: [],
    };
  }

  // Önümüzdeki 30-35 dakika penceresi (cron-job.org 1-5 dk gecikme toleransı için varsayılan 25-35 dk, env ile özelleştirilebilir)
  const minWindowMinutes = Number(process.env.WP_REMINDER_MIN_MINUTES) || 25;
  const maxWindowMinutes = Number(process.env.WP_REMINDER_MAX_MINUTES) || 35;

  const sentAppointmentMap = new Map<
    string,
    {
      shopSlug: string;
      sentAtIso: string;
      sentAtTimeLabel: string;
    }
  >();

  const sentAppointments: {
    shopSlug: string;
    shopName: string;
    appointmentId: string;
    customerName: string;
    phone: string;
    barberName: string;
    time: string;
    remainingMinutes: number;
    message: string;
    endpointUsed?: string;
  }[] = [];

  const failedAppointments: {
    shopSlug: string;
    appointmentId: string;
    customerName: string;
    phone: string;
    time: string;
    error: string;
  }[] = [];

  for (const shop of authorizedShops) {
    if (!Array.isArray(shop.appointments)) continue;

    for (const apt of shop.appointments) {
      // Geriye uyumlu kontrol: reminder_sent alanı eski kayıtlarda yoksa varsayılan false kabul edilir
      const isReminderAlreadySent = Boolean(apt?.reminder_sent ?? false);

      if (
        !apt ||
        apt.isBlockedSlot ||
        apt.bookingSource === "blocked" ||
        apt.status === "cancelled" ||
        apt.status === "completed" ||
        apt.status === "no_show" ||
        isReminderAlreadySent
      ) {
        continue;
      }

      const aptIso = getAppointmentIso(apt);
      if (aptIso !== todayIso) {
        continue;
      }

      const aptTimeStr = (apt.appointment_time || apt.time || "").trim();
      const aptStartMinutes = timeToMinutes(aptTimeStr);
      if (aptStartMinutes < 0) {
        continue;
      }

      const remainingMinutes = aptStartMinutes - currentMinutes;
      if (
        remainingMinutes < minWindowMinutes ||
        remainingMinutes > maxWindowMinutes
      ) {
        continue;
      }

      const phone = normalizePhoneForWhatsAppApi(apt.customerPhone);
      if (!phone || phone.length < 10) {
        console.warn(
          `[VatanSMS WP Cron Uyarı]: Geçersiz müşteri telefon numarası atlandı (Dükkan=${shop.slug}, Randevu=${apt.id}, Telefon="${apt.customerPhone}").`
        );
        continue;
      }

      const customerName = (apt.customerName || "Müşterimiz").trim();
      const rawBarberName = (apt.barberName || "").trim();
      const barberDisplayName =
        rawBarberName && !rawBarberName.toLowerCase().startsWith("fark etmez")
          ? rawBarberName
          : (shop.name || "Berberiniz").trim();

      // İstenen mesaj formatı: "Merhaba [Müşteri Adı], [Berber Adı] için saat [Saat] randevunuza 30 dakika kaldı."
      const wpMessage = `Merhaba ${customerName}, ${barberDisplayName} için saat ${aptTimeStr} randevunuza 30 dakika kaldı.`;

      const dispatchResult = await sendWhatsAppViaVatanSms({
        phone,
        message: wpMessage,
        apiKey: wpApiKey,
      });

      if (!dispatchResult.ok) {
        console.error(
          `[VatanSMS WP API Gönderim Hatası] Dükkan=${shop.slug} | Randevu=${apt.id} | Müşteri=${customerName} (${phone}) | Saat=${aptTimeStr} | Endpoint=${dispatchResult.endpointUsed || VATANSMS_WP_BASE_URL} | Hata=${dispatchResult.error || dispatchResult.responseText}`
        );
        failedAppointments.push({
          shopSlug: shop.slug,
          appointmentId: apt.id,
          customerName,
          phone,
          time: aptTimeStr,
          error:
            dispatchResult.error ||
            dispatchResult.responseText ||
            "WhatsApp API gönderim hatası (Cihaz bağlı olmayabilir veya API anahtarı geçersiz).",
        });
        continue;
      }

      const sentAtIso = new Date().toISOString();
      sentAppointmentMap.set(`${shop.slug}::${apt.id}`, {
        shopSlug: shop.slug,
        sentAtIso,
        sentAtTimeLabel: nowTimeLabel,
      });

      sentAppointments.push({
        shopSlug: shop.slug,
        shopName: shop.name,
        appointmentId: apt.id,
        customerName,
        phone,
        barberName: barberDisplayName,
        time: aptTimeStr,
        remainingMinutes,
        message: wpMessage,
        endpointUsed: dispatchResult.endpointUsed,
      });
    }
  }

  // Sadece başarıyla WhatsApp mesajı gönderilen randevuları reminder_sent = true olarak güncelle.
  // Eşzamanlı başka bir randevu/ayar değişikliğini ezmemek için güncel global_state üzerinden yalnızca ilgili randevuyu işaretle.
  if (sentAppointmentMap.size > 0) {
    const { data: latestRow, error: latestFetchErr } = await supabase
      .from("app_state")
      .select("key, data")
      .eq("key", "global_state")
      .maybeSingle();

    const baseGlobalData =
      !latestFetchErr && latestRow?.data
        ? (latestRow.data as typeof globalData)
        : globalData;

    const baseShops: TenantShop[] = Array.isArray(baseGlobalData.shops)
      ? baseGlobalData.shops
      : shops;

    const updatedShops = baseShops.map((shop) => {
      if (!Array.isArray(shop.appointments)) return shop;

      let shopModified = false;
      const nextAppointments = shop.appointments.map((apt) => {
        if (!apt || !apt.id) return apt;
        const hit = sentAppointmentMap.get(`${shop.slug}::${apt.id}`);
        if (!hit) return apt;

        shopModified = true;
        return {
          ...apt,
          reminder_sent: true,
          reminder_sent_at: hit.sentAtIso,
          reminderSent: true,
          reminderSentAt: apt.reminderSentAt || hit.sentAtTimeLabel,
        };
      });

      if (!shopModified) {
        // Diğer tüm dükkanlara ve ayarlarına KESİNLİKLE dokunma
        return shop;
      }

      return {
        ...shop,
        appointments: nextAppointments,
        updatedAt: Date.now(),
      };
    });

    const { error: upsertError } = await supabase.from("app_state").upsert(
      {
        key: "global_state",
        data: {
          ...baseGlobalData,
          shops: updatedShops,
          updatedByClientId: `wp-cron-${Date.now()}`,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (upsertError) {
      console.error(
        "[VatanSMS WP Cron Supabase Upsert Error]:",
        upsertError
      );
      return {
        ok: false,
        status: "db_update_error",
        reason: `Mesaj gönderildi ancak reminder_sent güncellenirken hata oluştu: ${upsertError.message}`,
        checkedAtTurkeyTime: `${todayIso} ${nowTimeLabel}`,
        authorizedShops: authorizedShops.map((s) => s.slug),
        sentCount: sentAppointments.length,
        sentAppointments,
        failedCount: failedAppointments.length,
        failedAppointments,
      };
    }
  }

  return {
    ok: true,
    status: "completed",
    checkedAtTurkeyTime: `${todayIso} ${nowTimeLabel}`,
    windowMinutes: `${minWindowMinutes}-${maxWindowMinutes}`,
    authorizedShops: authorizedShops.map((s) => s.slug),
    sentCount: sentAppointments.length,
    sentAppointments,
    failedCount: failedAppointments.length,
    failedAppointments,
  };
}

export async function GET() {
  try {
    const result = await runWhatsAppReminderCron();
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("[VatanSMS WP Cron GET Beklenmeyen Hata]:", error);
    return NextResponse.json(
      {
        ok: false,
        status: "exception",
        error:
          (error as Error)?.message ||
          "WhatsApp hatırlatma cron çalışırken beklenmeyen bir hata oluştu.",
        sentCount: 0,
        sentAppointments: [],
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}

export async function POST() {
  try {
    const result = await runWhatsAppReminderCron();
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("[VatanSMS WP Cron POST Beklenmeyen Hata]:", error);
    return NextResponse.json(
      {
        ok: false,
        status: "exception",
        error:
          (error as Error)?.message ||
          "WhatsApp hatırlatma cron çalışırken beklenmeyen bir hata oluştu.",
        sentCount: 0,
        sentAppointments: [],
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}
