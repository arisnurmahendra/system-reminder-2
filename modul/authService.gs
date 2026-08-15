/**
 * Service Otentikasi & Account Lockout
 * Mengikuti standar keamanan POL.ISMS.001
 */

/**
 * Inisialisasi Lembar Kerja Database (Sheet Schema) jika belum ada.
 */
function initializeDatabase() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID);
  
  var userRolesSheet = ss.getSheetByName(CONFIG.SPREADSHEET.SHEETS.USER_ROLES);
  if (!userRolesSheet) {
    userRolesSheet = ss.insertSheet(CONFIG.SPREADSHEET.SHEETS.USER_ROLES);
    userRolesSheet.appendRow([
      "user_id", "email", "username", "password_hash", "salt", 
      "role_name", "must_change_password", "failed_login_attempts", 
      "lockout_until", "is_active", "created_at", "last_login_at"
    ]);
  }

  var auditLogsSheet = ss.getSheetByName(CONFIG.SPREADSHEET.SHEETS.AUDIT_LOGS);
  if (!auditLogsSheet) {
    auditLogsSheet = ss.insertSheet(CONFIG.SPREADSHEET.SHEETS.AUDIT_LOGS);
    auditLogsSheet.appendRow([
      "log_id", "timestamp", "user_id", "user_email", 
      "action", "status", "page_reference", "details"
    ]);
  }
}

/**
 * Memproses Login Pengguna pada Google Apps Script Web App
 */
function processUserLogin(identifier, inputPassword, totpToken) {
  // Pastikan database siap
  initializeDatabase();

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID);
  var sheet = ss.getSheetByName(CONFIG.SPREADSHEET.SHEETS.USER_ROLES);
  if (!sheet) throw new Error("Sheet " + CONFIG.SPREADSHEET.SHEETS.USER_ROLES + " tidak ditemukan.");

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  // Index Mapping
  var colEmail = headers.indexOf("email");
  var colUsername = headers.indexOf("username");
  var colHash = headers.indexOf("password_hash");
  var colSalt = headers.indexOf("salt");
  var colRole = headers.indexOf("role_name");
  var colMustChange = headers.indexOf("must_change_password");
  var colFailed = headers.indexOf("failed_login_attempts");
  var colLockout = headers.indexOf("lockout_until");
  var colIsActive = headers.indexOf("is_active");
  var colUserId = headers.indexOf("user_id");
  var colLastLogin = headers.indexOf("last_login_at");

  var activeEmail = Session.getActiveUser().getEmail() || identifier;
  var userRowIndex = -1;
  var userData = null;

  for (var i = 1; i < data.length; i++) {
    if (data[i][colEmail] === identifier || data[i][colUsername] === identifier || data[i][colEmail] === activeEmail) {
      userRowIndex = i + 1; // 1-based index untuk Spreadsheet
      userData = data[i];
      break;
    }
  }

  if (!userData) {
    writeAuditLog(null, activeEmail, "USER_LOGIN", "FAILURE", "AuthService", { reason: "User not found" });
    throw new Error("Kredensial login tidak valid.");
  }

  var userId = userData[colUserId];
  var userEmail = userData[colEmail];
  var roleName = userData[colRole];
  var isActive = userData[colIsActive];

  if (!isActive || isActive === "FALSE" || isActive === false) {
    throw new Error("Akun Anda dinonaktifkan. Hubungi administrator.");
  }

  // Cek Account Lockout Status
  var lockoutUntil = userData[colLockout] ? new Date(userData[colLockout]) : null;
  var now = new Date();

  if (lockoutUntil && now < lockoutUntil) {
    var minutesLeft = Math.ceil((lockoutUntil.getTime() - now.getTime()) / 60000);
    writeAuditLog(userId, userEmail, "USER_LOGIN_BLOCKED", "WARNING", "AuthService", { minutesLeft: minutesLeft });
    throw new Error("Akun terkunci karena kesalahan berulang. Silakan coba lagi dalam " + minutesLeft + " menit.");
  }

  // Verifikasi Password Hash
  var storedHash = userData[colHash];
  var storedSalt = userData[colSalt];
  var inputHash = hashPasswordWithSalt(inputPassword, storedSalt);

  if (inputHash !== storedHash) {
    var currentFailed = Number(userData[colFailed] || 0) + 1;
    var newLockout = null;

    if (currentFailed >= CONFIG.SECURITY.MAX_FAILED_ATTEMPTS) {
      var lockoutDate = new Date(now.getTime() + CONFIG.SECURITY.LOCKOUT_DURATION_MINUTES * 60000);
      newLockout = lockoutDate.toISOString();
    }

    // Update failed attempts dan lockout di Sheet
    sheet.getRange(userRowIndex, colFailed + 1).setValue(currentFailed);
    if (newLockout) {
      sheet.getRange(userRowIndex, colLockout + 1).setValue(newLockout);
    }

    writeAuditLog(userId, userEmail, "USER_LOGIN", "FAILURE", "AuthService", { failedAttempts: currentFailed, locked: !!newLockout });

    if (newLockout) {
      throw new Error("Akun Anda terkunci otomatis selama " + CONFIG.SECURITY.LOCKOUT_DURATION_MINUTES + " menit karena 10 kali percobaan gagal.");
    }
    throw new Error("Kredensial login tidak valid.");
  }

  // MFA Enforcement khusus untuk Peran ADMINISTRATOR
  if (roleName === "ADMINISTRATOR") {
    if (!totpToken && getScriptSecret_(CONFIG.SECURITY.MFA_STRICT_MODE_KEY) === "TRUE") {
      return { status: "REQUIRE_MFA_TOKEN", userId: userId, email: userEmail };
    }
  }

  // Reset Counter Attempt saat login sukses
  sheet.getRange(userRowIndex, colFailed + 1).setValue(0);
  sheet.getRange(userRowIndex, colLockout + 1).setValue("");
  sheet.getRange(userRowIndex, colLastLogin + 1).setValue(now.toISOString());

  writeAuditLog(userId, userEmail, "USER_LOGIN", "SUCCESS", "AuthService", { role: roleName });

  // Evaluasi Initial Login (Force Password Change)
  var mustChangePassword = userData[colMustChange];
  if (mustChangePassword === true || mustChangePassword === "TRUE") {
    return {
      status: "REQUIRE_PASSWORD_CHANGE",
      userId: userId,
      email: userEmail,
      message: "Login pertama berhasil. Anda diwajibkan mengganti password default."
    };
  }

  return {
    status: "SUCCESS",
    user: {
      userId: userId,
      email: userEmail,
      role: roleName
    }
  };
}

