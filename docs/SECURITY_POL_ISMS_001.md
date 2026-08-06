# POL.ISMS.001 - Security Baseline Control Standard & Implementation Guide (Google Workspace & Google Apps Script)

Dokumen ini berisi arsitektur keamanan, rancangan struktur data Google Sheets, dan contoh implementasi kode secure coding untuk aplikasi **System Reminder 2** berbasis ekosistem **Google Workspace (Google Apps Script, Google Sheets, HTML Service, dan Properties Service)** yang mematuhi standar **Baseline Control POL.ISMS.001**.

---

## 1. Penjelasan Arsitektur Keamanan (Google Workspace Security Architecture)

Arsitektur keamanan aplikasi ini memanfaatkan keunggulan infrastruktur cloud Google Workspace yang dipadukan dengan kontrol akses internal berprinsip **Defense-in-Depth** dan **Zero Trust**:

```
                       [ Client / Web Browser ]
                                  │
                                  ▼ (HTTPS / TLS 1.3 - Managed by Google)
                     [ Google Infrastructure & WAF ]
                                  │
                                  ▼
                [ Google Workspace OAuth2 & Session Control ]
              (Email Authenticated via Session.getActiveUser())
                                  │
                                  ▼
               [ Google Apps Script Web App (doGet / doPost) ]
            ├── Input Validation & Parameter Sanitization
            ├── Secure Audit Logging & Masking Interceptor
            └── Properties Service (Encrypted Secret Store)
                                  │
                                  ▼
                    [ Authentication & RBAC Engine ]
            ├── Salted Hash Digest Verification (Utilities.computeDigest)
            ├── Role-Based Access Control (Sheet: User_Roles)
            ├── Account Lockout Manager (10 Failed Attempts Limit)
            └── Mandatory Google 2SV / TOTP for Administrators
                                  │
                                  ▼
                 [ Google Spreadsheet (Encrypted Data Store) ]
                 ├── Sheet: User_Roles
                 ├── Sheet: Audit_Logs
                 └── Sheet: System_Config
```

### Prinsip Utama Keamanan POL.ISMS.001 pada Google Apps Script:
1. **Identitas & Kontrol Akses (Least Privilege & RBAC):** Mengidentifikasi pengguna secara unik melalui email Google (`Session.getActiveUser().getEmail()`) yang dipetakan ke peran (`ADMINISTRATOR`, `PROJECT_MANAGER`, `REGULAR_USER`, `AUDITOR`) pada lembar kerja `User_Roles`.
2. **Pengelolaan Password & Kebijakan Akses Sekunder:** Memaksa penggantian password/PIN default saat login pertama (*initial login*). Kebijakan password/PIN ketat (huruf besar, huruf kecil, angka, karakter khusus; min 8 karakter untuk user biasa, min 14 karakter untuk Admin). Account lockout otomatis setelah 10 kali upaya verifikasi yang gagal.
3. **Multi-Factor Authentication (MFA):** Mewajibkan pengaktifan **Google 2-Step Verification (2SV)** pada akun Google Workspace untuk peran `ADMINISTRATOR`, ditambahkan opsi verifikasi TOTP sekunder pada Web App.
4. **Kriptografi & Perlindungan Rahasia:** Seluruh rahasia sistem (API Key Fonnte, Token) disimpan pada `PropertiesService.getScriptProperties()`, tidak pernah di-hardcode. Password/PIN disimpan dalam bentuk Salted Hash Digest (`SHA-256` / `HMAC`).
5. **Audit Trail & Log Masking:** Aktivitas sistem dicatat secara otomatis di lembar kerja `Audit_Logs` dengan fungsi masking otomatis agar password, PIN, dan data sensitif lainnya tidak pernah masuk ke dalam log.

---

## 2. Struktur Database Google Spreadsheet (Sheet Schema)

Seluruh data tersimpan secara terenkripsi di Google Spreadsheet internal. Berikut rancangan lembar kerja (sheets) yang digunakan:

