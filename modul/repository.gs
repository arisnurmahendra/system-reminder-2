/**
 * Repository Layer - Lapisan Abstraksi Akses Data Google Spreadsheet
 * Mengikuti prinsip Separation of Concerns, Single Responsibility, & Repository Pattern
 * 
 * Aturan Arsitektur:
 * - Tidak ada Service / UI yang diperbolehkan memanggil SpreadsheetApp secara langsung.
 * - Seluruh interaksi database wajib melalui Repository Layer.
 * - Operasi tulis/baca dilakukan secara efisien (Batch Processing).
 */

// ============================================================================
// 1. SPREADSHEET MANAGER & IN-MEMORY CACHE
// ============================================================================

var SpreadsheetManager = {
  _spreadsheetCache: null,
  _sheetCache: {},

  /**
   * Mendapatkan instance Spreadsheet dengan in-memory caching
   * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
   */
  getSpreadsheet: function() {
    if (this._spreadsheetCache) {
      return this._spreadsheetCache;
    }

    try {
      var id = CONFIG.SPREADSHEET.ID;
      if (id) {
        this._spreadsheetCache = SpreadsheetApp.openById(id);
      } else {
        this._spreadsheetCache = SpreadsheetApp.getActiveSpreadsheet();
      }

      if (!this._spreadsheetCache) {
        throw new Error("Spreadsheet tidak dapat dibuka atau belum dikonfigurasi.");
      }

      return this._spreadsheetCache;
    } catch (err) {
      AppLogger.error("SpreadsheetManager", "Gagal membuka Spreadsheet: " + err.message, err);
      throw new Error("Gagal mengakses database spreadsheet: " + err.message);
    }
  },

  /**
   * Mendapatkan instance Sheet dengan in-memory cache dan inisialisasi skema header
   * @param {string} sheetName
   * @param {string[]} [defaultHeaders]
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  getSheet: function(sheetName, defaultHeaders) {
    if (this._sheetCache[sheetName]) {
      return this._sheetCache[sheetName];
    }

    try {
      var ss = this.getSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);

      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        if (defaultHeaders && Array.isArray(defaultHeaders) && defaultHeaders.length > 0) {
          sheet.appendRow(defaultHeaders);
        }
      } else if (defaultHeaders && Array.isArray(defaultHeaders) && defaultHeaders.length > 0) {
        // Validasi header jika sheet masih kosong
        if (sheet.getLastRow() === 0) {
          sheet.appendRow(defaultHeaders);
        }
      }

      this._sheetCache[sheetName] = sheet;
      return sheet;
    } catch (err) {
      AppLogger.error("SpreadsheetManager", "Gagal mengakses sheet '" + sheetName + "': " + err.message, err);
      throw new Error("Gagal mengakses sheet '" + sheetName + "': " + err.message);
    }
  },

  /**
   * Membersihkan in-memory cache
   */
  clearCache: function() {
    this._spreadsheetCache = null;
    this._sheetCache = {};
    if (typeof UserRepository !== "undefined" && UserRepository.invalidateCache) UserRepository.invalidateCache();
    if (typeof AuditLogRepository !== "undefined" && AuditLogRepository.invalidateCache) AuditLogRepository.invalidateCache();
    if (typeof ConfigRepository !== "undefined" && ConfigRepository.invalidateCache) ConfigRepository.invalidateCache();
    if (typeof ProjectRepository !== "undefined" && ProjectRepository.invalidateCache) ProjectRepository.invalidateCache();
    if (typeof ProgressLogRepository !== "undefined" && ProgressLogRepository.invalidateCache) ProgressLogRepository.invalidateCache();
  },

  /**
   * Skema terpusat seluruh lembar kerja sistem
   * @returns {object}
   */
  getRequiredSheetsSchema: function() {
    var schema = {};
    schema[CONFIG.SPREADSHEET.SHEETS.USER_ROLES] = [
      "user_id", "email", "username", "password_hash", "salt",
      "role_name", "must_change_password", "failed_login_attempts",
      "lockout_until", "is_active", "created_at", "last_login_at"
    ];
    schema[CONFIG.SPREADSHEET.SHEETS.AUDIT_LOGS] = [
      "log_id", "timestamp", "user_id", "user_email",
      "action", "status", "page_reference", "details"
    ];
    schema[CONFIG.SPREADSHEET.SHEETS.SYSTEM_CONFIG] = [
      "config_key", "config_value", "description", "updated_at"
    ];
    schema[CONFIG.SPREADSHEET.SHEETS.PROJECTS] = [
      "project_id", "project_name", "start_date", "end_date",
      "pic_name", "pic_email", "pic_phone", "is_email_active",
      "is_wa_active", "status", "created_at", "updated_at"
    ];
    schema[CONFIG.SPREADSHEET.SHEETS.PROGRESS_LOGS] = [
      "progress_id", "project_id", "date", "planned_progress",
      "actual_progress", "deviation", "notes", "recorded_by", "created_at"
    ];
    return schema;
  },

  /**
   * Memeriksa struktur spreadsheet secara menyeluruh:
   * 1. Jika sheet belum ada -> buat sheet baru dengan header yang sesuai
   * 2. Jika sheet ada tapi kosong -> tambahkan baris header
   * 3. Jika tabel user masih kosong -> buat akun default username 'admin' & password 'admin123'
   * @returns {object} Status inisialisasi & rincian aksi
   */
  verifyAndSetupDatabase: function() {
    var report = {
      verifiedAt: new Date().toISOString(),
      createdSheets: [],
      headerAddedSheets: [],
      existingSheets: [],
      defaultAdminCreated: false
    };

    var ss = this.getSpreadsheet();
    var schema = this.getRequiredSheetsSchema();

    for (var sheetName in schema) {
      if (Object.prototype.hasOwnProperty.call(schema, sheetName)) {
        var defaultHeaders = schema[sheetName];
        var sheet = ss.getSheetByName(sheetName);

        if (!sheet) {
          sheet = ss.insertSheet(sheetName);
          sheet.appendRow(defaultHeaders);
          report.createdSheets.push(sheetName);
        } else {
          if (sheet.getLastRow() === 0) {
            sheet.appendRow(defaultHeaders);
            report.headerAddedSheets.push(sheetName);
          } else {
            report.existingSheets.push(sheetName);
          }
        }

        this._sheetCache[sheetName] = sheet;
      }
    }

    // Periksa tabel User_Roles untuk akun default admin
    var adminCreated = this.seedDefaultAdminIfEmpty();
    report.defaultAdminCreated = adminCreated;

    this.clearCache();
    return formatSuccessResponse(report, "Struktur spreadsheet berhasil diverifikasi dan disiapkan.");
  },

  /**
   * Membuat user default admin jika tabel user belum memiliki data
   * @returns {boolean} True jika akun default dibuat
   */
  seedDefaultAdminIfEmpty: function() {
    try {
      var users = UserRepository.getAllUsers();
      if (!users || users.length === 0) {
        var defaultUsername = "admin";
        var defaultEmail = "admin@system.local";
        var defaultPassword = "admin123";
        var salt = generateSalt();
        var hash = hashPasswordWithSalt(defaultPassword, salt);

        UserRepository.createUser({
          username: defaultUsername,
          email: defaultEmail,
          passwordHash: hash,
          salt: salt,
          roleName: CONFIG.ROLES.ADMINISTRATOR,
          mustChangePassword: true,
          isActive: true
        });

        AppLogger.info("SpreadsheetManager", "Akun default admin berhasil dibuat ('admin' / 'admin123')", {
          username: defaultUsername,
          email: defaultEmail,
          role: CONFIG.ROLES.ADMINISTRATOR
        });

        return true;
      }
      return false;
    } catch (err) {
      AppLogger.warn("SpreadsheetManager", "Gagal memeriksa/menambahkan default admin: " + err.message);
      return false;
    }
  },

  /**
   * Inisialisasi seluruh lembar kerja sistem secara terpusat
   */
  initializeAllSheets: function() {
    return this.verifyAndSetupDatabase();
  }
};

