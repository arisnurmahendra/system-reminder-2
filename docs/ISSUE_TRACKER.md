# Issue Tracker — Notification System

Dokumen ini menjadi rencana implementasi dan pelacakan pekerjaan untuk sistem
notifikasi resmi System Reminder 2. Status diperbarui berdasarkan source code,
bukan hanya berdasarkan dokumentasi lama.

## Status

- `[x]` Selesai di source code dan telah diperiksa secara statis.
- `[~]` Sudah tersedia sebagian, tetapi masih perlu dilengkapi atau diuji.
- `[ ]` Belum diimplementasikan.
- Setiap fitur yang mengirim pesan produksi wajib melewati manual QA sebelum
  dinyatakan selesai.

## Ringkasan Tahapan

| Tahap | Fokus | Status |
|---|---|---|
| 0 | Baseline dan keamanan | `[~]` — kode baseline tersedia; production sign-off pending |
| 1 | Konfigurasi token dan test channel | `[x]` |
| 2 | Group penerima dan To/CC/BCC | `[~]` — implementasi selesai, runtime QA pending |
| 3 | Rule dan jadwal pengiriman | `[~]` — implementasi selesai, runtime QA pending |
| 4 | Template notifikasi resmi | `[~]` — implementasi selesai, runtime QA pending |
| 5 | Deduplikasi, retry, dan delivery audit | `[~]` — implementasi selesai, runtime QA pending |
| 6 | Event bisnis tambahan | `[~]` — implementasi selesai, QA-17 pending |
| 7 | Scheduler production dan QA/UAT | `[ ]` |

---

## NT-000 — Baseline dan Keamanan

**Status:** `[~]`

### Tujuan

Menetapkan batas keamanan sebelum sistem dapat mengirim peringatan resmi.

### Checklist

- `[x]` Token Fonnte disimpan di `PropertiesService`.
- `[x]` Endpoint konfigurasi dibatasi dengan `ADMINISTRATOR`.
- `[x]` Audit log tersedia untuk aktivitas konfigurasi.
- `[x]` Validasi finite/range threshold, batas panjang input, dan batas jumlah penerima pada service konfigurasi.
- `[x]` Rate limit login, test email, test WhatsApp, dan retry delivery pada endpoint.
- `[~]` `escapeHtml()` sudah digunakan pada renderer notifikasi utama, daftar administrasi, toast, group, rule, template, dan delivery; renderer tabel proyek/WBS masih perlu migrasi penuh dari interpolasi HTML.
- `[~]` Fingerprint konten tersedia pada delivery key, tetapi call site legacy masih belum seluruhnya mengirim payload ke `shouldSend`; QA deduplikasi produksi pending.
- `[~]` Token sesi server-side diterbitkan saat login dan endpoint validasi tersedia; retrofit token ke seluruh endpoint mutasi serta nonce CSRF masih pending.
- `[ ]` QA runtime dengan akun non-admin dan payload XSS pada staging.
- `[~]` QA lokal: syntax `script.html` lulus dan payload XSS ter-escape pada helper/renderer yang diaudit; staging belum tersedia pada sesi ini.
- `[x]` Secret tidak ditampilkan kembali pada UI.
- `[x]` Sesi frontend menggunakan `localStorage` dengan `user`, `loginAt`,
  `lastActivityAt`, dan `expiresAt`; tidak disimpan pada sheet.
- `[x]` Idle timeout memiliki default 60 menit, minimum 5 menit, dan maksimum
  480 menit sesuai batas keamanan frontend.
- `[ ]` Verifikasi deployment Web App dan akun eksekusi production.
- `[ ]` Verifikasi quota Gmail, UrlFetch, dan Apps Script.
- `[ ]` Konfirmasi admin pemilik token dan proses rotasi token.

### Acceptance Criteria

- Token tidak pernah berada di source code, log, atau response API.
- Hanya administrator aktif yang dapat mengubah konfigurasi notifikasi.
- Semua perubahan konfigurasi tercatat dengan waktu dan identitas operator.

## NT-001 — Konfigurasi Token dan Test Channel

**Status:** `[x]` — implementasi lokal selesai, runtime perlu diuji.

### Checklist