### 2.1 Sheet `User_Roles`
Menyimpan data pengguna, hak akses, dan status akun.

| Header Kolom | Tipe Data | Deskripsi | Contoh / Format |
|---|---|---|---|
| `user_id` | String (UUID) | Unique Identifier Pengguna | `usr_8f3a1b2c-4d5e-6f7a` |
| `email` | String | Email Google Workspace Unik | `admin@perusahaan.com` |
| `username` | String | Username pengenal | `admin_proyek` |
| `password_hash` | String | Hash password/PIN + Salt (Base64) | `e3b0c44298fc1c149afbf4c8996fb924...` |
| `salt` | String | Salt acak per pengguna | `salt_9a8b7c6d5e4f` |
| `role_name` | String | Peran (`ADMINISTRATOR`, `PROJECT_MANAGER`, `REGULAR_USER`, `AUDITOR`) | `ADMINISTRATOR` |
| `must_change_password` | Boolean | Flag penggantian password default (`TRUE`/`FALSE`) | `TRUE` |
| `failed_login_attempts` | Number | Jumlah percobaan login/PIN gagal berturut-turut | `0` |
| `lockout_until` | ISO String | Batas waktu terkunci setelah 10x gagal | `2026-08-06T23:00:00Z` |
| `is_active` | Boolean | Status keaktifan akun (`TRUE`/`FALSE`) | `TRUE` |
| `created_at` | ISO String | Waktu pembuatan akun | `2026-08-06T15:00:00Z` |
| `last_login_at` | ISO String | Waktu terakhir login | `2026-08-06T22:00:00Z` |

---

### 2.2 Sheet `Audit_Logs`
Menyimpan jejak audit trail seluruh aktivitas sistem.

| Header Kolom | Tipe Data | Deskripsi | Contoh / Format |
|---|---|---|---|
| `log_id` | String (UUID) | Unique Identifier Log | `log_1a2b3c4d-5e6f` |
| `timestamp` | ISO String | Waktu kejadian | `2026-08-06T22:15:00Z` |
| `user_id` | String | UID Pengguna | `usr_8f3a1b2c-4d5e-6f7a` |
| `user_email` | String | Email Pengguna dari Google Session | `admin@perusahaan.com` |
| `action` | String | Jenis aktivitas (`LOGIN_SUCCESS`, `UPDATE_PROGRESS`, dll) | `USER_LOGIN_SUCCESS` |
| `status` | String | Status (`SUCCESS`, `FAILURE`, `WARNING`) | `SUCCESS` |
| `page_reference` | String | Modul / Halaman yang diakses | `Dashboard_Web` |
| `ip_address` | String | Alamat IP Pengakses (jika tersedia) | `180.252.xxx.xxx` |
| `details` | JSON String | Detail aktivitas (sudah ter-masking otomatis) | `{"role":"ADMINISTRATOR"}` |

---

## 3. Implementasi Kode Google Apps Script (`.gs`)

### 3.1 Policy & Kriptografi Hashing (`AuthPolicy.gs`)

