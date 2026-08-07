# Definition of Done (DoD)

Dokumen ini mendefinisikan kriteria yang harus dipenuhi sebelum suatu tugas, fitur, atau perubahan kode dianggap selesai dan siap untuk dideploy atau digabungkan (merge) ke cabang utama (`main`).

## Kriteria Umum

1.  **Kode Berfungsi**: Kode harus berfungsi sesuai dengan deskripsi tugas (user story / task) dan memenuhi semua kriteria penerimaan (acceptance criteria).
2.  **Kualitas Kode (Code Quality)**:
    *   Mengikuti standar penulisan kode (style guide) yang berlaku dalam proyek.
    *   Tidak ada kode yang tidak digunakan (unused code) atau komentar yang tidak perlu.
    *   Struktur kode rapi, modular, dan mudah dibaca.
3.  **Pengujian (Testing)**:
    *   Fitur baru atau perbaikan bug telah diuji secara manual.
    *   (Jika ada) Unit test atau integration test telah diperbarui atau ditambahkan, dan semuanya lulus (pass).
    *   Tidak ada regresi atau efek samping yang merusak fitur yang sudah ada.
4.  **Dokumentasi**:
    *   Dokumentasi teknis atau `README.md` diperbarui jika ada perubahan alur kerja, arsitektur, atau dependensi baru.
    *   Komentar kode ditambahkan untuk bagian kode yang kompleks atau tidak biasa.
5.  **Peninjauan Kode (Code Review)**:
    *   Pull Request (PR) telah dibuat dengan deskripsi yang jelas tentang perubahan yang dilakukan.
    *   Telah ditinjau dan disetujui (approved) oleh setidaknya satu anggota tim pengembang lainnya.
6.  **Keamanan**:
    *   Tidak ada data sensitif (seperti API key, password, token) yang ditulis langsung di dalam kode (hardcoded).
    *   Telah dipastikan tidak ada celah keamanan baru yang diperkenalkan.
7.  **Kompatibilitas & Desain**:
    *   Tampilan antarmuka (UI) responsif dan sesuai dengan desain yang telah disepakati.
    *   Diuji pada browser-browser utama (jika berupa aplikasi web).
