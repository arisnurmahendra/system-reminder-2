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
    if (!payload || typeof payload !== "object") {
      throw ErrorFactory.validation("Payload data progres tidak boleh kosong.");
    }

    validateRequired(payload.projectId, "Project ID");
    validateRequired(payload.actualProgress, "Persentase Kemajuan Aktual");

    var project = ProjectRepository.findById(payload.projectId);
    if (!project) {
      throw ErrorFactory.notFound("Proyek", payload.projectId);
    }

    var actual = ProgressEngine.validateProgressValue(payload.actualProgress);
    var recordDate = payload.date || ProgressEngine.formatDateYMD_(new Date());
    var recordedBy = payload.recordedBy || getCurrentUserEmail_() || "SYSTEM";

    // Cek apakah sudah ada catatan progres pada tanggal yang sama untuk proyek ini (dan wbs_id yang sama)
    var existingLogs = ProgressLogRepository.findByProject(project.project_id);
    var duplicate = existingLogs.filter(function(l) {
      return l.date === recordDate && (l.wbs_id || "") === (payload.wbsId || "");
    });

    if (duplicate.length > 0 && !payload.allowOverwrite) {
      throw ErrorFactory.businessRule(
        "Progres harian pada tanggal " + recordDate + " sudah tercatat (" + duplicate[0].actual_progress + "%). Gunakan update atau setujui overwrite.",
        CONFIG.ERROR_CODES.BIZ_DUPLICATE_RESOURCE,
        { existingLogId: duplicate[0].log_id }
      );
    }

    // Hitung planned progress & deviasi pada tanggal tersebut
    var planned = ProgressEngine.calculatePlannedProgress(project.start_date, project.end_date, recordDate, "LINEAR");
    var deviation = ProgressEngine.calculateDeviation(actual, planned);
    var status = ProgressEngine.determineProgressStatus(actual, planned);

    var logId;
    if (duplicate.length > 0 && payload.allowOverwrite) {
      logId = duplicate[0].log_id;
      ProgressLogRepository.update(logId, {
        actual_progress: actual,
        planned_progress: planned,
        deviation: deviation,
        notes: sanitizeString(payload.notes || duplicate[0].notes || ""),
        recorded_by: recordedBy
      });
    } else {
      var logData = {
        project_id: project.project_id,
        wbs_id: payload.wbsId || "",
        date: recordDate,
        planned_progress: planned,
        actual_progress: actual,
        deviation: deviation,
        notes: sanitizeString(payload.notes || ""),
        recorded_by: recordedBy
      };
      logId = ProgressLogRepository.addProgress(logData);
    }

    // Update status proyek menjadi COMPLETED jika aktual mencapai 100%
    if (actual >= 100 && project.status !== "COMPLETED") {
      ProjectRepository.update(project.project_id, { status: "COMPLETED" });
    }

    if (payload.wbsId) {
      WBSRepository.update(payload.wbsId, { actual_progress: actual });
    }

    AppLogger.audit("ProgressService", "PROGRESS_RECORDED", "SUCCESS", {
      projectId: project.project_id,
      date: recordDate,
      actual: actual,
      planned: planned,
      deviation: deviation,
      status: status
    }, null, recordedBy);

    // Otomasi evaluasi pengingat jika proyek mengalami keterlambatan
    if (status === "DELAYED") {
      try {
        NotificationService.sendDelayedAlert(project, actual, planned, deviation);
      } catch (notifErr) {
        AppLogger.warn("ProgressService", "Gagal mengirim notifikasi keterlambatan otomatis: " + notifErr.message);
      }
    }

    return formatSuccessResponse({
      progressId: logId,
      projectId: project.project_id,
      date: recordDate,
      actualProgress: actual,
      plannedProgress: planned,
      deviation: deviation,
      status: status
    }, "Progres harian berhasil dicatat.");
  },

  /**
   * Memperbarui catatan progres harian yang telah ada
   * @param {string} logId
   * @param {object} updates
   * @returns {object}
   */
  updateDailyProgress: function(logId, updates) {
    validateRequired(logId, "Log ID Progres");
    if (!updates || typeof updates !== "object") {
      throw ErrorFactory.validation("Payload update tidak valid.");
    }

    var existing = ProgressLogRepository.findById(logId);
    if (!existing) {
      throw ErrorFactory.notFound("Catatan Progres", logId);
    }

    var project = ProjectRepository.findById(existing.project_id);
    if (!project) {
      throw ErrorFactory.notFound("Proyek", existing.project_id);
    }

    var cleanUpdates = {};
    var newActual = updates.actualProgress !== undefined ? ProgressEngine.validateProgressValue(updates.actualProgress) : Number(existing.actual_progress);
    var newDate = updates.date || existing.date;

    var newPlanned = ProgressEngine.calculatePlannedProgress(project.start_date, project.end_date, newDate, "LINEAR");
    var newDeviation = ProgressEngine.calculateDeviation(newActual, newPlanned);

    cleanUpdates.actual_progress = newActual;
    cleanUpdates.planned_progress = newPlanned;
    cleanUpdates.deviation = newDeviation;
    cleanUpdates.date = newDate;

    if (updates.notes !== undefined) {
      cleanUpdates.notes = sanitizeString(updates.notes);
    }

    var updated = ProgressLogRepository.update(logId, cleanUpdates);

    // Auto-update project status if 100% reached
    if (newActual >= 100 && project.status !== "COMPLETED") {
      ProjectRepository.update(project.project_id, { status: "COMPLETED" });
    }

    AppLogger.audit("ProgressService", "PROGRESS_UPDATED", "SUCCESS", {
      logId: logId,
      projectId: existing.project_id,
      actual: newActual,
      deviation: newDeviation
    });

    return formatSuccessResponse({
      logId: logId,
      updated: updated,
      actualProgress: newActual,
      plannedProgress: newPlanned,
      deviation: newDeviation
    }, "Catatan progres berhasil diperbarui.");
  },

  /**
   * Menghapus catatan progres harian
   * @param {string} logId
   * @returns {object}
   */
  deleteDailyProgress: function(logId) {
    validateRequired(logId, "Log ID Progres");
    var existing = ProgressLogRepository.findById(logId);
    if (!existing) {
      throw ErrorFactory.notFound("Catatan Progres", logId);
    }

    var deleted = ProgressLogRepository.delete(logId);
    AppLogger.audit("ProgressService", "PROGRESS_DELETED", "SUCCESS", {
      logId: logId,
      projectId: existing.project_id,
      date: existing.date
    });

    return formatSuccessResponse({
      deleted: deleted,
      logId: logId
    }, "Catatan progres berhasil dihapus.");
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
   * Mengambil daftar log progres dengan filter fleksibel (rentang tanggal, dsb)
   * @param {object} [filters]
   * @returns {object}
   */
  getDailyProgressLogs: function(filters) {
    var logs = ProgressLogRepository.findAll();

    if (filters && typeof filters === "object") {
      if (filters.projectId) {
        logs = logs.filter(function(l) { return l.project_id === filters.projectId; });
      }
      if (filters.startDate) {
        var startMs = new Date(filters.startDate).getTime();
        logs = logs.filter(function(l) { return new Date(l.date).getTime() >= startMs; });
      }
      if (filters.endDate) {
        var endMs = new Date(filters.endDate).getTime();
        logs = logs.filter(function(l) { return new Date(l.date).getTime() <= endMs; });
      }
    }

    var order = filters && filters.order === "desc" ? "desc" : "asc";
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
  },

  /**
   * Mengambil data untuk pembuatan S-Curve (Planned vs Actual)
   * @param {string} projectId 
   * @param {string} curveType 
   * @returns {object}
   */
  getProjectCurveData: function(projectId, curveType) {
    validateRequired(projectId, "Project ID");
    
    var project = ProjectRepository.findById(projectId);
    if (!project) throw ErrorFactory.notFound("Proyek", projectId);

    var plannedCurve = ProgressEngine.generatePlannedCurve(project.start_date, project.end_date, 20, curveType || "SCURVE");
    var actualLogs = ProgressLogRepository.findByProject(projectId);

    // Sort actual logs kronologis
    actualLogs.sort(function(a, b) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return formatSuccessResponse({
      project: project,
      plannedCurve: plannedCurve,
      actualLogs: actualLogs
    });
  }
};