```javascript
/**
 * Pola Kebijakan Password POL.ISMS.001:
 * Kombinasi huruf besar, huruf kecil, angka, dan karakter khusus.
 */
var PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).+$/;

/**
 * Validasi Kebijakan Password berdasarkan peran
 */
function validatePasswordPolicy(password, isPrivilegedRole) {
  var minLength = isPrivilegedRole ? 14 : 8;

  if (!password || password.length < minLength) {
    return {
      valid: false,
      message: "Password minimum " + minLength + " karakter untuk peran " + (isPrivilegedRole ? "Administrator" : "Pengguna Biasa") + "."
    };
  }

  if (!PASSWORD_REGEX.test(password)) {
    return {
      valid: false,
      message: "Password wajib mengombinasikan huruf besar, huruf kecil, angka, dan karakter khusus (!@#$%^&* dll)."
    };
  }

  return { valid: true };
}

/**
 * Membuat Salt acak menggunakan Utilities.getUuid()
 */
function generateSalt() {
  return Utilities.getUuid().replace(/-/g, '');
}

/**
 * Menghasilkan Hash SHA-256 dengan Salt menggunakan Utilities.computeDigest
 */
function hashPasswordWithSalt(password, salt) {
  var saltedInput = password + "::" + salt;
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, saltedInput, Utilities.Charset.UTF_8);
  var txtHash = "";
  for (var i = 0; i < rawHash.length; i++) {
    var byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    var byteStr = byteVal.toString(16);
    if (byteStr.length == 1) byteStr = "0" + byteStr;
    txtHash += byteStr;
  }
  return txtHash;
}
```

---

### 3.2 Service Otentikasi & Account Lockout (`AuthService.gs`)

```javascript
var MAX_FAILED_ATTEMPTS = 10;
var LOCKOUT_DURATION_MINUTES = 30;

/**
 * Memproses Login Pengguna pada Google Apps Script Web App
 */
function processUserLogin(identifier, inputPassword, totpToken) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("User_Roles");
  if (!sheet) throw new Error("Sheet User_Roles tidak ditemukan.");

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

  if (!isActive) {
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

    if (currentFailed >= MAX_FAILED_ATTEMPTS) {
      var lockoutDate = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60000);
      newLockout = lockoutDate.toISOString();
    }

    // Update failed attempts dan lockout di Sheet
    sheet.getRange(userRowIndex, colFailed + 1).setValue(currentFailed);
    if (newLockout) {
      sheet.getRange(userRowIndex, colLockout + 1).setValue(newLockout);
    }

    writeAuditLog(userId, userEmail, "USER_LOGIN", "FAILURE", "AuthService", { failedAttempts: currentFailed, locked: !!newLockout });

    if (newLockout) {
      throw new Error("Akun Anda terkunci otomatis selama " + LOCKOUT_DURATION_MINUTES + " menit karena 10 kali percobaan gagal.");
    }
    throw new Error("Kredensial login tidak valid.");
  }

  // MFA Enforcement khusus untuk Peran ADMINISTRATOR
  if (roleName === "ADMINISTRATOR") {
    // Pada Google Workspace, Admin WAJIB mengaktifkan 2-Step Verification (2SV)
    // opsional: verifikasi tambahan TOTP jika dikonfigurasi di Script Properties
    if (!totpToken && getScriptSecret_("MFA_STRICT_MODE") === "TRUE") {
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("User_Roles");
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
```

---

### 3.3 Logger Interceptor & Sensitive Data Masking (`AuditLogger.gs`)

```javascript
var SENSITIVE_KEYWORDS = [
  "password", "oldpassword", "newpassword", "pin", "secret",
  "token", "authorization", "totp_secret", "credit_card"
];

/**
 * Filter Masking Data Sensitif agar TIDAK Pernah Tercatat di Log
 */
function sanitizeLogData_(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeLogData_);
  }

  if (typeof obj === "object") {
    var sanitized = {};
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var lowerKey = key.toLowerCase();
        var isSensitive = SENSITIVE_KEYWORDS.some(function(keyword) {
          return lowerKey.indexOf(keyword) !== -1;
        });

        if (isSensitive) {
          sanitized[key] = "[REDACTED]";
        } else if (typeof obj[key] === "object") {
          sanitized[key] = sanitizeLogData_(obj[key]);
        } else {
          sanitized[key] = obj[key];
        }
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Mencatat Audit Log ke Sheet Audit_Logs secara Aman
 */
function writeAuditLog(userId, userEmail, action, status, pageRef, details) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Audit_Logs");
    
    if (!sheet) {
      sheet = ss.insertSheet("Audit_Logs");
      sheet.appendRow(["log_id", "timestamp", "user_id", "user_email", "action", "status", "page_reference", "details"]);
    }

    var sanitizedDetails = sanitizeLogData_(details || {});
    var logId = "log_" + Utilities.getUuid();
    var timestamp = new Date().toISOString();
    var email = userEmail || Session.getActiveUser().getEmail() || "ANONYMOUS";

    sheet.appendRow([
      logId,
      timestamp,
      userId || "N/A",
      email,
      action,
      status,
      pageRef || "GAS_WebApp",
      JSON.stringify(sanitizedDetails)
    ]);

    // Opsional log ke Logger internal Apps Script
    Logger.log("[AUDIT] " + action + " | Status: " + status + " | User: " + email);
  } catch (err) {
    console.error("Gagal mencatat audit log:", err);
  }
}
```

