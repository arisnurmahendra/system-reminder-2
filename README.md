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
- 🔒 **Keamanan Baseline Control (POL.ISMS.001):**
  - **Otentikasi & RBAC:** Hak akses bertingkat (`ADMINISTRATOR`, `PROJECT_MANAGER`, `REGULAR_USER`, `AUDITOR`).
  - **Password & Lockout:** Penggantian password default wajib pada login pertama, aturan password ketat, dan lockout otomatis setelah 10 kali percobaaan gagal.
  - **Audit Logging:** Pencatatan jejak audit aktivitas secara terstruktur dengan masking otomatis untuk data sensitif.
  - **MFA:** Integrasi Google 2-Step Verification (2SV) wajib untuk Administrator.
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
4. Atur konfigurasi pada `Script Properties` (seperti `FONNTE_TOKEN`).
5. Deploy sebagai Web App.

---

## 🗺️ Roadmap

Pengembangan fitur dilakukan berdasarkan **Mekanisme AI Workflow** (*Analyze ➔ Design ➔ Implement ➔ Review ➔ Test ➔ Document*).

### Tahap 1: Fondasi & Keamanan
- **Security Baseline Control (POL.ISMS.001)**
  - [x] Analyze & Design
  - [ ] Implement
  - [ ] Review & Test
  - [x] Document
- **Perhitungan Progress**
  - [ ] Analyze & Design
  - [ ] Implement
  - [ ] Review & Test
  - [ ] Document

### Tahap 2: Antarmuka & Notifikasi Dasar
- **Dashboard Web**
  - [ ] Analyze & Design
  - [ ] Implement
  - [ ] Review & Test
  - [ ] Document
- **Reminder Email**
  - [ ] Analyze & Design
  - [ ] Implement
  - [ ] Review & Test
  - [ ] Document

### Tahap 3: Integrasi Lanjutan & Skalabilitas
- **Integrasi WhatsApp**
  - [ ] Analyze & Design
  - [ ] Implement
  - [ ] Review & Test
  - [ ] Document
- **Dashboard Analitik**
  - [ ] Analyze & Design
  - [ ] Implement
  - [ ] Review & Test
  - [ ] Document
- **Multi Project**
  - [ ] Analyze & Design
  - [ ] Implement
  - [ ] Review & Test
  - [ ] Document
- **Export PDF**
  - [ ] Analyze & Design
  - [ ] Implement
  - [ ] Review & Test
  - [ ] Document
- **Riwayat Notifikasi**
  - [ ] Analyze & Design
  - [ ] Implement
  - [ ] Review & Test
  - [ ] Document

---

## 🛠️ Tumpukan Teknologi
| Komponen | Alat / Layanan |
|---|---|
| Penyimpanan Data | Google Spreadsheet |
| Logika & Otomasi | Google Apps Script |
| Antarmuka | HTML, CSS, JavaScript (terintegrasi GAS) |
| Pengiriman Email | Gmail |
| Pengiriman WhatsApp | Fonnte API |
| Keamanan & Rahasia | Google Apps Script PropertiesService & Utilities Digest |
| Penyimpanan Berkas | Google Drive |

---

## 📂 Struktur Berkas

```text
System-Reminder-2/
├── docs/
│   ├── AI_ROLE.md                  # Peran AI sebagai mitra pengembang proyek
│   ├── AI_WORKFLOW.md              # Alur kerja dan aturan pengembangan
│   ├── ARCHITECTURE_PRINCIPLES.md  # Prinsip arsitektur dan desain sistem
│   ├── DEFINITION_OF_DONE.md       # Kriteria kelayakan penyelesaian tugas (DoD)
│   ├── DEPENDENCY_RULES.md         # Aturan dan panduan pengelolaan dependensi
│   ├── PROJECT_CONSTRAINTS.md      # Batasan teknologi dan ruang lingkup proyek
│   └── SECURITY_POL_ISMS_001.md    # Standar keamanan Baseline Control (POL.ISMS.001)
├── assets/
│   ├── script.js                   # Interaksi & logika antarmuka sisi klien (frontend)
│   └── style.css                   # Tampilan & gaya visual antarmuka (CSS)
├── modul/
│   ├── dashboard.gs                # Logika backend pemrosesan data dashboard
│   ├── email.gs                    # Modul pengiriman notifikasi via Gmail API
│   ├── fonnte.gs                   # Modul pengiriman notifikasi WhatsApp via Fonnte API
│   ├── hitung-progres.gs           # Logika kalkulasi progres, Kurva S, & keterlambatan
│   └── repository.gs               # Abstraksi akses data & operasi Google Sheets
├── .claspignore                    # Pengaturan file yang diabaikan oleh Clasp CLI
├── .gitignore                      # Pengaturan file yang diabaikan oleh Git
├── .prettierignore                 # Pengaturan file yang diabaikan oleh Prettier
├── .prettierrc                     # Konfigurasi format kode Prettier
├── Code.gs                         # Entry point utama Web App & routing Google Apps Script
├── Index.html                      # Halaman utama aplikasi (HTML UI)
├── gas2git.cmd                     # Skrip otomasi tarik kode dari GAS ke repositori Git
├── git2gas.cmd                     # Skrip otomasi dorong kode dari Git ke GAS
├── LICENSE                         # Berkas Lisensi MIT
└── README.md                       # Dokumentasi utama proyek
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
- Konfigurasi sensitif disimpan pada **`PropertiesService`** Google Apps Script
- Penggunaan kuota pengiriman mengikuti batasan layanan Gmail dan Fonnte

---

## 📚 Dokumentasi

Dokumentasi pengembangan proyek tersedia pada folder `docs/`.

| Dokumen | Deskripsi |
|---------|-----------|
| `AI_ROLE.md` | Peran AI sebagai mitra pengembang proyek |
| `AI_WORKFLOW.md` | Alur kerja dan aturan pengembangan |
| `ARCHITECTURE_PRINCIPLES.md` | Prinsip arsitektur yang digunakan |
| `DEFINITION_OF_DONE.md` | Kriteria kelayakan penyelesaian tugas (DoD) |
| `DEPENDENCY_RULES.md` | Aturan dan panduan pengelolaan dependensi |
| `PROJECT_CONSTRAINTS.md` | Batasan teknologi dan ruang lingkup proyek |
| `SECURITY_POL_ISMS_001.md` | Standar keamanan Baseline Control & acuan implementasi (POL.ISMS.001) |

Dokumen-dokumen tersebut menjadi acuan utama selama proses pengembangan agar implementasi tetap konsisten dengan tujuan proyek.

---

## © Lisensi
Proyek ini dilisensikan di bawah Lisensi MIT - silakan lihat berkas [LICENSE](LICENSE) untuk rinciannya.

**Hak Cipta © 2022–2026 Aris**
