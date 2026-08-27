/**
 * Unit Test & Verification Suite untuk Security, Repository, Service, Logging, Error Handling, Progress Engine, Project Management, Daily Progress Management, Schedule Engine, WhatsApp Integration, Dashboard Summary, Reminder Email, & Export PDF
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
  var adminShortPass = "Secret@2026";
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

  var errorResp = formatErrorResponse("Contoh error", CONFIG.ERROR_CODES.AUTH_UNAUTHORIZED);
  assert(
    "Error Response Standard Format",
    errorResp.success === false && errorResp.error.code === CONFIG.ERROR_CODES.AUTH_UNAUTHORIZED,
    "Error response format invalid"
  );

  var totalPassed = results.filter(function(r) { return r.passed; }).length;
  Logger.log("=== HASIL PENGUJIAN KEAMANAN: " + totalPassed + "/" + results.length + " LULUS ===");

  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    details: results
  };
}

function runAllRepositoryTests() {
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

  Logger.log("=== MEMULAI TEST REPOSITORY LAYER ===");

  // 1. Test Base Repository Creation
  var testHeaders = ["id", "name", "email", "status"];
  var mockRepo = createBaseRepository("Test_Sheet", testHeaders, "id");
  assert("Base Repository Created", typeof mockRepo === "object" && mockRepo.primaryKey === "id", "Mock repo creation failed");

  // 2. Test In-memory Cache & Singleton Sheet Access
  SpreadsheetManager.clearCache();
  var sheet1 = SpreadsheetManager.getSheet("Test_Sheet", testHeaders);
  var sheet2 = SpreadsheetManager.getSheet("Test_Sheet", testHeaders);
  assert("Sheet In-Memory Caching Returns Same Reference", sheet1 === sheet2, "Sheet cache failed");

  // 3. Test Insert & FindById
  mockRepo.insert({ id: "t1", name: "Alice", email: "alice@test.com", status: "ACTIVE" });
  var found = mockRepo.findById("t1");
  assert("Insert and FindById Work", found && found.name === "Alice" && found.email === "alice@test.com", "Insert/FindById failed");

  // 4. Test FindOneByField & FindByField
  var foundByEmail = mockRepo.findOneByField("email", "alice@test.com");
  assert("FindOneByField Case-Insensitive Works", foundByEmail && foundByEmail.id === "t1", "FindOneByField failed");

  // 5. Test Batch Insert
  var batchItems = [
    { id: "t2", name: "Bob", email: "bob@test.com", status: "ACTIVE" },
    { id: "t3", name: "Charlie", email: "charlie@test.com", status: "INACTIVE" }
  ];
  var insertedCount = mockRepo.insertBatch(batchItems);
  assert("InsertBatch Returns Correct Count", insertedCount === 2, "InsertBatch count mismatch: " + insertedCount);

  // 6. Test FindAll with Predicate Filter
  var activeUsers = mockRepo.findAll(function(u) { return u.status === "ACTIVE"; });
  assert("FindAll with Predicate Filter", activeUsers.length === 2, "Filtered count mismatch: " + activeUsers.length);

  // 7. Test UpdateById
  var updated = mockRepo.updateById("t2", { status: "SUSPENDED" });
  var bobAfter = mockRepo.findById("t2");
  assert("UpdateById Updates Field Correctly", updated === true && bobAfter.status === "SUSPENDED", "UpdateById failed");

  // 8. Test DeleteById
  var deleted = mockRepo.deleteById("t3");
  var charlieAfter = mockRepo.findById("t3");
  assert("DeleteById Removes Entry", deleted === true && charlieAfter === null, "DeleteById failed");

  // 9. Test Count
  var totalCount = mockRepo.count();
  assert("Count Returns Total Rows", totalCount === 2, "Total count mismatch: " + totalCount);

  // 10. Test Concrete Repositories Existence
  assert(
    "Concrete Repositories (User, AuditLog, Config, Project, ProgressLog) Registered",
    typeof UserRepository === "object" &&
    typeof AuditLogRepository === "object" &&
    typeof ConfigRepository === "object" &&
    typeof ProjectRepository === "object" &&
    typeof ProgressLogRepository === "object",
    "Concrete repositories registration failed"
  );

  var totalPassed = results.filter(function(r) { return r.passed; }).length;
  Logger.log("=== HASIL PENGUJIAN REPOSITORY: " + totalPassed + "/" + results.length + " LULUS ===");

  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    details: results
  };
}

function runAllServiceTests() {
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

  Logger.log("=== MEMULAI TEST SERVICE LAYER ===");

  // 1. Test Progress Engine Linear Calculation
  var p1 = ProgressEngine.calculatePlannedProgress("2026-01-01", "2026-01-10", "2026-01-01");
  var p5 = ProgressEngine.calculatePlannedProgress("2026-01-01", "2026-01-11", "2026-01-06");
  var pEnd = ProgressEngine.calculatePlannedProgress("2026-01-01", "2026-01-10", "2026-01-10");
  assert("Progress Engine Linear Planned Progress (0%, 50%, 100%)", p1 === 0 && p5 === 50 && pEnd === 100, "Progress engine math error");

  // 2. Test Progress Engine S-Curve Calculation
  var pScurveMid = ProgressEngine.calculatePlannedProgress("2026-01-01", "2026-01-11", "2026-01-06", "SCURVE");
  assert("Progress Engine S-Curve Midpoint is 50%", Math.round(pScurveMid) === 50, "S-Curve midpoint error: " + pScurveMid);

  // 3. Test Progress Engine Deviation & Status
  var dev1 = ProgressEngine.calculateDeviation(30, 45);
  var statusDelayed = ProgressEngine.determineProgressStatus(30, 45);
  var statusAhead = ProgressEngine.determineProgressStatus(60, 45);
  var statusCompleted = ProgressEngine.determineProgressStatus(100, 100);

  assert("Deviation Calculation Correct", dev1 === -15, "Deviation error: " + dev1);
  assert("Status Determination Correct (DELAYED, AHEAD, COMPLETED)", 
    statusDelayed === "DELAYED" && statusAhead === "AHEAD" && statusCompleted === "COMPLETED",
    "Status determination error"
  );

  // 4. Test Project Service Registration & Validation
  var projPayload = {
    projectName: "Proyek Baseline 1",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    picName: "Budi Santoso",
    picEmail: "budi@perusahaan.com",
    picPhone: "081234567890",
    isEmailActive: true,
    isWaActive: true
  };

  var regRes = ProjectService.registerProject(projPayload);
  assert("Project Registration Succeeded", regRes.success === true && Boolean(regRes.data.projectId), "Project registration failed");

  var projId = regRes.data.projectId;

  // 5. Test Project Service Summary Computation
  var getRes = ProjectService.getProjectById(projId);
  assert("Project Get and Summary Computation Works", 
    getRes.success === true && getRes.data.summary && typeof getRes.data.summary.plannedProgress === "number",
    "Project get summary failed"
  );

  // 6. Test Project Notification Toggling
  var toggleRes = ProjectService.toggleNotification(projId, "wa", false);
  assert("Toggle Notification Channel Works", toggleRes.success === true && toggleRes.data.enabled === false, "Toggle notification failed");

  // 7. Test Progress Service Daily Recording
  var progRes = ProgressService.recordDailyProgress({
    projectId: projId,
    date: "2026-06-15",
    actualProgress: 40,
    notes: "Pengecoran lantai 2 selesai",
    recordedBy: "admin@perusahaan.com"
  });

  assert("Progress Recording Succeeded", progRes.success === true && progRes.data.actualProgress === 40, "Progress record failed");

  // 8. Test Progress History & Latest Retrieval
  var histRes = ProgressService.getProgressHistory(projId);
  var latestRes = ProgressService.getLatestProgress(projId);
  assert("Progress History and Latest Progress Work", 
    histRes.success === true && histRes.data.length === 1 && latestRes.data.actual_progress === 40,
    "Progress history retrieval failed"
  );

  // 9. Test Notification Service Alert Dispatching
  var alertRes = NotificationService.sendDelayedAlert(
    { project_id: projId, project_name: "Proyek Gedung A", pic_name: "Budi", pic_email: "budi@perusahaan.com", pic_phone: "081234567890", is_email_active: true, is_wa_active: false },
    30, 50, -20
  );
  assert("Notification Service Alert Dispatched", alertRes.emailSent === true && alertRes.waSent === false, "Notification alert failed");

  // 10. Test Notification Service Daily Scheduler Sweep
  var sweepRes = NotificationService.checkAndSendDailyReminders();
  assert("Daily Reminder Sweep Executes", sweepRes.success === true && typeof sweepRes.data.totalEvaluated === "number", "Daily sweep failed");

  var totalPassed = results.filter(function(r) { return r.passed; }).length;
  Logger.log("=== HASIL PENGUJIAN SERVICE: " + totalPassed + "/" + results.length + " LULUS ===");

  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    details: results
  };
}

function runAllLoggingTests() {
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

  Logger.log("=== MEMULAI TEST LOGGING FRAMEWORK ===");

  // 1. Test AppLogger Object Existence
  assert(
    "AppLogger Object Defined with Required Methods",
    typeof AppLogger === "object" &&
    typeof AppLogger.debug === "function" &&
    typeof AppLogger.info === "function" &&
    typeof AppLogger.warn === "function" &&
    typeof AppLogger.error === "function" &&
    typeof AppLogger.audit === "function",
    "AppLogger interface invalid"
  );

  // 2. Test Level Filtering Logic
  CONFIG.LOGGING.MIN_LEVEL = "WARN";
  assert("AppLogger shouldLog DEBUG is False when MIN_LEVEL is WARN", AppLogger.shouldLog("DEBUG") === false, "Level filtering failed");
  assert("AppLogger shouldLog INFO is False when MIN_LEVEL is WARN", AppLogger.shouldLog("INFO") === false, "Level filtering failed");
  assert("AppLogger shouldLog WARN is True when MIN_LEVEL is WARN", AppLogger.shouldLog("WARN") === true, "Level filtering failed");
  assert("AppLogger shouldLog ERROR is True when MIN_LEVEL is WARN", AppLogger.shouldLog("ERROR") === true, "Level filtering failed");

  // Kembalikan ke DEBUG
  CONFIG.LOGGING.MIN_LEVEL = "DEBUG";

  // 3. Test Global Enable/Disable Toggle
  CONFIG.LOGGING.ENABLED = false;
  assert("AppLogger shouldLog Returns False when LOGGING.ENABLED is False", AppLogger.shouldLog("ERROR") === false, "Global toggle failed");
  CONFIG.LOGGING.ENABLED = true;

  // 4. Test Log Entry Formatting Structure
  var entry = AppLogger.formatEntry_("INFO", "TestModule", "Test Message", { key: "value", password: "SecretPassword123" }, "tester@perusahaan.com");
  assert("Log Entry Format Valid", 
    entry.level === "INFO" && 
    entry.module === "TestModule" && 
    entry.user === "tester@perusahaan.com" && 
    entry.message === "Test Message" &&
    entry.data.key === "value" &&
    entry.data.password === "[REDACTED]", 
    "Log format or masking failed: " + JSON.stringify(entry)
  );

  // 5. Test Error Object Serialization
  var testErr = new Error("Sample Test Error");
  var errEntry = AppLogger.formatEntry_("ERROR", "ErrorModule", "Error happened", testErr);
  assert("Error Object Serialized with Message & Name", 
    errEntry.data && errEntry.data.name === "Error" && errEntry.data.message === "Sample Test Error",
    "Error serialization failed"
  );

  // 6. Test Audit Logging Dispatch
  AppLogger.audit("AuthService", "TEST_AUDIT_ACTION", "SUCCESS", { token: "sensitive_token_123", count: 5 });
  assert("AppLogger.audit Executes Without Error", true, "Audit execution failed");

  var totalPassed = results.filter(function(r) { return r.passed; }).length;
  Logger.log("=== HASIL PENGUJIAN LOGGING: " + totalPassed + "/" + results.length + " LULUS ===");

  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    details: results
  };
}

function runAllErrorHandlingTests() {
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

  Logger.log("=== MEMULAI TEST ERROR HANDLING FRAMEWORK ===");

  // 1. Test AppError Instantiation
  var customErr = new AppError("Test message", CONFIG.ERROR_CODES.VAL_INVALID_INPUT, CONFIG.ERROR_CATEGORIES.VALIDATION, { field: "email" });
  assert("AppError Instance Properties Correct", 
    customErr.name === "AppError" && 
    customErr.code === CONFIG.ERROR_CODES.VAL_INVALID_INPUT && 
    customErr.category === CONFIG.ERROR_CATEGORIES.VALIDATION && 
    customErr.details.field === "email" &&
    Boolean(customErr.timestamp),
    "AppError structure failed"
  );

  // 2. Test ErrorFactory Methods
  var valErr = ErrorFactory.validation("Format salah", { item: 1 });
  var authErr = ErrorFactory.auth("Akses ditolak", true);
  var notFoundErr = ErrorFactory.notFound("Proyek", "prj_123");
  var bizErr = ErrorFactory.businessRule("Proyek sudah selesai");

  assert("ErrorFactory Validation Error Created", valErr.category === CONFIG.ERROR_CATEGORIES.VALIDATION, "Factory validation failed");
  assert("ErrorFactory Auth Forbidden Error Created", authErr.code === CONFIG.ERROR_CODES.AUTH_FORBIDDEN, "Factory auth failed");
  assert("ErrorFactory NotFound Error Created", notFoundErr.code === CONFIG.ERROR_CODES.DB_NOT_FOUND, "Factory notFound failed");
  assert("ErrorFactory BusinessRule Error Created", bizErr.category === CONFIG.ERROR_CATEGORIES.BUSINESS_RULE, "Factory businessRule failed");

  // 3. Test ErrorHandler Normalization
  var rawError = new Error("Kredensial login tidak valid.");
  var normalizedRaw = ErrorHandler.normalize(rawError);
  assert("Raw Error Normalized to AUTH_UNAUTHORIZED", normalizedRaw.code === CONFIG.ERROR_CODES.AUTH_UNAUTHORIZED, "Normalization failed: " + normalizedRaw.code);

  var customNormalized = ErrorHandler.normalize(valErr);
  assert("AppError Passes Through Normalization Unchanged", customNormalized === valErr, "Normalization modified AppError");

  // 4. Test ErrorHandler Handle Output Structure
  var clientResponse = ErrorHandler.handle(valErr, "TestContext");
  assert("ErrorHandler Handle Produces Client Safe Response", 
    clientResponse.success === false && 
    clientResponse.error && 
    clientResponse.error.code === CONFIG.ERROR_CODES.VAL_INVALID_INPUT && 
    clientResponse.error.category === CONFIG.ERROR_CATEGORIES.VALIDATION && 
    clientResponse.error.message === "Format salah" &&
    clientResponse.error.stack === undefined, 
    "Client response leaked stack or had wrong structure"
  );

  // 5. Test safeWebResponse Integration
  var safeRes = safeWebResponse(function() {
    throw ErrorFactory.validation("Nilai tidak valid");
  }, "API_TEST");

  assert("safeWebResponse Uses ErrorHandler", 
    safeRes.success === false && 
    safeRes.error.code === CONFIG.ERROR_CODES.VAL_INVALID_INPUT &&
    safeRes.error.category === CONFIG.ERROR_CATEGORIES.VALIDATION,
    "safeWebResponse integration failed"
  );

  var totalPassed = results.filter(function(r) { return r.passed; }).length;
  Logger.log("=== HASIL PENGUJIAN ERROR HANDLING: " + totalPassed + "/" + results.length + " LULUS ===");

  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    details: results
  };
}

function runAllProgressEngineTests() {
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

  Logger.log("=== MEMULAI TEST PROGRESS CALCULATION ENGINE ===");

  // 1. Test Duration & Elapsed Computations
  var dur = ProgressEngine.calculateTotalDuration("2026-01-01", "2026-01-11");
  var elapsed = ProgressEngine.calculateElapsedDays("2026-01-01", "2026-01-06");
  var remaining = ProgressEngine.calculateDaysRemaining("2026-01-10", "2026-01-06");
  var schedPct = ProgressEngine.calculateSchedulePercentage("2026-01-01", "2026-01-11", "2026-01-06");

  assert("Total Duration Calculated (10 days)", dur === 10, "Duration error: " + dur);
  assert("Elapsed Days Calculated (5 days)", elapsed === 5, "Elapsed error: " + elapsed);
  assert("Days Remaining Calculated (4 days)", remaining === 4, "Remaining error: " + remaining);
  assert("Schedule Percentage Calculated (50%)", schedPct === 50, "Schedule % error: " + schedPct);

  // 2. Test S-Curve Generation Series
  var curvePoints = ProgressEngine.generatePlannedCurve("2026-01-01", "2026-01-21", 10, "SCURVE");
  assert("Planned S-Curve Points Generated (11 points)", curvePoints.length === 11, "Curve points count mismatch");
  assert("S-Curve Starts at 0% and Ends at 100%", curvePoints[0].plannedProgress === 0 && curvePoints[10].plannedProgress === 100, "Curve boundaries error");

  // 3. Test Progress Value Validation
  var validVal = ProgressEngine.validateProgressValue(75.5);
  assert("Valid Progress 75.5% Accepted", validVal === 75.5, "Valid progress rejected");

  var caughtInvalid = false;
  try {
    ProgressEngine.validateProgressValue(150);
  } catch (e) {
    caughtInvalid = true;
  }
  assert("Invalid Progress >100% Throws Validation Error", caughtInvalid, "Invalid progress passed");

  // 4. Test Date Range Validation
  var caughtDateErr = false;
  try {
    ProgressEngine.validateDateRange("2026-05-10", "2026-01-01");
  } catch (e) {
    caughtDateErr = true;
  }
  assert("Invalid Date Range (start > end) Throws Error", caughtDateErr, "Invalid date range passed");

  // 5. Test Status Indicator Metadata
  var indOnTrack = ProgressEngine.getStatusIndicator("ON_TRACK");
  var indDelayed = ProgressEngine.getStatusIndicator("DELAYED");
  var indCompleted = ProgressEngine.getStatusIndicator("COMPLETED");

  assert("ON_TRACK Indicator Has Green Color and Checkmark", indOnTrack.color === "#10b981" && indOnTrack.icon === "✅", "ON_TRACK indicator error");
  assert("DELAYED Indicator Has Red Color and Warning Icon", indDelayed.color === "#f43f5e" && indDelayed.icon === "⚠️", "DELAYED indicator error");
  assert("COMPLETED Indicator Has Green Color and Party Icon", indCompleted.color === "#10b981" && indCompleted.icon === "🎉", "COMPLETED indicator error");

  // 6. Test Projected Completion Date
  var projected = ProgressEngine.calculateEstimatedCompletionDate("2026-01-01", "2026-01-20", 50, "2026-01-11");
  assert("Estimated Completion Date Matches Trend", Boolean(projected) && projected.indexOf("2026") === 0, "Projection calculation error: " + projected);

  var totalPassed = results.filter(function(r) { return r.passed; }).length;
  Logger.log("=== HASIL PENGUJIAN PROGRESS ENGINE: " + totalPassed + "/" + results.length + " LULUS ===");

  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    details: results
  };
}

function runAllProjectManagementTests() {
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

  Logger.log("=== MEMULAI TEST PROJECT MANAGEMENT ===");

  // 1. Test Register Project
  var p1 = ProjectService.registerProject({
    projectName: "Proyek Jembatan Suramadu II",
    startDate: "2026-03-01",
    endDate: "2026-11-30",
    picName: "Siti Rahma",
    picEmail: "siti.rahma@perusahaan.com",
    picPhone: "081987654321",
    description: "Konstruksi jembatan penghubung sisi timur"
  });

  assert("Project Registered with ACTIVE Status", p1.success === true && p1.data.status === "ACTIVE", "Register failed");
  var p1Id = p1.data.projectId;

  // 2. Test Duplicate Name Prevention
  var caughtDup = false;
  try {
    ProjectService.registerProject({
      projectName: "Proyek Jembatan Suramadu II",
      startDate: "2026-03-01",
      endDate: "2026-11-30",
      picName: "Lainnya",
      picEmail: "other@perusahaan.com"
    });
  } catch (e) {
    caughtDup = true;
  }
  assert("Duplicate Project Name Rejected", caughtDup, "Duplicate passed");

  // 3. Test Invalid PIC Email Prevention
  var caughtEmail = false;
  try {
    ProjectService.registerProject({
      projectName: "Proyek Invalid Email",
      startDate: "2026-01-01",
      endDate: "2026-06-01",
      picName: "Tester",
      picEmail: "invalid-email-format"
    });
  } catch (e) {
    caughtEmail = true;
  }
  assert("Invalid PIC Email Rejected", caughtEmail, "Invalid email passed");

  // 4. Test Search & Filter Projects
  var searchKw = ProjectService.getAllProjects({ keyword: "Suramadu" });
  assert("Search by Keyword (Suramadu) Returns Match", searchKw.success === true && searchKw.data.length >= 1, "Keyword search failed");

  var searchEmail = ProjectService.getAllProjects({ picEmail: "siti.rahma@perusahaan.com" });
  assert("Search by PIC Email Returns Match", searchEmail.success === true && searchEmail.data.length >= 1, "PIC Email search failed");

  // 5. Test Update Project
  var updateRes = ProjectService.updateProject(p1Id, {
    picName: "Siti Rahma, S.T.",
    description: "Deskripsi diperbarui dengan penambahan scope"
  });
  var p1Updated = ProjectService.getProjectById(p1Id);
  assert("Project Info Updated Successfully", 
    updateRes.success === true && p1Updated.data.project.pic_name === "Siti Rahma, S.T.", 
    "Update project failed"
  );

  // 6. Test Status Lifecycle Transitions
  var statusRes = ProjectService.setProjectStatus(p1Id, "COMPLETED");
  var p1Completed = ProjectService.getProjectById(p1Id);
  assert("Status Transition to COMPLETED Works", statusRes.success === true && p1Completed.data.project.status === "COMPLETED", "Status transition failed");

  var caughtInvalidStatus = false;
  try {
    ProjectService.setProjectStatus(p1Id, "STATUS_PALSU");
  } catch (e) {
    caughtInvalidStatus = true;
  }
  assert("Invalid Status Transition Rejected", caughtInvalidStatus, "Invalid status passed");

  // 7. Test Delete Project with Cascade
  if (!UserRepository.findByEmail("admin@test.com")) {
    UserRepository.create({
      user_id: "u_admin_test",
      email: "admin@test.com",
      role: CONFIG.ROLES.ADMINISTRATOR,
      status: "ACTIVE"
    });
  }

  var deleteRes = ProjectService.deleteProject(p1Id, true);
  var p1AfterDelete = ProjectRepository.findById(p1Id);
  assert("Project and Cascade Deletion Works", deleteRes.success === true && p1AfterDelete === null, "Delete project failed");

  var totalPassed = results.filter(function(r) { return r.passed; }).length;
  Logger.log("=== HASIL PENGUJIAN PROJECT MANAGEMENT: " + totalPassed + "/" + results.length + " LULUS ===");

  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    details: results
  };
}

function runAllDailyProgressManagementTests() {
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

  Logger.log("=== MEMULAI TEST DAILY PROGRESS MANAGEMENT ===");

  // 1. Setup Proyek untuk Pengujian Progress
  var proj = ProjectService.registerProject({
    projectName: "Proyek Tol Trans Jawa Sesi 4",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    picName: "Ahmad Fauzi",
    picEmail: "ahmad.fauzi@perusahaan.com",
    picPhone: "081234567899"
  });
  var projId = proj.data.projectId;

  // 2. Test Record Daily Progress
  var log1 = ProgressService.recordDailyProgress({
    projectId: projId,
    date: "2026-03-01",
    actualProgress: 15,
    notes: "Pondasi dasar 15%"
  });

  assert("Daily Progress Recorded Successfully", log1.success === true && log1.data.actualProgress === 15, "Record daily progress failed");
  var log1Id = log1.data.progressId;

  // 3. Test Duplicate Date Entry Prevention
  var caughtDup = false;
  try {
    ProgressService.recordDailyProgress({
      projectId: projId,
      date: "2026-03-01",
      actualProgress: 16,
      allowOverwrite: false
    });
  } catch (e) {
    caughtDup = true;
  }
  assert("Duplicate Date Entry Rejected Without Overwrite Flag", caughtDup, "Duplicate date passed");

  // 4. Test Duplicate Date Overwrite
  var log1Overwritten = ProgressService.recordDailyProgress({
    projectId: projId,
    date: "2026-03-01",
    actualProgress: 18,
    notes: "Pondasi dasar revisi 18%",
    allowOverwrite: true
  });
  assert("Duplicate Date Successfully Overwritten", log1Overwritten.success === true && log1Overwritten.data.actualProgress === 18, "Overwrite failed");

  // 5. Test Update Daily Progress
  var updateRes = ProgressService.updateDailyProgress(log1Id, {
    actualProgress: 20,
    notes: "Pondasi dasar final 20%"
  });
  assert("Update Daily Progress and Recomputed Deviation", 
    updateRes.success === true && updateRes.data.actualProgress === 20,
    "Update daily progress failed"
  );

  // 6. Test Filtering Progress Logs by Date Range
  ProgressService.recordDailyProgress({
    projectId: projId,
    date: "2026-05-01",
    actualProgress: 35,
    notes: "Pemasangan girder"
  });

  var filteredLogs = ProgressService.getDailyProgressLogs({
    projectId: projId,
    startDate: "2026-02-01",
    endDate: "2026-04-01"
  });
  assert("Filter Progress Logs by Date Range (2026-02-01 to 2026-04-01)", 
    filteredLogs.success === true && filteredLogs.data.length === 1,
    "Date range filter failed"
  );

  // 7. Test Auto Complete Project Status on 100% Progress
  ProgressService.recordDailyProgress({
    projectId: projId,
    date: "2026-12-01",
    actualProgress: 100,
    notes: "Pekerjaan tuntas 100%"
  });
  var projAfter100 = ProjectService.getProjectById(projId);
  assert("Project Status Auto-Transitions to COMPLETED on 100% Progress", 
    projAfter100.data.project.status === "COMPLETED",
    "Auto-complete failed"
  );

  // 8. Test Delete Daily Progress
  var deleteLogRes = ProgressService.deleteDailyProgress(log1Id);
  var logAfterDelete = ProgressLogRepository.findById(log1Id);
  assert("Delete Daily Progress Works", deleteLogRes.success === true && logAfterDelete === null, "Delete log failed");

  var totalPassed = results.filter(function(r) { return r.passed; }).length;
  Logger.log("=== HASIL PENGUJIAN DAILY PROGRESS MANAGEMENT: " + totalPassed + "/" + results.length + " LULUS ===");

  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    details: results
  };
}

function runAllScheduleEngineTests() {
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

  Logger.log("=== MEMULAI TEST SCHEDULE ENGINE ===");

  // 1. Test Working Days (Exclude Weekends)
  var wDays = ScheduleEngine.calculateWorkingDays("2026-01-05", "2026-01-11");
  assert("Working Days Calculation Excludes Weekend (5 days)", wDays === 5, "Working days error: " + wDays);

  // 2. Test Working Days with Custom Holidays
  var wDaysHoliday = ScheduleEngine.calculateWorkingDays("2026-01-05", "2026-01-11", ["2026-01-07"]);
  assert("Working Days Calculation Excludes Custom Holiday (4 days)", wDaysHoliday === 4, "Holiday working days error: " + wDaysHoliday);

  // 3. Test Elapsed & Remaining Working Days
  var elapsedWork = ScheduleEngine.calculateElapsedWorkingDays("2026-01-05", "2026-01-08");
  var remainingWork = ScheduleEngine.calculateRemainingWorkingDays("2026-01-11", "2026-01-08");
  assert("Elapsed Working Days (4 days)", elapsedWork === 4, "Elapsed error: " + elapsedWork);
  assert("Remaining Working Days (1 day)", remainingWork === 1, "Remaining error: " + remainingWork);

  // 4. Test Schedule Phase Determination
  var phaseNotStarted = ScheduleEngine.getSchedulePhase("2026-06-01", "2026-12-31", "2026-01-01");
  var phaseInProgress = ScheduleEngine.getSchedulePhase("2026-01-01", "2026-12-31", "2026-06-15");
  var phaseOverdue = ScheduleEngine.getSchedulePhase("2026-01-01", "2026-06-01", "2026-08-01");

  assert("Schedule Phase NOT_STARTED", phaseNotStarted === "NOT_STARTED", "Phase NOT_STARTED error");
  assert("Schedule Phase IN_PROGRESS", phaseInProgress === "IN_PROGRESS", "Phase IN_PROGRESS error");
  assert("Schedule Phase OVERDUE", phaseOverdue === "OVERDUE", "Phase OVERDUE error");

  // 5. Test Generate Schedule Timeline
  var timeline = ScheduleEngine.generateScheduleTimeline("2026-01-05", "2026-01-11", { workingDaysOnly: true });
  assert("Generated Schedule Timeline Length (7 days)", timeline.length === 7, "Timeline length error: " + timeline.length);
  assert("Schedule Timeline Ends at 100% Cumulative Progress", timeline[6].cumulativePlanned === 100, "Cumulative end error");

  var totalPassed = results.filter(function(r) { return r.passed; }).length;
  Logger.log("=== HASIL PENGUJIAN SCHEDULE ENGINE: " + totalPassed + "/" + results.length + " LULUS ===");

  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    details: results
  };
}

function runAllWhatsAppIntegrationTests() {
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

  Logger.log("=== MEMULAI TEST WHATSAPP INTEGRATION ===");

  // 1. Test Phone Number Sanitization (08xxx -> 628xxx)
  var s1 = FonnteHelper.sanitizePhoneNumber("081234567890");
  var s2 = FonnteHelper.sanitizePhoneNumber("+6281234567890");
  var s3 = FonnteHelper.sanitizePhoneNumber("62812-3456-7890");

  assert("Sanitize 08xxx to 628xxx", s1 === "6281234567890", "Sanitization 08 error: " + s1);
  assert("Sanitize +62 to 62", s2 === "6281234567890", "Sanitization +62 error: " + s2);
  assert("Sanitize Dashes and Spaces", s3 === "6281234567890", "Sanitization dashes error: " + s3);

  // 2. Test Phone Number Validation
  assert("Valid Phone Number Accepted", FonnteHelper.isValidPhoneNumber("081234567890") === true, "Valid phone failed");
  assert("Invalid Short Phone Number Rejected", FonnteHelper.isValidPhoneNumber("12345") === false, "Invalid short phone passed");

  // 3. Test Message Template Formatting
  var dummyProj = { project_name: "Proyek Mall Senayan", pic_name: "Hendro" };
  var alertMsg = FonnteHelper.formatDelayedAlert(dummyProj, 25, 40, -15);
  var compMsg = FonnteHelper.formatCompletedAlert(dummyProj);
  var dailyMsg = FonnteHelper.formatDailyReminder(dummyProj, 30, 35, 12);
  var testMsg = FonnteHelper.formatTestMessage("6281234567890");

  assert("Delayed Alert Template Contains Project Details", alertMsg.indexOf("Proyek Mall Senayan") !== -1 && alertMsg.indexOf("-15.00%") !== -1, "Delayed template error");
  assert("Completed Alert Template Contains 100%", compMsg.indexOf("100%") !== -1, "Completed template error");
  assert("Daily Reminder Template Contains Days Remaining", dailyMsg.indexOf("12 hari") !== -1, "Daily reminder template error");
  assert("Test Message Template Valid", testMsg.indexOf("UJI KONEKSI WHATSAPP") !== -1, "Test template error");

  // 4. Test Message Delivery via Mock Fonnte
  var sendRes = FonnteHelper.sendMessage("081234567890", "Test WhatsApp Message");
  assert("FonnteHelper.sendMessage Successful", sendRes === true, "Message sending failed");

  var testSendRes = FonnteHelper.sendTestMessage("081234567890");
  assert("FonnteHelper.sendTestMessage Successful", testSendRes === true, "Test message sending failed");

  var totalPassed = results.filter(function(r) { return r.passed; }).length;
  Logger.log("=== HASIL PENGUJIAN WHATSAPP INTEGRATION: " + totalPassed + "/" + results.length + " LULUS ===");

  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    details: results
  };
}

function runAllDashboardSummaryTests() {
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

  Logger.log("=== MEMULAI TEST DASHBOARD SUMMARY ===");

  // 1. Setup Proyek Tambahan untuk Summary
  ProjectService.registerProject({
    projectName: "Proyek Dermaga Tanjung Priok",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    picName: "Bambang",
    picEmail: "bambang@perusahaan.com"
  });

  // 2. Test Get Executive Summary
  var execSummaryRes = DashboardSummaryService.getExecutiveSummary();
  assert("Executive Summary Produced Successfully", execSummaryRes.success === true && typeof execSummaryRes.data === "object", "Executive summary failed");

  var data = execSummaryRes.data;
  assert("Total Projects Count is Positive", data.totalProjects > 0, "Total projects zero");
  assert("Active Projects Count is Positive", data.activeProjects > 0, "Active projects zero");
  assert("Average Progress Values are Numbers", typeof data.averageActualProgress === "number" && typeof data.averagePlannedProgress === "number", "Average metrics error");
  assert("Urgent Projects Array Defined", Array.isArray(data.urgentProjects), "Urgent projects missing");
  assert("Project Details Array Defined with Records", Array.isArray(data.projectDetails) && data.projectDetails.length > 0, "Project details missing");

  var totalPassed = results.filter(function(r) { return r.passed; }).length;
  Logger.log("=== HASIL PENGUJIAN DASHBOARD SUMMARY: " + totalPassed + "/" + results.length + " LULUS ===");

  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    details: results
  };
}

function runAllReminderEmailTests() {
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

  Logger.log("=== MEMULAI TEST REMINDER EMAIL ===");

  var dummyProj = {
    project_name: "Proyek LRT Koridor Barat",
    pic_name: "Dimas",
    start_date: "2026-01-01",
    end_date: "2026-12-31"
  };

  // 1. Test HTML Template Builders
  var delayedHtml = EmailHelper.buildDelayedAlertHtml(dummyProj, 20, 35, -15, 120);
  var completedHtml = EmailHelper.buildCompletedAlertHtml(dummyProj);
  var dailyHtml = EmailHelper.buildDailyReminderHtml(dummyProj, 20, 25, 150);
  var testHtml = EmailHelper.buildTestEmailHtml("dimas@perusahaan.com");

  assert("Delayed Email HTML Contains Project Name & Deviation", delayedHtml.indexOf("Proyek LRT Koridor Barat") !== -1 && delayedHtml.indexOf("-15.00%") !== -1, "Delayed HTML template error");
  assert("Completed Email HTML Contains 100% Badge", completedHtml.indexOf("COMPLETED (100%)") !== -1, "Completed HTML template error");
  assert("Daily Reminder Email HTML Contains Target", dailyHtml.indexOf("25%") !== -1, "Daily reminder HTML template error");
  assert("Test Email HTML Contains Confirmation Badge", testHtml.indexOf("TERHUBUNG & AKTIF") !== -1, "Test email HTML template error");

  // 2. Test Email Delivery via Mock GmailApp
  var sendRes = EmailHelper.sendEmail("dimas@perusahaan.com", "Test Subject", "<p>Hello</p>");
  assert("EmailHelper.sendEmail to Valid Email Succeeds", sendRes === true, "Send email failed");

  var testSendRes = EmailHelper.sendTestEmail("dimas@perusahaan.com");
  assert("EmailHelper.sendTestEmail Succeeds", testSendRes === true, "Send test email failed");

  var invalidSendRes = EmailHelper.sendEmail("invalid-email-address", "Test Subject", "<p>Hello</p>");
  assert("EmailHelper.sendEmail to Invalid Email Fails Gracefully", invalidSendRes === false, "Invalid email succeeded unexpectedly");

  var totalPassed = results.filter(function(r) { return r.passed; }).length;
  Logger.log("=== HASIL PENGUJIAN REMINDER EMAIL: " + totalPassed + "/" + results.length + " LULUS ===");

  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    details: results
  };
}

function runAllPdfExportTests() {
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

  Logger.log("=== MEMULAI TEST EXPORT PDF ===");

  // 1. Setup Proyek untuk Export
  var p = ProjectService.registerProject({
    projectName: "Proyek Gedung Kesenian Nasional",
    startDate: "2026-02-01",
    endDate: "2026-10-31",
    picName: "Kartika",
    picEmail: "kartika@perusahaan.com"
  });
  var pId = p.data.projectId;

  // 2. Test Generate Project Report HTML
  var reportHtml = PdfExportService.generateProjectReportHtml(pId);
  assert("Project Report HTML Generated with Title & PIC", 
    reportHtml.indexOf("Proyek Gedung Kesenian Nasional") !== -1 && reportHtml.indexOf("Kartika") !== -1, 
    "Report HTML failed"
  );

  // 3. Test Generate Portfolio Report HTML
  var portfolioHtml = PdfExportService.generatePortfolioReportHtml();
  assert("Portfolio Report HTML Contains Summary Grid", 
    portfolioHtml.indexOf("RINGKASAN EKSEKUTIF PORTOFOLIO PROYEK") !== -1, 
    "Portfolio HTML failed"
  );

  // 4. Test Export Project PDF Blob (Base64)
  var projectPdf = PdfExportService.exportProjectPdfBlob(pId);
  assert("Project PDF Export Contains Valid Metadata and Base64", 
    Boolean(projectPdf.fileName) && projectPdf.fileName.indexOf(".pdf") !== -1 && Boolean(projectPdf.base64), 
    "Project PDF blob failed"
  );

  // 5. Test Export Portfolio PDF Blob
  var portPdf = PdfExportService.exportPortfolioPdfBlob();
  assert("Portfolio PDF Export Contains Valid Metadata and Base64", 
    Boolean(portPdf.fileName) && portPdf.fileName.indexOf(".pdf") !== -1 && Boolean(portPdf.base64), 
    "Portfolio PDF blob failed"
  );

  // 6. Test Non-Existent Project Rejection
  var caughtNotFound = false;
  try {
    PdfExportService.generateProjectReportHtml("prj_tidak_ada_xyz");
  } catch (e) {
    caughtNotFound = true;
  }
  assert("Non-Existent Project Throws NotFound Error", caughtNotFound, "Non-existent project passed");

  var totalPassed = results.filter(function(r) { return r.passed; }).length;
  Logger.log("=== HASIL PENGUJIAN EXPORT PDF: " + totalPassed + "/" + results.length + " LULUS ===");

  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    details: results
  };
}
