/**
 * User Service - Logika Bisnis & Pengelolaan Pengguna
 * Mengikuti prinsip Separation of Concerns & Service Pattern
 */

var UserService = {
  /**
   * Mengambil semua daftar pengguna
   */
  getAllUsers: function() {
    enforceAdminRole_();
    var users = UserRepository.getAllUsers();
    // Sanitasi data sebelum dikirim ke frontend
    var safeUsers = users.map(function(u) {
      return {
        user_id: u.userId,
        email: u.email,
        username: u.username,
        role_name: u.roleName,
        is_active: u.isActive,
        created_at: u.createdAt,
        last_login_at: u.lastLoginAt
      };
    });
    return formatSuccessResponse(safeUsers);
  },

  /**
   * Membuat pengguna baru (Hanya Admin)
   */
  createUser: function(payload) {
    enforceAdminRole_();
    
    validateRequired(payload.email, "Email");
    validateRequired(payload.username, "Username");
    validateRequired(payload.password, "Password Sementara");
    validateRequired(payload.role, "Role");

    if (UserRepository.findByEmail(payload.email)) {
      throw ErrorFactory.validation("Email sudah terdaftar.");
    }
    if (UserRepository.findByUsername(payload.username)) {
      throw ErrorFactory.validation("Username sudah terdaftar.");
    }

    var isPrivileged = (payload.role === "ADMINISTRATOR");
    var passCheck = validatePasswordPolicy(payload.password, isPrivileged);
    if (!passCheck.valid) {
      throw ErrorFactory.validation(passCheck.message);
    }

    var salt = generateSalt();
    var hash = hashPasswordWithSalt(payload.password, salt);

    var userId = UserRepository.insert({
      email: payload.email,
      username: payload.username,
      password_hash: hash,
      salt: salt,
      role_name: payload.role,
      must_change_password: true, // Wajib ganti saat pertama kali login
      failed_login_attempts: 0,
      is_active: true
    });

    AppLogger.audit("UserService", "USER_CREATED", "SUCCESS", { newUserId: userId, email: payload.email, role: payload.role });

    return formatSuccessResponse({ userId: userId }, "Pengguna berhasil ditambahkan.");
  },

  /**
   * Mengupdate data pengguna (Role / Status)
   */
  updateUser: function(userId, payload) {
    enforceAdminRole_();
    validateRequired(userId, "User ID");

    var existing = UserRepository.findById(userId);
    if (!existing) throw ErrorFactory.notFound("Pengguna", userId);

    var updates = {};
    if (payload.role) updates.role_name = payload.role;
    if (payload.isActive !== undefined) updates.is_active = payload.isActive;
    // Opsi reset password oleh admin bisa ditambahkan di sini nantinya

    UserRepository.update(userId, updates);

    AppLogger.audit("UserService", "USER_UPDATED", "SUCCESS", { targetUserId: userId, updates: Object.keys(updates) });

    return formatSuccessResponse(null, "Data pengguna berhasil diperbarui.");
  },

  /**
   * Mengganti password (User-facing)
   */
  changePassword: function(oldPassword, newPassword) {
    var activeEmail = Session.getActiveUser().getEmail();
    var user = UserRepository.findByEmail(activeEmail);
    
    if (!user) {
      throw ErrorFactory.unauthorized("Sesi pengguna tidak valid.");
    }

    var isPrivileged = (user.role_name === "ADMINISTRATOR");
    
    // Verifikasi password lama
    var oldHash = hashPasswordWithSalt(oldPassword, user.salt);
    if (oldHash !== user.password_hash) {
      throw ErrorFactory.validation("Password lama tidak sesuai.");
    }

    // Validasi kebijakan password baru
    var check = validatePasswordPolicy(newPassword, isPrivileged);
    if (!check.valid) throw ErrorFactory.validation(check.message);

    // Buat salt baru
    var newSalt = generateSalt();
    var newHash = hashPasswordWithSalt(newPassword, newSalt);

    UserRepository.update(user.user_id, {
      salt: newSalt,
      password_hash: newHash,
      must_change_password: false
    });

    AppLogger.audit("UserService", "PASSWORD_CHANGED", "SUCCESS", { userId: user.user_id });

    return formatSuccessResponse(null, "Password berhasil diperbarui.");
  }
};
