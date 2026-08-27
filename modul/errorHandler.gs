/**
 * Error Handling Framework - Standarisasi Penanganan, Pemetaan, dan Respon Error
 * Mengikuti prinsip Separation of Concerns & Clean Architecture
 */

/**
 * Custom Error Class untuk System Reminder 2
 * @param {string} message - Pesan error untuk pengguna
 * @param {string} [code] - Kode error terstruktur (misal: VAL_INVALID_INPUT)
 * @param {string} [category] - Kategori error (VALIDATION, BUSINESS_RULE, AUTH, dll)
 * @param {*} [details] - Informasi konteks tambahan
 */
function AppError(message, code, category, details) {
  this.name = "AppError";
  this.message = message || "Terjadi kesalahan pada sistem.";
  this.code = code || CONFIG.ERROR_CODES.SYS_INTERNAL_ERROR;
  this.category = category || CONFIG.ERROR_CATEGORIES.UNEXPECTED;
  this.details = details !== undefined ? details : null;
  this.timestamp = new Date().toISOString();

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, AppError);
  } else {
    this.stack = (new Error(message)).stack;
  }
}
AppError.prototype = Object.create(Error.prototype);
AppError.prototype.constructor = AppError;

// ==========================================
// 1. ERROR FACTORY METHODS
// ==========================================

var ErrorFactory = {
  /**
   * Membuat Validation Error
   */
  validation: function(message, details) {
    return new AppError(
      message || "Data input tidak valid.",
      CONFIG.ERROR_CODES.VAL_INVALID_INPUT,
      CONFIG.ERROR_CATEGORIES.VALIDATION,
      details
    );
  },

  /**
   * Membuat Business Rule Violation Error
   */
  businessRule: function(message, code, details) {
    return new AppError(
      message || "Aturan bisnis dilanggar.",
      code || CONFIG.ERROR_CODES.BIZ_OPERATION_NOT_ALLOWED,
      CONFIG.ERROR_CATEGORIES.BUSINESS_RULE,
      details
    );
  },

  /**
   * Membuat Authentication / Authorization Error
   */
  auth: function(message, isForbidden, details) {
    var code = isForbidden ? CONFIG.ERROR_CODES.AUTH_FORBIDDEN : CONFIG.ERROR_CODES.AUTH_UNAUTHORIZED;
    return new AppError(
      message || (isForbidden ? "Akses Ditolak: Wewenang tidak mencukupi." : "Otentikasi gagal atau sesi tidak valid."),
      code,
      CONFIG.ERROR_CATEGORIES.AUTH,
      details
    );
  },

  /**
   * Membuat Resource Not Found Error
   */
  notFound: function(resourceName, identifier) {
    return new AppError(
      "Data " + (resourceName || "sumber daya") + (identifier ? " dengan ID '" + identifier + "'" : "") + " tidak ditemukan.",
      CONFIG.ERROR_CODES.DB_NOT_FOUND,
      CONFIG.ERROR_CATEGORIES.REPOSITORY,
      { resource: resourceName, id: identifier }
    );
  },

  /**
   * Membuat Repository / Database Error
   */
  repository: function(message, details) {
    return new AppError(
      message || "Terjadi kesalahan saat memproses data di spreadsheet.",
      CONFIG.ERROR_CODES.DB_OPERATION_ERROR,
      CONFIG.ERROR_CATEGORIES.REPOSITORY,
      details
    );
  },

  /**
   * Membuat External Service API Error
   */
  externalApi: function(serviceName, message, details) {
    var code = serviceName === "FONNTE" ? CONFIG.ERROR_CODES.EXT_FONNTE_ERROR : CONFIG.ERROR_CODES.EXT_GMAIL_ERROR;
    return new AppError(
      "Layanan eksternal " + serviceName + " gagal merespon: " + (message || ""),
      code,
      CONFIG.ERROR_CATEGORIES.EXTERNAL_API,
      details
    );
  }
};

// ==========================================
// 2. CENTRAL ERROR HANDLER & MAPPER
// ==========================================

var ErrorHandler = {
  /**
   * Memetakan error sembarang (string, Error biasa, AppError) ke format terstruktur
   * @param {Error|AppError|string|*} error
   * @returns {AppError}
   */
  normalize: function(error) {
    if (error instanceof AppError) {
      return error;
    }

    var message = (error instanceof Error) ? error.message : String(error || "Terjadi kesalahan internal.");
    var code = CONFIG.ERROR_CODES.SYS_INTERNAL_ERROR;
    var category = CONFIG.ERROR_CATEGORIES.UNEXPECTED;

    // Pattern Matching untuk Exception Umum
    if (message.indexOf("Akses Ditolak") !== -1 || message.indexOf("tidak memiliki hak akses") !== -1) {
      code = CONFIG.ERROR_CODES.AUTH_FORBIDDEN;
      category = CONFIG.ERROR_CATEGORIES.AUTH;
    } else if (message.indexOf("Kredensial") !== -1 || message.indexOf("terkunci") !== -1 || message.indexOf("Sesi pengguna") !== -1) {
      code = CONFIG.ERROR_CODES.AUTH_UNAUTHORIZED;
      category = CONFIG.ERROR_CATEGORIES.AUTH;
    } else if (message.indexOf("wajib diisi") !== -1 || message.indexOf("Format") !== -1 || message.indexOf("tidak valid") !== -1 || message.indexOf("Password minimum") !== -1) {
      code = CONFIG.ERROR_CODES.VAL_INVALID_INPUT;
      category = CONFIG.ERROR_CATEGORIES.VALIDATION;
    } else if (message.indexOf("sudah terdaftar") !== -1 || message.indexOf("tidak boleh lebih besar") !== -1) {
      code = CONFIG.ERROR_CODES.BIZ_OPERATION_NOT_ALLOWED;
      category = CONFIG.ERROR_CATEGORIES.BUSINESS_RULE;
    } else if (message.indexOf("tidak ditemukan") !== -1) {
      code = CONFIG.ERROR_CODES.DB_NOT_FOUND;
      category = CONFIG.ERROR_CATEGORIES.REPOSITORY;
    } else if (message.indexOf("spreadsheet") !== -1 || message.indexOf("Sheet") !== -1) {
      code = CONFIG.ERROR_CODES.DB_OPERATION_ERROR;
      category = CONFIG.ERROR_CATEGORIES.REPOSITORY;
    }

    var appErr = new AppError(message, code, category);
    if (error instanceof Error && error.stack) {
      appErr.stack = error.stack;
    }
    return appErr;
  },

  /**
   * Menangani error, mencatat ke AppLogger, dan mengembalikan response terstandarisasi untuk client
   * @param {Error|AppError|string} error
   * @param {string} [contextName]
   * @returns {object} Standard Client Error Response
   */
  handle: function(error, contextName) {
    var appErr = this.normalize(error);
    var context = contextName || "AppErrorHandler";

    // Catat log teknis mendalam via AppLogger
    AppLogger.error(context, appErr.message, {
      code: appErr.code,
      category: appErr.category,
      details: appErr.details,
      stack: appErr.stack
    });

    // Format response aman untuk antarmuka pengguna (tanpa bocor stack trace)
    return {
      success: false,
      error: {
        code: appErr.code,
        category: appErr.category,
        message: appErr.message,
        timestamp: appErr.timestamp
      }
    };
  }
};
