/**
 * Project Service - Logika Bisnis & Pengelolaan Proyek
 * Mengikuti prinsip Separation of Concerns & Service Pattern
 */

var ProjectService = {
  /**
   * Mendaftarkan proyek baru ke dalam sistem
   * @param {object} payload
   * @returns {object}
   */
  registerProject: function(payload) {
    validateRequired(payload.projectName, "Nama Proyek");
    validateRequired(payload.startDate, "Tanggal Mulai");
    validateRequired(payload.endDate, "Tanggal Selesai");
    validateRequired(payload.picName, "Nama PIC");
    validateRequired(payload.picEmail, "Email PIC");

    if (!isValidEmail(payload.picEmail)) {
      throw new Error("Format Email PIC tidak valid: " + payload.picEmail);
    }

    var start = new Date(payload.startDate);
    var end = new Date(payload.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Format tanggal mulai atau tanggal selesai tidak valid.");
    }

    if (start.getTime() > end.getTime()) {
      throw new Error("Tanggal mulai tidak boleh lebih besar dari tanggal selesai.");
    }

    var cleanName = sanitizeString(payload.projectName);
    var existing = ProjectRepository.findAll(function(p) {
      return String(p.project_name).trim().toLowerCase() === cleanName.toLowerCase();
    });

    if (existing.length > 0) {
      throw new Error("Proyek dengan nama '" + cleanName + "' sudah terdaftar.");
    }

    var projectData = {
      project_name: cleanName,
      start_date: payload.startDate,
      end_date: payload.endDate,
      pic_name: sanitizeString(payload.picName),
      pic_email: String(payload.picEmail).trim().toLowerCase(),
      pic_phone: sanitizeString(payload.picPhone || ""),
      is_email_active: payload.isEmailActive !== false,
      is_wa_active: payload.isWaActive !== false,
      status: "ACTIVE"
    };

    var projectId = ProjectRepository.create(projectData);
    writeAuditLog(null, getCurrentUserEmail_(), "PROJECT_CREATED", "SUCCESS", "ProjectService", {
      projectId: projectId,
      projectName: cleanName
    });

    return formatSuccessResponse({
      projectId: projectId,
      projectName: cleanName
    }, "Proyek berhasil didaftarkan.");
  },

  /**
   * Mengambil detail lengkap proyek beserta ringkasan metrik progres saat ini
   * @param {string} projectId
   * @returns {object}
   */
  getProjectById: function(projectId) {
    validateRequired(projectId, "Project ID");
    var project = ProjectRepository.findById(projectId);
    if (!project) {
      throw new Error("Proyek dengan ID '" + projectId + "' tidak ditemukan.");
    }

    var summary = this.computeProjectSummary_(project);
    return formatSuccessResponse({
      project: project,
      summary: summary
    });
  },

  /**
   * Mengambil semua daftar proyek beserta metrik status
   * @param {object} [filter]
   * @returns {object}
   */
  getAllProjects: function(filter) {
    var self = this;
    var projects = ProjectRepository.findAll();

    if (filter && filter.status) {
      projects = projects.filter(function(p) { return p.status === filter.status; });
    }

    var list = projects.map(function(p) {
      return {
        project: p,
        summary: self.computeProjectSummary_(p)
      };
    });

    return formatSuccessResponse(list);
  },

  /**
   * Memperbarui informasi proyek
   * @param {string} projectId
   * @param {object} updates
   * @returns {object}
   */
  updateProject: function(projectId, updates) {
    validateRequired(projectId, "Project ID");
    var existing = ProjectRepository.findById(projectId);
    if (!existing) {
      throw new Error("Proyek tidak ditemukan.");
    }

    var cleanUpdates = {};
    if (updates.projectName) cleanUpdates.project_name = sanitizeString(updates.projectName);
    if (updates.startDate) cleanUpdates.start_date = updates.startDate;
    if (updates.endDate) cleanUpdates.end_date = updates.endDate;
    if (updates.picName) cleanUpdates.pic_name = sanitizeString(updates.picName);
    if (updates.picEmail) {
      if (!isValidEmail(updates.picEmail)) throw new Error("Format Email PIC tidak valid.");
      cleanUpdates.pic_email = String(updates.picEmail).trim().toLowerCase();
    }
    if (updates.picPhone !== undefined) cleanUpdates.pic_phone = sanitizeString(updates.picPhone);
    if (updates.status) cleanUpdates.status = updates.status;

    var updated = ProjectRepository.update(projectId, cleanUpdates);
    writeAuditLog(null, getCurrentUserEmail_(), "PROJECT_UPDATED", "SUCCESS", "ProjectService", {
      projectId: projectId,
      updatedFields: Object.keys(cleanUpdates)
    });

    return formatSuccessResponse({ updated: updated }, "Data proyek berhasil diperbarui.");
  },

  /**
   * Mengaktifkan/menonaktifkan saluran pengingat (Email / WhatsApp) per proyek
   * @param {string} projectId
   * @param {"email"|"wa"} channelType
   * @param {boolean} isEnabled
   * @returns {object}
   */
  toggleNotification: function(projectId, channelType, isEnabled) {
    validateRequired(projectId, "Project ID");
    var updates = {};
    if (channelType === "email") {
      updates.is_email_active = Boolean(isEnabled);
    } else if (channelType === "wa") {
      updates.is_wa_active = Boolean(isEnabled);
    } else {
      throw new Error("Saluran notifikasi tidak valid (hanya 'email' atau 'wa').");
    }

    ProjectRepository.update(projectId, updates);
    writeAuditLog(null, getCurrentUserEmail_(), "NOTIFICATION_TOGGLED", "SUCCESS", "ProjectService", {
      projectId: projectId,
      channel: channelType,
      enabled: Boolean(isEnabled)
    });

    return formatSuccessResponse({
      projectId: projectId,
      channel: channelType,
      enabled: Boolean(isEnabled)
    }, "Pengaturan notifikasi berhasil diperbarui.");
  },

  /**
   * Menghapus proyek dari sistem (Restricted to Administrator / Project Manager)
   * @param {string} projectId
   * @returns {object}
   */
  deleteProject: function(projectId) {
    enforceRoles_([CONFIG.ROLES.ADMINISTRATOR, CONFIG.ROLES.PROJECT_MANAGER]);
    validateRequired(projectId, "Project ID");

    var deleted = ProjectRepository.delete(projectId);
    writeAuditLog(null, getCurrentUserEmail_(), "PROJECT_DELETED", "SUCCESS", "ProjectService", {
      projectId: projectId
    });

    return formatSuccessResponse({ deleted: deleted }, "Proyek berhasil dihapus.");
  },

  /**
   * Helper internal untuk menghitung ringkasan kalkulasi proyek
   * @private
   */
  computeProjectSummary_: function(project) {
    var today = new Date().toISOString().split("T")[0];
    var planned = ProgressEngine.calculatePlannedProgress(project.start_date, project.end_date, today, "LINEAR");
    
    // Ambil log progres terbaru
    var history = ProgressLogRepository.findByProject(project.project_id);
    var latestActual = 0;
    var lastRecordedDate = null;

    if (history.length > 0) {
      // Urutkan berdasarkan tanggal terbaru
      history.sort(function(a, b) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      latestActual = Number(history[0].actual_progress || 0);
      lastRecordedDate = history[0].date;
    }

    var deviation = ProgressEngine.calculateDeviation(latestActual, planned);
    var status = ProgressEngine.determineProgressStatus(latestActual, planned);
    var indicator = ProgressEngine.getStatusIndicator(status);
    var daysRemaining = ProgressEngine.calculateDaysRemaining(project.end_date);
    var totalDuration = ProgressEngine.calculateTotalDuration(project.start_date, project.end_date);
    var schedulePercentage = ProgressEngine.calculateSchedulePercentage(project.start_date, project.end_date, today);
    var estimatedCompletion = ProgressEngine.calculateEstimatedCompletionDate(project.start_date, project.end_date, latestActual, lastRecordedDate);

    return {
      plannedProgress: planned,
      actualProgress: latestActual,
      deviation: deviation,
      status: status,
      indicator: indicator,
      totalDuration: totalDuration,
      schedulePercentage: schedulePercentage,
      daysRemaining: daysRemaining,
      estimatedCompletionDate: estimatedCompletion,
      lastRecordedDate: lastRecordedDate,
      totalProgressLogs: history.length
    };
  }
};
