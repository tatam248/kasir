# KASIRPRO - Sistem Kasir (POS), Inventory & Manajemen Pengguna (RBAC)

Aplikasi Web Point of Sale (POS) modern, cepat, responsif, dan komprehensif yang dirancang untuk toko retail, warung, minimarket, toko sembako, distributor, dan usaha dagang sejenis.

---

## 🚀 Fitur Utama

1. **Kasir / Point of Sale (POS)**:
   - Pencarian cepat via Barcode Scanner, SKU, atau Nama Produk.
   - Scan barcode langsung memasukkan barang ke keranjang belanja.
   - Penentuan harga dinamis (Otomatis menerapkan harga grosir jika memenuhi minimum pembelian).
   - Penahanan & pemanggilan transaksi (*Hold / Recall Bill*).
   - Otorisasi Supervisor dengan PIN untuk diskon khusus atau pembatalan transaksi (*Void*).
   - Multi-Metode Pembayaran: Tunai (hitung kembalian otomatis & tombol uang pas/pecahan cepat), QRIS dinamis, Transfer Bank, Debit/EDC, dan Kredit Pelanggan (Piutang).
   - Cetak struk kasir format thermal printer **58 mm** & **80 mm**, reprint struk, dan ekspor struk ke PDF.

2. **Inventory & Kartu Stok (Stock Ledger)**:
   - **Kartu Stok Lengkap**: Setiap pergerakan stok memiliki histori audit terperinci (stok awal, pembelian, penjualan, retur, penyesuaian, barang rusak/hilang, dan stock opname).
   - **Perhitungan HPP Weighted Average**: Harga Pokok Penjualan dihitung secara dinamis berbasis rata-rata tertimbang setiap kali ada penerimaan barang baru dari supplier.
   - **Modul Stock Opname**: Alur opname sistematis: pilih barang → tampilkan stok sistem → input hitungan fisik aktual → hitung selisih otomatis → approval supervisor → posting mutasi stok.
   - **Peringatan Stok Otomatis**: Notifikasi visual status stok (Stok Aman, Stok Menipis $\le$ min stok, Stok Habis).

3. **Pembelian & Hutang Supplier**:
   - Alur Purchase Order (PO) → Penerimaan Barang → Stok Bertambah & HPP Diperbarui → Pembuatan Hutang Otomatis (jika kredit).
   - Manajemen Hutang Supplier (*Accounts Payable*) dengan riwayat angsuran/pembayaran bertahap.

4. **Retur Penjualan & Piutang Pelanggan**:
   - Retur penjualan divalidasi ketat terhadap invoice asli (tidak bisa melebihi sisa qty yang belum diretur).
   - Manajemen Piutang Pelanggan (*Accounts Receivable*) dengan validasi limit kredit pelanggan dan pencatatan pembayaran cicilan.

5. **Shift Kasir & Buku Kas Keuangan**:
   - Buka shift dengan modal awal laci kasir.
   - Tutup shift dengan rekonsiliasi kas sistem vs kas fisik aktual dan penghitungan selisih (*variance*).
   - Buku Kas (*Cash Book*) mencatat seluruh transaksi kas masuk/keluar dengan referensi unik anti pencatatan ganda.

6. **Manajemen Pengguna & RBAC (Role-Based Access Control)**:
   - 5 Role Standar: Super Admin, Owner, Manager, Admin Inventory, Kasir.
   - Kontrol izin granular (Permissions): `product.view`, `product.create`, `product.edit`, `inventory.adjust`, `pos.transaction`, `pos.discount`, `pos.cancel`, `pos.refund`, `report.profit`, `user.manage`, dll.
   - Enkripsi password menggunakan **bcrypt**.
   - Audit trail (*Audit Log*) immutable mencatat aktivitas penting pengguna beserta detail perubahannya.

7. **Laporan & Analisis Bisnis**:
   - Laporan Laba Kotor (*Gross Profit*) berbasis HPP Rata-rata Tertimbang: Penjualan Bersih − HPP = Laba Kotor.
   - Laporan Penjualan harian, bulanan, per produk, per kategori, per kasir, dan per pelanggan.
   - Analisis Produk Terlaris (*Top Selling*) dan Produk Kurang Laku (*Dead Stock*).
   - Ekspor laporan ke format **CSV / Excel** dan cetak **PDF**.

