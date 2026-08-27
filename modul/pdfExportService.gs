/**
 * PDF Export Service - Pembentukan Laporan Proyek & Dokumen PDF
 * Mengikuti arsitektur Service Layer & Standar Pelaporan Resmi
 */

var PdfExportService = {
  /**
   * Menghasilkan dokumen HTML terstruktur untuk laporan proyek individual
   * @param {string} projectId
   * @returns {string}
   */
  generateProjectReportHtml: function(projectId) {
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
    var planned = ProgressEngine.calculatePlannedProgress(project.start_date, project.end_date, today, "SCURVE");
    var latestActual = logs.length > 0 ? Number(logs[logs.length - 1].actual_progress || 0) : 0;
    var deviation = ProgressEngine.calculateDeviation(latestActual, planned);
    var status = project.status === "COMPLETED" ? "COMPLETED" : ProgressEngine.determineProgressStatus(latestActual, planned);
    var devAbs = Math.abs(deviation).toFixed(2);

    var rowsHtml = "";
    if (logs.length === 0) {
      rowsHtml = "<tr><td colspan='5' style='text-align: center; color: #64748b; padding: 12px;'>Belum ada riwayat progres tercatat.</td></tr>";
    } else {
      for (var i = 0; i < logs.length; i++) {
        var log = logs[i];
        var dClass = log.deviation < 0 ? "color: #dc2626; font-weight: bold;" : "color: #16a34a;";
        rowsHtml += "<tr>"
          + "<td style='padding: 8px; border: 1px solid #cbd5e1;'>" + log.date + "</td>"
          + "<td style='padding: 8px; border: 1px solid #cbd5e1; text-align: right;'>" + log.planned_progress + "%</td>"
          + "<td style='padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;'>" + log.actual_progress + "%</td>"
          + "<td style='padding: 8px; border: 1px solid #cbd5e1; text-align: right; " + dClass + "'>" + (log.deviation > 0 ? "+" : "") + log.deviation + "%</td>"
          + "<td style='padding: 8px; border: 1px solid #cbd5e1;'>" + (log.notes || "-") + "</td>"
          + "</tr>";
      }
    }

    return "<!DOCTYPE html>"
      + "<html>"
      + "<head>"
      + "<meta charset='UTF-8'>"
      + "<style>"
      + "body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; font-size: 13px; }"
      + ".header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }"
      + ".title { font-size: 22px; font-weight: bold; color: #0f172a; margin: 0; }"
      + ".subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0 0; }"
      + ".grid { width: 100%; border-collapse: collapse; margin-bottom: 20px; }"
      + ".grid td { padding: 6px 0; vertical-align: top; }"
      + ".kpi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; }"
      + ".table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }"
      + ".table th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }"
      + ".footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #64748b; text-align: right; }"
      + "</style>"
      + "</head>"
      + "<body>"
      + "<div class='header'>"
      + "<h1 class='title'>LAPORAN KEMAJUAN PROYEK</h1>"
      + "<p class='subtitle'>System Reminder 2 — Automated Project Tracking System</p>"
      + "</div>"
      + "<table class='grid'>"
      + "<tr><td style='width: 25%; font-weight: bold;'>Nama Proyek</td><td>: " + project.project_name + "</td></tr>"
      + "<tr><td style='font-weight: bold;'>ID Proyek</td><td>: " + project.project_id + "</td></tr>"
      + "<tr><td style='font-weight: bold;'>Penanggung Jawab (PIC)</td><td>: " + project.pic_name + " (" + project.pic_email + ")</td></tr>"
      + "<tr><td style='font-weight: bold;'>Periode Proyek</td><td>: " + project.start_date + " s.d. " + project.end_date + "</td></tr>"
      + "<tr><td style='font-weight: bold;'>Status Siklus Hidup</td><td>: " + project.status + " (" + status + ")</td></tr>"
      + "</table>"
      + "<div class='kpi-box'>"
      + "<table style='width: 100%; text-align: center;'>"
      + "<tr>"
      + "<td><div style='font-size: 11px; color: #64748b;'>Target Rencana</div><div style='font-size: 18px; font-weight: bold; color: #0284c7;'>" + planned + "%</div></td>"
      + "<td><div style='font-size: 11px; color: #64748b;'>Realisasi Aktual</div><div style='font-size: 18px; font-weight: bold; color: #0f172a;'>" + latestActual + "%</div></td>"
      + "<td><div style='font-size: 11px; color: #64748b;'>Deviasi</div><div style='font-size: 18px; font-weight: bold; " + (deviation < 0 ? "color: #dc2626;" : "color: #16a34a;") + "'>" + (deviation > 0 ? "+" : "") + deviation + "%</div></td>"
      + "</tr>"
      + "</table>"
      + "</div>"
      + "<h3 style='font-size: 14px; margin-bottom: 6px;'>Riwayat Catatan Progres Harian</h3>"
      + "<table class='table'>"
      + "<thead><tr><th>Tanggal</th><th style='text-align: right;'>Rencana</th><th style='text-align: right;'>Aktual</th><th style='text-align: right;'>Deviasi</th><th>Catatan</th></tr></thead>"
      + "<tbody>" + rowsHtml + "</tbody>"
      + "</table>"
      + "<div class='footer'>"
      + "<p>Dokumen ini dibuat otomatis pada " + new Date().toISOString() + " | POL.ISMS.001</p>"
      + "</div>"
      + "</body>"
      + "</html>";
  },

  /**
   * Menghasilkan dokumen HTML untuk ringkasan portofolio seluruh proyek
   * @returns {string}
   */
  generatePortfolioReportHtml: function() {
    var execRes = DashboardSummaryService.getExecutiveSummary();
    var sum = execRes.data;

    var rows = "";
    for (var i = 0; i < sum.projectDetails.length; i++) {
      var p = sum.projectDetails[i];
      rows += "<tr>"
        + "<td style='padding: 8px; border: 1px solid #cbd5e1;'><strong>" + p.projectName + "</strong><br><small>" + p.picName + "</small></td>"
        + "<td style='padding: 8px; border: 1px solid #cbd5e1; font-size: 11px;'>" + p.startDate + " s.d. " + p.endDate + "</td>"
        + "<td style='padding: 8px; border: 1px solid #cbd5e1; text-align: right;'>" + p.plannedProgress + "%</td>"
        + "<td style='padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;'>" + p.actualProgress + "%</td>"
        + "<td style='padding: 8px; border: 1px solid #cbd5e1; text-align: right; " + (p.deviation < 0 ? "color: #dc2626;" : "color: #16a34a;") + "'>" + (p.deviation > 0 ? "+" : "") + p.deviation + "%</td>"
        + "<td style='padding: 8px; border: 1px solid #cbd5e1; text-align: center;'>" + p.scheduleStatus + "</td>"
        + "</tr>";
    }

    return "<!DOCTYPE html>"
      + "<html>"
      + "<head>"
      + "<meta charset='UTF-8'>"
      + "<style>"
      + "body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; font-size: 12px; }"
      + ".header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }"
      + ".title { font-size: 22px; font-weight: bold; color: #0f172a; margin: 0; }"
      + ".kpi-grid { display: table; width: 100%; margin-bottom: 20px; }"
      + ".kpi-cell { display: table-cell; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; text-align: center; }"
      + ".table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }"
      + ".table th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }"
      + "</style>"
      + "</head>"
      + "<body>"
      + "<div class='header'>"
      + "<h1 class='title'>RINGKASAN EKSEKUTIF PORTOFOLIO PROYEK</h1>"
      + "<p style='color: #64748b; margin: 4px 0 0 0;'>System Reminder 2 — Executive Project Dashboard Report</p>"
      + "</div>"
      + "<div class='kpi-grid'>"
      + "<div class='kpi-cell'><div>Total Proyek</div><strong style='font-size: 16px;'>" + sum.totalProjects + "</strong></div>"
      + "<div class='kpi-cell'><div>On Track</div><strong style='font-size: 16px; color: #16a34a;'>" + sum.onTrackCount + "</strong></div>"
      + "<div class='kpi-cell'><div>Delayed</div><strong style='font-size: 16px; color: #dc2626;'>" + sum.delayedCount + "</strong></div>"
      + "<div class='kpi-cell'><div>Rata-rata Aktual</div><strong style='font-size: 16px;'>" + sum.averageActualProgress + "%</strong></div>"
      + "</div>"
      + "<h3>Daftar Proyek</h3>"
      + "<table class='table'>"
      + "<thead><tr><th>Proyek & PIC</th><th>Jadwal</th><th style='text-align: right;'>Rencana</th><th style='text-align: right;'>Aktual</th><th style='text-align: right;'>Deviasi</th><th style='text-align: center;'>Status</th></tr></thead>"
      + "<tbody>" + rows + "</tbody>"
      + "</table>"
      + "</body>"
      + "</html>";
  },

  /**
   * Menghasilkan dokumen PDF Blob untuk satu proyek
   * @param {string} projectId
   * @returns {object} { filename, mimeType, base64 }
   */
  exportProjectPdfBlob: function(projectId) {
    var htmlContent = this.generateProjectReportHtml(projectId);
    var project = ProjectRepository.findById(projectId);
    var dateStr = ProgressEngine.formatDateYMD_(new Date()).replace(/-/g, "");
    var safeName = sanitizeString(project.project_name).replace(/[^a-zA-Z0-9]/g, "_");
    var fileName = "Laporan_Proyek_" + safeName + "_" + dateStr + ".pdf";

    var base64Data = "";
    if (typeof Utilities !== "undefined" && Utilities.newBlob) {
      try {
        var blob = Utilities.newBlob(htmlContent, "text/html", fileName).getAs("application/pdf");
        base64Data = Utilities.base64Encode(blob.getBytes());
      } catch (err) {
        base64Data = Buffer.from(htmlContent).toString("base64");
      }
    } else {
      base64Data = Buffer.from(htmlContent).toString("base64");
    }

    AppLogger.audit("PdfExportService", "PDF_EXPORTED", "SUCCESS", {
      projectId: projectId,
      fileName: fileName
    });

    return {
      fileName: fileName,
      mimeType: "application/pdf",
      base64: base64Data
    };
  },

  /**
   * Menghasilkan dokumen PDF Blob untuk portofolio seluruh proyek
   * @returns {object} { filename, mimeType, base64 }
   */
  exportPortfolioPdfBlob: function() {
    var htmlContent = this.generatePortfolioReportHtml();
    var dateStr = ProgressEngine.formatDateYMD_(new Date()).replace(/-/g, "");
    var fileName = "Laporan_Portofolio_Proyek_" + dateStr + ".pdf";

    var base64Data = "";
    if (typeof Utilities !== "undefined" && Utilities.newBlob) {
      try {
        var blob = Utilities.newBlob(htmlContent, "text/html", fileName).getAs("application/pdf");
        base64Data = Utilities.base64Encode(blob.getBytes());
      } catch (err) {
        base64Data = Buffer.from(htmlContent).toString("base64");
      }
    } else {
      base64Data = Buffer.from(htmlContent).toString("base64");
    }

    AppLogger.audit("PdfExportService", "PORTFOLIO_PDF_EXPORTED", "SUCCESS", {
      fileName: fileName
    });

    return {
      fileName: fileName,
      mimeType: "application/pdf",
      base64: base64Data
    };
  }
};
