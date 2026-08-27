/**
 * Service Otentikasi, Verifikasi Password, & Account Lockout (POL.ISMS.001)
 */

/**
 * Inisialisasi Lembar Kerja Database jika belum ada
 */
function initializeDatabase() {
  RepositoryHelper.initializeDatabase();
}

/**
 * Memproses Login Pengguna pada Google Apps Script Web App
 * @param {string} identifier - Email atau Username
 * @param {string} inputPassword - Password input dari form
 * @param {string} [totpToken] - Token MFA jika diaktifkan
 * @returns {object}
 */
function processUserLogin(identifier, inputPassword, totpToken) {
  validateRequired(identifier, "Email / Username");
  validateRequired(inputPassword, "Password");

  // Pastikan database sheet terinisialisasi
  initializeDatabase();

  var user = UserRepository.findByIdentifier(identifier);
  var activeEmail = getCurrentUserEmail_() || identifier;

  if (!user) {
    writeAuditLog(null, activeEmail, "USER_LOGIN", "FAILURE", "AuthService", { reason: "User not found" });
    throw new Error("Kredensial login tidak valid.");
  }

  if (!user.isActive) {
    writeAuditLog(user.userId, user.email, "USER_LOGIN_BLOCKED", "FAILURE", "AuthService", { reason: "Account inactive" });
    throw new Error("Akun Anda dinonaktifkan. Hubungi administrator sistem.");
  }

  // 1. Cek Status Account Lockout
  var now = new Date();
  if (user.lockoutUntil) {
    var lockoutDate = new Date(user.lockoutUntil);
    if (now < lockoutDate) {
      var minutesLeft = Math.ceil((lockoutDate.getTime() - now.getTime()) / 60000);
      writeAuditLog(user.userId, user.email, "USER_LOGIN_LOCKED", "WARNING", "AuthService", { minutesLeft: minutesLeft });
      throw new Error("Akun terkunci sementara karena percobaan gagal berulang. Silakan coba lagi dalam " + minutesLeft + " menit.");
    }
  }

  // 2. Verifikasi Hash Password + Salt
  var computedHash = hashPasswordWithSalt(inputPassword, user.salt);
  if (computedHash !== user.passwordHash) {
    var currentFailed = user.failedLoginAttempts + 1;
    var lockoutUntilIso = null;

    if (currentFailed >= CONFIG.SECURITY.MAX_FAILED_ATTEMPTS) {
      var newLockoutDate = new Date(now.getTime() + CONFIG.SECURITY.LOCKOUT_DURATION_MINUTES * 60000);
      lockoutUntilIso = newLockoutDate.toISOString();
    }

    UserRepository.updateFailedAttempts(user.rowIndex, currentFailed, lockoutUntilIso);
    writeAuditLog(user.userId, user.email, "USER_LOGIN", "FAILURE", "AuthService", { 
      failedAttempts: currentFailed, 
      isLocked: Boolean(lockoutUntilIso) 
    });

    if (lockoutUntilIso) {
      throw new Error("Akun Anda terkunci otomatis selama " + CONFIG.SECURITY.LOCKOUT_DURATION_MINUTES + " menit karena 10 kali percobaan login gagal.");
    }
    throw new Error("Kredensial login tidak valid.");
  }

  // 3. MFA Enforcement untuk Role ADMINISTRATOR
  if (user.roleName === CONFIG.ROLES.ADMINISTRATOR) {
    var mfaStrict = getScriptSecret_(CONFIG.SECURITY.MFA_STRICT_MODE_KEY);
    if (mfaStrict === "TRUE" && !totpToken) {
      return formatSuccessResponse({
        status: "REQUIRE_MFA_TOKEN",
        userId: user.userId,
        email: user.email
      }, "Diperlukan verifikasi 2 langkah (MFA).");
    }
  }

  // 4. Reset percobaan gagal saat login sukses
  UserRepository.resetLoginSuccess(user.rowIndex, now.toISOString());
  writeAuditLog(user.userId, user.email, "USER_LOGIN", "SUCCESS", "AuthService", { role: user.roleName });

  // 5. Cek Kewajiban Pergantian Password Default (Initial Login Force Reset)
  if (user.mustChangePassword) {
    return formatSuccessResponse({
      status: "REQUIRE_PASSWORD_CHANGE",
      userId: user.userId,
      email: user.email,
      username: user.username,
      role: user.roleName
    }, "Login pertama berhasil. Anda diwajibkan mengganti password default.");
  }

  return formatSuccessResponse({
    status: "AUTHENTICATED",
    user: {
      userId: user.userId,
      email: user.email,
      username: user.username,
      role: user.roleName
    }
  }, "Login berhasil.");
}

/**
 * Memproses Penggantian Password Default pada Login Pertama
 * @param {string} userId - ID Pengguna
 * @param {string} oldPassword - Password lama
 * @param {string} newPassword - Password baru
 * @returns {object}
 */
function processInitialPasswordChange(userId, oldPassword, newPassword) {
  validateRequired(userId, "User ID");
  validateRequired(oldPassword, "Password Lama");
  validateRequired(newPassword, "Password Baru");

  var user = UserRepository.findById(userId);
  if (!user) {
    throw new Error("User tidak ditemukan.");
  }

  // Verifikasi kecocokan password lama
  var oldHash = hashPasswordWithSalt(oldPassword, user.salt);
  if (oldHash !== user.passwordHash) {
    writeAuditLog(user.userId, user.email, "PASSWORD_CHANGE", "FAILURE", "AuthService", { reason: "Old password mismatch" });
    throw new Error("Password lama tidak sesuai.");
  }

  // Validasi kebijakan password baru
  var isPrivileged = (user.roleName === CONFIG.ROLES.ADMINISTRATOR);
  var policyCheck = validatePasswordPolicy(newPassword, isPrivileged);
  if (!policyCheck.valid) {
    throw new Error(policyCheck.message);
  }

  // Pastikan password baru tidak sama dengan password lama
  if (oldPassword === newPassword) {
    throw new Error("Password baru tidak boleh sama dengan password lama.");
  }

  // Buat salt baru dan hash baru
  var newSalt = generateSalt();
  var newHash = hashPasswordWithSalt(newPassword, newSalt);

  UserRepository.updatePassword(user.rowIndex, newSalt, newHash);
  writeAuditLog(user.userId, user.email, "INITIAL_PASSWORD_CHANGED", "SUCCESS", "AuthService", {});

  return formatSuccessResponse({
    userId: user.userId,
    status: "PASSWORD_UPDATED"
  }, "Password berhasil diperbarui. Silakan login kembali dengan password baru Anda.");
}

/**
 * Memeriksa status sesi pengguna aktif
 * @returns {object}
 */
function getActiveSessionStatus() {
  var activeEmail = getCurrentUserEmail_();
  if (!activeEmail) {
    return formatSuccessResponse({ isAuthenticated: false, email: null });
  }

  var user = UserRepository.findByEmail(activeEmail);
  if (!user || !user.isActive) {
    return formatSuccessResponse({ 
      isAuthenticated: false, 
      email: activeEmail, 
      isRegistered: Boolean(user) 
    });
  }

  return formatSuccessResponse({
    isAuthenticated: true,
    user: {
      userId: user.userId,
      email: user.email,
      username: user.username,
      role: user.roleName,
      mustChangePassword: user.mustChangePassword
    }
  });
}
