# System Reminder 2
> Peningkatan dari *System Reminder — Automated Project To-Do Email* (versi 2022)  
> Sistem pemantauan kemajuan proyek & pengingat otomatis berbasis Web menggunakan Google Apps Script.

---

## 📜 Tentang Proyek
Proyek ini adalah penyempurnaan dari sistem yang pertama kali dikembangkan pada tahun 2022. Jika versi awal hanya berfokus pada pengiriman pengingat tugas lewat email, **System Reminder 2** hadir dengan kemampuan memantau kemajuan proyek secara keseluruhan—mirip fungsi Gantt Chart dan Kurva S—serta menambahkan saluran notifikasi WhatsApp.

Dibangun sepenuhnya menggunakan ekosistem Google Workspace, tanpa memerlukan server tambahan.

---

## ❤️ Latar Belakang & Sejarah
### Versi Awal (2022)
**Judul:** *System Reminder — Automated Project To-Do Email*

**Masalah:**
Mengingatkan PIC proyek secara manual memakan waktu, mudah terlewat, dan tidak ada fitur pengingat berulang yang bisa berhenti otomatis saat tugas selesai pada layanan email umum.

**Hasil yang Dicapai:**
- ⏱️ Efisiensi waktu: **Turun 81,8%** (dari 110 menit menjadi 20 menit)
- ✅ **21 notifikasi terkirim otomatis** tanpa ada yang terlewat
- 📋 Mencegah proyek melewati batas waktu pemeliharaan
- 💡 Mengurangi beban administrasi tim

### Versi Baru (System Reminder 2)
Melanjutkan kesuksesan versi pertama, sistem ini ditingkatkan untuk menjawab kebutuhan pemantauan jadwal dan kemajuan proyek secara lebih mendalam.

---

## 🎯 Masalah yang Diselesaikan
- Proyek sering terlambat diketahui saat sudah terlampau jauh dari jadwal
- Tidak ada perbandingan visual antara rencana vs realisasi harian
- Pengingat hanya lewat email, padahal komunikasi lapangan sering menggunakan WhatsApp
- Pengaturan yang sebelumnya berbasis lembar kerja, kini disederhanakan melalui antarmuka web

---

## ✨ Fitur Utama
- 📝 **Pendaftaran Proyek:** Simpan data proyek, jadwal, dan kontak PIC
- 📊 **Input Kemajuan Harian:** Catat persentase penyelesaian aktual setiap hari
- 📈 **Analisis Jadwal:** Perbandingan otomatis antara rencana vs realisasi (konsep Kurva S & Gantt)
- 📧 **Notifikasi Email Otomatis:** Terkirim jika terdeteksi keterlambatan (bisa dinyalakan/dimatikan)
- 💬 **Notifikasi WhatsApp:** Menggunakan layanan Fonnte untuk pengingat yang lebih cepat
- 🎛️ **Kontrol Pusat:** Pengaturan aktif/nonaktif notifikasi per proyek
- 🖥️ **Antarmuka Web:** Pengelolaan mudah lewat halaman internal berbasis HTML di Google Apps Script

---

## 🛠️ Tumpukan Teknologi
| Komponen | Alat / Layanan |
|---|---|
| Penyimpanan Data | Google Spreadsheet |
| Logika & Otomasi | Google Apps Script |
| Antarmuka | HTML, CSS, JavaScript (terintegrasi GAS) |
| Pengiriman Email | Gmail |
| Pengiriman WhatsApp | Fonnte API |
| Penyimpanan Berkas | Google Drive |

---

## 📂 Struktur Berkas
System-Reminder-2/
├── docs
│ ├── AI_ROLE.md                 ← Peran AI dalam Proyek
│ ├── AI_WORKFLOW.md             ← Alur Kerja Pengembangan
│ ├── ARCHITECTURE_PRINCIPLES.md ← Prinsip Arsitektur
│ └── PROJECT_CONSTRAINTS.md     ← Batasan Proyek
├── README.md
├── LICENSE
├── .gitignore
├── appsscript.json
├── Code.gs               # Logika utama & koneksi web
├── Index.html            # Halaman utama aplikasi
├── assets/
│ ├── style.css           # Tampilan antarmuka
│ └── script.js           # Interaksi sisi klien
└── modul/
  ├── email.gs            # Fungsi pengiriman email
  ├── fonnte.gs           # Integrasi Fonnte WhatsApp
  └── hitung-progres.gs   # Perhitungan kurva & keterlambatan

---

