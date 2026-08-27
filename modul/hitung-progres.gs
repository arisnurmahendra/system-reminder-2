/**
 * Progress Calculation Engine - Logika Kalkulasi Kurva Progres & Keterlambatan
 * Mengikuti prinsip Pure Functions (Deterministic, Mudah Diuji, Tanpa Efek Samping Langsung)
 */

var ProgressEngine = {
  /**
   * Menghitung planned progress (rencana kemajuan) pada tanggal target
   * Mendukung kalkulasi linier maupun Sigmoid / S-Curve
   * @param {string|Date} startDate
   * @param {string|Date} endDate
   * @param {string|Date} targetDate
   * @param {string} [curveType="LINEAR"] - "LINEAR" | "SCURVE"
   * @returns {number} Persentase rencana kemajuan (0 - 100)
   */
  calculatePlannedProgress: function(startDate, endDate, targetDate, curveType) {
    var start = new Date(startDate);
    var end = new Date(endDate);
    var target = new Date(targetDate);

    // Normalisasi waktu ke 00:00:00 UTC
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    var totalDuration = end.getTime() - start.getTime();
    if (totalDuration <= 0) return 100;

    var elapsed = target.getTime() - start.getTime();

    // Sebelum proyek mulai -> 0%
    if (elapsed <= 0) return 0;
    // Setelah proyek selesai -> 100%
    if (elapsed >= totalDuration) return 100;

    var progressRatio = elapsed / totalDuration; // 0.0 s.d 1.0

    if (curveType === "SCURVE") {
      // Pendekatan Kurva S menggunakan fungsi Sigmoid terstandarisasi: 1 / (1 + e^(-k*(x - 0.5)))
      // Ditransformasikan agar tepat f(0) = 0 dan f(1) = 1
      var k = 6; // Steeper curve
      var rawSigmoid = function(t) { return 1 / (1 + Math.exp(-k * (t - 0.5))); };
      var minSig = rawSigmoid(0);
      var maxSig = rawSigmoid(1);
      var normalized = (rawSigmoid(progressRatio) - minSig) / (maxSig - minSig);
      return Math.round(normalized * 10000) / 100;
    }

    // Default: Linier progress
    return Math.round(progressRatio * 10000) / 100;
  },

  /**
   * Menghitung deviasi (selisih) kemajuan: Actual - Planned
   * @param {number} actualProgress
   * @param {number} plannedProgress
   * @returns {number} Deviasi persentase (+ jika lebih cepat, - jika terlambat)
   */
  calculateDeviation: function(actualProgress, plannedProgress) {
    var actual = Number(actualProgress || 0);
    var planned = Number(plannedProgress || 0);
    var deviation = actual - planned;
    return Math.round(deviation * 100) / 100;
  },

  /**
   * Menentukan kategori status kemajuan proyek
   * @param {number} actualProgress
   * @param {number} plannedProgress
   * @param {number} [tolerance=0] - Batas toleransi deviasi (persen)
   * @returns {string} "COMPLETED" | "AHEAD" | "ON_TRACK" | "DELAYED"
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
   * Menghitung sisa hari proyek terhadap tanggal hari ini
   * @param {string|Date} endDate
   * @returns {number} Jumlah hari tersisa (negatif jika sudah lewat deadline)
   */
  calculateDaysRemaining: function(endDate) {
    var end = new Date(endDate);
    var today = new Date();
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    var diffMs = end.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
};
