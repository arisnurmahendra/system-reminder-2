/**
 * Entry Point Utama Web App & Routing Google Apps Script
 * Mengikuti standar arsitektur Layer Architecture & Baseline Control POL.ISMS.001
 */

// Toggle global untuk debug mode (Console Logging)
var viewLog = true;

/**
 * Endpoint HTTP GET untuk merender Antarmuka Web App
 */
function doGet(e) {
  try {
    SpreadsheetManager.initializeAllSheets();
  } catch (err) {
    AppLogger.error("Code.gs", "Gagal melakukan inisialisasi database di doGet: " + err.message, err);
  }

  var template = HtmlService.createTemplateFromFile("Index");
  template.appConfig = {
    appName: CONFIG.APP.NAME,
    appVersion: CONFIG.APP.VERSION
  };

  var output = template.evaluate();
  output.setTitle(CONFIG.APP.NAME + " — Dashboard & Reminder");
  output.addMetaTag("viewport", "width=device-width, initial-scale=1.0");
  if (typeof HtmlService.XFrameOptionsMode !== "undefined" && HtmlService.XFrameOptionsMode.ALLOWALL) {
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return output;
}

/**
 * Helper untuk menyertakan berkas HTML parsial (CSS & JS) ke dalam Index.html
 * @param {string} filename
 * @returns {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ==========================================
// 1. AUTHENTICATION & SESSION ENDPOINTS
// ==========================================

function apiInitializeDatabase() {
  return safeWebResponse(function() {
    return SpreadsheetManager.verifyAndSetupDatabase();
  }, "apiInitializeDatabase");
}

function apiLogin(identifier, password, totpToken) {
  return safeWebResponse(function() {
    enforceRateLimit_("LOGIN", identifier, 5, 900);
    var cleanIdentifier = sanitizeString(identifier);
    var cleanPassword = String(password || "");
    var cleanTotp = sanitizeString(totpToken);
    return processUserLogin(cleanIdentifier, cleanPassword, cleanTotp);
  }, "apiLogin");
}

function apiChangeInitialPassword(userId, oldPassword, newPassword) {
  return safeWebResponse(function() {
    var cleanUserId = sanitizeString(userId);
    var cleanOldPassword = String(oldPassword || "");
    var cleanNewPassword = String(newPassword || "");
    return processInitialPasswordChange(cleanUserId, cleanOldPassword, cleanNewPassword);
  }, "apiChangeInitialPassword");
}

function apiCheckSession() {
  return safeWebResponse(function() {
    return getActiveSessionStatus();
  }, "apiCheckSession");
}

function apiValidateSessionToken(token) {
  return safeWebResponse(function() { enforceSessionToken_(sanitizeString(token)); return formatSuccessResponse({ valid: true }); }, "apiValidateSessionToken");
}

function apiLogout() {
  return safeWebResponse(function() {
    var email = "UNKNOWN";
    try {
      email = Session.getActiveUser().getEmail() || "UNKNOWN";
    } catch(e) {}
    
    if (typeof writeAuditLog !== 'undefined') {
      writeAuditLog("SYSTEM", email, "LOGOUT", "SUCCESS", "Code.gs", { message: "User logged out dari antarmuka Web App" });
    }
    return formatSuccessResponse({}, "Berhasil keluar dari sistem.");
  }, "apiLogout");
}

function apiGetSystemMetadata() {
  return safeWebResponse(function() {
    return {
      appName: CONFIG.APP.NAME,
      version: CONFIG.APP.VERSION,
      roles: Object.keys(CONFIG.ROLES)
    };
  }, "apiGetSystemMetadata");
}

// ==========================================
// 2. PROJECT SERVICE ENDPOINTS
// ==========================================

function apiRegisterProject(payload) {
  return safeWebResponse(function() {
    return ProjectService.registerProject(payload);
  }, "apiRegisterProject");
}

function apiGetProjectById(projectId) {
  return safeWebResponse(function() {
    return ProjectService.getProjectById(sanitizeString(projectId));
  }, "apiGetProjectById");
}

function apiGetAllProjects(filter) {
  return safeWebResponse(function() {
    return ProjectService.getAllProjects(filter);
  }, "apiGetAllProjects");
}

function apiUpdateProject(projectId, updates) {
  return safeWebResponse(function() {
    return ProjectService.updateProject(sanitizeString(projectId), updates);
  }, "apiUpdateProject");
}

function apiToggleProjectNotification(projectId, channelType, isEnabled) {
  return safeWebResponse(function() {
    return ProjectService.toggleNotification(sanitizeString(projectId), sanitizeString(channelType), isEnabled);
  }, "apiToggleProjectNotification");
}

function apiDeleteProject(projectId, cascade) {
  return safeWebResponse(function() {
    return ProjectService.deleteProject(sanitizeString(projectId), cascade);
  }, "apiDeleteProject");
}

function apiSetProjectStatus(projectId, status) {
  return safeWebResponse(function() {
    return ProjectService.setProjectStatus(sanitizeString(projectId), sanitizeString(status));
  }, "apiSetProjectStatus");
}

/**
 * ⚠️ Mencabut Izin Aplikasi (Revoke Permissions)
 * @returns {object} Response Standar
 */
function apiRevokeScriptPermissions() {
  return safeWebResponse(function() {
    ScriptApp.invalidateAuth();
    return formatSuccessResponse({}, "Akses Google Apps Script berhasil dicabut.");
  }, "apiRevokeScriptPermissions");
}

// ==========================================
// 3. PROGRESS SERVICE ENDPOINTS
// ==========================================

function apiRecordDailyProgress(payload) {
  return safeWebResponse(function() {
    return ProgressService.recordDailyProgress(payload);
  }, "apiRecordDailyProgress");
}

function apiUpdateDailyProgress(logId, updates) {
  return safeWebResponse(function() {
    return ProgressService.updateDailyProgress(sanitizeString(logId), updates);
  }, "apiUpdateDailyProgress");
}

function apiDeleteDailyProgress(logId) {
  return safeWebResponse(function() {
    return ProgressService.deleteDailyProgress(sanitizeString(logId));
  }, "apiDeleteDailyProgress");
}

function apiGetDailyProgressLogs(filters) {
  return safeWebResponse(function() {
    return ProgressService.getDailyProgressLogs(filters);
  }, "apiGetDailyProgressLogs");
}

function apiGetProgressHistory(projectId, order) {
  return safeWebResponse(function() {
    return ProgressService.getProgressHistory(sanitizeString(projectId), sanitizeString(order));
  }, "apiGetProgressHistory");
}

function apiGetLatestProgress(projectId) {
  return safeWebResponse(function() {
    return ProgressService.getLatestProgress(sanitizeString(projectId));
  }, "apiGetLatestProgress");
}

function apiGetProjectTimeline(projectId, options) {
  return safeWebResponse(function() {
    var cleanId = sanitizeString(projectId);
    var project = ProjectRepository.findById(cleanId);
    if (!project) {
      throw ErrorFactory.notFound("Proyek", cleanId);
    }

    var timeline = ScheduleEngine.generateScheduleTimeline(project.start_date, project.end_date, options);
    var phase = ScheduleEngine.getSchedulePhase(project.start_date, project.end_date);
    var totalWorkingDays = ScheduleEngine.calculateWorkingDays(project.start_date, project.end_date);

    return {
      project: project,
      phase: phase,
      totalWorkingDays: totalWorkingDays,
      timeline: timeline
    };
  }, "apiGetProjectTimeline");
}

function apiGetDashboardExecutiveSummary() {
  return safeWebResponse(function() {
    return DashboardSummaryService.getExecutiveSummary();
  }, "apiGetDashboardExecutiveSummary");
}

function apiGetProjectCurveData(projectId, curveType) {
  return safeWebResponse(function() {
    return ProgressService.getProjectCurveData(sanitizeString(projectId), curveType);
  }, "apiGetProjectCurveData");
}

function apiGetProjectWBSAndSchedule(projectId) {
  return safeWebResponse(function() {
    return WBSService.getProjectWBSAndSchedule(sanitizeString(projectId));
  }, "apiGetProjectWBSAndSchedule");
}

function apiSaveWBSItem(payload) {
  return safeWebResponse(function() {
    return WBSService.saveWBSItem(payload);
  }, "apiSaveWBSItem");
}

function apiDeleteWBSItem(wbsId) {
  return safeWebResponse(function() {
    return WBSService.deleteWBSItem(sanitizeString(wbsId));
  }, "apiDeleteWBSItem");
}

function apiGetAllUsers() {
  return safeWebResponse(function() {
    return UserService.getAllUsers();
  }, "apiGetAllUsers");
}

function apiCreateUser(payload) {
  return safeWebResponse(function() {
    return UserService.createUser(payload);
  }, "apiCreateUser");
}

function apiUpdateUser(userId, payload) {
  return safeWebResponse(function() {
    return UserService.updateUser(sanitizeString(userId), payload);
  }, "apiUpdateUser");
}

function apiChangePassword(oldPass, newPass) {
  return safeWebResponse(function() {
    return UserService.changePassword(sanitizeString(oldPass), sanitizeString(newPass));
  }, "apiChangePassword");
}

function apiExportProjectPdf(projectId) {
  return safeWebResponse(function() {
    return PdfExportService.exportProjectPdfBlob(sanitizeString(projectId));
  }, "apiExportProjectPdf");
}

function apiExportPortfolioPdf() {
  return safeWebResponse(function() {
    return PdfExportService.exportPortfolioPdfBlob();
  }, "apiExportPortfolioPdf");
}

function apiSaveProjectPdfToDrive(projectId) {
  return safeWebResponse(function() {
    return GoogleDriveService.saveProjectPdfToDrive(sanitizeString(projectId));
  }, "apiSaveProjectPdfToDrive");
}

function apiGetPortfolioAnalytics() {
  return safeWebResponse(function() {
    return AnalyticsService.getPortfolioAnalytics();
  }, "apiGetPortfolioAnalytics");
}

function apiGetProjectAnalytics(projectId) {
  return safeWebResponse(function() {
    return AnalyticsService.getProjectAnalytics(sanitizeString(projectId));
  }, "apiGetProjectAnalytics");
}

function apiGetNotificationHistory(filters) {
  return safeWebResponse(function() {
    return NotificationHistoryService.getNotificationHistory(filters);
  }, "apiGetNotificationHistory");
}

function apiGetNotificationStats() {
  return safeWebResponse(function() {
    return NotificationHistoryService.getNotificationStats();
  }, "apiGetNotificationStats");
}

function apiGetAdvancedExecutiveReport(filters) {
  return safeWebResponse(function() {
    return AdvancedReportService.generateExecutiveReport(filters);
  }, "apiGetAdvancedExecutiveReport");
}

function apiGetAdvancedProjectReport(projectId) {
  return safeWebResponse(function() {
    return AdvancedReportService.generateProjectDetailReport(sanitizeString(projectId));
  }, "apiGetAdvancedProjectReport");
}

function apiGetProgressVarianceReport(filters) {
  return safeWebResponse(function() {
    return AdvancedReportService.generateProgressVarianceReport(filters);
  }, "apiGetProgressVarianceReport");
}

// ==========================================
// 4. NOTIFICATION & TRIGGER ENDPOINTS
// ==========================================

function apiTriggerDailyReminders() {
  return safeWebResponse(function() {
    return NotificationService.checkAndSendDailyReminders();
  }, "apiTriggerDailyReminders");
}

function apiSendTestWhatsApp(targetPhone) {
  return safeWebResponse(function() {
    enforceAdminRole_(); enforceRateLimit_("TEST_WHATSAPP", targetPhone, 3, 300);
    var cleanPhone = sanitizeString(targetPhone);
    var sent = FonnteHelper.sendTestMessage(cleanPhone);
    return {
      phone: cleanPhone,
      sent: sent
    };
  }, "apiSendTestWhatsApp");
}

function apiSendTestEmail(recipientEmail) {
  return safeWebResponse(function() {
    enforceAdminRole_(); enforceRateLimit_("TEST_EMAIL", recipientEmail, 3, 300);
    var cleanEmail = sanitizeString(recipientEmail);
    var sent = EmailHelper.sendTestEmail(cleanEmail);
    return {
      email: cleanEmail,
      sent: sent
    };
  }, "apiSendTestEmail");
}

function apiSetFonnteToken(token) {
  return safeWebResponse(function() {
    enforceAdminRole_();
    if (!token || String(token).trim().length < 8) throw ErrorFactory.validation("Token Fonnte tidak valid.");
    PropertiesService.getScriptProperties().setProperty("FONNTE_TOKEN", String(token).trim());
    AppLogger.audit("NotificationConfig", "FONNTE_TOKEN_UPDATED", "SUCCESS", {});
    return formatSuccessResponse({}, "Token Fonnte berhasil disimpan.");
  }, "apiSetFonnteToken");
}

function apiSaveNotificationGroup(payload) {
  return safeWebResponse(function() { enforceAdminRole_(); return NotificationConfigService.saveGroup(payload || {}); }, "apiSaveNotificationGroup");
}

function apiDeleteNotificationGroup(groupId) {
  return safeWebResponse(function() { enforceAdminRole_(); return NotificationConfigService.deleteGroup(sanitizeString(groupId)); }, "apiDeleteNotificationGroup");
}

function apiGetNotificationAdminItems() { return safeWebResponse(function() { enforceAdminRole_(); return NotificationConfigService.getAdminItems(); }, "apiGetNotificationAdminItems"); }
function apiSaveNotificationAdminItem(payload) { return safeWebResponse(function() { enforceAdminRole_(); return NotificationConfigService.saveAdminItem(payload || {}); }, "apiSaveNotificationAdminItem"); }
function apiDeleteNotificationAdminItem(itemId) { return safeWebResponse(function() { enforceAdminRole_(); return NotificationConfigService.deleteAdminItem(sanitizeString(itemId)); }, "apiDeleteNotificationAdminItem"); }

function apiSaveNotificationRule(payload) {
  return safeWebResponse(function() { enforceAdminRole_(); return NotificationConfigService.saveRule(payload || {}); }, "apiSaveNotificationRule");
}

function apiDeleteNotificationRule(ruleId) {
  return safeWebResponse(function() { enforceAdminRole_(); return NotificationConfigService.deleteRule(sanitizeString(ruleId)); }, "apiDeleteNotificationRule");
}

function apiInstallNotificationScheduler() {
  return safeWebResponse(function() {
    enforceAdminRole_();
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(trigger) {
      if (["scheduledDailyJob", "scheduledNotificationRetryJob"].indexOf(trigger.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(trigger);
    });
    var trigger = ScriptApp.newTrigger("scheduledDailyJob").timeBased().everyHours(1).create();
    var retryTrigger = ScriptApp.newTrigger("scheduledNotificationRetryJob").timeBased().everyHours(1).create();
    AppLogger.audit("NotificationConfig", "SCHEDULER_INSTALLED", "SUCCESS", { triggerId: trigger.getUniqueId(), retryTriggerId: retryTrigger.getUniqueId(), cadence: "HOURLY" });
    return formatSuccessResponse({ triggerId: trigger.getUniqueId(), retryTriggerId: retryTrigger.getUniqueId(), cadence: "HOURLY" }, "Scheduler sweep dan retry notifikasi berhasil dipasang setiap jam.");
  }, "apiInstallNotificationScheduler");
}

function apiSaveNotificationTemplate(payload) {
  return safeWebResponse(function() { enforceAdminRole_(); return NotificationConfigService.saveTemplate(payload || {}); }, "apiSaveNotificationTemplate");
}

function apiDeleteNotificationTemplate(templateId) {
  return safeWebResponse(function() { enforceAdminRole_(); return NotificationConfigService.deleteTemplate(sanitizeString(templateId)); }, "apiDeleteNotificationTemplate");
}

function apiRollbackNotificationTemplate(templateId, version) {
  return safeWebResponse(function() { enforceAdminRole_(); if (Array.isArray(templateId)) { version = templateId[1]; templateId = templateId[0]; } return NotificationConfigService.rollbackTemplate(sanitizeString(templateId), Number(version)); }, "apiRollbackNotificationTemplate");
}

function apiPreviewNotificationTemplate(payload) {
  return safeWebResponse(function() { enforceAdminRole_(); return NotificationConfigService.previewTemplate(payload || {}); }, "apiPreviewNotificationTemplate");
}

function apiGetNotificationConfig() {
  return safeWebResponse(function() { enforceAdminRole_(); return NotificationConfigService.getConfig(); }, "apiGetNotificationConfig");
}

function apiGetNotificationDeliveries(filters) {
  return safeWebResponse(function() { enforceRoles_([CONFIG.ROLES.ADMINISTRATOR, CONFIG.ROLES.AUDITOR]); return NotificationConfigService.getDeliveries(filters || {}); }, "apiGetNotificationDeliveries");
}

function apiRetryNotificationDelivery(deliveryId) {
  return safeWebResponse(function() { enforceAdminRole_(); enforceRateLimit_("RETRY_DELIVERY", deliveryId, 10, 300); return NotificationConfigService.retryDelivery(sanitizeString(deliveryId)); }, "apiRetryNotificationDelivery");
}

/**
 * Trigger terjadwal Google Apps Script (Time-driven trigger)
 */
function scheduledDailyJob() {
  try {
    NotificationService.checkAndSendDailyReminders();
  } catch (e) {
    AppLogger.error("Code.gs", "Kesalahan eksekusi scheduledDailyJob: " + e.message, e);
  }
}

function scheduledNotificationRetryJob() {
  try { NotificationConfigService.retryFailedDeliveries(20); }
  catch (e) { AppLogger.error("Code.gs", "Kesalahan retry delivery: " + e.message, e); }
}