---

## 🛠️ Panduan Persiapan & Menjalankan Aplikasi (Development Guide)

### 1. Prasyarat Sistem
- **Node.js** (v18 atau lebih baru)
- **XAMPP** (dengan Apache dan MySQL/MariaDB) atau MySQL Server 8.0+

### 2. Setup XAMPP & MySQL
1. Buka **XAMPP Control Panel**.
2. Klik tombol **Start** pada modul **MySQL** (dan Apache jika ingin menggunakan phpMyAdmin).
3. Pastikan port MySQL berjalan di `3306`.

### 3. Membuat Database MySQL
1. Buka browser dan akses `http://localhost/phpmyadmin` (atau gunakan tool MySQL Client seperti HeidiSQL/DBeaver).
2. Buat database baru dengan nama: `kasirpro_db` dengan collation `utf8mb4_unicode_ci`.

### 4. Import Schema & Seed Database
- Buka tab **Import** di phpMyAdmin pada database `kasirpro_db`.
- Pilih file: `database/schema.sql` lalu klik **Go** / **Kirim**.
- Kemudian pilih file: `database/seeds/001_seed_initial.sql` lalu klik **Go**.
- *Alternatif melalui Command Line (Terminal / CMD):*
  ```bash
  mysql -u root -p kasirpro_db < database/schema.sql
  mysql -u root -p kasirpro_db < database/seeds/001_seed_initial.sql
  ```

### 5. Mengisi Konfigurasi `.env`
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi database Anda di dalam `.env`:
```env
PORT=3000
DB_ENGINE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=kasirpro_db
JWT_SECRET=super_secret_jwt_key_kasirpro_2026
```
*(Catatan: Jika dijalankan di lingkungan cloud container/preview tanpa server MySQL eksternal aktif, sistem otomatis beralih ke engine penyimpanan relasional tertanam yang aman dan persisten).*

### 6. Menjalankan Aplikasi Full-Stack
Jalankan dev server Express + Vite:
```bash
npm run dev
```
Aplikasi akan aktif di: `http://localhost:3000`.

---

## 👥 Akun Login Bawaan (Default Administrator)

Setelah database diimport, gunakan akun administrator bawaan berikut untuk login pertama kali:

| Role | Username | Password | PIN Supervisor | Keterangan |
|---|---|---|---|---|
| **Super Admin** | `admin` (atau `superadmin`) | `admin123` | `123456` | Akses penuh seluruh sistem, manajemen pengguna, RBAC, profil toko & backup |

> **Catatan Penting**: Seluruh data dummy staf (kasir, manager, admin gudang) telah dihilangkan. Seluruh akun pengguna kasir dan staf lainnya dibuat murni melalui menu **Pengguna & RBAC** dan tersimpan langsung ke database MySQL.

---

## 📋 Alur Operasional Pertama Kali

1. **Login Pertama**: Buka `http://localhost:3000`, masukkan username `admin` dan password `admin123`.
2. **Setup Profil Toko**: Masuk ke menu **Pengaturan & DB** > Tab **Profil Toko & Struk** untuk mengisi nama toko Anda, alamat, nomor kontak, logo, footer nota, dan persentase pajak default. Simpan ke database.
3. **Mendaftarkan Pengguna & Staf**: Masuk ke menu **Pengguna & RBAC** untuk menambahkan akun kasir, manajer, atau admin gudang baru dengan hak akses terkontrol.
4. **Mendaftarkan Master Data**: Masuk ke menu **Master Produk** & **Kategori & Satuan** untuk mendaftarkan barang dagangan beserta harga beli, harga jual, stok awal, dan barcode.
5. **Buka Shift Kasir**: Masuk ke menu **Shift Kasir**, buka shift dengan memasukkan modal awal kas kasir (misal: Rp 100.000).
6. **Melayani Transaksi Penjualan**: Buka menu **Kasir (POS)**, scan barcode barang atau cari produk, pilih metode bayar (Tunai/QRIS/Transfer/Debit), input nominal uang, dan cetak struk nota!
