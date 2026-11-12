# Manual QA Guide — System Reminder 2 Notification

Panduan ini digunakan untuk memastikan aplikasi berjalan benar sebelum dipakai
untuk mengirim peringatan resmi melalui email atau WhatsApp.

## Aturan Pengujian

1. Gunakan spreadsheet dan project GAS khusus staging.
2. Gunakan alamat email dan nomor WhatsApp tester, bukan penerima production.
3. Jangan menaruh token pada screenshot, log, issue, atau chat.
4. Catat waktu pengujian dalam timezone `Asia/Jakarta`.
5. Jalankan test dengan satu proyek dummy yang memiliki status `ACTIVE`.
6. Setelah setiap test, periksa UI, Spreadsheet, dan delivery audit.

## Data Uji Minimum

Siapkan:

- satu akun Administrator aktif;
- satu akun Project Manager;
- satu proyek aktif;
- satu proyek selesai;
- satu email To;
- satu email CC;
- satu email BCC;
- dua nomor WhatsApp tester;
- satu token Fonnte staging;
- satu template email dan satu template WhatsApp;
- rule daily, weekly, event, dan custom.

## Hasil Test

Gunakan status berikut:

- `PASS` — hasil sesuai acceptance criteria;
- `FAIL` — hasil berbeda atau terjadi error;
- `BLOCKED` — tidak dapat diuji karena dependency eksternal;
- `N/A` — tidak relevan untuk deployment tersebut.

Catat bukti minimum: waktu, akun, project ID, rule ID, delivery ID, dan screenshot
tanpa secret.

---

## QA-01 — Login dan Hak Akses Admin

**Tujuan:** Memastikan konfigurasi notifikasi tidak dapat diakses user biasa.

1. Login sebagai Administrator.
2. Buka tab Settings.
3. Pastikan card konfigurasi notifikasi tampil.
4. Login sebagai Project Manager atau Regular User.
5. Coba memanggil operasi konfigurasi notifikasi dari UI.

**Expected:**

- Administrator dapat membuka fungsi konfigurasi.
- User non-admin ditolak dengan aman.
- Tidak ada token atau credential pada response.

## QA-02 — Simpan Token Fonnte

1. Masukkan token staging pada field Token Fonnte.
2. Simpan.
3. Muat ulang halaman.
4. Periksa Script Properties melalui menu Spreadsheet.
5. Pastikan token tidak ditampilkan dalam log audit.

**Expected:**

- UI menampilkan sukses.
- Nilai tersimpan di `FONNTE_TOKEN`.
- Field kembali kosong atau masked.
- Token tidak muncul di UI, audit log, atau error message.

## QA-03 — Test WhatsApp

1. Masukkan nomor `08123456789`.
2. Klik kirim test WhatsApp.
3. Periksa pesan pada nomor tujuan.
4. Ulangi dengan nomor invalid.
5. Ulangi saat token kosong/salah.

**Expected:**

- Nomor valid dinormalisasi ke format internasional.
- Pesan test diterima satu kali.
- Nomor invalid ditolak tanpa request yang tidak perlu.
- Kegagalan provider dicatat sebagai `FAILED` atau audit failure.

## QA-04 — Test Email

1. Masukkan email tester.
2. Klik `Kirim Test Email`.
3. Periksa inbox dan spam folder.
4. Ulangi dengan email invalid.

**Expected:**

- Email diterima satu kali.
- Subject dan footer resmi tampil.
- Email invalid ditolak dengan pesan aman.
- Audit mencatat channel dan status pengiriman.

## QA-05 — Membuat Recipient Group

1. Buat group baru.
2. Masukkan satu email To.
3. Masukkan satu email CC.
4. Masukkan satu email BCC.
5. Masukkan dua nomor WhatsApp.
6. Simpan.

**Expected:**

- Group tersimpan pada `Notification_Groups`.
- Penerima tersimpan sesuai channel.
- Nomor WhatsApp dinormalisasi saat pengiriman.
- Data group tidak dapat diubah oleh user non-admin.

## QA-06 — Pengiriman To/CC/BCC

1. Kaitkan group dengan rule proyek.
2. Picu notifikasi keterlambatan.
3. Periksa inbox To, CC, dan BCC.

**Expected:**

- To menerima email utama.
- CC menerima salinan.
- BCC menerima salinan tanpa terlihat pada header penerima lain.
- Tidak ada email ganda dalam satu event.

## QA-07 — Template Notifikasi

1. Buat template email custom.
2. Gunakan placeholder yang didukung.
3. Kaitkan template dengan rule.
4. Picu notifikasi.

**Expected:**

- Placeholder terisi dengan data proyek aktual.
- Subject custom digunakan.
- Footer resmi tetap ada.
- Placeholder invalid tidak membocorkan data internal.

## QA-08 — Rule Event Keterlambatan

1. Buat rule event `DELAYED`.
2. Buat proyek dengan progres aktual di bawah progres rencana.
3. Jalankan manual sweep.

**Expected:**

- Notifikasi dikirim ke channel aktif.
- Delivery audit menyimpan project, rule, recipient, channel, status, dan waktu.
- Proyek `COMPLETED`, `CANCELLED`, atau `ARCHIVED` tidak menerima reminder aktif.

