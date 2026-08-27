/**
 * Entry Point Utama Web App & Routing Google Apps Script
 * Mengikuti standar keamanan Baseline Control POL.ISMS.001
 */

/**
 * Endpoint HTTP GET untuk merender Antarmuka Web App
 */
function doGet(e) {
  try {
    initializeDatabase();
  } catch (err) {
    console.error("Gagal melakukan inisialisasi database di doGet:", err);
  }

  var template = HtmlService.createTemplateFromFile("Index");
  template.appConfig = {
    appName: CONFIG.APP.NAME,
    appVersion: CONFIG.APP.VERSION
  };

  return template
    .evaluate()
    .setTitle(CONFIG.APP.NAME + " — Security Baseline")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DENY);
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
// EXPOSED SECURE WEB API ENDPOINTS
// ==========================================

/**
 * API Otentikasi Login Pengguna
 */
function apiLogin(identifier, password, totpToken) {
  return safeWebResponse(function() {
    var cleanIdentifier = sanitizeString(identifier);
    var cleanPassword = String(password || "");
    var cleanTotp = sanitizeString(totpToken);

    return processUserLogin(cleanIdentifier, cleanPassword, cleanTotp);
  }, "apiLogin");
}

/**
 * API Penggantian Password Default (Login Pertama)
 */
function apiChangeInitialPassword(userId, oldPassword, newPassword) {
  return safeWebResponse(function() {
    var cleanUserId = sanitizeString(userId);
    var cleanOldPassword = String(oldPassword || "");
    var cleanNewPassword = String(newPassword || "");

    return processInitialPasswordChange(cleanUserId, cleanOldPassword, cleanNewPassword);
  }, "apiChangeInitialPassword");
}

/**
 * API Pengecekan Status Sesi Aktif
 */
function apiCheckSession() {
  return safeWebResponse(function() {
    return getActiveSessionStatus();
  }, "apiCheckSession");
}

/**
 * API Metadata Sistem Umum
 */
function apiGetSystemMetadata() {
  return safeWebResponse(function() {
    return {
      appName: CONFIG.APP.NAME,
      version: CONFIG.APP.VERSION,
      roles: Object.keys(CONFIG.ROLES)
    };
  }, "apiGetSystemMetadata");
}

/**
 * API Penyimpanan Token Fonnte (Khusus Role Administrator)
 */
function apiSetFonnteToken(token) {
  return safeWebResponse(function() {
    var cleanToken = sanitizeString(token);
    return setFonnteToken(cleanToken);
  }, "apiSetFonnteToken");
}

/**
 * API Penyimpanan Spreadsheet ID (Khusus Role Administrator)
 */
function apiSetSpreadsheetId(spreadsheetId) {
  return safeWebResponse(function() {
    var cleanId = sanitizeString(spreadsheetId);
    return setSpreadsheetId(cleanId);
  }, "apiSetSpreadsheetId");
}
