# PANDUAN LENGKAP: BUILD APK ANDROID & KONEKSI KE DATABASE MYSQL KASIRPRO

Dokumen ini menjelaskan secara rinci:
1. **Arsitektur Koneksi**: Cara aplikasi Android KasirPro terhubung ke database MySQL.
2. **Persiapan Jaringan**: Cara mengetahui IP PC Server dan konfigurasi Firewall Windows.
3. **Konfigurasi URL Host di Aplikasi**: Mengarahkan HP Android ke PC Server.
4. **Metode 1 (Rekomendasi)**: Cara Build file `.apk` resmi menggunakan Capacitor & Android Studio.
5. **Metode 2 (Paling Cepat Tanpa Android Studio)**: Menggunakan PWA / Chrome Install di Android.
6. **Troubleshooting**: Mengatasi kendala koneksi timeout atau gagal simpan.

---

## 1. Arsitektur Koneksi: Android ke Database MySQL

Dalam standar industri Point of Sale (POS), **perangkat mobile Android tidak boleh dan tidak bisa langsung terhubung ke port TCP MySQL 3306** karena:
- Driver raw MySQL tidak aman disimpan di perangkat mobile (kredensial database dapat di-decompile atau di-dump).
- MySQL tidak didesain untuk menangani koneksi langsung dari ratusan mobile device melalui jaringan seluler/Wi-Fi tanpa connection pooling.

**Alur yang digunakan oleh KasirPro:**
```
┌─────────────────────────────────┐
│   HP / Tablet Android (APK)     │  <-- Kasir scan barcode, input transaksi, cetak struk
└────────────────┬────────────────┘
                 │
                 │ HTTP REST API (Port 3000 via Wi-Fi Lokal Toko)
                 ▼
┌─────────────────────────────────┐
│     PC Server KasirPro Toko     │  <-- Node.js + Express (server.ts)
└────────────────┬────────────────┘
                 │
                 │ TCP Koneksi Internal (Port 3306)
                 ▼
┌─────────────────────────────────┐
│     Database MySQL (XAMPP)      │  <-- Single Source of Truth (kasirpro_db)
└─────────────────────────────────┘
```
**Kesimpulan:**
HP Android cukup terhubung ke **Server Node.js KasirPro di PC Anda** (contoh: `http://192.168.1.15:3000`). Server PC secara otomatis yang akan membaca, mengecek stok, dan menyimpan data secara realtime ke **Database MySQL (kasirpro_db)**.

---

## 2. Persiapan Jaringan & Mengetahui IP PC Server

Agar HP/Tablet Android bisa berkomunikasi dengan PC server Anda:

### Langkah 2.1: Pastikan Satu Jaringan Wi-Fi
Hubungkan PC Server dan HP/Tablet kasir ke jaringan Wi-Fi toko yang sama (jangan aktifkan *Guest Mode / AP Isolation* pada router).

### Langkah 2.2: Cek IP Address PC Server
1. Di PC Server (Windows), buka **Command Prompt** (CMD).
2. Ketik perintah:
   ```cmd
   ipconfig
   ```
3. Cari bagian **Wireless LAN adapter Wi-Fi** atau **Ethernet adapter**.
4. Catat bagian **IPv4 Address**, misalnya: `192.168.1.15` (atau `192.168.0.xxx`).
5. Maka alamat URL Server Toko Anda adalah:
   ```text
   http://192.168.1.15:3000
   ```

### Langkah 2.3: Buka Port 3000 di Windows Defender Firewall
Agar Windows mengizinkan HP Android mengakses port 3000:
1. Tekan tombol `Windows + R`, ketik `wf.msc` lalu tekan **Enter** (membuka Windows Firewall with Advanced Security).
2. Klik **Inbound Rules** di sebelah kiri -> klik **New Rule...** di sebelah kanan.
3. Pilih **Port** -> klik **Next**.
4. Pilih **TCP**, pada **Specific local ports** masukkan: `3000` -> klik **Next**.
5. Pilih **Allow the connection** -> klik **Next** -> centang semua (Domain, Private, Public) -> klik **Next**.
6. Beri nama: `KasirPro POS Port 3000` -> klik **Finish**.

---

## 3. Fitur Konfigurasi Host di Aplikasi Android

KasirPro sudah dilengkapi fitur **Pengaturan Server** bawaan:
1. Buka aplikasi KasirPro di HP Android.
2. Pada layar Login di bagian bawah, klik tombol **"Pengaturan Server"** (ikon gear ⚙️).
3. Masukkan alamat IP PC Server toko Anda, misalnya: `http://192.168.1.15:3000`.
4. Klik tombol **"Uji Koneksi Server"**.
5. Jika berhasil, akan muncul notifikasi hijau: *"Berhasil terhubung ke server KasirPro! Engine Database: MySQL 8.0"*.
6. Klik **"Simpan & Terapkan"**. Aplikasi siap digunakan bertransaksi!

---

## 4. METODE 1: Cara Build File APK dengan Capacitor & Android Studio

Project ini sudah dilengkapi file `capacitor.config.ts` dengan pengaturan `cleartext: true` (mengizinkan koneksi HTTP ke IP PC lokal).

