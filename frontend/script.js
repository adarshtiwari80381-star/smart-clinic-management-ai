/**
 * ==========================================================================
 * MEDIFLOW AI - FRONTEND CLIENT CONTROLLER
 * Connects directly to Backend REST API at http://localhost:5000/api
 * ==========================================================================
 */

(function () {
  'use strict';

  /**
   * Resolves the active API base URL via config.js, env.js, head bootstrap, or production fallback
   */
  function getApiBase() {
    if (window.APP_CONFIG && typeof window.APP_CONFIG.getApiBase === 'function') {
      return window.APP_CONFIG.getApiBase();
    }
    if (window.__MEDIFLOW_API_BASE__) {
      return window.__MEDIFLOW_API_BASE__;
    }
    // Strict production fallback: If running on Vercel or any remote domain, never use localhost
    const isLocal = (
      window.location.protocol === 'file:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0' ||
      window.location.hostname.endsWith('.local')
    );
    if (!isLocal) {
      const injected = (window.__ENV__ && (window.__ENV__.API_URL || window.__ENV__.VITE_API_URL))
        ? (window.__ENV__.API_URL || window.__ENV__.VITE_API_URL).trim().replace(/\/+$/, '')
        : 'https://smart-clinic-ai-backend.onrender.com';
      return injected.endsWith('/api') ? injected : `${injected}/api`;
    }
    return 'http://localhost:5000/api';
  }

  // Storage & State Helpers (Isolated per browser session)
  function getStoredUser() {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function getStoredToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
  }

  // Global State
  const state = {
    token: getStoredToken(),
    currentUser: getStoredUser(),
    activeView: 'dashboard',
    doctors: [],
    patients: [],
    appointments: [],
    records: []
  };

  // ==========================================================================
  // API HELPER (Fetch with Auth Token, RBAC & Comprehensive Error Handling)
  // ==========================================================================
  async function apiFetch(endpoint, options = {}) {
    const apiBase = getApiBase();
    const url = `${apiBase}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Handle 401 Unauthorized
        if (res.status === 401) {
          if (!endpoint.includes('/auth/login')) {
            logoutUser(false);
            showToast('Session expired or unauthorized. Please sign in.', 'error');
            openModal('modalAuth');
          }
        } else if (res.status === 403) {
          showToast(data.message || 'Access denied: You do not have permission for this action.', 'error');
        } else if (res.status === 404) {
          showToast(data.message || 'The requested resource was not found.', 'error');
        } else if (res.status === 409) {
          // Appointment conflict or data duplication
          showToast(data.message || 'Doctor is not available at this time.', 'error');
          const conflictAlert = document.getElementById('appointmentConflictAlert');
          if (conflictAlert) {
            conflictAlert.innerText = '⚠️ ' + (data.message || 'Doctor is not available at this time.');
            conflictAlert.classList.add('show');
          }
        } else if (res.status >= 500) {
          showToast(data.message || 'Server encountered an internal error. Please try again.', 'error');
        }

        const error = new Error(data.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.warn(`[API] Error on ${endpoint}:`, err);
      // If network failure / server offline
      if (err.name === 'TypeError' && (!err.status || err.status === 0)) {
        const dot = document.getElementById('apiStatusDot');
        const text = document.getElementById('apiStatusText');
        if (dot) dot.className = 'status-dot disconnected';
        const isLocal = (
          window.location.protocol === 'file:' ||
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname === '0.0.0.0' ||
          window.location.hostname.endsWith('.local')
        );
        if (isLocal) {
          if (text) text.innerText = 'Backend Offline (Port 5000)';
          showToast('Backend server is offline. Please ensure Node server is running on http://localhost:5000.', 'error');
        } else {
          if (text) text.innerText = 'Render Cloud Connecting / Offline';
          showToast('Live backend (Render) is unreachable. If Render is waking up from sleep (~30-50s), please wait a moment and retry.', 'error');
        }
      }
      throw err;
    }
  }

  // Check Backend Connection Status
  async function checkBackendHealth() {
    const dot = document.getElementById('apiStatusDot');
    const text = document.getElementById('apiStatusText');
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/health`, { cache: 'no-store' });
      if (res.ok) {
        if (dot) dot.className = 'status-dot';
        const isRender = apiBase.includes('onrender.com');
        if (text) text.innerText = isRender ? 'Backend Online (Render Cloud)' : 'Backend Connected (Local Port 5000)';
        updateSettingsApiUI(true);
      } else {
        throw new Error('Offline');
      }
    } catch (e) {
      if (dot) dot.className = 'status-dot disconnected';
      const isRender = apiBase.includes('onrender.com');
      if (text) text.innerText = isRender ? 'Render Waking / Offline' : 'Backend Offline (Port 5000)';
      updateSettingsApiUI(false);
    }
  }

  // Settings API Helpers
  function updateSettingsApiUI(isOnline = null) {
    const targetSpan = document.getElementById('settingsApiTarget');
    const badge = document.getElementById('settingsApiStatusBadge');
    const input = document.getElementById('settingCustomApiUrl');
    const currentBase = getApiBase();

    if (targetSpan) targetSpan.innerText = currentBase;
    if (input && !input.value) input.value = currentBase;

    if (badge && isOnline !== null) {
      if (isOnline) {
        badge.className = 'status-badge live';
        badge.innerText = 'ONLINE (200 OK)';
      } else {
        badge.className = 'status-badge offline';
        badge.innerText = 'OFFLINE / UNREACHABLE';
      }
    }
  }

  function saveCustomApiUrl() {
    const input = document.getElementById('settingCustomApiUrl');
    if (!input || !input.value.trim()) {
      showToast('Please enter a valid API URL', 'error');
      return;
    }
    if (window.APP_CONFIG && window.APP_CONFIG.setCustomApiBase) {
      window.APP_CONFIG.setCustomApiBase(input.value.trim());
      showToast(`API URL updated to: ${getApiBase()}`, 'success');
      updateSettingsApiUI();
      checkBackendHealth();
      refreshAllData();
    }
  }

  function switchToRender() {
    if (window.APP_CONFIG && window.APP_CONFIG.setApiMode) {
      window.APP_CONFIG.setApiMode('render');
      const input = document.getElementById('settingCustomApiUrl');
      if (input) input.value = `${window.APP_CONFIG.PRODUCTION_RENDER_URL}/api`;
      showToast('Switched to Production Render Backend', 'info');
      updateSettingsApiUI();
      checkBackendHealth();
      refreshAllData();
    }
  }

  function switchToLocal() {
    if (window.APP_CONFIG && window.APP_CONFIG.setApiMode) {
      window.APP_CONFIG.setApiMode('local');
      const input = document.getElementById('settingCustomApiUrl');
      if (input) input.value = `${window.APP_CONFIG.LOCAL_DEV_URL}/api`;
      showToast('Switched to Local Development Backend (Port 5000)', 'info');
      updateSettingsApiUI();
      checkBackendHealth();
      refreshAllData();
    }
  }

  async function testApiConnection() {
    const apiBase = getApiBase();
    showToast(`Testing connection to ${apiBase}/health...`, 'info');
    const startTime = performance.now();
    try {
      const res = await fetch(`${apiBase}/health`, { cache: 'no-store' });
      const latency = Math.round(performance.now() - startTime);
      if (res.ok) {
        const data = await res.json();
        showToast(`Backend Online! Status: ${data.status} (${latency}ms)`, 'success');
        updateSettingsApiUI(true);
      } else {
        showToast(`Backend responded with HTTP ${res.status}`, 'error');
        updateSettingsApiUI(false);
      }
    } catch (err) {
      showToast(`Connection failed: ${err.message}`, 'error');
      updateSettingsApiUI(false);
    }
  }

  // ==========================================================================
  // TOAST NOTIFICATIONS
  // ==========================================================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ==========================================================================
  // DATE & TIME VALIDATION HELPERS
  // ==========================================================================
  function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function validateAppointmentDate(inputEl) {
    if (!inputEl) return;
    const todayStr = getLocalDateString();
    inputEl.min = todayStr;
    if (inputEl.value && inputEl.value < todayStr) {
      showToast('Appointment date cannot be in the past. Please select today or a future date.', 'error');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      inputEl.value = getLocalDateString(tomorrow);
    }
  }

  // ==========================================================================
  // MODAL CONTROLLERS
  // ==========================================================================
  function openModal(modalId) {
    // Role-level guards for modal actions
    if (modalId === 'modalBookAppointment' && state.currentUser?.role === 'Admin') {
      showToast('Access denied: Admin accounts are for monitoring only. Appointment booking is reserved for patients.', 'error');
      return;
    }
    if (modalId === 'modalBookAppointment' && state.currentUser?.role === 'Doctor') {
      showToast('Access denied: Doctors cannot book patient appointments.', 'error');
      return;
    }
    if (modalId === 'modalAddPatient' && state.currentUser?.role === 'Admin') {
      showToast('Access denied: Admin cannot add patients directly. Patient registration is handled via public registration.', 'error');
      return;
    }
    if (modalId === 'modalAddRecord' && state.currentUser?.role === 'Admin') {
      showToast('Access denied: Admin cannot create medical records. Clinical documentation is reserved for doctors.', 'error');
      return;
    }
    if (modalId === 'modalAddRecord' && state.currentUser?.role === 'Patient') {
      showToast('Access denied: Patients cannot author clinical medical records.', 'error');
      return;
    }

    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');

      // For Auth modal, close button is only available if user is already signed in
      if (modalId === 'modalAuth') {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
          closeBtn.style.display = (state.currentUser && state.token) ? 'block' : 'none';
        }
      }

      // Reset conflict alert if appointment modal
      if (modalId === 'modalBookAppointment') {
        const alert = document.getElementById('appointmentConflictAlert');
        if (alert) alert.classList.remove('show');
        
        // Strict date validation: prevent past dates (min = today)
        const todayStr = getLocalDateString();
        const dateInput = document.getElementById('apptDateInput');
        if (dateInput) {
          dateInput.min = todayStr;
          if (!dateInput.value || dateInput.value < todayStr) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateInput.value = getLocalDateString(tomorrow);
          }
        }
        // Adjust for Patient role
        const patGroup = document.getElementById('appointmentPatientGroup');
        const patSelect = document.getElementById('apptPatientSelect');
        if (state.currentUser && state.currentUser.role === 'Patient') {
          if (patGroup) patGroup.style.display = 'none';
          if (patSelect) patSelect.required = false;
        } else {
          if (patGroup) patGroup.style.display = 'flex';
          if (patSelect) patSelect.required = true;
        }
      }

      if (modalId === 'modalAddRecord') {
        const dateInput = document.getElementById('recVisitDate');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
      }
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  // Close modals on backdrop click (prevent dismissing modalAuth when unauthenticated)
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      if (e.target.id === 'modalAuth' && (!state.currentUser || !state.token)) {
        return; // Retain login modal for fresh/unauthenticated visitors
      }
      e.target.classList.remove('active');
    }
  });

  // ==========================================================================
  // VIEW SWITCHER & NAVIGATION
  // ==========================================================================
  const viewTitles = {
    'dashboard': { title: 'Clinic Dashboard', sub: 'Overview of hospital operations, appointments and consultations' },
    'patients': { title: 'Patients Management', sub: 'Patient records, medical history, blood groups, and emergency contacts' },
    'doctors': { title: 'Specialist Directory', sub: 'Medical faculty, consulting hours, departments and rooms' },
    'appointments': { title: 'Appointments & Scheduling', sub: 'Real-time booking with automated conflict checking' },
    'records': { title: 'Medical Records', sub: 'Clinical notes, vital measurements, prescriptions and follow-ups' },
    'reports': { title: 'Clinic System Reports & Monitoring', sub: 'Hospital performance, consultation metrics, and appointment pipeline' },
    'consultation': { title: 'Doctor Clinical Consultation Workspace', sub: 'Patient examination, diagnosis, vital recordings, and prescriptions' },
    'ai-assistant': { title: 'AI Health Assistant', sub: 'Clinical intelligence engine for general wellness and triage' },
    'settings': { title: 'Clinic System Settings', sub: 'Facility preferences, active account details, and AI triage status' }
  };

  function switchView(viewId) {
    const user = state.currentUser;

    // RBAC Route Guards: Prevent unauthorized view switching
    if (user) {
      if (user.role === 'Patient') {
        if (viewId === 'settings' || viewId === 'reports' || viewId === 'consultation') {
          showToast('Unauthorized access: Patients cannot access administrative settings or medical workspaces.', 'error');
          switchView('dashboard');
          return;
        }
      } else if (user.role === 'Doctor') {
        if (viewId === 'settings' || viewId === 'reports') {
          showToast('Unauthorized access: System settings and administrative reports are restricted to Administrators.', 'error');
          switchView('dashboard');
          return;
        }
      } else if (user.role === 'Admin') {
        if (viewId === 'consultation') {
          showToast('Unauthorized access: Consultation workspace is reserved for medical doctors.', 'error');
          switchView('dashboard');
          return;
        }
      }
    } else {
      // Unauthenticated / Guest
      if (viewId !== 'dashboard' && viewId !== 'doctors' && viewId !== 'ai-assistant') {
        showToast('Please sign in to access this clinic section.', 'info');
        openModal('modalAuth');
        return;
      }
    }

    state.activeView = viewId;

    // Update Sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewId);
    });

    // Update Sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `view-${viewId}`);
    });

    // Dynamic Header Title & Subtitle based on active role
    let title = 'Clinic Dashboard';
    let sub = 'Overview of hospital operations, appointments and consultations';

    if (viewId === 'dashboard') {
      if (user?.role === 'Admin') {
        title = 'Administrator Command Center';
        sub = 'Hospital-wide monitoring: Specialists, registered patients, and scheduled appointments';
      } else if (user?.role === 'Doctor') {
        title = 'Doctor Clinical Workspace';
        sub = `Consultation schedule and clinical records for ${user.name}`;
      } else if (user?.role === 'Patient') {
        title = 'Patient Health Hub';
        sub = `Welcome back, ${user.name}. Manage your appointments and personal records.`;
      } else {
        title = 'Clinic Dashboard';
        sub = 'Please sign in to access MediFlow AI clinic system';
      }
    } else if (viewId === 'patients') {
      if (user?.role === 'Patient') {
        title = 'My Health Profile';
        sub = 'Your personal clinical records, emergency details, and vitals';
      } else if (user?.role === 'Doctor') {
        title = 'My Patients Roster';
        sub = 'Patients scheduled for consultation or under your clinical care';
      } else {
        title = 'Registered Patients Directory';
        sub = 'System-wide patient roster, medical history, blood groups, and emergency contacts (Monitoring)';
      }
    } else if (viewId === 'appointments') {
      if (user?.role === 'Patient') {
        title = 'My Scheduled Appointments';
        sub = 'Your booked doctor consultations and real-time status';
      } else if (user?.role === 'Doctor') {
        title = 'My Clinical Consultations';
        sub = 'Patients scheduled for examination and medical review with you';
      } else {
        title = 'Appointments Monitoring Directory';
        sub = 'Comprehensive clinic schedule overview with conflict prevention status';
      }
    } else if (viewId === 'records') {
      if (user?.role === 'Patient') {
        title = 'My Medical Records';
        sub = 'Personal clinical diagnoses, prescribed medications, and physician notes';
      } else if (user?.role === 'Doctor') {
        title = 'Clinical Medical Records';
        sub = 'Clinical case files, diagnoses, prescriptions, and notes authored by doctors';
      } else {
        title = 'Medical Records Audit & Monitoring';
        sub = 'Administrative clinical documentation archive (Read-only monitoring)';
      }
    } else {
      const info = viewTitles[viewId] || viewTitles['dashboard'];
      title = info.title;
      sub = info.sub;
    }

    const titleEl = document.getElementById('pageTitle');
    const subEl = document.getElementById('pageSubtitle');
    if (titleEl) titleEl.innerText = title;
    if (subEl) subEl.innerText = sub;

    // Refresh data for active view only if authenticated
    if (state.token && state.currentUser) {
      if (viewId === 'dashboard') loadDashboardData();
      if (viewId === 'patients') loadPatients();
      if (viewId === 'doctors') loadDoctors();
      if (viewId === 'appointments') loadAppointments();
      if (viewId === 'records') loadMedicalRecords();
      if (viewId === 'reports') loadReportsData();
      if (viewId === 'consultation') populateConsultationDropdown();
    }
  }

  // Setup Nav Click listeners
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      if (view) switchView(view);
    });
  });

  // Dynamic Navigation Generator by Role
  function updateNavForRole() {
    const navMenu = document.getElementById('sidebarNavMenu');
    if (!navMenu) return;
    const user = state.currentUser;
    const role = user ? user.role : 'Guest';

    let items = [];
    if (role === 'Admin') {
      items = [
        { view: 'dashboard', icon: '📊', label: 'Dashboard' },
        { view: 'patients', icon: '👥', label: 'Patients' },
        { view: 'doctors', icon: '🩺', label: 'Doctors' },
        { view: 'appointments', icon: '📅', label: 'Appointments' },
        { view: 'records', icon: '📋', label: 'Medical Records' },
        { view: 'reports', icon: '📈', label: 'Reports' },
        { view: 'settings', icon: '⚙️', label: 'Settings' },
        { view: 'logout', icon: '🚪', label: 'Logout', action: () => logoutUser(true) }
      ];
    } else if (role === 'Patient') {
      items = [
        { view: 'dashboard', icon: '📊', label: 'Dashboard' },
        { view: 'patients', icon: '👤', label: 'My Profile' },
        { view: 'book-appointment', icon: '➕', label: 'Book Appointment', action: () => openModal('modalBookAppointment') },
        { view: 'appointments', icon: '📅', label: 'My Appointments' },
        { view: 'records', icon: '📋', label: 'My Medical Records' },
        { view: 'ai-assistant', icon: '🤖', label: 'AI Health Assistant', badge: 'AI LIVE' },
        { view: 'logout', icon: '🚪', label: 'Logout', action: () => logoutUser(true) }
      ];
    } else if (role === 'Doctor') {
      items = [
        { view: 'dashboard', icon: '📊', label: 'Dashboard' },
        { view: 'appointments', icon: '📅', label: 'My Appointments' },
        { view: 'patients', icon: '👥', label: 'My Patients' },
        { view: 'records', icon: '📋', label: 'Medical Records' },
        { view: 'consultation', icon: '🩺', label: 'Consultation' },
        { view: 'logout', icon: '🚪', label: 'Logout', action: () => logoutUser(true) }
      ];
    } else {
      items = [
        { view: 'dashboard', icon: '📊', label: 'Dashboard' },
        { view: 'doctors', icon: '🩺', label: 'Specialist Directory' },
        { view: 'ai-assistant', icon: '🤖', label: 'AI Health Assistant', badge: 'AI LIVE' },
        { view: 'login', icon: '🔑', label: 'Sign In', action: () => openModal('modalAuth') }
      ];
    }

    navMenu.innerHTML = items.map(item => `
      <li class="nav-item ${state.activeView === item.view ? 'active' : ''}" data-view="${item.view}">
        <a href="#${item.view}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
          ${item.badge ? `<span class="nav-badge-ai">${item.badge}</span>` : ''}
        </a>
      </li>
    `).join('');

    navMenu.querySelectorAll('.nav-item').forEach((li, idx) => {
      const itemConfig = items[idx];
      li.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        if (itemConfig.action) {
          itemConfig.action();
        } else {
          switchView(itemConfig.view);
        }
      });
    });
  }

  // Auth Modal Tab Switcher (Sign In vs Register as Patient)
  function switchAuthTab(tab) {
    const loginCont = document.getElementById('authLoginFormContainer');
    const regCont = document.getElementById('authRegisterFormContainer');
    const tabLogin = document.getElementById('tabBtnSignIn');
    const tabReg = document.getElementById('tabBtnRegister');

    if (tab === 'register') {
      if (loginCont) loginCont.style.display = 'none';
      if (regCont) regCont.style.display = 'block';
      if (tabLogin) {
        tabLogin.style.background = 'rgba(255,255,255,0.05)';
        tabLogin.style.borderColor = 'var(--border-subtle)';
        tabLogin.style.color = 'var(--text-muted)';
      }
      if (tabReg) {
        tabReg.style.background = 'rgba(14, 165, 233, 0.2)';
        tabReg.style.borderColor = 'var(--primary)';
        tabReg.style.color = '#fff';
      }
    } else {
      if (loginCont) loginCont.style.display = 'block';
      if (regCont) regCont.style.display = 'none';
      if (tabLogin) {
        tabLogin.style.background = 'rgba(14, 165, 233, 0.2)';
        tabLogin.style.borderColor = 'var(--primary)';
        tabLogin.style.color = '#fff';
      }
      if (tabReg) {
        tabReg.style.background = 'rgba(255,255,255,0.05)';
        tabReg.style.borderColor = 'var(--border-subtle)';
        tabReg.style.color = 'var(--text-muted)';
      }
    }
  }

  // Public Patient Registration Handler
  async function handleRegisterPatient(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    const phone = document.getElementById('regPhone')?.value.trim();
    const age = Number(document.getElementById('regAge')?.value || 25);
    const gender = document.getElementById('regGender')?.value;
    const bloodGroup = document.getElementById('regBloodGroup')?.value;
    const address = document.getElementById('regAddress')?.value.trim();

    if (!name || !email || !password || !phone) {
      showToast('Please complete all required fields.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email: email.toLowerCase(),
          password,
          phone,
          age,
          gender,
          bloodGroup,
          address
        })
      });

      if (!data || !data.token || !data.user) {
        throw new Error('Registration failed to return user credentials.');
      }

      state.token = data.token;
      state.currentUser = data.user;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));

      updateAuthUI();
      closeModal('modalAuth');
      switchView('dashboard');
      showToast(`Welcome to MediFlow AI, ${data.user.name}! Your patient account is active.`, 'success');
      refreshAllData();
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    }
  }

  // ==========================================================================
  // AUTHENTICATION & ROLE MANAGEMENT
  // ==========================================================================
  function updateAuthUI() {
    const user = state.currentUser;
    const nameEl = document.getElementById('userName');
    const badgeEl = document.getElementById('userRoleBadge');
    const avatarEl = document.getElementById('userAvatar');
    const btnLogin = document.getElementById('btnLoginModal');
    const btnLogout = document.getElementById('btnLogout');

    const btnAddDoc = document.getElementById('btnOpenAddDoctor');
    const btnAddPat = document.getElementById('btnOpenAddPatient');
    const btnAddRec = document.getElementById('btnOpenAddRecord');
    const btnDashBookAppt = document.getElementById('btnDashBookAppt');
    const btnOpenScheduleAppt = document.getElementById('btnOpenScheduleAppt');

    const setUserName = document.getElementById('setUserName');
    const setUserEmail = document.getElementById('setUserEmail');
    const setUserBadge = document.getElementById('setUserBadge');

    const modalCloseBtn = document.querySelector('#modalAuth .modal-close');

    if (user && state.token) {
      if (nameEl) nameEl.innerText = user.name || 'User';
      if (badgeEl) {
        badgeEl.innerText = user.role || 'Patient';
        badgeEl.className = `role-badge ${(user.role || 'patient').toLowerCase()}`;
      }
      if (avatarEl) avatarEl.innerText = (user.name || 'U').charAt(0).toUpperCase();

      if (btnLogin) btnLogin.style.display = 'none';
      if (btnLogout) btnLogout.style.display = 'inline-flex';

      // Update settings card info
      if (setUserName) setUserName.innerText = user.name || 'User';
      if (setUserEmail) setUserEmail.innerText = user.email || 'N/A';
      if (setUserBadge) {
        setUserBadge.innerText = user.role || 'Patient';
        setUserBadge.className = `role-badge ${(user.role || 'patient').toLowerCase()}`;
      }

      // Role-based visibility
      // Admin: Cannot add patient, cannot book appointment, cannot add record
      if (btnAddDoc) btnAddDoc.style.display = user.role === 'Admin' ? 'inline-flex' : 'none';
      if (btnAddPat) btnAddPat.style.display = 'none'; // Patient creation is only via self-registration
      if (btnAddRec) btnAddRec.style.display = user.role === 'Doctor' ? 'inline-flex' : 'none';
      if (btnDashBookAppt) btnDashBookAppt.style.display = user.role === 'Patient' ? 'inline-flex' : 'none';
      if (btnOpenScheduleAppt) btnOpenScheduleAppt.style.display = user.role === 'Patient' ? 'inline-flex' : 'none';

      // Allow closing auth modal when authenticated
      if (modalCloseBtn) modalCloseBtn.style.display = 'block';
    } else {
      if (nameEl) nameEl.innerText = 'Guest Visitor';
      if (badgeEl) {
        badgeEl.innerText = 'Unauthenticated';
        badgeEl.className = 'role-badge';
      }
      if (avatarEl) avatarEl.innerText = '?';

      if (btnLogin) btnLogin.style.display = 'inline-flex';
      if (btnLogout) btnLogout.style.display = 'none';

      if (setUserName) setUserName.innerText = 'Not Signed In';
      if (setUserEmail) setUserEmail.innerText = 'Please sign in';
      if (setUserBadge) {
        setUserBadge.innerText = 'Guest';
        setUserBadge.className = 'role-badge';
      }

      if (btnAddDoc) btnAddDoc.style.display = 'none';
      if (btnAddPat) btnAddPat.style.display = 'none';
      if (btnAddRec) btnAddRec.style.display = 'none';
      if (btnDashBookAppt) btnDashBookAppt.style.display = 'none';
      if (btnOpenScheduleAppt) btnOpenScheduleAppt.style.display = 'none';

      if (modalCloseBtn) modalCloseBtn.style.display = 'none';
    }

    updateNavForRole();
    renderRoleDashboard();
  }

  async function handleLogin(e) {
    if (e) e.preventDefault();
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const email = (emailInput?.value || '').trim();
    const password = passwordInput?.value || '';

    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.toLowerCase(), password })
      });

      if (!data || !data.token || !data.user) {
        throw new Error('Authentication response is missing user credentials.');
      }

      state.token = data.token;
      state.currentUser = data.user;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));

      updateAuthUI();
      closeModal('modalAuth');
      switchView('dashboard');
      showToast(`Welcome back, ${data.user.name}! (Role: ${data.user.role})`, 'success');
      refreshAllData();
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
    }
  }

  function quickLogin(email, password) {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    if (emailInput) emailInput.value = email;
    if (passwordInput) passwordInput.value = password;
    return handleLogin();
  }

  function logoutUser(notify = true) {
    state.token = null;
    state.currentUser = null;
    state.doctors = [];
    state.patients = [];
    state.appointments = [];
    state.records = [];

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');

    // Reset metric counters
    const statP = document.getElementById('statTotalPatients');
    const statA = document.getElementById('statTotalAppointments');
    const statD = document.getElementById('statTotalDoctors');
    const statR = document.getElementById('statTotalRecords');
    if (statP) statP.innerText = '--';
    if (statA) statA.innerText = '--';
    if (statD) statD.innerText = '--';
    if (statR) statR.innerText = '--';

    const dashTbody = document.querySelector('#dashboardAppointmentsTable tbody');
    if (dashTbody) {
      dashTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 20px;">Please sign in to view appointments.</td></tr>`;
    }

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';

    updateAuthUI();
    switchView('dashboard');
    if (notify) showToast('You have been logged out.', 'info');
    openModal('modalAuth');
  }

  document.getElementById('btnLogout').addEventListener('click', () => logoutUser(true));
  document.getElementById('btnLoginModal').addEventListener('click', () => openModal('modalAuth'));
  document.getElementById('userProfileWidget').addEventListener('click', () => openModal('modalAuth'));

  // ==========================================================================
  // DATA LOADERS
  // ==========================================================================

  // 1. Doctors
  async function loadDoctors() {
    try {
      const search = document.getElementById('doctorSearchInput')?.value || '';
      const spec = document.getElementById('doctorSpecializationFilter')?.value || '';
      let url = '/doctors';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (spec) params.append('specialization', spec);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await apiFetch(url);
      state.doctors = res.data || [];
      renderDoctorsGrid(state.doctors);
      populateDoctorDropdowns(state.doctors);
    } catch (err) {
      console.error('Error loading doctors:', err);
    }
  }

  function renderDoctorsGrid(doctors) {
    const container = document.getElementById('doctorsCardsContainer');
    if (!container) return;

    if (!doctors.length) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">No doctors found matching filters.</div>`;
      return;
    }

    container.innerHTML = doctors.map(doc => `
      <div class="doctor-card">
        <div class="doctor-card-header">
          <div class="doctor-avatar">${doc.name.replace('Dr. ', '').charAt(0)}</div>
          <div>
            <h4>${doc.name}</h4>
            <span class="spec-badge">${doc.specialization}</span>
          </div>
        </div>
        <ul class="doctor-details-list">
          <li><span>🎓</span> ${doc.qualifications || 'MBBS'} (${doc.experienceYears || 0} yrs exp)</li>
          <li><span>📍</span> ${doc.roomNumber || 'Room 101'}</li>
          <li><span>📞</span> ${doc.phone}</li>
          <li><span>📅</span> ${doc.availableDays ? doc.availableDays.join(', ') : 'Mon - Fri'}</li>
        </ul>
        <div class="doctor-footer">
          <div class="fee-tag">$${doc.consultationFee || 50} <span>/ visit</span></div>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${state.currentUser?.role === 'Patient' ? `
              <button class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="window.clinicApp.quickBookDoctor('${doc._id}')">
                Book
              </button>
            ` : ''}
            ${state.currentUser?.role === 'Admin' ? `
              <button class="btn-icon edit" title="Edit Doctor" onclick="window.clinicApp.openEditDoctor('${doc._id}')">✏️</button>
              <button class="btn-icon danger" title="Delete Doctor" onclick="window.clinicApp.deleteDoctor('${doc._id}')">🗑️</button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  function populateDoctorDropdowns(doctors) {
    const apptSelect = document.getElementById('apptDoctorSelect');
    const recSelect = document.getElementById('recDoctorSelect');

    const options = doctors.map(d => `<option value="${d._id}">${d.name} (${d.specialization})</option>`).join('');

    if (apptSelect) apptSelect.innerHTML = `<option value="">-- Choose Doctor --</option>` + options;
    if (recSelect) recSelect.innerHTML = `<option value="">-- Choose Doctor --</option>` + options;
  }

  // 2. Patients
  async function loadPatients() {
    try {
      const search = document.getElementById('patientSearchInput')?.value || '';
      let url = '/patients';
      if (search) url += `?search=${encodeURIComponent(search)}`;

      const res = await apiFetch(url);
      state.patients = res.data || [];
      renderPatientsTable(state.patients);
      populatePatientDropdowns(state.patients);
    } catch (err) {
      console.error('Error loading patients:', err);
    }
  }

  function renderPatientsTable(patients) {
    const tbody = document.querySelector('#patientsTable tbody');
    if (!tbody) return;

    if (!patients.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 30px;">No patient records available.</td></tr>`;
      return;
    }

    tbody.innerHTML = patients.map(p => `
      <tr>
        <td><strong>${p.name}</strong><br><span style="font-size: 0.75rem; color: var(--text-dim);">${p.address || 'No address'}</span></td>
        <td>${p.phone}<br><span style="font-size: 0.75rem; color: var(--text-muted);">${p.email || 'N/A'}</span></td>
        <td>${p.age} yrs / ${p.gender}</td>
        <td><span class="blood-badge">${p.bloodGroup || 'O+'}</span></td>
        <td>${p.allergies && p.allergies.length ? p.allergies.join(', ') : '<span style="color: var(--text-dim);">None</span>'}</td>
        <td style="max-width: 200px;">${p.medicalHistory && p.medicalHistory.length ? p.medicalHistory.join(', ') : '<span style="color: var(--text-dim);">Clean</span>'}</td>
        <td style="text-align: right;">
          <div class="action-btns" style="justify-content: flex-end;">
            <button class="btn-icon" title="View Patient Profile" onclick="window.clinicApp.viewPatientProfile('${p._id}')">👤</button>
            ${state.currentUser?.role === 'Doctor' ? `
              <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" title="Consult Patient" onclick="window.clinicApp.startConsultationForPatient('${p._id}')">🩺 Consult</button>
            ` : ''}
            ${state.currentUser?.role === 'Patient' ? `
              <button class="btn-icon edit" title="Edit Personal Details" onclick="window.clinicApp.openEditPatient('${p._id}')">✏️</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  }

  function populatePatientDropdowns(patients) {
    const apptSelect = document.getElementById('apptPatientSelect');
    const recSelect = document.getElementById('recPatientSelect');

    const options = patients.map(p => `<option value="${p._id}">${p.name} (Phone: ${p.phone})</option>`).join('');

    if (apptSelect) apptSelect.innerHTML = `<option value="">-- Choose Patient --</option>` + options;
    if (recSelect) recSelect.innerHTML = `<option value="">-- Choose Patient --</option>` + options;
  }

  // 3. Appointments
  async function loadAppointments() {
    try {
      const status = document.getElementById('appointmentStatusFilter')?.value || '';
      let url = '/appointments';
      if (status) url += `?status=${encodeURIComponent(status)}`;

      const res = await apiFetch(url);
      state.appointments = res.data || [];
      renderAppointmentsTable(state.appointments);
    } catch (err) {
      console.error('Error loading appointments:', err);
    }
  }

  function renderAppointmentsTable(appointments) {
    const tbody = document.querySelector('#appointmentsTable tbody');
    if (!tbody) return;

    if (!appointments.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 30px;">No scheduled appointments found.</td></tr>`;
      return;
    }

    tbody.innerHTML = appointments.map(a => {
      const statusClass = (a.status || 'scheduled').toLowerCase();
      const patientName = a.patient ? a.patient.name : 'Unknown Patient';
      const doctorName = a.doctor ? a.doctor.name : 'Assigned Doctor';
      const spec = a.doctor ? a.doctor.specialization : '';

      return `
        <tr>
          <td><strong>${patientName}</strong><br><span style="font-size: 0.75rem; color: var(--text-dim);">${a.patient?.phone || ''}</span></td>
          <td><strong>${doctorName}</strong><br><span style="font-size: 0.75rem; color: var(--text-muted);">${spec}</span></td>
          <td>📅 ${a.appointmentDate}</td>
          <td>⏰ <strong>${a.appointmentTime}</strong></td>
          <td>${a.reason}</td>
          <td><span class="status-pill ${statusClass}">● ${a.status}</span></td>
          <td style="text-align: right;">
            <div class="action-btns" style="justify-content: flex-end;">
              ${state.currentUser?.role === 'Doctor' && a.status === 'Scheduled' ? `
                <button class="btn-icon" title="Confirm Appointment" onclick="window.clinicApp.updateAppointmentStatus('${a._id}', 'Confirmed')">✅</button>
              ` : ''}
              ${state.currentUser?.role === 'Doctor' && (a.status === 'Confirmed' || a.status === 'Scheduled') ? `
                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" title="Start Consultation & Complete" onclick="window.clinicApp.startConsultationForAppointment('${a._id}')">🩺 Consult</button>
              ` : ''}
              ${(state.currentUser?.role === 'Patient' || state.currentUser?.role === 'Doctor') && a.status !== 'Cancelled' && a.status !== 'Completed' ? `
                <button class="btn-icon danger" title="Cancel Appointment" onclick="window.clinicApp.cancelAppointment('${a._id}')">❌</button>
              ` : ''}
              ${state.currentUser?.role === 'Admin' ? `
                <span style="font-size: 0.75rem; color: var(--text-dim); padding: 4px 8px;">Audit Only</span>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 4. Medical Records
  async function loadMedicalRecords() {
    try {
      const res = await apiFetch('/medical-records');
      state.records = res.data || [];
      renderMedicalRecordsTable(state.records);
    } catch (err) {
      console.error('Error loading medical records:', err);
    }
  }

  function renderMedicalRecordsTable(records) {
    const tbody = document.querySelector('#medicalRecordsTable tbody');
    if (!tbody) return;

    if (!records.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 30px;">No medical records on file.</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(r => {
      const pName = r.patient?.name || 'Patient';
      const dName = r.doctor?.name || 'Doctor';
      const vitalsText = r.vitals ? `BP: ${r.vitals.bloodPressure || '120/80'}, HR: ${r.vitals.heartRate || '72'}` : 'Normal';
      const prescCount = r.prescriptions ? r.prescriptions.length : 0;

      return `
        <tr>
          <td>📅 ${r.visitDate}</td>
          <td><strong>${pName}</strong></td>
          <td>${dName}</td>
          <td><span style="color: #38bdf8; font-weight: 600;">${r.diagnosis}</span></td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">${vitalsText}</td>
          <td><span class="status-pill scheduled">${prescCount} medications</span></td>
          <td style="text-align: right;">
            <div class="action-btns" style="justify-content: flex-end;">
              <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.78rem;" onclick="window.clinicApp.viewRecordDetails('${r._id}')">
                View
              </button>
              ${state.currentUser?.role === 'Doctor' ? `
                <button class="btn-icon edit" title="Edit Record" onclick="window.clinicApp.openEditRecord('${r._id}')">✏️</button>
                <button class="btn-icon danger" title="Delete Record" onclick="window.clinicApp.deleteRecord('${r._id}')">🗑️</button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 5. Dashboard Data & Metrics
  async function loadDashboardData() {
    if (!state.token || !state.currentUser) return;

    try {
      await Promise.all([
        loadPatients(),
        loadDoctors(),
        loadAppointments(),
        loadMedicalRecords()
      ]);

      const user = state.currentUser;
      const patLabel = document.querySelector('.metric-card.patients .metric-info p');
      const apptLabel = document.querySelector('.metric-card.appointments .metric-info p');
      const docLabel = document.querySelector('.metric-card.doctors .metric-info p');
      const recLabel = document.querySelector('.metric-card.ai .metric-info p');

      if (user?.role === 'Patient') {
        if (patLabel) patLabel.innerText = 'My Health Profile';
        if (apptLabel) apptLabel.innerText = 'My Appointments';
        if (docLabel) docLabel.innerText = 'Specialist Doctors';
        if (recLabel) recLabel.innerText = 'My Medical Records';
        const patStat = document.getElementById('statTotalPatients');
        if (patStat) patStat.innerText = state.patients.length > 0 ? 'Active' : '--';
      } else if (user?.role === 'Doctor') {
        if (patLabel) patLabel.innerText = 'Assigned Patients';
        if (apptLabel) apptLabel.innerText = 'Consultations';
        if (docLabel) docLabel.innerText = 'Specialist Faculty';
        if (recLabel) recLabel.innerText = 'Clinical Records';
        const patStat = document.getElementById('statTotalPatients');
        if (patStat) patStat.innerText = state.patients.length;
      } else {
        if (patLabel) patLabel.innerText = 'Registered Patients';
        if (apptLabel) apptLabel.innerText = 'Total Appointments';
        if (docLabel) docLabel.innerText = 'Specialist Doctors';
        if (recLabel) recLabel.innerText = 'Clinical Records';
        const patStat = document.getElementById('statTotalPatients');
        if (patStat) patStat.innerText = state.patients.length;
      }

      document.getElementById('statTotalAppointments').innerText = state.appointments.length;
      document.getElementById('statTotalDoctors').innerText = state.doctors.length;
      document.getElementById('statTotalRecords').innerText = state.records.length;

      // Upcoming Appointments in Dashboard
      const dashTbody = document.querySelector('#dashboardAppointmentsTable tbody');
      if (dashTbody) {
        const upcoming = state.appointments.slice(0, 5);
        if (!upcoming.length) {
          dashTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 20px;">No upcoming consultations scheduled.</td></tr>`;
        } else {
          dashTbody.innerHTML = upcoming.map(a => `
            <tr>
              <td><strong>${a.patient?.name || 'Patient'}</strong></td>
              <td>${a.doctor?.name || 'Doctor'}</td>
              <td>📅 ${a.appointmentDate} at ⏰ ${a.appointmentTime}</td>
              <td>${a.reason}</td>
              <td><span style="font-size: 0.78rem; color: var(--text-muted);">${a.type || 'Consultation'}</span></td>
              <td><span class="status-pill ${(a.status || 'scheduled').toLowerCase()}">● ${a.status}</span></td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  }

  function refreshAllData() {
    checkBackendHealth();
    if (state.token && state.currentUser) {
      loadDashboardData();
    }
  }

  // ==========================================================================
  // ACTION HANDLERS: APPOINTMENT CREATION & CONFLICT CHECKING
  // ==========================================================================
  async function handleCreateAppointment(e) {
    e.preventDefault();

    if (state.currentUser?.role !== 'Patient') {
      showToast('Only patients can book appointments. Administrators and Doctors cannot book appointments.', 'error');
      return;
    }

    const alertBox = document.getElementById('appointmentConflictAlert');
    const alertMsg = document.getElementById('appointmentConflictMessage');
    if (alertBox) alertBox.classList.remove('show');

    const doctor = document.getElementById('apptDoctorSelect').value;
    let patient = state.currentUser?.patientId || (state.patients[0] && state.patients[0]._id);
    const appointmentDate = document.getElementById('apptDateInput').value;
    const appointmentTime = document.getElementById('apptTimeSelect').value;
    const reason = document.getElementById('apptReasonInput').value;
    const type = document.getElementById('apptTypeSelect').value;
    const notes = document.getElementById('apptNotesInput').value;

    if (!doctor || !patient || !appointmentDate || !appointmentTime || !reason) {
      showToast('Please select a doctor, date, time slot, and reason.', 'error');
      return;
    }

    // ==========================================
    // CRITICAL REQUIREMENT: STRICT PAST DATE CHECK
    // ==========================================
    const todayStr = getLocalDateString();
    const selectedDateStr = String(appointmentDate).substring(0, 10);
    if (selectedDateStr < todayStr) {
      if (alertBox && alertMsg) {
        alertMsg.innerText = 'Appointment date cannot be in the past. Please select today or a future date.';
        alertBox.classList.add('show');
      }
      showToast('Appointment date cannot be in the past. Please select today or a future date.', 'error');
      return;
    }

    try {
      const res = await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          doctor,
          patient,
          appointmentDate,
          appointmentTime,
          reason,
          type,
          notes
        })
      });

      showToast('Appointment successfully scheduled!', 'success');
      closeModal('modalBookAppointment');
      document.getElementById('bookAppointmentForm').reset();
      refreshAllData();
    } catch (err) {
      // ==========================================
      // CRITICAL REQUIREMENT: CONFLICT HANDLING
      // ==========================================
      if (err.status === 409) {
        if (alertBox && alertMsg) {
          alertMsg.innerText = 'Doctor is not available at this time.';
          alertBox.classList.add('show');
        }
        showToast('Doctor is not available at this time.', 'error');
      } else {
        showToast(err.message || 'Failed to create appointment', 'error');
      }
    }
  }

  async function updateAppointmentStatus(id, status) {
    try {
      await apiFetch(`/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      showToast(`Appointment status updated to ${status}.`, 'success');
      refreshAllData();
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    }
  }

  async function cancelAppointment(id) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await apiFetch(`/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'Cancelled' })
      });
      showToast('Appointment has been cancelled.', 'info');
      refreshAllData();
    } catch (err) {
      showToast(err.message || 'Cancellation failed', 'error');
    }
  }

  // ==========================================================================
  // ACTION HANDLERS: PATIENTS & DOCTORS
  // ==========================================================================
  async function handleCreatePatient(e) {
    e.preventDefault();
    if (state.currentUser?.role === 'Admin') {
      showToast('Administrators monitor existing records. Patients must self-register via the public registration portal.', 'error');
      return;
    }
    const name = document.getElementById('patNameInput').value;
    const phone = document.getElementById('patPhoneInput').value;
    const email = document.getElementById('patEmailInput').value;
    const age = document.getElementById('patAgeInput').value;
    const gender = document.getElementById('patGenderSelect').value;
    const bloodGroup = document.getElementById('patBloodSelect').value;
    const address = document.getElementById('patAddressInput').value;
    const allergiesStr = document.getElementById('patAllergiesInput').value;
    const historyStr = document.getElementById('patHistoryInput').value;

    const allergies = allergiesStr ? allergiesStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    const medicalHistory = historyStr ? historyStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    try {
      await apiFetch('/patients', {
        method: 'POST',
        body: JSON.stringify({
          name, phone, email, age: Number(age), gender, bloodGroup, address, allergies, medicalHistory
        })
      });
      showToast('Patient record created successfully!', 'success');
      closeModal('modalAddPatient');
      document.getElementById('addPatientForm').reset();
      refreshAllData();
    } catch (err) {
      showToast(err.message || 'Failed to create patient', 'error');
    }
  }

  async function deletePatient(id) {
    if (state.currentUser?.role === 'Admin') {
      showToast('Administrators cannot delete patient records. The Admin role is strictly for system monitoring.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to delete this patient? All associated appointments will be removed.')) return;
    try {
      await apiFetch(`/patients/${id}`, { method: 'DELETE' });
      showToast('Patient record deleted.', 'info');
      refreshAllData();
    } catch (err) {
      showToast(err.message || 'Failed to delete patient', 'error');
    }
  }

  async function handleCreateDoctor(e) {
    e.preventDefault();
    const name = document.getElementById('docNameInput').value;
    const specialization = document.getElementById('docSpecInput').value;
    const qualifications = document.getElementById('docQualInput').value;
    const experienceYears = Number(document.getElementById('docExpInput').value || 0);
    const email = document.getElementById('docEmailInput').value;
    const phone = document.getElementById('docPhoneInput').value;
    const consultationFee = Number(document.getElementById('docFeeInput').value || 50);
    const roomNumber = document.getElementById('docRoomInput').value;

    try {
      await apiFetch('/doctors', {
        method: 'POST',
        body: JSON.stringify({
          name, specialization, qualifications, experienceYears, email, phone, consultationFee, roomNumber
        })
      });
      showToast(`Dr. ${name} registered successfully!`, 'success');
      closeModal('modalAddDoctor');
      document.getElementById('addDoctorForm').reset();
      refreshAllData();
    } catch (err) {
      showToast(err.message || 'Failed to add doctor', 'error');
    }
  }

  // ==========================================================================
  // ACTION HANDLERS: MEDICAL RECORDS
  // ==========================================================================
  async function handleCreateRecord(e) {
    e.preventDefault();
    if (state.currentUser?.role !== 'Doctor') {
      showToast('Only doctors can author and submit clinical medical records.', 'error');
      return;
    }
    const patient = document.getElementById('recPatientSelect').value;
    const doctor = document.getElementById('recDoctorSelect').value;
    const visitDate = document.getElementById('recVisitDate').value;
    const diagnosis = document.getElementById('recDiagnosis').value;
    const symptomsStr = document.getElementById('recSymptoms').value;
    const bp = document.getElementById('recBP').value;
    const hr = document.getElementById('recHR').value;
    const temp = document.getElementById('recTemp').value;
    const spo2 = document.getElementById('recSpO2').value;
    const prescStr = document.getElementById('recPrescriptions').value;
    const notes = document.getElementById('recNotes').value;
    const followUp = document.getElementById('recFollowUp').value;

    const symptoms = symptomsStr ? symptomsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    // Parse prescriptions line by line
    const prescriptions = prescStr.split('\n').filter(Boolean).map(line => {
      const parts = line.split('|').map(p => p.trim());
      return {
        medicineName: parts[0] || 'Medication',
        dosage: parts[1] || 'Standard',
        frequency: parts[2] || 'Daily',
        duration: parts[3] || '5 days',
        instructions: parts[4] || ''
      };
    });

    try {
      await apiFetch('/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          patient,
          doctor,
          visitDate,
          diagnosis,
          symptoms,
          vitals: { bloodPressure: bp, heartRate: hr, temperature: temp, oxygenLevel: spo2 },
          prescriptions,
          doctorNotes: notes,
          followUpDate: followUp || null
        })
      });
      showToast('Medical record recorded successfully!', 'success');
      closeModal('modalAddRecord');
      document.getElementById('addRecordForm').reset();
      refreshAllData();
    } catch (err) {
      showToast(err.message || 'Failed to record medical entry', 'error');
    }
  }

  function viewRecordDetails(recordId) {
    const record = state.records.find(r => r._id === recordId);
    if (!record) return;

    const body = document.getElementById('viewRecordBody');
    if (!body) return;

    const prescriptionsHtml = record.prescriptions && record.prescriptions.length
      ? record.prescriptions.map(p => `
          <li style="margin-bottom: 6px;">
            <strong>${p.medicineName}</strong> - ${p.dosage} | ${p.frequency} for ${p.duration}
            ${p.instructions ? `<br><small style="color: var(--text-dim);">${p.instructions}</small>` : ''}
          </li>
        `).join('')
      : '<p style="color: var(--text-dim);">No medications prescribed.</p>';

    body.innerHTML = `
      <div style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 16px;">
        <h4 style="font-size: 1.15rem; color: #fff;">Patient: ${record.patient?.name || 'N/A'}</h4>
        <p style="font-size: 0.82rem; color: var(--text-muted);">Attending Physician: ${record.doctor?.name || 'N/A'} (${record.doctor?.specialization || 'Clinical Staff'})</p>
        <p style="font-size: 0.82rem; color: var(--text-muted);">Date of Examination: 📅 ${record.visitDate}</p>
      </div>

      <div style="margin-bottom: 16px;">
        <h5 style="color: #38bdf8; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; margin-bottom: 4px;">Diagnosis</h5>
        <p style="font-size: 1.05rem; font-weight: 700; color: #fff;">${record.diagnosis}</p>
      </div>

      <div style="margin-bottom: 16px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: var(--radius-md);">
        <h5 style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; margin-bottom: 6px;">Vital Signs</h5>
        <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.85rem;">
          <span>🩸 <strong>BP:</strong> ${record.vitals?.bloodPressure || 'N/A'}</span>
          <span>❤️ <strong>HR:</strong> ${record.vitals?.heartRate || 'N/A'}</span>
          <span>🌡️ <strong>Temp:</strong> ${record.vitals?.temperature || 'N/A'}</span>
          <span>🫁 <strong>SpO2:</strong> ${record.vitals?.oxygenLevel || 'N/A'}</span>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <h5 style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; margin-bottom: 6px;">Prescriptions</h5>
        <ul style="padding-left: 20px; font-size: 0.88rem; color: #e2e8f0;">
          ${prescriptionsHtml}
        </ul>
      </div>

      ${record.doctorNotes ? `
        <div style="margin-bottom: 16px;">
          <h5 style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; margin-bottom: 4px;">Doctor Notes</h5>
          <p style="font-size: 0.85rem; color: #cbd5e1; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">${record.doctorNotes}</p>
        </div>
      ` : ''}

      ${record.followUpDate ? `
        <p style="font-size: 0.82rem; color: #34d399;"><strong>Recommended Follow-Up:</strong> ${record.followUpDate}</p>
      ` : ''}
    `;

    openModal('modalViewRecord');
  }

  // ==========================================================================
  // AI HEALTH ASSISTANT INTERACTION
  // ==========================================================================
  async function handleAiSend() {
    const input = document.getElementById('aiInputPrompt');
    const question = input.value.trim();
    if (!question) return;

    input.value = '';
    await askAiQuestion(question);
  }

  async function askAiQuestion(question) {
    const thread = document.getElementById('aiChatThread');
    if (!thread) return;

    // Append User Message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-bubble user-msg';
    userMsg.innerHTML = `
      <p>${escapeHtml(question)}</p>
      <span class="chat-time">Just now</span>
    `;
    thread.appendChild(userMsg);

    // Append Typing Indicator
    const typingMsg = document.createElement('div');
    typingMsg.className = 'chat-bubble ai-msg';
    typingMsg.id = 'aiTypingIndicator';
    typingMsg.innerHTML = `
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    thread.appendChild(typingMsg);
    thread.scrollTop = thread.scrollHeight;

    try {
      const res = await apiFetch('/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ question })
      });

      typingMsg.remove();

      // Format AI Answer (convert markdown headers, bold, bullets)
      const formattedHtml = formatAiResponse(res.answer);

      const disclaimerHtml = res.disclaimer ? `
        <div class="ai-disclaimer-notice" style="margin-top: 10px; padding: 8px 12px; background: rgba(245, 158, 11, 0.12); border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 0.76rem; color: #fde68a;">
          ⚖️ <strong>Medical Disclaimer:</strong> ${escapeHtml(res.disclaimer)}
        </div>` : '';

      const aiMsg = document.createElement('div');
      aiMsg.className = `chat-bubble ${res.isEmergency ? 'emergency-msg' : 'ai-msg'}`;
      aiMsg.innerHTML = `
        ${formattedHtml}
        ${disclaimerHtml}
        <span class="chat-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      `;
      thread.appendChild(aiMsg);
      thread.scrollTop = thread.scrollHeight;
    } catch (err) {
      typingMsg.remove();
      const errorMsg = document.createElement('div');
      errorMsg.className = 'chat-bubble ai-msg';
      errorMsg.innerHTML = `
        <p style="color: #f87171;">Sorry, I encountered an error answering your inquiry. Please verify the backend server is running.</p>
      `;
      thread.appendChild(errorMsg);
      thread.scrollTop = thread.scrollHeight;
    }
  }

  function formatAiResponse(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italics
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote style="border-left: 3px solid #f59e0b; padding-left: 10px; color: #fde68a;">$1</blockquote>');
    // Bullet points
    html = html.replace(/^• (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    // Wrap bullet points
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    // Line breaks
    html = html.replace(/\n\n/g, '<br><br>');
    return html;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Quick Book Helper
  function quickBookDoctor(docId) {
    openModal('modalBookAppointment');
    const select = document.getElementById('apptDoctorSelect');
    if (select) select.value = docId;
  }

  function quickBookPatient(patientId) {
    openModal('modalBookAppointment');
    const select = document.getElementById('apptPatientSelect');
    if (select) select.value = patientId;
  }

  function onDoctorSelected(docId) {
    console.log('Doctor selected:', docId);
  }

  // -------------------------------------------------------------
  // ROLE DASHBOARD RENDERER
  // -------------------------------------------------------------
  function renderRoleDashboard() {
    const banner = document.getElementById('roleWorkspaceBanner');
    if (!banner) return;
    const user = state.currentUser;
    if (!user || !state.token) {
      banner.style.display = 'none';
      return;
    }
    banner.style.display = 'flex';
    const role = (user.role || 'Patient').toLowerCase();
    banner.className = `role-workspace-banner ${role}`;

    if (user.role === 'Admin') {
      banner.innerHTML = `
        <div>
          <h3>👑 Administrator System Monitor: Welcome, ${user.name}</h3>
          <p>Hospital oversight & audit control: View clinics, specialists, patient registry, scheduling metrics, and clinical records.</p>
        </div>
        <button class="btn-secondary" style="font-size: 0.8rem; padding: 6px 14px;" onclick="window.clinicApp.switchView('reports')">
          📊 View Reports & Analytics
        </button>
      `;
    } else if (user.role === 'Doctor') {
      banner.innerHTML = `
        <div>
          <h3>🩺 Doctor Clinical Workspace: ${user.name}</h3>
          <p>Consultation schedule, assigned patients, prescription notes, and examination case files.</p>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn-primary" style="font-size: 0.8rem; padding: 6px 14px;" onclick="window.clinicApp.switchView('consultation')">
            🩺 Open Consultation Room
          </button>
          <button class="btn-secondary" style="font-size: 0.8rem; padding: 6px 14px;" onclick="window.clinicApp.openModal('modalAddRecord')">
            New Clinical Record
          </button>
        </div>
      `;
    } else {
      banner.innerHTML = `
        <div>
          <h3>👤 Patient Health Hub: Welcome, ${user.name}</h3>
          <p>Track your scheduled clinic visits, view medical history & prescriptions, and talk with the AI Health Assistant.</p>
        </div>
        <button class="btn-primary" style="font-size: 0.8rem; padding: 6px 14px;" onclick="window.clinicApp.openModal('modalBookAppointment')">
          Book Appointment
        </button>
      `;
    }
  }

  // -------------------------------------------------------------
  // PATIENT ACTIONS: EDIT & PROFILE
  // -------------------------------------------------------------
  function openEditPatient(id) {
    const p = state.patients.find(item => item._id === id);
    if (!p) return;
    document.getElementById('editPatId').value = p._id;
    document.getElementById('editPatName').value = p.name || '';
    document.getElementById('editPatPhone').value = p.phone || '';
    document.getElementById('editPatEmail').value = p.email || '';
    document.getElementById('editPatAge').value = p.age || 30;
    document.getElementById('editPatGender').value = p.gender || 'Male';
    document.getElementById('editPatBlood').value = p.bloodGroup || 'Unknown';
    document.getElementById('editPatAddress').value = p.address || '';
    document.getElementById('editPatAllergies').value = p.allergies ? p.allergies.join(', ') : '';
    document.getElementById('editPatHistory').value = p.medicalHistory ? p.medicalHistory.join(', ') : '';
    openModal('modalEditPatient');
  }

  async function handleUpdatePatient(e) {
    e.preventDefault();
    if (state.currentUser?.role !== 'Patient') {
      showToast('Only patients can update their own personal details.', 'error');
      return;
    }
    const id = document.getElementById('editPatId').value;
    const name = document.getElementById('editPatName').value;
    const phone = document.getElementById('editPatPhone').value;
    const email = document.getElementById('editPatEmail').value;
    const age = Number(document.getElementById('editPatAge').value);
    const gender = document.getElementById('editPatGender').value;
    const bloodGroup = document.getElementById('editPatBlood').value;
    const address = document.getElementById('editPatAddress').value;
    const allergies = document.getElementById('editPatAllergies').value.split(',').map(s => s.trim()).filter(Boolean);
    const medicalHistory = document.getElementById('editPatHistory').value.split(',').map(s => s.trim()).filter(Boolean);

    try {
      await apiFetch(`/patients/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, phone, email, age, gender, bloodGroup, address, allergies, medicalHistory })
      });
      showToast('Patient details updated successfully!', 'success');
      closeModal('modalEditPatient');
      refreshAllData();
    } catch (err) {
      showToast(err.message || 'Failed to update patient', 'error');
    }
  }

  function viewPatientProfile(id) {
    const p = state.patients.find(item => item._id === id);
    if (!p) return;
    const container = document.getElementById('patientProfileBody');
    if (!container) return;

    const pAppts = state.appointments.filter(a => a.patient?._id === id || a.patient === id);
    const apptsHtml = pAppts.length ? pAppts.map(a => `
      <li style="margin-bottom: 6px;">
        📅 <strong>${a.appointmentDate}</strong> at ${a.appointmentTime} with ${a.doctor?.name || 'Doctor'} - 
        <span class="status-pill ${(a.status || 'scheduled').toLowerCase()}">● ${a.status}</span>
        <br><small style="color: var(--text-muted);">${a.reason}</small>
      </li>
    `).join('') : '<p style="color: var(--text-dim); font-size: 0.85rem;">No appointments recorded yet.</p>';

    container.innerHTML = `
      <div style="display: flex; gap: 16px; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px; margin-bottom: 16px;">
        <div class="avatar-circle" style="width: 50px; height: 50px; font-size: 1.3rem;">${p.name.charAt(0)}</div>
        <div>
          <h4 style="font-size: 1.2rem; color: #fff;">${p.name}</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted);">${p.age} years old | ${p.gender} | Blood Group: <span class="blood-badge">${p.bloodGroup || 'O+'}</span></p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 0.85rem;">
        <div>📞 <strong>Phone:</strong> ${p.phone}</div>
        <div>✉️ <strong>Email:</strong> ${p.email || 'N/A'}</div>
        <div style="grid-column: span 2;">📍 <strong>Address:</strong> ${p.address || 'Not specified'}</div>
      </div>

      <div style="margin-bottom: 16px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: var(--radius-md);">
        <h5 style="font-size: 0.75rem; text-transform: uppercase; color: #f87171; margin-bottom: 6px;">Known Allergies</h5>
        <p style="font-size: 0.88rem; color: #fecaca;">${p.allergies && p.allergies.length ? p.allergies.join(', ') : 'None Reported'}</p>
      </div>

      <div style="margin-bottom: 16px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: var(--radius-md);">
        <h5 style="font-size: 0.75rem; text-transform: uppercase; color: #38bdf8; margin-bottom: 6px;">Medical History</h5>
        <p style="font-size: 0.88rem; color: #e2e8f0;">${p.medicalHistory && p.medicalHistory.length ? p.medicalHistory.join(', ') : 'No prior chronic conditions'}</p>
      </div>

      <div>
        <h5 style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">Appointment History</h5>
        <ul style="padding-left: 20px; font-size: 0.85rem; color: #cbd5e1;">
          ${apptsHtml}
        </ul>
      </div>
    `;

    openModal('modalPatientProfile');
  }

  // -------------------------------------------------------------
  // DOCTOR ACTIONS: EDIT & DELETE
  // -------------------------------------------------------------
  function openEditDoctor(id) {
    const d = state.doctors.find(item => item._id === id);
    if (!d) return;
    document.getElementById('editDocId').value = d._id;
    document.getElementById('editDocName').value = d.name || '';
    document.getElementById('editDocSpec').value = d.specialization || '';
    document.getElementById('editDocQual').value = d.qualifications || '';
    document.getElementById('editDocExp').value = d.experienceYears || 0;
    document.getElementById('editDocEmail').value = d.email || '';
    document.getElementById('editDocPhone').value = d.phone || '';
    document.getElementById('editDocFee').value = d.consultationFee || 50;
    document.getElementById('editDocRoom').value = d.roomNumber || '';
    openModal('modalEditDoctor');
  }

  async function handleUpdateDoctor(e) {
    e.preventDefault();
    const id = document.getElementById('editDocId').value;
    const name = document.getElementById('editDocName').value;
    const specialization = document.getElementById('editDocSpec').value;
    const qualifications = document.getElementById('editDocQual').value;
    const experienceYears = Number(document.getElementById('editDocExp').value);
    const email = document.getElementById('editDocEmail').value;
    const phone = document.getElementById('editDocPhone').value;
    const consultationFee = Number(document.getElementById('editDocFee').value);
    const roomNumber = document.getElementById('editDocRoom').value;

    try {
      await apiFetch(`/doctors/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, specialization, qualifications, experienceYears, email, phone, consultationFee, roomNumber })
      });
      showToast('Doctor profile updated successfully!', 'success');
      closeModal('modalEditDoctor');
      refreshAllData();
    } catch (err) {
      showToast(err.message || 'Failed to update doctor', 'error');
    }
  }

  async function deleteDoctor(id) {
    if (!confirm('Are you sure you want to remove this doctor from the faculty roster?')) return;
    try {
      await apiFetch(`/doctors/${id}`, { method: 'DELETE' });
      showToast('Doctor removed successfully.', 'info');
      refreshAllData();
    } catch (err) {
      showToast(err.message || 'Failed to delete doctor', 'error');
    }
  }

  // -------------------------------------------------------------
  // MEDICAL RECORD ACTIONS: EDIT & DELETE
  // -------------------------------------------------------------
  function openEditRecord(id) {
    if (state.currentUser?.role !== 'Doctor') {
      showToast('Only doctors can modify clinical medical records.', 'error');
      return;
    }
    const r = state.records.find(item => item._id === id);
    if (!r) return;
    document.getElementById('editRecId').value = r._id;
    document.getElementById('editRecDiagnosis').value = r.diagnosis || '';
    document.getElementById('editRecSymptoms').value = r.symptoms ? r.symptoms.join(', ') : '';
    document.getElementById('editRecBP').value = r.vitals?.bloodPressure || '';
    document.getElementById('editRecHR').value = r.vitals?.heartRate || '';
    document.getElementById('editRecTemp').value = r.vitals?.temperature || '';
    document.getElementById('editRecSpO2').value = r.vitals?.oxygenLevel || '';
    document.getElementById('editRecPrescriptions').value = r.prescriptions ? r.prescriptions.map(p => `${p.medicineName} | ${p.dosage} | ${p.frequency} | ${p.duration}`).join('\n') : '';
    document.getElementById('editRecNotes').value = r.doctorNotes || '';
    document.getElementById('editRecFollowUp').value = r.followUpDate || '';
    openModal('modalEditRecord');
  }

  async function handleUpdateRecord(e) {
    e.preventDefault();
    if (state.currentUser?.role !== 'Doctor') {
      showToast('Only doctors can update clinical medical records.', 'error');
      return;
    }
    const id = document.getElementById('editRecId').value;
    const diagnosis = document.getElementById('editRecDiagnosis').value;
    const symptoms = document.getElementById('editRecSymptoms').value.split(',').map(s => s.trim()).filter(Boolean);
    const bp = document.getElementById('editRecBP').value;
    const hr = document.getElementById('editRecHR').value;
    const temp = document.getElementById('editRecTemp').value;
    const spo2 = document.getElementById('editRecSpO2').value;
    const prescStr = document.getElementById('editRecPrescriptions').value;
    const doctorNotes = document.getElementById('editRecNotes').value;
    const followUpDate = document.getElementById('editRecFollowUp').value;

    const prescriptions = prescStr.split('\n').filter(Boolean).map(line => {
      const parts = line.split('|').map(p => p.trim());
      return {
        medicineName: parts[0] || 'Medication',
        dosage: parts[1] || 'Standard',
        frequency: parts[2] || 'Daily',
        duration: parts[3] || '5 days'
      };
    });

    try {
      await apiFetch(`/medical-records/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          diagnosis, symptoms,
          vitals: { bloodPressure: bp, heartRate: hr, temperature: temp, oxygenLevel: spo2 },
          prescriptions, doctorNotes,
          followUpDate: followUpDate || null
        })
      });
      showToast('Medical record updated successfully!', 'success');
      closeModal('modalEditRecord');
      refreshAllData();
    } catch (err) {
      showToast(err.message || 'Failed to update record', 'error');
    }
  }

  async function deleteRecord(id) {
    if (state.currentUser?.role !== 'Doctor') {
      showToast('Only doctors can delete clinical medical records.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to delete this clinical medical record?')) return;
    try {
      await apiFetch(`/medical-records/${id}`, { method: 'DELETE' });
      showToast('Medical record deleted successfully.', 'info');
      refreshAllData();
    } catch (err) {
      showToast(err.message || 'Failed to delete record', 'error');
    }
  }

  // -------------------------------------------------------------
  // ADMIN REPORTS & MONITORING
  // -------------------------------------------------------------
  async function loadReportsData() {
    if (state.currentUser?.role !== 'Admin') return;
    try {
      const pCount = state.patients.length;
      const dCount = state.doctors.length;
      const aCount = state.appointments.length;
      const rCount = state.records.length;

      const repP = document.getElementById('repTotalPatients');
      const repD = document.getElementById('repTotalDoctors');
      const repA = document.getElementById('repTotalAppointments');
      const repR = document.getElementById('repTotalRecords');
      if (repP) repP.innerText = pCount;
      if (repD) repD.innerText = dCount;
      if (repA) repA.innerText = aCount;
      if (repR) repR.innerText = rCount;

      let scheduled = 0, confirmed = 0, completed = 0, cancelled = 0;
      const docWorkload = {};
      state.appointments.forEach(a => {
        const s = (a.status || 'Scheduled').toLowerCase();
        if (s === 'scheduled') scheduled++;
        else if (s === 'confirmed') confirmed++;
        else if (s === 'completed') completed++;
        else if (s === 'cancelled') cancelled++;

        const docName = a.doctor?.name || 'Unassigned';
        docWorkload[docName] = (docWorkload[docName] || 0) + 1;
      });

      const elSched = document.getElementById('repApptScheduled');
      const elConf = document.getElementById('repApptConfirmed');
      const elComp = document.getElementById('repApptCompleted');
      const elCanc = document.getElementById('repApptCancelled');
      if (elSched) elSched.innerText = scheduled;
      if (elConf) elConf.innerText = confirmed;
      if (elComp) elComp.innerText = completed;
      if (elCanc) elCanc.innerText = cancelled;

      const workloadEl = document.getElementById('reportsDoctorWorkload');
      if (workloadEl) {
        const entries = Object.entries(docWorkload);
        if (!entries.length) {
          workloadEl.innerHTML = '<p style="color: var(--text-dim);">No doctor consultation data available.</p>';
        } else {
          workloadEl.innerHTML = entries.map(([name, count]) => `
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
              <span>${name}</span>
              <strong style="color: #38bdf8;">${count} appts</strong>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  }

  // -------------------------------------------------------------
  // DOCTOR CLINICAL CONSULTATION WORKSPACE
  // -------------------------------------------------------------
  function populateConsultationDropdown() {
    const select = document.getElementById('consultApptSelect');
    if (!select) return;

    const user = state.currentUser;
    // Appointments for this doctor
    const myAppts = state.appointments.filter(a => {
      if (user?.role === 'Doctor') {
        return a.doctor?._id === user.doctorId || a.doctor === user.doctorId || a.doctor?.email === user.email;
      }
      return true;
    });

    const options = myAppts.map(a => {
      const pName = a.patient?.name || 'Patient';
      return `<option value="${a._id}" data-patient-id="${a.patient?._id || a.patient}" data-doctor-id="${a.doctor?._id || a.doctor}" data-reason="${escapeHtml(a.reason || '')}">
        📅 ${a.appointmentDate} (${a.appointmentTime}) - ${pName} [Status: ${a.status}]
      </option>`;
    }).join('');

    select.innerHTML = '<option value="">-- Choose Patient Appointment --</option>' + options;

    const visitDateInput = document.getElementById('consultVisitDate');
    if (visitDateInput && !visitDateInput.value) {
      visitDateInput.value = getLocalDateString();
    }
  }

  function onConsultationAppointmentSelect(apptId) {
    if (!apptId) return;
    const appt = state.appointments.find(a => a._id === apptId);
    if (!appt) return;

    const diagInput = document.getElementById('consultDiagnosis');
    const sympInput = document.getElementById('consultSymptoms');
    if (diagInput && !diagInput.value) {
      diagInput.value = `Consultation for: ${appt.reason || 'General Medical'}`;
    }
    if (sympInput && !sympInput.value) {
      sympInput.value = appt.reason || '';
    }
  }

  function startConsultationForAppointment(apptId) {
    switchView('consultation');
    populateConsultationDropdown();
    const select = document.getElementById('consultApptSelect');
    if (select) {
      select.value = apptId;
      onConsultationAppointmentSelect(apptId);
    }
  }

  function startConsultationForPatient(patientId) {
    switchView('consultation');
    populateConsultationDropdown();
    const select = document.getElementById('consultApptSelect');
    if (select) {
      const appt = state.appointments.find(a => (a.patient?._id === patientId || a.patient === patientId));
      if (appt) {
        select.value = appt._id;
        onConsultationAppointmentSelect(appt._id);
      }
    }
  }

  async function handleDoctorConsultationSubmit(e) {
    if (e) e.preventDefault();
    if (state.currentUser?.role !== 'Doctor') {
      showToast('Only doctors can complete clinical consultations.', 'error');
      return;
    }

    const apptSelect = document.getElementById('consultApptSelect');
    const apptId = apptSelect?.value;
    const selectedOption = apptSelect?.options[apptSelect.selectedIndex];
    const patientId = selectedOption?.getAttribute('data-patient-id');
    let doctorId = selectedOption?.getAttribute('data-doctor-id');

    if (!doctorId && state.currentUser.doctorId) {
      doctorId = state.currentUser.doctorId;
    }

    const visitDate = document.getElementById('consultVisitDate')?.value || getLocalDateString();
    const diagnosis = document.getElementById('consultDiagnosis')?.value?.trim();
    const symptomsStr = document.getElementById('consultSymptoms')?.value?.trim();
    const bp = document.getElementById('consultBP')?.value?.trim();
    const hr = document.getElementById('consultHR')?.value?.trim();
    const temp = document.getElementById('consultTemp')?.value?.trim();
    const spo2 = document.getElementById('consultSpO2')?.value?.trim();
    const prescStr = document.getElementById('consultPrescriptions')?.value?.trim();
    const notes = document.getElementById('consultNotes')?.value?.trim();
    const followUp = document.getElementById('consultFollowUp')?.value;

    if (!patientId || !doctorId || !diagnosis) {
      showToast('Please select a scheduled appointment and enter the diagnosis.', 'error');
      return;
    }

    const symptoms = symptomsStr ? symptomsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    const prescriptions = prescStr ? prescStr.split('\n').filter(Boolean).map(line => {
      const parts = line.split('|').map(p => p.trim());
      return {
        medicineName: parts[0] || 'Medication',
        dosage: parts[1] || 'Standard',
        frequency: parts[2] || 'Daily',
        duration: parts[3] || '5 days',
        instructions: parts[4] || ''
      };
    }) : [];

    try {
      await apiFetch('/medical-records', {
        method: 'POST',
        body: JSON.stringify({
          patient: patientId,
          doctor: doctorId,
          visitDate,
          diagnosis,
          symptoms,
          vitals: { bloodPressure: bp, heartRate: hr, temperature: temp, oxygenLevel: spo2 },
          prescriptions,
          doctorNotes: notes,
          followUpDate: followUp || null
        })
      });

      if (apptId) {
        await apiFetch(`/appointments/${apptId}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'Completed' })
        });
      }

      showToast('Clinical consultation completed & medical record saved!', 'success');
      document.getElementById('consultationWorkspaceForm')?.reset();
      refreshAllData();
      switchView('records');
    } catch (err) {
      showToast(err.message || 'Failed to submit consultation record', 'error');
    }
  }

  // -------------------------------------------------------------
  // MOBILE SIDEBAR & SETTINGS
  // -------------------------------------------------------------
  function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('mobile-open');
  }

  function saveClinicSettings() {
    const name = document.getElementById('settingClinicName')?.value;
    showToast(`Settings for "${name || 'Clinic'}" saved!`, 'success');
  }

  // Setup Search & Filter Inputs
  document.getElementById('patientSearchInput')?.addEventListener('input', debounce(loadPatients, 300));
  document.getElementById('doctorSearchInput')?.addEventListener('input', debounce(loadDoctors, 300));
  document.getElementById('doctorSpecializationFilter')?.addEventListener('change', loadDoctors);
  document.getElementById('appointmentStatusFilter')?.addEventListener('change', loadAppointments);

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  window.addEventListener('DOMContentLoaded', () => {
    // Initial health check and settings UI update
    checkBackendHealth();
    updateSettingsApiUI();

    // Check if an existing authenticated session exists
    if (state.currentUser && state.token) {
      updateAuthUI();
      switchView('dashboard');
      refreshAllData();
    } else {
      // Fresh visitor: NO auto-login. Prompt with clean Login page modal.
      updateAuthUI();
      switchView('dashboard');
      openModal('modalAuth');
    }

    // Initialize appointment date input with today as minimum
    const apptDateInput = document.getElementById('apptDateInput');
    if (apptDateInput) {
      apptDateInput.min = getLocalDateString();
    }

    // Ping healthcheck every 30s
    setInterval(checkBackendHealth, 30000);
  });

  // Expose global methods for inline HTML events
  window.clinicApp = {
    openModal,
    closeModal,
    validateAppointmentDate,
    switchView,
    quickLogin,
    handleLogin,
    logoutUser,
    handleCreateAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    handleCreatePatient,
    openEditPatient,
    handleUpdatePatient,
    viewPatientProfile,
    deletePatient,
    handleCreateDoctor,
    openEditDoctor,
    handleUpdateDoctor,
    deleteDoctor,
    handleCreateRecord,
    openEditRecord,
    handleUpdateRecord,
    deleteRecord,
    viewRecordDetails,
    handleAiSend,
    askAiQuestion,
    quickBookDoctor,
    quickBookPatient,
    onDoctorSelected,
    toggleMobileSidebar,
    saveClinicSettings,
    saveCustomApiUrl,
    switchToRender,
    switchToLocal,
    testApiConnection,
    switchAuthTab,
    handleRegisterPatient,
    loadReportsData,
    populateConsultationDropdown,
    onConsultationAppointmentSelect,
    startConsultationForAppointment,
    startConsultationForPatient,
    handleDoctorConsultationSubmit
  };

})();
