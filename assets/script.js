/**
 * Client-Side Application Script
 * Safe guard for Google Apps Script server-side compilation
 */
if (typeof window !== "undefined" && typeof document !== "undefined") {
  // App State
  const AppState = {
    isAuthenticated: false,
    currentUser: null,
    projects: [],
    selectedProject: null,
    currentTab: 'overview'
  };

  // DOM Content Loaded
  document.addEventListener('DOMContentLoaded', () => {
    setupTabNavigation();
    setupMobileSidebar();
    setupPasswordToggles();
    setupPasswordPolicyLiveCheck();
    checkActiveSession();
  });

  // ==========================================
  // 1. SESSION & AUTHENTICATION
  // ==========================================

  function checkActiveSession() {
    if (typeof google === 'undefined' || !google.script || !google.script.run) {
      console.info("Running in Preview / Standalone Mock mode.");
      AppState.isAuthenticated = true;
      AppState.currentUser = { email: "admin@system.local", role: "ADMINISTRATOR" };
      renderAuthenticatedApp();
      return;
    }

    showLoading("Memverifikasi sesi pengguna...");
    google.script.run
      .withSuccessHandler((response) => {
        hideLoading();
        if (response && response.success && response.data && response.data.authenticated) {
          AppState.isAuthenticated = true;
          AppState.currentUser = response.data;
          renderAuthenticatedApp();
        } else {
          AppState.isAuthenticated = false;
          renderLoginForm();
        }
      })
      .withFailureHandler((err) => {
        hideLoading();
        showToast("Gagal memverifikasi sesi: " + err.message, "danger");
        renderLoginForm();
      })
      .apiCheckSession();
  }

  function handleLogin(e) {
    if (e) e.preventDefault();
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!identifier || !password) {
      showToast("Email/Username dan Password wajib diisi.", "warning");
      return;
    }

    showLoading("Memproses login...");
    if (typeof google === 'undefined' || !google.script || !google.script.run) {
      setTimeout(() => {
        hideLoading();
        AppState.isAuthenticated = true;
        AppState.currentUser = { email: identifier, role: "ADMINISTRATOR" };
        renderAuthenticatedApp();
        showToast("Login simulasi berhasil!", "success");
      }, 500);
      return;
    }

    google.script.run
      .withSuccessHandler((response) => {
        hideLoading();
        if (response.success) {
          if (response.data.mustChangePassword) {
            AppState.currentUser = response.data;
            renderChangePasswordForm();
            showToast("Password awal terdeteksi. Silakan ubah password Anda.", "warning");
          } else {
            AppState.isAuthenticated = true;
            AppState.currentUser = response.data;
            renderAuthenticatedApp();
            showToast("Selamat datang, " + (response.data.username || response.data.email) + "!", "success");
          }
        } else {
          showToast(response.error ? response.error.message : "Gagal login.", "danger");
        }
      })
      .withFailureHandler((err) => {
        hideLoading();
        showToast("Terjadi kesalahan sistem: " + err.message, "danger");
      })
      .apiLogin(identifier, password);
  }

  function handleLogout() {
    showLoading("Keluar dari sistem...");
    if (typeof google === 'undefined' || !google.script || !google.script.run) {
      setTimeout(() => {
        hideLoading();
        AppState.isAuthenticated = false;
        AppState.currentUser = null;
        renderLoginForm();
        showToast("Anda telah keluar.", "info");
      }, 300);
      return;
    }

    google.script.run
      .withSuccessHandler(() => {
        hideLoading();
        AppState.isAuthenticated = false;
        AppState.currentUser = null;
        renderLoginForm();
        showToast("Anda telah keluar dari sesi.", "info");
      })
      .withFailureHandler(() => {
        hideLoading();
        AppState.isAuthenticated = false;
        renderLoginForm();
      })
      .apiLogout();
  }

  function renderLoginForm() {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('mainAppContainer').classList.add('hidden');
    document.getElementById('loginCard').classList.remove('hidden');
    document.getElementById('changePasswordCard').classList.add('hidden');
  }

  function renderChangePasswordForm() {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('mainAppContainer').classList.add('hidden');
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('changePasswordCard').classList.remove('hidden');
  }

  function renderAuthenticatedApp() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('mainAppContainer').classList.remove('hidden');

    if (AppState.currentUser) {
      document.getElementById('userEmailDisplay').textContent = AppState.currentUser.email || "Pengguna";
      document.getElementById('userRoleBadge').textContent = AppState.currentUser.role || "USER";
    }

    loadDashboardSummary();
    loadProjectsList();
    loadNotificationHistory();
  }

  // ==========================================
  // 2. DASHBOARD DATA & SUMMARY
  // ==========================================

  function loadDashboardSummary() {
    if (typeof google === 'undefined' || !google.script || !google.script.run) {
      updateSummaryUI({
        totalProjects: 3,
        activeProjects: 2,
        completedProjects: 1,
        delayedProjects: 1,
        averageActualProgress: 65,
        averagePlannedProgress: 70,
        averageDeviation: -5,
        urgentProjects: []
      });
      return;
    }

    google.script.run
      .withSuccessHandler((response) => {
        if (response && response.success && response.data) {
          updateSummaryUI(response.data);
        }
      })
      .apiGetExecutiveSummary();
  }

  function updateSummaryUI(summary) {
    document.getElementById('kpiTotalProjects').textContent = summary.totalProjects || 0;
    document.getElementById('kpiActiveProjects').textContent = summary.activeProjects || 0;
    document.getElementById('kpiCompletedProjects').textContent = summary.completedProjects || 0;
    document.getElementById('kpiDelayedProjects').textContent = summary.delayedProjects || 0;
    document.getElementById('kpiAvgActual').textContent = (summary.averageActualProgress || 0) + '%';
    document.getElementById('kpiAvgPlanned').textContent = (summary.averagePlannedProgress || 0) + '%';

    const devElem = document.getElementById('kpiAvgDev');
    const devVal = summary.averageDeviation || 0;
    devElem.textContent = (devVal > 0 ? '+' : '') + devVal + '%';
    devElem.className = 'kpi-dev ' + (devVal < -5 ? 'delayed' : devVal > 2 ? 'ahead' : 'ontrack');

    const urgentContainer = document.getElementById('urgentProjectsList');
    if (summary.urgentProjects && summary.urgentProjects.length > 0) {
      urgentContainer.innerHTML = summary.urgentProjects.map(p => `
        <div class="urgent-item">
          <div>
            <div class="urgent-name">${escapeHtml(p.projectName)}</div>
            <div class="urgent-pic">PIC: ${escapeHtml(p.picName || '-')} (${escapeHtml(p.picEmail || '-')})</div>
          </div>
          <div class="badge badge-danger">${p.deviation}%</div>
        </div>
      `).join('');
    } else {
      urgentContainer.innerHTML = `<div class="empty-state">🎉 Seluruh proyek berjalan tepat waktu / di atas rencana!</div>`;
    }
  }

  // ==========================================
  // 3. PROJECT LIST & TABLE
  // ==========================================

  function loadProjectsList() {
    if (typeof google === 'undefined' || !google.script || !google.script.run) {
      AppState.projects = [
        { project_id: "prj_1", project_name: "Proyek Gedung A", start_date: "2026-01-01", end_date: "2026-12-31", pic_name: "Budi", pic_email: "budi@test.com", status: "ACTIVE" },
        { project_id: "prj_2", project_name: "Proyek Jembatan B", start_date: "2026-02-01", end_date: "2026-10-31", pic_name: "Siti", pic_email: "siti@test.com", status: "ACTIVE" }
      ];
      renderProjectsTable(AppState.projects);
      return;
    }

    google.script.run
      .withSuccessHandler((response) => {
        if (response && response.success) {
          AppState.projects = response.data || [];
          renderProjectsTable(AppState.projects);
        }
      })
      .apiGetAllProjects();
  }

  function renderProjectsTable(projects) {
    const tbody = document.getElementById('projectsTableBody');
    if (!projects || projects.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Belum ada data proyek terdaftar.</td></tr>`;
      return;
    }

    tbody.innerHTML = projects.map(p => {
      const statusBadge = getStatusBadge(p.status);
      return `
        <tr>
          <td>
            <div class="font-semibold">${escapeHtml(p.project_name)}</div>
            <div class="text-xs text-muted">ID: ${escapeHtml(p.project_id)}</div>
          </td>
          <td>
            <div>${escapeHtml(p.pic_name || '-')}</div>
            <div class="text-xs text-muted">${escapeHtml(p.pic_email || '-')}</div>
          </td>
          <td class="text-sm">${escapeHtml(p.start_date)} s/d ${escapeHtml(p.end_date)}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="flex-gap">
              <button class="btn btn-xs btn-primary" onclick="openProgressModal('${p.project_id}')">📈 Progres</button>
              <button class="btn btn-xs btn-info" onclick="viewSCurve('${p.project_id}')">📊 Kurva S</button>
              <button class="btn btn-xs btn-outline" onclick="exportProjectPdf('${p.project_id}')">📄 PDF</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'COMPLETED': return '<span class="badge badge-success">COMPLETED</span>';
      case 'ACTIVE': return '<span class="badge badge-primary">ACTIVE</span>';
      case 'CANCELLED': return '<span class="badge badge-danger">CANCELLED</span>';
      case 'ARCHIVED': return '<span class="badge badge-warning">ARCHIVED</span>';
      default: return `<span class="badge">${escapeHtml(status || 'UNKNOWN')}</span>`;
    }
  }

  // ==========================================
  // 4. MODALS & FORMS
  // ==========================================

  function openProjectModal(isEdit, projectId) {
    const modal = document.getElementById('projectModal');
    const title = document.getElementById('projectModalTitle');
    const form = document.getElementById('projectForm');

    form.reset();
    document.getElementById('projectIdHidden').value = '';

    if (isEdit && projectId) {
      title.textContent = "Edit Data Proyek";
      const p = AppState.projects.find(x => x.project_id === projectId);
      if (p) {
        document.getElementById('projectIdHidden').value = p.project_id;
        document.getElementById('projName').value = p.project_name;
        document.getElementById('projStart').value = p.start_date;
        document.getElementById('projEnd').value = p.end_date;
        document.getElementById('projPicName').value = p.pic_name;
        document.getElementById('projPicEmail').value = p.pic_email;
        document.getElementById('projPicPhone').value = p.pic_phone || '';
        document.getElementById('projDesc').value = p.description || '';
      }
    } else {
      title.textContent = "Daftarkan Proyek Baru";
    }

    modal.classList.add('active');
  }

  function handleSaveProject(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('projectIdHidden').value;
    const payload = {
      projectName: document.getElementById('projName').value.trim(),
      startDate: document.getElementById('projStart').value,
      endDate: document.getElementById('projEnd').value,
      picName: document.getElementById('projPicName').value.trim(),
      picEmail: document.getElementById('projPicEmail').value.trim(),
      picPhone: document.getElementById('projPicPhone').value.trim(),
      description: document.getElementById('projDesc').value.trim()
    };

    showLoading("Menyimpan data proyek...");
    if (id) {
      google.script.run
        .withSuccessHandler((res) => {
          hideLoading();
          if (res.success) {
            closeModal('projectModal');
            showToast("Proyek berhasil diperbarui.", "success");
            loadProjectsList();
          } else {
            showToast(res.error.message, "danger");
          }
        })
        .apiUpdateProject(id, payload);
    } else {
      google.script.run
        .withSuccessHandler((res) => {
          hideLoading();
          if (res.success) {
            closeModal('projectModal');
            showToast("Proyek baru berhasil didaftarkan!", "success");
            loadProjectsList();
            loadDashboardSummary();
          } else {
            showToast(res.error.message, "danger");
          }
        })
        .apiRegisterProject(payload);
    }
  }

  function openProgressModal(projectId) {
    const p = AppState.projects.find(x => x.project_id === projectId);
    if (!p) return;

    document.getElementById('progProjectId').value = p.project_id;
    document.getElementById('progProjectName').textContent = p.project_name;
    document.getElementById('progDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('progActual').value = '';
    document.getElementById('progNotes').value = '';

    document.getElementById('progressModal').classList.add('active');
  }

  function handleSaveProgress(e) {
    if (e) e.preventDefault();
    const projectId = document.getElementById('progProjectId').value;
    const payload = {
      projectId: projectId,
      date: document.getElementById('progDate').value,
      actualProgress: Number(document.getElementById('progActual').value),
      notes: document.getElementById('progNotes').value.trim(),
      allowOverwrite: true
    };

    showLoading("Menyimpan progres harian...");
    google.script.run
      .withSuccessHandler((res) => {
        hideLoading();
        if (res.success) {
          closeModal('progressModal');
          showToast("Progres harian berhasil dicatat!", "success");
          loadDashboardSummary();
          loadProjectsList();
        } else {
          showToast(res.error.message, "danger");
        }
      })
      .apiRecordDailyProgress(payload);
  }

  function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }

  // ==========================================
  // 5. S-CURVE CANVAS RENDERER
  // ==========================================

  function viewSCurve(projectId) {
    const p = AppState.projects.find(x => x.project_id === projectId);
    if (!p) return;

    document.getElementById('curveModalTitle').textContent = "Kurva S: " + p.project_name;
    document.getElementById('curveModalSubtitle').textContent = "Linimasa Proyek " + p.start_date + " s/d " + p.end_date;

    showLoading("Memuat data linimasa Kurva S...");
    google.script.run
      .withSuccessHandler((res) => {
        hideLoading();
        if (res && res.success && res.data) {
          document.getElementById('curveModal').classList.add('active');
          renderSCurveCanvas(res.data.timeline, res.data.actualLogs || []);
        }
      })
      .apiGetProjectScheduleTimeline(projectId);
  }

  function renderSCurveCanvas(timeline, actualLogs) {
    const canvas = document.getElementById('curveCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 30, right: 30, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Draw Grid & Y-Axis
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";

    for (let y = 0; y <= 100; y += 20) {
      const py = padding.top + chartH - (y / 100) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, py);
      ctx.lineTo(width - padding.right, py);
      ctx.stroke();
      ctx.fillText(y + '%', padding.left - 10, py + 4);
    }

    if (!timeline || timeline.length === 0) return;

    // Draw Planned S-Curve (Cyan)
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    timeline.forEach((pt, idx) => {
      const px = padding.left + (idx / (timeline.length - 1)) * chartW;
      const py = padding.top + chartH - (pt.cumulativePlanned / 100) * chartH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Draw Actual Progress (Emerald)
    if (actualLogs && actualLogs.length > 0) {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3;
      ctx.beginPath();
      actualLogs.forEach((pt, idx) => {
        const px = padding.left + (idx / (timeline.length - 1)) * chartW;
        const py = padding.top + chartH - (Number(pt.actual_progress) / 100) * chartH;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  }

  // ==========================================
  // 6. EXPORT PDF & NOTIFICATION HISTORY
  // ==========================================

  function exportProjectPdf(projectId) {
    showLoading("Menyiapkan berkas PDF...");
    google.script.run
      .withSuccessHandler((res) => {
        hideLoading();
        if (res.success && res.data.base64) {
          const byteCharacters = atob(res.data.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = res.data.fileName || "Laporan_Proyek.pdf";
          a.click();
          showToast("Berkas PDF berhasil diunduh!", "success");
        } else {
          showToast("Gagal mengunduh PDF.", "danger");
        }
      })
      .apiExportProjectPdf(projectId);
  }

  function exportPortfolioPdf() {
    showLoading("Menghasilkan laporan portofolio PDF...");
    google.script.run
      .withSuccessHandler((res) => {
        hideLoading();
        if (res.success && res.data.base64) {
          const byteCharacters = atob(res.data.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = res.data.fileName || "Laporan_Portofolio.pdf";
          a.click();
          showToast("Laporan portofolio berhasil diunduh!", "success");
        }
      })
      .apiExportPortfolioPdf();
  }

  function loadNotificationHistory() {
    if (typeof google === 'undefined' || !google.script || !google.script.run) return;

    google.script.run
      .withSuccessHandler((res) => {
        if (res && res.success && res.data && res.data.logs) {
          const tbody = document.getElementById('notifHistoryTableBody');
          if (!tbody) return;
          if (res.data.logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Belum ada riwayat notifikasi.</td></tr>`;
            return;
          }
          tbody.innerHTML = res.data.logs.map(l => `
            <tr>
              <td class="text-xs text-muted">${new Date(l.timestamp).toLocaleString('id-ID')}</td>
              <td><span class="badge ${l.channel === 'EMAIL' ? 'badge-primary' : 'badge-success'}">${escapeHtml(l.channel)}</span></td>
              <td>${escapeHtml(l.recipient)}</td>
              <td><span class="badge ${l.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}">${escapeHtml(l.status)}</span></td>
              <td class="text-xs">${escapeHtml(l.action)}</td>
            </tr>
          `).join('');
        }
      })
      .apiGetNotificationHistory({ limit: 20 });
  }

  // ==========================================
  // 7. UTILITIES & UI HELPERS
  // ==========================================

  function setupTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        const tab = item.getAttribute('data-tab');
        AppState.currentTab = tab;

        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        const activePane = document.getElementById('tab-' + tab);
        if (activePane) activePane.classList.add('active');
      });
    });
  }

  function setupMobileSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.app-sidebar');
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }
  }

  function setupPasswordToggles() {
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        if (input) {
          input.type = input.type === 'password' ? 'text' : 'password';
        }
      });
    });
  }

  function setupPasswordPolicyLiveCheck() {
    const newPass = document.getElementById('newPassword');
    if (newPass) {
      newPass.addEventListener('input', () => {
        const val = newPass.value;
        updateRule('ruleLength', val.length >= 8);
        updateRule('ruleUpper', /[A-Z]/.test(val));
        updateRule('ruleLower', /[a-z]/.test(val));
        updateRule('ruleNumber', /[0-9]/.test(val));
        updateRule('ruleSpecial', /[!@#$%^&*(),.?":{}|<>]/.test(val));
      });
    }
  }

  function updateRule(elementId, passed) {
    const el = document.getElementById(elementId);
    if (el) {
      if (passed) {
        el.classList.add('valid');
        el.classList.remove('invalid');
      } else {
        el.classList.remove('valid');
        el.classList.add('invalid');
      }
    }
  }

  function showLoading(msg) {
    const overlay = document.getElementById('globalLoading');
    const text = document.getElementById('loadingText');
    if (text) text.textContent = msg || "Memuat...";
    if (overlay) overlay.classList.remove('hidden');
  }

  function hideLoading() {
    const overlay = document.getElementById('globalLoading');
    if (overlay) overlay.classList.add('hidden');
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : type === 'danger' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
      <div style="flex:1;">${escapeHtml(message)}</div>
      <button style="background:none;border:none;color:inherit;cursor:pointer;" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