## QA-09 — Jadwal Daily

1. Buat rule `DAILY` dengan jam uji beberapa menit ke depan.
2. Pastikan timezone sesuai `Asia/Jakarta`.
3. Jalankan trigger/scheduler pada waktu tersebut.

**Expected:**

- Notifikasi dikirim hanya pada waktu yang ditentukan.
- Eksekusi di luar jadwal tidak mengirim pesan.
- Delivery audit mencatat rule yang digunakan.

## QA-10 — Jadwal Weekly dan Custom

1. Buat rule `WEEKLY` pada satu hari tertentu.
2. Jalankan scheduler pada hari yang sesuai.
3. Jalankan scheduler pada hari lain.
4. Buat rule `CUSTOM` dengan beberapa hari.

**Expected:**

- Weekly hanya terkirim pada hari yang ditetapkan.
- Custom hanya terkirim pada hari yang dipilih.
- Hari yang tidak cocok menghasilkan `SKIPPED` atau tidak mengirim.

## QA-11 — Deduplikasi

1. Picu event yang sama dua kali dalam interval dedupe.
2. Periksa inbox, WhatsApp, dan `Notification_Deliveries`.
3. Ulangi setelah interval dedupe berakhir.

**Expected:**

- Pengiriman kedua dalam interval tidak dikirim ulang.
- Pengiriman setelah interval dapat dikirim.
- Dedupe key konsisten dan dapat ditelusuri.

## QA-12 — Retry dan Kegagalan Provider

1. Gunakan token Fonnte invalid atau alamat email invalid pada staging.
2. Picu notifikasi.
3. Periksa jumlah attempts dan error.
4. Pulihkan konfigurasi lalu jalankan retry.

**Expected:**

- Retry tidak melebihi `max_retries`.
- Failure menyimpan alasan yang aman.
- Penerima yang sudah sukses tidak dikirim ulang tanpa alasan.

## QA-13 — Audit Delivery

Untuk setiap skenario pengiriman, periksa:

- `delivery_id`;
- `dedupe_key`;
- project ID;
- rule ID;
- channel;
- recipient;
- status;
- attempts;
- error;
- provider ID jika tersedia;
- waktu dibuat dan waktu dikirim.

**Expected:** Tidak ada pesan yang terkirim tanpa jejak audit.

## QA-14 — Batasan Quota dan Rate Limit

1. Jalankan sweep dengan beberapa proyek.
2. Amati waktu eksekusi dan jumlah request.
3. Pastikan dedupe mencegah pengiriman berulang.

**Expected:**

- Sistem tidak melakukan request berulang untuk event yang sama.
- Kegagalan quota ditangani tanpa menghentikan seluruh sweep.
- Error dicatat dan dapat ditindaklanjuti.

## QA-15 — Regression Test Fitur Lama

Pastikan fitur berikut tetap berjalan:

- login dan logout;
- registrasi proyek;
- update proyek;
- input dan update progres;
- auto-complete proyek;
- dashboard dan analytics;
- S-Curve/WBS;
- export PDF;
- archive Google Drive;
- audit log;
- user management.

## QA-16 — Security Review Sebelum Production

- [ ] Tidak ada token di source code.
- [ ] Tidak ada token di screenshot atau log.
- [ ] Endpoint konfigurasi menolak non-admin.
- [ ] CC/BCC tidak bocor pada UI yang tidak berwenang.
- [ ] Error provider tidak menampilkan credential.
- [ ] Script Properties production sudah benar.
- [ ] Trigger menggunakan akun dan timezone yang benar.
- [ ] Recipient production sudah disetujui.

## Sign-off

| Peran | Nama | Tanggal | Status | Catatan |
|---|---|---|---|---|
| QA |  |  |  |  |
| Project Manager |  |  |  |  |
| Administrator |  |  |  |  |
| Technical Lead |  |  |  |  |

Status release hanya boleh `APPROVED` jika semua test wajib `PASS`, tidak ada
security blocker, dan recipient production telah memberikan persetujuan.

## QA-17 — Notifikasi Administrasi NT-006

Status eksekusi: `NOT RUN` — staging, credential provider, dan recipient nyata
belum tersedia pada pemeriksaan lokal ini.

- [ ] Buat rule `ADMINISTRATIVE_REMINDER` tanpa `project_id` dan kaitkan ke group.
- [ ] Buat item administrasi dengan kategori, owner, status `OPEN`, tenggat, dan threshold.
- [ ] Pastikan item muncul pada UI dan dapat diedit tanpa mengubah item lain.
- [ ] Pastikan email dan WhatsApp dikirim saat masuk threshold.
- [ ] Pastikan status `COMPLETED` dan `CANCELLED` menghentikan pengiriman.
- [ ] Uji event `DOCUMENT_EXPIRING`, `APPROVAL_PENDING`, `PAYMENT_DUE`, dan `COMPLIANCE_DEADLINE`.
- [ ] Pastikan deduplikasi, retry, dan delivery audit mencatat item tanpa `project_id`.
