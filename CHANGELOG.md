# Changelog

Semua perubahan penting pada proyek **System Reminder 2** akan didokumentasikan dalam berkas ini.

Format berkas ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id-ID/1.0.0/) dan mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-09-03

### Ditambahkan
- **Frontend Debugging Mode:** Penambahan *helper* `logDebug()` dengan emoji indikator pada setiap request GAS (`.withSuccessHandler` / `.withFailureHandler`) untuk visibilitas respons asli backend di console browser.
- **Frontend Skeleton Loader:** Menambahkan animasi skeleton saat Web App sedang memuat data (`loadProjects`) untuk meningkatkan *User Experience*.
- **Otorisasi Sesi (Logout):** Penambahan endpoint backend `apiLogout` terintegrasi dengan pembersihan `sessionStorage`.
- **Revoke Permissions Tool:** Penambahan fitur menu internal (Toolbar GAS) dan tombol Web App (opsional) untuk mencabut otoritas skrip secara instan (`ScriptApp.invalidateAuth()`).
- **Manajemen Pengguna (RBAC):** Menambahkan antarmuka (UI) dan logika di backend (`userService.gs`) untuk membuat dan memantau akun pengguna khusus untuk akses `ADMINISTRATOR`.
- **Pengaturan Profil (Ganti Password):** Penambahan fitur mandiri bagi semua pengguna untuk mengubah *password* mereka, dijamin dengan validasi kebijakan keamanan tingkat tinggi (POL.ISMS.001).

### Diperbaiki
- **Date Parsing Bug pada google.script.run:** Sanitasi *payload* menggunakan `JSON.parse(JSON.stringify(rawResult))` di *wrapper* `safeWebResponse` agar objek `Date` native bawaan Google Sheets berhasil diteruskan ke frontend tanpa menjadi *undefined*.
- **Dropdown List & Search Bug:** Pemetaan (*mapping*) array proyek pada `populateProjectDropdowns` dan `handleProjectSearch` kini meresolusi bentuk struktur data secara proporsional.
- **Render Tanggal Proyek:** Format ISO-8601 diubah menjadi format tanggal lokal menggunakan fungsi `formatDateLocal()`.
- **Responsive Flex-Wrap Panel:** Perbaikan bug UI pada `panel-header` yang keluar dari bingkai/menumpuk dengan menyisipkan class utilitas *CSS flex-wrap*.
- **Bug Layout Index.html & Tab Management:** Memperbaiki insiden *nested HTML* (tag penutup yang hilang) sehingga panel "Manajemen Pengguna" (`#tabUsers`) bisa diakses dari *sidebar*.
- **UI Modal Classes Mismatch:** Menyeragamkan class CSS `.modal-overlay` menjadi `.modal-backdrop` dan `.modal-card` untuk *Profile Modal*, *User Modal*, dan *WBS Modal* sehingga bisa tampil/tertutup dengan benar.
- **UI Skeleton Loader Animasi CSS:** Menambahkan *styling CSS pulse animation* dan menyamakan placeholder `.skeleton-row` pada seluruh tabel untuk pengalaman pengguna yang lebih baik saat memuat data (*Overview, Projects, Progress, Users*).
- **Bug Payload UserService:** Memperbaiki fungsi `UserService.getAllUsers()` yang keliru memanggil metode repositori rahasia serta salah menerjemahkan pemetaan data atribut objek (mengubah dari *snake_case* menjadi *camelCase*), sehingga data Pengguna gagal tampil.

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
