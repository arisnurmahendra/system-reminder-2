/**
 * Repository Layer - Abstraksi Akses Data Google Spreadsheet
 * Mengikuti prinsip Separation of Concerns & Repository Pattern
 */

var RepositoryHelper = {
  /**
   * Mendapatkan instance Spreadsheet aktif atau via ID konfigurasi
   * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
   */
  getSpreadsheet: function() {
    var id = CONFIG.SPREADSHEET.ID;
    if (id) {
      return SpreadsheetApp.openById(id);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  },

  /**
   * Mendapatkan Sheet berdasarkan nama, atau membuat baru jika belum ada
   * @param {string} sheetName
   * @param {string[]} [defaultHeaders]
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  getOrCreateSheet: function(sheetName, defaultHeaders) {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      if (defaultHeaders && Array.isArray(defaultHeaders) && defaultHeaders.length > 0) {
        sheet.appendRow(defaultHeaders);
      }
    }
    return sheet;
  },

  /**
   * Inisialisasi seluruh sheet sistem sesuai skema
   */
  initializeDatabase: function() {
    this.getOrCreateSheet(CONFIG.SPREADSHEET.SHEETS.USER_ROLES, [
      "user_id", "email", "username", "password_hash", "salt",
      "role_name", "must_change_password", "failed_login_attempts",
      "lockout_until", "is_active", "created_at", "last_login_at"
    ]);

    this.getOrCreateSheet(CONFIG.SPREADSHEET.SHEETS.AUDIT_LOGS, [
      "log_id", "timestamp", "user_id", "user_email",
      "action", "status", "page_reference", "details"
    ]);

    this.getOrCreateSheet(CONFIG.SPREADSHEET.SHEETS.SYSTEM_CONFIG, [
      "config_key", "config_value", "description", "updated_at"
    ]);
  }
};

/**
 * Repository untuk pengelolaan data User dan Akses (Sheet: User_Roles)
 */
var UserRepository = {
  getSheet: function() {
    return RepositoryHelper.getOrCreateSheet(CONFIG.SPREADSHEET.SHEETS.USER_ROLES, [
      "user_id", "email", "username", "password_hash", "salt",
      "role_name", "must_change_password", "failed_login_attempts",
      "lockout_until", "is_active", "created_at", "last_login_at"
    ]);
  },

  /**
   * Mengambil semua baris user dan memetakan menjadi object
   * Menggunakan batch getValues() untuk efisiensi
   */
  getAllUsers: function() {
    var sheet = this.getSheet();
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    var headers = data[0];
    var users = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      users.push({
        rowIndex: i + 1, // 1-based index
        userId: String(row[0] || ""),
        email: String(row[1] || ""),
        username: String(row[2] || ""),
        passwordHash: String(row[3] || ""),
        salt: String(row[4] || ""),
        roleName: String(row[5] || CONFIG.ROLES.REGULAR_USER),
        mustChangePassword: row[6] === true || row[6] === "TRUE",
        failedLoginAttempts: Number(row[7] || 0),
        lockoutUntil: row[8] ? String(row[8]) : null,
        isActive: row[9] === true || row[9] === "TRUE" || row[9] === 1,
        createdAt: row[10] ? String(row[10]) : null,
        lastLoginAt: row[11] ? String(row[11]) : null
      });
    }
    return users;
  },

  /**
   * Mencari user berdasarkan Email atau Username
   * @param {string} identifier
   * @returns {object|null}
   */
  findByIdentifier: function(identifier) {
    if (!identifier) return null;
    var cleanId = String(identifier).trim().toLowerCase();
    var users = this.getAllUsers();

    for (var i = 0; i < users.length; i++) {
      if (users[i].email.toLowerCase() === cleanId || users[i].username.toLowerCase() === cleanId) {
        return users[i];
      }
    }
    return null;
  },

  /**
   * Mencari user berdasarkan Email
   * @param {string} email
   * @returns {object|null}
   */
  findByEmail: function(email) {
    if (!email) return null;
    var cleanEmail = String(email).trim().toLowerCase();
    var users = this.getAllUsers();

    for (var i = 0; i < users.length; i++) {
      if (users[i].email.toLowerCase() === cleanEmail) {
        return users[i];
      }
    }
    return null;
  },

  /**
   * Mencari user berdasarkan User ID
   * @param {string} userId
   * @returns {object|null}
   */
  findById: function(userId) {
    if (!userId) return null;
    var users = this.getAllUsers();

    for (var i = 0; i < users.length; i++) {
      if (users[i].userId === userId) {
        return users[i];
      }
    }
    return null;
  },

  /**
   * Update jumlah percobaan gagal dan masa lockout
   * @param {number} rowIndex
   * @param {number} attempts
   * @param {string|null} lockoutUntilIso
   */
  updateFailedAttempts: function(rowIndex, attempts, lockoutUntilIso) {
    var sheet = this.getSheet();
    // Col 8: failed_login_attempts, Col 9: lockout_until
    sheet.getRange(rowIndex, 8).setValue(attempts);
    sheet.getRange(rowIndex, 9).setValue(lockoutUntilIso || "");
  },

  /**
   * Reset percobaan login gagal dan update last_login_at
   * @param {number} rowIndex
   * @param {string} lastLoginIso
   */
  resetLoginSuccess: function(rowIndex, lastLoginIso) {
    var sheet = this.getSheet();
    sheet.getRange(rowIndex, 8).setValue(0);
    sheet.getRange(rowIndex, 9).setValue("");
    sheet.getRange(rowIndex, 12).setValue(lastLoginIso);
  },

  /**
   * Update password hash, salt, dan hapus flag must_change_password
   * @param {number} rowIndex
   * @param {string} newSalt
   * @param {string} newHash
   */
  updatePassword: function(rowIndex, newSalt, newHash) {
    var sheet = this.getSheet();
    // Col 4: password_hash, Col 5: salt, Col 7: must_change_password
    sheet.getRange(rowIndex, 4).setValue(newHash);
    sheet.getRange(rowIndex, 5).setValue(newSalt);
    sheet.getRange(rowIndex, 7).setValue(false);
  },

  /**
   * Menambahkan user baru
   * @param {object} userObj
   */
  createUser: function(userObj) {
    var sheet = this.getSheet();
    var userId = "usr_" + Utilities.getUuid();
    var now = new Date().toISOString();

    sheet.appendRow([
      userId,
      userObj.email,
      userObj.username,
      userObj.passwordHash,
      userObj.salt,
      userObj.roleName || CONFIG.ROLES.REGULAR_USER,
      userObj.mustChangePassword !== false,
      0,
      "",
      userObj.isActive !== false,
      now,
      ""
    ]);

    return userId;
  }
};

/**
 * Repository untuk pencatatan Audit Log (Sheet: Audit_Logs)
 */
var AuditLogRepository = {
  getSheet: function() {
    return RepositoryHelper.getOrCreateSheet(CONFIG.SPREADSHEET.SHEETS.AUDIT_LOGS, [
      "log_id", "timestamp", "user_id", "user_email",
      "action", "status", "page_reference", "details"
    ]);
  },

  /**
   * Menulis rekaman log baru
   * @param {object} logEntry
   */
  appendLog: function(logEntry) {
    var sheet = this.getSheet();
    sheet.appendRow([
      logEntry.logId,
      logEntry.timestamp,
      logEntry.userId || "N/A",
      logEntry.userEmail || "ANONYMOUS",
      logEntry.action,
      logEntry.status,
      logEntry.pageReference || "System",
      logEntry.details ? JSON.stringify(logEntry.details) : "{}"
    ]);
  }
};
