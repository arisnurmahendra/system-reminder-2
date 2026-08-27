/**
 * Google Drive Integration Service - Pengelolaan Berkas dan Folder Terpusat
 * Mengikuti arsitektur Service Layer & Single Responsibility Principle
 */

var GoogleDriveService = {
  /**
   * Mengambil folder berdasarkan nama atau membuatnya jika belum ada
   * @param {string} folderName
   * @param {string} [parentFolderId]
   * @returns {object} { folderId, name, url }
   */
  getOrCreateFolder: function(folderName, parentFolderId) {
    validateRequired(folderName, "Nama Folder");
    var cleanName = sanitizeString(folderName);

    if (typeof DriveApp === "undefined") {
      AppLogger.debug("GoogleDriveService", "Mock getOrCreateFolder: " + cleanName);
      return {
        folderId: "fld_mock_" + cleanName.replace(/\s+/g, "_"),
        name: cleanName,
        url: "https://drive.google.com/drive/folders/mock_" + cleanName
      };
    }

    try {
      var parent = parentFolderId ? DriveApp.getFolderById(parentFolderId) : DriveApp.getRootFolder();
      var folders = parent.getFoldersByName(cleanName);

      if (folders.hasNext()) {
        var existing = folders.next();
        return {
          folderId: existing.getId(),
          name: existing.getName(),
          url: existing.getUrl()
        };
      }

      var created = parent.createFolder(cleanName);
      AppLogger.audit("GoogleDriveService", "DRIVE_FOLDER_CREATED", "SUCCESS", {
        folderId: created.getId(),
        name: cleanName
      });

      return {
        folderId: created.getId(),
        name: created.getName(),
        url: created.getUrl()
      };
    } catch (err) {
      AppLogger.error("GoogleDriveService", "Gagal mengelola folder: " + err.message, err);
      throw ErrorFactory.system("Gagal mengelola folder Google Drive: " + err.message);
    }
  },

  /**
   * Mengambil atau membuat folder khusus untuk sebuah proyek
   * @param {string} projectId
   * @returns {object}
   */
  getProjectFolder: function(projectId) {
    var project = ProjectRepository.findById(projectId);
    if (!project) {
      throw ErrorFactory.notFound("Proyek", projectId);
    }

    var rootAppFolder = this.getOrCreateFolder("System_Reminder_2_Reports");
    var projectFolderName = "[" + project.project_id + "] " + project.project_name;
    return this.getOrCreateFolder(projectFolderName, rootAppFolder.folderId);
  },

  /**
   * Mengunggah berkas ke Google Drive pada folder tertentu
   * @param {string} folderId
   * @param {string} fileName
   * @param {string} mimeType
   * @param {string|object} contentBlobOrString
   * @returns {object} { fileId, fileName, url, downloadUrl }
   */
  uploadFile: function(folderId, fileName, mimeType, contentBlobOrString) {
    validateRequired(folderId, "Folder ID");
    validateRequired(fileName, "File Name");

    var cleanFileName = sanitizeString(fileName);
    var cleanMimeType = mimeType || "application/octet-stream";

    if (typeof DriveApp === "undefined") {
      AppLogger.debug("GoogleDriveService", "Mock uploadFile: " + cleanFileName);
      var mockFileId = "file_mock_" + Utilities.getUuid();
      AppLogger.audit("GoogleDriveService", "DRIVE_FILE_UPLOADED", "SUCCESS", {
        fileId: mockFileId,
        fileName: cleanFileName,
        folderId: folderId
      });
      return {
        fileId: mockFileId,
        fileName: cleanFileName,
        url: "https://drive.google.com/file/d/" + mockFileId + "/view",
        downloadUrl: "https://drive.google.com/uc?export=download&id=" + mockFileId
      };
    }

    try {
      var folder = DriveApp.getFolderById(folderId);
      var blob;

      if (typeof contentBlobOrString === "string") {
        blob = Utilities.newBlob(contentBlobOrString, cleanMimeType, cleanFileName);
      } else if (contentBlobOrString && typeof contentBlobOrString.getBytes === "function") {
        blob = contentBlobOrString;
      } else {
        blob = Utilities.newBlob(String(contentBlobOrString), cleanMimeType, cleanFileName);
      }

      var file = folder.createFile(blob);
      var fileId = file.getId();
      var fileUrl = file.getUrl();
      var downloadUrl = file.getDownloadUrl ? file.getDownloadUrl() : fileUrl;

      AppLogger.audit("GoogleDriveService", "DRIVE_FILE_UPLOADED", "SUCCESS", {
        fileId: fileId,
        fileName: cleanFileName,
        folderId: folderId
      });

      return {
        fileId: fileId,
        fileName: cleanFileName,
        url: fileUrl,
        downloadUrl: downloadUrl
      };
    } catch (err) {
      AppLogger.error("GoogleDriveService", "Gagal mengunggah file: " + err.message, err);
      throw ErrorFactory.system("Gagal mengunggah file ke Google Drive: " + err.message);
    }
  },

  /**
   * Menyimpan laporan PDF proyek ke folder Google Drive proyek terkait
   * @param {string} projectId
   * @returns {object} { success, fileId, url, fileName }
   */
  saveProjectPdfToDrive: function(projectId) {
    var projectFolder = this.getProjectFolder(projectId);
    var htmlContent = PdfExportService.generateProjectReportHtml(projectId);
    var project = ProjectRepository.findById(projectId);
    var dateStr = ProgressEngine.formatDateYMD_(new Date()).replace(/-/g, "");
    var safeName = sanitizeString(project.project_name).replace(/[^a-zA-Z0-9]/g, "_");
    var fileName = "Laporan_Proyek_" + safeName + "_" + dateStr + ".pdf";

    var fileResult;
    if (typeof Utilities !== "undefined" && Utilities.newBlob) {
      try {
        var pdfBlob = Utilities.newBlob(htmlContent, "text/html", fileName).getAs("application/pdf");
        fileResult = this.uploadFile(projectFolder.folderId, fileName, "application/pdf", pdfBlob);
      } catch (e) {
        fileResult = this.uploadFile(projectFolder.folderId, fileName, "application/pdf", htmlContent);
      }
    } else {
      fileResult = this.uploadFile(projectFolder.folderId, fileName, "application/pdf", htmlContent);
    }

    return formatSuccessResponse(fileResult, "Laporan PDF berhasil disimpan ke Google Drive.");
  },

  /**
   * Menghapus berkas dari Google Drive (pindah ke Sampah)
   * @param {string} fileId
   * @returns {boolean}
   */
  deleteFile: function(fileId) {
    validateRequired(fileId, "File ID");

    if (typeof DriveApp === "undefined") {
      AppLogger.audit("GoogleDriveService", "DRIVE_FILE_DELETED", "SUCCESS", { fileId: fileId });
      return true;
    }

    try {
      var file = DriveApp.getFileById(fileId);
      file.setTrashed(true);

      AppLogger.audit("GoogleDriveService", "DRIVE_FILE_DELETED", "SUCCESS", {
        fileId: fileId,
        fileName: file.getName()
      });

      return true;
    } catch (err) {
      AppLogger.error("GoogleDriveService", "Gagal menghapus file: " + err.message, err);
      return false;
    }
  }
};
