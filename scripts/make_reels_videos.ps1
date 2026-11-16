# scripts/make_reels_videos.ps1
# 3 Tam Otomatik Reels Reklam Videosunu 9:16 (720x1280) H.264 MP4 Olarak Üretir

Add-Type -AssemblyName System.Drawing

$ffmpeg = "C:\Program Files\Softdeluxe\Free Download Manager\ffmpeg.exe"
if (-not (Test-Path $ffmpeg)) {
    $ffmpeg = "C:\Program Files\BlueStacks_nxt\ffmpeg.exe"
}

$baseDir = Get-Location
$outDir1 = Join-Path $baseDir "reels-videolari"
$outDir2 = Join-Path $baseDir "public\reels-videolari"
$tmpDir  = Join-Path $baseDir "tmp_reels_render"

if (-not (Test-Path $outDir1)) { New-Item -ItemType Directory -Force -Path $outDir1 | Out-Null }
if (-not (Test-Path $outDir2)) { New-Item -ItemType Directory -Force -Path $outDir2 | Out-Null }
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

$width  = 720
$height = 1280
$fps    = 20
$durationSec = 18
$totalFrames = $fps * $durationSec # 360 frames

$fontFamily = New-Object System.Drawing.FontFamily "Arial"
$fontBrand   = New-Object System.Drawing.Font $fontFamily, 22, ([System.Drawing.FontStyle]::Bold)
$fontSub     = New-Object System.Drawing.Font $fontFamily, 32, ([System.Drawing.FontStyle]::Bold)
$fontTitle   = New-Object System.Drawing.Font $fontFamily, 34, ([System.Drawing.FontStyle]::Bold)
$fontCard    = New-Object System.Drawing.Font $fontFamily, 24, ([System.Drawing.FontStyle]::Bold)
$fontSmall   = New-Object System.Drawing.Font $fontFamily, 18, ([System.Drawing.FontStyle]::Bold)
$fontBadge   = New-Object System.Drawing.Font $fontFamily, 16, ([System.Drawing.FontStyle]::Bold)
$fontCounter = New-Object System.Drawing.Font $fontFamily, 64, ([System.Drawing.FontStyle]::Bold)

# Renkler
$cDarkBg    = [System.Drawing.Color]::FromArgb(10, 10, 14)
$cGold      = [System.Drawing.Color]::FromArgb(245, 158, 11)
$cGreen     = [System.Drawing.Color]::FromArgb(16, 185, 129)
$cRed       = [System.Drawing.Color]::FromArgb(239, 68, 68)
$cWhite     = [System.Drawing.Color]::FromArgb(255, 255, 255)
$cBlack     = [System.Drawing.Color]::FromArgb(0, 0, 0)
$cCardBg    = [System.Drawing.Color]::FromArgb(24, 24, 30)
$cCardBorder= [System.Drawing.Color]::FromArgb(60, 60, 75)

function DrawTextOutlined($g, $text, $font, $brushFill, $colorOutline, $x, $y, $format) {
    $penOutline = New-Object System.Drawing.Pen $colorOutline, 6
    $penOutline.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $stringFormat = New-Object System.Drawing.StringFormat
    if ($format -eq "center") {
        $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
        $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    }
    $path.AddString($text, $font.FontFamily, [int]$font.Style, $font.Size * 1.333, (New-Object System.Drawing.PointF $x, $y), $stringFormat)
    $g.DrawPath($penOutline, $path)
    $g.FillPath($brushFill, $path)
    $path.Dispose()
    $penOutline.Dispose()
}

