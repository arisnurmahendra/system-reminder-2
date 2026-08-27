/**
 * Performance Benchmark & Optimization Engine
 * Memfasilitasi pengukuran waktu eksekusi, efisiensi pembacaan spreadsheet, dan pengujian throughput
 */

var PerformanceBenchmark = {
  /**
   * Mengukur durasi eksekusi dari suatu fungsi
   * @param {string} label
   * @param {Function} fn
   * @returns {object} { label, durationMs, result }
   */
  measure: function(label, fn) {
    var start = Date.now();
    var result = fn();
    var duration = Date.now() - start;
    AppLogger.info("Benchmark", "[" + label + "] Selesai dalam " + duration + " ms", { durationMs: duration });
    return {
      label: label,
      durationMs: duration,
      result: result
    };
  },

  /**
   * Menjalankan serangkaian benchmark performa menyeluruh
   * @returns {object}
   */
  runAllBenchmarks: function() {
    var benchmarks = [];

    // 1. Benchmark Repository Sequential vs Cached Read
    var repoReadUncached = this.measure("Repo Direct Read (10 iterations)", function() {
      var count = 0;
      for (var i = 0; i < 10; i++) {
        count += ProjectRepository.findAll().length;
      }
      return count;
    });
    benchmarks.push(repoReadUncached);

    // 2. Benchmark S-Curve Calculation Throughput
    var scurveBenchmark = this.measure("S-Curve Engine 500 Days Calculation", function() {
      var points = 0;
      for (var d = 0; d < 500; d++) {
        points += ProgressEngine.calculatePlannedProgress("2026-01-01", "2027-05-15", "2026-06-01", "SCURVE");
      }
      return points;
    });
    benchmarks.push(scurveBenchmark);

    // 3. Benchmark Executive Summary Aggregation
    var summaryBenchmark = this.measure("Executive Summary Aggregation", function() {
      return DashboardSummaryService.getExecutiveSummary();
    });
    benchmarks.push(summaryBenchmark);

    // 4. Benchmark Portfolio Analytics
    var analyticsBenchmark = this.measure("Portfolio Analytics Aggregation", function() {
      return AnalyticsService.getPortfolioAnalytics();
    });
    benchmarks.push(analyticsBenchmark);

    return formatSuccessResponse({
      timestamp: new Date().toISOString(),
      totalBenchmarks: benchmarks.length,
      benchmarks: benchmarks
    }, "Serangkaian uji benchmark performa selesai.");
  }
};

function apiRunPerformanceBenchmarks() {
  return safeWebResponse(function() {
    return PerformanceBenchmark.runAllBenchmarks();
  }, "apiRunPerformanceBenchmarks");
}
