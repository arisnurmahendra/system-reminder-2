![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?logo=google&logoColor=white)
![Status](https://img.shields.io/badge/status-active-success)
![Version](https://img.shields.io/badge/version-v1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Tests](https://img.shields.io/badge/tests-145%2F145%20passed-brightgreen)

# System Reminder 2
> Peningkatan dari *System Reminder — Automated Project To-Do Email* (versi 2022)  
> Sistem pemantauan kemajuan proyek & pengingat otomatis multi-kanal berbasis Web menggunakan Google Apps Script.

---

## 📜 Tentang Proyek
Proyek ini adalah penyempurnaan dari sistem yang pertama kali dikembangkan pada tahun 2022. Jika versi awal hanya berfokus pada pengiriman pengingat tugas lewat email, **System Reminder 2** hadir dengan kemampuan memantau kemajuan proyek secara keseluruhan—mirip fungsi Gantt Chart dan Kurva S—serta menambahkan saluran notifikasi WhatsApp, antarmuka Web Glassmorphism, analitik portofolio, ekspor PDF, integrasi Google Drive, dan kepatuhan standar keamanan POL.ISMS.001.

Dibangun sepenuhnya menggunakan ekosistem Google Workspace, tanpa memerlukan server tambahan.

---

## 🎯 Tujuan

System Reminder 2 bertujuan membantu tim proyek dalam:

- memantau progres pekerjaan secara harian;
- mendeteksi keterlambatan sedini mungkin;
- mengirim pengingat otomatis melalui Email maupun WhatsApp;
- menyajikan visualisasi Kurva S (S-Curve) dan analitik kecepatan proyek;
- mengekspor laporan siap cetak ke format PDF dan mengarsipkannya otomatis ke Google Drive;
- menyederhanakan administrasi proyek melalui antarmuka web yang modern, aman, dan responsif.

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

### Versi Baru (System Reminder 2 v1.0.0)
Melanjutkan kesuksesan versi pertama, sistem ini ditingkatkan dengan arsitektur 3-Tier Layered, antarmuka web Glassmorphism interaktif, komputasi Kurva S matematis, otomasi multi-kanal, dan audit trail terstruktur.

---

## ✨ Fitur Utama
- 📝 **Project Management:** Registrasi, pembaruan, dan siklus hidup proyek (`ACTIVE`, `COMPLETED`, `CANCELLED`, `ARCHIVED`).
- 📊 **Daily Progress Management:** Input progres harian, penanganan penimpaan entri (*overwrite*), dan transisi otomatis ke `COMPLETED` saat 100%.
- 📈 **Schedule & S-Curve Engine:** Perhitungan hari kerja (*working days*), evaluasi keterlambatan, dan aproksimasi Kurva S kumulatif.
- 📧 **Reminder Email Otomatis:** Template email HTML responsif terkirim otomatis saat deviasi keterlambatan terdeteksi atau proyek tuntas.
- 💬 **Integrasi WhatsApp:** Notifikasi instan via Fonnte API dengan sanitasi nomor telepon `628xxx`.
- 📊 **Dashboard Analytics:** Ringkasan eksekutif, sebaran kuartil progres, status kesehatan jadwal, dan kalkulator estimasi waktu rampung (*velocity*).
- 📜 **Notification History:** Pelacakan jejak audit pengiriman multi-kanal dan rasio keberhasilan pengiriman (*success rate*).
- 📑 **Advanced Report & Export PDF:** Pembuatan dokumen laporan PDF individual/portofolio dan pengarsipan terisolasi di Google Drive.
- 🔒 **Security Baseline Control (POL.ISMS.001):** Salted SHA-256 password hashing, lockout brute-force otomatis, masking data sensitif pada log, dan otorisasi RBAC.
- ⚡ **High Performance Caching:** In-memory entity caching dengan invalidasi otomatis saat mutasi data.

---

## ⚙️ Panduan Penggunaan & Instalasi

1. Buat proyek Google Apps Script baru di [script.google.com](https://script.google.com).
2. Hubungkan dengan Google Spreadsheet sebagai basis data.
3. Unggah seluruh berkas kode proyek ke Apps Script.
4. Atur konfigurasi pada **Project Settings → Script Properties** (misalnya `FONNTE_TOKEN`).
5. Deploy sebagai **Web App** (Execute as: *User accessing the web app* / *Me*, Who has access: *Anyone with Google account*).

---

## 🗺️ Roadmap v1.0.0 (Selesai 100%)

### Milestone v0.1: Foundation
- [x] Security Baseline Control (POL.ISMS.001) (#2)
- [x] Repository Layer (#3)
- [x] Service Layer (#4)
- [x] Logging Framework (#5)
- [x] Error Handling Framework (#6)

### Milestone v0.2: Core Features
- [x] Progress Calculation Engine (#7)
- [x] Project Management (#8)
- [x] Daily Progress Management (#9)
- [x] Schedule Engine (#10)
- [x] Dashboard Web (#11)

### Milestone v0.3: Integrations
- [x] Dashboard Summary (#12)
- [x] Reminder Email Notification (#13)
- [x] WhatsApp Integration (#14)

### Milestone v0.4: Enhancement
- [x] Export PDF (#15)
- [x] Google Drive Integration (#16)
- [x] Dashboard Analytics (#17)
- [x] Notification History (#18)
- [x] Advanced Report (#19)
- [x] Performance Improvement (#20)

### Milestone v1.0: Stable Release
- [x] Functional Testing (#21)
- [x] Integration Testing (#22)
- [x] Regression Testing (#23)
- [x] User Acceptance Testing (UAT) (#24)
- [x] Final Documentation Review (#25)
- [x] Prepare Release Notes (#26)
- [x] Publish Version 1.0.0 (#27)

---

## 🛠️ Tumpukan Teknologi
| Komponen | Alat / Layanan |
|---|---|
| Basis Data | Google Spreadsheet |
| Logika & Controller | Google Apps Script (JavaScript V8) |
| Antarmuka Frontend | HTML5, Modern Glassmorphism CSS, Canvas S-Curve JS |
| Pengiriman Email | GmailApp |
| Pengiriman WhatsApp | Fonnte API |
| Penyimpanan Laporan | Google DriveApp |
| Keamanan & Sandi | SHA-256 Hashing, Cryptographic Salt, PropertiesService |

---

## 📂 Struktur Berkas

```text
System-Reminder-2/
├── docs/
│   ├── AI_ROLE.md                  # Peran AI sebagai mitra pengembang proyek
│   ├── AI_WORKFLOW.md              # Alur kerja dan aturan pengembangan
│   ├── ARCHITECTURE_PRINCIPLES.md  # Prinsip arsitektur 3-Tier Layered
│   ├── DEFINITION_OF_DONE.md       # Kriteria kelayakan penyelesaian tugas (DoD)
│   ├── DEPENDENCY_RULES.md         # Aturan dan panduan pengelolaan dependensi
│   ├── PROJECT_CONSTRAINTS.md      # Batasan teknologi dan ruang lingkup proyek
│   ├── SECURITY_POL_ISMS_001.md    # Standar keamanan Baseline Control (POL.ISMS.001)
│   ├── FUNCTIONAL_TEST_REPORT.md   # Laporan hasil pengujian fungsional (145 tests)
│   ├── INTEGRATION_TEST_REPORT.md  # Laporan hasil pengujian integrasi
│   ├── REGRESSION_TEST_REPORT.md   # Laporan hasil pengujian regresi
│   └── UAT_REPORT.md               # Laporan persetujuan User Acceptance Testing
├── assets/
│   ├── script.js                   # Interaksi & logika antarmuka sisi klien (frontend)
│   └── style.css                   # Tampilan & gaya visual antarmuka (CSS)
├── modul/
│   ├── advancedReportService.gs    # Pelaporan analitis portofolio & audit proyek
│   ├── analyticsService.gs         # Visualisasi analitik, kuartil & kecepatan proyek
│   ├── auditLogger.gs              # Logger interceptor & masking data sensitif
│   ├── authPolicy.gs               # Kebijakan password & salted SHA-256 hashing
│   ├── authService.gs              # Layanan otentikasi, lockout & session manager
│   ├── config.gs                   # Konfigurasi terpusat aplikasi (CONFIG)
│   ├── dashboardSummaryService.gs  # Agregasi KPI ringkasan eksekutif
│   ├── driveIntegration.gs         # Manajemen folder & pengarsipan berkas Google Drive
│   ├── email.gs                    # Modul pengiriman notifikasi HTML via Gmail API
│   ├── errorHandler.gs             # Normalisasi & penanganan error terpusat
│   ├── fonnte.gs                   # Modul pengiriman notifikasi WhatsApp via Fonnte API
│   ├── hitung-progres.gs           # Logika kalkulasi progres, Kurva S, & deviasi
│   ├── notificationHistoryService.gs # Audit jejak pengiriman notifikasi
│   ├── notificationService.gs      # Layanan orkestrator notifikasi multi-kanal
│   ├── pdfExportService.gs         # Generator dokumen HTML & PDF laporan proyek
│   ├── performanceBenchmark.gs     # Profiler & benchmark kecepatan eksekusi
│   ├── progressService.gs          # Layanan pengelolaan progres harian proyek
│   ├── projectService.gs           # Layanan pendaftaran & siklus hidup proyek
│   ├── repository.gs               # Abstraksi akses data, batch read & entity cache
│   ├── scheduleEngine.gs           # Komputasi hari kerja & fase linimasa jadwal
│   ├── securityUtils.gs            # Validasi input, sanitasi, rahasia & otorisasi RBAC
│   └── testSuite.gs                # 145/145 Automated Test Suite
├── Code.gs                         # Entry point utama Web App & routing Google Apps Script
├── Index.html                      # Halaman utama aplikasi (HTML UI Glassmorphism)
├── script.html                     # Parsial JavaScript untuk antarmuka web
├── style.html                      # Parsial CSS untuk antarmuka web
├── LICENSE                         # Berkas Lisensi MIT
└── README.md                       # Dokumentasi utama proyek
```

---

## © Lisensi
Proyek ini dilisensikan di bawah Lisensi MIT - silakan lihat berkas [LICENSE](LICENSE) untuk rinciannya.

**Hak Cipta © 2022–2026 Aris**
