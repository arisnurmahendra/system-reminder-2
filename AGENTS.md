# AGENTS.md — Aturan AI System Reminder 2

Dokumen ini adalah instruksi operasional untuk AI/agent yang bekerja pada proyek
**System Reminder 2**. Agent wajib mengikuti dokumentasi proyek yang berada di
`docs/`, terutama `AI_ROLE.md`, `AI_WORKFLOW.md`, `PROJECT_CONSTRAINTS.md`,
`ARCHITECTURE_PRINCIPLES.md`, dan `SECURITY_POL_ISMS_001.md`.

## Prinsip Utama: Mode Hemat Token dan Kuota

Agent **selalu menggunakan pendekatan paling hemat token, waktu, panggilan tool,
dan kuota** yang tetap menghasilkan pekerjaan yang benar dan dapat diverifikasi.
Penghematan tidak boleh mengurangi keamanan, integritas data, kompatibilitas
Google Apps Script, atau kualitas verifikasi yang diperlukan.

## Aturan Operasional

1. Pahami permintaan dan batas dampaknya sebelum membaca atau mengubah berkas.
2. Baca hanya berkas dan bagian yang relevan. Jangan mencetak seluruh repository,
   file besar, atau dokumentasi berulang kali jika tidak diperlukan.
3. Gunakan pencarian terarah untuk menemukan simbol, fungsi, konfigurasi, dan
   referensi yang diperlukan sebelum membuka konteks kode lebih luas.
4. Gabungkan pemeriksaan file yang independen dalam satu operasi bila aman.
5. Jangan mengulang panggilan tool, pembacaan file, atau pengujian yang hasilnya
   belum berubah.
6. Pilih model, mode, dan tingkat penalaran paling hemat yang masih memadai untuk
   tugas. Naikkan tingkat analisis hanya jika kompleksitas, risiko, atau hasil
   verifikasi memang membutuhkannya.
7. Hindari penjelasan panjang, pengulangan konteks, dan komentar kode yang tidak
   menambah nilai. Jawaban harus ringkas, jelas, dan langsung pada hasil.
8. Jangan membuat artefak, dependency, refactor, atau perubahan di luar scope
   hanya untuk memperpanjang solusi.
9. Saat informasi tidak cukup, ajukan satu pertanyaan paling penting; jika asumsi
   aman dapat dibuat, lanjutkan dan nyatakan asumsi tersebut secara singkat.
10. Setelah perubahan, jalankan verifikasi minimum yang relevan dengan risiko.
    Jangan menjalankan seluruh suite bila pemeriksaan terarah sudah memadai;
    jalankan suite penuh untuk perubahan lintas modul, keamanan, atau perilaku
    inti.
11. Setiap implementasi wajib langsung memperbarui `docs/ISSUE_TRACKER.md`.
    Perbarui status issue, checklist pekerjaan, acceptance criteria, dan daftar
    pekerjaan yang masih pending sesuai kondisi source code terbaru.
12. Setiap perubahan yang membutuhkan Google Sheets wajib memastikan sheet yang
    diperlukan dibuat bila belum ada. Jika sheet sudah ada, agent harus menjaga
    seluruh data existing: dilarang menghapus, mereset, mengganti nama, atau
    menimpa data tanpa perintah eksplisit pengguna.
13. Jaga kesesuaian antara schema/header di kode dan sheet. Perubahan schema harus
    bersifat aman dan kompatibel ke belakang; tambahkan header/kolom yang hilang
    hanya setelah pemeriksaan read-only, dan jangan menghapus kolom atau baris
    lama. Setiap perubahan schema wajib dicatat di dokumentasi dan diverifikasi.

## Efisiensi Implementasi

- Cari dan gunakan kembali fungsi/modul yang sudah ada sebelum membuat yang baru.
- Pertahankan perubahan sekecil mungkin dan hindari duplikasi.
- Gunakan batch read/write ke Google Sheets bila sesuai; hindari operasi per sel
  yang tidak perlu.
- Pertahankan caching dan invalidasi cache yang sudah menjadi bagian dari desain.
- Jangan menambahkan library eksternal atau dependency baru tanpa kebutuhan yang
  jelas dan persetujuan pengguna.
- Jangan memanggil layanan eksternal, mengirim notifikasi, atau mengubah data
  produksi saat pemeriksaan dapat dilakukan secara lokal atau dry-run.

## Batasan Wajib Proyek

- Pertahankan arsitektur 3-tier dan kompatibilitas Google Apps Script V8.
- Jangan memindahkan secret ke source code. Token, password, dan credential harus
  tetap menggunakan `PropertiesService` sesuai kebijakan keamanan.
- Jangan membocorkan data sensitif pada output, log, patch, atau ringkasan.
- Hormati RBAC, audit logging, sanitasi input, dan aturan POL.ISMS.001.
- Jangan mengubah perilaku lama, struktur data, atau deployment tanpa alasan yang
  terukur dan dokumentasi singkat.

## Larangan Push dan Deployment

- Agent **dilarang melakukan `git push`** ke repository atau remote apa pun tanpa
  perintah eksplisit dari pengguna.
- Agent **dilarang melakukan push, deploy, upload, atau sinkronisasi ke Google Apps
  Script/GAS** tanpa perintah eksplisit dari pengguna.
- Perintah seperti `git2gas`, `clasp push`, `clasp deploy`, atau perintah lain yang
  mengubah sistem eksternal dianggap sebagai tindakan terlarang sampai pengguna
  memberikan instruksi langsung.
- Pemeriksaan lokal seperti `git diff`, `git status`, lint, dan test tetap boleh
  dilakukan tanpa persetujuan tambahan.
- Jika pekerjaan selesai, agent hanya boleh melaporkan perubahan dan menunggu
  instruksi pengguna untuk push atau deployment.

## Format Respons Agent

Untuk setiap tugas:

1. Nyatakan hasil atau status secara langsung.
2. Ringkas perubahan penting dalam beberapa poin saja.
3. Sebutkan verifikasi yang benar-benar dijalankan dan hasilnya.
4. Sebutkan asumsi, risiko, atau pekerjaan lanjutan hanya jika relevan.

Setiap laporan penyelesaian implementasi juga wajib menyebutkan bahwa
`docs/ISSUE_TRACKER.md` telah diperbarui atau menjelaskan bagian yang masih
pending.

Jangan menampilkan proses berpikir internal, dump file besar, atau detail tool
yang tidak membantu pengguna mengambil keputusan.

## Prioritas Konflik

Jika terjadi konflik, gunakan urutan berikut:

1. Keamanan dan perlindungan data.
2. Ketepatan dan integritas perilaku aplikasi.
3. Kepatuhan pada dokumentasi dan batasan proyek.
4. Verifikasi yang proporsional terhadap risiko.
5. Penghematan token, kuota, waktu, dan kompleksitas.

