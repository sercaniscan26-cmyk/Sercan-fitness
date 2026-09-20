AYTECH FITNESS v1.0 – KURULUM

DOSYALAR
- index.html: uygulama
- styles.css / app.js: arayüz ve mantık
- manifest.webmanifest / sw.js: telefon-PC uygulama kurulumu ve offline çalışma
- SUPABASE_KURULUM.sql: telefon-PC bulut senkron veritabanı
- START_WINDOWS.bat: Windows'ta lokal uygulamayı başlatır

1) WINDOWS'TA HEMEN ÇALIŞTIRMA
- Klasörü ZIP'ten çıkar.
- Bilgisayarında Python varsa START_WINDOWS.bat dosyasına çift tıkla.
- http://localhost:8787 açılır.
- Chrome/Edge adres çubuğundaki "Uygulamayı yükle" seçeneğiyle PC'ye kurabilirsin.
- Python yoksa index.html dosyasını doğrudan açabilirsin; uygulama çalışır fakat gerçek PWA kurulumu/service worker için localhost veya HTTPS gerekir.

2) TELEFONA KURMA
Telefon için uygulamanın HTTPS üzerinde yayınlanması gerekir.
En kolay yol: Replit / GitHub Pages / Netlify / Vercel gibi statik hosting.
Yayınlandıktan sonra:
- Android Chrome: menü > Uygulamayı yükle / Ana ekrana ekle
- iPhone Safari: Paylaş > Ana Ekrana Ekle

3) TELEFON ↔ PC BULUT SENKRONU
Supabase'de ücretsiz bir proje aç.
- SQL Editor'a SUPABASE_KURULUM.sql içeriğini çalıştır.
- Project Settings / API bölümünden Project URL ve anon/public key'i al.
- AYTECH Fitness > Ayarlar > Bulut Senkron'a bunları gir.
- E-posta + şifre ile hesap oluştur ve giriş yap.
- İlk cihazda "Bu cihazı buluta gönder".
- İkinci cihazda aynı hesapla giriş yapıp "Buluttan bu cihaza çek".
- Bundan sonra kayıtlar yapılınca uygulama bağlı oturumda otomatik buluta göndermeyi dener.

NOT
Anon/public key tarayıcı uygulamalarında kullanılmak üzere tasarlanmıştır; service_role anahtarını ASLA uygulamaya koyma.

4) HEDEFLER
Varsayılan başlangıç:
- 168 cm / 86 kg
- Hedef 78 kg
- 2100 kcal
- 150 g protein
- 225 g karbonhidrat
- 65 g yağ
- 9000 adım
- 3.0 L su

Bunlar uygulamada Ayarlar bölümünden değiştirilebilir. Kaloriyi tek günlük tartıya göre değil, 14 günlük trende göre ayarla.
