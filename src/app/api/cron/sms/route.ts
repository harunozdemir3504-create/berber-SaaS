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

const VATANSMS_WP_NTON_URL = (
  process.env.VATANSMS_WP_API_URL ||
  "https://api.toplusmspaketleri.com/bulk/wp/nton"
).trim();

function formatTurkeySendDate(trDate: Date): string {
  const yyyy = trDate.getFullYear();
  const mm = String(trDate.getMonth() + 1).padStart(2, "0");
  const dd = String(trDate.getDate()).padStart(2, "0");
  const hh = String(trDate.getHours()).padStart(2, "0");
  const min = String(trDate.getMinutes()).padStart(2, "0");
  const ss = String(trDate.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+03:00`;
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

/**
 * Müşteri telefon numarasını başında '+' olmadan '905XXXXXXXXX' formatına dönüştürür.
 */
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
  if (digits.length === 13 && digits.startsWith("0905")) {
    return digits.slice(1);
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
 * Bir dükkanın WhatsApp otomatik hatırlatma yetkisini ve kullanacağı VatanSMS Cihaz ID (reg_id) değerini belirler.
 *
 * KURAL:
 * a) Veritabanında whatsapp_enabled === true VE whatsapp_reg_id doluysa -> Dükkanın kendi whatsapp_reg_id değerini kullanır.
 * b) (Geriye dönük uyumluluk) Veritabanında henüz ayarlanmamışsa ama dükkanın slug/id değeri Vercel'deki ACTIVE_WP_SHOP_ID
 *    ile eşleşiyorsa -> Vercel'deki VATANSMS_WP_REG_ID değerini kullanır (salon-eren-ozkol kesintiye uğramaz).
 * c) Bu iki şarta uymayan (whatsapp_enabled false olan veya reg_id boş olan) diğer tüm dükkanlar KESİNLİKLE pas geçilir.
 */
function resolveShopWhatsAppAuth(
  shop: TenantShop,
  activeWpShopIds: string[],
  envWpRegId: string
): {
  authorized: boolean;
  regId: string;
  source: "database" | "env_fallback" | "none";
} {
  if (!shop) {
    return { authorized: false, regId: "", source: "none" };
  }
  if (
    shop.subscriptionStatus === "suspended" ||
    shop.subscriptionStatus === "expired"
  ) {
    return { authorized: false, regId: "", source: "none" };
  }

  const rawDbEnabled =
    shop.whatsapp_enabled ??
    shop.whatsappEnabled ??
    shop.shopSettings?.whatsapp_enabled ??
    shop.shopSettings?.whatsappEnabled;

  const dbRegId = String(
    shop.whatsapp_reg_id ??
      shop.whatsappRegId ??
      shop.shopSettings?.whatsapp_reg_id ??
      shop.shopSettings?.whatsappRegId ??
      ""
  ).trim();

  // a) Veritabanında whatsapp_enabled === true VE whatsapp_reg_id doluysa -> O dükkanın kendi whatsapp_reg_id değerini kullan
  if (rawDbEnabled === true && dbRegId.length > 0) {
    return {
      authorized: true,
      regId: dbRegId,
      source: "database",
    };
  }

  // Eğer veritabanında açıkça whatsapp_enabled === false yapılmışsa pas geç
  if (rawDbEnabled === false) {
    return { authorized: false, regId: "", source: "none" };
  }

  // b) (Geriye dönük uyumluluk) Veritabanında henüz ayarlanmamışsa ama dükkanın slug/id değeri ACTIVE_WP_SHOP_ID ile eşleşiyorsa
  const shopIdentifiers = [shop.id, shop.slug, shop.name]
    .filter((val): val is string => Boolean(val && typeof val === "string"))
    .map((val) => val.trim().toLowerCase());

  const matchesEnvShopId =
    activeWpShopIds.length > 0 &&
    activeWpShopIds.some((envId) => shopIdentifiers.includes(envId));

  if (matchesEnvShopId && envWpRegId.length > 0) {
    return {
      authorized: true,
      regId: envWpRegId,
      source: "env_fallback",
    };
  }

  return { authorized: false, regId: "", source: "none" };
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
        obj.message ||
          obj.error ||
          obj.description ||
          "API yanıtı başarısız (false) döndü."
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

/**
 * VatanSMS WhatsApp Resmi SEND-NtoN Gönderimi
 * POST https://api.toplusmspaketleri.com/bulk/wp/nton
 */
async function sendWhatsAppViaVatanSms(params: {
  target: string;
  message: string;
  apiKey: string;
  regId: string;
  sendDate: string;
}): Promise<{
  ok: boolean;
  endpointUsed: string;
  status?: number;
  responseText: string;
  error?: string;
}> {
  const { target, message, apiKey, regId, sendDate } = params;

  const payload = {
    send_date: sendDate,
    messages: [
      {
        reg_id: regId,
        target,
        message,
      },
    ],
  };

  try {
    const response = await fetch(VATANSMS_WP_NTON_URL, {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
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

    const bodyErr = isApiBodySignalingError(parsedBody);
    if (!response.ok || bodyErr.isError) {
      return {
        ok: false,
        endpointUsed: VATANSMS_WP_NTON_URL,
        status: response.status,
        responseText,
        error:
          bodyErr.reason ||
          `HTTP ${response.status}: ${responseText || response.statusText || "VatanSMS API hatası"}`,
      };
    }

    return {
      ok: true,
      endpointUsed: VATANSMS_WP_NTON_URL,
      status: response.status,
      responseText,
    };
  } catch (err) {
    const errMsg =
      (err as Error)?.message || "VatanSMS WhatsApp API ağ (network) hatası.";
    return {
      ok: false,
      endpointUsed: VATANSMS_WP_NTON_URL,
      responseText: errMsg,
      error: errMsg,
    };
  }
}

async function runWhatsAppReminderCron() {
  const wpApiKey = (process.env.VATANSMS_WP_API_KEY || "").trim();
  const envWpRegId = (process.env.VATANSMS_WP_REG_ID || "").trim();
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
  const sendDateTr = formatTurkeySendDate(nowTr);

  if (!wpApiKey) {
    console.warn(
      "[VatanSMS WP Cron Uyarı]: VATANSMS_WP_API_KEY ortam değişkeni tanımlı değil! Mesaj gönderimi yapılamayacak."
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
      sendDate: sendDateTr,
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
      sendDate: sendDateTr,
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
      sendDate: sendDateTr,
      sentCount: 0,
      sentAppointments: [],
    };
  }

  // SADECE:
  // a) Veritabanında whatsapp_enabled === true VE whatsapp_reg_id dolu olanları VEYA
  // b) Veritabanında henüz ayarlanmamış ama ACTIVE_WP_SHOP_ID ile eşleşip VATANSMS_WP_REG_ID'si olanları seç
  const authorizedShopEntries = shops
    .map((shop) => ({
      shop,
      auth: resolveShopWhatsAppAuth(shop, activeWpShopIds, envWpRegId),
    }))
    .filter((entry) => entry.auth.authorized && entry.auth.regId.length > 0);

  if (authorizedShopEntries.length === 0) {
    console.info(
      `[VatanSMS WP Cron Bilgi]: WhatsApp hatırlatması yetkili/aktif dükkan bulunamadı (ACTIVE_WP_SHOP_ID="${rawActiveWpShopId || "BOŞ"}", toplam dükkan=${shops.length}). Diğer tüm dükkanlar güvenlik kuralı gereği pas geçildi.`
    );
    return {
      ok: true,
      status: "no_authorized_shop",
      reason:
        "WhatsApp hatırlatması aktif ve reg_id tanımlı olan (veya ACTIVE_WP_SHOP_ID ile eşleşen) dükkan bulunamadı. Mevcut dükkanlar korundu ve pas geçildi.",
      checkedAtTurkeyTime: `${todayIso} ${nowTimeLabel}`,
      sendDate: sendDateTr,
      activeWpShopIdConfigured: Boolean(rawActiveWpShopId),
      apiKeyConfigured: Boolean(wpApiKey),
      envRegIdConfigured: Boolean(envWpRegId),
      totalShopsChecked: shops.length,
      authorizedShopCount: 0,
      sentCount: 0,
      sentAppointments: [],
    };
  }

  if (!wpApiKey) {
    return {
      ok: false,
      status: "missing_credentials",
      reason:
        "VATANSMS_WP_API_KEY tanımlı olmadığı için yetkili dükkanların yaklaşan randevularına WhatsApp mesajı gönderilemedi.",
      checkedAtTurkeyTime: `${todayIso} ${nowTimeLabel}`,
      sendDate: sendDateTr,
      authorizedShops: authorizedShopEntries.map((e) => ({
        slug: e.shop.slug,
        source: e.auth.source,
      })),
      sentCount: 0,
      sentAppointments: [],
    };
  }

  // Önümüzdeki 25-35 dakika penceresi
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
    regIdSource: "database" | "env_fallback" | "none";
    appointmentId: string;
    customerName: string;
    target: string;
    barberName: string;
    time: string;
    remainingMinutes: number;
    message: string;
    endpointUsed: string;
    status?: number;
    responseText: string;
  }[] = [];

  const failedAppointments: {
    shopSlug: string;
    regIdSource: "database" | "env_fallback" | "none";
    appointmentId: string;
    customerName: string;
    target: string;
    time: string;
    endpointUsed: string;
    status?: number;
    error: string;
    responseText: string;
  }[] = [];

  for (const { shop, auth } of authorizedShopEntries) {
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

      const targetPhone = normalizePhoneForWhatsAppApi(apt.customerPhone);
      if (!targetPhone || targetPhone.length < 10) {
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
        target: targetPhone,
        message: wpMessage,
        apiKey: wpApiKey,
        regId: auth.regId,
        sendDate: formatTurkeySendDate(getTurkeyNow()),
      });

      if (!dispatchResult.ok) {
        console.error(
          `[VatanSMS WP API Gönderim Hatası] Dükkan=${shop.slug} (${auth.source}) | Randevu=${apt.id} | Müşteri=${customerName} (${targetPhone}) | Saat=${aptTimeStr} | Endpoint=${dispatchResult.endpointUsed} | HTTP=${dispatchResult.status ?? "N/A"} | Hata=${dispatchResult.error} | RawResponse=${dispatchResult.responseText}`
        );
        failedAppointments.push({
          shopSlug: shop.slug,
          regIdSource: auth.source,
          appointmentId: apt.id,
          customerName,
          target: targetPhone,
          time: aptTimeStr,
          endpointUsed: dispatchResult.endpointUsed,
          status: dispatchResult.status,
          error:
            dispatchResult.error ||
            "WhatsApp API gönderim hatası (Cihaz bağlı olmayabilir veya API bilgileri geçersiz).",
          responseText: dispatchResult.responseText,
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
        regIdSource: auth.source,
        appointmentId: apt.id,
        customerName,
        target: targetPhone,
        barberName: barberDisplayName,
        time: aptTimeStr,
        remainingMinutes,
        message: wpMessage,
        endpointUsed: dispatchResult.endpointUsed,
        status: dispatchResult.status,
        responseText: dispatchResult.responseText,
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
        sendDate: sendDateTr,
        authorizedShops: authorizedShopEntries.map((e) => ({
          slug: e.shop.slug,
          source: e.auth.source,
        })),
        sentCount: sentAppointments.length,
        sentAppointments,
        failedCount: failedAppointments.length,
        failedAppointments,
      };
    }
  }

  return {
    ok: failedAppointments.length === 0,
    status: failedAppointments.length > 0 ? "completed_with_errors" : "completed",
    checkedAtTurkeyTime: `${todayIso} ${nowTimeLabel}`,
    sendDate: sendDateTr,
    endpoint: VATANSMS_WP_NTON_URL,
    windowMinutes: `${minWindowMinutes}-${maxWindowMinutes}`,
    authorizedShops: authorizedShopEntries.map((e) => ({
      slug: e.shop.slug,
      source: e.auth.source,
    })),
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
        responseText: (error as Error)?.stack || String(error),
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
        responseText: (error as Error)?.stack || String(error),
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
