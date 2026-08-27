/**
 * Advanced Report Service - Pelaporan Analitis Portofolio & Audit Proyek
 * Mengikuti arsitektur Service Layer & Single Responsibility Principle
 */

var AdvancedReportService = {
  /**
   * Menghasilkan laporan komprehensif eksekutif (Proyek, Progres, Notifikasi, Performa)
   * @param {object} [filters]
   * @returns {object}
   */
  generateExecutiveReport: function(filters) {
    var execSummary = DashboardSummaryService.getExecutiveSummary().data;
    var analytics = AnalyticsService.getPortfolioAnalytics().data;
    var notifStats = NotificationHistoryService.getNotificationStats().data;

    var report = {
      generatedAt: new Date().toISOString(),
      standardsCompliance: "POL.ISMS.001",
      executiveSummary: execSummary,
      portfolioAnalytics: analytics,
      notificationRecap: notifStats,
      reportType: "EXECUTIVE_PORTFOLIO_REPORT"
    };

    return formatSuccessResponse(report, "Laporan eksekutif komprehensif berhasil dikompilasi.");
  },

  /**
   * Menghasilkan laporan analitis mendalam untuk satu proyek tertentu
   * @param {string} projectId
   * @returns {object}
   */
  generateProjectDetailReport: function(projectId) {
    validateRequired(projectId, "Project ID");
    var project = ProjectRepository.findById(projectId);
    if (!project) {
      throw ErrorFactory.notFound("Proyek", projectId);
    }

    var projectSummary = ProjectService.getProjectById(projectId).data;
    var projectAnalytics = AnalyticsService.getProjectAnalytics(projectId).data;
    var progressLogs = ProgressLogRepository.findByProject(projectId);
    progressLogs.sort(function(a, b) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    var notifLogs = NotificationHistoryService.getNotificationHistory({
      keyword: projectId,
      limit: 100
    }).data.logs;

    var report = {
      generatedAt: new Date().toISOString(),
      project: project,
      summary: projectSummary.summary,
      analytics: projectAnalytics,
      progressHistory: progressLogs,
      notificationHistory: notifLogs
    };

    return formatSuccessResponse(report, "Laporan detail proyek berhasil dihasilkan.");
  },

  /**
   * Menghasilkan laporan varians dan deviasi progres seluruh proyek aktif
   * @param {object} [filters]
   * @returns {object}
   */
  generateProgressVarianceReport: function(filters) {
    var allProjects = ProjectRepository.findAll();
    var today = ProgressEngine.formatDateYMD_(new Date());

    var varianceList = [];
    for (var i = 0; i < allProjects.length; i++) {
      var p = allProjects[i];
      var logs = ProgressLogRepository.findByProject(p.project_id);
      var latestActual = 0;
      if (logs.length > 0) {
        logs.sort(function(a, b) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        latestActual = Number(logs[0].actual_progress || 0);
      }

      var planned = ProgressEngine.calculatePlannedProgress(p.start_date, p.end_date, today, "SCURVE");
      var deviation = ProgressEngine.calculateDeviation(latestActual, planned);
      var status = p.status === "COMPLETED" ? "COMPLETED" : ProgressEngine.determineProgressStatus(latestActual, planned);

      varianceList.push({
        projectId: p.project_id,
        projectName: p.project_name,
        picName: p.pic_name,
        picEmail: p.pic_email,
        startDate: p.start_date,
        endDate: p.end_date,
        plannedProgress: planned,
        actualProgress: latestActual,
        deviation: deviation,
        status: status,
        lifecycleStatus: p.status
      });
    }

    // Terapkan filter jika ada
    if (filters && filters.status && filters.status !== "ALL") {
      varianceList = varianceList.filter(function(item) {
        return item.status === filters.status || item.lifecycleStatus === filters.status;
      });
    }

    varianceList.sort(function(a, b) {
      return a.deviation - b.deviation;
    });

    return formatSuccessResponse({
      totalEvaluated: varianceList.length,
      evaluatedDate: today,
      records: varianceList
    }, "Laporan varians progres berhasil dihasilkan.");
  }
};