## 🚀 Cara Kerja Singkat
1. **Daftarkan Proyek:** Masukkan nama, tanggal mulai, tanggal selesai, dan kontak penerima lewat halaman web
2. **Input Harian:** Setiap hari masukkan persentase kemajuan yang sudah dicapai
3. **Pengecekan Otomatis:** Sistem membandingkan kemajuan aktual dengan yang seharusnya terjadi pada tanggal tersebut
4. **Kirim Peringatan:** Jika aktual lebih lambat dari rencana & notifikasi aktif, sistem otomatis mengirim pesan Email atau WhatsApp
5. **Kendali:** Pengguna bisa mematikan sementara notifikasi kapan saja

---

## ⚠️ Catatan Penting
- Token API Fonnte dan pengaturan rahasia **tidak disertakan** dalam repositori ini demi keamanan
- Konfigurasi sensitif disimpan secara lokal atau di pengaturan proyek Google Apps Script
- Penggunaan kuota pengiriman mengikuti batasan layanan Gmail dan Fonnte

---

🤖 AI_ROLE.md — Peran AI dalam Proyek
# AI_ROLE.md
## Peran Utama
Kamu adalah mitra pengembang untuk proyek **System Reminder 2**.
Tugas utamamu:
- Membantu menyempurnakan kode Google Apps Script
- Memberikan saran yang sesuai dengan arsitektur yang sudah ditetapkan
- Menjelaskan konsep dengan sederhana namun akurat
- Menghindari usulan teknologi di luar stack yang sudah dipilih

## Batasan
- Jangan mengusulkan penggantian layanan Google Workspace dengan layanan lain
- Jangan mengusulkan penggunaan kerangka kerja web berat (seperti React/Vue) kecuali untuk penyempurnaan tampilan HTML dasar
- Selalu utamakan kompatibilitas dengan Google Apps Script

🔄 AI_WORKFLOW.md — Alur Kerja Pengembangan
# AI_WORKFLOW.md
## Aturan Kerja
1. **Kembangkan secara bertahap**: Mulai dari fungsi dasar, lalu integrasi, terakhir tampilan.
2. **Gunakan ulang kode lama**: Jika ada fungsi dari versi 2022 yang masih relevan, sesuaikan saja—jangan tulis ulang dari nol jika tidak perlu.
3. **Keamanan diutamakan**: Token API, kunci rahasia, tidak boleh tertulis di kode utama.
4. **Uji coba bertahap**: Pastikan satu fitur berjalan baik sebelum menambah fitur baru.
5. **Dokumentasi**: Setiap fungsi baru harus memiliki penjelasan singkat cara kerjanya.

🏗️ ARCHITECTURE_PRINCIPLES.md — Prinsip Arsitektur
# ARCHITECTURE_PRINCIPLES.md
## Prinsip Utama System Reminder 2
- **Berbasis Google Workspace**: Semua data tersimpan di Google Sheets, logika berjalan di Apps Script.
- **Tanpa Server Tambahan**: Tidak menggunakan hosting eksternal atau database terpisah.
- **Antarmuka Web Sederhana**: Menggunakan HTML, CSS, dan JS murni yang terintegrasi dengan GAS.
- **Modular**: Kode dipisah per fungsi (email, wa, hitung, konfigurasi) agar mudah diperbaiki.
- **Kompatibel**: Melanjutkan sistem lama, bukan menggantinya sepenuhnya.
- **Kendali Pengguna**: Setiap notifikasi bisa diatur aktif/tidak secara mandiri.

⚠️ PROJECT_CONSTRAINTS.md — Batasan Proyek
# PROJECT_CONSTRAINTS.md
## Batasan Teknologi
- **Wajib**: Google Apps Script, Google Sheets, Gmail, Fonnte API, HTML/CSS/JS dasar.
- **Dilarang**: Bahasa pemrograman lain, kerangka aplikasi berat, layanan berbayar baru, penyimpanan data di luar Google.
- **Keamanan**: Kunci API Fonnte dan data sensitif tidak boleh masuk ke repositori publik.
- **Ketersediaan**: Sistem harus tetap berjalan meskipun tanpa koneksi internet saat input data nanti disinkronkan ulang.
- **Kapasitas**: Mengikuti batas kuota pengiriman Gmail dan Fonnte untuk penggunaan wajar.

## © Lisensi
Proyek ini dilisensikan di bawah Lisensi MIT - silakan lihat berkas [LICENSE](LICENSE) untuk rinciannya.

**Hak Cipta © 2022–2026 Aris**
