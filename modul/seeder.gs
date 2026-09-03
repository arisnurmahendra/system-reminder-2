/**
 * 🛠️ Modul Seeder (Dummy Data Generator)
 * Digunakan untuk mengisi aplikasi dengan data sampel yang realistis
 * untuk keperluan pengujian dan demonstrasi.
 */

function generateDummyData() {
  try {
    // 1. Pastikan database sudah terinisialisasi
    SpreadsheetManager.initializeAllSheets();

    // 2. Buat Dummy User
    _seedUsers();

    // 3. Buat Dummy Projects & Progress Logs
    _seedProjectsAndProgress();

    AppLogger.info("Seeder", "Data dummy berhasil di-generate.");
    return { success: true, message: "Data dummy berhasil di-generate." };
  } catch (err) {
    AppLogger.error("Seeder", "Gagal meng-generate data dummy: " + err.message, err);
    throw err;
  }
}

/**
 * Membuat user tambahan (selain admin)
 */
function _seedUsers() {
  var salt = generateSalt();
  var defaultHash = hashPasswordWithSalt("password123", salt);

  var dummyUsers = [
    {
      username: "manager",
      email: "manager@system.local",
      passwordHash: defaultHash,
      salt: salt,
      roleName: CONFIG.ROLES.PROJECT_MANAGER,
      mustChangePassword: true,
      isActive: true
    },
    {
      username: "auditor",
      email: "auditor@system.local",
      passwordHash: defaultHash,
      salt: salt,
      roleName: CONFIG.ROLES.AUDITOR,
      mustChangePassword: false,
      isActive: true
    }
  ];

  dummyUsers.forEach(function(u) {
    if (!UserRepository.findByEmail(u.email)) {
      UserRepository.createUser(u);
      SpreadsheetApp.flush(); // Pastikan data tersimpan langsung sebelum iterasi berikutnya
    }
  });
}

/**
 * Membuat proyek dan progres harian
 */
