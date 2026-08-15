/**
 * Entry point utama Web App & routing Google Apps Script
 * Mengikuti standar keamanan POL.ISMS.001
 */

function doGet(e) {
  // Inisialisasi database jika belum siap saat pertama kali diakses
  try {
    initializeDatabase();
  } catch (err) {
    console.error("Gagal melakukan inisialisasi database di doGet:", err);
  }

  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("System Reminder 2")
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DENY);
}

/**
 * Memanggil fungsi-fungsi API backend secara aman
 */
function apiLogin(identifier, password, totpToken) {
  return safeWebResponse(function() {
    // Sanitasi input parameter
    var cleanIdentifier = sanitizeString(identifier);
    var cleanPassword = sanitizeString(password);
    var cleanTotpToken = sanitizeString(totpToken);
    
    return processUserLogin(cleanIdentifier, cleanPassword, cleanTotpToken);
  });
}

function apiChangeInitialPassword(userId, oldPassword, newPassword) {
  return safeWebResponse(function() {
    var cleanUserId = sanitizeString(userId);
    var cleanOldPassword = sanitizeString(oldPassword);
    var cleanNewPassword = sanitizeString(newPassword);
    
    return processInitialPasswordChange(cleanUserId, cleanOldPassword, cleanNewPassword);
  });
}

/**
 * Sanitasi string sederhana untuk mencegah XSS atau manipulasi parameter
 */
function sanitizeString(input) {
  if (typeof input !== "string") {
    return "";
  }
  return input.trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}