### Persyaratan di PC Anda:
1. **Node.js** (sudah terinstal untuk menjalankan KasirPro).
2. **Android Studio** (Download gratis di [developer.android.com/studio](https://developer.android.com/studio)).
   - Saat instalasi Android Studio, pastikan mencentang **Android SDK** dan **Android SDK Platform-Tools**.

### Langkah-langkah Build APK:

#### Langkah 1: Buka Terminal di Folder KasirPro
Buka Command Prompt atau PowerShell di folder proyek Anda:
```cmd
cd C:\WebApp\KasirPro
```

#### Langkah 2: Build Web Assets (Dist)
Jalankan perintah:
```cmd
npm run build
```
Perintah ini akan mengkompilasi React menjadi folder `dist`.

#### Langkah 3: Tambahkan Platform Android
Jalankan perintah:
```cmd
npx cap add android
```
*(Perintah ini akan membuat folder `android/` yang berisi proyek native Android lengkap).*

#### Langkah 4: Sinkronisasi Kode ke Folder Android
Jalankan perintah:
```cmd
npx cap sync
```

#### Langkah 5: Buka Proyek di Android Studio
Jalankan perintah:
```cmd
npx cap open android
```
Android Studio akan otomatis terbuka dan memuat proyek KasirPro. Tunggu sampai proses indexing dan Gradle sync selesai (biasanya 1–3 menit).

#### Langkah 6: Generate File APK
1. Di menu bar bagian atas Android Studio, klik menu **Build**.
2. Pilih **Build Bundle(s) / APK(s)** -> klik **Build APK(s)**.
3. Tunggu hingga proses build selesai.
4. Di pojok kanan bawah akan muncul pop-up notifikasi:
   > *APK(s) generated successfully for 1 module*
5. Klik teks warna biru **"locate"** pada pop-up tersebut.
6. Explorer akan membuka folder tempat file **`app-debug.apk`** berada (biasanya di `android\app\build\outputs\apk\debug\app-debug.apk`).

#### Langkah 7: Pasang APK di HP / Tablet Android
1. Kirim file `app-debug.apk` ke HP kasir (bisa lewat WhatsApp Web, Google Drive, atau kabel USB).
2. Di HP Android, buka file APK dan pilih **Install**.
3. Jika muncul peringatan *"Install from unknown sources"*, pilih **Izinkan (Allow)**.
4. Buka aplikasi KasirPro, masukkan IP Server PC, dan login!

---

## 5. METODE 2 (Alternatif): PWA Instan Tanpa Perlu Android Studio

Jika Anda tidak ingin menginstall Android Studio yang berukuran besar, Anda bisa menggunakan fitur **PWA (Progressive Web App)**:

1. Pastikan server di PC sudah berjalan (`npm run dev`).
2. Di HP / Tablet Android kasir, buka browser **Google Chrome**.
3. Ketik alamat IP PC server:
   ```text
   http://192.168.1.15:3000
   ```
4. Tekan tombol menu titik tiga (**⋮**) di pojok kanan atas Google Chrome.
5. Pilih menu **"Tambahkan ke Layar Utama"** (*Add to Home screen*) atau **"Install App"**.
6. Ikon **KasirPro** akan otomatis muncul di menu utama HP Android Anda.
7. Saat dibuka, aplikasi akan berjalan **layar penuh (fullscreen)** tanpa bilah alamat browser, persis seperti aplikasi APK biasa!

---

## 6. Cara Mengupdate APK Jika Ada Perubahan Kode

Jika suatu saat Anda mengubah kode frontend dan ingin memperbarui aplikasi di Android:
```cmd
# 1. Build ulang frontend
npm run build

# 2. Sinkronkan perubahan ke folder android
npx cap sync

# 3. Build APK ulang di Android Studio (Build -> Build APKs)
```

---

## 7. Tanya Jawab & Troubleshooting

### Q1: HP Android menampilkan pesan "Gagal Menghubungi Server" atau "Timeout 6 detik"?
* **Penyebab 1**: HP dan PC server berada di Wi-Fi yang berbeda. Pastikan keduanya tersambung ke SSID Wi-Fi yang sama.
* **Penyebab 2**: IP PC server berubah (misal router DHCP me-restart). Cek ulang `ipconfig` di PC dan perbarui IP di menu Pengaturan Server pada aplikasi HP.
* **Penyebab 3**: Firewall Windows memblokir port 3000. Lakukan langkah **2.3** untuk membuka port 3000 di Windows Firewall.

### Q2: Apakah transaksi dari HP Android langsung tersimpan ke MySQL di XAMPP?
* **Ya, 100% langsung tersimpan**. Ketika kasir menyelesaikan transaksi di HP Android, aplikasi mengirim data transaksi ke PC server (`server.ts`), dan PC server langsung menjalankan query SQL `INSERT INTO sales`, `INSERT INTO sale_items`, dan mengupdate kartu stok `stock_ledger` di database MySQL `kasirpro_db`.

### Q3: Apakah bisa menggunakan printer thermal Bluetooth dari HP Android?
* **Ya**. KasirPro mendukung struk thermal standar 58mm & 80mm. Jika menggunakan PWA atau APK, jendela cetak Android otomatis mendeteksi printer Bluetooth yang sudah dipasangkan (*paired*) di HP.

---
*KasirPro POS — Siap untuk operasional multi-perangkat (PC Kasir Utama + HP/Tablet Kasir Mobile).*
