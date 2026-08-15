/**
 * Safe Script Properties, Access Control, & Error Handler
 * Mengikuti standar keamanan POL.ISMS.001
 */

/**
 * Mengambil rahasia sistem dari Script Properties (Bukan hardcode)
 */
function getScriptSecret_(key) {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty(key);
  if (!secret) {
    console.warn("Script Property " + key + " belum dikonfigurasi.");
  }
  return secret;
}

/**
 * Menyiapkan Token Fonnte API secara aman
 */
function setFonnteToken(token) {
  // Hanya role ADMINISTRATOR yang boleh memanggil ini
  enforceAdminRole_();
  PropertiesService.getScriptProperties().setProperty("FONNTE_TOKEN", token);
  return "Token Fonnte berhasil disimpan di Script Properties terenkripsi.";
}

/**
 * Enforcement Least Privilege Access Control
 */
function enforceAdminRole_() {
  var activeEmail = Session.getActiveUser().getEmail();
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID);
  var sheet = ss.getSheetByName(CONFIG.SPREADSHEET.SHEETS.USER_ROLES);
  if (!sheet) throw new Error("Akses Ditolak: Modul otorisasi tidak siap.");

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    // data[i][1] -> email, data[i][5] -> role_name, data[i][9] -> is_active
    if (data[i][1] === activeEmail && data[i][5] === "ADMINISTRATOR" && (data[i][9] === true || data[i][9] === "TRUE")) {
      return true; // Authorized
    }
  }

  writeAuditLog(null, activeEmail, "UNAUTHORIZED_ACCESS_ATTEMPT", "WARNING", "SecurityUtils", {});
  throw new Error("Akses Ditolak: Anda tidak memiliki hak akses ADMINISTRATOR.");
}

/**
 * Safe Error Handler Response untuk Web App HTML (OWASP API Security)
 */
function safeWebResponse(callbackFn) {
  try {
    return callbackFn();
  } catch (err) {
    console.error("[SERVER_ERROR]", err.stack || err.message);
    // Kembalikan pesan aman tanpa membocorkan stack trace internal GAS
    return {
      success: false,
      error: err.message || "Terjadi kesalahan internal pada sistem. Hubungi administrator."
    };
  }
}
