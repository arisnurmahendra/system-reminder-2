/**
 * Logging Framework & Audit Logger Interceptor (POL.ISMS.001)
 * Menyediakan logging terpusat berlevel (DEBUG, INFO, WARN, ERROR, AUDIT) dengan auto-masking data sensitif.
 */

var SENSITIVE_KEYWORDS = [
  "password", "oldpassword", "newpassword", "pin", "secret",
  "token", "authorization", "totp_secret", "credit_card", "apikey"
];

/**
 * Filter Masking Data Sensitif secara rekursif agar TIDAK Pernah Tercatat di Log
 * @param {*} obj
 * @returns {*}
 */
function sanitizeLogData_(obj) {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack
    };
  }

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
 * Core Application Logger Framework
 */
var AppLogger = {
  /**
   * Mengecek apakah log pada level tertentu diizinkan oleh konfigurasi
   * @param {"DEBUG"|"INFO"|"WARN"|"ERROR"} level
   * @returns {boolean}
   */
  shouldLog: function(level) {
    if (!CONFIG.LOGGING || CONFIG.LOGGING.ENABLED === false) {
      return false;
    }
    var minLevel = CONFIG.LOGGING.MIN_LEVEL || "DEBUG";
    var minLevelVal = CONFIG.LOGGING.LEVELS[minLevel] !== undefined ? CONFIG.LOGGING.LEVELS[minLevel] : 0;
    var currentLevelVal = CONFIG.LOGGING.LEVELS[level] !== undefined ? CONFIG.LOGGING.LEVELS[level] : 0;

    return currentLevelVal >= minLevelVal;
  },

  /**
   * Memformat entri log terstruktur
   * @private
   */
  formatEntry_: function(level, moduleName, message, data, userEmail) {
    var timestamp = new Date().toISOString();
    var email = userEmail || (typeof getCurrentUserEmail_ === "function" ? getCurrentUserEmail_() : "") || "SYSTEM";
    var sanitizedData = sanitizeLogData_(data !== undefined ? data : null);

    return {
      timestamp: timestamp,
      level: level,
      module: moduleName || "App",
      user: email,
      message: message || "",
      data: sanitizedData
    };
  },

  /**
   * Mengirim output log ke Console / Apps Script Execution Logs
   * @private
   */
  outputConsole_: function(entry) {
    if (!CONFIG.LOGGING || CONFIG.LOGGING.ENABLE_CONSOLE === false) {
      return;
    }

    var logLine = "[" + entry.timestamp + "] [" + entry.level + "] [" + entry.module + "] [" + entry.user + "] " + entry.message;
    var dataJson = entry.data ? " | Data: " + JSON.stringify(entry.data) : "";
    var fullLog = logLine + dataJson;

    switch (entry.level) {
      case "ERROR":
        console.error(fullLog);
        break;
      case "WARN":
        console.warn(fullLog);
        break;
      case "INFO":
        console.info(fullLog);
        break;
      case "DEBUG":
      default:
        console.log(fullLog);
        break;
    }
  },

  /**
   * Pencatatan log level DEBUG
   * @param {string} moduleName
   * @param {string} message
   * @param {*} [data]
   */
  debug: function(moduleName, message, data) {
    if (!this.shouldLog("DEBUG")) return;
    var entry = this.formatEntry_("DEBUG", moduleName, message, data);
    this.outputConsole_(entry);
  },

  /**
   * Pencatatan log level INFO
   * @param {string} moduleName
   * @param {string} message
   * @param {*} [data]
   */
  info: function(moduleName, message, data) {
    if (!this.shouldLog("INFO")) return;
    var entry = this.formatEntry_("INFO", moduleName, message, data);
    this.outputConsole_(entry);
  },

  /**
   * Pencatatan log level WARN
   * @param {string} moduleName
   * @param {string} message
   * @param {*} [data]
   */
  warn: function(moduleName, message, data) {
    if (!this.shouldLog("WARN")) return;
    var entry = this.formatEntry_("WARN", moduleName, message, data);
    this.outputConsole_(entry);
  },

  /**
   * Pencatatan log level ERROR
   * @param {string} moduleName
   * @param {string} message
   * @param {Error|*} [errorOrData]
   */
  error: function(moduleName, message, errorOrData) {
    if (!this.shouldLog("ERROR")) return;

    var logData = null;
    if (errorOrData instanceof Error) {
      logData = {
        name: errorOrData.name,
        message: errorOrData.message,
        stack: errorOrData.stack
      };
    } else if (errorOrData !== undefined) {
      logData = errorOrData;
    }

    var entry = this.formatEntry_("ERROR", moduleName, message, logData);
    this.outputConsole_(entry);
  },

  /**
   * Pencatatan Audit Trail ke Google Sheet (Audit_Logs)
   * @param {string} moduleName
   * @param {string} action
   * @param {"SUCCESS"|"FAILURE"|"WARNING"|"INFO"} status
   * @param {object} [details]
   * @param {string} [userId]
   * @param {string} [userEmail]
   */
  audit: function(moduleName, action, status, details, userId, userEmail) {
    try {
      var email = userEmail || (typeof getCurrentUserEmail_ === "function" ? getCurrentUserEmail_() : "") || "ANONYMOUS";
      var entry = this.formatEntry_(status === "FAILURE" ? "ERROR" : "INFO", moduleName, "[AUDIT] " + action + " (" + status + ")", details, email);

      this.outputConsole_(entry);

      if (CONFIG.LOGGING && CONFIG.LOGGING.ENABLE_AUDIT_SHEET !== false && typeof AuditLogRepository !== "undefined") {
        AuditLogRepository.appendLog({
          logId: "log_" + Utilities.getUuid(),
          timestamp: entry.timestamp,
          userId: userId || "N/A",
          userEmail: email,
          action: action,
          status: status || "INFO",
          pageReference: moduleName || "System",
          details: entry.data
        });
      }
    } catch (err) {
      console.error("[AppLogger_AUDIT_ERROR] Gagal menyimpan audit log:", err.message);
    }
  }
};

/**
 * Backward compatibility helper untuk writeAuditLog
 */
function writeAuditLog(userId, userEmail, action, status, pageRef, details) {
  AppLogger.audit(pageRef || "System", action, status, details, userId, userEmail);
}
