# AI Workflow

## Purpose

Dokumen ini menjelaskan alur kerja yang harus diikuti AI ketika membantu pengembangan **System Reminder 2**.

---

# Development Workflow

## 1. Understand

AI harus memahami:

- tujuan fitur
- konteks proyek
- dampak perubahan
- dependency yang terlibat

---

## 2. Analyze

Sebelum menulis kode, AI harus mengecek:

- apakah fungsi serupa sudah ada
- apakah bisa digunakan kembali
- apakah perubahan melanggar prinsip arsitektur

---

## 3. Design

Jika fitur baru diperlukan:

- tentukan module
- tentukan tanggung jawab
- tentukan alur data

---

## 4. Implement

Implementasi harus:

- kecil
- modular
- mudah diuji
- tidak mengubah perilaku lama tanpa alasan

---

## 5. Verify

Sebelum selesai AI harus memverifikasi:

- tidak ada duplikasi
- tidak ada dependency baru
- tidak ada global state baru
- tidak ada hardcoded configuration

---

## 6. Document

Jika terdapat perubahan:

- update dokumentasi
- jelaskan perubahan
- jelaskan alasan perubahan

---

# Refactoring Workflow

Ketika diminta refactoring:

1. Identifikasi masalah.
2. Jelaskan penyebab.
3. Berikan solusi.
4. Lakukan perubahan bertahap.
5. Pastikan perilaku lama tetap sama.

---

# Bug Fix Workflow

Ketika menemukan bug:

1. Cari akar masalah.
2. Hindari patch sementara.
3. Perbaiki penyebab utama.
4. Pastikan tidak muncul regression.

---

# Feature Workflow

Saat membuat fitur baru:

Analyze

↓

Design

↓

Implement

↓

Review

↓

Test

↓

Document

---

# Priority Order

1. Correctness
2. Maintainability
3. Readability
4. Performance
5. Scalability