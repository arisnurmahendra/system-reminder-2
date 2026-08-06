![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?logo=google&logoColor=white)
![Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-green)

# System Reminder 2
> Peningkatan dari *System Reminder — Automated Project To-Do Email* (versi 2022)  
> Sistem pemantauan kemajuan proyek & pengingat otomatis berbasis Web menggunakan Google Apps Script.

---

## 📜 Tentang Proyek
Proyek ini adalah penyempurnaan dari sistem yang pertama kali dikembangkan pada tahun 2022. Jika versi awal hanya berfokus pada pengiriman pengingat tugas lewat email, **System Reminder 2** hadir dengan kemampuan memantau kemajuan proyek secara keseluruhan—mirip fungsi Gantt Chart dan Kurva S—serta menambahkan saluran notifikasi WhatsApp.

Dibangun sepenuhnya menggunakan ekosistem Google Workspace, tanpa memerlukan server tambahan.

---

## 🎯 Tujuan

System Reminder 2 bertujuan membantu tim proyek dalam:

- memantau progres pekerjaan secara harian;
- mendeteksi keterlambatan sedini mungkin;
- mengirim pengingat otomatis melalui Email maupun WhatsApp;
- menyederhanakan administrasi proyek melalui antarmuka web yang mudah digunakan.

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

## 🖼️ Tampilan Aplikasi

> Screenshot akan ditambahkan setelah antarmuka stabil.

| Dashboard | Input Progress | Pengaturan |
|-----------|----------------|------------|
| *(Coming Soon)* | *(Coming Soon)* | *(Coming Soon)* |

---

## ⚙️ Instalasi

1. Buat proyek Google Apps Script baru.
2. Hubungkan dengan Google Spreadsheet.
3. Salin seluruh berkas proyek.
4. Atur konfigurasi pada `CONFIG`.
5. Masukkan Token Fonnte.
6. Deploy sebagai Web App.

---

## 🗺️ Roadmap

- [x] Reminder Email
- [x] Dashboard Web
- [x] Perhitungan Progress
- [x] Integrasi WhatsApp
- [ ] Dashboard Analitik
- [ ] Multi Project
- [ ] Export PDF
- [ ] Riwayat Notifikasi

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

```text
System-Reminder-2/
├── docs/
│   ├── AI_ROLE.md                  # Peran AI dalam Proyek
│   ├── AI_WORKFLOW.md              # Alur Kerja Pengembangan
│   ├── ARCHITECTURE_PRINCIPLES.md  # Prinsip Arsitektur
│   └── PROJECT_CONSTRAINTS.md      # Batasan Proyek
├── assets/
│   ├── style.css                   # Tampilan antarmuka
│   └── script.js                   # Interaksi sisi klien
├── modul/
│   ├── email.gs                    # Fungsi pengiriman email
│   ├── fonnte.gs                   # Integrasi Fonnte WhatsApp
│   └── hitung-progres.gs           # Perhitungan kurva & keterlambatan
├── .gitignore
├── appsscript.json
├── Code.gs                         # Logika utama & koneksi web
├── Index.html                      # Halaman utama aplikasi
├── LICENSE
└── README.md
```

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

## 📚 Dokumentasi

Dokumentasi pengembangan proyek tersedia pada folder `docs/`.

| Dokumen | Deskripsi |
|---------|-----------|
| `AI_ROLE.md` | Peran AI sebagai mitra pengembang proyek |
| `AI_WORKFLOW.md` | Alur kerja dan aturan pengembangan |
| `ARCHITECTURE_PRINCIPLES.md` | Prinsip arsitektur yang digunakan |
| `PROJECT_CONSTRAINTS.md` | Batasan teknologi dan ruang lingkup proyek |

Dokumen-dokumen tersebut menjadi acuan utama selama proses pengembangan agar implementasi tetap konsisten dengan tujuan proyek.

---

## © Lisensi
Proyek ini dilisensikan di bawah Lisensi MIT - silakan lihat berkas [LICENSE](LICENSE) untuk rinciannya.

**Hak Cipta © 2022–2026 Aris**
