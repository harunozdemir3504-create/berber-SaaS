import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  getTurkeyNow,
  toIsoDateString,
  toStrictIsoDate,
  TenantShop,
  Appointment,
} from "@/data/mockData";

function timeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const parts = timeStr.trim().split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function normalizeGsmForSmsApi(rawPhone: string): string {
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
  if (apt.appointment_date && /^\d{4}-\d{2}-\d{2}$/.test(apt.appointment_date)) {
    return apt.appointment_date;
  }
  if (apt.date && /^\d{4}-\d{2}-\d{2}$/.test(apt.date)) {
    return apt.date;
  }
  return toStrictIsoDate(apt.dayId);
}

async function dispatchSmsViaGateway(params: {
  gsm: string;
  message: string;
  apiKey: string;
  apiHash: string;
  sender: string;
  apiUrl: string;
}): Promise<{ ok: boolean; status?: number; responseText?: string; error?: string }> {
  const { gsm, message, apiKey, apiHash, sender, apiUrl } = params;

  // İletiMerkezi & VatanSMS uyumlu birleşik JSON payload
  const payload = {
    gsm,
    message,
    sender,
    api_id: apiKey,
    api_key: apiHash,
    message_type: "turkce",
    phones: [gsm],
    request: {
      authentication: {
        key: apiKey,
        hash: apiHash,
      },
      order: {
        sender,
        sendDateTime: [],
        iys: "1",
        iysList: "BIREYSEL",
        message: {
          text: message,
          receipents: {
            number: [gsm],
          },
        },
      },
    },
  };

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const responseText = await res.text().catch(() => "");
    return {
      ok: res.ok,
      status: res.status,
      responseText,
    };
  } catch (err) {
    return {
      ok: false,
      error: (err as Error)?.message || "SMS API network error",
    };
  }
}