function RenderFrame($videoIndex, $frameIndex) {
    $timeSec = $frameIndex / $fps
    $sceneIdx = [Math]::Min(2, [int][Math]::Floor($timeSec / 6.0))
    $sceneProgress = ($timeSec % 6.0) / 6.0

    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # 1. Koyu Lüks Arka Plan
    $g.Clear($cDarkBg)

    # Arka Plan Ambiyans Işığı (Hafif altın / yeşil daire)
    $brushGlow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(25, 245, 158, 11))
    $g.FillEllipse($brushGlow, 100, 200, 520, 520)
    $brushGlow.Dispose()

    # Berber direği çizgileri (sol ve sağ kenar)
    $stripeOffset = [int](($frameIndex * 4) % 40)
    for ($sy = -40; $sy -lt $height; $sy += 40) {
        $ypos = $sy + $stripeOffset
        $brushRed = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 239, 68, 68))
        $brushBlue = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 59, 130, 246))
        $g.FillRectangle($brushRed, 0, $ypos, 10, 20)
        $g.FillRectangle($brushBlue, 0, $ypos + 20, 10, 20)
        $g.FillRectangle($brushRed, $width - 10, $ypos, 10, 20)
        $g.FillRectangle($brushBlue, $width - 10, $ypos + 20, 10, 20)
        $brushRed.Dispose()
        $brushBlue.Dispose()
    }

    # 2. Üst İlerleme Çubuğu (3 Segment)
    $barW = 215
    for ($b = 0; $b -lt 3; $b++) {
        $bx = 35 + $b * ($barW + 12)
        $brushBarBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(60, 255, 255, 255))
        $g.FillRectangle($brushBarBg, $bx, 20, $barW, 6)
        $brushBarBg.Dispose()

        $fillRatio = 0.0
        if ($b -lt $sceneIdx) { $fillRatio = 1.0 }
        elseif ($b -eq $sceneIdx) { $fillRatio = $sceneProgress }
        if ($fillRatio -gt 0) {
            $brushBarFg = New-Object System.Drawing.SolidBrush $cWhite
            $g.FillRectangle($brushBarFg, $bx, 20, [int]($barW * $fillRatio), 6)
            $brushBarFg.Dispose()
        }
    }

    # Üst Marka Başlığı
    $brushGold = New-Object System.Drawing.SolidBrush $cGold
    $brushWhite = New-Object System.Drawing.SolidBrush $cWhite
    $brushGreen = New-Object System.Drawing.SolidBrush $cGreen
    $brushRed   = New-Object System.Drawing.SolidBrush $cRed

    $g.DrawString("VIP RANDEVU", $fontBrand, $brushGold, 40, 42)
    
    # Kırmızı rozet
    $g.FillRectangle($brushRed, 490, 42, 190, 32)
    $g.DrawString("BERBERLERE OZEL", $fontBadge, $brushWhite, 502, 48)

    # 3. VİDEO ÖZEL SAHNE GÖRSELLERİ
    if ($videoIndex -eq 1) {
        # Video 1: Telefon Çilesi
        if ($sceneIdx -eq 0) {
            # Sahne 1: Titreyen Telefon & Arama Kartı
            $shake = [int]([Math]::Sin($frameIndex * 1.8) * 8)
            $cardY = 190

            # Bilgi Çipi
            $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40, 245, 158, 11))), 160, 120, 400, 44)
            $g.DrawRectangle((New-Object System.Drawing.Pen $cGold, 2), 160, 120, 400, 44)
            $g.DrawString("ELIN KOPUKLU · DUKKAN DOLU", $fontBadge, $brushGold, 200, 132)

            # Arama Kartı
            $rectCard = New-Object System.Drawing.Rectangle (90 + $shake), $cardY, 540, 320
            $g.FillRectangle((New-Object System.Drawing.SolidBrush $cCardBg), $rectCard)
            $g.DrawRectangle((New-Object System.Drawing.Pen $cCardBorder, 2), $rectCard)

            $g.DrawString("GELEN ARAMA · RANDEVU HATTI", $fontBadge, $brushGreen, 130 + $shake, $cardY + 25)
            $g.DrawString("Musteri Murat Arıyor...", $fontTitle, $brushWhite, 130 + $shake, $cardY + 70)
            $g.DrawString("0532 800 50 60 · Sac & Sakal Randevusu", $fontSmall, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 180, 200))), 130 + $shake, $cardY + 120)

            # Arama Butonları (Kırmızı Reddet, Yeşil Aç)
            $g.FillEllipse($brushRed, 150 + $shake, $cardY + 180, 80, 80)
            $g.DrawString("RED", $fontBadge, $brushWhite, 168 + $shake, $cardY + 210)
            $g.FillEllipse($brushGreen, 450 + $shake, $cardY + 180, 80, 80)
            $g.DrawString("AC", $fontBadge, $brushWhite, 475 + $shake, $cardY + 210)

            # 3.5 sn sonra BÜYÜK KIRMIZI X ve İptal
            if ($sceneProgress -gt 0.55) {
                DrawTextOutlined $g "X" $fontCounter $brushRed $cWhite (360 + $shake) ($cardY + 160) "center"
                $g.FillRectangle($brushRed, 120, 560, 480, 50)
                $g.DrawString("17 CEVAPSIZ ARAMA · MUSTERI KACTI", $fontBadge, $brushWhite, 150, 575)
            }
        }
        elseif ($sceneIdx -eq 1) {
            # Sahne 2: 3D Telefon İçinde Randevu Seçimi & Yeşil Onay
            $g.DrawString("WHATSAPP / QR ILE 10 SN RANDEVU", $fontTitle, $brushGold, 90, 120)

            # Telefon Gövdesi
            $rectPhone = New-Object System.Drawing.Rectangle 160, 180, 400, 580
            $g.FillRectangle((New-Object System.Drawing.SolidBrush $cCardBg), $rectPhone)
            $g.DrawRectangle((New-Object System.Drawing.Pen $cGold, 4), $rectPhone)

            $g.DrawString("VIP Randevu Secimi", $fontCard, $brushGold, 230, 210)
            $g.DrawString("Bugun Icin Saat Seciniz:", $fontSmall, $brushWhite, 210, 260)

            $slots = @("10:00", "11:30", "13:00", "14:30", "16:00", "17:30")
            for ($i = 0; $i -lt $slots.Length; $i++) {
                $col = $i % 2
                $row = [Math]::Floor($i / 2)
                $sx = 200 + $col * 170
                $sy = 310 + $row * 70
                $isPick = ($i -eq 3) -and ($sceneProgress -gt 0.3)
                $brushSlot = if ($isPick) { $brushGold } else { New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40, 40, 55)) }
                $penSlot   = if ($isPick) { New-Object System.Drawing.Pen $cWhite, 3 } else { New-Object System.Drawing.Pen $cCardBorder, 1 }
                $g.FillRectangle($brushSlot, $sx, $sy, 140, 50)
                $g.DrawRectangle($penSlot, $sx, $sy, 140, 50)
                $txtBrush  = if ($isPick) { New-Object System.Drawing.SolidBrush $cBlack } else { $brushWhite }
                $g.DrawString($slots[$i], $fontCard, $txtBrush, $sx + 30, $sy + 10)
            }

            # Onay Rozeti (0.6'dan sonra büyük yeşil ONAY)
            if ($sceneProgress -gt 0.6) {
                $rectConf = New-Object System.Drawing.Rectangle 180, 550, 360, 160
                $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 16, 185, 129))), $rectConf)
                $g.DrawRectangle((New-Object System.Drawing.Pen $cWhite, 3), $rectConf)
                $g.DrawString("ONAYLANDI!", $fontTitle, $brushWhite, 250, 570)
                $g.DrawString("14:30 · Usta Kemal", $fontCard, $brushWhite, 250, 620)
                $g.DrawString("SMS Ucretsiz · Uygulama Yok", $fontSmall, $brushWhite, 230, 665)
            }
        }
        else {
            # Sahne 3: Canlı 4.850 ₺ Ciro Sayacı & WhatsApp CTA
            $ciroVal = [int]([Math]::Min(1.0, $sceneProgress * 1.4) * 4850)

            # Ciro Kartı
            $rectCiro = New-Object System.Drawing.Rectangle 80, 130, 560, 360
            $g.FillRectangle((New-Object System.Drawing.SolidBrush $cCardBg), $rectCiro)
            $g.DrawRectangle((New-Object System.Drawing.Pen $cGreen, 3), $rectCiro)

            $g.DrawString("CANLI BUGUNKU KASA CIROSU", $fontSmall, $brushGreen, 190, 155)
            $ciroText = "$ciroVal TL"
            DrawTextOutlined $g $ciroText $fontCounter $brushGreen $cBlack 360 260 "center"

            # Ciro Kalemleri
            $g.DrawString("✓ Sac + Sakal VIP ........................... +450 TL", $fontSmall, $brushWhite, 110, 340)
            $g.DrawString("✓ Cilt Bakimi & Agda ...................... +300 TL", $fontSmall, $brushWhite, 110, 380)
            $g.DrawString("✓ Damat Tirasi Paketi .................... +850 TL", $fontSmall, $brushWhite, 110, 420)

            # CTA Banner
            $rectCta = New-Object System.Drawing.Rectangle 80, 520, 560, 200
            $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(16, 185, 129))), $rectCta)
            $g.DrawRectangle((New-Object System.Drawing.Pen $cWhite, 3), $rectCta)
            $g.DrawString("7 GUN UCRETSIZ DENE", $fontTitle, $brushWhite, 160, 545)
            $g.DrawString("WhatsApp'tan Yaz: 0535 581 30 39", $fontCard, $brushWhite, 115, 605)
            $g.DrawString("2 Dakikada Kurulum · Hemen Mesaj At!", $fontSmall, $brushWhite, 150, 655)
        }
    }
    elseif ($videoIndex -eq 2) {
        # Video 2: Kara Liste & Kapora
        if ($sceneIdx -eq 0) {
            # Sahne 1: Boş Koltuk & Gelmeyen Müşteri
            $g.DrawString("GELMEYEN MUSTERI = BOS KOLTUK", $fontTitle, $brushRed, 80, 120)

            $rectList = New-Object System.Drawing.Rectangle 80, 180, 560, 340
            $g.FillRectangle((New-Object System.Drawing.SolidBrush $cCardBg), $rectList)
            $g.DrawRectangle((New-Object System.Drawing.Pen $cCardBorder, 2), $rectList)

            $g.DrawString("Bugunku Randevular:", $fontCard, $brushGold, 110, 205)
            $g.DrawString("13:00  Ali Y. ........................... GELDİ (450 TL)", $fontSmall, $brushGreen, 110, 260)
            $g.DrawString("14:00  Mehmet K. .................... GELMEDI!", $fontSmall, $brushRed, 110, 310)
            $g.DrawString("15:00  Burak D. ...................... GELMEDI!", $fontSmall, $brushRed, 110, 360)
            $g.DrawString("16:00  Emre S. ........................ GELMEDI!", $fontSmall, $brushRed, 110, 410)

            # Damga
            DrawTextOutlined $g "GELMEDİ" $fontCounter $brushRed $cWhite 360 490 "center"

            $rectLoss = New-Object System.Drawing.Rectangle 120, 580, 480, 120
            $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40, 239, 68, 68))), $rectLoss)
            $g.DrawRectangle((New-Object System.Drawing.Pen $cRed, 3), $rectLoss)
            $g.DrawString("BOS KOLTUK KAYIP KAZANC", $fontSmall, $brushWhite, 210, 600)
            DrawTextOutlined $g "-1.350 TL" $fontTitle $brushRed $cWhite 360 655 "center"
        }
        elseif ($sceneIdx -eq 1) {
            # Sahne 2: Tek Tuşla Kara Liste & Otomatik IBAN Kapora
            $g.DrawString("TEK TUSLA KARA LISTEYE AL", $fontTitle, $brushGold, 120, 120)

            # Müşteri Kartı
            $rectCust = New-Object System.Drawing.Rectangle 80, 180, 560, 260
            $g.FillRectangle((New-Object System.Drawing.SolidBrush $cCardBg), $rectCust)
            $g.DrawRectangle((New-Object System.Drawing.Pen $cRed, 2), $rectCust)

            $g.DrawString("Musteri: Mehmet K.", $fontTitle, $brushWhite, 110, 210)
            $g.DrawString("Tel: 0532 999 88 77 (3 Kez Randevuya Gelmedi)", $fontSmall, $brushWhite, 110, 260)

            $rectBanBtn = New-Object System.Drawing.Rectangle 110, 320, 500, 80
            $g.FillRectangle($brushRed, $rectBanBtn)
            $g.DrawString("KARA LISTEYE ALINDI", $fontCard, $brushWhite, 210, 345)

            # Otomatik IBAN Kartı
            $rectIban = New-Object System.Drawing.Rectangle 80, 480, 560, 240
            $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(35, 30, 20))), $rectIban)
            $g.DrawRectangle((New-Object System.Drawing.Pen $cGold, 3), $rectIban)

            $g.DrawString("YENI RANDEVUDA OTOMATIK KAPORA SARTI", $fontSmall, $brushGold, 110, 510)
            $g.DrawString("IBAN: TR12 0006 2000 1234 5678 90", $fontCard, $brushWhite, 110, 560)
            $g.DrawString("Zorunlu Kapora Tutari: 150 TL", $fontTitle, $brushGreen, 110, 620)
            $g.DrawString("Kapora Yatmadan Randevu Onaylanmaz!", $fontSmall, $brushWhite, 110, 675)
        }
        else {
            # Sahne 3: Yedek Liste -> 1 Dakikada Koltuğu Doldur
            $g.DrawString("YEDEK LISTE ILE 1 DAKIKADA DOLDUR", $fontTitle, $brushGreen, 60, 120)

            $rectAlert = New-Object System.Drawing.Rectangle 80, 180, 560, 120
            $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(16, 185, 129))), $rectAlert)
            $g.DrawString("KOLTUK 1 DAKIKADA DOLDU!", $fontTitle, $brushWhite, 120, 210)
            $g.DrawString("Burak D. Yedek Listeden Geliyor 👍", $fontSmall, $brushWhite, 160, 260)

            # WhatsApp Balonları
            $rectMsg1 = New-Object System.Drawing.Rectangle 80, 330, 440, 80
            $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(30, 90, 50))), $rectMsg1)
            $g.DrawString("Usta: 16:00 bosaldi, gelmek ister misin?", $fontSmall, $brushWhite, 100, 360)

            $rectMsg2 = New-Object System.Drawing.Rectangle 200, 430, 440, 80
            $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(50, 50, 70))), $rectMsg2)
            $g.DrawString("Musteri: 10 dakikaya oradayim usta!", $fontSmall, $brushWhite, 220, 460)

            # CTA
            $rectCta2 = New-Object System.Drawing.Rectangle 80, 550, 560, 160
            $g.FillRectangle($brushGreen, $rectCta2)
            $g.DrawString("SIFIR KAYIP · MAKSIMUM KAZANC", $fontTitle, $brushWhite, 110, 580)
            $g.DrawString("VIP Randevu ile Bos Koltuk Kalmasin!", $fontSmall, $brushWhite, 160, 640)
        }
    }
    else {
        # Video 3: Aynadaki QR Kod & VIP Prestij
        if ($sceneIdx -eq 0) {
            # Sahne 1: VIP Prestij Tacı
            $g.DrawString("SALONUNA VIP PRESTIJ KAT", $fontTitle, $brushGold, 140, 130)

            # Taç Çizimi
            $rectCrown = New-Object System.Drawing.Rectangle 260, 220, 200, 180
            $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(50, 245, 158, 11))), $rectCrown)
            $g.DrawRectangle((New-Object System.Drawing.Pen $cGold, 4), $rectCrown)
            DrawTextOutlined $g "👑" $fontCounter $brushGold $cWhite 360 300 "center"

            DrawTextOutlined $g "VIP PRESTİJ" $fontCounter $brushGold $cWhite 360 480 "center"
            $g.DrawString("Luks Berber Randevu Altyapisi", $fontCard, $brushWhite, 180, 550)
            $g.DrawString("Musterilerine Hak Ettigi Hizmeti Sun!", $fontSmall, $brushGreen, 170, 610)
        }
        elseif ($sceneIdx -eq 1) {
            # Sahne 2: Aynadaki QR Kod
            $g.DrawString("AYNADAKI QR KODU OKUTAN MUSTERI", $fontTitle, $brushGold, 70, 120)

            # Ayna Çerçevesi
            $rectMirror = New-Object System.Drawing.Rectangle 140, 180, 440, 520
            $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(25, 25, 35))), $rectMirror)
            $g.DrawRectangle((New-Object System.Drawing.Pen $cGold, 6), $rectMirror)

            # QR Kod Kutusu
            $rectQr = New-Object System.Drawing.Rectangle 260, 240, 200, 200
            $g.FillRectangle($brushWhite, $rectQr)
            $g.DrawString("QR", $fontCounter, (New-Object System.Drawing.SolidBrush $cBlack), 295, 290)

            # Tarama Işığı
            $scanY = 240 + [int](($frameIndex * 8) % 200)
            $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 16, 185, 129))), 260, $scanY, 200, 8)

            $g.DrawString("Randevu Icin Telefonunuza Okutun", $fontSmall, $brushGold, 190, 470)

            $rectBarberList = New-Object System.Drawing.Rectangle 160, 520, 400, 150
            $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40, 40, 55))), $rectBarberList)
            $g.DrawString("Usta Kemal: 14:30, 16:00", $fontSmall, $brushGreen, 180, 545)
            $g.DrawString("Usta Baris: 13:00, 15:30", $fontSmall, $brushGreen, 180, 585)
            $g.DrawString("Usta Eren: 17:00, 18:30", $fontSmall, $brushGreen, 180, 625)
        }
        else {
            # Sahne 3: 1 Tıraş Parasına Tüm Dükkan Cebinde
            $g.DrawString("AYDA SADECE 1 TIRAS PARASINA", $fontTitle, $brushGold, 110, 130)

            $rectBox = New-Object System.Drawing.Rectangle 80, 200, 560, 320
            $g.FillRectangle((New-Object System.Drawing.SolidBrush $cCardBg), $rectBox)
            $g.DrawRectangle((New-Object System.Drawing.Pen $cGold, 3), $rectBox)

            DrawTextOutlined $g "TUM DUKKAN CEBINDE" $fontTitle $brushGreen $cWhite 360 250 "center"
            $g.DrawString("✓ WhatsApp Randevu Otomasyonu", $fontSmall, $brushWhite, 120, 320)
            $g.DrawString("✓ Ortak Kara Liste & Guvenlik Agi", $fontSmall, $brushWhite, 120, 360)
            $g.DrawString("✓ Gunluk & Aylik Ciro Sayaci", $fontSmall, $brushWhite, 120, 400)
            $g.DrawString("✓ Aynaya Ozel VIP QR Kod Afisi", $fontSmall, $brushWhite, 120, 440)

            # CTA
            $rectCta3 = New-Object System.Drawing.Rectangle 80, 550, 560, 180
            $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 158, 11))), $rectCta3)
            $g.DrawString("UCRETSIZ DENEME ICIN YAZIN", $fontTitle, (New-Object System.Drawing.SolidBrush $cBlack), 110, 580)
            $g.DrawString("WhatsApp & DM: 0535 581 30 39", $fontCard, (New-Object System.Drawing.SolidBrush $cBlack), 140, 640)
        }
    }

    # 4. CAPCUT TARZI PATLAYAN DİNAMİK ALTYAZILAR (Alt Kısım)
    # Her videonun senaryo metni kelime kelime akar
    $subtitleTexts = @(
        # Video 1
        @(
            "USTAM! ELIN KOPUKLUYKEN CALAN TELEFONLARDAN BIKMADIN MI?",
            "WHATSAPP VEYA QR ILE 10 SANIYEDE RANDEVU ALSIN!",
            "SEN TISARINA BAK! 7 GUN UCRETSIZ HEMEN DENE!"
        ),
        # Video 2
        @(
            "RANDEVUYA GELMEYEN MUSTERI YUZUNDEN KOLTUGUN BOS MU KALIYOR?",
            "VIP SISTEM ILE GELMEYENI TEK TUSLA KARA LISTEYE AL!",
            "YEDEK LISTEYE WHATSAPP AT, KOLTUGU 1 DAKIKADA DOLDUR!"
        ),
        # Video 3
        @(
            "SALONUNA VIP BIR PRESTIJ KATMAYA HAZIR MISIN USTAM?",
            "AYNADAKI OZEL QR ILE TUM USTALARINI SANİYESİNDE GORSUN!",
            "AYDA 1 TIRAS PARASINA TUM DUKKAN CEBINDE! HEMEN YAZ!"
        )
    )

    $currentSubText = $subtitleTexts[$videoIndex - 1][$sceneIdx]
    $words = $currentSubText -split "\s+"
    $activeWordIdx = [Math]::Min($words.Length - 1, [int][Math]::Floor($sceneProgress * $words.Length))

    # Altyazı Arka Plan Karartması
    $rectSubBg = New-Object System.Drawing.Rectangle 30, 1020, 660, 140
    $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(210, 0, 0, 0))), $rectSubBg)
    $g.DrawRectangle((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(80, 245, 158, 11)), 2), $rectSubBg)

    # Kelime Kelime Dinamik CapCut Vurgusu
    # 3'lü kelime dilimleri
    $chunkSize = 3
    $chunkStart = [Math]::Floor($activeWordIdx / $chunkSize) * $chunkSize
    $chunkWords = @()
    for ($w = $chunkStart; $w -lt [Math]::Min($words.Length, $chunkStart + $chunkSize); $w++) {
        $chunkWords += $words[$w]
    }
    $chunkDisplay = $chunkWords -join " "

    # Aktif kelime Parlak Altın (#F59E0B) veya Neon Yeşil (#10B981)
    $highlightColor = if ($activeWordIdx % 2 -eq 0) { $cGold } else { $cGreen }
    $brushHighlight = New-Object System.Drawing.SolidBrush $highlightColor

    DrawTextOutlined $g $chunkDisplay $fontSub $brushHighlight $cBlack 360 1085 "center"

    # Alt Domain Filigranı
    $g.DrawString("viprandevusistemi.com.tr", $fontBadge, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(150, 255, 255, 255))), 260, 1220)

    # Temizlik
    $brushGold.Dispose()
    $brushWhite.Dispose()
    $brushGreen.Dispose()
    $brushRed.Dispose()
    $brushHighlight.Dispose()
    $g.Dispose()

    return $bmp
}

