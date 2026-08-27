/**
 * Unit Test & Verification Suite untuk Security Baseline Control (POL.ISMS.001)
 * Dapat dijalankan dari Apps Script Editor maupun CLI
 */

function runAllSecurityTests() {
  var results = [];

  function assert(testName, condition, details) {
    if (condition) {
      results.push({ name: testName, passed: true });
      Logger.log("✅ PASS: " + testName);
    } else {
      results.push({ name: testName, passed: false, details: details });
      Logger.log("❌ FAIL: " + testName + " -> " + details);
    }
  }

  Logger.log("=== MEMULAI TEST SECURITY BASELINE CONTROL (POL.ISMS.001) ===");

  // 1. Test Config Integrity
  assert(
    "CONFIG Object Loaded Properly",
    typeof CONFIG === "object" && CONFIG.SECURITY && CONFIG.SECURITY.MAX_FAILED_ATTEMPTS === 10,
    "CONFIG structure is invalid"
  );

  // 2. Test Input Sanitization
  var maliciousXSS = "<script>alert('xss')</script>&test=1";
  var cleaned = sanitizeString(maliciousXSS);
  assert(
    "Sanitize String XSS Prevention",
    cleaned.indexOf("<script>") === -1 && cleaned.indexOf("&lt;script&gt;") !== -1,
    "XSS tags were not properly escaped: " + cleaned
  );

  var complexObj = {
    name: "<b>Admin</b>",
    items: ["<img src=x onerror=alert(1)>", "valid_text"]
  };
  var cleanComplex = sanitizeInput(complexObj);
  assert(
    "Sanitize Deep Object/Array Prevention",
    cleanComplex.name === "&lt;b&gt;Admin&lt;&#x2F;b&gt;" && cleanComplex.items[0].indexOf("<img") === -1,
    "Deep sanitization failed"
  );

  // 3. Test Email Validation
  assert("Valid Email Accepted", isValidEmail("user@perusahaan.com") === true, "Valid email failed");
  assert("Invalid Email Rejected", isValidEmail("invalid-email@") === false, "Invalid email passed");

  // 4. Test Password Policy Validation
  var weakPass = "password";
  var userValidPass = "Secret@2026";
  var adminShortPass = "Secret@2026"; // 11 chars (admin needs min 14)
  var adminValidPass = "SuperSecretAdmin#2026!";

  assert("Weak Password Rejected", validatePasswordPolicy(weakPass, false).valid === false, "Weak password passed");
  assert("User Strong Password Accepted", validatePasswordPolicy(userValidPass, false).valid === true, "User valid password failed");
  assert("Admin Short Password Rejected", validatePasswordPolicy(adminShortPass, true).valid === false, "Admin short password passed");
  assert("Admin Strong Password Accepted", validatePasswordPolicy(adminValidPass, true).valid === true, "Admin valid password failed");

  // 5. Test Cryptographic Salt & Hash
  var salt1 = generateSalt();
  var salt2 = generateSalt();
  assert("Salt Generation Unique", salt1 !== salt2 && salt1.length > 10, "Salt generation failed");

  var hash1 = hashPasswordWithSalt("MyPass@123", salt1);
  var hash2 = hashPasswordWithSalt("MyPass@123", salt1);
  var hashDiffSalt = hashPasswordWithSalt("MyPass@123", salt2);

  assert("Hash Output Deterministic", hash1 === hash2, "Identical inputs produced different hashes");
  assert("Different Salt Produces Different Hash", hash1 !== hashDiffSalt, "Different salts produced same hash");

  // 6. Test Sensitive Data Masking Interceptor
  var sensitivePayload = {
    userId: "usr_123",
    email: "test@example.com",
    password: "SuperSecretPassword123!",
    nested: {
      pin: "123456",
      token: "xyz_token_secret",
      publicInfo: "visible"
    }
  };
  var masked = sanitizeLogData_(sensitivePayload);
  assert(
    "Sensitive Masking Password, PIN, Token Redacted",
    masked.password === "[REDACTED]" && 
    masked.nested.pin === "[REDACTED]" && 
    masked.nested.token === "[REDACTED]" && 
    masked.nested.publicInfo === "visible",
    "Sensitive data was not properly masked: " + JSON.stringify(masked)
  );

  // 7. Test Error Handling Standardization
  var successResp = formatSuccessResponse({ sample: 123 }, "OK");
  assert(
    "Success Response Standard Format",
    successResp.success === true && successResp.data.sample === 123,
    "Success response format invalid"
  );

  var errorResp = formatErrorResponse("Contoh error", CONFIG.ERROR_CODES.UNAUTHORIZED);
  assert(
    "Error Response Standard Format",
    errorResp.success === false && errorResp.error.code === CONFIG.ERROR_CODES.UNAUTHORIZED,
    "Error response format invalid"
  );

  var totalPassed = results.filter(function(r) { return r.passed; }).length;
  Logger.log("=== HASIL PENGUJIAN: " + totalPassed + "/" + results.length + " LULUS ===");

  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    details: results
  };
}
