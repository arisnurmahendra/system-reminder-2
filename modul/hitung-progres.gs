/**
 * Progress Calculation Engine - Inti Komputasi Kurva S, Progres Rencana/Aktual & Status
 * Mengikuti prinsip Pure Functions & Mathematical Determinism
 */

var ProgressEngine = {
  /**
   * Helper format tanggal ke string YYYY-MM-DD lokal
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

  // ==========================================
  // 1. SCHEDULE & DURATION COMPUTATIONS
  // ==========================================

  /**
   * Menghitung total durasi kalender proyek dalam hari
   * @param {string|Date} startDate
   * @param {string|Date} endDate
   * @returns {number} Durasi total (hari)
   */
  calculateTotalDuration: function(startDate, endDate) {
    var start = new Date(startDate);
    var end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    var diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 0;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  },

  /**
   * Menghitung jumlah hari kalender yang telah berjalan dari tanggal mulai
   * @param {string|Date} startDate
   * @param {string|Date} [targetDate]
   * @returns {number} Jumlah hari yang telah lewat
   */
  calculateElapsedDays: function(startDate, targetDate) {
    var start = new Date(startDate);
    var target = targetDate ? new Date(targetDate) : new Date();
    start.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    var diffMs = target.getTime() - start.getTime();
    if (diffMs <= 0) return 0;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  },

  /**
   * Menghitung sisa hari proyek terhadap tanggal target (atau hari ini)
   * @param {string|Date} endDate
   * @param {string|Date} [targetDate]
   * @returns {number} Jumlah hari tersisa (negatif jika sudah melewati deadline)
   */
  calculateDaysRemaining: function(endDate, targetDate) {
    var end = new Date(endDate);
    var target = targetDate ? new Date(targetDate) : new Date();
    end.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    var diffMs = end.getTime() - target.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  },

  /**
   * Menghitung persentase waktu jadwal yang telah terpakai (0 - 100%)
   * @param {string|Date} startDate
   * @param {string|Date} endDate
   * @param {string|Date} [targetDate]
   * @returns {number}
   */
  calculateSchedulePercentage: function(startDate, endDate, targetDate) {
    var total = this.calculateTotalDuration(startDate, endDate);
    if (total <= 0) return 100;
    var elapsed = this.calculateElapsedDays(startDate, targetDate);
    if (elapsed <= 0) return 0;
    if (elapsed >= total) return 100;

    return Math.round((elapsed / total) * 10000) / 100;
  },

  // ==========================================
  // 2. PLANNED PROGRESS & S-CURVE COMPUTATIONS
  // ==========================================

  /**
   * Menghitung rencana kemajuan (planned progress) pada tanggal tertentu
   * @param {string|Date} startDate
   * @param {string|Date} endDate
   * @param {string|Date} targetDate
   * @param {"LINEAR"|"SCURVE"} [curveType="LINEAR"]
   * @returns {number} Persentase rencana kemajuan (0 - 100)
   */
  calculatePlannedProgress: function(startDate, endDate, targetDate, curveType) {
    var start = new Date(startDate);
    var end = new Date(endDate);
    var target = new Date(targetDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    var totalDuration = end.getTime() - start.getTime();
    if (totalDuration <= 0) return 100;

    var elapsed = target.getTime() - start.getTime();
    if (elapsed <= 0) return 0;
    if (elapsed >= totalDuration) return 100;

    var progressRatio = elapsed / totalDuration;

    if (curveType === "SCURVE") {
      // Fungsi Sigmoid Kurva S: f(t) = 1 / (1 + e^(-k*(t - 0.5)))
      var k = 6;
      var rawSigmoid = function(t) { return 1 / (1 + Math.exp(-k * (t - 0.5))); };
      var minSig = rawSigmoid(0);
      var maxSig = rawSigmoid(1);
      var normalized = (rawSigmoid(progressRatio) - minSig) / (maxSig - minSig);
      return Math.round(normalized * 10000) / 100;
    }

    // Default: Linier
    return Math.round(progressRatio * 10000) / 100;
  },

  /**
   * Membangkitkan deret titik koordinat Kurva S rencana untuk visualisasi grafik
   * @param {string|Date} startDate
   * @param {string|Date} endDate
   * @param {number} [steps=20] - Jumlah interval titik sampel
   * @param {"LINEAR"|"SCURVE"} [curveType="SCURVE"]
   * @returns {Array<{date: string, plannedProgress: number, elapsedDays: number}>}
   */
  generatePlannedCurve: function(startDate, endDate, steps, curveType) {
    var start = new Date(startDate);
    var end = new Date(endDate);
    var numSteps = steps && steps > 1 ? steps : 20;
    var type = curveType || "SCURVE";

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    var totalMs = end.getTime() - start.getTime();
    var stepMs = totalMs / numSteps;
    var points = [];

    for (var i = 0; i <= numSteps; i++) {
      var currentMs = (i === numSteps) ? end.getTime() : (start.getTime() + (stepMs * i));
      var curDate = new Date(currentMs);
      var dateStr = this.formatDateYMD_(curDate);
      var planned = (i === 0) ? 0 : (i === numSteps ? 100 : this.calculatePlannedProgress(startDate, endDate, dateStr, type));

      points.push({
        date: dateStr,
        plannedProgress: planned,
        elapsedDays: this.calculateElapsedDays(startDate, dateStr)
      });
    }

    return points;
  },

  // ==========================================
  // 3. DEVIATION, VARIANCE & PROJECTION
  // ==========================================

  /**
   * Menghitung deviasi kemajuan: Actual - Planned
   * @param {number} actualProgress
   * @param {number} plannedProgress
   * @returns {number} Deviasi persentase (+ cepat, - lambat)
   */
  calculateDeviation: function(actualProgress, plannedProgress) {
    var actual = Number(actualProgress || 0);
    var planned = Number(plannedProgress || 0);
    var deviation = actual - planned;
    return Math.round(deviation * 100) / 100;
  },

  /**
   * Menghitung estimasi tanggal penyelesaian proyek berdasarkan tren kecepatan kemajuan aktual
   * @param {string|Date} startDate
   * @param {string|Date} endDate
   * @param {number} actualProgress
   * @param {string|Date} [lastRecordedDate]
   * @returns {string|null} Tanggal proyeksi selesai (YYYY-MM-DD)
   */
  calculateEstimatedCompletionDate: function(startDate, endDate, actualProgress, lastRecordedDate) {
    var actual = Number(actualProgress || 0);
    if (actual <= 0) return null;
    if (actual >= 100) return this.formatDateYMD_(lastRecordedDate ? new Date(lastRecordedDate) : new Date());

    var elapsedDays = this.calculateElapsedDays(startDate, lastRecordedDate || new Date());
    if (elapsedDays <= 0) return null;

    var dailyRate = actual / elapsedDays;
    var remainingPercent = 100 - actual;
    var remainingDaysNeeded = Math.ceil(remainingPercent / dailyRate);

    var curDate = lastRecordedDate ? new Date(lastRecordedDate) : new Date();
    curDate.setHours(0, 0, 0, 0);
    var projectedEnd = new Date(curDate.getTime() + (remainingDaysNeeded * 24 * 60 * 60 * 1000));

    return this.formatDateYMD_(projectedEnd);
  },

  // ==========================================
  // 4. STATUS & VISUAL INDICATORS
  // ==========================================

  /**
   * Menentukan status kemajuan proyek
   * @param {number} actualProgress
   * @param {number} plannedProgress
   * @param {number} [tolerance=0] - Batas toleransi deviasi persen
   * @returns {"COMPLETED"|"AHEAD"|"ON_TRACK"|"DELAYED"}
   */
  determineProgressStatus: function(actualProgress, plannedProgress, tolerance) {
    var actual = Number(actualProgress || 0);
    var planned = Number(plannedProgress || 0);
    var tol = Number(tolerance || 0);

    if (actual >= 100) {
      return "COMPLETED";
    }

    var deviation = actual - planned;

    if (deviation < -tol) {
      return "DELAYED";
    } else if (deviation > tol) {
      return "AHEAD";
    } else {
      return "ON_TRACK";
    }
  },

  /**
   * Mendapatkan metadata visual indikator status (warna, ikon, deskripsi badge)
   * @param {"COMPLETED"|"AHEAD"|"ON_TRACK"|"DELAYED"|string} status
   * @returns {object} { label: string, color: string, badgeBg: string, icon: string, description: string }
   */
  getStatusIndicator: function(status) {
    switch (status) {
      case "COMPLETED":
        return {
          label: "Selesai",
          color: "#10b981",
          badgeBg: "rgba(16, 185, 129, 0.15)",
          icon: "🎉",
          description: "Proyek telah selesai 100%."
        };
      case "AHEAD":
        return {
          label: "Lebih Cepat",
          color: "#3b82f6",
          badgeBg: "rgba(59, 130, 246, 0.15)",
          icon: "⚡",
          description: "Progres aktual melampaui target rencana jadwal."
        };
      case "ON_TRACK":
        return {
          label: "Sesuai Jadwal",
          color: "#10b981",
          badgeBg: "rgba(16, 185, 129, 0.15)",
          icon: "✅",
          description: "Progres berjalan tepat sesuai rencana."
        };
      case "DELAYED":
      default:
        return {
          label: "Terlambat",
          color: "#f43f5e",
          badgeBg: "rgba(244, 63, 94, 0.15)",
          icon: "⚠️",
          description: "Progres berada di bawah target jadwal rencana."
        };
    }
  },

  // ==========================================
  // 5. INPUT VALIDATION HELPERS
  // ==========================================

  /**
   * Validasi nilai persentase progres (0 - 100)
   * @param {*} value
   * @returns {number}
   */
  validateProgressValue: function(value) {
    var num = Number(value);
    if (isNaN(num) || num < 0 || num > 100) {
      throw ErrorFactory.validation("Nilai progres harus berupa angka di antara 0% sampai 100%.", { value: value });
    }
    return Math.round(num * 100) / 100;
  },

  /**
   * Validasi rentang tanggal proyek
   * @param {string|Date} startDate
   * @param {string|Date} endDate
   */
  validateDateRange: function(startDate, endDate) {
    var start = new Date(startDate);
    var end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw ErrorFactory.validation("Format tanggal mulai atau tanggal selesai tidak valid.");
    }

    if (start.getTime() > end.getTime()) {
      throw ErrorFactory.businessRule("Tanggal mulai tidak boleh lebih besar dari tanggal selesai.", CONFIG.ERROR_CODES.BIZ_INVALID_DATE_RANGE);
    }
  }
};
