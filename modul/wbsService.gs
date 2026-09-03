/**
 * WBS Service - Mengelola Work Breakdown Structure & Kalkulasi Time Schedule
 */

var WBSService = {
  /**
   * Mendapatkan daftar WBS dan mengkalkulasi Time Schedule
   */
  getProjectWBSAndSchedule: function(projectId, periodScale) {
    if (!projectId) throw ErrorFactory.validation("Project ID diperlukan.");
    periodScale = periodScale || "WEEKLY";
    
    var project = ProjectRepository.findById(projectId);
    if (!project) throw ErrorFactory.notFound("Proyek", projectId);
    
    var wbsList = WBSRepository.findByProject(projectId);
    var actualLogs = ProgressLogRepository.findByProject(projectId);

    var projStart = new Date(project.start_date);
    var projEnd = new Date(project.end_date);
    
    var periods = this._generatePeriods(projStart, projEnd, periodScale);
    
    // 3. Kalkulasi Distribusi Rencana per Item WBS
    var bobotRencanaPeriodik = new Array(periods.length).fill(0);
    var wbsWithDistribution = wbsList.map(function(item) {
      var itemStart = new Date(item.start_date);
      var itemEnd = new Date(item.end_date);
      var itemWeight = parseFloat(item.weight) || 0;
      var totalDays = Math.max(1, Math.ceil((itemEnd - itemStart) / (1000 * 60 * 60 * 24)));
      
      var distribution = [];
      for (var i = 0; i < periods.length; i++) {
        var pStart = periods[i].start;
        var pEnd = periods[i].end;
        var overlapDays = this._getOverlapDays(itemStart, itemEnd, pStart, pEnd);
        var bobotPeriodeIni = (overlapDays / totalDays) * itemWeight;
        distribution.push(bobotPeriodeIni);
        bobotRencanaPeriodik[i] += bobotPeriodeIni;
      }
      return {
        wbs_id: item.wbs_id,
        task_name: item.task_name,
        weight: itemWeight,
        start_date: item.start_date,
        end_date: item.end_date,
        actual_progress: item.actual_progress,
        distribution: distribution
      };
    }.bind(this));

    // 4. Kalkulasi Summary Bawah
    var akumulasiRencana = 0;
    var akumulasiRencanaArr = [];
    for (var i = 0; i < bobotRencanaPeriodik.length; i++) {
      akumulasiRencana += bobotRencanaPeriodik[i];
      akumulasiRencanaArr.push(akumulasiRencana);
    }

    var bobotPelaksanaanPeriodik = new Array(periods.length).fill(0);
    var akumulasiPelaksanaanArr = new Array(periods.length).fill(0);
    var deviasiArr = new Array(periods.length).fill(0);
    
    var lastActual = 0;
    for (var i = 0; i < periods.length; i++) {
      var pEnd = periods[i].end;
      var logsUpToPeriod = actualLogs.filter(function(l) {
        return new Date(l.date || l.report_date) <= pEnd;
      }).sort(function(a, b) {
        return new Date(b.date || b.report_date) - new Date(a.date || a.report_date);
      });
      
      var currentActual = logsUpToPeriod.length > 0 ? parseFloat(logsUpToPeriod[0].actual_progress) : lastActual;
      var bobotPeriode = currentActual - lastActual;
      if (bobotPeriode < 0) bobotPeriode = 0;
      
      bobotPelaksanaanPeriodik[i] = bobotPeriode;
      akumulasiPelaksanaanArr[i] = currentActual;
      deviasiArr[i] = currentActual - akumulasiRencanaArr[i];
      
      lastActual = currentActual;
    }

    return formatSuccessResponse({
      periods: periods.map(function(p, i) { return p.label; }),
      wbs: wbsWithDistribution,
      summary: {
        bobot_rencana: bobotRencanaPeriodik,
        akumulasi_rencana: akumulasiRencanaArr,
        bobot_pelaksanaan: bobotPelaksanaanPeriodik,
        akumulasi_pelaksanaan: akumulasiPelaksanaanArr,
        deviasi: deviasiArr
      }
    });
  },

  saveWBSItem: function(payload) {
    validateRequired(payload.project_id, "Project ID");
    validateRequired(payload.task_name, "Keterangan Pekerjaan");
    validateRequired(payload.weight, "Bobot");
    validateRequired(payload.start_date, "Tanggal Mulai");
    validateRequired(payload.end_date, "Tanggal Selesai");

    var id = WBSRepository.insert({
      project_id: payload.project_id,
      task_name: payload.task_name,
      weight: parseFloat(payload.weight),
      start_date: payload.start_date,
      end_date: payload.end_date,
      actual_progress: payload.actual_progress || 0
    });

    return formatSuccessResponse({ wbs_id: id }, "Item WBS berhasil disimpan.");
  },

  deleteWBSItem: function(wbsId) {
    if (!wbsId) throw ErrorFactory.validation("WBS ID diperlukan.");
    WBSRepository.delete(wbsId);
    return formatSuccessResponse(null, "Item WBS berhasil dihapus.");
  },

  // --- Helper Functions ---
  _generatePeriods: function(startDate, endDate, scale) {
    var periods = [];
    var current = new Date(startDate);
    current.setHours(0,0,0,0);
    
    var end = new Date(endDate);
    end.setHours(23,59,59,999);
    
    var index = 1;
    while (current <= end) {
      var periodEnd = new Date(current);
      var label = "";
      
      if (scale === "DAILY") {
        label = "H" + index; // H1, H2
        periodEnd.setHours(23,59,59,999);
      } else if (scale === "MONTHLY") {
        label = "Bln " + index;
        periodEnd.setMonth(current.getMonth() + 1);
        periodEnd.setDate(0); // Hari terakhir bulan tsb
        periodEnd.setHours(23,59,59,999);
      } else {
        // WEEKLY default
        label = "Mgg " + index;
        periodEnd.setDate(current.getDate() + 6);
      }
      
      if (periodEnd > end) periodEnd = end;
      
      periods.push({
        label: label,
        start: new Date(current),
        end: new Date(periodEnd)
      });
      
      if (scale === "DAILY") {
        current.setDate(current.getDate() + 1);
      } else if (scale === "MONTHLY") {
        current.setMonth(current.getMonth() + 1);
        current.setDate(1);
      } else {
        current.setDate(current.getDate() + 7);
      }
      index++;
    }
    return periods;
  },

  _getOverlapDays: function(itemStart, itemEnd, weekStart, weekEnd) {
    var start = itemStart > weekStart ? itemStart : weekStart;
    var end = itemEnd < weekEnd ? itemEnd : weekEnd;
    if (start > end) return 0;
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // inclusive
  }
};
