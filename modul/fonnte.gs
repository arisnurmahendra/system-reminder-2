/**
 * Fonnte Helper - Integrasi Notifikasi WhatsApp via Fonnte API
 * Mengikuti standar keamanan POL.ISMS.001 (Token dari PropertiesService)
 */

var FonnteHelper = {
  /**
   * Sanitasi dan standardisasi format nomor telepon ke format internasional (628xxx)
   * @param {string} phone
   * @returns {string}
   */
  sanitizePhoneNumber: function(phone) {
    if (!phone) return "";
    var digits = String(phone).replace(/[^0-9]/g, "");

    // Jika diawali 08xxx -> ubah menjadi 628xxx
    if (digits.indexOf("0") === 0) {
      digits = "62" + digits.substring(1);
    }
    // Jika diawali +62 -> sudah jadi 62xxx karena replace '+'
    return digits;
  },

  /**
   * Validasi apakah nomor telepon valid (10-15 digit angka)
   * @param {string} phone
   * @returns {boolean}
   */
  isValidPhoneNumber: function(phone) {
    var sanitized = this.sanitizePhoneNumber(phone);
    return /^[1-9][0-9]{9,14}$/.test(sanitized);
  },

  // ==========================================
  // MESSAGE TEMPLATES
  // ==========================================

  /**
   * Template WhatsApp untuk Peringatan Keterlambatan Proyek
   */
  formatDelayedAlert: function(project, actual, planned, deviation) {
    var devAbs = Math.abs(deviation).toFixed(2);
    return "⚠️ *PERINGATAN KETERLAMBATAN PROYEK*\n\n"
      + "Halo *" + project.pic_name + "*,\n"
      + "Proyek: *" + project.project_name + "* saat ini mengalami keterlambatan dari jadwal rencana.\n\n"
      + "📊 Target Rencana: *" + planned + "%*\n"
      + "📉 Realisasi Aktual: *" + actual + "%*\n"
      + "⚡ Deviasi: *-" + devAbs + "%*\n\n"
      + "Mohon segera melakukan langkah mitigasi/percepatan jadwal.\n\n"
      + "_System Reminder 2 — Automated Project Tracking_";
  },

  /**
   * Template WhatsApp untuk Pemberitahuan Proyek Selesai 100%
   */
  formatCompletedAlert: function(project) {
    return "🎉 *PROYEK SELESAI*\n\n"
      + "Halo *" + project.pic_name + "*,\n"
      + "Selamat! Proyek: *" + project.project_name + "* telah berhasil diselesaikan dengan progres *100%*.\n\n"
      + "Terima kasih atas kerja keras seluruh tim proyek.\n\n"
      + "_System Reminder 2_";
  },

  /**
   * Template WhatsApp untuk Pengingat Harian Rutin
   */
  formatDailyReminder: function(project, actual, planned, daysRemaining) {
    return "📋 *PENGINGAT PROGRES HARIAN*\n\n"
      + "Halo *" + project.pic_name + "*,\n"
      + "Berikut status terkini proyek *" + project.project_name + "*:\n\n"
      + "• Target Rencana: " + planned + "%\n"
      + "• Realisasi Aktual: " + actual + "%\n"
      + "• Sisa Waktu: " + daysRemaining + " hari kalender\n\n"
      + "Jangan lupa mencatat progres harian hari ini melalui dashboard.\n\n"
      + "_System Reminder 2_";
  },

  /**
   * Template Pesan Uji Coba WhatsApp
   */
  formatTestMessage: function(phoneNumber) {
    return "✅ *UJI KONEKSI WHATSAPP BERHASIL*\n\n"
      + "Pesan ini mengonfirmasi bahwa integrasi WhatsApp via Fonnte API pada *System Reminder 2* telah aktif dan berfungsi dengan baik.\n\n"
      + "📱 Nomor Penerima: " + phoneNumber + "\n"
      + "⏰ Waktu: " + new Date().toISOString() + "\n\n"
      + "_System Reminder 2_";
  },

  // ==========================================
  // MESSAGE DISPATCHER
  // ==========================================

  /**
   * Mengirim pesan WhatsApp ke nomor target
   * @param {string} targetPhone - Nomor telepon tujuan
   * @param {string} messageText - Konten teks pesan
   * @returns {boolean}
   */
  sendMessage: function(targetPhone, messageText) {
    var token = CONFIG.FONNTE.API_TOKEN;
    if (!token) {
      AppLogger.warn("FonnteHelper", "Token FONNTE_TOKEN belum dikonfigurasi di Script Properties.");
      return false;
    }

    if (!targetPhone || !messageText) {
      AppLogger.warn("FonnteHelper", "Nomor target atau isi pesan kosong.");
      return false;
    }

    var cleanPhone = this.sanitizePhoneNumber(targetPhone);
    if (!this.isValidPhoneNumber(cleanPhone)) {
      AppLogger.warn("FonnteHelper", "Nomor target tidak valid: " + targetPhone);
      return false;
    }

    try {
      var payload = {
        target: cleanPhone,
        message: messageText
      };

      var options = {
        method: "post",
        headers: {
          "Authorization": token
        },
        payload: payload,
        muteHttpExceptions: true
      };

      if (typeof UrlFetchApp !== "undefined" && UrlFetchApp.fetch) {
        var response = UrlFetchApp.fetch(CONFIG.FONNTE.API_URL, options);
        var resCode = response.getResponseCode();
        var resText = response.getContentText();

        if (resCode >= 200 && resCode < 300) {
          AppLogger.audit("FonnteHelper", "WA_SENT", "SUCCESS", { target: cleanPhone });
          return true;
        } else {
          AppLogger.error("FonnteHelper", "Gagal kirim WA (HTTP " + resCode + ")", { response: resText });
          return false;
        }
      } else {
        AppLogger.audit("FonnteHelper", "WA_SENT_MOCK", "SUCCESS", { target: cleanPhone });
        return true;
      }
    } catch (err) {
      AppLogger.error("FonnteHelper", "Gagal mengirim pesan WA: " + err.message, err);
      return false;
    }
  },

  /**
   * Mengirim pesan uji coba ke nomor target
   * @param {string} targetPhone
   * @returns {boolean}
   */
  sendTestMessage: function(targetPhone) {
    var msg = this.formatTestMessage(targetPhone);
    return this.sendMessage(targetPhone, msg);
  }
};
