"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors,
  Crown,
  Sparkles,
  Check,
  X,
  CalendarDays,
  ShieldAlert,
  Zap,
  Armchair,
  Smartphone,
  MessageSquare,
  ChevronDown,
  Lock,
  Eye,
  ArrowRight,
} from "lucide-react";

const FOUNDER_WHATSAPP_URL =
  "https://wa.me/905355813039?text=Merhaba,%20VIP%20Randevu%20Sistemini%20d%C3%BCkkan%C4%B1m%20i%C3%A7in%20inceledim,%20%C3%BCcretsiz%20deneme%20kurulumu%20istiyorum.";

interface VipLandingPageProps {
  onOpenLiveDemo: () => void;
  demoShopName?: string;
}

const COMPARISON_OLD_WAY = [
  "Elim köpüklüyken telefon çalıyor",
  "Müşteri randevusunu unuttu, koltuk 1 saat boş kaldı",
  "Hangi usta bugün kaç tıraş yaptı belli değil",
  "Diğer sistemler her mesaj için pahalı SMS paketi satıyor",
];

const COMPARISON_VIP_WAY = [
  "Müşteri gece 02:00'de bile kendi randevusunu alır",
  "Kara liste & IBAN Kapora kilidi ile gelmeyen müşteriye son",
  "İptal olan saati 'Erken Gelebilir' yedek listesiyle 1 dakikada doldurma",
  "Sınırsız ve ücretsiz WhatsApp fiş sistemi",
];

const SUPER_FEATURES = [
  {
    emoji: "📅",
    icon: CalendarDays,
    title: "Sürükle-Bırak Akıllı Zaman Çizelgesi",
    description:
      "30, 60 ve 90 dakikalık (VIP Damat paketi vb.) işlemleri otomatik bloklayan, tek parmakla saat kaydırılabilen takvim.",
    topGlow: "from-amber-400/20 via-amber-500/5 to-transparent",
    iconBg: "bg-amber-500/15 text-amber-300 border-amber-400/35",
  },
  {
    emoji: "🚨",
    icon: ShieldAlert,
    title: "Kara Liste & Otomatik Kapora (IBAN) Kilidi",
    description:
      "Randevusuna sadık olmayan müşteriyi tek tıkla kara listeye alın; bir sonraki randevusunda sistem otomatik olarak IBAN kaporası şartı koysun, siz onaylamadan saat kapanmasın!",
    topGlow: "from-amber-500/20 via-rose-500/5 to-transparent",
    iconBg: "bg-amber-500/15 text-amber-300 border-amber-400/35",
  },
  {
    emoji: "⚡",
    icon: Zap,
    title: '"Erken Gelebilir" Yedek Müşteri Radarı',
    description:
      'Bir müşteri randevusunu iptal mi etti? O gün erken gelebileceğini belirten müşterilere tek tuşla WhatsApp\'tan "Koltuk boşaldı, hemen gelebilir misin?" mesajı atıp koltuğu doldurun.',
    topGlow: "from-emerald-400/20 via-emerald-500/5 to-transparent",
    iconBg: "bg-emerald-500/15 text-emerald-300 border-emerald-400/35",
  },
  {
    emoji: "💺",
    icon: Armchair,
    title: "Çoklu Koltuk & Usta Yönetimi",
    description:
      "Dükkandaki her ustaya özel koltuk, kendi randevu takvimi ve anlık ciro hesabı.",
    topGlow: "from-amber-400/20 via-amber-500/5 to-transparent",
    iconBg: "bg-amber-500/15 text-amber-300 border-amber-400/35",
  },
  {
    emoji: "📲",
    icon: Smartphone,
    title: "Uygulama İndirme Derdi Yok (PWA + Masaüstü QR Kod)",
    description:
      "Müşteri uygulama mağazasında vakit kaybetmez; berber ise yönetim panelini telefonunun ana ekranına gerçek uygulama gibi tek tuşla indirir.",
    topGlow: "from-emerald-400/20 via-amber-500/5 to-transparent",
    iconBg: "bg-emerald-500/15 text-emerald-300 border-emerald-400/35",
  },
  {
    emoji: "💬",
    icon: MessageSquare,
    title: "Hazır WhatsApp Randevu Fişi",
    description:
      "Randevu alındığı an onay kodlu, saatli ve fiyatlı profesyonel randevu fişi tek tıkla WhatsApp'ta.",
    topGlow: "from-amber-400/20 via-amber-500/5 to-transparent",
    iconBg: "bg-amber-500/15 text-amber-300 border-amber-400/35",
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: "1. Adım",
    badge: "5 Dakikada Kurulum",
    title: "Dükkanınızı Tanımlayalım",
    description:
      "Bize WhatsApp'tan ulaşın, dükkan adınızı, ustalarınızı ve fiyat listenizi 5 dakikada sisteme tanımlayalım.",
  },
  {
    step: "2. Adım",
    badge: "Instagram & QR Kod",
    title: "Özel Linkinizi Paylaşın",
    description:
      "Size özel müşteri randevu linkinizi Instagram biyografinize ve WhatsApp otomatik mesajınıza ekleyelim, QR kodunuzu teslim edelim.",
  },
  {
    step: "3. Adım",
    badge: "Tam Kontrol",
    title: "Tek Tıkla Yönetin",
    description:
      "Müşterileriniz randevu aldıkça telefonunuzdan tek tıkla yönetin, akşam kasanızı net görün!",
  },
];

