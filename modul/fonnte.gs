/**
 * Fonnte Helper - Integrasi Notifikasi WhatsApp via Fonnte API
 * Mengikuti standar keamanan POL.ISMS.001 (Token dari PropertiesService)
 */

var FonnteHelper = {
  /**
   * Mengirim pesan WhatsApp ke nomor target
   * @param {string} targetPhone - Nomor telepon tujuan (cth: 08123456789 atau 628123456789)
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

    var cleanPhone = String(targetPhone).replace(/[^0-9]/g, "");

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
          AppLogger.debug("FonnteHelper", "Pesan WA berhasil terkirim ke " + cleanPhone);
          return true;
        } else {
          AppLogger.error("FonnteHelper", "Gagal kirim WA (HTTP " + resCode + ")", { response: resText });
          return false;
        }
      } else {
        AppLogger.debug("FonnteHelper", "Mock WA terkirim", { to: cleanPhone, message: messageText });
        return true;
      }
    } catch (err) {
      AppLogger.error("FonnteHelper", "Gagal mengirim pesan WA: " + err.message, err);
      return false;
    }
  }
};
