/**
 * Safe Script Properties, Input Validation, Sanitization, Access Control, & Error Handling
 * Mengikuti standar keamanan POL.ISMS.001
 */

// ==========================================
// 1. SECRET MANAGEMENT (PropertiesService)
// ==========================================

/**
 * Mengambil rahasia sistem dari Script Properties secara aman
 * @param {string} key - Nama property key
 * @returns {string|null}
 */
function getScriptSecret_(key) {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty(key);
  if (!secret) {
    AppLogger.warn("SecurityUtils", "Script Property '" + key + "' belum dikonfigurasi.");
  }
  return secret;
}

/**
 * Menyimpan konfigurasi rahasia ke Script Properties (Hanya role ADMINISTRATOR)
 * @param {string} key - Nama property key
 * @param {string} value - Nilai property
 * @returns {object}
 */
function setScriptSecret_(key, value) {
  enforceAdminRole_();
  if (!key || typeof key !== "string") {
    throw new Error("Kunci konfigurasi tidak valid.");
  }
  PropertiesService.getScriptProperties().setProperty(key, String(value || ""));
  writeAuditLog(null, Session.getActiveUser().getEmail(), "SECRET_CONFIG_UPDATED", "SUCCESS", "SecurityUtils", { key: key });
  return formatSuccessResponse({ key: key }, "Konfigurasi berhasil disimpan di Script Properties.");
}

/**
 * Menyimpan Token Fonnte API secara aman
 * @param {string} token
 * @returns {object}
 */
function setFonnteToken(token) {
  return setScriptSecret_("FONNTE_TOKEN", token);
}

/**
 * Menyimpan Spreadsheet ID secara terpusat
 * @param {string} spreadsheetId
 * @returns {object}
 */
function setSpreadsheetId(spreadsheetId) {
  return setScriptSecret_("SPREADSHEET_ID", spreadsheetId);
}

// ==========================================
// 2. INPUT VALIDATION & SANITIZATION
// ==========================================

/**
 * Sanitasi string untuk mencegah serangan XSS dan injeksi karakter HTML
 * @param {*} input
 * @returns {string}
 */
function sanitizeString(input) {
  if (input === null || input === undefined) return "";
  if (typeof input !== "string") input = String(input);
  return input.trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitasi mendalam untuk tipe data primitif, array, maupun objek
 * @param {*} data
 * @returns {*}
 */
function sanitizeInput(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === "string") return sanitizeString(data);
  if (typeof data === "number" || typeof data === "boolean") return data;
  if (Array.isArray(data)) {
    return data.map(function(item) { return sanitizeInput(item); });
  }
  if (typeof data === "object") {
    var cleanObj = {};
    for (var key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        var cleanKey = sanitizeString(key);
        cleanObj[cleanKey] = sanitizeInput(data[key]);
      }
    }
    return cleanObj;
  }
  return data;
}

/**
 * Validasi format email
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  var emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Validasi format username (alphanumeric, underscore, dash, min 3 max 30)
 * @param {string} username
 * @returns {boolean}
 */
function isValidUsername(username) {
  if (!username || typeof username !== "string") return false;
  var usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username.trim());
}

/**
 * Validasi parameter wajib (Non-empty check)
 * @param {*} value
 * @param {string} fieldName
 */
function validateRequired(value, fieldName) {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    throw new Error("Parameter '" + (fieldName || "input") + "' wajib diisi.");
  }
}

// ==========================================
// 3. AUTHORIZATION & RBAC ENFORCEMENT
// ==========================================

/**
 * Mendapatkan email pengguna aktif saat ini dari Google Session
 * @returns {string}
 */
function getCurrentUserEmail_() {
  try {
    return Session.getActiveUser().getEmail() || "";
  } catch (e) {
    return "";
  }
}

/**
 * Mengambil profil hak akses user yang sedang login
 * @param {string} [email]
 * @returns {object|null}
 */
function getCurrentUserProfile_(email) {
  var targetEmail = email || getCurrentUserEmail_();
  if (!targetEmail) return null;
  return UserRepository.findByEmail(targetEmail);
}

/**
 * Memastikan user yang memanggil memiliki peran ADMINISTRATOR
 */
function enforceAdminRole_() {
  return enforceRoles_([CONFIG.ROLES.ADMINISTRATOR]);
}

/**
 * Memastikan user memiliki salah satu peran yang diizinkan (Least Privilege)
 * @param {string[]} allowedRoles
 */
function enforceRoles_(allowedRoles) {
  var activeEmail = getCurrentUserEmail_();
  if (!activeEmail) {
    writeAuditLog(null, "ANONYMOUS", "ACCESS_DENIED", "FAILURE", "SecurityUtils", { reason: "No active session email" });
    throw new Error("Akses Ditolak: Sesi pengguna Google Workspace tidak terdeteksi.");
  }

  var user = UserRepository.findByEmail(activeEmail);
  if (!user || !user.isActive) {
    writeAuditLog(user ? user.userId : null, activeEmail, "ACCESS_DENIED", "FAILURE", "SecurityUtils", { reason: "User not active or not registered" });
    throw new Error("Akses Ditolak: Akun Anda tidak aktif atau belum terdaftar.");
  }

  if (allowedRoles.indexOf(user.roleName) === -1) {
    writeAuditLog(user.userId, activeEmail, "ACCESS_DENIED_ROLE", "WARNING", "SecurityUtils", { 
      userRole: user.roleName, 
      requiredRoles: allowedRoles 
    });
    throw new Error("Akses Ditolak: Anda tidak memiliki wewenang untuk menjalankan aksi ini.");
  }

  return user;
}

// ==========================================
// 4. STANDARDIZED RESPONSE & ERROR HANDLING
// ==========================================

/**
 * Format standar response sukses
 * @param {*} data
 * @param {string} [message]
 * @returns {object}
 */
function formatSuccessResponse(data, message) {
  return {
    success: true,
    data: data || null,
    message: message || "Operasi berhasil."
  };
}

/**
 * Format standar response error
 * @param {string|Error} error
 * @param {string} [code]
 * @returns {object}
 */
function formatErrorResponse(error, code) {
  var message = (error instanceof Error) ? error.message : String(error || "Terjadi kesalahan sistem.");
  return {
    success: false,
    error: {
      code: code || CONFIG.ERROR_CODES.INTERNAL_ERROR,
      message: message
    }
  };
}

/**
 * Wrapper eksekusi aman untuk seluruh API Backend Web App (OWASP API Security)
 * Menangkap exception, mencatat log, dan mengembalikan response terstandarisasi.
 * @param {Function} callbackFn
 * @param {string} [contextName]
 * @returns {object}
 */
function safeWebResponse(callbackFn, contextName) {
  try {
    var result = callbackFn();
    // Jika result sudah berformat standar, kembalikan langsung
    if (result && typeof result === "object" && typeof result.success === "boolean") {
      return result;
    }
    return formatSuccessResponse(result);
  } catch (err) {
    var context = contextName || "API_HANDLER";
    if (typeof ErrorHandler !== "undefined" && ErrorHandler.handle) {
      return ErrorHandler.handle(err, context);
    }
    AppLogger.error(context, err.message || "Terjadi kesalahan internal pada sistem.", err);
    return formatErrorResponse(err.message || "Terjadi kesalahan internal.", CONFIG.ERROR_CODES.SYS_INTERNAL_ERROR);
  }
}
