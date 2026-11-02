import { NextResponse } from "next/server";
import { buildWhatsAppUrl, formatPhoneForWhatsApp, DEFAULT_SHOP_WHATSAPP_PHONE } from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      appointmentId,
      appointmentCode,
      shopSlug,
      shopName,
      shopPhone,
      customerName,
      customerPhone,
      barberName,
      dateLabel,
      time,
      servicesSummary,
      totalPrice,
      createdAtIso,
    } = body || {};

    const formattedShopPhone = formatPhoneForWhatsApp(
      shopPhone,
      DEFAULT_SHOP_WHATSAPP_PHONE
    );
    const formattedCustomerPhone = formatPhoneForWhatsApp(
      customerPhone,
      DEFAULT_SHOP_WHATSAPP_PHONE
    );

    const customerToBarberMessage = `Merhaba, ben ${customerName}. ${dateLabel} saat ${time} için ${servicesSummary} randevusu oluşturdum.`;
    const barberApprovalMessage = `Merhaba ${customerName}, ${dateLabel} saat ${time} için ${shopName} randevunuz onaylanmıştır. Görüşmek üzere!`;
    const barberReminderMessage = `Merhaba ${customerName}, ${shopName} randevunuzu hatırlatmak isteriz. 📅 Tarih: ${dateLabel} ⏰ Saat: ${time} ✂️ İşlem: ${servicesSummary}. Sizi bekliyoruz!`;

    const webhookPayload = {
      event: "booking.created",
      timestamp: createdAtIso || new Date().toISOString(),
      alertBanner: `🔔 YENİ RANDEVU GELDİ: ${customerName} - ${time}`,
      appointment: {
        id: appointmentId,
        code: appointmentCode,
        shopSlug,
        shopName,
        barberName,
        dateLabel,
        time,
        servicesSummary,
        totalPrice,
        customerName,
        customerPhone,
        formattedCustomerPhone,
        formattedShopPhone,
      },
      whatsappLinks: {
        notifyBarberUrl: buildWhatsAppUrl(
          shopPhone,
          customerToBarberMessage,
          DEFAULT_SHOP_WHATSAPP_PHONE
        ),
        approveCustomerUrl: buildWhatsAppUrl(
          customerPhone,
          barberApprovalMessage,
          DEFAULT_SHOP_WHATSAPP_PHONE
        ),
        remindCustomerUrl: buildWhatsAppUrl(
          customerPhone,
          barberReminderMessage,
          DEFAULT_SHOP_WHATSAPP_PHONE
        ),
      },
    };

    // Eğer ortam değişkeninde harici bir Webhook URL (WhatsApp Business API, Make, Zapier, n8n, Telegram vb.)
    // tanımlanmışsa arka planda otomatik olarak tetiklenir.
    const externalWebhookUrl =
      process.env.BOOKING_WEBHOOK_URL || process.env.WHATSAPP_WEBHOOK_URL;

    if (externalWebhookUrl) {
      await fetch(externalWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      }).catch((err) => {
        console.warn("Harici webhook gönderim uyarısı:", err);
      });
    }

    return NextResponse.json({
      ok: true,
      dispatched: true,
      payload: webhookPayload,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error)?.message || "Invalid payload" },
      { status: 400 }
    );
  }
}
