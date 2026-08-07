# Aturan Dependensi (Dependency Rules)

Dokumen ini menjelaskan aturan dan panduan dalam mengelola dependensi pada proyek `system-reminder-2`.

## Panduan Umum

1.  **Minimalkan Dependensi**: Hanya tambahkan dependensi jika benar-benar diperlukan. Evaluasi terlebih dahulu apakah fungsi tersebut dapat diimplementasikan dengan mudah menggunakan pustaka standar (standard library) atau kode bawaan sebelum memutuskan untuk menggunakan paket pihak ketiga (third-party).
2.  **Keamanan Utama (Security First)**: Pastikan semua dependensi aktif dipelihara dan tidak memiliki kerentanan keamanan kritis yang diketahui. Lakukan audit dependensi secara berkala.
3.  **Kesesuaian Lisensi**: Gunakan hanya dependensi dengan lisensi yang kompatibel dengan lisensi proyek ini. Lisensi permisif (seperti MIT, Apache 2.0) sangat disukai.
4.  **Penetapan Versi (Version Pinning)**: Kunci dependensi ke versi spesifik (atau rentang versi yang sempit) di file konfigurasi (seperti `package.json`, `requirements.txt`) untuk memastikan proses build dapat direproduksi dengan konsisten (reproducible builds). Hindari penggunaan tag `latest` atau wildcard yang terlalu luas.

## Menambahkan Dependensi Baru

Sebelum menambahkan dependensi baru, pastikan Anda telah:
*   Memberikan alasan kuat mengapa dependensi tersebut diperlukan.
*   Memastikan dependensi tersebut memiliki komunitas yang sehat dan aktif dipelihara.
*   Memeriksa lisensi dari dependensi tersebut.

## Memperbarui Dependensi

*   Dependensi harus diperbarui secara berkala untuk menyertakan patch keamanan dan perbaikan bug.
*   Pembaruan versi utama (major update) harus diuji dengan cermat karena berpotensi memperkenalkan perubahan yang merusak (breaking changes).
*   Gunakan alat otomatis (jika tersedia) untuk mengidentifikasi dependensi yang sudah usang.

## Ekosistem yang Diizinkan (Contoh)
*   **Frontend**: Paket npm dengan lisensi MIT/Apache.
*   **Backend**: Pustaka standar lebih disukai; paket pihak ketiga harus melalui tinjauan keamanan terlebih dahulu.

## Proses Peninjauan (Review)
Semua dependensi baru dan pembaruan versi utama harus ditinjau dan disetujui oleh setidaknya satu anggota tim pengembang lainnya sebelum digabungkan (merge) ke cabang utama (`main`).
