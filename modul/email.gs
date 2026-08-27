/**
 * Email Helper - Integrasi Notifikasi Email via Gmail / MailApp Service
 * Mengikuti standar desain HTML responsive & arsitektur Service Layer
 */

var EmailHelper = {
  // ==========================================
  // HTML TEMPLATE BUILDERS
  // ==========================================

  /**
   * Wrapper dasar layout HTML email yang rapi dan responsif
   * @param {string} title
   * @param {string} contentHtml
   * @returns {string}
   */
  wrapEmailTemplate_: function(title, contentHtml) {
    return "<!DOCTYPE html>"
      + "<html>"
      + "<head>"
      + "<meta charset='UTF-8'>"
      + "<style>"
      + "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }"
      + ".container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }"
      + ".header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px; text-align: center; color: #ffffff; }"
      + ".header h1 { margin: 0; font-size: 20px; font-weight: 700; }"
      + ".content { padding: 24px; line-height: 1.6; font-size: 14px; }"
      + ".table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }"
      + ".table th { background: #f8fafc; text-align: left; padding: 10px 12px; border: 1px solid #cbd5e1; color: #64748b; font-weight: 600; }"
      + ".table td { padding: 10px 12px; border: 1px solid #cbd5e1; }"
      + ".badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; }"
      + ".badge-delayed { background: #fee2e2; color: #dc2626; }"
      + ".badge-success { background: #dcfce7; color: #16a34a; }"
      + ".footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }"
      + "</style>"
      + "</head>"
      + "<body>"
      + "<div class='container'>"
      + "<div class='header'>"
      + "<h1>🛡️ " + title + "</h1>"
      + "</div>"
      + "<div class='content'>"
      + contentHtml
      + "</div>"
      + "<div class='footer'>"
      + "<p style='margin: 0;'>Pemberitahuan otomatis dari <strong>System Reminder 2</strong>.</p>"
      + "<p style='margin: 4px 0 0 0; font-size: 11px;'>Harap tidak membalas email ini secara langsung.</p>"
      + "</div>"
      + "</div>"
      + "</body>"
      + "</html>";
  },

  /**
   * Template Email Peringatan Keterlambatan Proyek
   */
  buildDelayedAlertHtml: function(project, actual, planned, deviation, daysRemaining) {
    var devAbs = Math.abs(deviation).toFixed(2);
    var body = "<p>Halo <strong>" + project.pic_name + "</strong>,</p>"
      + "<p>Sistem mendeteksi bahwa progres proyek berikut mengalami <strong>keterlambatan dari jadwal rencana</strong>:</p>"
      + "<table class='table'>"
      + "<tr><th style='width: 40%;'>Nama Proyek</th><td><strong>" + project.project_name + "</strong></td></tr>"
      + "<tr><th>Target Rencana</th><td>" + planned + "%</td></tr>"
      + "<tr><th>Realisasi Aktual</th><td style='color: #dc2626; font-weight: bold;'>" + actual + "%</td></tr>"
      + "<tr><th>Deviasi</th><td><span class='badge badge-delayed'>-" + devAbs + "%</span></td></tr>"
      + (daysRemaining !== undefined ? "<tr><th>Sisa Waktu</th><td>" + daysRemaining + " hari kalender</td></tr>" : "")
      + "</table>"
      + "<p style='background: #fff1f2; border-left: 4px solid #f43f5e; padding: 12px; border-radius: 4px; font-size: 13px;'>"
      + "⚠️ <strong>Tindakan yang Disarankan:</strong> Mohon segera berkoordinasi dengan tim lapangan dan menyusun langkah percepatan (crashing/fast-tracking) jadwal."
      + "</p>";

    return this.wrapEmailTemplate_("Peringatan Keterlambatan Proyek", body);
  },

  /**
   * Template Email Proyek Selesai 100%
   */
  buildCompletedAlertHtml: function(project) {
    var body = "<p>Halo <strong>" + project.pic_name + "</strong>,</p>"
      + "<p>🎉 Selamat! Proyek berikut telah berhasil diselesaikan dengan capaian <strong>100%</strong>:</p>"
      + "<table class='table'>"
      + "<tr><th style='width: 40%;'>Nama Proyek</th><td><strong>" + project.project_name + "</strong></td></tr>"
      + "<tr><th>Periode</th><td>" + project.start_date + " s.d. " + project.end_date + "</td></tr>"
      + "<tr><th>Status Terakhir</th><td><span class='badge badge-success'>COMPLETED (100%)</span></td></tr>"
      + "</table>"
      + "<p>Terima kasih atas dedikasi dan kerja keras seluruh tim dalam menyelesaikan proyek ini tepat waktu.</p>";

    return this.wrapEmailTemplate_("Proyek Telah Selesai (100%)", body);
  },

  /**
   * Template Email Pengingat Rutin Harian
   */
  buildDailyReminderHtml: function(project, actual, planned, daysRemaining) {
    var body = "<p>Halo <strong>" + project.pic_name + "</strong>,</p>"
      + "<p>Berikut adalah ringkasan status harian untuk proyek Anda:</p>"
      + "<table class='table'>"
      + "<tr><th style='width: 40%;'>Nama Proyek</th><td><strong>" + project.project_name + "</strong></td></tr>"
      + "<tr><th>Target Rencana Hari Ini</th><td>" + planned + "%</td></tr>"
      + "<tr><th>Realisasi Aktual Terakhir</th><td>" + actual + "%</td></tr>"
      + "<tr><th>Sisa Durasi Proyek</th><td>" + daysRemaining + " hari</td></tr>"
      + "</table>"
      + "<p>Mohon jangan lupa untuk memperbarui data progres harian hari ini melalui dashboard aplikasi.</p>";

    return this.wrapEmailTemplate_("Pengingat Progres Harian", body);
  },

  /**
   * Template Email Uji Coba Sistem
   */
  buildTestEmailHtml: function(recipientEmail) {
    var body = "<p>Halo,</p>"
      + "<p>Ini adalah <strong>email pengujian (test email)</strong> untuk memverifikasi bahwa integrasi pengiriman email melalui GmailApp pada <strong>System Reminder 2</strong> berfungsi normal.</p>"
      + "<table class='table'>"
      + "<tr><th style='width: 40%;'>Alamat Penerima</th><td>" + recipientEmail + "</td></tr>"
      + "<tr><th>Status Koneksi</th><td><span class='badge badge-success'>TERHUBUNG & AKTIF</span></td></tr>"
      + "<tr><th>Waktu Pengujian</th><td>" + new Date().toISOString() + "</td></tr>"
      + "</table>";

    return this.wrapEmailTemplate_("Uji Koneksi Notifikasi Email", body);
  },

  // ==========================================
  // EMAIL DISPATCHER
  // ==========================================

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

      AppLogger.audit("EmailHelper", "EMAIL_SENT", "SUCCESS", { to: recipientEmail, subject: subject }, null, recipientEmail);
      return true;
    } catch (err) {
      AppLogger.error("EmailHelper", "Gagal mengirim email: " + err.message, err);
      return false;
    }
  },

  /**
   * Mengirim email pengujian konektivitas
   * @param {string} recipientEmail
   * @returns {boolean}
   */
  sendTestEmail: function(recipientEmail) {
    var subject = "✅ [Uji Koneksi] System Reminder 2 Email Notification";
    var html = this.buildTestEmailHtml(recipientEmail);
    return this.sendEmail(recipientEmail, subject, html);
  }
};
