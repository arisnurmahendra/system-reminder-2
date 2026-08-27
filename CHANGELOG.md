# Changelog

Semua perubahan penting pada proyek **System Reminder 2** akan didokumentasikan dalam berkas ini.

Format berkas ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id-ID/1.0.0/) dan mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-27

### Ditambahkan
- **Security Baseline Control (POL.ISMS.001):** Salted SHA-256 password hashing, brute-force lockout, masking data sensitif log audit, otorisasi RBAC (#2).
- **Repository Layer:** Abstraksi `BaseRepository` dengan in-memory entity cache dan singleton sheet manager (#3, #20).
- **Service Layer:** Pemisahan business logic dari layer presentasi (#4).
- **Logging & Error Framework:** `AppLogger` dan `ErrorHandler` dengan normalisasi error terpusat `AppError` (#5, #6).
- **Progress & Schedule Engine:** Kalkulasi durasi kerja, linimasa hari kerja, aproksimasi Kurva S kumulatif, dan status keterlambatan (#7, #10).
- **Project & Daily Progress Management:** CRUD proyek, input progres harian, proteksi penimpaan entri, dan auto-complete 100% (#8, #9).
- **Web App Dashboard:** Antarmuka Web responsif Glassmorphism dengan render Canvas S-Curve interaktif (#11).
- **Executive Summary & Dashboard Analytics:** Agregasi metrik KPI, distribusi kuartil progres, dan kalkulator kecepatan/forecast tanggal rampung (#12, #17).
- **Multi-Channel Notification:** Otomasi pengiriman email HTML via GmailApp dan pesan WhatsApp via Fonnte API (#13, #14).
- **Reporting & Google Drive:** Ekspor PDF laporan proyek/portofolio, pengarsipan otomatis Google Drive, dan matriks varians deviasi (#15, #16, #18, #19).
- **Performance Optimization:** In-memory caching dan benchmarking profiler (#20).
- **Pengujian Lengkap (QA):** 145/145 unit test otomatis lulus 100%, laporan Functional, Integration, Regression, dan UAT sign-off (#21, #22, #23, #24).
