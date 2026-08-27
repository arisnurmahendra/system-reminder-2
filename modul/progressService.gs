/**
 * Progress Service - Logika Bisnis & Pengelolaan Pencatatan Kemajuan Harian
 * Mengikuti prinsip Separation of Concerns & Service Pattern
 */

var ProgressService = {
  /**
   * Mencatat progres kemajuan aktual harian suatu proyek
   * @param {object} payload
   * @returns {object}
   */
  recordDailyProgress: function(payload) {
    validateRequired(payload.projectId, "Project ID");
    validateRequired(payload.actualProgress, "Persentase Kemajuan Aktual");

    var project = ProjectRepository.findById(payload.projectId);
    if (!project) {
      throw new Error("Proyek dengan ID '" + payload.projectId + "' tidak ditemukan.");
    }

    var actual = Number(payload.actualProgress);
    if (isNaN(actual) || actual < 0 || actual > 100) {
      throw new Error("Persentase progres harus berupa angka di antara 0 sampai 100.");
    }

    var recordDate = payload.date || new Date().toISOString().split("T")[0];
    var recordedBy = payload.recordedBy || getCurrentUserEmail_() || "SYSTEM";

    // Hitung planned progress & deviasi pada tanggal tersebut
    var planned = ProgressEngine.calculatePlannedProgress(project.start_date, project.end_date, recordDate, "LINEAR");
    var deviation = ProgressEngine.calculateDeviation(actual, planned);
    var status = ProgressEngine.determineProgressStatus(actual, planned);

    var logData = {
      project_id: project.project_id,
      date: recordDate,
      planned_progress: planned,
      actual_progress: actual,
      deviation: deviation,
      notes: sanitizeString(payload.notes || ""),
      recorded_by: recordedBy
    };

    var progressId = ProgressLogRepository.addProgress(logData);

    // Update status proyek menjadi COMPLETED jika aktual mencapai 100%
    if (actual >= 100 && project.status !== "COMPLETED") {
      ProjectRepository.update(project.project_id, { status: "COMPLETED" });
    }

    writeAuditLog(null, recordedBy, "PROGRESS_RECORDED", "SUCCESS", "ProgressService", {
      projectId: project.project_id,
      date: recordDate,
      actual: actual,
      planned: planned,
      deviation: deviation,
      status: status
    });

    // Otomasi evaluasi pengingat jika proyek mengalami keterlambatan
    if (status === "DELAYED") {
      try {
        NotificationService.sendDelayedAlert(project, actual, planned, deviation);
      } catch (notifErr) {
        console.warn("Gagal mengirim notifikasi keterlambatan otomatis:", notifErr.message);
      }
    }

    return formatSuccessResponse({
      progressId: progressId,
      projectId: project.project_id,
      date: recordDate,
      actualProgress: actual,
      plannedProgress: planned,
      deviation: deviation,
      status: status
    }, "Progres harian berhasil dicatat.");
  },

  /**
   * Mengambil riwayat progres proyek secara kronologis
   * @param {string} projectId
   * @param {"asc"|"desc"} [order="asc"]
   * @returns {object}
   */
  getProgressHistory: function(projectId, order) {
    validateRequired(projectId, "Project ID");
    var logs = ProgressLogRepository.findByProject(projectId);

    logs.sort(function(a, b) {
      var dateA = new Date(a.date).getTime();
      var dateB = new Date(b.date).getTime();
      return order === "desc" ? (dateB - dateA) : (dateA - dateB);
    });

    return formatSuccessResponse(logs);
  },

  /**
   * Mengambil catatan progres terbaru untuk sebuah proyek
   * @param {string} projectId
   * @returns {object}
   */
  getLatestProgress: function(projectId) {
    validateRequired(projectId, "Project ID");
    var logs = ProgressLogRepository.findByProject(projectId);

    if (logs.length === 0) {
      return formatSuccessResponse(null, "Belum ada catatan progres.");
    }

    logs.sort(function(a, b) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return formatSuccessResponse(logs[0]);
  }
};