- `[x]` Input password-style Token Fonnte di UI Admin.
- `[x]` Endpoint `apiSetFonnteToken`.
- `[x]` Test WhatsApp melalui `apiSendTestWhatsApp`.
- `[x]` Test email melalui `apiSendTestEmail`.
- `[x]` Validasi token dan nomor/email.
- `[ ]` Manual test pada Web App production.

### Acceptance Criteria

- Admin dapat menyimpan token tanpa token muncul kembali.
- WhatsApp test berhasil diterima oleh nomor tujuan.
- Email test berhasil diterima oleh alamat tujuan.
- Kegagalan provider ditampilkan sebagai pesan aman dan tercatat.

## NT-002 — Group Penerima dan To/CC/BCC

**Status:** `[~]` — group sudah tersedia; pemetaan proyek dan UI listing perlu
diverifikasi lebih lanjut.

### Checklist

- `[x]` Sheet `Notification_Groups`.
- `[x]` Field email To, CC, dan BCC.
- `[x]` Field banyak nomor WhatsApp.
- `[x]` Endpoint penyimpanan group.
- `[x]` Email dispatcher mendukung CC/BCC.
- `[x]` UI daftar, edit, dan hapus group.
- `[x]` Validasi setiap email dan nomor sebelum disimpan.
- `[x]` Dukungan group berdasarkan role penerima.
- `[x]` Proteksi duplikasi alamat penerima.
- `[x]` Layout Settings & Channels dirapikan dengan hierarchy, grouping, dan responsive layout.
- `[x]` Konfigurasi Fonnte dan uji WhatsApp digabung dalam satu card channel,
  sedangkan Email Test dipisahkan sebagai channel tersendiri.
- `[x]` Card Group & Jadwal memiliki alur penggunaan, pembagian section,
  bantuan field, dan Group ID yang mudah disalin ke rule.
- `[x]` Field jadwal pada rule bersifat dinamis sesuai frekuensi `EVENT`,
  `DAILY`, `WEEKLY`, atau `CUSTOM`.
- `[x]` Tooltip bantuan tersedia pada field deduplikasi notifikasi.
- `[x]` Tooltip bantuan tersedia pada seluruh field `form-label` di Settings & Channels.
- `[x]` Card Pengingat Administrasi memiliki emoji, deskripsi penggunaan, label,
  dan tooltip untuk seluruh field input.
- `[x]` Deduplikasi mencegah pengiriman ulang kepada penerima yang sama untuk
  konten/event yang sama; percobaan duplikat tetap tercatat sebagai `SKIPPED`.
- `[x]` Button `Simpan Notification Rule` dan `Aktifkan Scheduler` memiliki
  tooltip, hierarki visual, dan layout action bar yang jelas.
- `[x]` Tombol `Simpan Notification Rule` dan `Aktifkan Scheduler` sejajar
  dengan proporsi lebar yang sama pada desktop dan stack responsif pada mobile.

### Acceptance Criteria

- Satu group dapat digunakan ulang oleh banyak rule/proyek.
- Email dikirim ke To, CC, dan BCC yang benar.
- Nomor WhatsApp dinormalisasi ke format `628xxx`.
- Data penerima tidak muncul pada log yang tidak berwenang.

## NT-003 — Notification Rule dan Jadwal

**Status:** `[~]` — konfigurasi rule tersedia; scheduler production belum lengkap.

### Checklist

- `[x]` Sheet `Notification_Rules`.
- `[x]` Frequency `EVENT`, `DAILY`, `WEEKLY`, dan `CUSTOM`.
- `[x]` Hari, jam, dan timezone tersimpan.
- `[x]` Rule dapat dikaitkan dengan proyek dan group.
- `[x]` Manual sweep tetap tersedia.
- `[x]` Scheduler mematuhi `send_time` berdasarkan timezone rule.
- `[x]` Pembuatan trigger time-driven dari UI Admin dan pencegahan trigger duplikat.
- `[x]` Pengecualian hari libur melalui sheet `Notification_Holidays`.
- `[x]` Stop rule otomatis setelah proyek `COMPLETED`, `CANCELLED`, atau `ARCHIVED`.
- `[x]` Validasi konflik antar-rule.

### Acceptance Criteria