// ============================================================================
// 2. BASE REPOSITORY
// ============================================================================

/**
 * Membuat instance BaseRepository generik untuk satu lembar kerja (Sheet)
 * @param {string} sheetName - Nama sheet
 * @param {string[]} schemaHeaders - Daftar nama kolom / header skema
 * @param {string} primaryKey - Nama kolom primary key
 */
function createBaseRepository(sheetName, schemaHeaders, primaryKey) {
  return {
    sheetName: sheetName,
    headers: schemaHeaders,
    primaryKey: primaryKey || schemaHeaders[0],
    _dataCache: null,

    /**
     * Menghapus cache entitas in-memory
     */
    invalidateCache: function() {
      this._dataCache = null;
    },

    /**
     * Memastikan sheet siap dan terinisialisasi
     */
    init: function() {
      return SpreadsheetManager.getSheet(this.sheetName, this.headers);
    },

    /**
     * Mendapatkan instance Sheet aktif
     */
    getSheet: function() {
      return SpreadsheetManager.getSheet(this.sheetName, this.headers);
    },

    /**
     * Membaca seluruh data dan memetakan baris menjadi array of object (Batch Read with In-Memory Caching)
     * @param {Function} [predicate] - Fungsi filter opsional (item => boolean)
     * @returns {object[]}
     */
    findAll: function(predicate) {
      try {
        if (!this._dataCache) {
          var sheet = this.getSheet();
          var lastRow = sheet.getLastRow();
          var lastCol = sheet.getLastColumn();

          if (lastRow <= 1 || lastCol === 0) {
            this._dataCache = [];
          } else {
            var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
            var headerRow = values[0];
            var rawResults = [];

            for (var i = 1; i < values.length; i++) {
              var row = values[i];
              var isEmpty = row.every(function(cell) {
                return cell === "" || cell === null || cell === undefined;
              });
              if (isEmpty) continue;

              var item = { _rowIndex: i + 1 };
              for (var j = 0; j < headerRow.length; j++) {
                var key = String(headerRow[j]).trim();
                item[key] = row[j];
              }
              rawResults.push(item);
            }
            this._dataCache = rawResults;
          }
        }

        var results = this._dataCache;
        if (predicate) {
          results = results.filter(predicate);
        }

        return results;
      } catch (err) {
        AppLogger.error("BaseRepo_" + this.sheetName, "Gagal mengambil data: " + err.message, err);
        throw new Error("Gagal mengambil data dari " + this.sheetName + ": " + err.message);
      }
    },

    /**
     * Mencari satu entitas berdasarkan Primary Key ID
     * @param {*} id
     * @returns {object|null}
     */
    findById: function(id) {
      if (id === null || id === undefined || id === "") return null;
      var pk = this.primaryKey;
      var matches = this.findAll(function(item) {
        return String(item[pk]) === String(id);
      });
      return matches.length > 0 ? matches[0] : null;
    },

    /**
     * Mencari satu entitas berdasarkan field tertentu
     * @param {string} fieldName
     * @param {*} value
     * @returns {object|null}
     */
    findOneByField: function(fieldName, value) {
      if (value === null || value === undefined) return null;
      var targetVal = String(value).trim().toLowerCase();
      var matches = this.findAll(function(item) {
        var itemVal = item[fieldName];
        return itemVal !== undefined && String(itemVal).trim().toLowerCase() === targetVal;
      });
      return matches.length > 0 ? matches[0] : null;
    },

    /**
     * Mencari semua entitas berdasarkan field tertentu
     * @param {string} fieldName
     * @param {*} value
     * @returns {object[]}
     */
    findByField: function(fieldName, value) {
      if (value === null || value === undefined) return [];
      var targetVal = String(value).trim().toLowerCase();
      return this.findAll(function(item) {
        var itemVal = item[fieldName];
        return itemVal !== undefined && String(itemVal).trim().toLowerCase() === targetVal;
      });
    },

    /**
     * Menambahkan satu data baru (Insert)
     * @param {object} entity
     * @returns {object}
     */
    insert: function(entity) {
      try {
        var sheet = this.getSheet();
        var rowData = [];

        for (var i = 0; i < this.headers.length; i++) {
          var header = this.headers[i];
          var val = entity[header];
          rowData.push(val !== undefined ? val : "");
        }

        sheet.appendRow(rowData);
        this.invalidateCache();
        return entity;
      } catch (err) {
        AppLogger.error("BaseRepo_" + this.sheetName, "Gagal menyimpan data: " + err.message, err);
        throw new Error("Gagal menyimpan data ke " + this.sheetName + ": " + err.message);
      }
    },

    /**
     * Menambahkan sekumpulan data secara batch (Batch Insert)
     * @param {object[]} entities
     * @returns {number} Jumlah baris yang berhasil ditambahkan
     */
    insertBatch: function(entities) {
      if (!entities || !Array.isArray(entities) || entities.length === 0) {
        return 0;
      }

      try {
        var sheet = this.getSheet();
        var rowsData = [];

        for (var e = 0; e < entities.length; e++) {
          var entity = entities[e];
          var rowData = [];
          for (var i = 0; i < this.headers.length; i++) {
            var header = this.headers[i];
            var val = entity[header];
            rowData.push(val !== undefined ? val : "");
          }
          rowsData.push(rowData);
        }

        var startRow = sheet.getLastRow() + 1;
        var numRows = rowsData.length;
        var numCols = this.headers.length;

        sheet.getRange(startRow, 1, numRows, numCols).setValues(rowsData);
        this.invalidateCache();
        return numRows;
      } catch (err) {
        AppLogger.error("BaseRepo_" + this.sheetName, "Gagal melakukan batch insert: " + err.message, err);
        throw new Error("Gagal melakukan batch insert ke " + this.sheetName + ": " + err.message);
      }
    },

    /**
     * Memperbarui data berdasarkan Primary Key ID
     * @param {*} id
     * @param {object} updates - Pasangan key-value yang akan diubah
     * @returns {boolean} True jika berhasil diupdate
     */
    updateById: function(id, updates) {
      try {
        var existing = this.findById(id);
        if (!existing || !existing._rowIndex) {
          return false;
        }

        var sheet = this.getSheet();
        var rowIndex = existing._rowIndex;

        for (var key in updates) {
          if (Object.prototype.hasOwnProperty.call(updates, key)) {
            var colIndex = this.headers.indexOf(key);
            if (colIndex !== -1) {
              sheet.getRange(rowIndex, colIndex + 1).setValue(updates[key]);
            }
          }
        }

        this.invalidateCache();
        return true;
      } catch (err) {
        AppLogger.error("BaseRepo_" + this.sheetName, "Gagal mengupdate data: " + err.message, err);
        throw new Error("Gagal mengupdate data di " + this.sheetName + ": " + err.message);
      }
    },

    /**
     * Menghapus baris berdasarkan Primary Key ID
     * @param {*} id
     * @returns {boolean}
     */
    deleteById: function(id) {
      try {
        var existing = this.findById(id);
        if (!existing || !existing._rowIndex) {
          return false;
        }

        var sheet = this.getSheet();
        sheet.deleteRow(existing._rowIndex);
        this.invalidateCache();
        return true;
      } catch (err) {
        AppLogger.error("BaseRepo_" + this.sheetName, "Gagal menghapus data: " + err.message, err);
        throw new Error("Gagal menghapus data dari " + this.sheetName + ": " + err.message);
      }
    },

    /**
     * Menghitung jumlah entitas yang memenuhi kriteria
     * @param {Function} [predicate]
     * @returns {number}
     */
    count: function(predicate) {
      return this.findAll(predicate).length;
    }
  };
}