async function runSmsReminderScan() {
  const smsApiKey = (process.env.SMS_API_KEY || "").trim();
  const smsApiHash = (process.env.SMS_API_HASH || "").trim();
  const smsSender = (process.env.SMS_SENDER || "APITEST").trim();
  const smsApiUrl = (
    process.env.SMS_API_URL || "https://api.iletimerkezi.com/v1/send-sms/json"
  ).trim();

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: false,
      reason: "Supabase bağlantı değişkenleri tanımlı değil.",
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
    console.error("[SMS Cron Supabase Fetch Error]:", fetchError);
    return {
      ok: false,
      reason: fetchError.message,
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
      reason: "Kayıtlı dükkan bulunamadı.",
      sentCount: 0,
      sentAppointments: [],
    };
  }

  const nowTr = getTurkeyNow();
  const todayIso = toIsoDateString(nowTr);
  const currentMinutes = nowTr.getHours() * 60 + nowTr.getMinutes();
  const nowTimeLabel = `${String(nowTr.getHours()).padStart(2, "0")}:${String(
    nowTr.getMinutes()
  ).padStart(2, "0")}`;

  let hasAnyUpdate = false;
  const sentAppointments: {
    shopSlug: string;
    shopName: string;
    appointmentId: string;
    customerName: string;
    gsm: string;
    time: string;
    message: string;
    dispatchedToApi: boolean;
  }[] = [];

  const updatedShops = await Promise.all(
    shops.map(async (shop) => {
      const isShopAutoSmsActive =
        shop.subscriptionStatus === "active" &&
        Boolean(
          shop.auto_sms_enabled ??
            shop.autoSmsEnabled ??
            shop.shopSettings?.auto_sms_enabled ??
            shop.shopSettings?.autoSmsEnabled
        );

      if (!isShopAutoSmsActive || !Array.isArray(shop.appointments)) {
        return shop;
      }

      let shopModified = false;
      const nextAppointments = await Promise.all(
        shop.appointments.map(async (apt) => {
          if (
            !apt ||
            apt.isBlockedSlot ||
            apt.status === "cancelled" ||
            apt.status === "completed" ||
            apt.status === "no_show" ||
            apt.sms_sent === true
          ) {
            return apt;
          }

          const aptIso = getAppointmentIso(apt);
          if (aptIso !== todayIso) {
            return apt;
          }

          const aptTimeStr = apt.appointment_time || apt.time;
          const aptStartM = timeToMinutes(aptTimeStr);
          const remainingMinutes = aptStartM - currentMinutes;

          // Başlangıç saatine 25 ile 35 dakika arası kalan ve sms_sent !== true olan randevular
          if (remainingMinutes < 25 || remainingMinutes > 35) {
            return apt;
          }

          const gsm = normalizeGsmForSmsApi(apt.customerPhone);
          if (!gsm || gsm.length < 10) {
            return apt;
          }

          const smsText = `✂️ ${shop.name} Hatırlatma: Sayın Müşterimiz, saat ${aptTimeStr}'deki randevunuza 30 dakika kalmıştır. Koltuğunuz hazır, bekliyoruz!`;

          let dispatchedToApi = false;
          if (smsApiKey && smsApiHash) {
            const gatewayResult = await dispatchSmsViaGateway({
              gsm,
              message: smsText,
              apiKey: smsApiKey,
              apiHash: smsApiHash,
              sender: smsSender,
              apiUrl: smsApiUrl,
            });
            if (!gatewayResult.ok) {
              console.error(
                `[SMS Gateway Error - ${shop.slug} / ${apt.id}]:`,
                gatewayResult.error || gatewayResult.responseText
              );
              return apt;
            }
            dispatchedToApi = true;
          } else {
            console.info(
              `[SMS Simülasyon - SMS_API_KEY/HASH bekliyor] gsm=${gsm} | message="${smsText}"`
            );
            dispatchedToApi = true;
          }

          if (dispatchedToApi) {
            shopModified = true;
            hasAnyUpdate = true;
            sentAppointments.push({
              shopSlug: shop.slug,
              shopName: shop.name,
              appointmentId: apt.id,
              customerName: apt.customerName,
              gsm,
              time: aptTimeStr,
              message: smsText,
              dispatchedToApi: Boolean(smsApiKey && smsApiHash),
            });

            return {
              ...apt,
              sms_sent: true,
              sms_sent_at: new Date().toISOString(),
              reminderSent: true,
              reminderSentAt: apt.reminderSentAt || nowTimeLabel,
            };
          }

          return apt;
        })
      );

      if (!shopModified) return shop;

      return {
        ...shop,
        appointments: nextAppointments,
        updatedAt: Date.now(),
      };
    })
  );

  // Eğer en az 1 randevuya SMS gönderildiyse mevcut hiçbir dükkan/şifre verisini bozmadan sadece sms_sent=true olarak kaydet
  if (hasAnyUpdate) {
    const { error: upsertError } = await supabase.from("app_state").upsert(
      {
        key: "global_state",
        data: {
          ...globalData,
          shops: updatedShops,
          updatedByClientId: `sms-cron-${Date.now()}`,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (upsertError) {
      console.error("[SMS Cron Supabase Upsert Error]:", upsertError);
      return {
        ok: false,
        reason: upsertError.message,
        sentCount: sentAppointments.length,
        sentAppointments,
      };
    }
  }

  return {
    ok: true,
    checkedAtTurkeyTime: `${todayIso} ${nowTimeLabel}`,
    apiCredentialsConfigured: Boolean(smsApiKey && smsApiHash),
    sentCount: sentAppointments.length,
    sentAppointments,
  };
}

export async function GET() {
  try {
    const result = await runSmsReminderScan();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[SMS Cron GET Exception]:", error);
    return NextResponse.json(
      { ok: false, error: (error as Error)?.message || "Cron scan error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const result = await runSmsReminderScan();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[SMS Cron POST Exception]:", error);
    return NextResponse.json(
      { ok: false, error: (error as Error)?.message || "Cron scan error" },
      { status: 500 }
    );
  }
}
