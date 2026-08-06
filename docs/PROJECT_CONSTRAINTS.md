# Project Constraints

## Purpose

Dokumen ini mendefinisikan batasan proyek dan aturan kepatuhan yang tidak boleh dilanggar selama pengembangan **System Reminder 2**.

---

# Technology Stack

Wajib menggunakan:

- Google Apps Script (V8 Runtime)
- Google Sheets (Database & Audit Store)
- Gmail API
- HTML, CSS, JavaScript ES6
- Google Drive
- Fonnte API (Notifikasi WhatsApp)
- Properties Service (`ScriptProperties` untuk Rahasia/Token)

---

# Forbidden Technologies

Tidak diperbolehkan menambahkan:

- React / Vue / Angular
- Node.js Backend / Express
- Firebase / Supabase
- MySQL / PostgreSQL / MongoDB
- Docker / Kubernetes

kecuali ada keputusan arsitektur baru yang disetujui.

---

# Hosting

Aplikasi berjalan sepenuhnya menggunakan:

- Google Apps Script Web App (`script.google.com`)

Tidak menggunakan server atau hosting tambahan.

---

# Database

- Seluruh data operasional dan audit log disimpan pada **Google Spreadsheet**.
- Dilarang menggunakan database eksternal.

---

# Authentication & Access Control (POL.ISMS.001)

Mengikuti standar **POL.ISMS.001**:

- Menggunakan autentikasi bawaan Google Workspace (`Session.getActiveUser()`).
- Penerapan **Role-Based Access Control (RBAC)** berprinsip *least privilege* (`ADMINISTRATOR`, `PROJECT_MANAGER`, `REGULAR_USER`, `AUDITOR`).
- Pemaksaan pergantian password/PIN default pada saat login pertama (*initial login*).
- Kebijakan password ketat (kombinasi huruf besar, huruf kecil, angka, dan karakter khusus; min 8 karakter untuk user biasa, min 14 karakter untuk Admin).
- **Account Lockout otomatis** setelah 10 kali upaya verifikasi yang gagal (terkunci 30 menit).
- **Multi-Factor Authentication (MFA / 2SV)** wajib untuk akun Administrator.

---

# Security & Cryptography Rules (POL.ISMS.001)

- **Dilarang keras menyimpan:**
  - API Key (misal: Token Fonnte)
  - Token / Secret / Password
  di dalam repositori Git atau kode mentah (`.gs` / `.html`).
- Gunakan **`PropertiesService.getScriptProperties()`** untuk menyimpan rahasia sistem.
- Password/PIN sekunder disimpan menggunakan **Salted Hash Digest** (`Utilities.computeDigest` SHA-256 + Salt unik).
- Seluruh komunikasi berjalan di atas jalur terenkripsi **HTTPS / TLS 1.3** bawaan Google Infrastructure.

---

# Logging & Audit Trail Rules (POL.ISMS.001)

- Modul logging wajib mencatat jejak audit (User ID/Email, Waktu, Aktivitas, Status, Referensi Halaman/Fungsi, IP Address).
- **Sensitive Data Masking:** Modul logging **WAJIB memfilter secara otomatis** agar `password`, `pin`, `token`, `secret`, dan data pribadi sensitif **TIDAK PERNAH** tercatat di dalam log Google Sheets maupun `Logger.log()` (wajib di-masking menjadi `[REDACTED]`).

---

# Performance Rules

Hindari:

- Akses Google Spreadsheet berulang (looping read/write per baris).
- Nested loop berukuran besar.
- Panggilan API eksternal yang tidak efisien.

Wajib gunakan **batch processing** (baca/tulis array sekaligus via `getValues()` dan `setValues()`).

---

# Scalability Rules

Semua modul harus:

- Modular (terpisah dalam folder `modul/`).
- Reusable (dapat digunakan kembali).
- Independent (memiliki tanggung jawab tunggal / Single Responsibility).

---

# Maintainability Rules

Kode harus:

- Mudah dibaca dan konsisten.
- Mengikuti panduan Secure Coding.
- Mudah diuji dan diperbaiki.

---

# Compatibility Rules

Harus kompatibel penuh dengan:

- Google Apps Script V8 Runtime.
- Google Workspace Ecosystem.

---

# Deployment Rules

Deployment dilakukan secara eksklusif melalui:

- Google Apps Script Deployment Web App.

Tidak menggunakan platform deployment lain.

---

# Non-Goals

Proyek ini tidak bertujuan menjadi:

- Enterprise ERP System
- Project Management SaaS Platform
- Generic Framework

Fokus utama adalah **sistem pemantauan kemajuan proyek, kurva progres, dan pengingat otomatis berbasis Google Workspace yang aman dan patuh standar POL.ISMS.001**.