// ============================================================================
// 3. CONCRETE REPOSITORIES
// ============================================================================

/**
 * Repository Pengelolaan Pengguna & Otentikasi (Sheet: User_Roles)
 */
var UserRepository = (function() {
  var headers = [
    "user_id", "email", "username", "password_hash", "salt",
    "role_name", "must_change_password", "failed_login_attempts",
    "lockout_until", "is_active", "created_at", "last_login_at"
  ];

  var base = createBaseRepository(CONFIG.SPREADSHEET.SHEETS.USER_ROLES, headers, "user_id");

  return {
    init: function() { return base.init(); },
    getSheet: function() { return base.getSheet(); },

    getAllUsers: function() {
      return base.findAll().map(function(item) {
        return {
          rowIndex: item._rowIndex,
          userId: String(item.user_id || ""),
          email: String(item.email || ""),
          username: String(item.username || ""),
          passwordHash: String(item.password_hash || ""),
          salt: String(item.salt || ""),
          roleName: String(item.role_name || CONFIG.ROLES.REGULAR_USER),
          mustChangePassword: item.must_change_password === true || item.must_change_password === "TRUE",
          failedLoginAttempts: Number(item.failed_login_attempts || 0),
          lockoutUntil: item.lockout_until ? String(item.lockout_until) : null,
          isActive: item.is_active === true || item.is_active === "TRUE" || item.is_active === 1,
          createdAt: item.created_at ? String(item.created_at) : null,
          lastLoginAt: item.last_login_at ? String(item.last_login_at) : null
        };
      });
    },

    findById: function(userId) {
      var users = this.getAllUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].userId === userId) return users[i];
      }
      return null;
    },

    findByEmail: function(email) {
      if (!email) return null;
      var clean = String(email).trim().toLowerCase();
      var users = this.getAllUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].email.toLowerCase() === clean) return users[i];
      }
      return null;
    },

    findByIdentifier: function(identifier) {
      if (!identifier) return null;
      var clean = String(identifier).trim().toLowerCase();
      var users = this.getAllUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].email.toLowerCase() === clean || users[i].username.toLowerCase() === clean) {
          return users[i];
        }
      }
      return null;
    },

    updateFailedAttempts: function(rowIndex, attempts, lockoutUntilIso) {
      var sheet = base.getSheet();
      sheet.getRange(rowIndex, 8).setValue(attempts);
      sheet.getRange(rowIndex, 9).setValue(lockoutUntilIso || "");
    },

    resetLoginSuccess: function(rowIndex, lastLoginIso) {
      var sheet = base.getSheet();
      sheet.getRange(rowIndex, 8).setValue(0);
      sheet.getRange(rowIndex, 9).setValue("");
      sheet.getRange(rowIndex, 12).setValue(lastLoginIso);
    },

    updatePassword: function(rowIndex, newSalt, newHash) {
      var sheet = base.getSheet();
      sheet.getRange(rowIndex, 4).setValue(newHash);
      sheet.getRange(rowIndex, 5).setValue(newSalt);
      sheet.getRange(rowIndex, 7).setValue(false);
    },

    createUser: function(userObj) {
      var userId = "usr_" + Utilities.getUuid();
      var now = new Date().toISOString();

      base.insert({
        user_id: userId,
        email: userObj.email,
        username: userObj.username,
        password_hash: userObj.passwordHash,
        salt: userObj.salt,
        role_name: userObj.roleName || userObj.role || CONFIG.ROLES.REGULAR_USER,
        must_change_password: userObj.mustChangePassword !== false,
        failed_login_attempts: 0,
        lockout_until: "",
        is_active: userObj.isActive !== false,
        created_at: now,
        last_login_at: ""
      });

      return userId;
    },

    create: function(userObj) {
      return this.createUser(userObj);
    },
    invalidateCache: function() {
      return base.invalidateCache();
    }
  };
})();

