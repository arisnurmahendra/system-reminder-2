/**
 * Notification History Service - Pelacakan & Audit Jejak Pengiriman Notifikasi
 * Mengikuti arsitektur Service Layer & Single Responsibility Principle
 */

var NotificationHistoryService = {
  /**
   * Mengambil histori log notifikasi dengan berbagai filter
   * @param {object} [filters] { channel, status, keyword, startDate, endDate, limit, offset }
   * @returns {object} { total, logs }
   */
  getNotificationHistory: function(filters) {
    var opts = filters || {};
    var allAuditLogs = AuditLogRepository.findAll();

    // Saring hanya action notifikasi
    var notifLogs = allAuditLogs.filter(function(log) {
      return log.action === "EMAIL_SENT" ||
             log.action === "EMAIL_REMINDER_SENT" ||
             log.action === "WA_SENT" ||
             log.action === "WA_REMINDER_SENT";
    });

    // Format & Enrich
    var formattedList = notifLogs.map(function(item) {
      var channel = item.action.indexOf("EMAIL") !== -1 ? "EMAIL" : "WHATSAPP";
      var details = {};
      try {
        details = typeof item.details === "string" ? JSON.parse(item.details) : (item.details || {});
      } catch (e) {
        details = {};
      }

      return {
        logId: item.log_id,
        timestamp: item.timestamp,
        channel: channel,
        action: item.action,
        status: item.status || "SUCCESS",
        recipient: item.user_id || details.to || details.target || "-",
        projectId: details.projectId || "-",
        details: details
      };
    });

    // Urutkan dari yang paling baru
    formattedList.sort(function(a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Terapkan Filter
    if (opts.channel && opts.channel !== "ALL") {
      var targetChannel = opts.channel.toUpperCase();
      formattedList = formattedList.filter(function(i) {
        return i.channel === targetChannel;
      });
    }

    if (opts.status && opts.status !== "ALL") {
      var targetStatus = opts.status.toUpperCase();
      formattedList = formattedList.filter(function(i) {
        return i.status === targetStatus;
      });
    }

    if (opts.keyword) {
      var kw = opts.keyword.toLowerCase();
      formattedList = formattedList.filter(function(i) {
        return (i.recipient && i.recipient.toLowerCase().indexOf(kw) !== -1) ||
               (i.projectId && i.projectId.toLowerCase().indexOf(kw) !== -1);
      });
    }

    if (opts.startDate) {
      var startEpoch = new Date(opts.startDate).getTime();
      formattedList = formattedList.filter(function(i) {
        return new Date(i.timestamp).getTime() >= startEpoch;
      });
    }

    if (opts.endDate) {
      var endEpoch = new Date(opts.endDate).getTime() + (24 * 60 * 60 * 1000);
      formattedList = formattedList.filter(function(i) {
        return new Date(i.timestamp).getTime() <= endEpoch;
      });
    }

    var total = formattedList.length;
    var limit = Number(opts.limit) || 50;
    var offset = Number(opts.offset) || 0;
    var paginated = formattedList.slice(offset, offset + limit);

    return formatSuccessResponse({
      total: total,
      logs: paginated
    }, "Histori notifikasi berhasil dimuat.");
  },

  /**
   * Menghitung statistik keseluruhan pengiriman notifikasi
   * @returns {object}
   */
  getNotificationStats: function() {
    var historyRes = this.getNotificationHistory({ limit: 10000 });
    var logs = historyRes.data.logs;

    var stats = {
      totalSent: logs.length,
      successCount: 0,
      failedCount: 0,
      emailCount: 0,
      waCount: 0,
      successRate: 100
    };

    for (var i = 0; i < logs.length; i++) {
      var l = logs[i];
      if (l.status === "SUCCESS") stats.successCount++;
      else stats.failedCount++;

      if (l.channel === "EMAIL") stats.emailCount++;
      else if (l.channel === "WHATSAPP") stats.waCount++;
    }

    if (stats.totalSent > 0) {
      stats.successRate = Math.round((stats.successCount / stats.totalSent) * 100);
    }

    return formatSuccessResponse(stats, "Statistik notifikasi berhasil dikompilasi.");
  }
};