- Daily hanya berjalan pada hari dan waktu yang ditentukan.
- Weekly hanya berjalan pada hari yang ditentukan.
- Custom tidak mengirim di luar jadwal.
- Timezone jadwal konsisten dengan timezone proyek/organisasi.
- Proyek selesai tidak lagi menerima pengingat aktif.

## NT-004 — Template Notifikasi Resmi

**Status:** `[~]` — penyimpanan template dan template email rule tersedia; seluruh
event/channel belum menggunakan template custom.

### Checklist

- `[x]` Sheet `Notification_Templates`.
- `[x]` Template dapat disimpan dari UI Admin.
- `[x]` Subject dan body custom untuk email.
- `[x]` Placeholder dasar: `{project_name}`, `{actual_progress}`,
  `{planned_progress}`, `{deviation}`.
- `[x]` Template WhatsApp custom digunakan saat dispatch untuk event keterlambatan.
- `[x]` Dispatcher event `COMPLETED`, `DAILY_STATUS`, dan `WEEKLY_SUMMARY` tersedia.
- `[x]` Template event `COMPLETED`, `DAILY_STATUS`, dan `WEEKLY_SUMMARY` digunakan oleh dispatcher.
- `[x]` Preview template tersedia melalui UI Admin.
- `[x]` Versioning dan rollback template tanpa menghapus histori versi.
- `[x]` Footer resmi diterapkan pada email custom melalui wrapper email standar.

### Acceptance Criteria

- Template tervalidasi sebelum dapat diaktifkan.
- Placeholder yang tidak dikenal tidak dikirim mentah ke penerima.
- Setiap channel memiliki format aman dan mudah dibaca.
- Footer resmi selalu hadir pada email production.

## NT-005 — Deduplikasi, Retry, dan Delivery Audit

**Status:** `[~]` — baseline sudah tersedia; status provider dan retry detail perlu
disempurnakan.

### Checklist

- `[x]` Sheet `Notification_Deliveries`.
- `[x]` `dedupe_key` dan interval deduplikasi.
- `[x]` Status `SENT`, `FAILED`, dan `SKIPPED`.
- `[x]` Retry terbatas berdasarkan `max_retries`.
- `[x]` Penyimpanan recipient, channel, attempts, error, dan timestamp.
- `[x]` Status `QUEUED` dan `SKIPPED` pada ledger delivery.
- `[x]` Provider response/correlation ID Fonnte dan Gmail.
- `[x]` Retry terjadwal dipisahkan dari sweep utama.
- `[x]` Failure queue dengan retry manual dari UI Admin.
- Catatan: entri legacy `QUEUED` di bawah ini sudah superseded oleh checklist di atas.
- `[x]` UI delivery status untuk Admin/Auditor.
- `[x]` Deduplikasi per penerima, bukan hanya per channel.

### Acceptance Criteria

- Satu event tidak mengirim duplikat dalam interval yang ditetapkan.
- Kegagalan dapat di-retry tanpa mengirim ulang penerima yang sudah berhasil.
- Riwayat dapat ditelusuri dari event sampai provider response.

## NT-006 — Event Bisnis Tambahan

**Status:** `[~]` — dispatcher dan konfigurasi event tersedia; QA runtime masih pending.

### Checklist

- `[x]` Progres tidak diperbarui selama X hari.
- `[x]` Proyek mendekati deadline.
- `[x]` Proyek selesai 100%.
- `[x]` Ringkasan mingguan.
- `[x]` Eskalasi berdasarkan ambang deviasi.
- `[x]` Pengingat input progres harian.
- `[x]` Rule mendukung `threshold_value` untuk event berbasis ambang.
- `[x]` Item administrasi terpisah dari proyek pada sheet `Notification_Admin_Items`.
- `[x]` UI Admin untuk membuat, melihat, dan menghapus pengingat administrasi.
- `[x]` Pengingat administrasi berdasarkan tanggal jatuh tempo dan ambang hari.
- `[x]` Pengiriman administrasi menggunakan template, recipient group, deduplikasi,
  retry, dan delivery audit yang sama.
- `[x]` Rule administratif dapat dibuat tanpa `project_id`.
- `[x]` Status lifecycle `OPEN`, `IN_PROGRESS`, `COMPLETED`, dan `CANCELLED`.
- `[x]` UI edit item administrasi dan konfigurasi kategori/owner.
- `[x]` Event `DOCUMENT_EXPIRING`, `APPROVAL_PENDING`, `PAYMENT_DUE`, dan
  `COMPLIANCE_DEADLINE`.

