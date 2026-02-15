# Capacitor – Mobil uygulama (Android)

Bu projede **Capacitor** ile aynı web uygulaması Android’de native uygulama gibi çalışır.

## Capacitor nedir?

- Web projesini (HTML/CSS/JS) **native bir kabuk** içinde çalıştırır.
- **Electron’un mobil karşılığı** gibi düşünebilirsin: aynı kod, farklı platform.
- Android’de WebView + native API’ler (kamera, bildirim, depolama vb.) kullanılır.

## Gereksinimler

- **Node.js** (zaten var)
- **Java JDK 17** – [İndir](https://adoptium.net/) veya Android Studio ile gelen
- **Android SDK** – İki seçenek:
  - **Android Studio** kur (en kolay): [İndir](https://developer.android.com/studio) → SDK otomatik gelir.
  - **Sadece komut satırı:** [Command line tools](https://developer.android.com/studio#command-tools) indir, `ANDROID_HOME` ortam değişkenini SDK klasörüne ayarla.

## Bu workspace’te nasıl yapılır?

### 1. Paketleri kur

```bash
cd C:\Users\zahid\OneDrive\Belgeler\GitHub\tournement-master
npm install
```

### 2. Android platformunu ekle (ilk seferlik)

```bash
npm run cap:add:android
```

Bu komut `android/` klasörünü oluşturur.

### 3. Web’i build et ve Capacitor’a kopyala

```bash
npm run mobile:build
```

Bu komut `vite build` yapar ve `cap sync` ile çıktıyı `android/` içine kopyalar.

### 4. APK üret

**A) Komut satırı (Android Studio açmadan):**

```bash
npm run cap:apk
```

Bu komut web’i build eder, `cap sync` yapar ve Gradle ile APK’yı oluşturur. APK yolu:

`android\app\build\outputs\apk\debug\app-debug.apk`

**B) Android Studio ile:**

```bash
npm run cap:open:android
```

Açılan Android Studio’da **Build → Build Bundle(s) / APK(s) → Build APK(s)** ile de APK alabilirsin. Emülatör veya telefonda çalıştırmak için **Run** (yeşil üçgen) kullanılır.

**APK dosyası nerede?**

- **Debug APK:**  
  `android\app\build\outputs\apk\debug\app-debug.apk`
- **Release APK** (Build → Generate Signed Bundle / APK → APK seçip imzaladıktan sonra):  
  `android\app\build\outputs\apk\release\app-release.apk`

Proje kökünden tam yol örneği:  
`C:\Users\zahid\OneDrive\Belgeler\GitHub\tournement-master\android\app\build\outputs\apk\debug\app-debug.apk`

---

## Kısa komut özeti

| Komut | Ne yapar? |
|--------|-----------|
| `npm run cap:add:android` | İlk kez Android projesi oluşturur |
| `npm run mobile:build` | `vite build` + `cap sync` (her değişiklikten sonra) |
| `npm run cap:sync` | Sadece `dist/` → `android/` kopyalar (zaten build aldıysan) |
| **`npm run cap:apk`** | **APK üretir (Android Studio gerekmez)** |
| `npm run cap:open:android` | Android Studio’yu açar |

---

## iOS (isteğe bağlı)

iOS için **Mac** ve **Xcode** gerekir. Bu projede şu an sadece Android eklendi. İstersen ileride:

```bash
npm install @capacitor/ios
npx cap add ios
npm run mobile:build
npx cap open ios
```

---

## Backend (API) notu

Uygulama mobilde de aynı API’yi kullanır. Telefonda veya emülatörde çalıştırırken backend’in erişilebilir bir adreste (örn. `https://api.turnuvaist.com` veya bilgisayarın yerel IP’si) olması gerekir.
