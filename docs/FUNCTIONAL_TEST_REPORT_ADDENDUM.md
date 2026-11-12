# Addendum Verifikasi Fungsional — Source Code Terbaru

Tanggal verifikasi: 11 November 2026

Addendum ini mengoreksi interpretasi laporan historis. Tabel pada
`FUNCTIONAL_TEST_REPORT.md` berjumlah **115 skenario**, bukan 145. Klaim
`145/145` tidak digunakan sebagai hasil verifikasi terbaru.

Perubahan source code yang telah diperiksa:

- Hapus item WBS tersedia dari UI hingga `apiDeleteWBSItem` dan
  `WBSService.deleteWBSItem`.
- Edit role/status pengguna tersedia dari UI hingga `apiUpdateUser`.
- Edit metadata proyek tersedia melalui modal proyek.
- Edit catatan progres harian tersedia dari tabel riwayat progres.
- Duplikasi endpoint `apiGetProjectCurveData` telah dihapus.

Status pengujian: **belum dieksekusi ulang di runtime Google Apps Script**.
Karena itu, addendum ini adalah hasil pemeriksaan source code, bukan klaim bahwa
seluruh perubahan telah lulus regression test atau UAT. Regression test dan UAT
harus dijalankan ulang sebelum status produksi ditetapkan.