/**
 * Repository Pencatatan Audit Trail (Sheet: Audit_Logs)
 */
var AuditLogRepository = (function() {
  var headers = [
    "log_id", "timestamp", "user_id", "user_email",
    "action", "status", "page_reference", "details"
  ];

  var base = createBaseRepository(CONFIG.SPREADSHEET.SHEETS.AUDIT_LOGS, headers, "log_id");

  return {
    init: function() { return base.init(); },
    getSheet: function() { return base.getSheet(); },

    appendLog: function(logEntry) {
      base.insert({
        log_id: logEntry.logId || ("log_" + Utilities.getUuid()),
        timestamp: logEntry.timestamp || new Date().toISOString(),
        user_id: logEntry.userId || "N/A",
        user_email: logEntry.userEmail || "ANONYMOUS",
        action: logEntry.action,
        status: logEntry.status || "INFO",
        page_reference: logEntry.pageReference || "System",
        details: typeof logEntry.details === "object" ? JSON.stringify(logEntry.details) : (logEntry.details || "{}")
      });
    },

    findRecentLogs: function(limit) {
      var logs = base.findAll();
      var max = limit || 50;
      return logs.slice(-max).reverse();
    },

    findAll: function(filterFn) {
      return base.findAll(filterFn);
    },

    invalidateCache: function() {
      return base.invalidateCache();
    }
  };
})();