# --- 3 VİDEOYU AYRI AYRI ÜRET ---
$videos = @(
    @{ Id = 1; Slug = "reklam-1-telefon-cilesi"; Title = "Reklam 1: Telefon Cilesine Son" },
    @{ Id = 2; Slug = "reklam-2-kara-liste-ve-kapora"; Title = "Reklam 2: Kara Liste & Kapora" },
    @{ Id = 3; Slug = "reklam-3-aynadaki-qr-sov"; Title = "Reklam 3: Aynadaki QR Sov" }
)

foreach ($vid in $videos) {
    Write-Host ">>> URETILIYOR: $($vid.Title)..."
    $vTmp = Join-Path $tmpDir "v_$($vid.Id)"
    if (Test-Path $vTmp) { Remove-Item $vTmp -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $vTmp | Out-Null

    # 1. 360 Frame Kaydet (PNG)
    for ($f = 0; $f -lt $totalFrames; $f++) {
        $bmp = RenderFrame $vid.Id $f
        $fName = "{0:D5}.png" -f $f
        $fPath = Join-Path $vTmp $fName
        $bmp.Save($fPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        if ($f % 60 -eq 0) {
            Write-Host "   Kare $f / $totalFrames tamamlandı..."
        }
    }

    # 2. ffmpeg ile H.264 MP4 Olarak Kodla (Audio ile Birlikte)
    $outMp4_1 = Join-Path $outDir1 "$($vid.Slug).mp4"
    $outMp4_2 = Join-Path $outDir2 "$($vid.Slug).mp4"

    # Her video için özel ses efektleri (Ding / Para / Zil)
    # Sine dalgaları ve çan sesleriyle 18 saniyelik zengin ses parçası üret:
    $audioFile = Join-Path $vTmp "audio.aac"

    if ($vid.Id -eq 1) {
        # Telefon çilesi: zil sesi + bip + ding + kasa sesi
        & $ffmpeg -f lavfi -i "sine=frequency=1040:duration=1.2" `
                  -f lavfi -i "sine=frequency=180:duration=0.5" `
                  -f lavfi -i "sine=frequency=1318:duration=1.5" `
                  -f lavfi -i "sine=frequency=2637:duration=1.0" `
                  -filter_complex "[0:a]adelay=500|500[a0];[1:a]adelay=3500|3500[a1];[2:a]adelay=9000|9000[a2];[3:a]adelay=13000|13000[a3];[a0][a1][a2][a3]amix=inputs=4:dropout_transition=2[outa]" `
                  -map "[outa]" -t 18 -c:a aac -y $audioFile 2>$null
    }
    elseif ($vid.Id -eq 2) {
        # Kara liste: buzzer + womp + ding
        & $ffmpeg -f lavfi -i "sine=frequency=150:duration=0.6" `
                  -f lavfi -i "sine=frequency=220:duration=0.8" `
                  -f lavfi -i "sine=frequency=1175:duration=1.5" `
                  -filter_complex "[0:a]adelay=1500|1500[a0];[1:a]adelay=4000|4000[a1];[2:a]adelay=13500|13500[a2];[a0][a1][a2]amix=inputs=3[outa]" `
                  -map "[outa]" -t 18 -c:a aac -y $audioFile 2>$null
    }
    else {
        # QR Şov: sparkle + scanner + kasa sesi
        & $ffmpeg -f lavfi -i "sine=frequency=1976:duration=0.8" `
                  -f lavfi -i "sine=frequency=2450:duration=0.5" `
                  -f lavfi -i "sine=frequency=2093:duration=1.2" `
                  -filter_complex "[0:a]adelay=1000|1000[a0];[1:a]adelay=7500|7500[a1];[2:a]adelay=13000|13000[a2];[a0][a1][a2]amix=inputs=3[outa]" `
                  -map "[outa]" -t 18 -c:a aac -y $audioFile 2>$null
    }

    $imgPattern = Join-Path $vTmp "%05d.png"

    # MP4 Çıktısını Oluştur
    Write-Host "   MP4 video kodlanıyor..."
    & $ffmpeg -framerate $fps -i $imgPattern -i $audioFile -c:v h264_mf -b:v 3500k -c:a aac -pix_fmt yuv420p -shortest -y $outMp4_1 2>&1 | Out-Null
    Copy-Item $outMp4_1 $outMp4_2 -Force

    Write-Host ">>> TAMAMLANDI: $($outMp4_1)"
}

# Geçici klasörü temizle
Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "========================================="
Write-Host "3 VIDEO DA BASARIYLA KLASORE KAYDEDILDI!"
Write-Host "Klasör: $outDir1"
Write-Host "========================================="
