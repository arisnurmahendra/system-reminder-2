/**
 * Konfigurasi Terpusat untuk Aplikasi System Reminder 2
 * Mengikuti standar keamanan POL.ISMS.001 (tidak menaruh token/ID sensitif di kode sumber).
 */
var CONFIG = {
  SPREADSHEET: {
    /**
     * Mendapatkan Spreadsheet ID secara dinamis dari Script Properties.
     * Jika tidak disetel, akan fallback ke spreadsheet aktif (container-bound).
     */
    get ID() {
      var id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
      if (!id) {
        try {
          id = SpreadsheetApp.getActiveSpreadsheet().getId();
        } catch (e) {
          // Ketika dijalankan di luar konteks container-bound (misal: API call)
          console.warn("SPREADSHEET_ID belum dikonfigurasi di Script Properties.");
        }
      }
      return id;
    },
    SHEETS: {
      USER_ROLES: "User_Roles",
      AUDIT_LOGS: "Audit_Logs",
      SYSTEM_CONFIG: "System_Config"
    }
  },
  SECURITY: {
    MAX_FAILED_ATTEMPTS: 10,
    LOCKOUT_DURATION_MINUTES: 30,
    MFA_STRICT_MODE_KEY: "MFA_STRICT_MODE"
  },
  FONNTE: {
    /**
     * Mendapatkan Token API Fonnte dari Script Properties secara aman
     */
    get API_TOKEN() {
      return PropertiesService.getScriptProperties().getProperty("FONNTE_TOKEN");
    },
    API_URL: "https://api.fonnte.com/send"
  }
};
