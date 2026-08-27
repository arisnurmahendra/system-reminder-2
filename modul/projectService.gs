/**
 * Project Service - Logika Bisnis & Pengelolaan Siklus Hidup Proyek
 * Mengikuti prinsip Separation of Concerns & Service Pattern
 */

var ProjectService = {
  // Status Proyek yang Didukung
  STATUSES: {
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    ARCHIVED: "ARCHIVED"
  },

  /**
   * Mendaftarkan proyek baru ke dalam sistem
   * @param {object} payload
   * @returns {object}
   */
  registerProject: function(payload) {
    if (!payload || typeof payload !== "object") {
      throw ErrorFactory.validation("Payload data proyek tidak boleh kosong.");
    }

    validateRequired(payload.projectName, "Nama Proyek");
    validateRequired(payload.startDate, "Tanggal Mulai");
    validateRequired(payload.endDate, "Tanggal Selesai");
    validateRequired(payload.picName, "Nama PIC");
    validateRequired(payload.picEmail, "Email PIC");

    if (!isValidEmail(payload.picEmail)) {
      throw ErrorFactory.validation("Format Email PIC tidak valid: " + payload.picEmail);
    }

    // Validasi rentang tanggal
    ProgressEngine.validateDateRange(payload.startDate, payload.endDate);

    var cleanName = sanitizeString(payload.projectName);
    var existing = ProjectRepository.findAll(function(p) {
      return String(p.project_name).trim().toLowerCase() === cleanName.toLowerCase();
    });

    if (existing.length > 0) {
      throw ErrorFactory.businessRule("Proyek dengan nama '" + cleanName + "' sudah terdaftar.", CONFIG.ERROR_CODES.BIZ_DUPLICATE_RESOURCE);
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
      status: this.STATUSES.ACTIVE,
      description: sanitizeString(payload.description || "")
    };

    var projectId = ProjectRepository.create(projectData);
    AppLogger.audit("ProjectService", "PROJECT_CREATED", "SUCCESS", {
      projectId: projectId,
      projectName: cleanName,
      picEmail: projectData.pic_email
    });

    return formatSuccessResponse({
      projectId: projectId,
      projectName: cleanName,
      status: this.STATUSES.ACTIVE
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
      throw ErrorFactory.notFound("Proyek", projectId);
    }

    var summary = this.computeProjectSummary_(project);
    return formatSuccessResponse({
      project: project,
      summary: summary
    });
  },

  /**
   * Mengambil semua daftar proyek beserta metrik status dan filter fleksibel
   * @param {object} [filter]
   * @returns {object}
   */
  getAllProjects: function(filter) {
    var self = this;
    var projects = ProjectRepository.findAll();

    if (filter && typeof filter === "object") {
      // Filter status
      if (filter.status && filter.status !== "ALL") {
        projects = projects.filter(function(p) { return p.status === filter.status; });
      }

      // Filter PIC Email
      if (filter.picEmail) {
        var cleanEmail = String(filter.picEmail).trim().toLowerCase();
        projects = projects.filter(function(p) {
          return String(p.pic_email).toLowerCase() === cleanEmail;
        });
      }

      // Filter Keyword (Nama Proyek, Nama PIC, atau Deskripsi)
      if (filter.keyword) {
        var kw = String(filter.keyword).trim().toLowerCase();
        projects = projects.filter(function(p) {
          return (p.project_name && String(p.project_name).toLowerCase().indexOf(kw) !== -1) ||
                 (p.pic_name && String(p.pic_name).toLowerCase().indexOf(kw) !== -1) ||
                 (p.pic_email && String(p.pic_email).toLowerCase().indexOf(kw) !== -1) ||
                 (p.description && String(p.description).toLowerCase().indexOf(kw) !== -1);
        });
      }
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
    if (!updates || typeof updates !== "object") {
      throw ErrorFactory.validation("Data pembaruan proyek tidak valid.");
    }

    var existing = ProjectRepository.findById(projectId);
    if (!existing) {
      throw ErrorFactory.notFound("Proyek", projectId);
    }

    var cleanUpdates = {};
    if (updates.projectName) cleanUpdates.project_name = sanitizeString(updates.projectName);
    if (updates.picName) cleanUpdates.pic_name = sanitizeString(updates.picName);
    if (updates.description !== undefined) cleanUpdates.description = sanitizeString(updates.description);

    if (updates.picEmail) {
      if (!isValidEmail(updates.picEmail)) {
        throw ErrorFactory.validation("Format Email PIC tidak valid: " + updates.picEmail);
      }
      cleanUpdates.pic_email = String(updates.picEmail).trim().toLowerCase();
    }

    if (updates.picPhone !== undefined) {
      cleanUpdates.pic_phone = sanitizeString(updates.picPhone);
    }

    // Validasi perubahan tanggal
    var newStart = updates.startDate || existing.start_date;
    var newEnd = updates.endDate || existing.end_date;
    if (updates.startDate || updates.endDate) {
      ProgressEngine.validateDateRange(newStart, newEnd);
      if (updates.startDate) cleanUpdates.start_date = updates.startDate;
      if (updates.endDate) cleanUpdates.end_date = updates.endDate;
    }

    if (updates.status) {
      this.validateStatusValue_(updates.status);
      cleanUpdates.status = updates.status;
    }

    if (updates.isEmailActive !== undefined) cleanUpdates.is_email_active = Boolean(updates.isEmailActive);
    if (updates.isWaActive !== undefined) cleanUpdates.is_wa_active = Boolean(updates.isWaActive);

    var updated = ProjectRepository.update(projectId, cleanUpdates);
    AppLogger.audit("ProjectService", "PROJECT_UPDATED", "SUCCESS", {
      projectId: projectId,
      updatedFields: Object.keys(cleanUpdates)
    });

    return formatSuccessResponse({
      projectId: projectId,
      updated: updated
    }, "Data proyek berhasil diperbarui.");
  },

  /**
   * Mengubah status siklus hidup proyek (ACTIVE, COMPLETED, CANCELLED, ARCHIVED)
   * @param {string} projectId
   * @param {string} newStatus
   * @returns {object}
   */
  setProjectStatus: function(projectId, newStatus) {
    validateRequired(projectId, "Project ID");
    validateRequired(newStatus, "Status Proyek");

    this.validateStatusValue_(newStatus);

    var existing = ProjectRepository.findById(projectId);
    if (!existing) {
      throw ErrorFactory.notFound("Proyek", projectId);
    }

    var updated = ProjectRepository.update(projectId, { status: newStatus });
    AppLogger.audit("ProjectService", "PROJECT_STATUS_CHANGED", "SUCCESS", {
      projectId: projectId,
      oldStatus: existing.status,
      newStatus: newStatus
    });

    return formatSuccessResponse({
      projectId: projectId,
      status: newStatus
    }, "Status proyek berhasil diubah menjadi " + newStatus + ".");
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
      throw ErrorFactory.validation("Saluran notifikasi tidak valid (hanya 'email' atau 'wa').");
    }

    ProjectRepository.update(projectId, updates);
    AppLogger.audit("ProjectService", "NOTIFICATION_TOGGLED", "SUCCESS", {
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
   * @param {boolean} [cascade=true] - Otomatis menghapus log progres terkait jika true
   * @returns {object}
   */
  deleteProject: function(projectId, cascade) {
    enforceRoles_([CONFIG.ROLES.ADMINISTRATOR, CONFIG.ROLES.PROJECT_MANAGER]);
    validateRequired(projectId, "Project ID");

    var existing = ProjectRepository.findById(projectId);
    if (!existing) {
      throw ErrorFactory.notFound("Proyek", projectId);
    }

    var shouldCascade = cascade !== false;
    var deletedLogsCount = 0;

    if (shouldCascade) {
      var logs = ProgressLogRepository.findByProject(projectId);
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].log_id) {
          ProgressLogRepository.delete(logs[i].log_id);
          deletedLogsCount++;
        }
      }
    }

    var deleted = ProjectRepository.delete(projectId);
    AppLogger.audit("ProjectService", "PROJECT_DELETED", "SUCCESS", {
      projectId: projectId,
      projectName: existing.project_name,
      deletedLogsCount: deletedLogsCount
    });

    return formatSuccessResponse({
      deleted: deleted,
      deletedLogsCount: deletedLogsCount
    }, "Proyek dan " + deletedLogsCount + " log terkait berhasil dihapus.");
  },

  /**
   * Helper internal untuk memvalidasi nilai status
   * @private
   */
  validateStatusValue_: function(status) {
    var validStatuses = [
      this.STATUSES.ACTIVE,
      this.STATUSES.COMPLETED,
      this.STATUSES.CANCELLED,
      this.STATUSES.ARCHIVED
    ];

    if (validStatuses.indexOf(status) === -1) {
      throw ErrorFactory.validation("Status proyek '" + status + "' tidak valid. Pilihan: " + validStatuses.join(", "));
    }
  },

  /**
   * Helper internal untuk menghitung ringkasan kalkulasi proyek
   * @private
   */
  computeProjectSummary_: function(project) {
    var today = ProgressEngine.formatDateYMD_(new Date());
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
