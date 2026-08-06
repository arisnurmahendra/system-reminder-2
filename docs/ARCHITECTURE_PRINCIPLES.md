# Architecture Principles

## Purpose

Dokumen ini mendefinisikan prinsip arsitektur yang wajib diikuti pada seluruh proyek.

---

# Layer Architecture

Aplikasi dibagi menjadi beberapa layer.

UI

↓

Application

↓

Service

↓

Repository

↓

Google Services

↓

Google Sheets

Setiap layer hanya boleh berkomunikasi dengan layer di bawahnya.

---

# Separation of Concerns

Setiap module hanya memiliki satu tujuan.

Contoh:

- email.gs → Email
- fonnte.gs → WhatsApp
- repository.gs → Data
- dashboard.gs → UI

---

# Single Responsibility Principle (SRP)

Setiap file memiliki satu tanggung jawab utama.

Contoh:

✓ Email Service

✗ Email + Spreadsheet + WhatsApp dalam satu file

---

# DRY (Don't Repeat Yourself)

Hindari:

- kode duplikat
- query duplikat
- validasi berulang

Gunakan helper apabila logika dipakai lebih dari satu kali.

---

# KISS (Keep It Simple)

Lebih baik:

3 fungsi kecil

daripada

1 fungsi sepanjang 500 baris.

---

# Repository Pattern

Seluruh akses Spreadsheet dilakukan melalui Repository.

Jangan membaca Spreadsheet langsung dari UI.

---

# Service Pattern

Seluruh business logic ditempatkan pada Service.

UI tidak boleh berisi logika bisnis.

---

# UI Principle

HTML hanya bertugas:

- menampilkan data
- menerima input
- memanggil backend

Business logic berada di Apps Script.

---

# Configuration First

Semua konfigurasi harus berada pada satu tempat.

Contoh:

- Spreadsheet ID
- Sheet Name
- API URL
- Timezone

Tidak boleh di-hardcode di banyak file.

---

# Error Handling

Semua Service harus:

- validasi input
- menangani exception
- mengembalikan error yang jelas

---

# Naming Convention

Gunakan nama yang:

- konsisten
- deskriptif
- mudah dipahami

Hindari:

do()

run()

main()

data()

temp()

---

# Long-Term Maintainability

Setiap perubahan harus membuat kode:

- lebih sederhana
- lebih modular
- lebih mudah diuji
- lebih mudah dikembangkan