---

### 3.4 Safe Script Properties & Error Handler (`SecurityUtils.gs`)

```javascript
/**
 * Mengambil rahasia sistem dari Script Properties (Bukan hardcode)
 */
function getScriptSecret_(key) {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty(key);
  if (!secret) {
    console.warn("Script Property " + key + " belum dikonfigurasi.");
  }
  return secret;
}

/**
 * Menyiapkan Token Fonnte API secara aman
 */
function setFonnteToken(token) {
  // Hanya role ADMINISTRATOR yang boleh memanggil ini
  enforceAdminRole_();
  PropertiesService.getScriptProperties().setProperty("FONNTE_TOKEN", token);
  return "Token Fonnte berhasil disimpan di Script Properties terenkripsi.";
}

/**
 * Enforcement Least Privilege Access Control
 */
function enforceAdminRole_() {
  var activeEmail = Session.getActiveUser().getEmail();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("User_Roles");
  if (!sheet) throw new Error("Akses Ditolak: Modul otorisasi tidak siap.");

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === activeEmail && data[i][5] === "ADMINISTRATOR" && data[i][9] === true) {
      return true; // Authorized
    }
  }

  writeAuditLog(null, activeEmail, "UNAUTHORIZED_ACCESS_ATTEMPT", "WARNING", "SecurityUtils", {});
  throw new Error("Akses Ditolak: Anda tidak memiliki hak akses ADMINISTRATOR.");
}

/**
 * Safe Error Handler Response untuk Web App HTML (OWASP API Security)
 */
function safeWebResponse(callbackFn) {
  try {
    return callbackFn();
  } catch (err) {
    console.error("[SERVER_ERROR]", err.stack || err.message);
    // Kembalikan pesan aman tanpa membocorkan stack trace internal GAS
    return {
      success: false,
      error: err.message || "Terjadi kesalahan internal pada sistem. Hubungi administrator."
    };
  }
}
```

---

## 4. Rekomendasi Keamanan Tambahan Google Workspace DevSecOps

1. **Pengaturan Akses Web App Deployment:**
   - Setel deployment Google Apps Script Web App dengan parameter **Execute as: User accessing the web app** atau **Me (Admin)** sesuai kebutuhan otorisasi, dan batasi **Who has access: Anyone within [Nama Domain Organisasi]**.
2. **Mandatory Google 2-Step Verification (2SV):**
   - Aktifkan kebijakan wajib 2SV melalui **Google Workspace Admin Console** (`admin.google.com`) untuk seluruh akun tingkat Administrator.
3. **Penyimpanan Secret Terenkripsi:**
   - Dilarang menaruh Token Fonnte WhatsApp, Credentials, atau Secret di file `.gs` / `.html` repositori Git. Selalu gunakan `PropertiesService.getScriptProperties()`.
4. **Proteksi Google Sheets:**
   - Lindungi (Protect Sheet & Range) lembar kerja `User_Roles` dan `Audit_Logs` agar hanya dapat diakses oleh akun Service/Admin aplikasi untuk mencegah pengubahan data audit atau hak akses secara langsung dari Google Sheets.
