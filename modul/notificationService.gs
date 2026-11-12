/**
 * Notification Service - Orkestrasi Pengiriman Pengingat Multi-Channel
 * Mengintegrasikan pengiriman Email (Gmail) dan WhatsApp (Fonnte)
 */

var NotificationService = {
  sendAdministrativeNotification: function(item) {
    var rules = NotificationConfigService.getRulesForEvent("ADMINISTRATIVE_REMINDER");
    if (item.rule_id) rules = rules.filter(function(r) { return r.rule_id === item.rule_id; });
    if (!rules.length) return { sent: false, skipped: true };
    var rule = rules[0], group = rule.group_id ? NotificationConfigService.getRecipients("", rule.group_id) : null, emails = group ? NotificationConfigService.split(group.email_to) : [], phones = group ? NotificationConfigService.split(group.whatsapp_numbers) : [], subject = "[System Reminder 2] " + item.title, text = item.description + (item.owner ? "\nPIC: " + item.owner : "") + (item.due_date ? "\nBatas waktu: " + item.due_date : ""), html = EmailHelper.wrapEmailTemplate_(subject, "<p>" + text.replace(/\n/g, "<br>") + "</p>"), sent = false;
    emails.forEach(function(to) { var key = "ADMIN:" + item.item_id + ":EMAIL", payload = { subject: subject, htmlBody: html, cc: group.email_cc || "", bcc: group.email_bcc || "" }; if (!NotificationConfigService.shouldSend(key, to.toLowerCase(), rule.dedupe_minutes)) return; NotificationConfigService.recordDelivery({ dedupe_key: key, rule_id: rule.rule_id, channel: "EMAIL", recipient: to, status: "QUEUED", payload: payload }); var d = EmailHelper.sendEmailDetailed(to, subject, html, null, payload.cc, payload.bcc); NotificationConfigService.recordDelivery({ dedupe_key: key, rule_id: rule.rule_id, channel: "EMAIL", recipient: to, status: d.sent ? "SENT" : "FAILED", attempts: 1, provider_id: d.providerId, last_error: d.error, payload: payload }); sent = sent || d.sent; });
    phones.forEach(function(phone) { var clean = FonnteHelper.sanitizePhoneNumber(phone), key = "ADMIN:" + item.item_id + ":WHATSAPP", payload = { message: "*PENGINGAT ADMINISTRASI*\n\n" + text }; if (!NotificationConfigService.shouldSend(key, clean, rule.dedupe_minutes)) return; NotificationConfigService.recordDelivery({ dedupe_key: key, rule_id: rule.rule_id, channel: "WHATSAPP", recipient: clean, status: "QUEUED", payload: payload }); var d = FonnteHelper.sendMessageDetailed(clean, payload.message); NotificationConfigService.recordDelivery({ dedupe_key: key, rule_id: rule.rule_id, channel: "WHATSAPP", recipient: clean, status: d.sent ? "SENT" : "FAILED", attempts: 1, provider_id: d.providerId, last_error: d.error, payload: payload }); sent = sent || d.sent; });
    return { sent: sent };
  },
  sendEventNotification: function(project, eventType, actualProgress, plannedProgress, deviation) {
    var rules = NotificationConfigService.getRulesForProject(project.project_id).filter(function(r) { return String(r.event_type || "").toUpperCase() === String(eventType).toUpperCase(); });
    if (!rules.length) return { emailSent: false, waSent: false, eventType: eventType, skipped: true };
    var rule = rules[0], template = NotificationConfigService.getTemplate(rule.template_id), subject = template && template.subject || "[System Reminder 2] " + eventType, body = template && template.body || (eventType === "COMPLETED" ? EmailHelper.buildCompletedAlertHtml(project) : eventType === "DAILY_STATUS" ? EmailHelper.buildDailyReminderHtml(project, actualProgress, plannedProgress, ProgressEngine.calculateDaysRemaining(project.end_date)) : EmailHelper.wrapEmailTemplate_(subject, "Ringkasan mingguan proyek " + project.project_name));
    var group = NotificationConfigService.getRecipients(project.project_id, rule.group_id), emails = group ? NotificationConfigService.split(group.email_to) : (project.pic_email ? [project.pic_email] : []), phones = group ? NotificationConfigService.split(group.whatsapp_numbers) : (project.pic_phone ? [project.pic_phone] : []), result = { emailSent: false, waSent: false, eventType: eventType };
    emails.forEach(function(to) { var key = project.project_id + ":" + eventType + ":EMAIL", payload = { subject: subject, htmlBody: body, cc: group && group.email_cc || "", bcc: group && group.email_bcc || "" }; if (!NotificationConfigService.shouldSend(key, to.toLowerCase(), rule.dedupe_minutes)) return; NotificationConfigService.recordDelivery({ dedupe_key: key, project_id: project.project_id, rule_id: rule.rule_id, channel: "EMAIL", recipient: to, status: "QUEUED", payload: payload }); var d = EmailHelper.sendEmailDetailed(to, subject, body, null, payload.cc, payload.bcc); NotificationConfigService.recordDelivery({ dedupe_key: key, project_id: project.project_id, rule_id: rule.rule_id, channel: "EMAIL", recipient: to, status: d.sent ? "SENT" : "FAILED", attempts: 1, provider_id: d.providerId, last_error: d.error, payload: payload }); result.emailSent = result.emailSent || d.sent; });
    phones.forEach(function(phone) { var clean = FonnteHelper.sanitizePhoneNumber(phone), key = project.project_id + ":" + eventType + ":WHATSAPP", message = eventType === "COMPLETED" ? FonnteHelper.formatCompletedAlert(project) : eventType === "DAILY_STATUS" ? FonnteHelper.formatDailyReminder(project, actualProgress, plannedProgress, ProgressEngine.calculateDaysRemaining(project.end_date)) : "📊 *RINGKASAN MINGGUAN*\nProyek: *" + project.project_name + "*\nProgres: *" + actualProgress + "%*"; if (!NotificationConfigService.shouldSend(key, clean, rule.dedupe_minutes)) return; var payload = { message: message }; NotificationConfigService.recordDelivery({ dedupe_key: key, project_id: project.project_id, rule_id: rule.rule_id, channel: "WHATSAPP", recipient: clean, status: "QUEUED", payload: payload }); var d = FonnteHelper.sendMessageDetailed(clean, message); NotificationConfigService.recordDelivery({ dedupe_key: key, project_id: project.project_id, rule_id: rule.rule_id, channel: "WHATSAPP", recipient: clean, status: d.sent ? "SENT" : "FAILED", attempts: 1, provider_id: d.providerId, last_error: d.error, payload: payload }); result.waSent = result.waSent || d.sent; });
    return result;
  },
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
    var rules = NotificationConfigService.getRulesForProject(project.project_id);
    var rule = rules.length ? rules[0] : { rule_id: "legacy", dedupe_minutes: 1440, max_retries: 3 };
    var customTemplate = NotificationConfigService.getTemplate(rule.template_id);
    var group = NotificationConfigService.getRecipients(project.project_id, rule.group_id);
    var emailTo = group ? NotificationConfigService.split(group.email_to) : (project.pic_email ? [project.pic_email] : []);
    var emailCc = group ? NotificationConfigService.split(group.email_cc).join(",") : "";
    var emailBcc = group ? NotificationConfigService.split(group.email_bcc).join(",") : "";
    var phones = group ? NotificationConfigService.split(group.whatsapp_numbers) : (project.pic_phone ? [project.pic_phone] : []);

    // 1. Kirim Email jika opsi Email aktif
    if (project.is_email_active && emailTo.length) {
      var subject = customTemplate && customTemplate.channel === "EMAIL" && customTemplate.subject ? customTemplate.subject : "⚠️ [Peringatan Proyek] Keterlambatan: " + project.project_name;
      var htmlBody = customTemplate && customTemplate.channel === "EMAIL" && customTemplate.body ? EmailHelper.wrapEmailTemplate_(subject, this.renderTemplate_(customTemplate.body, project, actualProgress, plannedProgress, deviation)) : EmailHelper.buildDelayedAlertHtml(project, actualProgress, plannedProgress, deviation);
      var emailKey = project.project_id + ":DELAYED:EMAIL";
      {
        for (var e = 0; e < emailTo.length; e++) {
          var emailRecipientKey = emailTo[e].toLowerCase();
          if (!NotificationConfigService.shouldSend(emailKey, emailRecipientKey, rule.dedupe_minutes)) {
            NotificationConfigService.recordDelivery({ dedupe_key: emailKey, project_id: project.project_id, rule_id: rule.rule_id, channel: "EMAIL", recipient: emailTo[e], status: "SKIPPED", reason: "Deduplikasi dalam interval aktif" });
            continue;
          }
          var payload = { subject: subject, htmlBody: htmlBody, plainText: null, cc: emailCc, bcc: emailBcc };
          NotificationConfigService.recordDelivery({ dedupe_key: emailKey, project_id: project.project_id, rule_id: rule.rule_id, channel: "EMAIL", recipient: emailTo[e], status: "QUEUED", payload: payload });
          var sent = false, attempts = 0, detail = null;
          while (!sent && attempts < Number(rule.max_retries || 3)) { attempts++; detail = EmailHelper.sendEmailDetailed(emailTo[e], subject, htmlBody, null, emailCc, emailBcc); sent = detail.sent; }
          NotificationConfigService.recordDelivery({ dedupe_key: emailKey, project_id: project.project_id, rule_id: rule.rule_id, channel: "EMAIL", recipient: emailTo[e], status: sent ? "SENT" : "FAILED", attempts: attempts, provider_id: detail && detail.providerId, last_error: sent ? "" : (detail && detail.error) || "Provider email gagal mengirim", payload: payload });
          results.emailSent = results.emailSent || sent;
        }
      }
    }

    // 2. Kirim WhatsApp jika opsi WhatsApp aktif
    if (project.is_wa_active && phones.length) {
      var waMessage = customTemplate && customTemplate.channel === "WHATSAPP" && customTemplate.body ? this.renderTemplate_(customTemplate.body, project, actualProgress, plannedProgress, deviation) : FonnteHelper.formatDelayedAlert(project, actualProgress, plannedProgress, deviation);
      var waKey = project.project_id + ":DELAYED:WHATSAPP";
      {
        for (var w = 0; w < phones.length; w++) {
          var phoneRecipientKey = FonnteHelper.sanitizePhoneNumber(phones[w]);
          if (!NotificationConfigService.shouldSend(waKey, phoneRecipientKey, rule.dedupe_minutes)) {
            NotificationConfigService.recordDelivery({ dedupe_key: waKey, project_id: project.project_id, rule_id: rule.rule_id, channel: "WHATSAPP", recipient: phoneRecipientKey, status: "SKIPPED", reason: "Deduplikasi dalam interval aktif" });
            continue;
          }
          var waPayload = { message: waMessage };
          NotificationConfigService.recordDelivery({ dedupe_key: waKey, project_id: project.project_id, rule_id: rule.rule_id, channel: "WHATSAPP", recipient: phoneRecipientKey, status: "QUEUED", payload: waPayload });
          var waSent = false, waAttempts = 0, waDetail = null;
          while (!waSent && waAttempts < Number(rule.max_retries || 3)) { waAttempts++; waDetail = FonnteHelper.sendMessageDetailed(phones[w], waMessage); waSent = waDetail.sent; }
          NotificationConfigService.recordDelivery({ dedupe_key: waKey, project_id: project.project_id, rule_id: rule.rule_id, channel: "WHATSAPP", recipient: phoneRecipientKey, status: waSent ? "SENT" : "FAILED", attempts: waAttempts, provider_id: waDetail && waDetail.providerId, last_error: waSent ? "" : (waDetail && waDetail.error) || "Provider WhatsApp gagal mengirim", payload: waPayload });
          results.waSent = results.waSent || waSent;
        }
      }
    }

    return results;
  },

  renderTemplate_: function(body, project, actual, planned, deviation) {
    return String(body || "")
      .replace(/\{project_name\}/g, project.project_name || "")
      .replace(/\{actual_progress\}/g, actual)
      .replace(/\{planned_progress\}/g, planned)
      .replace(/\{deviation\}/g, deviation)
      .replace(/\{pic_name\}/g, project.pic_name || "")
      .replace(/\{days_remaining\}/g, ProgressEngine.calculateDaysRemaining(project.end_date));
  },

  /**
   * Pengecekan otomatis berkala (Scheduled Trigger) untuk semua proyek aktif
   * @returns {object}
   */
  checkAndSendDailyReminders: function() {
    var adminItems = NotificationConfigService.getAdminItems().data.items || [], todayDate = new Date(), adminSent = 0;
    adminItems.filter(function(item) { return String(item.is_active) !== "false" && String(item.status).toUpperCase() !== "COMPLETED"; }).forEach(function(item) { var due = item.due_date ? Math.ceil((new Date(item.due_date).getTime() - todayDate.getTime()) / 86400000) : null; if (due !== null && due <= Number(item.threshold_days || 0)) { if (NotificationService.sendAdministrativeNotification(item).sent) adminSent++; NotificationConfigService.updateAdminItem(item.item_id, { last_notified_at: new Date().toISOString(), updated_at: new Date().toISOString() }); } });
    var activeProjects = ProjectRepository.findAll(function(p) {
      return p.status === "ACTIVE" || p.status === "COMPLETED";
    });

    var today = new Date().toISOString().split("T")[0];
    var summary = {
      totalEvaluated: activeProjects.length,
      delayedCount: 0,
      notificationsSent: adminSent
    };

    for (var i = 0; i < activeProjects.length; i++) {
      var project = activeProjects[i];
      var scheduledRules = NotificationConfigService.getRulesForProject(project.project_id);
      if (scheduledRules.length && !scheduledRules.some(function(r) { return NotificationConfigService.isRuleDue(r, new Date()); })) continue;
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

      var daysSinceUpdate = history.length ? Math.floor((new Date(today).getTime() - new Date(history[0].date).getTime()) / 86400000) : 9999;
      var daysRemaining = ProgressEngine.calculateDaysRemaining(project.end_date);
      var eventRules = NotificationConfigService.getRulesForProject(project.project_id);
      eventRules.forEach(function(eventRule) {
        var eventType = String(eventRule.event_type || "").toUpperCase(), threshold = Number(eventRule.threshold_value || 0), condition = false;
        if (eventType === "NO_PROGRESS" || eventType === "PROGRESS_INPUT_REMINDER") condition = daysSinceUpdate >= (threshold || 1);
        else if (eventType === "DEADLINE_APPROACHING") condition = daysRemaining >= 0 && daysRemaining <= (threshold || 7);
        else if (eventType === "DEVIATION_ESCALATION") condition = Math.abs(ProgressEngine.calculateDeviation(latestActual, planned)) >= (threshold || 10);
        else if (eventType === "DELAYED") condition = status === "DELAYED";
        else if (eventType === "COMPLETED") condition = project.status === "COMPLETED";
        else if (eventType === "DAILY_STATUS" || eventType === "WEEKLY_SUMMARY") condition = NotificationConfigService.isRuleDue(eventRule, new Date());
        if (condition && (eventType === "DAILY_STATUS" || eventType === "WEEKLY_SUMMARY" || eventType === "DELAYED" || eventType === "NO_PROGRESS" || eventType === "DEADLINE_APPROACHING" || eventType === "DEVIATION_ESCALATION" || eventType === "PROGRESS_INPUT_REMINDER")) this.sendEventNotification(project, eventType, latestActual, planned, ProgressEngine.calculateDeviation(latestActual, planned));
      });

      ["DAILY_STATUS", "WEEKLY_SUMMARY", "COMPLETED"].forEach(function(eventType) {
        var eventRules = NotificationConfigService.getRulesForProject(project.project_id).filter(function(r) { return String(r.event_type || "").toUpperCase() === eventType; });
        var due = eventRules.length && (eventType === "COMPLETED" ? (String(eventRules[0].frequency).toUpperCase() === "EVENT" && project.status === "COMPLETED") : NotificationConfigService.isRuleDue(eventRules[0], new Date()));
        if (due) summary.notificationsSent += (this.sendEventNotification(project, eventType, latestActual, planned, ProgressEngine.calculateDeviation(latestActual, planned)).emailSent ? 1 : 0);
      }, this);

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
