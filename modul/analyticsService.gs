/**
 * Analytics Service - Agregasi Visualisasi & Analisis Kinerja Portofolio Proyek
 * Mengikuti arsitektur Service Layer & Single Responsibility Principle
 */

var AnalyticsService = {
  /**
   * Menghasilkan analisis statistik lengkap portofolio proyek untuk komponen grafik & KPI
   * @returns {object}
   */
  getPortfolioAnalytics: function() {
    var allProjects = ProjectRepository.findAll();
    var today = ProgressEngine.formatDateYMD_(new Date());

    var analytics = {
      summary: {
        totalProjects: allProjects.length,
        activeProjects: 0,
        completedProjects: 0,
        delayedProjects: 0,
        onTrackProjects: 0,
        completionRate: 0,
        averageActualProgress: 0,
        averagePlannedProgress: 0,
        averageDelayOfDelayed: 0
      },
      statusDistribution: {
        ACTIVE: 0,
        COMPLETED: 0,
        CANCELLED: 0,
        ARCHIVED: 0
      },
      scheduleHealthDistribution: {
        AHEAD: 0,
        ON_TRACK: 0,
        DELAYED: 0
      },
      progressQuartiles: {
        "0_25": 0,
        "26_50": 0,
        "51_75": 0,
        "76_100": 0
      },
      monthlyTrends: {},
      topDelayedProjects: []
    };

    if (allProjects.length === 0) {
      return formatSuccessResponse(analytics, "Belum ada data analitik.");
    }

    var totalActualSum = 0;
    var totalPlannedSum = 0;
    var activeCount = 0;
    var delayedSum = 0;
    var delayedList = [];

    for (var i = 0; i < allProjects.length; i++) {
      var p = allProjects[i];

      // 1. Status Distribusi Siklus Hidup
      if (analytics.statusDistribution[p.status] !== undefined) {
        analytics.statusDistribution[p.status]++;
      }

      if (p.status === "ACTIVE") analytics.summary.activeProjects++;
      else if (p.status === "COMPLETED") analytics.summary.completedProjects++;

      // 2. Ambil progres aktual terakhir
      var logs = ProgressLogRepository.findByProject(p.project_id);
      var latestActual = 0;
      if (logs.length > 0) {
        logs.sort(function(a, b) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        latestActual = Number(logs[0].actual_progress || 0);
      }

      // 3. Distribusi Kuartil Progres
      if (latestActual <= 25) analytics.progressQuartiles["0_25"]++;
      else if (latestActual <= 50) analytics.progressQuartiles["26_50"]++;
      else if (latestActual <= 75) analytics.progressQuartiles["51_75"]++;
      else analytics.progressQuartiles["76_100"]++;

      // 4. Hitung kesehatan jadwal
      var planned = ProgressEngine.calculatePlannedProgress(p.start_date, p.end_date, today, "SCURVE");
      var deviation = ProgressEngine.calculateDeviation(latestActual, planned);
      var health = ProgressEngine.determineProgressStatus(latestActual, planned);

      if (p.status === "ACTIVE") {
        activeCount++;
        totalActualSum += latestActual;
        totalPlannedSum += planned;

        if (health === "DELAYED") {
          analytics.summary.delayedProjects++;
          analytics.scheduleHealthDistribution.DELAYED++;
          delayedSum += Math.abs(deviation);
          delayedList.push({
            projectId: p.project_id,
            projectName: p.project_name,
            picName: p.pic_name,
            planned: planned,
            actual: latestActual,
            deviation: deviation
          });
        } else if (health === "AHEAD") {
          analytics.summary.onTrackProjects++;
          analytics.scheduleHealthDistribution.AHEAD++;
        } else {
          analytics.summary.onTrackProjects++;
          analytics.scheduleHealthDistribution.ON_TRACK++;
        }
      }

      // 5. Tren Bulanan berdasarkan Tanggal Target Selesai
      var endMonth = p.end_date ? p.end_date.substring(0, 7) : "Unknown";
      if (!analytics.monthlyTrends[endMonth]) {
        analytics.monthlyTrends[endMonth] = { targetEndCount: 0, completedCount: 0 };
      }
      analytics.monthlyTrends[endMonth].targetEndCount++;
      if (p.status === "COMPLETED") {
        analytics.monthlyTrends[endMonth].completedCount++;
      }
    }

    if (allProjects.length > 0) {
      analytics.summary.completionRate = Math.round((analytics.summary.completedProjects / allProjects.length) * 100);
    }

    if (activeCount > 0) {
      analytics.summary.averageActualProgress = Math.round((totalActualSum / activeCount) * 100) / 100;
      analytics.summary.averagePlannedProgress = Math.round((totalPlannedSum / activeCount) * 100) / 100;
    }

    if (analytics.summary.delayedProjects > 0) {
      analytics.summary.averageDelayOfDelayed = Math.round((delayedSum / analytics.summary.delayedProjects) * 100) / 100;
    }

    delayedList.sort(function(a, b) {
      return a.deviation - b.deviation;
    });
    analytics.topDelayedProjects = delayedList.slice(0, 5);

    return formatSuccessResponse(analytics, "Analitik portofolio berhasil dikompilasi.");
  },

  /**
   * Menghasilkan metrik analitik mendalam untuk satu proyek
   * @param {string} projectId
   * @returns {object}
   */
  getProjectAnalytics: function(projectId) {
    validateRequired(projectId, "Project ID");
    var project = ProjectRepository.findById(projectId);
    if (!project) {
      throw ErrorFactory.notFound("Proyek", projectId);
    }

    var logs = ProgressLogRepository.findByProject(projectId);
    logs.sort(function(a, b) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    var today = ProgressEngine.formatDateYMD_(new Date());
    var totalDuration = ProgressEngine.calculateTotalDuration(project.start_date, project.end_date);
    var elapsed = ProgressEngine.calculateElapsedDays(project.start_date, today);
    var latestActual = logs.length > 0 ? Number(logs[logs.length - 1].actual_progress || 0) : 0;
    var planned = ProgressEngine.calculatePlannedProgress(project.start_date, project.end_date, today, "SCURVE");
    var deviation = ProgressEngine.calculateDeviation(latestActual, planned);

    var velocityPerDay = elapsed > 0 ? Math.round((latestActual / elapsed) * 100) / 100 : 0;
    var forecastEndDate = ProgressEngine.calculateEstimatedCompletionDate(project.start_date, project.end_date, latestActual, today);

    var result = {
      projectId: project.project_id,
      projectName: project.project_name,
      status: project.status,
      totalDurationDays: totalDuration,
      elapsedDays: elapsed,
      daysRemaining: ProgressEngine.calculateDaysRemaining(project.end_date, today),
      latestActualProgress: latestActual,
      currentPlannedProgress: planned,
      currentDeviation: deviation,
      progressVelocityPerDay: velocityPerDay,
      forecastEndDate: forecastEndDate,
      totalLogsRecorded: logs.length
    };

    return formatSuccessResponse(result, "Analitik proyek berhasil dihasilkan.");
  }
};
