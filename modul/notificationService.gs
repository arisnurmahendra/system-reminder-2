/**
 * Notification Service - Orkestrasi Pengiriman Pengingat Multi-Channel
 * Mengintegrasikan pengiriman Email (Gmail) dan WhatsApp (Fonnte)
 */

var NotificationService = {
  /**
   * Mengirim peringatan keterlambatan proyek ke PIC
   * @param {object} project
   * @param {number} actualProgress
   * @param {number} plannedProgress
   * @param {number} deviation
   * @returns {object} { emailSent: boolean, waSent: boolean }
   */
  sendDelayedAlert: function(project, actualProgress, plannedProgress, deviation) {
    var results = { emailSent: false, waSent: false };
    var devAbs = Math.abs(deviation).toFixed(2);

    // 1. Kirim Email jika opsi Email aktif
    if (project.is_email_active && project.pic_email) {
      var subject = "⚠️ [Peringatan Proyek] Keterlambatan: " + project.project_name;
      var htmlBody = EmailHelper.buildDelayedAlertHtml(project, actualProgress, plannedProgress, deviation);
      results.emailSent = EmailHelper.sendEmail(project.pic_email, subject, htmlBody);
      AppLogger.audit("NotificationService", "EMAIL_REMINDER_SENT", results.emailSent ? "SUCCESS" : "FAILURE", {
        projectId: project.project_id,
        deviation: deviation
      }, null, project.pic_email);
    }

    // 2. Kirim WhatsApp jika opsi WhatsApp aktif
    if (project.is_wa_active && project.pic_phone) {
      var waMessage = FonnteHelper.formatDelayedAlert(project, actualProgress, plannedProgress, deviation);
      results.waSent = FonnteHelper.sendMessage(project.pic_phone, waMessage);
      AppLogger.audit("NotificationService", "WA_REMINDER_SENT", results.waSent ? "SUCCESS" : "FAILURE", {
        projectId: project.project_id,
        deviation: deviation
      }, null, project.pic_phone);
    }

    return results;
  },

  /**
   * Pengecekan otomatis berkala (Scheduled Trigger) untuk semua proyek aktif
   * @returns {object}
   */
  checkAndSendDailyReminders: function() {
    var activeProjects = ProjectRepository.findAll(function(p) {
      return p.status === "ACTIVE";
    });

    var today = new Date().toISOString().split("T")[0];
    var summary = {
      totalEvaluated: activeProjects.length,
      delayedCount: 0,
      notificationsSent: 0
    };

    for (var i = 0; i < activeProjects.length; i++) {
      var project = activeProjects[i];
      var planned = ProgressEngine.calculatePlannedProgress(project.start_date, project.end_date, today, "LINEAR");
      
      var history = ProgressLogRepository.findByProject(project.project_id);
      var latestActual = 0;
      if (history.length > 0) {
        history.sort(function(a, b) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        latestActual = Number(history[0].actual_progress || 0);
      }

      var status = ProgressEngine.determineProgressStatus(latestActual, planned);

      if (status === "DELAYED") {
        summary.delayedCount++;
        var deviation = ProgressEngine.calculateDeviation(latestActual, planned);
        var notifRes = this.sendDelayedAlert(project, latestActual, planned, deviation);
        if (notifRes.emailSent || notifRes.waSent) {
          summary.notificationsSent++;
        }
      }
    }

    writeAuditLog(null, "SCHEDULER", "DAILY_REMINDERS_PROCESSED", "SUCCESS", "NotificationService", summary);
    return formatSuccessResponse(summary, "Pemeriksaan pengingat harian selesai.");
  }
};
