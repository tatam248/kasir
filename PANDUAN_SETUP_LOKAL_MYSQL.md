# Panduan Pengujian Aplikasi KasirPro di PC / Laptop Lokal (MySQL & XAMPP)

Panduan ini berisi instruksi lengkap untuk menyiapkan database MySQL secara lokal di PC atau laptop Anda (menggunakan XAMPP atau instalasi MySQL mandiri) serta menjalankan aplikasi **KasirPro**.

Seluruh data dummy pengguna (seperti akun demo kasir, manager, dan gudang) serta nama toko tiruan telah dihilangkan. Database diawali dengan struktur bersih dan satu akun **Administrator** utama. Seluruh penambahan staf pengguna dan konfigurasi profil toko bersumber dan tersimpan langsung ke database.

---

## 📋 Daftar Isi
1. [Prasyarat Sistem](#1-prasyarat-sistem)
2. [Setup Database MySQL (XAMPP / MariaDB / MySQL 8.0)](#2-setup-database-mysql)
3. [Import Struktur Tabel & Data Awal Bersih](#3-import-struktur-tabel--data-awal-bersih)
4. [Konfigurasi File Lingkungan (.env)](#4-konfigurasi-file-lingkungan-env)
5. [Menjalankan Aplikasi di PC/Laptop](#5-menjalankan-aplikasi-di-pclaptop)
6. [Login & Pengujian Fitur Aplikasi](#6-login--pengujian-fitur-aplikasi)
7. [Struktur Database & Backup](#7-struktur-database--backup)
8. [Panduan Pemecahan Masalah (Troubleshooting)](#8-panduan-pemecahan-masalah-troubleshooting)

---

## 1. Prasyarat Sistem

Sebelum memulai, pastikan perangkat PC/laptop Anda telah terpasang:
- **Node.js**: Versi 18.x, 20.x, atau lebih baru ([Unduh Node.js](https://nodejs.org/))
- **NPM** (terpasang otomatis bersama Node.js) atau **Bun**
- **XAMPP** (disarankan) atau MySQL Server 8.0+ / MariaDB 10.4+ ([Unduh XAMPP](https://www.apachefriends.org/))
- **Web Browser modern**: Google Chrome, Microsoft Edge, Mozilla Firefox, atau Brave

---

## 2. Setup Database MySQL

### Menggunakan XAMPP Control Panel:
1. Buka aplikasi **XAMPP Control Panel** di PC/laptop Anda.
2. Pada baris **Apache**, klik tombol **Start**.
3. Pada baris **MySQL**, klik tombol **Start**.
4. Pastikan teks status berubah hijau dan port MySQL menunjukkan **3306**.

### Membuat Database Baru di phpMyAdmin:
1. Buka browser Anda dan kunjungi:
   ```
   http://localhost/phpmyadmin
   ```
2. Klik menu **Databases** (atau **Basis data** di panel kiri).
3. Masukkan nama database:
   - Nama Database: `kasirpro_db`
   - Collation: `utf8mb4_unicode_ci` (atau `utf8mb4_general_ci`)
4. Klik tombol **Create** (**Buat**).

---

## 3. Import Struktur Tabel & Data Awal Bersih

Aplikasi menyediakan dua file SQL yang berada di dalam folder `database/`:
- `database/schema.sql`: Berisi DDL 27 tabel lengkap (relasi foreign key, indeks, enum transaksi, dan kartu stok).
- `database/seeds/001_seed_initial.sql`: Berisi data master role RBAC, hak akses modul, satuan, kategori, dan 1 akun Administrator bersih.

### Cara 1: Menggunakan phpMyAdmin (GUI)
1. Di phpMyAdmin, klik database **kasirpro_db** di panel sebelah kiri.
2. Klik tab **Import** pada bagian atas layar.
3. Klik tombol **Choose File** / **Pilih File**, pilih file:
   ```
   database/schema.sql
   ```
4. Scroll ke bawah dan klik **Import** / **Kirim**. Tunggu hingga muncul pesan centang hijau (seluruh tabel berhasil dibuat).
5. Ulangi langkah di atas untuk mengimpor file data awal:
   ```
   database/seeds/001_seed_initial.sql
   ```
6. Klik **Import** / **Kirim**.

### Cara 2: Menggunakan Command Prompt / Terminal
Jika Anda terbiasa dengan terminal atau command line:
```bash
# Masuk ke direktori proyek KasirPro
cd /path/ke/proyek/kasirpro

# Import schema
mysql -u root -p kasirpro_db < database/schema.sql

# Import seed data awal
mysql -u root -p kasirpro_db < database/seeds/001_seed_initial.sql
```
*(Catatan: Jika user `root` di XAMPP Anda tidak menggunakan password, cukup tekan tombol **Enter** saat diminta password).*

---

## 4. Konfigurasi File Lingkungan (.env)

Buat file baru bernama `.env` di folder utama (root) proyek dengan menyalin dari `.env.example`:

**Di Linux/macOS:**
```bash
cp .env.example .env
```

**Di Windows (Command Prompt / PowerShell):**
```cmd
copy .env.example .env
```

Buka file `.env` menggunakan teks editor (VS Code, Notepad, dll) dan pastikan konfigurasinya sesuai:

```env
# Port aplikasi web
PORT=3000

# URL lokal aplikasi
APP_URL=http://localhost:3000

# Secret key untuk otentikasi token JWT
JWT_SECRET=kasirpro_jwt_super_secret_production_key_2026

# Konfigurasi Koneksi MySQL Lokal (XAMPP Default)
DB_ENGINE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=kasirpro_db
```

---

## 5. Menjalankan Aplikasi di PC/Laptop

Buka Terminal / Command Prompt pada folder proyek KasirPro, lalu jalankan perintah:

```bash
# 1. Install semua library & dependensi pendukung
npm install

# 2. Jalankan server aplikasi lokal
npm run dev
```

Output di terminal akan menampilkan:
```
[KASIRPRO SERVER] Running on http://0.0.0.0:3000
```

Buka web browser dan akses alamat:
👉 **`http://localhost:3000`**

---

## 6. Login & Pengujian Fitur Aplikasi

### 6.1 Kredensial Administrator Bawaan
Form login kini bersih tanpa tombol akses cepat dummy. Masukkan kredensial administrator awal:

| Field | Nilai | Keterangan |
|---|---|---|
| **Username** | `admin` *(atau `superadmin`)* | Akun tunggal Administrator |
| **Password** | `admin123` | Terenkripsi dengan algoritma bcrypt |
| **PIN Supervisor** | `123456` | Untuk otorisasi void & diskon khusus |

---

### 6.2 Alur Pengujian Fitur:

#### Langkah 1: Atur Profil Toko Anda
1. Buka menu **Pengaturan & DB** di sidebar kiri.
2. Pada tab **Profil Toko & Struk**:
   - Isi **Nama Toko / Usaha** Anda (contoh: *TOKO MAJU JAYA*).
   - Isi alamat fisik toko, nomor telepon, dan nomor WhatsApp konsumen.
   - Periksa **Pratinjau Header Struk** di sebelah kanan.
   - Klik tombol **Simpan Profil Toko**.
3. Perhatikan navbar dan struk penjualan akan langsung menampilkan identitas toko yang baru disimpan ke database!

#### Langkah 2: Tambahkan Akun Pengguna / Staf Baru
1. Buka menu **Pengguna & RBAC**.
2. Klik tombol **Tambah Pengguna Baru**.
3. Daftarkan akun kasir, manajer, atau staf gudang baru:
   - Contoh: Username `kasir1`, Nama `Siti Kasir`, Role `Kasir (POS)`, Password `kasir123`.
4. Anda juga dapat mengubah hak akses izin granular per role di tab **Role & Hak Akses (Permissions)**.

#### Langkah 3: Kelola Master Produk & Stok
1. Buka menu **Master Produk** untuk menambah, mengedit harga beli, harga jual, barcode, dan batas minimum stok barang.
2. Buka menu **Kategori & Satuan** untuk mengelompokkan barang dagangan.

#### Langkah 4: Buka Shift Kasir
1. Buka menu **Shift Kasir**.
2. Klik **Buka Shift Baru**.
3. Masukkan nominal uang modal awal kas kasir (misal: Rp 100.000).
4. Shift aktif akan muncul sebagai badge di bagian atas navbar.

#### Langkah 5: Transaksi Kasir (POS)
1. Buka menu **Kasir (POS)**.
2. Cari barang melalui kolom pencarian atau klik katalog produk.
3. Transaksi mendukung:
   - Perubahan kuantitas produk & diskon manual item.
   - Pilihan metode bayar: Tunai, QRIS, Transfer Bank, Debit, Kredit.
   - Hitung uang diterima dan kembalian otomatis.
4. Klik **Bayar & Cetak Nota**.
5. Modal struk thermal **58 mm** atau **80 mm** akan muncul siap dicetak ke printer thermal POS Anda.

#### Langkah 6: Tutup Shift & Rekonsiliasi Kas
1. Di akhir jam kerja, buka kembali menu **Shift Kasir**.
2. Klik **Tutup Shift**, masukkan uang kas fisik yang ada di laci kasir.
3. Sistem secara otomatis menghitung selisih kas (*variance*) dan mencatatnya ke buku kas keuangan.

---

## 7. Struktur Database & Backup

### Tabel Utama pada `kasirpro_db`:
1. `roles`: Master peran pengguna (Super Admin, Owner, Manager, Kasir, Admin Inventory).
2. `permissions`: Daftar izin aksi granular (`pos.transaction`, `product.create`, dll).
3. `role_permissions`: Pemetaan izin hak akses ke role.
4. `users`: Akun pengguna dengan password hash bcrypt dan PIN supervisor.
5. `store_settings`: Identitas toko, format struk, prefix invoice, dan pajak default.
6. `products`: Katalog barang, SKU, barcode, harga beli, harga grosir, dan stok.
7. `stock_movements`: Kartu stok (*stock ledger*) seluruh mutasi keluar/masuk.
8. `purchases` & `purchase_items`: Pembelian ke supplier & update HPP otomatis.
9. `sales` & `sale_items`: Transaksi checkout kasir dan detail keranjang belanja.
10. `cashier_shifts`: Pencatatan buka/tutup shift kasir dan rekonsiliasi laci kasir.
11. `cash_transactions`: Buku kas keuangan arus kas masuk dan keluar.
12. `accounts_payable` & `accounts_receivable`: Manajemen hutang & piutang dagang.
13. `audit_logs`: Rekam jejak audit keamanan seluruh aktivitas pengguna sistem.

### Melakukan Ekspor / Backup Database:
- Masuk ke menu **Pengaturan & DB** > Tab **Backup & Database MySQL**.
- Klik **Unduh File .sql** untuk mendapatkan dump SQL lengkap yang siap diimport ke server lain atau phpMyAdmin kapan saja.

---

## 8. Panduan Pemecahan Masalah (Troubleshooting)

### Q1: Error "Port 3000 is already in use"
**Penyebab**: Port 3000 sedang digunakan oleh aplikasi lain di komputer Anda.  
**Solusi**: Buka file `.env`, ubah nilai `PORT=3000` menjadi port lain, misalnya `PORT=3001` atau `PORT=8080`, lalu jalankan kembali `npm run dev`.

### Q2: Error "Access denied for user 'root'@'localhost'"
**Penyebab**: Pengaturan password MySQL di XAMPP/MySQL Anda tidak kosong.  
**Solusi**: Buka file `.env`, sesuaikan nilai `DB_PASSWORD=password_anda`.

### Q3: Error "Table 'kasirpro_db.users' doesn't exist"
**Penyebab**: File `database/schema.sql` belum diimport ke database `kasirpro_db`.  
**Solusi**: Buka phpMyAdmin, pilih `kasirpro_db`, lalu jalankan import `database/schema.sql` kemudian `database/seeds/001_seed_initial.sql`.

### Q4: Gagal Login / Lupa Password Administrator (admin / admin123)
**Penyebab**: File seed lama menggunakan hash yang tidak cocok, atau akun sempat terkunci akibat percobaan login gagal.  
**Solusi Cepat**:
1. **Cara 1 (Otomatis)**: Sistem KasirPro kini telah dilengkapi fitur *auto-healing*. Cukup restart aplikasi di terminal (`npm run dev`), sistem akan otomatis mendeteksi dan memperbaiki password akun `admin` menjadi `admin123`.
2. **Cara 2 (Via phpMyAdmin)**: Buka phpMyAdmin > klik database `kasirpro_db` > klik tab **SQL** > jalankan perintah berikut:
   ```sql
   UPDATE users 
   SET password_hash = '$2a$10$123456789012345678901u./zCLeARnBuyfsw17qkjYMfd7L4o2om', 
       status = 'active', 
       failed_login_attempts = 0 
   WHERE username = 'admin';
   ```
   Atau import file: `database/reset_admin.sql`.
3. Setelah itu, buka kembali `http://localhost:3000` dan login dengan:
   * **Username**: `admin`
   * **Password**: `admin123`

### Q5: Data Pengguna / Toko Tidak Muncul di phpMyAdmin
**Penyebab**:
1. File `.env` belum dibuat di folder root proyek (sehingga sistem belum membaca parameter database MySQL dan beralih ke cache lokal).
2. XAMPP MySQL belum dijalankan (Start) saat server aplikasi dinyalakan.

**Solusi**:
1. Pastikan Anda sudah membuat file `.env` dari `.env.example` di folder utama:
   ```cmd
   copy .env.example .env
   ```
2. Pastikan baris konfigurasi di file `.env` adalah:
   ```env
   DB_ENGINE=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=kasirpro_db
   ```
3. Buka menu **Pengaturan & DB** > tab **Panduan & Status Database**.
4. Periksa kartu **Status Koneksi Database MySQL**:
   - Jika berstatus hijau **Terhubung Aktif**, klik tombol **"Sinkronkan ke MySQL"** untuk langsung menyalin seluruh akun pengguna, profil toko, dan produk yang telah Anda buat ke tabel MySQL.
   - Buka kembali phpMyAdmin dan klik tabel `users` atau `store_settings`, seluruh data Anda kini telah tersimpan permanen!

---

**Selamat Menguji Aplikasi KasirPro!**  
Jika ada pertanyaan atau kebutuhan pengembangan fitur lebih lanjut, Anda dapat mengelolanya langsung melalui sistem modular KasirPro.
