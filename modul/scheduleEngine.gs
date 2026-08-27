/**
 * Schedule Engine - Inti Komputasi Jadwal Kerja, Hari Kerja, & Timeline Proyek
 * Mengikuti prinsip Pure Functions & Mathematical Determinism
 */

var ScheduleEngine = {
  /**
   * Helper format tanggal ke format lokal YYYY-MM-DD
   * @param {Date|string} d
   * @returns {string}
   */
  formatDateYMD_: function(d) {
    var date = new Date(d);
    var year = date.getFullYear();
    var month = ("0" + (date.getMonth() + 1)).slice(-2);
    var day = ("0" + date.getDate()).slice(-2);
    return year + "-" + month + "-" + day;
  },

  /**
   * Mengecek apakah suatu tanggal adalah hari kerja (Senin - Jumat dan bukan hari libur)
   * @param {Date|string} date
   * @param {string[]} [holidays] - Daftar tanggal libur YYYY-MM-DD
   * @returns {boolean}
   */
  isWorkingDay: function(date, holidays) {
    var d = new Date(date);
    var dayOfWeek = d.getDay(); // 0 = Minggu, 6 = Sabtu

    // Weekend check
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // Holiday check
    if (holidays && Array.isArray(holidays) && holidays.length > 0) {
      var dateStr = this.formatDateYMD_(d);
      if (holidays.indexOf(dateStr) !== -1) {
        return false;
      }
    }

    return true;
  },

  /**
   * Menghitung total hari kerja (working days) di antara dua tanggal
   * @param {Date|string} startDate
   * @param {Date|string} endDate
   * @param {string[]} [holidays]
   * @returns {number}
   */
  calculateWorkingDays: function(startDate, endDate, holidays) {
    var start = new Date(startDate);
    var end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (start.getTime() > end.getTime()) {
      return 0;
    }

    var count = 0;
    var cur = new Date(start.getTime());

    while (cur.getTime() <= end.getTime()) {
      if (this.isWorkingDay(cur, holidays)) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    return count;
  },

  /**
   * Menghitung hari kerja yang telah berjalan dari tanggal mulai hingga targetDate
   * @param {Date|string} startDate
   * @param {Date|string} [targetDate]
   * @param {string[]} [holidays]
   * @returns {number}
   */
  calculateElapsedWorkingDays: function(startDate, targetDate, holidays) {
    var start = new Date(startDate);
    var target = targetDate ? new Date(targetDate) : new Date();
    start.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    if (target.getTime() < start.getTime()) {
      return 0;
    }

    // Target date inclusive of elapsed
    var count = 0;
    var cur = new Date(start.getTime());

    while (cur.getTime() <= target.getTime()) {
      if (this.isWorkingDay(cur, holidays)) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    return count;
  },

  /**
   * Menghitung sisa hari kerja dari targetDate hingga tanggal selesai
   * @param {Date|string} endDate
   * @param {Date|string} [targetDate]
   * @param {string[]} [holidays]
   * @returns {number}
   */
  calculateRemainingWorkingDays: function(endDate, targetDate, holidays) {
    var target = targetDate ? new Date(targetDate) : new Date();
    var end = new Date(endDate);
    target.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (target.getTime() >= end.getTime()) {
      return 0;
    }

    // Hitung dari hari esok setelah target sampai end
    var nextDay = new Date(target.getTime());
    nextDay.setDate(nextDay.getDate() + 1);

    return this.calculateWorkingDays(nextDay, end, holidays);
  },

  /**
   * Menentukan fase jadwal proyek (NOT_STARTED, IN_PROGRESS, OVERDUE)
   * @param {Date|string} startDate
   * @param {Date|string} endDate
   * @param {Date|string} [targetDate]
   * @returns {"NOT_STARTED"|"IN_PROGRESS"|"OVERDUE"}
   */
  getSchedulePhase: function(startDate, endDate, targetDate) {
    var start = new Date(startDate);
    var end = new Date(endDate);
    var target = targetDate ? new Date(targetDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    if (target.getTime() < start.getTime()) {
      return "NOT_STARTED";
    } else if (target.getTime() > end.getTime()) {
      return "OVERDUE";
    } else {
      return "IN_PROGRESS";
    }
  },

  /**
   * Menghasilkan deret timeline harian lengkap jadwal rencana proyek
   * @param {Date|string} startDate
   * @param {Date|string} endDate
   * @param {object} [options]
   * @param {string[]} [options.holidays]
   * @param {boolean} [options.workingDaysOnly=false]
   * @param {"LINEAR"|"SCURVE"} [options.curveType="LINEAR"]
   * @returns {Array<{dayIndex: number, date: string, isWorkingDay: boolean, dailyPlanned: number, cumulativePlanned: number}>}
   */
  generateScheduleTimeline: function(startDate, endDate, options) {
    var opts = options || {};
    var holidays = opts.holidays || [];
    var workingOnly = Boolean(opts.workingDaysOnly);
    var curveType = opts.curveType || "LINEAR";

    var start = new Date(startDate);
    var end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    var totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    var totalWorkingDays = this.calculateWorkingDays(start, end, holidays);

    var timeline = [];
    var cur = new Date(start.getTime());
    var dayIndex = 1;
    var elapsedWork = 0;

    while (cur.getTime() <= end.getTime()) {
      var dateStr = this.formatDateYMD_(cur);
      var isWork = this.isWorkingDay(cur, holidays);

      if (isWork) {
        elapsedWork++;
      }

      var cumulative = 0;
      if (workingOnly) {
        cumulative = totalWorkingDays > 0 ? Math.round((elapsedWork / totalWorkingDays) * 10000) / 100 : 100;
      } else {
        cumulative = ProgressEngine.calculatePlannedProgress(startDate, endDate, dateStr, curveType);
      }

      var prevCumulative = timeline.length > 0 ? timeline[timeline.length - 1].cumulativePlanned : 0;
      var dailyIncrement = Math.round((cumulative - prevCumulative) * 100) / 100;

      timeline.push({
        dayIndex: dayIndex,
        date: dateStr,
        isWorkingDay: isWork,
        dailyPlanned: Math.max(0, dailyIncrement),
        cumulativePlanned: Math.min(100, cumulative)
      });

      cur.setDate(cur.getDate() + 1);
      dayIndex++;
    }

    return timeline;
  }
};
