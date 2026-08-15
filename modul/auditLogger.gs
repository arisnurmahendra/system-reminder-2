/**
 * Logger Interceptor & Sensitive Data Masking
 * Mengikuti standar keamanan POL.ISMS.001
 */

var SENSITIVE_KEYWORDS = [
  "password", "oldpassword", "newpassword", "pin", "secret",
  "token", "authorization", "totp_secret", "credit_card"
];

/**
 * Filter Masking Data Sensitif agar TIDAK Pernah Tercatat di Log
 */
function sanitizeLogData_(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeLogData_);
  }

  if (typeof obj === "object") {
    var sanitized = {};
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var lowerKey = key.toLowerCase();
        var isSensitive = SENSITIVE_KEYWORDS.some(function(keyword) {
          return lowerKey.indexOf(keyword) !== -1;
        });

        if (isSensitive) {
          sanitized[key] = "[REDACTED]";
        } else if (typeof obj[key] === "object") {
          sanitized[key] = sanitizeLogData_(obj[key]);
        } else {
          sanitized[key] = obj[key];
        }
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Mencatat Audit Log ke Sheet Audit_Logs secara Aman
 */
function writeAuditLog(userId, userEmail, action, status, pageRef, details) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID);
    var sheet = ss.getSheetByName(CONFIG.SPREADSHEET.SHEETS.AUDIT_LOGS);
    
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SPREADSHEET.SHEETS.AUDIT_LOGS);
      sheet.appendRow(["log_id", "timestamp", "user_id", "user_email", "action", "status", "page_reference", "details"]);
    }

    var sanitizedDetails = sanitizeLogData_(details || {});
    var logId = "log_" + Utilities.getUuid();
    var timestamp = new Date().toISOString();
    var email = userEmail || Session.getActiveUser().getEmail() || "ANONYMOUS";

    sheet.appendRow([
      logId,
      timestamp,
      userId || "N/A",
      email,
      action,
      status,
      pageRef || "GAS_WebApp",
      JSON.stringify(sanitizedDetails)
    ]);

    // Opsional log ke Logger internal Apps Script
    Logger.log("[AUDIT] " + action + " | Status: " + status + " | User: " + email);
  } catch (err) {
    console.error("Gagal mencatat audit log:", err);
  }
}