### Acceptance Criteria

Setiap event proyek dan administrasi memiliki rule, template, recipient group,
dedupe policy, dan audit delivery. QA-17 masih perlu dijalankan di staging.

## NT-007 — Scheduler Production, Regression, dan UAT

**Status:** `[ ]`

### Checklist

- `[x]` Loader `local-preview.html` untuk preview UI tanpa push/deploy ke GAS.
- `[x]` Preview lokal menampilkan dummy data notification groups, rules, templates,
  dan item administrasi tanpa koneksi Spreadsheet/GAS.

- `[ ]` Trigger production dibuat dan didokumentasikan.
- `[ ]` Trigger diuji pada timezone Asia/Jakarta.
- `[ ]` Manual QA pada email dan WhatsApp nyata.
- `[ ]` Regression test seluruh fitur lama.
- `[ ]` UAT dengan stakeholder.
- `[ ]` Monitoring quota dan failure rate.
- `[ ]` Rollback plan untuk rule/template yang bermasalah.

### Definition of Done

- Manual QA pada `docs/MANUAL_QA_GUIDE.md` selesai tanpa blocker.
- Tidak ada secret atau data sensitif bocor.
- Tidak ada duplikasi pengiriman pada skenario uji.
- Delivery audit dapat menjelaskan setiap pesan yang dikirim atau dilewati.
- Pengguna menyetujui hasil UAT.

---

## NT-000 Security Baseline Update

Bagian ini memperluas checklist NT-000 agar dapat digunakan sebagai gate sebelum
notifikasi resmi diaktifkan pada production.

### Secret Management

- `[x]` `FONNTE_TOKEN` dibaca dari `PropertiesService.getScriptProperties()`.
- `[x]` Token tidak disimpan pada source code, README, issue tracker, atau HTML.
- `[x]` UI token menggunakan field password dan tidak mengembalikan nilai token.
- `[x]` Endpoint perubahan token dibatasi ke `ADMINISTRATOR` aktif.
- `[x]` Audit hanya mencatat perubahan key, bukan nilai secret.
- `[ ]` Menetapkan owner dan jadwal rotasi token production.
- `[ ]` Menetapkan prosedur pencabutan token yang bocor.

### Identity, RBAC, dan MFA

- `[x]` Identitas diperiksa melalui `Session.getActiveUser()`.
- `[x]` Konfigurasi notifikasi memakai `enforceAdminRole_()`.
- `[x]` Role aplikasi: `ADMINISTRATOR`, `PROJECT_MANAGER`, `REGULAR_USER`,
  `AUDITOR`.
- `[x]` Password salted SHA-256 dan account lockout tersedia.
- `[x]` Mode MFA ketat tersedia melalui `MFA_STRICT_MODE`.
- `[ ]` Memastikan Google 2-Step Verification wajib untuk admin production.
- `[ ]` Menguji seluruh endpoint notifikasi dengan akun non-admin.

### Input, Output, dan Data Leakage

- `[x]` Input dasar token, email, nomor, group, rule, dan template divalidasi.
- `[x]` Email dan nomor WhatsApp dinormalisasi oleh helper masing-masing.
- `[x]` Error response menggunakan `safeWebResponse()`.
- `[x]` Audit logger memiliki masking data sensitif.
- `[ ]` Validasi setiap alamat To/CC/BCC sebelum group diaktifkan.
- `[ ]` Sanitasi HTML/script pada template custom.
- `[ ]` Memastikan BCC tidak tampil pada UI atau audit publik.
- `[ ]` Menetapkan batas panjang template dan jumlah penerima.

### Audit, Delivery, dan Retensi

- `[x]` Aktivitas konfigurasi dicatat pada audit log.
- `[x]` `Notification_Deliveries` menyimpan recipient, channel, status, attempts,
  error, dan timestamp.
- `[x]` Deduplikasi dan retry memiliki batas konfigurasi.
- `[ ]` Menyimpan provider response ID Fonnte/Gmail.
- `[ ]` Menambahkan status `QUEUED` dan `SKIPPED`.
- `[ ]` Menetapkan masa retensi dan arsip delivery log.
- `[ ]` Membatasi sheet audit/delivery untuk admin dan auditor.

