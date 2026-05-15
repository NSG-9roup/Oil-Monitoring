# Dashboard UI Spec Final

## Scope
Dokumen ini menetapkan struktur final UI untuk dashboard customer agar lebih ringkas, cepat dinavigasi, dan mudah di-maintain.

Tujuan utama:

1. Mengurangi panjang halaman utama.
2. Menambahkan shortcut ke setiap kategori report.
3. Memisahkan ringkasan dan analisis mendalam.
4. Menjaga performa dan konsistensi mobile-desktop.

---

## Information Architecture

Dashboard utama berperan sebagai hub ringkasan.

Kategori halaman:

1. Dashboard Hub
2. Reports Explorer
3. Purchase Analytics
4. Compare Machines
5. Actions Center
6. Profile and Preferences

Prinsip:

1. Halaman utama hanya menampilkan data prioritas tinggi.
2. Data detail dipindahkan ke halaman kategori.
3. Semua kategori dapat diakses dari shortcut navigator.

---

## Final Section Order (Dashboard Hub)

1. Hero Header
2. Sticky Shortcut Navigator
3. Critical Snapshot Cards
4. Oil Trend Overview
5. Recent Lab Reports
6. Recent Purchase History
7. Compare and Insights Teaser
8. Footer Action Bar

Alasan urutan:

1. User melihat status sistem dalam hitungan detik.
2. Shortcut selalu tersedia untuk lompatan cepat.
3. Detail berat tetap bisa diakses tanpa membuat halaman utama terlalu panjang.

---

## Section Spec

### 1) Hero Header

Konten:

1. Nama customer.
2. Machine selector.
3. Date range selector.
4. Last sample timestamp.

Aturan:

1. Tinggi ringkas dan tetap stabil di semua breakpoint.
2. Selector utama harus selalu terlihat tanpa scroll panjang.

### 2) Sticky Shortcut Navigator

Shortcut wajib:

1. Trend
2. Lab Reports
3. Purchases
4. Compare
5. Insights

Perilaku:

1. Desktop: sticky di bawah header.
2. Mobile: horizontal scroll chips.
3. Active state mengikuti section yang sedang terlihat.

### 3) Critical Snapshot Cards

Kartu minimum:

1. Viscosity health.
2. Water content status.
3. TAN status.
4. Open actions.
5. Last test date.

Aturan:

1. Maksimal 5 kartu di dashboard utama.
2. Gunakan status label yang konsisten: good, warning, critical.

### 4) Oil Trend Overview

Konten:

1. Grafik trend ringkas (2 sampai 3 chart).
2. Time range toggle.
3. Metric toggle.

Aturan:

1. Default menampilkan metrik paling penting terlebih dahulu.
2. Sediakan CTA ke halaman analisis trend penuh.

### 5) Recent Lab Reports

Konten:

1. Tabel ringkas 5 report terbaru.
2. Status abnormal marker.
3. Aksi preview dan download.

Aturan:

1. Tidak menampilkan tabel panjang di hub.
2. Sediakan CTA View All ke Reports Explorer.

### 6) Recent Purchase History

Konten:

1. Ringkasan volume dan spending.
2. Tabel ringkas 5 transaksi terbaru.

Aturan:

1. Fokus ke ringkasan, bukan analytics mendalam.
2. Sediakan CTA ke Purchase Analytics.

### 7) Compare and Insights Teaser

Konten:

1. Ringkasan mesin paling berisiko.
2. Ringkasan mesin paling stabil.
3. CTA ke Compare Machines.

Aturan:

1. Section ini hanya teaser, bukan workspace penuh.

### 8) Footer Action Bar

Aksi utama:

1. Export monthly summary.
2. Download report pack.
3. Contact support.

Aturan:

1. Hanya aksi global, tanpa data padat.

---

## Navigation and Shortcut Rules

1. Semua shortcut harus punya anchor id yang stabil.
2. Navigasi antar section menggunakan smooth scroll.
3. Tombol active harus jelas secara visual.
4. Jika section dipindah ke halaman lain, shortcut berubah menjadi route link.

---

## Data Density Rules

1. Hub hanya menampilkan recent data.
2. Detail full table hanya di halaman kategori.
3. Maksimal 1 primary CTA per section.
4. Hindari duplikasi metrik di lebih dari satu section.

---

## Responsive Rules

Desktop:

1. Grid 2 sampai 3 kolom untuk snapshot.
2. Shortcut sticky penuh lebar kontainer.

Mobile:

1. Satu kolom vertikal untuk section utama.
2. Shortcut menjadi chips horizontal.
3. Tabel ringkas wajib scroll horizontal aman.

---

## Accessibility Rules

1. Semua shortcut bisa diakses keyboard.
2. Active state memiliki kontras yang cukup.
3. Setiap chart memiliki label dan ringkasan teks.
4. Aksi penting tidak bergantung pada warna saja.

---

## Maintainability Rules

1. Dashboard hub dipisah menjadi komponen section.
2. Setiap section memiliki kontrak props yang jelas.
3. Query data ringkas dipisah dari query detail.
4. Shared UI untuk card, section header, dan shortcut item wajib reusable.

---

## Success Criteria

1. User dapat mencapai kategori report target dalam maksimal 1 klik shortcut.
2. Halaman dashboard utama tetap terbaca tanpa scroll berlebihan.
3. Time-to-insight awal turun karena snapshot tampil lebih dulu.
4. Penambahan kategori baru tidak menambah kompleksitas besar pada halaman hub.

---

## Implementation Checklist (Non-code)

1. Finalisasi label shortcut dan urutan section.
2. Tetapkan kategori mana yang tetap di hub vs halaman detail.
3. Setujui kontrak data ringkas per section.
4. Validasi wireframe desktop dan mobile.
5. Lakukan implementasi bertahap mulai dari shortcut navigator dan snapshot.
