/**
 * Logger Interceptor & Sensitive Data Masking (POL.ISMS.001)
 * Memastikan data sensitif tidak pernah tercatat di log sheet maupun console Apps Script.
 */

var SENSITIVE_KEYWORDS = [
  "password", "oldpassword", "newpassword", "pin", "secret",
  "token", "authorization", "totp_secret", "credit_card", "apikey"
];

/**
 * Filter Masking Data Sensitif secara rekursif
 * @param {*} obj
 * @returns {*}
 */
function sanitizeLogData_(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(function(item) {
      return sanitizeLogData_(item);
    });
  }

  if (typeof obj === "object") {
    var sanitized = {};
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        var lowerKey = key.toLowerCase();
        var isSensitive = SENSITIVE_KEYWORDS.some(function(keyword) {
          return lowerKey.indexOf(keyword) !== -1;
        });

        if (isSensitive) {
          sanitized[key] = "[REDACTED]";
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
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
 * Mencatat Audit Log ke Sheet Audit_Logs secara Terproteksi
 * @param {string|null} userId
 * @param {string|null} userEmail
 * @param {string} action
 * @param {string} status - "SUCCESS" | "FAILURE" | "WARNING"
 * @param {string} pageRef
 * @param {object} [details]
 */
function writeAuditLog(userId, userEmail, action, status, pageRef, details) {
  try {
    var sanitizedDetails = sanitizeLogData_(details || {});
    var logId = "log_" + Utilities.getUuid();
    var timestamp = new Date().toISOString();
    var email = userEmail || getCurrentUserEmail_() || "ANONYMOUS";

    AuditLogRepository.appendLog({
      logId: logId,
      timestamp: timestamp,
      userId: userId || "N/A",
      userEmail: email,
      action: action,
      status: status || "INFO",
      pageReference: pageRef || "GAS_WebApp",
      details: sanitizedDetails
    });

    Logger.log("[AUDIT] " + action + " | Status: " + status + " | User: " + email);
  } catch (err) {
    console.error("Gagal mencatat audit log:", err.message || err);
  }
}
