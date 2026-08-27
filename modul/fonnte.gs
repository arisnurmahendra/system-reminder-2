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
      console.warn("[FonnteHelper] Token FONNTE_TOKEN belum dikonfigurasi di Script Properties.");
      return false;
    }

    if (!targetPhone || !messageText) {
      console.warn("[FonnteHelper] Nomor target atau isi pesan kosong.");
      return false;
    }

    // Format nomor target (hilangkan spasi, strip, dll.)
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
          return true;
        } else {
          console.error("[FonnteHelper_ERROR] HTTP " + resCode + ": " + resText);
          return false;
        }
      } else {
        console.log("[FonnteHelper_MOCK] WA dikirim ke:", cleanPhone, "| Pesan:", messageText);
        return true;
      }
    } catch (err) {
      console.error("[FonnteHelper_ERROR] Gagal mengirim pesan WA:", err.message);
      return false;
    }
  }
};