/**
 * Repository Konfigurasi Dinamis Sistem (Sheet: System_Config)
 */
var ConfigRepository = (function() {
  var headers = ["config_key", "config_value", "description", "updated_at"];
  var base = createBaseRepository(CONFIG.SPREADSHEET.SHEETS.SYSTEM_CONFIG, headers, "config_key");

  return {
    init: function() { return base.init(); },
    getSheet: function() { return base.getSheet(); },

    get: function(key, defaultValue) {
      var item = base.findById(key);
      return item ? item.config_value : (defaultValue !== undefined ? defaultValue : null);
    },

    set: function(key, value, description) {
      var existing = base.findById(key);
      var now = new Date().toISOString();

      if (existing) {
        base.updateById(key, {
          config_value: String(value),
          description: description || existing.description,
          updated_at: now
        });
      } else {
        base.insert({
          config_key: key,
          config_value: String(value),
          description: description || "",
          updated_at: now
        });
      }
      return true;
    },

    invalidateCache: function() {
      return base.invalidateCache();
    }
  };
})();

/**
 * Repository Pengelolaan Proyek (Sheet: Projects)
 */
var ProjectRepository = (function() {
  var headers = [
    "project_id", "project_name", "start_date", "end_date",
    "pic_name", "pic_email", "pic_phone", "is_email_active",
    "is_wa_active", "status", "created_at", "updated_at"
  ];

  var base = createBaseRepository(CONFIG.SPREADSHEET.SHEETS.PROJECTS, headers, "project_id");

  return {
    init: function() { return base.init(); },
    getSheet: function() { return base.getSheet(); },
    findAll: function(predicate) { return base.findAll(predicate); },
    findById: function(projectId) { return base.findById(projectId); },
    create: function(projectData) {
      var id = projectData.project_id || ("prj_" + Utilities.getUuid());
      var now = new Date().toISOString();
      projectData.project_id = id;
      projectData.created_at = now;
      projectData.updated_at = now;
      base.insert(projectData);
      return id;
    },
    update: function(projectId, updates) {
      updates.updated_at = new Date().toISOString();
      return base.updateById(projectId, updates);
    },
    delete: function(projectId) {
      return base.deleteById(projectId);
    },
    invalidateCache: function() {
      return base.invalidateCache();
    }
  };
})();