/**
 * Memproses Penggantian Password Default (Initial Login Reset)
 */
function processInitialPasswordChange(userId, oldPassword, newPassword) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID);
  var sheet = ss.getSheetByName(CONFIG.SPREADSHEET.SHEETS.USER_ROLES);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var colUserId = headers.indexOf("user_id");
  var colHash = headers.indexOf("password_hash");
  var colSalt = headers.indexOf("salt");
  var colRole = headers.indexOf("role_name");
  var colMustChange = headers.indexOf("must_change_password");
  var colEmail = headers.indexOf("email");

  for (var i = 1; i < data.length; i++) {
    if (data[i][colUserId] === userId) {
      var row = i + 1;
      var roleName = data[i][colRole];
      var storedSalt = data[i][colSalt];
      var storedHash = data[i][colHash];
      var userEmail = data[i][colEmail];

      if (hashPasswordWithSalt(oldPassword, storedSalt) !== storedHash) {
        throw new Error("Password lama tidak cocok.");
      }

      var isPrivileged = (roleName === "ADMINISTRATOR");
      var check = validatePasswordPolicy(newPassword, isPrivileged);
      if (!check.valid) throw new Error(check.message);

      var newSalt = generateSalt();
      var newHash = hashPasswordWithSalt(newPassword, newSalt);

      sheet.getRange(row, colSalt + 1).setValue(newSalt);
      sheet.getRange(row, colHash + 1).setValue(newHash);
      sheet.getRange(row, colMustChange + 1).setValue(false);

      writeAuditLog(userId, userEmail, "INITIAL_PASSWORD_CHANGED", "SUCCESS", "AuthService", {});
      return { success: true, message: "Password berhasil diperbarui." };
    }
  }

  throw new Error("User tidak ditemukan.");
}
