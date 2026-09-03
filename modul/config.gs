/**
 * Konfigurasi Terpusat untuk Aplikasi System Reminder 2
 * Mengikuti standar keamanan POL.ISMS.001
 * 
 * Catatan:
 * - Tidak ada API Key, Token, atau Password yang disimpan di file ini.
 * - Nilai sensitif disimpan dan dibaca secara aman dari PropertiesService (ScriptProperties).
 */

var CONFIG = {
  APP: {
    NAME: "System Reminder 2",
    VERSION: "0.1.0-alpha",
    DEFAULT_TIMEZONE: "Asia/Jakarta"
  },

  ROLES: {
    ADMINISTRATOR: "ADMINISTRATOR",
    PROJECT_MANAGER: "PROJECT_MANAGER",
    REGULAR_USER: "REGULAR_USER",
    AUDITOR: "AUDITOR"
  },

  SPREADSHEET: {
    /**
     * Mendapatkan Spreadsheet ID secara dinamis dari Script Properties.
     * Fallback ke spreadsheet container-bound jika belum disetel di Properties.
     */
    get ID() {
      var id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
      if (!id) {
        try {
          id = SpreadsheetApp.getActiveSpreadsheet().getId();
        } catch (e) {
          // Logik fallback
        }
      }
      return id;
    },
    SHEETS: {
      USER_ROLES: "User_Roles",
      AUDIT_LOGS: "Audit_Logs",
      SYSTEM_CONFIG: "System_Config",
      PROJECTS: "Projects",
      PROGRESS_LOGS: "Progress_Logs",
      PROJECT_WBS: "Project_WBS"
    }
  },

  SECURITY: {
    MAX_FAILED_ATTEMPTS: 10,
    LOCKOUT_DURATION_MINUTES: 30,
    PASSWORD_MIN_LENGTH_USER: 8,
    PASSWORD_MIN_LENGTH_ADMIN: 14,
    SALT_LENGTH: 32,
    MFA_STRICT_MODE_KEY: "MFA_STRICT_MODE",
    SESSION_TIMEOUT_MINUTES: 60
  },

  LOGGING: {
    ENABLED: true,
    MIN_LEVEL: "DEBUG", // "DEBUG" | "INFO" | "WARN" | "ERROR"
    ENABLE_CONSOLE: true,
    ENABLE_AUDIT_SHEET: true,
    LEVELS: {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    }
  },

  ERROR_CATEGORIES: {
    VALIDATION: "VALIDATION",
    BUSINESS_RULE: "BUSINESS_RULE",
    AUTH: "AUTH",
    REPOSITORY: "REPOSITORY",
    GOOGLE_SERVICE: "GOOGLE_SERVICE",
    EXTERNAL_API: "EXTERNAL_API",
    UNEXPECTED: "UNEXPECTED"
  },

  ERROR_CODES: {
    // Validation
    VAL_INVALID_INPUT: "VAL_INVALID_INPUT",
    VAL_REQUIRED_FIELD: "VAL_REQUIRED_FIELD",
    VAL_INVALID_FORMAT: "VAL_INVALID_FORMAT",

    // Authentication & Authorization
    AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
    AUTH_FORBIDDEN: "AUTH_FORBIDDEN",
    AUTH_ACCOUNT_LOCKED: "AUTH_ACCOUNT_LOCKED",
    AUTH_PASSWORD_POLICY_VIOLATION: "AUTH_PASSWORD_POLICY_VIOLATION",
    AUTH_SESSION_EXPIRED: "AUTH_SESSION_EXPIRED",

    // Business Rules
    BIZ_DUPLICATE_RESOURCE: "BIZ_DUPLICATE_RESOURCE",
    BIZ_INVALID_DATE_RANGE: "BIZ_INVALID_DATE_RANGE",
    BIZ_OPERATION_NOT_ALLOWED: "BIZ_OPERATION_NOT_ALLOWED",

    // Database & Repository
    DB_NOT_FOUND: "DB_NOT_FOUND",
    DB_OPERATION_ERROR: "DB_OPERATION_ERROR",
    DB_CONNECTION_ERROR: "DB_CONNECTION_ERROR",

    // External & Google Services
    EXT_FONNTE_ERROR: "EXT_FONNTE_ERROR",
    EXT_GMAIL_ERROR: "EXT_GMAIL_ERROR",
    EXT_DRIVE_ERROR: "EXT_DRIVE_ERROR",

    // System
    SYS_INTERNAL_ERROR: "SYS_INTERNAL_ERROR"
  },

  FONNTE: {
    get API_TOKEN() {
      return PropertiesService.getScriptProperties().getProperty("FONNTE_TOKEN");
    },
    API_URL: "https://api.fonnte.com/send"
  },

  EMAIL: {
    SENDER_NAME: "System Reminder 2 Notification"
  }
};
