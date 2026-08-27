/**
 * Dashboard Summary Service - Agregasi Metrik & KPI Eksekutif Portofolio Proyek
 * Mengikuti arsitektur Service Layer & Single Responsibility Principle
 */

var DashboardSummaryService = {
  /**
   * Menghasilkan ringkasan eksekutif seluruh kondisi proyek, KPI, dan notifikasi
   * @returns {object}
   */
  getExecutiveSummary: function() {
    var allProjects = ProjectRepository.findAll();
    var today = ProgressEngine.formatDateYMD_(new Date());

    var summary = {
      totalProjects: allProjects.length,
      activeProjects: 0,
      completedProjects: 0,
      cancelledProjects: 0,
      archivedProjects: 0,
      onTrackCount: 0,
      delayedCount: 0,
      averagePlannedProgress: 0,
      averageActualProgress: 0,
      averageDeviation: 0,
      urgentProjects: [],
      projectDetails: []
    };

    if (allProjects.length === 0) {
      return formatSuccessResponse(summary, "Belum ada data proyek.");
    }

    var totalPlannedSum = 0;
    var totalActualSum = 0;
    var totalDevSum = 0;
    var activeEvaluatedCount = 0;

    for (var i = 0; i < allProjects.length; i++) {
      var project = allProjects[i];

      if (project.status === "ACTIVE") summary.activeProjects++;
      else if (project.status === "COMPLETED") summary.completedProjects++;
      else if (project.status === "CANCELLED") summary.cancelledProjects++;
      else if (project.status === "ARCHIVED") summary.archivedProjects++;

      // Ambil log progres terbaru
      var logs = ProgressLogRepository.findByProject(project.project_id);
      var latestActual = 0;
      var latestLogDate = "";

      if (logs.length > 0) {
        logs.sort(function(a, b) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        latestActual = Number(logs[0].actual_progress || 0);
        latestLogDate = logs[0].date;
      }

      // Hitung planned progress pada hari ini
      var planned = ProgressEngine.calculatePlannedProgress(project.start_date, project.end_date, today, "SCURVE");
      var deviation = ProgressEngine.calculateDeviation(latestActual, planned);
      var status = ProgressEngine.determineProgressStatus(latestActual, planned);

      if (project.status === "COMPLETED") {
        status = "COMPLETED";
      }

      if (project.status === "ACTIVE") {
        activeEvaluatedCount++;
        totalPlannedSum += planned;
        totalActualSum += latestActual;
        totalDevSum += deviation;

        if (status === "DELAYED") {
          summary.delayedCount++;
          summary.urgentProjects.push({
            projectId: project.project_id,
            projectName: project.project_name,
            picName: project.pic_name,
            picPhone: project.pic_phone,
            picEmail: project.pic_email,
            plannedProgress: planned,
            actualProgress: latestActual,
            deviation: deviation,
            daysRemaining: ProgressEngine.calculateDaysRemaining(project.end_date, today)
          });
        } else {
          summary.onTrackCount++;
        }
      }

      summary.projectDetails.push({
        projectId: project.project_id,
        projectName: project.project_name,
        picName: project.pic_name,
        picEmail: project.pic_email,
        startDate: project.start_date,
        endDate: project.end_date,
        projectStatus: project.status,
        scheduleStatus: status,
        plannedProgress: planned,
        actualProgress: latestActual,
        deviation: deviation,
        latestLogDate: latestLogDate
      });
    }

    if (activeEvaluatedCount > 0) {
      summary.averagePlannedProgress = Math.round((totalPlannedSum / activeEvaluatedCount) * 100) / 100;
      summary.averageActualProgress = Math.round((totalActualSum / activeEvaluatedCount) * 100) / 100;
      summary.averageDeviation = Math.round((totalDevSum / activeEvaluatedCount) * 100) / 100;
    }

    // Urutkan proyek kritis (urgent) dari keterlambatan deviasi paling negatif
    summary.urgentProjects.sort(function(a, b) {
      return a.deviation - b.deviation;
    });

    return formatSuccessResponse(summary, "Ringkasan eksekutif berhasil dikompilasi.");
  }
};