### Deployment, Quota, dan Operasional

- `[ ]` Memverifikasi execute-as dan who-has-access Web App production.
- `[ ]` Memverifikasi timezone project dan spreadsheet adalah `Asia/Jakarta`.
- `[ ]` Memastikan hanya satu trigger scheduler aktif.
- `[ ]` Mencatat quota Gmail, UrlFetch, runtime GAS, dan limit Fonnte.
- `[ ]` Menetapkan batas penerima per event.
- `[ ]` Menetapkan prosedur pause seluruh notifikasi saat insiden.
- `[ ]` Menetapkan owner on-call untuk delivery failure.

### Acceptance Gate NT-000

NT-000 hanya boleh berubah menjadi `[x]` jika:

- token tidak muncul pada source code, log, response, screenshot, atau laporan QA;
- hanya admin aktif yang dapat mengubah konfigurasi;
- pesan sent, failed, retry, dan skipped memiliki jejak audit;
- template serta recipient tervalidasi;
- deployment memiliki satu scheduler aktif dan timezone yang benar;
- QA-01, QA-02, QA-12, QA-13, dan QA-16 pada `MANUAL_QA_GUIDE.md` berstatus
  `PASS`;
- Security/Administrator, Technical Lead, dan QA telah mengisi sign-off.

### Sign-off NT-000

| Pemeriksa | Peran | Tanggal | Status | Catatan |
|---|---|---|---|---|
|  | Technical Lead |  | PENDING |  |
|  | Security/Administrator |  | PENDING |  |
|  | QA |  | PENDING |  |

## NT-002 Implementation Update

### Selesai

- `[x]` Validasi minimal satu email To atau nomor WhatsApp.
- `[x]` Validasi format seluruh email To, CC, dan BCC.
- `[x]` Validasi serta normalisasi nomor WhatsApp ke format internasional.
- `[x]` Group dapat dikaitkan dengan `project_id`.
- `[x]` Endpoint daftar konfigurasi group.
- `[x]` Endpoint edit group menggunakan `group_id`.
- `[x]` Endpoint hapus group dengan otorisasi Admin.
- `[x]` UI daftar group penerima.
- `[x]` UI edit group penerima.
- `[x]` UI hapus group penerima.
- `[x]` Email dispatcher menggunakan To, CC, dan BCC.
- `[x]` Group WhatsApp dapat memiliki banyak nomor penerima.

### Masih Pending

- `[ ]` Manual QA pada `QA-05` dan `QA-06`.
- `[ ]` Uji akses dengan akun non-admin.
- `[ ]` Uji pengiriman nyata ke To, CC, BCC, dan seluruh nomor WhatsApp.
- `[x]` Dukungan group berdasarkan role penerima.
- `[x]` Pencegahan duplikasi alamat dalam satu group.
- `[ ]` UI status aktif/nonaktif dan arsip group.

### Acceptance Criteria NT-002

NT-002 dapat ditandai selesai penuh setelah:

1. Group dapat dibuat, dilihat, diedit, dan dihapus oleh Admin.
2. User non-admin tidak dapat melakukan operasi group.
3. Email To/CC/BCC menerima pesan pada alamat yang benar.
4. Nomor WhatsApp valid menerima pesan tanpa duplikasi.
5. Group yang dihapus tidak menyebabkan scheduler gagal.
6. QA-05 dan QA-06 berstatus `PASS` pada staging.

## NT-003 Implementation Update

### Selesai

- `[x]` Validasi frequency `EVENT`, `DAILY`, `WEEKLY`, dan `CUSTOM`.
- `[x]` Validasi format jam `HH:mm`.
- `[x]` Validasi hari 1–7 untuk rule weekly/custom.
- `[x]` Penyimpanan timezone pada setiap rule.
- `[x]` Penyimpanan dedupe interval dan batas retry.
- `[x]` Daftar rule tampil pada UI Admin.
- `[x]` Rule dapat dihapus oleh Admin.
- `[x]` Scheduler lama yang sama dihapus sebelum scheduler baru dipasang.
- `[x]` Endpoint instalasi scheduler time-driven setiap jam.
- `[x]` Scheduler hanya memproses rule yang due berdasarkan frequency, hari, jam,
  dan timezone.