/**
 * Repository Pencatatan Progres Harian Proyek (Sheet: Progress_Logs)
 */
var ProgressLogRepository = (function() {
  var headers = [
    "progress_id", "project_id", "date", "planned_progress",
    "actual_progress", "deviation", "notes", "recorded_by", "created_at"
  ];

  var base = createBaseRepository(CONFIG.SPREADSHEET.SHEETS.PROGRESS_LOGS, headers, "progress_id");

  return {
    init: function() { return base.init(); },
    getSheet: function() { return base.getSheet(); },
    findAll: function(predicate) {
      return base.findAll(predicate);
    },
    findById: function(progressId) {
      return base.findById(progressId);
    },
    findByProject: function(projectId) {
      return base.findByField("project_id", projectId);
    },
    addProgress: function(progressData) {
      var id = progressData.progress_id || ("prog_" + Utilities.getUuid());
      progressData.progress_id = id;
      progressData.created_at = new Date().toISOString();
      base.insert(progressData);
      return id;
    },
    addBatchProgress: function(progressList) {
      return base.insertBatch(progressList);
    },
    update: function(progressId, updates) {
      return base.updateById(progressId, updates);
    },
    delete: function(progressId) {
      return base.deleteById(progressId);
    },
    invalidateCache: function() {
      return base.invalidateCache();
    }
  };
})();

// Alias compatibility untuk module authService lama
var RepositoryHelper = {
  getSpreadsheet: function() { return SpreadsheetManager.getSpreadsheet(); },
  getOrCreateSheet: function(name, headers) { return SpreadsheetManager.getSheet(name, headers); },
  initializeDatabase: function() { return SpreadsheetManager.initializeAllSheets(); }
};