const FAQ_ITEMS = [
  {
    question: "Müşterilerim uygulama indirmek zorunda mı?",
    answer:
      "Hayır! Müşterileriniz App Store veya Google Play'den hiçbir uygulama indirmeden, şifre veya üyelikle uğraşmadan doğrudan Instagram biyografinizdeki linkten, WhatsApp'tan veya dükkanınızdaki QR koddan 10 saniye içinde randevusunu alır.",
  },
  {
    question: "SMS ücreti ödeyecek miyim?",
    answer:
      "Kesinlikle hayır! Sistemimiz akıllı WhatsApp Randevu Fişi teknolojisiyle çalışır. Pahalı SMS paketleri satın almanıza gerek kalmadan sınırsız randevu onayı, hatırlatma ve yedek liste mesajlarını tamamen ücretsiz gönderirsiniz.",
  },
  {
    question: "Fiyatlarımı ve saatlerimi kendim değiştirebilir miyim?",
    answer:
      "Evet! Berber Yönetim Panelinizden hizmet fiyatlarınızı, işlem sürelerinizi, açılış-kapanış saatlerinizi, ustalarınızı, koltuk özel fiyatlarınızı ve yemek molalarınızı istediğiniz an tek dokunuşla güncelleyebilirsiniz.",
  },
  {
    question: "Kurulum ne kadar sürer?",
    answer:
      "Sadece 10 dakika! Bize WhatsApp'tan ulaştığınızda dükkan adınızı, ustalarınızı ve hizmet listenizi anahtar teslim olarak biz tanımlıyoruz. Size sadece linkinizi paylaşmak ve randevuları kabul etmek kalıyor.",
  },
];

const GLASS_CARD_CLASS =
  "bg-gradient-to-b from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-amber-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300";

const GOLD_TEXT_GRADIENT =
  "bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent";