- `[x]` Rule `EVENT` tidak dijalankan oleh sweep terjadwal.

### Masih Pending

- `[ ]` Manual QA untuk daily, weekly, custom, dan timezone.
- `[ ]` Uji trigger production pada timezone `Asia/Jakarta`.
- `[x]` Pengecualian hari libur melalui `Notification_Holidays`.
- `[x]` Stop rule otomatis setelah proyek selesai, dibatalkan, atau diarsipkan.
- `[x]` Validasi konflik antar-rule aktif untuk proyek yang sama.
- `[ ]` Dukungan scheduler untuk seluruh event bisnis (`DAILY_STATUS`, `COMPLETED`,
  dan `WEEKLY_SUMMARY`), bukan hanya sweep keterlambatan.
- `[ ]` Monitoring kegagalan scheduler dan notifikasi kepada administrator.

### Acceptance Criteria NT-003

NT-003 dapat ditandai selesai penuh setelah:

1. Admin dapat membuat, melihat, dan menghapus rule.
2. Rule `EVENT` hanya aktif saat event bisnis terjadi.
3. Rule daily/weekly/custom hanya diproses pada waktu dan hari yang sesuai.
4. Timezone rule dihormati oleh scheduler.
5. Tidak ada trigger handler `scheduledDailyJob` yang duplikat.
6. QA-09 dan QA-10 pada `MANUAL_QA_GUIDE.md` berstatus `PASS`.

## NT-004 Implementation Update

### Selesai

- Validasi channel template hanya `EMAIL` atau `WHATSAPP`.
- Validasi placeholder yang diizinkan.
- Sanitasi elemen script dan inline event handler pada body template.
- Subject dan body custom digunakan saat dispatch email keterlambatan.
- Body custom WhatsApp digunakan saat dispatch keterlambatan.
- Footer resmi tetap dibungkus pada email custom.
- Preview template dari UI Admin.
- Edit dan hapus template dari UI Admin.
- Template list tampil pada UI Admin.
- Placeholder yang didukung: `{project_name}`, `{actual_progress}`,
  `{planned_progress}`, `{deviation}`, `{pic_name}`, `{days_remaining}`.

### Masih Pending

- Manual QA template pada QA-07.
- Uji XSS dan rendering email pada client utama.
- Manual QA template pada QA-07.
- Uji XSS dan rendering email pada client utama.

### Acceptance Criteria NT-004

NT-004 dapat ditandai selesai penuh setelah template email dan WhatsApp diuji
di staging, placeholder terisi benar, footer resmi tervalidasi, dan QA-07
berstatus `PASS`.

## NT-005 Implementation Update

### Selesai

- Status delivery mendukung `SENT`, `FAILED`, dan `SKIPPED`.
- Deduplikasi dilakukan per `dedupe_key` dan penerima.
- Pengiriman duplikat menghasilkan catatan `SKIPPED` dengan alasan.
- Retry dibatasi oleh `max_retries` dan jumlah attempt dicatat.
- Kegagalan provider menyimpan alasan error yang aman.
- Delivery ledger menyimpan project, rule, channel, recipient, status, attempts,
  error, dan timestamp.
- Endpoint `apiGetNotificationDeliveries` tersedia untuk Admin/Auditor.
- UI Delivery Audit menampilkan status pengiriman dan retry.

### Masih Pending

- Provider ID Fonnte dan correlation ID Gmail kini dicatat pada setiap hasil pengiriman.
- Delivery kini dicatat lebih dahulu sebagai `QUEUED`, kemudian sebagai `SENT` atau `FAILED`.
- Failure queue tersedia melalui audit delivery dan tombol retry manual Admin.
- Retry terjadwal memiliki handler/trigger terpisah dari sweep utama.
- QA-11, QA-12, dan QA-13 pada `MANUAL_QA_GUIDE.md` belum dijalankan.

### Acceptance Criteria NT-005

NT-005 dapat ditandai selesai penuh setelah delivery sukses, gagal, skip,
deduplikasi per penerima, retry terbatas, dan audit delivery diverifikasi pada
staging melalui QA-11 sampai QA-13.

