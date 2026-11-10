"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
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
  Eye,
  ArrowRight,
  ArrowLeft,
  Clock,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  Home,
} from "lucide-react";

const FOUNDER_WHATSAPP_URL =
  "https://wa.me/905355813039?text=Merhaba,%20VIP%20Randevu%20Sistemini%20d%C3%BCkkan%C4%B1m%20i%C3%A7in%20inceledim,%20%C3%BCcretsiz%20deneme%20kurulumu%20istiyorum.";

type LandingView = "home" | "features" | "pricing";
type ScenarioKey = "calendar" | "blacklist" | "radar" | "chairs";

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
    accentBorder: "group-hover:border-[#dfc39e]/45",
    iconClass:
      "border-[#dfc39e]/30 bg-[#dfc39e]/10 text-[#ebd4b3]",
  },
  {
    emoji: "🚨",
    icon: ShieldAlert,
    title: "Kara Liste & Otomatik Kapora (IBAN) Kilidi",
    description:
      "Randevusuna sadık olmayan müşteriyi tek tıkla kara listeye alın; bir sonraki randevusunda sistem otomatik IBAN kaporası şartı koysun.",
    accentBorder: "group-hover:border-rose-400/40",
    iconClass:
      "border-rose-400/30 bg-rose-500/10 text-rose-300",
  },
  {
    emoji: "⚡",
    icon: Zap,
    title: '"Erken Gelebilir" Yedek Müşteri Radarı',
    description:
      'İptal olan bir saati, o gün erken gelebileceğini belirten müşterilere tek tuşla WhatsApp mesajı atarak 1 dakikada doldurun.',
    accentBorder: "group-hover:border-emerald-400/40",
    iconClass:
      "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  },
  {
    emoji: "💺",
    icon: Armchair,
    title: "Çoklu Koltuk & Usta Yönetimi",
    description:
      "Dükkandaki her ustaya özel koltuk, kendi randevu takvimi, kişiye özel fiyat listesi ve anlık günlük/aylık ciro hesabı.",
    accentBorder: "group-hover:border-[#dfc39e]/45",
    iconClass:
      "border-[#dfc39e]/30 bg-[#dfc39e]/10 text-[#ebd4b3]",
  },
  {
    emoji: "📲",
    icon: Smartphone,
    title: "Uygulama İndirme Derdi Yok (QR + Mobil)",
    description:
      "Müşteri uygulama mağazasında vakit kaybetmez; linkten veya aynadaki QR koddan 10 saniyede randevusunu alır.",
    accentBorder: "group-hover:border-emerald-400/40",
    iconClass:
      "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  },
  {
    emoji: "💬",
    icon: MessageSquare,
    title: "Hazır WhatsApp Randevu Fişi",
    description:
      "Randevu alındığı an onay kodlu, saatli ve fiyatlı profesyonel randevu fişi tek tıkla WhatsApp üzerinden iletilir.",
    accentBorder: "group-hover:border-[#dfc39e]/45",
    iconClass:
      "border-[#dfc39e]/30 bg-[#dfc39e]/10 text-[#ebd4b3]",
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: "1. Adım",
    badge: "5 Dakikada Kurulum",
    title: "Dükkanınızı Tanımlayalım",
    description:
      "Bize WhatsApp'tan ulaşın; dükkan adınızı, ustalarınızı ve fiyat listenizi 5 dakikada sizin adınıza sisteme tanımlayalım.",
  },
  {
    step: "2. Adım",
    badge: "Instagram & QR Kod",
    title: "Özel Linkinizi Paylaşın",
    description:
      "Size özel müşteri randevu linkinizi Instagram biyografinize ekleyelim, aynanıza asılacak QR kod afişinizi teslim edelim.",
  },
  {
    step: "3. Adım",
    badge: "Tam Kontrol",
    title: "Tek Tıkla Yönetin",
    description:
      "Müşterileriniz randevu aldıkça telefonunuzdan tek dokunuşla yönetin, akşam koltuk bazlı kasanızı net görün!",
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
      "Evet! Size özel berber yönetim panelinizden hizmet fiyatlarınızı, işlem sürelerinizi, açılış-kapanış saatlerinizi, ustalarınızı, koltuk özel fiyatlarınızı ve molalarınızı istediğiniz an tek dokunuşla güncelleyebilirsiniz.",
  },
  {
    question: "Kurulum ne kadar sürer?",
    answer:
      "Sadece 10 dakika! Bize WhatsApp'tan ulaştığınızda dükkan adınızı, ustalarınızı ve hizmet listenizi anahtar teslim olarak biz tanımlıyoruz. Size sadece özel linkinizi paylaşmak ve randevuları kabul etmek kalıyor.",
  },
];

const SCENARIO_TABS: {
  id: ScenarioKey;
  emoji: string;
  label: string;
  question: string;
}[] = [
  {
    id: "calendar",
    emoji: "📅",
    label: "Sürükle-Bırak Takvim",
    question: "60 dakikalık işlemde saatler nasıl otomatik bloklanır?",
  },
  {
    id: "blacklist",
    emoji: "🚨",
    label: "Kara Liste & IBAN Kilidi",
    question: "Müşteri randevusuna gelmezse sistem ne yapar?",
  },
  {
    id: "radar",
    emoji: "⚡",
    label: "Erken Gelebilir Radarı",
    question: "Bir müşteri iptal ederse boşalan koltuk nasıl dolar?",
  },
  {
    id: "chairs",
    emoji: "💺",
    label: "Çoklu Koltuk & Ciro",
    question: "Her ustanın kendi koltuğu ve cirosu nasıl takip edilir?",
  },
];

const CHAIR_DEMO_DATA = [
  {
    id: "all",
    name: "Tüm Salon",
    chair: "3 Aktif Koltuk",
    todayRevenue: "9.450 TL",
    monthRevenue: "186.200 TL",
    cuts: 18,
    fillRate: "%94",
  },
  {
    id: "k1",
    name: "Harun Usta",
    chair: "VIP Koltuk #1",
    todayRevenue: "4.650 TL",
    monthRevenue: "92.400 TL",
    cuts: 8,
    fillRate: "%100",
  },
  {
    id: "k2",
    name: "Mert Usta",
    chair: "VIP Koltuk #2",
    todayRevenue: "3.100 TL",
    monthRevenue: "61.800 TL",
    cuts: 6,
    fillRate: "%90",
  },
  {
    id: "k3",
    name: "Ömer Kalfa",
    chair: "Koltuk #3",
    todayRevenue: "1.700 TL",
    monthRevenue: "32.000 TL",
    cuts: 4,
    fillRate: "%88",
  },
];

// Quiet-Luxury Obsidian & Champagne Palette
const GLASS_CARD_CLASS =
  "bg-gradient-to-b from-white/[0.05] to-white/[0.015] backdrop-blur-xl border border-white/[0.09] hover:border-[#dfc39e]/35 shadow-[0_10px_36px_rgba(0,0,0,0.45)] transition-all duration-300";

const CHAMPAGNE_GRADIENT_TEXT =
  "bg-gradient-to-r from-[#f7ead9] via-[#dfc39e] to-[#ba8d55] bg-clip-text text-transparent";

export default function VipLandingPage({
  onOpenLiveDemo,
}: VipLandingPageProps) {
  const [activeView, setActiveView] = useState<LandingView>("home");
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("calendar");
  const [selectedChairId, setSelectedChairId] = useState<string>("all");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const switchView = (nextView: LandingView) => {
    setActiveView(nextView);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const activeChairStat =
    CHAIR_DEMO_DATA.find((c) => c.id === selectedChairId) ||
    CHAIR_DEMO_DATA[0];

  return (
    <div className="relative min-h-screen bg-[#08080a] text-[#faf6f0] selection:bg-[#dfc39e] selection:text-[#0c0a08] overflow-x-hidden">
      {/* =================================================================== */}
      {/* ARKA PLAN: DENGELİ ŞAMPANYA & ZÜMRÜT ORTAMSAL IŞIK DOKUSU           */}
      {/* =================================================================== */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[400px] bg-[#c89d66]/[0.11] blur-[140px] rounded-full" />
        <div className="absolute top-1/3 -right-32 w-[480px] h-[480px] bg-emerald-500/[0.06] blur-[150px] rounded-full" />
        <div className="absolute bottom-0 -left-24 w-[480px] h-[360px] bg-[#b4834b]/[0.08] blur-[140px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_0%,#000_65%,transparent_110%)]" />
      </div>

      {/* SAYFA İÇERİĞİ */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* =================================================================== */}
        {/* 1. ÜST BAR (STICKY VIP NAVBAR — SADECE TANITIM & DEMO/DENEME)      */}
        {/* =================================================================== */}
        <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#08080a]/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-3.5">
            {/* Sol: Ana Logo ve VIP RANDEVU SİSTEMİ */}
            <button
              type="button"
              onClick={() => switchView("home")}
              className="group flex items-center gap-2.5 shrink-0 text-left cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-192.png?v=2"
                alt="VIP Randevu Sistemi"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-[#dfc39e]/45 object-cover shadow-md shadow-[#c89d66]/15 transition-transform duration-300 group-hover:scale-105"
              />
              <div>
                <span
                  className={`block text-xs sm:text-base font-black tracking-wider ${CHAMPAGNE_GRADIENT_TEXT}`}
                >
                  VIP RANDEVU SİSTEMİ
                </span>
                <p className="hidden text-[10px] font-medium text-stone-400 sm:block">
                  Yeni Nesil Berber &amp; Kuaför Yönetim Platformu
                </p>
              </div>
            </button>

            {/* Orta: Çoklu Sayfa Sekme Navigasyonu (Masaüstü) */}
            <nav
              aria-label="Ana Menü"
              className="hidden md:flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1"
            >
              <button
                type="button"
                onClick={() => switchView("home")}
                className={`rounded-xl px-3.5 py-2 text-xs lg:text-sm font-bold transition-all cursor-pointer ${
                  activeView === "home"
                    ? "bg-[#dfc39e]/15 text-[#f6ead9] border border-[#dfc39e]/40 shadow-sm"
                    : "text-stone-400 hover:text-[#faf6f0] border border-transparent"
                }`}
              >
                🏠 Ana Vitrin
              </button>
              <button
                type="button"
                onClick={() => switchView("features")}
                className={`rounded-xl px-3.5 py-2 text-xs lg:text-sm font-bold transition-all cursor-pointer ${
                  activeView === "features"
                    ? "bg-[#dfc39e]/15 text-[#f6ead9] border border-[#dfc39e]/40 shadow-sm"
                    : "text-stone-400 hover:text-[#faf6f0] border border-transparent"
                }`}
              >
                ✨ Detaylı Özellikler
              </button>
              <button
                type="button"
                onClick={() => switchView("pricing")}
                className={`rounded-xl px-3.5 py-2 text-xs lg:text-sm font-bold transition-all cursor-pointer ${
                  activeView === "pricing"
                    ? "bg-[#dfc39e]/15 text-[#f6ead9] border border-[#dfc39e]/40 shadow-sm"
                    : "text-stone-400 hover:text-[#faf6f0] border border-transparent"
                }`}
              >
                💰 Fiyatlandırma &amp; S.S.S.
              </button>
            </nav>

            {/* Sağ: SADECE 🚀 7 Gün Ücretsiz Dene & 👀 Canlı Demo (Berber Girişi KALDIRILDI) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <button
                type="button"
                onClick={onOpenLiveDemo}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfc39e]/35 bg-[#dfc39e]/[0.07] hover:bg-[#dfc39e]/15 hover:border-[#dfc39e]/60 px-2.5 py-2 sm:px-3.5 sm:py-2.5 text-[11px] sm:text-xs font-bold text-[#f3e3ca] transition active:scale-95 cursor-pointer"
              >
                <span>👀 Canlı Demo</span>
              </button>

              <a
                href={FOUNDER_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 px-2.5 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-black text-[#04140c] shadow-lg shadow-emerald-500/20 transition hover:brightness-110 active:scale-95"
              >
                <span className="sm:hidden">🚀 Ücretsiz Dene</span>
                <span className="hidden sm:inline">🚀 7 Gün Ücretsiz Dene</span>
              </a>
            </div>
          </div>

          {/* Mobil Çoklu Sayfa Sekme Şeridi */}
          <div className="grid grid-cols-3 gap-1 border-t border-white/[0.07] bg-[#08080a]/95 px-2 py-1.5 md:hidden">
            <button
              type="button"
              onClick={() => switchView("home")}
              className={`rounded-lg py-1.5 text-[11px] font-bold transition cursor-pointer ${
                activeView === "home"
                  ? "bg-[#dfc39e]/15 text-[#f6ead9] border border-[#dfc39e]/35"
                  : "text-stone-400 border border-transparent"
              }`}
            >
              🏠 Ana Vitrin
            </button>
            <button
              type="button"
              onClick={() => switchView("features")}
              className={`rounded-lg py-1.5 text-[11px] font-bold transition cursor-pointer ${
                activeView === "features"
                  ? "bg-[#dfc39e]/15 text-[#f6ead9] border border-[#dfc39e]/35"
                  : "text-stone-400 border border-transparent"
              }`}
            >
              ✨ Özellikler
            </button>
            <button
              type="button"
              onClick={() => switchView("pricing")}
              className={`rounded-lg py-1.5 text-[11px] font-bold transition cursor-pointer ${
                activeView === "pricing"
                  ? "bg-[#dfc39e]/15 text-[#f6ead9] border border-[#dfc39e]/35"
                  : "text-stone-400 border border-transparent"
              }`}
            >
              💰 Fiyat &amp; S.S.S.
            </button>
          </div>
        </header>

        {/* =================================================================== */}
        {/* AKIŞKAN ÇOKLU SAYFA GEÇİŞ ALANI (SMOOTH MULTI-VIEW TRANSITION)       */}
        {/* =================================================================== */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            {/* --------------------------------------------------------------- */}
            {/* 1. GÖRÜNÜM: 🏠 ANA VİTRİN (İLK SAYFA)                           */}
            {/* --------------------------------------------------------------- */}
            {activeView === "home" && (
              <motion.div
                key="view-home"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="transition-all duration-500 ease-out"
              >
                {/* HERO SECTION */}
                <section className="relative pt-8 pb-12 sm:pt-14 sm:pb-16 lg:pt-16 lg:pb-20 px-4 sm:px-6">
                  <div className="mx-auto max-w-5xl text-center">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                      className="inline-flex items-center gap-2 rounded-full border border-[#dfc39e]/35 bg-[#dfc39e]/[0.07] backdrop-blur-xl px-4 py-1.5 text-xs sm:text-sm font-bold text-[#edd6b6]"
                    >
                      <Sparkles className="h-4 w-4 text-[#dfc39e] shrink-0" />
                      <span>
                        Türkiye&apos;nin En Gelişmiş Yeni Nesil Salon Yönetim
                        Sistemi
                      </span>
                    </motion.div>

                    <motion.h1
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.06 }}
                      className="mt-6 text-2xl sm:text-4xl md:text-5xl lg:text-[52px] font-black tracking-tight leading-[1.15] text-[#faf6f0]"
                    >
                      Tıraşınızı Bölüp Telefona Bakma Devri Bitti.{" "}
                      <span className={CHAMPAGNE_GRADIENT_TEXT}>
                        Koltuklarınız Hep Dolu, Kasanız Hep Kontrol Altında
                        Olsun!
                      </span>
                    </motion.h1>

                    <motion.p
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.12 }}
                      className="mx-auto mt-5 max-w-3xl text-sm sm:text-lg md:text-xl font-medium leading-relaxed text-stone-300"
                    >
                      Müşterileriniz uygulama indirmeden, şifreyle uğraşmadan
                      Instagram veya WhatsApp linkinizden 10 saniyede
                      randevusunu alsın.{" "}
                      <strong
                        className={`font-extrabold ${CHAMPAGNE_GRADIENT_TEXT}`}
                      >
                        SMS masrafı yok, karışıklık yok, boş kalan koltuk yok!
                      </strong>
                    </motion.p>

                    {/* 2 Ana Aksiyon Butonu */}
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.18 }}
                      className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 sm:gap-4 max-w-3xl mx-auto"
                    >
                      <a
                        href={FOUNDER_WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex-1 inline-flex items-center justify-center gap-2.5 rounded-2xl border border-emerald-300/60 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 px-6 py-4 text-sm sm:text-base font-black text-[#04130c] shadow-xl shadow-emerald-500/20 transition-all hover:brightness-105 hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <span>
                          💬 Dükkanım İçin 7 Gün Ücretsiz Kurulum İste
                          (WhatsApp)
                        </span>
                        <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
                      </a>

                      <button
                        type="button"
                        onClick={onOpenLiveDemo}
                        className="inline-flex items-center justify-center gap-2.5 rounded-2xl border border-[#dfc39e]/45 bg-[#dfc39e]/[0.07] backdrop-blur-xl hover:border-[#dfc39e]/75 hover:bg-[#dfc39e]/15 px-6 py-4 text-sm sm:text-base font-black text-[#f4e5cf] shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                      >
                        <Eye className="h-5 w-5 text-[#dfc39e] shrink-0" />
                        <span>👀 Müşteri Ekranını Canlı Test Et</span>
                      </button>
                    </motion.div>

                    {/* Güven Rozetleri */}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 text-xs sm:text-sm font-bold">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-emerald-300 ${GLASS_CARD_CLASS}`}
                      >
                        <span>✅ Sıfır SMS Maliyeti</span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[#ead4b5] ${GLASS_CARD_CLASS}`}
                      >
                        <span>✅ iPhone &amp; Android Tam Uyumlu</span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-emerald-300 ${GLASS_CARD_CLASS}`}
                      >
                        <span>✅ 10 Dakikada Anahtar Teslim Kurulum</span>
                      </span>
                    </div>

                    {/* Canlı Sistem Önizleme Kartı */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.24 }}
                      className={`mt-10 rounded-3xl p-4 sm:p-6 text-left ${GLASS_CARD_CLASS}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3.5 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#dfc39e]/80" />
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                          <span
                            className={`ml-2 text-xs font-extrabold uppercase tracking-wider ${CHAMPAGNE_GRADIENT_TEXT}`}
                          >
                            💈 Canlı Berber Komuta Paneli Önizlemesi
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                            🟢 Koltuk Doluluk: %95
                          </span>
                          <span className="hidden sm:inline-block rounded-lg border border-[#dfc39e]/30 bg-[#dfc39e]/10 px-2.5 py-1 text-[11px] font-bold text-[#ecd6b7]">
                            💰 Günlük Kasa: +9.450 TL
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.08] to-white/[0.01] p-3.5">
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                            <span>⏰ 14:00 - 14:30 • VIP Koltuk #1</span>
                            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black">
                              ONAYLI ✓
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm font-black text-[#faf6f0]">
                            Burak Yılmaz — Saç + Sakal VIP
                          </p>
                          <p className="mt-1 text-[11px] font-medium text-stone-300">
                            ⚡ Erken boşluk olursa gelebilir • 650 TL
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[#dfc39e]/30 bg-gradient-to-b from-[#dfc39e]/[0.09] to-white/[0.01] p-3.5">
                          <div className="flex items-center justify-between text-xs font-bold text-[#ead4b5]">
                            <span>⏰ 14:30 - 15:30 • VIP Koltuk #2</span>
                            <span className="rounded bg-[#dfc39e]/20 px-2 py-0.5 text-[10px] font-black">
                              60 DK BLOK
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm font-black text-[#faf6f0]">
                            Emre Demir — VIP Damat Paketi
                          </p>
                          <p className="mt-1 text-[11px] font-medium text-stone-300">
                            💺 Tek parmakla sürükle-bırak saat taşıma • 1.500 TL
                          </p>
                        </div>

                        <div className="rounded-2xl border border-rose-400/25 bg-gradient-to-b from-rose-500/[0.08] to-white/[0.01] p-3.5">
                          <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                            <span>🚨 Kara Liste &amp; IBAN Koruması</span>
                            <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-black">
                              KAPORA ŞARTLI
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm font-black text-[#faf6f0]">
                            Gelmeyen Müşteri Koruması Aktif
                          </p>
                          <p className="mt-1 text-[11px] font-medium text-stone-300">
                            💳 IBAN dekontu gelmeden koltuk saati kapanmaz!
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* ESKİ USUL vs VIP RANDEVU SİSTEMİ KARŞILAŞTIRMASI */}
                <section className="py-12 sm:py-16 px-4 sm:px-6 border-t border-white/[0.07]">
                  <div className="mx-auto max-w-6xl">
                    <div className="text-center max-w-3xl mx-auto mb-10">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfc39e]/30 bg-[#dfc39e]/[0.07] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#ebd4b3]">
                        Neden Geçmelisiniz?
                      </span>
                      <h2 className="mt-3 text-2xl sm:text-4xl font-black text-[#faf6f0]">
                        Eski Usul vs.{" "}
                        <span className={CHAMPAGNE_GRADIENT_TEXT}>
                          VIP Randevu Sistemi
                        </span>
                      </h2>
                      <p className="mt-2.5 text-sm sm:text-base text-stone-300">
                        Telefon trafiği ve unutulan randevular yüzünden her ay
                        binlerce lira kaybetmeye son verin.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Sol Kart: Klasik Defter */}
                      <div className={`rounded-3xl p-6 sm:p-8 ${GLASS_CARD_CLASS}`}>
                        <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-400/30 text-rose-300">
                            <X className="h-5 w-5 stroke-[2.5]" />
                          </div>
                          <div>
                            <h3 className="text-lg sm:text-xl font-black text-rose-200">
                              ❌ Klasik Defter &amp; Telefon Trafiği
                            </h3>
                            <p className="text-xs font-medium text-rose-300/75">
                              Zaman, müşteri ve ciro kaybettiren eski düzen
                            </p>
                          </div>
                        </div>

                        <ul className="mt-5 space-y-3.5">
                          {COMPARISON_OLD_WAY.map((item, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5"
                            >
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-300 font-black text-xs">
                                ✕
                              </span>
                              <span className="text-sm font-semibold text-stone-200">
                                &ldquo;{item}&rdquo;
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Sağ Kart: VIP Randevu Sistemi */}
                      <div
                        className={`relative rounded-3xl p-6 sm:p-8 ${GLASS_CARD_CLASS} border-[#dfc39e]/30`}
                      >
                        <div className="absolute -top-3.5 right-6 rounded-full border border-[#f5e4ca]/70 bg-gradient-to-r from-[#f3e3ca] via-[#dfc39e] to-[#c4975d] px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#120d08] shadow-md">
                          👑 Profesyonel Çözüm
                        </div>

                        <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-300">
                            <Check className="h-5 w-5 stroke-[2.5]" />
                          </div>
                          <div>
                            <h3
                              className={`text-lg sm:text-xl font-black ${CHAMPAGNE_GRADIENT_TEXT}`}
                            >
                              ✅ VIP Randevu Sistemi
                            </h3>
                            <p className="text-xs font-medium text-emerald-300/90">
                              7/24 otomatik çalışan, koltukları dolduran akıllı
                              sistem
                            </p>
                          </div>
                        </div>

                        <ul className="mt-5 space-y-3.5">
                          {COMPARISON_VIP_WAY.map((item, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/[0.08] to-[#dfc39e]/[0.04] p-3.5"
                            >
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[#05150d] font-black text-xs">
                                ✓
                              </span>
                              <span className="text-sm font-bold text-[#faf6f0]">
                                &ldquo;{item}&rdquo;
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 6 ANA ÖZELLİĞİN ÖZETİ + DETAY SAYFASINA GEÇİŞ BUTONU */}
                <section className="py-12 sm:py-16 px-4 sm:px-6 border-t border-white/[0.07]">
                  <div className="mx-auto max-w-6xl">
                    <div className="text-center max-w-3xl mx-auto mb-10">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfc39e]/30 bg-[#dfc39e]/[0.07] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#ebd4b3]">
                        <Sparkles className="h-3.5 w-3.5 text-[#dfc39e]" />
                        <span>6 Ana Özellik Özeti</span>
                      </span>
                      <h2 className="mt-3 text-2xl sm:text-4xl font-black text-[#faf6f0]">
                        Rakipsiz{" "}
                        <span className={CHAMPAGNE_GRADIENT_TEXT}>
                          6 Süper Özellik
                        </span>
                      </h2>
                      <p className="mt-2.5 text-sm sm:text-base text-stone-300">
                        Türkiye&apos;deki berber ve kuaför esnafının gerçek
                        ihtiyaçlarına göre özel olarak geliştirildi.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {SUPER_FEATURES.map((feat, idx) => {
                        const IconComponent = feat.icon;
                        return (
                          <div
                            key={idx}
                            className={`group relative overflow-hidden rounded-3xl p-6 hover:-translate-y-1 ${GLASS_CARD_CLASS} ${feat.accentBorder}`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-4">
                              <div
                                className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${feat.iconClass}`}
                              >
                                <IconComponent className="h-5 w-5" />
                              </div>
                              <span className="text-xl">{feat.emoji}</span>
                            </div>

                            <h3 className="text-base font-black text-[#faf6f0] group-hover:text-[#ebd4b3] transition-colors">
                              {feat.title}
                            </h3>

                            <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-stone-300">
                              {feat.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Ekstra Sayfaya Akışkan Geçiş Butonu */}
                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => switchView("features")}
                        className="group inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl border border-[#dfc39e]/60 bg-gradient-to-r from-[#f3e3ca] via-[#dfc39e] to-[#c4975d] px-7 py-4 text-sm sm:text-base font-black text-[#120d08] shadow-xl shadow-[#c89d66]/15 transition-all hover:brightness-105 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                      >
                        <span>
                          ✨ Sistemin Tüm Detaylarını &amp; Ekranlarını İncele →
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => switchView("pricing")}
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-[#dfc39e]/40 px-6 py-4 text-sm font-bold text-stone-200 transition cursor-pointer"
                      >
                        <span>💰 Fiyatlandırma &amp; S.S.S. Gör</span>
                      </button>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* 2. GÖRÜNÜM: ✨ DETAYLI ÖZELLİKLER & NASIL ÇALIŞIR?              */}
            {/* --------------------------------------------------------------- */}
            {activeView === "features" && (
              <motion.div
                key="view-features"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="transition-all duration-500 ease-out py-10 sm:py-14 px-4 sm:px-6"
              >
                <div className="mx-auto max-w-6xl space-y-12">
                  {/* Üst Başlık & Geri Dönüş */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
                    <div>
                      <button
                        type="button"
                        onClick={() => switchView("home")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-stone-300 hover:text-[#f6ead9] hover:border-[#dfc39e]/40 transition cursor-pointer"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Ana Vitrine Dön</span>
                      </button>
                      <h1 className="mt-4 text-2xl sm:text-4xl font-black text-[#faf6f0]">
                        Detaylı Özellikler &amp;{" "}
                        <span className={CHAMPAGNE_GRADIENT_TEXT}>
                          Gerçek Salon Senaryoları
                        </span>
                      </h1>
                      <p className="mt-2 max-w-2xl text-sm sm:text-base text-stone-300">
                        Sistemin günlük salon akışında karşılaşılan her sorunu
                        nasıl otomatik çözdüğünü adım adım inceleyin.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => switchView("pricing")}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#dfc39e]/45 bg-[#dfc39e]/10 px-4 py-2.5 text-xs sm:text-sm font-black text-[#f4e5cf] hover:bg-[#dfc39e]/20 transition cursor-pointer self-start"
                    >
                      <span>💰 Paket &amp; Fiyatları Gör →</span>
                    </button>
                  </div>

                  {/* İNTERAKTİF SENARYO SEÇİCİ */}
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {SCENARIO_TABS.map((tab) => {
                        const active = activeScenario === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveScenario(tab.id)}
                            className={`rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                              active
                                ? "border-[#dfc39e]/65 bg-[#dfc39e]/15 text-[#faf6f0] shadow-lg shadow-[#c89d66]/10"
                                : "border-white/[0.08] bg-white/[0.03] text-stone-300 hover:border-white/20"
                            }`}
                          >
                            <div className="text-lg">{tab.emoji}</div>
                            <div className="mt-1 text-xs sm:text-sm font-black">
                              {tab.label}
                            </div>
                            <div className="mt-0.5 text-[11px] text-stone-400 line-clamp-2">
                              {tab.question}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* İnteraktif Senaryo Detay Kartı */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeScenario}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className={`rounded-3xl p-5 sm:p-8 ${GLASS_CARD_CLASS}`}
                      >
                        {activeScenario === "calendar" && (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                            <div className="space-y-4">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfc39e]/35 bg-[#dfc39e]/10 px-3 py-1 text-xs font-bold text-[#ebd4b3]">
                                📅 Sürükle-Bırak Akıllı Zaman Çizelgesi
                              </span>
                              <h2 className="text-xl sm:text-2xl font-black text-[#faf6f0]">
                                30, 60 ve 90 Dakikalık İşlemleri Otomatik Bloklar
                              </h2>
                              <p className="text-sm text-stone-300 leading-relaxed">
                                Müşteri 60 dakikalık &ldquo;VIP Damat Paketi&rdquo; veya 45 dakikalık &ldquo;Saç + Sakal + Maske&rdquo; seçtiğinde sistem ardışık saat dilimlerini otomatik olarak tek blok halinde kapatır; çakışmaya kesinlikle izin vermez.
                              </p>
                              <ul className="space-y-2.5 text-xs sm:text-sm text-stone-200">
                                <li className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                  <span>İçinde bulunulan 30 dk&apos;lık aktif dilim (örn. 14:00-14:29) kapıdan giren müşteri için açık kalır.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                  <span>Tek parmakla sürükle-bırak veya dokunmatik &ldquo;Saati Taşı&rdquo; ile çakışmasız saat kaydırma.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                  <span>Tek tuşla öğle molası veya usta özel izni kilitleme.</span>
                                </li>
                              </ul>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-[#0d0d10] p-4 space-y-2.5">
                              <div className="flex items-center justify-between text-xs font-bold text-stone-400 border-b border-white/10 pb-2">
                                <span>🕒 Canlı Saat Çizelgesi Örneği</span>
                                <span className="text-emerald-300">VIP Koltuk #1</span>
                              </div>
                              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                                <span className="font-mono text-xs font-black text-emerald-300">14:00</span>
                                <div className="flex-1">
                                  <p className="text-xs font-black text-white">🟢 ŞU ANKİ SAAT • Müsait</p>
                                  <p className="text-[11px] text-stone-300">Kapıdan giren müşteriye anında eklenebilir</p>
                                </div>
                              </div>
                              <div className="flex items-stretch gap-3 rounded-xl border border-[#dfc39e]/45 bg-[#dfc39e]/10 p-3">
                                <div className="flex flex-col justify-between font-mono text-xs font-black text-[#edd6b6]">
                                  <span>14:30</span>
                                  <span className="text-[10px] opacity-70">↓ 60 dk</span>
                                  <span>15:30</span>
                                </div>
                                <div className="flex-1 border-l border-[#dfc39e]/25 pl-3">
                                  <span className="rounded bg-[#dfc39e]/20 px-2 py-0.5 text-[10px] font-black text-[#edd6b6]">
                                    OTOMATİK 2 SLOT BLOK
                                  </span>
                                  <p className="mt-1 text-xs font-black text-white">Emre Demir — VIP Damat Paketi</p>
                                  <p className="text-[11px] text-stone-300">14:30 ve 15:00 vitrinde otomatik kapandı</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeScenario === "blacklist" && (
                          <div className="space-y-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/35 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-300">
                                  🚨 Senaryo: Müşteri Randevuya Gelmezse Ne Olur?
                                </span>
                                <h2 className="mt-2 text-xl sm:text-2xl font-black text-[#faf6f0]">
                                  Kara Liste &amp; Otomatik IBAN Kapora Kilidi
                                </h2>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                              {[
                                {
                                  step: "1. Adım",
                                  title: "Gelmedi İşaretlenir",
                                  desc: "Randevuya haber vermeden gelmeyen müşteri panelden tek tıkla 'Gelmedi (No-Show)' işaretlenir.",
                                },
                                {
                                  step: "2. Adım",
                                  title: "Ortak Kara Liste Ağı",
                                  desc: "Telefon numarası anında Ortak Kara Liste Ağına alınır ve güven kalkanı devreye girer.",
                                },
                                {
                                  step: "3. Adım",
                                  title: "IBAN Kapora Şartı",
                                  desc: "Aynı numara tekrar randevu almak istediğinde sistem IBAN bilginizi ve zorunlu kapora uyarısını gösterir.",
                                },
                                {
                                  step: "4. Adım",
                                  title: "Onay Bekler",
                                  desc: "Müşteri WhatsApp'tan dekont atıp siz 'Onayla' demeden koltuk saati kesinleşmez!",
                                },
                              ].map((item, i) => (
                                <div
                                  key={i}
                                  className="rounded-2xl border border-rose-400/20 bg-[#0d0d10] p-4 space-y-2"
                                >
                                  <span className="inline-block rounded-lg bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-black text-rose-300">
                                    {item.step}
                                  </span>
                                  <h3 className="text-sm font-black text-[#faf6f0]">
                                    {item.title}
                                  </h3>
                                  <p className="text-xs text-stone-300 leading-relaxed">
                                    {item.desc}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeScenario === "radar" && (
                          <div className="space-y-5">
                            <div>
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                                ⚡ Senaryo: Boşalan Koltuğu 1 Dakikada Doldurun
                              </span>
                              <h2 className="mt-2 text-xl sm:text-2xl font-black text-[#faf6f0]">
                                &ldquo;Erken Gelebilir&rdquo; Yedek Müşteri Radarı
                              </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="rounded-2xl border border-white/10 bg-[#0d0d10] p-4 space-y-2">
                                <Clock className="h-5 w-5 text-[#dfc39e]" />
                                <h3 className="text-sm font-black text-white">
                                  1. İptal Anında Radar Çalışır
                                </h3>
                                <p className="text-xs text-stone-300 leading-relaxed">
                                  Saat 15:00 randevusu iptal edildiğinde sistem, aynı gün daha geç saatlere randevu almış ve &ldquo;Erken boşluk olursa gelebilir&rdquo; kutusunu işaretlemiş müşterileri tarar.
                                </p>
                              </div>

                              <div className="rounded-2xl border border-emerald-400/25 bg-[#0d0d10] p-4 space-y-2">
                                <MessageSquare className="h-5 w-5 text-emerald-400" />
                                <h3 className="text-sm font-black text-white">
                                  2. Tek Tıkla WhatsApp Teklifi
                                </h3>
                                <p className="text-xs text-stone-300 leading-relaxed">
                                  Ekranda beliren uyarı kartından tek tuşa basarsınız; müşteriye &ldquo;Saat 15:00 koltuğumuz boşaldı, öne çekelim mi?&rdquo; mesajı hazır açılır.
                                </p>
                              </div>

                              <div className="rounded-2xl border border-[#dfc39e]/30 bg-[#0d0d10] p-4 space-y-2">
                                <TrendingUp className="h-5 w-5 text-[#dfc39e]" />
                                <h3 className="text-sm font-black text-white">
                                  3. Sıfır Ciro Kaybı
                                </h3>
                                <p className="text-xs text-stone-300 leading-relaxed">
                                  Müşteri onayladığında tek dokunuşla saati öne kaydırırsınız; hem eski saati açılır hem koltuğunuz boş kalmaz.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeScenario === "chairs" && (
                          <div className="space-y-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfc39e]/35 bg-[#dfc39e]/10 px-3 py-1 text-xs font-bold text-[#ebd4b3]">
                                  💺 İnteraktif Önizleme: Koltuk Seçin
                                </span>
                                <h2 className="mt-2 text-xl sm:text-2xl font-black text-[#faf6f0]">
                                  Çoklu Koltuk &amp; Usta Bazlı Ciro Takibi
                                </h2>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {CHAIR_DEMO_DATA.map((chair) => (
                                  <button
                                    key={chair.id}
                                    type="button"
                                    onClick={() => setSelectedChairId(chair.id)}
                                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                      selectedChairId === chair.id
                                        ? "border-[#dfc39e] bg-[#dfc39e] text-[#120d08]"
                                        : "border-white/10 bg-[#0d0d10] text-stone-300 hover:border-white/25"
                                    }`}
                                  >
                                    {chair.name}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="rounded-2xl border border-white/10 bg-[#0d0d10] p-4">
                                <span className="text-[11px] font-bold text-stone-400">
                                  Seçili Koltuk
                                </span>
                                <p className="mt-1 text-sm sm:text-base font-black text-[#faf6f0]">
                                  {activeChairStat.chair}
                                </p>
                              </div>
                              <div className="rounded-2xl border border-emerald-500/25 bg-[#0d0d10] p-4">
                                <span className="text-[11px] font-bold text-emerald-300">
                                  Bugünkü Kasa
                                </span>
                                <p className="mt-1 text-sm sm:text-lg font-black text-emerald-300">
                                  {activeChairStat.todayRevenue}
                                </p>
                              </div>
                              <div className="rounded-2xl border border-[#dfc39e]/30 bg-[#0d0d10] p-4">
                                <span className="text-[11px] font-bold text-[#edd6b6]">
                                  Bu Ay Toplam
                                </span>
                                <p className="mt-1 text-sm sm:text-lg font-black text-[#edd6b6]">
                                  {activeChairStat.monthRevenue}
                                </p>
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-[#0d0d10] p-4">
                                <span className="text-[11px] font-bold text-stone-400">
                                  Bugün Tıraş / Doluluk
                                </span>
                                <p className="mt-1 text-sm sm:text-base font-black text-[#faf6f0]">
                                  {activeChairStat.cuts} Tıraş • {activeChairStat.fillRate}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* NASIL ÇALIŞIR? (3 ADIMDA HIZLI BAŞLANGIÇ) */}
                  <div className="border-t border-white/[0.07] pt-10">
                    <div className="text-center max-w-2xl mx-auto mb-8">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                        Anahtar Teslim Hızlı Kurulum
                      </span>
                      <h2 className="mt-3 text-2xl sm:text-3xl font-black text-[#faf6f0]">
                        Nasıl Çalışır?{" "}
                        <span className={CHAMPAGNE_GRADIENT_TEXT}>
                          (3 Adımda Başlangıç)
                        </span>
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {HOW_IT_WORKS_STEPS.map((item, idx) => (
                        <div
                          key={idx}
                          className={`rounded-3xl p-6 ${GLASS_CARD_CLASS}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <span className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#f3e3ca] via-[#dfc39e] to-[#c4975d] px-3 py-1 text-xs font-black text-[#120d08]">
                              {item.step}
                            </span>
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                              {item.badge}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-[#faf6f0]">
                            {item.title}
                          </h3>
                          <p className="mt-2 text-xs sm:text-sm text-stone-300 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ALT GEÇİŞ ÇUBUĞU */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
                    <button
                      type="button"
                      onClick={() => switchView("pricing")}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-[#dfc39e]/55 bg-gradient-to-r from-[#f3e3ca] via-[#dfc39e] to-[#c4975d] px-7 py-4 text-sm font-black text-[#120d08] shadow-lg transition hover:brightness-105 cursor-pointer"
                    >
                      <span>💰 Fiyatlandırma &amp; S.S.S. Sayfasına Geç →</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenLiveDemo}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] px-6 py-4 text-sm font-bold text-stone-200 transition cursor-pointer"
                    >
                      <Eye className="h-4 w-4 text-[#dfc39e]" />
                      <span>👀 Canlı Demo Test Et</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* 3. GÖRÜNÜM: 💰 FİYATLANDIRMA & SIKÇA SORULAN SORULAR (S.S.S.)   */}
            {/* --------------------------------------------------------------- */}
            {activeView === "pricing" && (
              <motion.div
                key="view-pricing"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="transition-all duration-500 ease-out py-10 sm:py-14 px-4 sm:px-6"
              >
                <div className="mx-auto max-w-4xl space-y-12">
                  {/* Üst Başlık & Geri Dönüş */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
                    <div>
                      <button
                        type="button"
                        onClick={() => switchView("home")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-stone-300 hover:text-[#f6ead9] hover:border-[#dfc39e]/40 transition cursor-pointer"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Ana Vitrine Dön</span>
                      </button>
                      <h1 className="mt-4 text-2xl sm:text-4xl font-black text-[#faf6f0]">
                        Şeffaf{" "}
                        <span className={CHAMPAGNE_GRADIENT_TEXT}>
                          Fiyatlandırma
                        </span>{" "}
                        &amp; S.S.S.
                      </h1>
                      <p className="mt-2 text-sm sm:text-base text-stone-300">
                        Sürpriz fatura yok, kontör/SMS paketi dayatması yok. Tek
                        paket, tüm VIP özellikler dahil!
                      </p>
                    </div>
                  </div>

                  {/* VIP SALON PAKETİ KARTI */}
                  <div className="relative mx-auto max-w-xl rounded-3xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] backdrop-blur-2xl border border-[#dfc39e]/55 hover:border-[#dfc39e]/80 p-6 sm:p-10 shadow-[0_14px_48px_rgba(200,157,102,0.14)] transition-all duration-300">
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#f7ead9]/70 bg-gradient-to-r from-[#f3e3ca] via-[#dfc39e] to-[#c4975d] px-4 py-1 text-[11px] font-black uppercase tracking-wider text-[#120d08] shadow-md">
                      👑 HER ŞEY DAHİL • GÜNDE 1 ÇAY PARASINA
                    </div>

                    <div className="text-center border-b border-white/10 pb-6 pt-2">
                      <h2
                        className={`text-xl sm:text-2xl font-black ${CHAMPAGNE_GRADIENT_TEXT}`}
                      >
                        👑 VIP SALON PAKETİ (Her Şey Dahil)
                      </h2>
                      <p className="mt-2 text-xs sm:text-sm font-medium text-stone-300">
                        Dükkanınızın tüm randevu, koltuk ve kasa kontrolü tek
                        ekranda
                      </p>
                    </div>

                    <ul className="my-7 space-y-3.5">
                      {[
                        "Sınırsız Randevu & Sınırsız Müşteri",
                        "Çoklu Koltuk / Usta Ekleme & Özel Fiyatlar",
                        "Kara Liste & IBAN Kapora Koruması Dahil",
                        "7/24 Teknik Destek & 10 Dakikada Ücretsiz Kurulum",
                        "Sıfır SMS Maliyeti — Sınırsız WhatsApp Randevu Fişi",
                        "Dükkanınıza Özel QR Kod Afişi & Instagram Linki",
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[#05150d] font-black text-xs">
                            ✓
                          </span>
                          <span className="text-sm sm:text-base font-bold text-[#faf6f0]">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <a
                      href={FOUNDER_WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/60 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 py-4 px-5 text-center text-sm sm:text-base font-black text-[#04140c] shadow-lg shadow-emerald-500/20 transition hover:brightness-105 active:scale-[0.99]"
                    >
                      <span>
                        🚀 Şimdi 7 Gün Ücretsiz Deneyin — Kredi Kartı Gerekmez
                      </span>
                    </a>

                    <p className="mt-3 text-center text-[11px] font-medium text-stone-400">
                      Memnun kalmazsanız hiçbir taahhüt olmadan istediğiniz an
                      bırakabilirsiniz.
                    </p>
                  </div>

                  {/* NEDEN SMS ÜCRETİ YOK? KUTUSU */}
                  <div className={`rounded-3xl p-6 sm:p-8 ${GLASS_CARD_CLASS}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/35 bg-emerald-500/15 text-emerald-300">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg sm:text-xl font-black text-[#faf6f0]">
                            💬 Neden SMS Ücreti Yok?
                          </h3>
                          <span className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                            %100 Tasarruf
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                          Diğer randevu yazılımları her randevu onayı ve
                          hatırlatma için sizden ayrı ayrı SMS kontör ücreti
                          keser. Bizim sistemimiz doğrudan{" "}
                          <strong className="text-[#edd6b6]">
                            Akıllı WhatsApp Randevu Fişi
                          </strong>{" "}
                          teknolojisiyle çalışır. Müşteriniz randevusunu aldığı
                          anda doğrulama kodlu, saatli ve fiyatlı fişi kendi
                          WhatsApp hattınız üzerinden ücretsiz iletilir; ayda
                          binlerce randevu alsanız bile tek kuruş ek mesaj
                          faturası ödemezsiniz.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SIKÇA SORULAN SORULAR (ACCORDION) */}
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfc39e]/30 bg-[#dfc39e]/[0.07] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#ebd4b3]">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#dfc39e]" />
                        <span>Merak Edilenler</span>
                      </span>
                      <h2 className="mt-3 text-2xl sm:text-3xl font-black text-[#faf6f0]">
                        Sıkça Sorulan{" "}
                        <span className={CHAMPAGNE_GRADIENT_TEXT}>Sorular</span>
                      </h2>
                    </div>

                    <div className="space-y-3">
                      {FAQ_ITEMS.map((faq, idx) => {
                        const isOpen = openFaqIndex === idx;
                        return (
                          <div
                            key={idx}
                            className={`rounded-2xl ${GLASS_CARD_CLASS} ${
                              isOpen ? "border-[#dfc39e]/45" : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setOpenFaqIndex(isOpen ? null : idx)
                              }
                              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
                            >
                              <span className="text-sm sm:text-base font-black text-[#faf6f0]">
                                {faq.question}
                              </span>
                              <ChevronDown
                                className={`h-5 w-5 shrink-0 text-[#dfc39e] transition-transform duration-200 ${
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
                                  transition={{ duration: 0.22 }}
                                  className="overflow-hidden"
                                >
                                  <div className="border-t border-white/[0.08] px-5 py-4 text-xs sm:text-sm font-medium leading-relaxed text-stone-300">
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

                  {/* ALT GEÇİŞ ÇUBUĞU */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => switchView("home")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] px-4 py-2.5 text-xs font-bold text-stone-200 transition cursor-pointer"
                    >
                      <Home className="h-3.5 w-3.5 text-[#dfc39e]" />
                      <span>Ana Vitrin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchView("features")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] px-4 py-2.5 text-xs font-bold text-stone-200 transition cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#dfc39e]" />
                      <span>Detaylı Özellikler</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* ALT FOOTER (BERBER GİRİŞİ YOK) */}
        <footer className="border-t border-white/[0.08] bg-black/40 backdrop-blur-xl py-8 px-4 sm:px-6 pb-24 sm:pb-10">
          <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <button
              type="button"
              onClick={() => switchView("home")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-192.png?v=2"
                alt="VIP Randevu Sistemi"
                className="h-8 w-8 rounded-lg border border-[#dfc39e]/40 object-cover"
              />
              <span
                className={`text-sm font-black tracking-wider ${CHAMPAGNE_GRADIENT_TEXT}`}
              >
                VIP RANDEVU SİSTEMİ
              </span>
            </button>
            <p className="text-xs text-stone-400">
              © {new Date().getFullYear()} VIP Berber &amp; Kuaför Randevu
              Sistemi. Tüm hakları saklıdır.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-stone-300">
              <button
                type="button"
                onClick={() => switchView("home")}
                className="hover:text-[#dfc39e] transition cursor-pointer"
              >
                Ana Vitrin
              </button>
              <button
                type="button"
                onClick={() => switchView("features")}
                className="hover:text-[#dfc39e] transition cursor-pointer"
              >
                Detaylı Özellikler
              </button>
              <button
                type="button"
                onClick={() => switchView("pricing")}
                className="hover:text-[#dfc39e] transition cursor-pointer"
              >
                Fiyatlandırma &amp; S.S.S.
              </button>
              <button
                type="button"
                onClick={onOpenLiveDemo}
                className="text-[#edd6b6] hover:text-white transition cursor-pointer"
              >
                Canlı Demo
              </button>
            </div>
          </div>
        </footer>

        {/* SAĞ ALT KÖŞEDE SABİT YEŞİL WHATSAPP BALONU */}
        <a
          href={FOUNDER_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2.5 rounded-full border border-emerald-300/70 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 px-4 py-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-black text-[#04130c] shadow-xl shadow-emerald-500/30 transition-transform hover:scale-105 active:scale-95"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#04130c] opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#04130c]" />
          </span>
          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 fill-[#04130c] shrink-0" />
          <span>💬 WhatsApp İletişim / Demo İste</span>
        </a>
      </div>
    </div>
  );
}