export default function VipLandingPage({
  onOpenLiveDemo,
}: VipLandingPageProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div className="relative min-h-screen bg-[#09090b] text-[#fdf8f5] selection:bg-amber-400 selection:text-[#09090b] overflow-hidden">
      {/* =================================================================== */}
      {/* ARKA PLAN: AMBIENT GLOW (ORTAMSAL IŞIK KÜRELERİ) & SUBTLE TECH GRID */}
      {/* =================================================================== */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* 1. Üst Merkez (Hero Arkası): Altın/Kehribar Işık Küresi */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/15 blur-[130px] rounded-full" />

        {/* 2. Orta Sağ (Özellikler Arkası): Zümrüt Yeşili Işık Küresi */}
        <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] bg-emerald-500/10 blur-[140px] rounded-full" />

        {/* 3. Alt Sol (Fiyatlandırma Arkası): Sıcak Altın Işık Küresi */}
        <div className="absolute bottom-10 -left-24 w-[500px] h-[400px] bg-amber-600/10 blur-[130px] rounded-full" />

        {/* Modern İnce Izgara Dokusu (Subtle Tech Grid) + Radyal Maske */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      {/* SAYFA İÇERİĞİ (IŞIK KÜRELERİ VE IZGARANIN ÜZERİNDE YER ALIR) */}
      <div className="relative z-10">
        {/* =================================================================== */}
        {/* 1. ÜST BAR (STICKY VIP NAVBAR)                                      */}
        {/* =================================================================== */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-3.5">
            {/* Sol: Altın Makas/Taç İkonu ve VIP RANDEVU SİSTEMİ Logosu */}
            <a href="#" className="group flex items-center gap-2.5 shrink-0">
              <div className="relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-amber-400/60 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 text-[#09090b] shadow-lg shadow-amber-500/25 transition-transform duration-300 group-hover:scale-105">
                <Crown className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.4]" />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#09090b] bg-emerald-500 text-[#09090b]">
                  <Scissors className="h-2.5 w-2.5 -rotate-45 stroke-[2.5]" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs sm:text-base font-black tracking-wider ${GOLD_TEXT_GRADIENT}`}
                  >
                    VIP RANDEVU SİSTEMİ
                  </span>
                </div>
                <p className="hidden text-[10px] font-semibold text-stone-400 sm:block">
                  Yeni Nesil Berber &amp; Kuaför Yönetim Platformu
                </p>
              </div>
            </a>

            {/* Orta: Navigasyon Linkleri (Masaüstü) */}
            <nav className="hidden md:flex items-center gap-6 text-xs lg:text-sm font-bold text-stone-300">
              <a
                href="#ozellikler"
                className="hover:text-amber-400 transition-colors"
              >
                Özellikler
              </a>
              <button
                type="button"
                onClick={onOpenLiveDemo}
                className="hover:text-amber-400 transition-colors cursor-pointer"
              >
                Canlı Demo
              </button>
              <a
                href="#fiyatlandirma"
                className="hover:text-amber-400 transition-colors"
              >
                Fiyatlandırma
              </a>
              <a
                href="#sss"
                className="hover:text-amber-400 transition-colors"
              >
                S.S.S.
              </a>
            </nav>

            {/* Sağ: Parlayan 🚀 Ücretsiz Dene (WhatsApp) ve 🔐 Berber Girişi (/admin) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <a
                href={FOUNDER_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/60 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 px-2.5 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-black text-[#05150d] shadow-lg shadow-emerald-500/25 transition hover:brightness-110 active:scale-95"
              >
                <span>🚀 Ücretsiz Dene</span>
              </a>

              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-white/[0.05] backdrop-blur-md hover:bg-amber-500/15 hover:border-amber-400/70 px-2.5 py-2 sm:px-3.5 sm:py-2.5 text-[11px] sm:text-xs font-bold text-amber-300 transition active:scale-95"
              >
                <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>🔐 Berber Girişi</span>
              </Link>
            </div>
          </div>

          {/* Mobil Hızlı Menü Şeridi */}
          <div className="flex md:hidden items-center justify-around border-t border-white/10 bg-[#09090b]/90 backdrop-blur-xl px-2 py-1.5 text-[11px] font-bold text-stone-300">
            <a href="#ozellikler" className="px-2 py-1 hover:text-amber-400">
              Özellikler
            </a>
            <button
              type="button"
              onClick={onOpenLiveDemo}
              className="px-2 py-1 text-amber-300 hover:text-amber-400 cursor-pointer"
            >
              👀 Canlı Demo
            </button>
            <a
              href="#fiyatlandirma"
              className="px-2 py-1 hover:text-amber-400"
            >
              Fiyatlandırma
            </a>
            <a href="#sss" className="px-2 py-1 hover:text-amber-400">
              S.S.S.
            </a>
          </div>
        </header>

        {/* =================================================================== */}
        {/* 2. VURUCU GİRİŞ ALANI (HERO SECTION)                                */}
        {/* =================================================================== */}
        <section className="relative pt-8 pb-14 sm:pt-14 sm:pb-20 lg:pt-16 lg:pb-24 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl text-center">
            {/* Üstte dikkat çekici rozet */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-white/[0.06] to-emerald-500/20 backdrop-blur-xl px-4 py-1.5 text-xs sm:text-sm font-black text-amber-300 shadow-[0_8px_32px_rgba(245,158,11,0.18)]"
            >
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                ✨ Türkiye&apos;nin En Gelişmiş Yeni Nesil Salon Yönetim Sistemi
              </span>
            </motion.div>

            {/* Dev Başlık */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="mt-6 text-2xl sm:text-4xl md:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.15] text-[#fdf8f5]"
            >
              Tıraşınızı Bölüp Telefona Bakma Devri Bitti.{" "}
              <span className={GOLD_TEXT_GRADIENT}>
                Koltuklarınız Hep Dolu, Kasanız Hep Kontrol Altında Olsun!
              </span>
            </motion.h1>

            {/* Alt Açıklama */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.16 }}
              className="mx-auto mt-5 max-w-3xl text-sm sm:text-lg md:text-xl font-medium leading-relaxed text-stone-300"
            >
              Müşterileriniz uygulama indirmeden, şifreyle uğraşmadan Instagram
              veya WhatsApp linkinizden 10 saniyede randevusunu alsın.{" "}
              <strong className={`font-extrabold ${GOLD_TEXT_GRADIENT}`}>
                SMS masrafı yok, karışıklık yok, boş kalan koltuk yok!
              </strong>
            </motion.p>

            {/* 2 Dev Aksiyon Butonu */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.24 }}
              className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 sm:gap-4 max-w-3xl mx-auto"
            >
              <a
                href={FOUNDER_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex-1 inline-flex items-center justify-center gap-2.5 rounded-2xl border-2 border-emerald-300/80 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 px-6 py-4 sm:py-4.5 text-sm sm:text-base font-black text-[#04130c] shadow-2xl shadow-emerald-500/30 transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>
                  💬 Dükkanım İçin 7 Gün Ücretsiz Kurulum İste (WhatsApp)
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
              </a>

              <button
                type="button"
                onClick={onOpenLiveDemo}
                className="inline-flex items-center justify-center gap-2.5 rounded-2xl border-2 border-amber-400/70 bg-gradient-to-b from-white/[0.1] to-white/[0.03] backdrop-blur-xl hover:border-amber-300 hover:from-amber-500/20 hover:to-amber-500/5 px-6 py-4 sm:py-4.5 text-sm sm:text-base font-black text-amber-300 shadow-[0_8px_32px_rgba(245,158,11,0.2)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <Eye className="h-5 w-5 text-amber-400 shrink-0" />
                <span>👀 Müşteri Ekranını Canlı Test Et (Örnek Dükkan)</span>
              </button>
            </motion.div>

            {/* Güven Rozetleri */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs sm:text-sm font-bold text-stone-300"
            >
              <span
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-emerald-300 ${GLASS_CARD_CLASS}`}
              >
                <span>✅ Sıfır SMS Maliyeti</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-amber-300 ${GLASS_CARD_CLASS}`}
              >
                <span>✅ iPhone &amp; Android Tam Uyumlu</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-emerald-300 ${GLASS_CARD_CLASS}`}
              >
                <span>✅ 10 Dakikada Anahtar Teslim Kurulum</span>
              </span>
            </motion.div>

            {/* Canlı Sistem Önizleme Kartı (Buzlu Cam / Glassmorphism Vitrin Bandı) */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.38 }}
              className={`mt-10 sm:mt-12 rounded-3xl p-4 sm:p-6 text-left ${GLASS_CARD_CLASS}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5 mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span
                    className={`ml-2 text-xs font-extrabold uppercase tracking-wider ${GOLD_TEXT_GRADIENT}`}
                  >
                    💈 Canlı Berber Komuta Paneli Önizlemesi
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-300">
                    🟢 Koltuk Doluluk: %95
                  </span>
                  <span className="hidden sm:inline-block rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-black text-amber-300">
                    💰 Günlük Kasa: +9.450 TL
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="rounded-2xl border border-emerald-500/35 bg-gradient-to-b from-emerald-500/[0.12] to-white/[0.02] backdrop-blur-md p-3.5 hover:border-emerald-400/60 transition-all">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                    <span>⏰ 14:00 - 14:30 • VIP Koltuk #1</span>
                    <span className="rounded bg-emerald-500/25 px-2 py-0.5 text-[10px] font-black">
                      ONAYLI ✓
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-black text-white">
                    Burak Yılmaz — Saç + Sakal VIP
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-stone-300">
                    ⚡ Erken boşluk olursa gelebilir • 650 TL
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/[0.14] to-white/[0.02] backdrop-blur-md p-3.5 hover:border-amber-400/70 transition-all">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                    <span>⏰ 14:30 - 15:30 • VIP Koltuk #2</span>
                    <span className="rounded bg-amber-500/25 px-2 py-0.5 text-[10px] font-black">
                      60 DK BLOK
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-black text-white">
                    Emre Demir — VIP Damat Paketi
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-stone-300">
                    💺 Tek parmakla sürükle-bırak saat taşıma • 1.500 TL
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-b from-rose-500/[0.12] to-white/[0.02] backdrop-blur-md p-3.5 hover:border-amber-400/60 transition-all">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                    <span>🚨 Kara Liste &amp; IBAN Koruması</span>
                    <span className="rounded bg-rose-500/25 px-2 py-0.5 text-[10px] font-black">
                      KAPORA ŞARTLI
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-black text-white">
                    Gelmeyen Müşteri Koruması Aktif
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-stone-300">
                    💳 IBAN dekontu gelmeden koltuk saati kapanmaz!
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 3. "ESKİ USUL vs. VIP RANDEVU SİSTEMİ" KARŞILAŞTIRMA TABLOSU        */}
        {/* =================================================================== */}
        <section
          id="karsilastirma"
          className="py-12 sm:py-20 px-4 sm:px-6 border-t border-white/10"
        >
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 backdrop-blur-md px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
                Neden Geçmelisiniz?
              </span>
              <h2 className="mt-3 text-2xl sm:text-4xl font-black text-[#fdf8f5]">
                Eski Usul vs.{" "}
                <span className={GOLD_TEXT_GRADIENT}>VIP Randevu Sistemi</span>
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-stone-300">
                Telefon trafiği ve unutulan randevular yüzünden her ay binlerce
                lira kaybetmeye son verin.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sol Kart: ❌ Klasik Defter & Telefon Trafiği (Glassmorphism) */}
              <div className={`rounded-3xl p-6 sm:p-8 ${GLASS_CARD_CLASS}`}>
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                    <X className="h-6 w-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-rose-200">
                      ❌ Klasik Defter &amp; Telefon Trafiği
                    </h3>
                    <p className="text-xs font-semibold text-rose-300/80">
                      Zaman, müşteri ve ciro kaybettiren eski düzen
                    </p>
                  </div>
                </div>

                <ul className="mt-6 space-y-4">
                  {COMPARISON_OLD_WAY.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-3.5 transition hover:border-rose-500/35"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 font-black text-xs">
                        ✕
                      </span>
                      <span className="text-sm sm:text-base font-bold text-stone-200">
                        &ldquo;{item}&rdquo;
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sağ Kart: ✅ VIP Randevu Sistemi (Glassmorphism + Gold/Emerald Glow) */}
              <div
                className={`relative rounded-3xl p-6 sm:p-8 ${GLASS_CARD_CLASS} ring-1 ring-amber-400/30`}
              >
                <div className="absolute -top-3.5 right-6 rounded-full border border-amber-200 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#09090b] shadow-lg">
                  👑 Profesyonel Çözüm
                </div>

                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400">
                    <Check className="h-6 w-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3
                      className={`text-lg sm:text-xl font-black ${GOLD_TEXT_GRADIENT}`}
                    >
                      ✅ VIP Randevu Sistemi
                    </h3>
                    <p className="text-xs font-semibold text-emerald-300">
                      7/24 otomatik çalışan, koltukları dolduran akıllı sistem
                    </p>
                  </div>
                </div>

                <ul className="mt-6 space-y-4">
                  {COMPARISON_VIP_WAY.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.12] to-amber-500/[0.05] backdrop-blur-md p-3.5 transition hover:border-amber-400/50"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[#05150d] font-black text-xs">
                        ✓
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-[#fdf8f5]">
                        &ldquo;{item}&rdquo;
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 4. RAKİPSİZ 6 SÜPER ÖZELLİK (BUZLU CAM & ALTIN YANSIMALI KARTLAR)   */}
        {/* =================================================================== */}
        <section
          id="ozellikler"
          className="py-14 sm:py-22 px-4 sm:px-6 border-t border-white/10"
        >
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 backdrop-blur-md px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Sadece Bizde Olan Teknolojiler</span>
              </span>
              <h2 className="mt-3 text-2xl sm:text-4xl font-black text-[#fdf8f5]">
                Rakipsiz{" "}
                <span className={GOLD_TEXT_GRADIENT}>6 Süper Özellik</span>
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-stone-300">
                Türkiye&apos;deki berber ve kuaför esnafının gerçek
                ihtiyaçlarına göre özel olarak geliştirildi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {SUPER_FEATURES.map((feat, idx) => {
                const IconComponent = feat.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: idx * 0.06 }}
                    className={`group relative overflow-hidden rounded-3xl p-6 hover:-translate-y-1.5 ${GLASS_CARD_CLASS}`}
                  >
                    {/* Kart Üstü Hafif Altın/Zümrüt Yansıma */}
                    <div
                      className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${feat.topGlow} opacity-80 transition-opacity duration-300 group-hover:opacity-100`}
                    />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${feat.iconBg} shadow-inner`}
                        >
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <span className="text-2xl">{feat.emoji}</span>
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-[#fdf8f5] group-hover:text-amber-300 transition-colors">
                        {feat.emoji} {feat.title}
                      </h3>

                      <p className="mt-2.5 text-xs sm:text-sm font-medium leading-relaxed text-stone-300">
                        {feat.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 5. "NASIL ÇALIŞIR?" (3 ADIMDA HIZLI BAŞLANGIÇ)                      */}
        {/* =================================================================== */}
        <section className="py-14 sm:py-20 px-4 sm:px-6 border-t border-white/10">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 backdrop-blur-md px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-300">
                Anahtar Teslim Hızlı Kurulum
              </span>
              <h2 className="mt-3 text-2xl sm:text-4xl font-black text-[#fdf8f5]">
                Nasıl Çalışır?{" "}
                <span className={GOLD_TEXT_GRADIENT}>
                  (3 Adımda Hızlı Başlangıç)
                </span>
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-stone-300">
                Teknik bilgi gerekmez; bütün kurulumu sizin yerinize biz
                yapıyoruz!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {HOW_IT_WORKS_STEPS.map((item, idx) => (
                <div
                  key={idx}
                  className={`relative rounded-3xl p-6 sm:p-7 hover:-translate-y-1 ${GLASS_CARD_CLASS}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-3.5 py-1.5 text-xs font-black text-[#09090b] shadow-md">
                      {item.step}
                    </span>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-300">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-[#fdf8f5]">
                    {item.title}
                  </h3>

                  <p className="mt-2.5 text-sm font-medium leading-relaxed text-stone-300">
                    <strong className="text-amber-300">{item.step}:</strong>{" "}
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 6. ŞEFFAF VE CAZİP FİYATLANDIRMA ("GÜNDE 1 ÇAY PARASINA")           */}
        {/* =================================================================== */}
        <section
          id="fiyatlandirma"
          className="py-14 sm:py-22 px-4 sm:px-6 border-t border-white/10"
        >
          <div className="mx-auto max-w-4xl">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/15 backdrop-blur-md px-4 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
                ☕ Günde 1 Çay Parasına
              </span>
              <h2 className="mt-3 text-2xl sm:text-4xl font-black text-[#fdf8f5]">
                Şeffaf ve Cazip{" "}
                <span className={GOLD_TEXT_GRADIENT}>Fiyatlandırma</span>
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-stone-300">
                Sürpriz fatura yok, kontör/SMS paketi dayatması yok. Tek paket,
                tüm VIP özellikler dahil!
              </p>
            </div>

            {/* Ortada Altın Çerçeveli 👑 VIP SALON PAKETİ (Her Şey Dahil) Buzlu Cam Kartı */}
            <div className="relative mx-auto max-w-xl rounded-3xl bg-gradient-to-b from-white/[0.09] to-white/[0.03] backdrop-blur-2xl border-2 border-amber-400/80 hover:border-amber-300 p-6 sm:p-10 shadow-[0_12px_48px_rgba(245,158,11,0.22)] transition-all duration-300">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-200 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-5 py-1 text-xs font-black uppercase tracking-wider text-[#09090b] shadow-lg">
                👑 EN ÇOK TERCİH EDİLEN • HER ŞEY DAHİL
              </div>

              <div className="text-center border-b border-white/10 pb-6 pt-2">
                <h3
                  className={`text-xl sm:text-2xl font-black ${GOLD_TEXT_GRADIENT}`}
                >
                  👑 VIP SALON PAKETİ (Her Şey Dahil)
                </h3>
                <p className="mt-2 text-xs sm:text-sm font-medium text-stone-300">
                  Dükkanınızın tüm randevu, koltuk ve kasa kontrolü tek ekranda
                </p>
              </div>

              <ul className="my-7 space-y-4">
                {[
                  "Sınırsız Randevu & Sınırsız Müşteri",
                  "Çoklu Koltuk / Usta Ekleme",
                  "Kara Liste & Kapora Modülü Dahil",
                  "7/24 Teknik Destek & Ücretsiz Kurulum",
                  "Sıfır SMS Maliyeti — Sınırsız WhatsApp Randevu Fişi",
                  "Dükkanınıza Özel QR Kod Poster & Instagram Randevu Linki",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[#05150d] font-black text-xs shadow-sm">
                      ✓
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-[#fdf8f5]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href={FOUNDER_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 py-4 px-5 text-center text-sm sm:text-base font-black text-[#09090b] shadow-xl shadow-amber-500/30 transition hover:brightness-110 active:scale-[0.99]"
              >
                <span>
                  🚀 Şimdi 7 Gün Ücretsiz Deneyin — Kredi Kartı Gerekmez
                </span>
              </a>

              <p className="mt-3 text-center text-[11px] font-semibold text-stone-400">
                Memnun kalmazsanız hiçbir taahhüt olmadan istediğiniz an
                bırakabilirsiniz.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 7. SIKÇA SORULAN SORULAR (SSS) & SABİT WHATSAPP BUTONU              */}
        {/* =================================================================== */}
        <section
          id="sss"
          className="py-14 sm:py-20 px-4 sm:px-6 border-t border-white/10"
        >
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 backdrop-blur-md px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
                Merak Edilenler
              </span>
              <h2 className="mt-3 text-2xl sm:text-4xl font-black text-[#fdf8f5]">
                Sıkça Sorulan{" "}
                <span className={GOLD_TEXT_GRADIENT}>Sorular</span>
              </h2>
            </div>

            <div className="space-y-3.5">
              {FAQ_ITEMS.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl ${GLASS_CARD_CLASS} ${
                      isOpen ? "border-amber-400/60" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
                    >
                      <span className="text-sm sm:text-base font-black text-[#fdf8f5]">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-amber-400 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-white/10 px-5 py-4 text-xs sm:text-sm font-medium leading-relaxed text-stone-300">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ALT FOOTER */}
        <footer className="border-t border-white/10 bg-black/40 backdrop-blur-xl py-10 px-4 sm:px-6 pb-28 sm:pb-12">
          <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-[#09090b]">
                <Crown className="h-4 w-4 stroke-[2.5]" />
              </div>
              <span
                className={`text-sm font-black tracking-wider ${GOLD_TEXT_GRADIENT}`}
              >
                VIP RANDEVU SİSTEMİ
              </span>
            </div>
            <p className="text-xs text-stone-400">
              © {new Date().getFullYear()} VIP Berber &amp; Kuaför Randevu
              Sistemi. Tüm hakları saklıdır.
            </p>
            <div className="flex items-center gap-4 text-xs font-bold text-stone-300">
              <button
                type="button"
                onClick={onOpenLiveDemo}
                className="hover:text-amber-400 cursor-pointer"
              >
                Örnek Dükkan
              </button>
              <Link href="/admin" className="hover:text-amber-400">
                Berber Girişi
              </Link>
            </div>
          </div>
        </footer>

        {/* =================================================================== */}
        {/* SAĞ ALT KÖŞEDE HER ZAMAN SABİT DURAN YEŞİL WHATSAPP BALONU          */}
        {/* =================================================================== */}
        <a
          href={FOUNDER_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2.5 rounded-full border-2 border-emerald-300 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 px-4 py-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-black text-[#04130c] shadow-2xl shadow-emerald-500/40 transition-transform hover:scale-105 active:scale-95"
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#04130c] opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#04130c]" />
          </span>
          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 fill-[#04130c] shrink-0" />
          <span>💬 WhatsApp İletişim / Demo İste</span>
        </a>
      </div>
    </div>
  );
}
