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
      console.error("[SpreadsheetManager_ERROR] Gagal membuka Spreadsheet:", err.message);
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
      console.error("[SpreadsheetManager_ERROR] Gagal mengakses sheet '" + sheetName + "':", err.message);
      throw new Error("Gagal mengakses sheet '" + sheetName + "': " + err.message);
    }
  },

  /**
   * Membersihkan in-memory cache
   */
  clearCache: function() {
    this._spreadsheetCache = null;
    this._sheetCache = {};
  },

  /**
   * Inisialisasi seluruh lembar kerja sistem secara terpusat
   */
  initializeAllSheets: function() {
    UserRepository.init();
    AuditLogRepository.init();
    ConfigRepository.init();
    ProjectRepository.init();
    ProgressLogRepository.init();
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
     * Membaca seluruh data dan memetakan baris menjadi array of object (Batch Read)
     * @param {Function} [predicate] - Fungsi filter opsional (item => boolean)
     * @returns {object[]}
     */
    findAll: function(predicate) {
      try {
        var sheet = this.getSheet();
        var lastRow = sheet.getLastRow();
        var lastCol = sheet.getLastColumn();

        if (lastRow <= 1 || lastCol === 0) {
          return [];
        }

        var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
        var headerRow = values[0];
        var results = [];

        for (var i = 1; i < values.length; i++) {
          var row = values[i];
          // Abaikan baris kosong
          var isEmpty = row.every(function(cell) {
            return cell === "" || cell === null || cell === undefined;
          });
          if (isEmpty) continue;

          var item = { _rowIndex: i + 1 };
          for (var j = 0; j < headerRow.length; j++) {
            var key = String(headerRow[j]).trim();
            item[key] = row[j];
          }

          if (!predicate || predicate(item)) {
            results.push(item);
          }
        }

        return results;
      } catch (err) {
        console.error("[BaseRepo_" + this.sheetName + "_ERROR] findAll:", err.message);
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
        return entity;
      } catch (err) {
        console.error("[BaseRepo_" + this.sheetName + "_ERROR] insert:", err.message);
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
        return numRows;
      } catch (err) {
        console.error("[BaseRepo_" + this.sheetName + "_ERROR] insertBatch:", err.message);
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

        return true;
      } catch (err) {
        console.error("[BaseRepo_" + this.sheetName + "_ERROR] updateById:", err.message);
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
        return true;
      } catch (err) {
        console.error("[BaseRepo_" + this.sheetName + "_ERROR] deleteById:", err.message);
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
        role_name: userObj.roleName || CONFIG.ROLES.REGULAR_USER,
        must_change_password: userObj.mustChangePassword !== false,
        failed_login_attempts: 0,
        lockout_until: "",
        is_active: userObj.isActive !== false,
        created_at: now,
        last_login_at: ""
      });

      return userId;
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
    }
  };
})();

// Alias compatibility untuk module authService lama
var RepositoryHelper = {
  getSpreadsheet: function() { return SpreadsheetManager.getSpreadsheet(); },
  getOrCreateSheet: function(name, headers) { return SpreadsheetManager.getSheet(name, headers); },
  initializeDatabase: function() { return SpreadsheetManager.initializeAllSheets(); }
};
