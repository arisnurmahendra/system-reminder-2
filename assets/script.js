// State Manager
const AppState = {
  currentUserId: null,
  currentUserEmail: null,
  currentUserRole: null,
  pendingAction: null
};

// DOM Elements
const loginCard = document.getElementById('loginCard');
const changePasswordCard = document.getElementById('changePasswordCard');
const dashboardCard = document.getElementById('dashboardCard');
const loginForm = document.getElementById('loginForm');
const changePasswordForm = document.getElementById('changePasswordForm');
const toastContainer = document.getElementById('toastContainer');
const newPasswordInput = document.getElementById('newPassword');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupPasswordToggles();
  setupPasswordPolicyLiveCheck();
  checkExistingSession();
});

// Check Active Session
function checkExistingSession() {
  if (typeof google === 'undefined' || !google.script || !google.script.run) {
    console.info("Running in standalone preview mode.");
    return;
  }

  google.script.run
    .withSuccessHandler(response => {
      if (response && response.success && response.data && response.data.isAuthenticated) {
        const user = response.data.user;
        if (user.mustChangePassword) {
          AppState.currentUserId = user.userId;
          AppState.currentUserEmail = user.email;
          AppState.currentUserRole = user.role;
          showView('changePassword');
        } else {
          showAuthenticatedView(user);
        }
      }
    })
    .withFailureHandler(err => {
      console.warn("Session check warning:", err);
    })
    .apiCheckSession();
}

// Handle Login Submit
if (loginForm) {
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;
    const totp = document.getElementById('totpToken') ? document.getElementById('totpToken').value.trim() : '';

    if (!identifier || !password) {
      showToast('Mohon isi email/username dan password.', 'warning');
      return;
    }

    setLoading('loginBtn', true, 'Memverifikasi...');

    if (typeof google === 'undefined' || !google.script || !google.script.run) {
      setTimeout(() => {
        setLoading('loginBtn', false, 'Masuk ke Sistem');
        showToast('Mode Standalone: Simulasi login berhasil', 'success');
      }, 800);
      return;
    }

    google.script.run
      .withSuccessHandler(response => {
        setLoading('loginBtn', false, 'Masuk ke Sistem');
        
        if (!response.success) {
          showToast(response.error.message || 'Login gagal.', 'error');
          return;
        }

        const result = response.data;
        if (result.status === 'REQUIRE_PASSWORD_CHANGE') {
          AppState.currentUserId = result.userId;
          AppState.currentUserEmail = result.email;
          AppState.currentUserRole = result.role;
          showToast(response.message || 'Harap ubah password default Anda.', 'warning');
          showView('changePassword');
        } else if (result.status === 'REQUIRE_MFA_TOKEN') {
          document.getElementById('mfaGroup').classList.remove('hidden');
          showToast('Masukkan kode verifikasi 2-Langkah Anda.', 'warning');
        } else if (result.status === 'AUTHENTICATED') {
          showToast('Login berhasil. Selamat datang!', 'success');
          showAuthenticatedView(result.user);
        }
      })
      .withFailureHandler(err => {
        setLoading('loginBtn', false, 'Masuk ke Sistem');
        showToast(err.message || 'Terjadi kesalahan pada server.', 'error');
      })
      .apiLogin(identifier, password, totp);
  });
}

// Handle Initial Password Change Submit
if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('Semua kolom password wajib diisi.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok.', 'error');
      return;
    }

    const isPrivileged = AppState.currentUserRole === 'ADMINISTRATOR';
    const minLength = isPrivileged ? 14 : 8;
    if (newPassword.length < minLength) {
      showToast(`Password minimal ${minLength} karakter.`, 'error');
      return;
    }

    setLoading('changePasswordBtn', true, 'Menyimpan Password...');

    google.script.run
      .withSuccessHandler(response => {
        setLoading('changePasswordBtn', false, 'Simpan & Perbarui Password');

        if (!response.success) {
          showToast(response.error.message || 'Gagal mengubah password.', 'error');
          return;
        }

        showToast('Password berhasil diubah! Silakan login kembali.', 'success');
        changePasswordForm.reset();
        showView('login');
      })
      .withFailureHandler(err => {
        setLoading('changePasswordBtn', false, 'Simpan & Perbarui Password');
        showToast(err.message || 'Terjadi kesalahan sistem.', 'error');
      })
      .apiChangeInitialPassword(AppState.currentUserId, oldPassword, newPassword);
  });
}

// View Switching
function showView(viewName) {
  loginCard.classList.add('hidden');
  changePasswordCard.classList.add('hidden');
  dashboardCard.classList.add('hidden');

  if (viewName === 'login') {
    loginCard.classList.remove('hidden');
  } else if (viewName === 'changePassword') {
    changePasswordCard.classList.remove('hidden');
    const minLength = AppState.currentUserRole === 'ADMINISTRATOR' ? 14 : 8;
    document.getElementById('ruleLength').querySelector('.text').textContent = `Minimal ${minLength} karakter (${AppState.currentUserRole || 'User'})`;
  } else if (viewName === 'dashboard') {
    dashboardCard.classList.remove('hidden');
  }
}

function showAuthenticatedView(user) {
  showView('dashboard');
  document.getElementById('userEmailDisplay').textContent = user.email || user.username;
  document.getElementById('userRoleDisplay').textContent = user.role || 'REGULAR_USER';
}

// Logout
function logoutUser() {
  AppState.currentUserId = null;
  AppState.currentUserEmail = null;
  AppState.currentUserRole = null;
  loginForm.reset();
  showView('login');
  showToast('Anda telah keluar dari sistem.', 'success');
}

// Password Policy Live Checklist
function setupPasswordPolicyLiveCheck() {
  if (!newPasswordInput) return;

  newPasswordInput.addEventListener('input', function() {
    const val = this.value;
    const isPrivileged = AppState.currentUserRole === 'ADMINISTRATOR';
    const minLength = isPrivileged ? 14 : 8;

    updateRule('ruleLength', val.length >= minLength);
    updateRule('ruleUpper', /[A-Z]/.test(val));
    updateRule('ruleLower', /[a-z]/.test(val));
    updateRule('ruleNumber', /\d/.test(val));
    updateRule('ruleSpecial', /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(val));
  });
}

function updateRule(elementId, isValid) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (isValid) {
    el.classList.add('valid');
  } else {
    el.classList.remove('valid');
  }
}

// Password Visibility Toggles
function setupPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function() {
      const input = this.previousElementSibling;
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        this.textContent = '👁️';
      } else {
        input.type = 'password';
        this.textContent = '🔒';
      }
    });
  });
}

// Toast Notification
function showToast(message, type = 'info') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';
  if (type === 'warning') icon = '🔒';

  toast.innerHTML = `<span>${icon}</span><div>${message}</div>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Loading State
function setLoading(buttonId, isLoading, defaultText) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.disabled = isLoading;
  if (isLoading) {
    btn.innerHTML = `<span class="spinner"></span> <span>${defaultText}</span>`;
  } else {
    btn.innerHTML = `<span>${defaultText}</span>`;
  }
}