function _seedProjectsAndProgress() {
  var now = new Date();
  
  // Format tanggal YYYY-MM-DD
  function formatDate(d) {
    var month = '' + (d.getMonth() + 1), day = '' + d.getDate(), year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
  }

  function projectExists(name) {
    return ProjectRepository.findAll(function(p) {
      return String(p.project_name).trim().toLowerCase() === String(name).trim().toLowerCase();
    }).length > 0;
  }

  // --- Proyek 1: Pembangunan Jaringan (ON_TRACK) ---
  if (!projectExists("Pembangunan Jaringan Fiber Optik Tahap 1")) {
    var p1Start = new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000)); // 10 hari lalu
    var p1End = new Date(now.getTime() + (20 * 24 * 60 * 60 * 1000));   // 20 hari lagi
    var p1Id = ProjectRepository.create({
      project_name: "Pembangunan Jaringan Fiber Optik Tahap 1",
      start_date: formatDate(p1Start),
      end_date: formatDate(p1End),
      pic_name: "Budi Santoso",
      pic_email: "budi@system.local",
      pic_phone: "081234567890",
      is_email_active: true,
      is_wa_active: false,
      status: "ON_TRACK"
    });

    // Isi progres 10 hari terakhir
    var progressList1 = [];
    var p1Planned = 0;
    var p1Actual = 0;
    for (var i = 0; i <= 10; i++) {
      var curDate = new Date(p1Start.getTime() + (i * 24 * 60 * 60 * 1000));
      p1Planned += 3.3; // target ~100% dalam 30 hari
      p1Actual += (3.3 + (Math.random() * 1 - 0.2)); // on track atau slightly ahead
      if (p1Actual > 100) p1Actual = 100;
      
      progressList1.push({
        progress_id: "prog_" + Utilities.getUuid(),
        project_id: p1Id,
        date: formatDate(curDate),
        planned_progress: parseFloat(p1Planned.toFixed(2)),
        actual_progress: parseFloat(p1Actual.toFixed(2)),
        deviation: parseFloat((p1Actual - p1Planned).toFixed(2)),
        notes: i === 10 ? "Instalasi sektor A selesai." : "Progres harian berjalan lancar.",
        recorded_by: "manager@system.local",
        created_at: new Date().toISOString()
      });
    }
    ProgressLogRepository.addBatchProgress(progressList1);
  }

  // --- Proyek 2: Migrasi Sistem (DELAYED) ---
  if (!projectExists("Migrasi Sistem Database Core")) {
    var p2Start = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
    var p2End = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));
    var p2Id = ProjectRepository.create({
      project_name: "Migrasi Sistem Database Core",
      start_date: formatDate(p2Start),
      end_date: formatDate(p2End),
      pic_name: "Anita Wijaya",
      pic_email: "anita@system.local",
      pic_phone: "089876543210",
      is_email_active: true,
      is_wa_active: true,
      status: "DELAYED"
    });

    var progressList2 = [];
    var p2Planned = 0;
    var p2Actual = 0;
    for (var j = 0; j <= 15; j++) {
      var curDate2 = new Date(p2Start.getTime() + (j * 24 * 60 * 60 * 1000));
      p2Planned += 5.0; // target 100% dalam 20 hari
      
      // Mulai lambat sejak hari ke-7
      var increment = (j < 7) ? 4.8 : 2.5; 
      p2Actual += increment;
      
      progressList2.push({
        progress_id: "prog_" + Utilities.getUuid(),
        project_id: p2Id,
        date: formatDate(curDate2),
        planned_progress: parseFloat(p2Planned.toFixed(2)),
        actual_progress: parseFloat(p2Actual.toFixed(2)),
        deviation: parseFloat((p2Actual - p2Planned).toFixed(2)),
        notes: (j >= 7) ? "Terkendala masalah downtime server legacy." : "Proses ekstraksi data.",
        recorded_by: "manager@system.local",
        created_at: new Date().toISOString()
      });
    }
    ProgressLogRepository.addBatchProgress(progressList2);
  }

  // --- Proyek 3: Implementasi ISO (COMPLETED) ---
  if (!projectExists("Implementasi Sistem Manajemen Keamanan (ISO 27001)")) {
    var p3Start = new Date(now.getTime() - (45 * 24 * 60 * 60 * 1000));
    var p3End = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000));
    var p3Id = ProjectRepository.create({
      project_name: "Implementasi Sistem Manajemen Keamanan (ISO 27001)",
      start_date: formatDate(p3Start),
      end_date: formatDate(p3End),
      pic_name: "Candra Darmawan",
      pic_email: "candra@system.local",
      pic_phone: "085678901234",
      is_email_active: false,
      is_wa_active: false,
      status: "COMPLETED"
    });

    var progressList3 = [];
    var p3Planned = 0;
    var p3Actual = 0;
    for (var k = 0; k <= 40; k+=5) { // Log tiap 5 hari biar tidak terlalu padat
      var curDate3 = new Date(p3Start.getTime() + (k * 24 * 60 * 60 * 1000));
      p3Planned = Math.min((k / 40) * 100, 100);
      p3Actual = p3Planned; // Jalan sesuai target
      
      progressList3.push({
        progress_id: "prog_" + Utilities.getUuid(),
        project_id: p3Id,
        date: formatDate(curDate3),
        planned_progress: parseFloat(p3Planned.toFixed(2)),
        actual_progress: parseFloat(p3Actual.toFixed(2)),
        deviation: parseFloat((p3Actual - p3Planned).toFixed(2)),
        notes: k === 40 ? "Sertifikasi berhasil diraih." : "Audit internal berjalan.",
        recorded_by: "manager@system.local",
        created_at: new Date().toISOString()
      });
    }
    ProgressLogRepository.addBatchProgress(progressList3);
  }

  // --- Proyek 4: Pengembangan Aplikasi Mobile (AHEAD) ---
  if (!projectExists("Pengembangan Aplikasi Mobile Customer")) {
    var p4Start = new Date(now.getTime() - (20 * 24 * 60 * 60 * 1000));
    var p4End = new Date(now.getTime() + (40 * 24 * 60 * 60 * 1000));
    var p4Id = ProjectRepository.create({
      project_name: "Pengembangan Aplikasi Mobile Customer",
      start_date: formatDate(p4Start),
      end_date: formatDate(p4End),
      pic_name: "Tirta Pratama",
      pic_email: "tirta@system.local",
      pic_phone: "081122334455",
      is_email_active: true,
      is_wa_active: false,
      status: "AHEAD"
    });

    var progressList4 = [];
    var p4Planned = 0;
    var p4Actual = 0;
    for (var m = 0; m <= 20; m+=2) { // Log tiap 2 hari
      var curDate4 = new Date(p4Start.getTime() + (m * 24 * 60 * 60 * 1000));
      p4Planned = (m / 60) * 100; // Target 100% dalam 60 hari
      p4Actual = p4Planned + (m * 0.3); // Lebih cepat dari jadwal
      if (p4Actual > 100) p4Actual = 100;
      
      progressList4.push({
        progress_id: "prog_" + Utilities.getUuid(),
        project_id: p4Id,
        date: formatDate(curDate4),
        planned_progress: parseFloat(p4Planned.toFixed(2)),
        actual_progress: parseFloat(p4Actual.toFixed(2)),
        deviation: parseFloat((p4Actual - p4Planned).toFixed(2)),
        notes: "Sprint berjalan lebih cepat dari ekspektasi awal.",
        recorded_by: "manager@system.local",
        created_at: new Date().toISOString()
      });
    }
    ProgressLogRepository.addBatchProgress(progressList4);
  }

  // --- Proyek 5: Audit Keuangan (Baru Mulai / ACTIVE) ---
  if (!projectExists("Audit Keuangan Tahunan Q4")) {
    var p5Start = new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000)); // Baru mulai kemarin
    var p5End = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
    ProjectRepository.create({
      project_name: "Audit Keuangan Tahunan Q4",
      start_date: formatDate(p5Start),
      end_date: formatDate(p5End),
      pic_name: "Siska Saraswati",
      pic_email: "siska@system.local",
      pic_phone: "088899990000",
      is_email_active: true,
      is_wa_active: true,
      status: "ACTIVE"
    });
    // Sengaja belum ada progress log karena baru mulai
  }

  // --- Proyek 6: Ekspansi Data Center (CANCELLED) ---
  if (!projectExists("Ekspansi Data Center Cabang Surabaya")) {
    var p6Start = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
    var p6End = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    var p6Id = ProjectRepository.create({
      project_name: "Ekspansi Data Center Cabang Surabaya",
      start_date: formatDate(p6Start),
      end_date: formatDate(p6End),
      pic_name: "Bagas Dewantara",
      pic_email: "bagas@system.local",
      pic_phone: "082233445566",
      is_email_active: false,
      is_wa_active: false,
      status: "CANCELLED"
    });
    
    // Berhenti di tengah jalan
    var progressList6 = [];
    var p6Planned = 0;
    var p6Actual = 0;
    for (var n = 0; n <= 15; n+=5) {
      var curDate6 = new Date(p6Start.getTime() + (n * 24 * 60 * 60 * 1000));
      p6Planned = (n / 90) * 100;
      p6Actual = p6Planned - 1.5; // Sedikit terlambat sebelum akhirnya dibatalkan
      if (p6Actual < 0) p6Actual = 0;
      
      progressList6.push({
        progress_id: "prog_" + Utilities.getUuid(),
        project_id: p6Id,
        date: formatDate(curDate6),
        planned_progress: parseFloat(p6Planned.toFixed(2)),
        actual_progress: parseFloat(p6Actual.toFixed(2)),
        deviation: parseFloat((p6Actual - p6Planned).toFixed(2)),
        notes: n === 15 ? "Proyek dibatalkan secara sepihak akibat efisiensi anggaran." : "Site survey dan perizinan.",
        recorded_by: "manager@system.local",
        created_at: new Date().toISOString()
      });
    }
    ProgressLogRepository.addBatchProgress(progressList6);
  }
}
