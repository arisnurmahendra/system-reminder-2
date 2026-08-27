/**
 * Pola Kebijakan Password & Salted Cryptography Hashing (POL.ISMS.001)
 */

var PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).+$/;

/**
 * Validasi Kebijakan Password berdasarkan peran
 * @param {string} password - Password yang diuji
 * @param {boolean} isPrivilegedRole - True jika peran adalah Administrator
 * @returns {object} { valid: boolean, message: string }
 */
function validatePasswordPolicy(password, isPrivilegedRole) {
  var minLength = isPrivilegedRole 
    ? (CONFIG.SECURITY.PASSWORD_MIN_LENGTH_ADMIN || 14) 
    : (CONFIG.SECURITY.PASSWORD_MIN_LENGTH_USER || 8);

  if (!password || typeof password !== "string" || password.length < minLength) {
    return {
      valid: false,
      message: "Password minimum " + minLength + " karakter untuk peran " + (isPrivilegedRole ? "Administrator" : "Pengguna") + "."
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
 * @returns {string} Salt acak heksadesimal
 */
function generateSalt() {
  return Utilities.getUuid().replace(/-/g, '');
}

/**
 * Menghasilkan Hash SHA-256 dengan Salt menggunakan Utilities.computeDigest
 * @param {string} password - Password mentah
 * @param {string} salt - Salt unik pengguna
 * @returns {string} Hash SHA-256 heksadesimal
 */
function hashPasswordWithSalt(password, salt) {
  var saltedInput = password + "::" + salt;
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, saltedInput, Utilities.Charset.UTF_8);
  var txtHash = "";
  for (var i = 0; i < rawHash.length; i++) {
    var byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    var byteStr = byteVal.toString(16);
    if (byteStr.length === 1) byteStr = "0" + byteStr;
    txtHash += byteStr;
  }
  return txtHash;
}
