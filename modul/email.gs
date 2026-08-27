/**
 * Email Helper - Integrasi Notifikasi Email via Gmail Service
 * Mengikuti prinsip Single Responsibility
 */

var EmailHelper = {
  /**
   * Mengirim email pengingat / notifikasi secara aman
   * @param {string} recipientEmail
   * @param {string} subject
   * @param {string} htmlBody
   * @param {string} [plainText]
   * @returns {boolean}
   */
  sendEmail: function(recipientEmail, subject, htmlBody, plainText) {
    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      AppLogger.warn("EmailHelper", "Email penerima tidak valid: " + recipientEmail);
      return false;
    }

    try {
      var options = {
        name: CONFIG.EMAIL.SENDER_NAME || "System Reminder 2",
        htmlBody: htmlBody
      };

      var textBody = plainText || htmlBody.replace(/<[^>]*>?/gm, '');

      if (typeof GmailApp !== "undefined" && GmailApp.sendEmail) {
        GmailApp.sendEmail(recipientEmail, subject, textBody, options);
      } else if (typeof MailApp !== "undefined" && MailApp.sendEmail) {
        MailApp.sendEmail(recipientEmail, subject, textBody, options);
      } else {
        AppLogger.debug("EmailHelper", "Mock email terkirim", { to: recipientEmail, subject: subject });
      }

      return true;
    } catch (err) {
      AppLogger.error("EmailHelper", "Gagal mengirim email: " + err.message, err);
      return false;
    }
  }
};
