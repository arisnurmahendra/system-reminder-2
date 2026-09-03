/**
 * 🧩 Menu Toolbar Spreadsheet — System Reminder 2
 * Menyediakan akses cepat ke halaman Dev, Exec, GitHub,
 * dan pengelolaan Script Properties langsung dari toolbar Spreadsheet.
 * Mengikuti standar arsitektur & keamanan POL.ISMS.001
 */

// ─── Daftar Script Properties yang dapat dikonfigurasi ───────────────────────
var CONFIGURABLE_PROPERTIES = [
  { key: "SPREADSHEET_ID",  label: "🗂️  Spreadsheet ID",           sensitive: false },
  { key: "FONNTE_TOKEN",    label: "📲 Token Fonnte API",           sensitive: true  },
  { key: "GITHUB_URL",      label: "🐙 URL GitHub Repository",      sensitive: false },
  { key: "DEV_URL",         label: "🛠️  URL Halaman Dev",            sensitive: false },
  { key: "EXEC_URL",        label: "⚙️  URL Halaman Executions",     sensitive: false },
  { key: "MFA_STRICT_MODE", label: "🔐 Mode MFA Ketat (TRUE/FALSE)", sensitive: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. ENTRY POINT — Buat Menu saat Spreadsheet dibuka
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trigger otomatis GAS saat Spreadsheet dibuka.
 * Mendaftarkan menu "🚀 System Reminder" di toolbar.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu("🚀 System Reminder")
    .addItem("🛠️  Buka Halaman Dev",        "openDevPage")
    .addItem("⚙️  Buka Halaman Executions",  "openExecPage")
    .addItem("🐙 Buka GitHub Repository",   "openGitHubPage")
    .addSeparator()
    .addSubMenu(
      ui.createMenu("🔑 Script Properties")
        .addItem("📋 Lihat Semua Properties", "showAllProperties")
        .addItem("✏️  Ubah Satu Property",     "promptChangeProperty")
        .addItem("🗑️  Hapus Satu Property",    "promptDeleteProperty")
        .addSeparator()
        .addItem("📲 Set Token Fonnte API",    "promptSetFonnteToken")
        .addItem("🗂️  Set Spreadsheet ID",     "promptSetSpreadsheetId")
        .addItem("🔐 Toggle Mode MFA Ketat",  "toggleMfaStrictMode")
        .addSeparator()
        .addItem("⚙️ Setup Default Properties", "setupDefaultProperties")
        .addItem("⚠️ Revoke Google Permissions", "revokeScriptPermissions")
    )
    .addSeparator()
    .addSubMenu(
      ui.createMenu("⚙️ Pengujian & Dev")
        .addItem("🗃️  Inisialisasi Database", "menuInitializeDatabase")
        .addItem("🎲  Generate Data Dummy",  "menuGenerateDummyData")
    )
    .addSeparator()
    .addItem("ℹ️  Tentang Aplikasi",           "showAbout")
    .addToUi();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. NAVIGASI HALAMAN
// ─────────────────────────────────────────────────────────────────────────────

function openDevPage() {
  var url = PropertiesService.getScriptProperties().getProperty("DEV_URL")
    || "https://script.google.com/macros/s/AKfycbwIMbdRE_ArmSY-HuXpkb3RdnpVX0UlaNLBquK6llA/dev";
  openUrlInSidebar_("🛠️ Halaman Developer", url);
}

function openExecPage() {
  var url = PropertiesService.getScriptProperties().getProperty("EXEC_URL")
    || "https://script.google.com/macros/s/AKfycbwxuWaQc2KpdUj6adnAhqHhVuZoKD404KmTtiCCR490ClUq-sTGUqg_fU9Oz4G00PoW/exec";
  openUrlInSidebar_("⚙️ Halaman Executions", url);
}

function openGitHubPage() {
  var url = PropertiesService.getScriptProperties().getProperty("GITHUB_URL")
    || "https://github.com/";
  openUrlInSidebar_("🐙 GitHub Repository", url);
}

/**
 * Membuka URL di sidebar kanan Spreadsheet.
 * Karena iframe di-sandbox, tombol "Buka di Tab Baru" disediakan sebagai fallback.
 * @param {string} title  Judul sidebar
 * @param {string} url    URL tujuan
 */
function openUrlInSidebar_(title, url) {
  var safeUrl = url.replace(/"/g, "%22").replace(/'/g, "%27");
  var htmlContent =
    "<!DOCTYPE html><html><head>" +
    "<meta charset='utf-8'>" +
    "<style>" +
      "* { box-sizing: border-box; margin: 0; padding: 0; }" +
      "body { font-family: 'Google Sans', Arial, sans-serif; background: #0f172a; color: #e2e8f0; height: 100vh; display: flex; flex-direction: column; }" +
      ".header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 14px 18px; font-size: 14px; font-weight: 600; flex-shrink: 0; }" +
      ".toolbar { padding: 10px 12px; background: #1e293b; border-bottom: 1px solid #334155; flex-shrink: 0; }" +
      ".open-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #6366f1; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; text-decoration: none; transition: background 0.2s; }" +
      ".open-btn:hover { background: #4f46e5; }" +
      ".url-display { font-size: 10px; color: #64748b; margin-top: 6px; word-break: break-all; }" +
      "iframe { flex: 1; width: 100%; border: none; background: #1e293b; }" +
    "</style></head><body>" +
    "<div class='header'>" + title + "</div>" +
    "<div class='toolbar'>" +
      "<a class='open-btn' href='" + safeUrl + "' target='_blank'>🔗 Buka di Tab Baru</a>" +
      "<div class='url-display'>" + safeUrl + "</div>" +
    "</div>" +
    "<iframe src='" + safeUrl + "' sandbox='allow-scripts allow-same-origin allow-popups allow-forms'></iframe>" +
    "</body></html>";

  var sidebar = HtmlService.createHtmlOutput(htmlContent)
    .setTitle(title)
    .setWidth(480);
  SpreadsheetApp.getUi().showSidebar(sidebar);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PENGELOLAAN SCRIPT PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mengisi properti dengan nilai default jika kosong
 */
function setupDefaultProperties() {
  var props = PropertiesService.getScriptProperties();
  var defaults = {
    "SPREADSHEET_ID": "",
    "FONNTE_TOKEN": "",
    "GITHUB_URL": "https://github.com/arisnurmahendra/system-reminder-2",
    "DEV_URL": "https://script.google.com/macros/s/AKfycbwIMbdRE_ArmSY-HuXpkb3RdnpVX0UlaNLBquK6llA/dev",
    "EXEC_URL": "https://script.google.com/macros/s/AKfycbwxuWaQc2KpdUj6adnAhqHhVuZoKD404KmTtiCCR490ClUq-sTGUqg_fU9Oz4G00PoW/exec",
    "MFA_STRICT_MODE": "FALSE"
  };
  
  try {
    // Coba deteksi ID Spreadsheet jika script ini terikat (container-bound)
    defaults["SPREADSHEET_ID"] = SpreadsheetApp.getActiveSpreadsheet().getId();
  } catch (e) {
    // Abaikan jika standalone
  }
  
  var updated = 0;
  for (var key in defaults) {
    if (!props.getProperty(key)) {
      props.setProperty(key, defaults[key]);
      updated++;
    }
  }
  
  var ui = SpreadsheetApp.getUi();
  ui.alert("✅ Setup Selesai", updated + " properti default baru telah ditambahkan ke Script Properties.\n\nIni membantu memastikan backend dapat memuat data spreadsheet meskipun belum semua token diatur.", ui.ButtonSet.OK);
}

/**
 * Menganulir otorisasi dan mencabut hak akses yang diberikan ke script
 */
function revokeScriptPermissions() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.alert("Revoke Permissions", "PERINGATAN KRITIS:\n\nTindakan ini akan mencabut secara paksa semua akses Google (Spreadsheet, Gmail, dll) yang telah Anda berikan kepada Script ini.\n\nSetelah ini, eksekusi apapun akan gagal sampai Anda memberikan otorisasi ulang (authorization prompt).\n\nApakah Anda yakin ingin mencabut akses?", ui.ButtonSet.YES_NO);
  
  if (res === ui.Button.YES) {
    try {
      ScriptApp.invalidateAuth();
      ui.alert("Berhasil", "Semua izin akses skrip telah dicabut dengan sukses.", ui.ButtonSet.OK);
    } catch (err) {
      ui.alert("Gagal", "Tidak dapat mencabut akses: " + err.message, ui.ButtonSet.OK);
    }
  }
}

/**
 * Tampilkan semua Script Properties aktif dalam dialog HTML dark-mode.
 * Nilai dengan flag sensitive=true ditampilkan sebagai ●●●●●●.
 */
function showAllProperties() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var keys = Object.keys(props);
  var rows = "";

  if (keys.length === 0) {
    rows =
      "<tr><td colspan='2' style='text-align:center;color:#64748b;padding:32px;font-style:italic'>" +
      "⚠️ Belum ada Script Properties yang dikonfigurasi.</td></tr>";
  } else {
    keys.sort().forEach(function(key) {
      var isSensitive = CONFIGURABLE_PROPERTIES.some(function(p) {
        return p.key === key && p.sensitive;
      });
      var displayVal = isSensitive
        ? "<span style='color:#f59e0b;letter-spacing:2px'>●●●●●●</span> <em style='color:#64748b;font-size:11px'>(tersembunyi)</em>"
        : "<code style='background:#0f172a;color:#a5b4fc;padding:2px 8px;border-radius:4px;font-size:12px'>" + escapeHtml_(String(props[key])) + "</code>";
      rows +=
        "<tr class='row'>" +
          "<td class='key-cell'>" + escapeHtml_(key) + "</td>" +
          "<td class='val-cell'>" + displayVal + "</td>" +
        "</tr>";
    });
  }

  var htmlStr =
    "<!DOCTYPE html><html><head><meta charset='utf-8'>" +
    "<link href='https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap' rel='stylesheet'>" +
    "<style>" +
      "body{margin:0;font-family:Inter,sans-serif;background:#0f172a;color:#e2e8f0;font-size:13px}" +
      ".header{background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:14px 20px;font-size:15px;font-weight:600}" +
      "table{width:100%;border-collapse:collapse}" +
      ".row:hover td{background:#1e293b}" +
      ".key-cell{padding:10px 16px;font-weight:600;color:#a5b4fc;border-bottom:1px solid #1e293b;width:40%;vertical-align:top}" +
      ".val-cell{padding:10px 16px;border-bottom:1px solid #1e293b;word-break:break-all}" +
      ".footer{padding:12px 20px;color:#475569;font-size:11px;border-top:1px solid #1e293b;background:#0f172a}" +
      ".count{color:#6366f1;font-weight:600}" +
    "</style></head><body>" +
    "<div class='header'>🔑 Script Properties — " + CONFIG.APP.NAME + "</div>" +
    "<table><tbody>" + rows + "</tbody></table>" +
    "<div class='footer'>📊 Total: <span class='count'>" + keys.length + "</span> properties &nbsp;|&nbsp; ⚠️ Nilai sensitif disembunyikan (POL.ISMS.001)</div>" +
    "</body></html>";

  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(htmlStr).setWidth(580).setHeight(440),
    "🔑 Script Properties"
  );
}

/**
 * Prompt interaktif untuk mengubah satu Script Property (KEY → VALUE).
 */
function promptChangeProperty() {
  var ui = SpreadsheetApp.getUi();

  var listStr = CONFIGURABLE_PROPERTIES.map(function(p, i) {
    return "  " + (i + 1) + ". " + p.label + "\n     KEY: " + p.key;
  }).join("\n\n");

  var keyResult = ui.prompt(
    "✏️ Ubah Script Property",
    "Daftar properties yang direkomendasikan:\n\n" + listStr + "\n\nMasukkan KEY property yang ingin diubah:",
    ui.ButtonSet.OK_CANCEL
  );
  if (keyResult.getSelectedButton() !== ui.Button.OK) return;

  var key = keyResult.getResponseText().trim();
  if (!key) { showToast_("❌ KEY tidak boleh kosong.", "Error"); return; }

  var isSensitive = CONFIGURABLE_PROPERTIES.some(function(p) { return p.key === key && p.sensitive; });
  var promptMsg = isSensitive
    ? "Masukkan nilai baru untuk [" + key + "]\n⚠️ Nilai lama tidak ditampilkan demi keamanan:"
    : "Masukkan nilai baru untuk [" + key + "]:";

  var valueResult = ui.prompt("✏️ Nilai: " + key, promptMsg, ui.ButtonSet.OK_CANCEL);
  if (valueResult.getSelectedButton() !== ui.Button.OK) return;

  var value = valueResult.getResponseText().trim();
  PropertiesService.getScriptProperties().setProperty(key, value);
  showToast_("✅ Property [" + key + "] berhasil disimpan.", "Sukses");
}

/**
 * Prompt untuk menghapus satu Script Property dengan konfirmasi.
 */
function promptDeleteProperty() {
  var ui = SpreadsheetApp.getUi();

  var keyResult = ui.prompt(
    "🗑️ Hapus Script Property",
    "Masukkan nama KEY property yang ingin dihapus:",
    ui.ButtonSet.OK_CANCEL
  );
  if (keyResult.getSelectedButton() !== ui.Button.OK) return;

  var key = keyResult.getResponseText().trim();
  if (!key) { showToast_("❌ KEY tidak boleh kosong.", "Error"); return; }

  var confirm = ui.alert(
    "⚠️ Konfirmasi Hapus",
    "Anda yakin ingin menghapus property:\n\n[" + key + "]\n\nTindakan ini tidak dapat dibatalkan.",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  PropertiesService.getScriptProperties().deleteProperty(key);
  showToast_("🗑️ Property [" + key + "] berhasil dihapus.", "Info");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SHORTCUT PROPERTY UMUM
// ─────────────────────────────────────────────────────────────────────────────

/** Shortcut: Set Token Fonnte API secara aman. */
function promptSetFonnteToken() {
  var ui = SpreadsheetApp.getUi();
  var result = ui.prompt(
    "📲 Set Token Fonnte API",
    "Masukkan Token API Fonnte yang baru.\n⚠️ Nilai lama tidak ditampilkan demi keamanan (POL.ISMS.001):",
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() !== ui.Button.OK) return;

  var token = result.getResponseText().trim();
  if (!token) { showToast_("❌ Token tidak boleh kosong.", "Error"); return; }

  PropertiesService.getScriptProperties().setProperty("FONNTE_TOKEN", token);
  showToast_("✅ Token Fonnte API berhasil disimpan secara aman.", "Sukses");
}

/** Shortcut: Set atau reset Spreadsheet ID. */
function promptSetSpreadsheetId() {
  var ui = SpreadsheetApp.getUi();
  var current = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID") || "";
  var activeSsId = "";
  try { activeSsId = SpreadsheetApp.getActiveSpreadsheet().getId(); } catch(e) {}

  var result = ui.prompt(
    "🗂️ Set Spreadsheet ID",
    "ID dari Script Properties saat ini:\n" + (current || "(belum diset)") +
    "\n\nID Spreadsheet aktif (container):\n" + (activeSsId || "(tidak terdeteksi)") +
    "\n\nMasukkan ID baru, atau kosongkan untuk reset ke container-bound:",
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() !== ui.Button.OK) return;

  var newId = result.getResponseText().trim();
  if (newId) {
    PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", newId);
    showToast_("✅ Spreadsheet ID disimpan: " + newId, "Sukses");
  } else {
    PropertiesService.getScriptProperties().deleteProperty("SPREADSHEET_ID");
    showToast_("ℹ️ Spreadsheet ID direset ke mode container-bound.", "Info");
  }
}

/**
 * Toggle nilai MFA_STRICT_MODE antara TRUE dan FALSE.
 * Berguna untuk mengaktifkan/menonaktifkan wajib MFA untuk ADMINISTRATOR.
 */
function toggleMfaStrictMode() {
  var props = PropertiesService.getScriptProperties();
  var current = props.getProperty(CONFIG.SECURITY.MFA_STRICT_MODE_KEY);
  var newValue = (current === "TRUE") ? "FALSE" : "TRUE";
  props.setProperty(CONFIG.SECURITY.MFA_STRICT_MODE_KEY, newValue);

  var statusIcon = newValue === "TRUE" ? "🔐 AKTIF" : "🔓 NONAKTIF";
  showToast_("Mode MFA Ketat Administrator sekarang: " + statusIcon, "MFA Strict Mode");
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. AKSI SISTEM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Memicu inisialisasi ulang semua sheet database dari menu toolbar.
 * Memanggil SpreadsheetManager.initializeAllSheets() jika tersedia,
 * atau fallback ke initializeDatabase() versi lama.
 */
function menuInitializeDatabase() {
  var ui = SpreadsheetApp.getUi();
  var confirm = ui.alert(
    "🗃️ Inisialisasi Database",
    "Ini akan membuat semua sheet yang belum ada.\nSheet yang sudah ada tidak akan terpengaruh.\n\nLanjutkan?",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  try {
    if (typeof SpreadsheetManager !== "undefined" && SpreadsheetManager.initializeAllSheets) {
      SpreadsheetManager.initializeAllSheets();
    } else {
      initializeDatabase();
    }
    showToast_("✅ Inisialisasi database berhasil.", "Database");
  } catch (e) {
    ui.alert("❌ Gagal Inisialisasi", "Error: " + e.message, ui.ButtonSet.OK);
  }
}

/**
 * Memicu eksekusi data dummy seeder.
 */
function menuGenerateDummyData() {
  var ui = SpreadsheetApp.getUi();
  var confirm = ui.alert(
    "🎲 Generate Data Dummy",
    "Ini akan memasukkan data sampel (Proyek, Pengguna, dan Progress Log) ke dalam database untuk keperluan pengujian.\n\nApakah Anda ingin melanjutkan?",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  try {
    if (typeof generateDummyData === "function") {
      generateDummyData();
      showToast_("✅ Data dummy berhasil di-generate.", "Pengujian");
    } else {
      ui.alert("❌ Fungsi Tidak Ditemukan", "File seeder.gs belum ditambahkan atau fungsi generateDummyData tidak tersedia.", ui.ButtonSet.OK);
    }
  } catch (e) {
    ui.alert("❌ Gagal Generate", "Error: " + e.message, ui.ButtonSet.OK);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. TENTANG APLIKASI
// ─────────────────────────────────────────────────────────────────────────────

function showAbout() {
  var appName    = CONFIG.APP.NAME    || "System Reminder 2";
  var appVersion = CONFIG.APP.VERSION || "-";

  var htmlStr =
    "<!DOCTYPE html><html><head><meta charset='utf-8'>" +
    "<link href='https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap' rel='stylesheet'>" +
    "<style>" +
      "body{margin:0;font-family:Inter,sans-serif;background:#0f172a;color:#e2e8f0;" +
        "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
        "height:100vh;text-align:center;gap:14px;overflow:hidden}" +
      ".logo{font-size:56px;animation:pulse 2.4s ease-in-out infinite}" +
      "@keyframes pulse{0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.1) rotate(-5deg)}}" +
      "h2{margin:0;font-size:22px;font-weight:700;" +
        "background:linear-gradient(135deg,#6366f1,#a78bfa,#ec4899);" +
        "-webkit-background-clip:text;-webkit-text-fill-color:transparent}" +
      ".version{background:#1e293b;border:1px solid #6366f1;color:#a5b4fc;" +
        "border-radius:20px;padding:3px 14px;font-size:11px;font-weight:600}" +
      "p{margin:2px 0;color:#94a3b8;font-size:13px}" +
      ".divider{width:60px;height:2px;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:2px}" +
      ".badge-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}" +
      ".badge{background:#1e293b;border:1px solid #334155;border-radius:12px;" +
        "padding:3px 10px;font-size:11px;color:#64748b}" +
    "</style></head><body>" +
    "<div class='logo'>🚀</div>" +
    "<h2>" + appName + "</h2>" +
    "<span class='version'>v" + appVersion + "</span>" +
    "<div class='divider'></div>" +
    "<p>Sistem pemantauan kemajuan proyek &amp; pengingat otomatis</p>" +
    "<p>berbasis <strong style='color:#a5b4fc'>Google Apps Script</strong></p>" +
    "<p style='font-size:11px;color:#475569'>Standar Keamanan: POL.ISMS.001</p>" +
    "<div class='badge-row'>" +
      "<span class='badge'>⚡ Runtime V8</span>" +
      "<span class='badge'>📊 Google Sheets</span>" +
      "<span class='badge'>🌐 HtmlService</span>" +
    "</div>" +
    "</body></html>";

  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(htmlStr).setWidth(380).setHeight(320),
    "ℹ️ Tentang " + appName
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER INTERNAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tampilkan toast notification di pojok kanan bawah Spreadsheet.
 * @param {string} message  Pesan yang ditampilkan
 * @param {string} title    Judul notifikasi
 * @param {number} [duration=5] Durasi tampil dalam detik
 */
function showToast_(message, title, duration) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, "🚀 " + (title || CONFIG.APP.NAME), duration || 5);
}

/**
 * Escape karakter HTML khusus untuk mencegah XSS dalam konten dialog.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml_(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
