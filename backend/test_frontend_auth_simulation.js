/**
 * Comprehensive Browser Environment Simulation for Frontend Authentication
 * Tests against live Render backend: https://smart-clinic-ai-backend.onrender.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'frontend', 'index.html');
const scriptPath = path.join(__dirname, '..', 'frontend', 'script.js');
const configPath = path.join(__dirname, '..', 'frontend', 'config.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');
const configContent = fs.readFileSync(configPath, 'utf8');

// Lightweight DOM element class
class MockElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this._className = '';
    this.classList = {
      _classes: new Set(),
      add: (...cls) => { cls.forEach(c => this.classList._classes.add(c)); this._className = Array.from(this.classList._classes).join(' '); },
      remove: (...cls) => { cls.forEach(c => this.classList._classes.delete(c)); this._className = Array.from(this.classList._classes).join(' '); },
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        } else if (force) this.classList._classes.add(c);
        else this.classList._classes.delete(c);
        this._className = Array.from(this.classList._classes).join(' ');
      },
      contains: c => this.classList._classes.has(c)
    };
    this.style = {};
    this.innerText = '';
    this.innerHTML = '';
    this.value = '';
    this.dataset = {};
    this.listeners = {};
    this.children = [];
  }
  set className(val) {
    this._className = val || '';
    this.classList._classes = new Set(this._className.split(' ').filter(Boolean));
  }
  get className() {
    return this._className;
  }
  appendChild(child) {
    this.children.push(child);
  }
  remove() {
    // no-op
  }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  removeEventListener(event, fn) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(f => f !== fn);
    }
  }
  querySelector(selector) {
    if (selector.includes('modal-close')) {
      return this.children.find(c => c.className.includes('modal-close')) || new MockElement('button');
    }
    if (selector.includes('tbody')) {
      return this.children.find(c => c.tagName === 'TBODY') || new MockElement('tbody');
    }
    if (selector.includes('.metric-info p')) {
      return new MockElement('p');
    }
    return new MockElement('div');
  }
  querySelectorAll(selector) {
    return [];
  }
}

class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

async function runSimulation() {
  console.log('========================================================');
  console.log('🌐 FRONTEND BROWSER AUTHENTICATION SIMULATION TEST');
  console.log('Target: Live Render Backend (https://smart-clinic-ai-backend.onrender.com)');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, detail = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name} ${detail ? '(' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
    }
  }

  // Set up browser sandbox
  const localStorage = new MockStorage();
  const sessionStorage = new MockStorage();

  function createSandbox() {
    const elementsById = {};
    function getEl(id) {
      if (!elementsById[id]) elementsById[id] = new MockElement('div', id);
      return elementsById[id];
    }

    // Pre-create known elements from index.html
    const ids = [
      'modalAuth', 'loginEmail', 'loginPassword', 'userName', 'userRoleBadge',
      'userAvatar', 'btnLoginModal', 'btnLogout', 'userProfileWidget',
      'roleWorkspaceBanner', 'pageTitle', 'pageSubtitle', 'setUserName',
      'setUserEmail', 'setUserBadge', 'statTotalPatients', 'statTotalAppointments',
      'statTotalDoctors', 'statTotalRecords', 'dashboardAppointmentsTable',
      'patientsTable', 'doctorsCardsContainer', 'appointmentsTable', 'medicalRecordsTable',
      'apptDoctorSelect', 'apptPatientSelect', 'apptDateInput', 'apptTimeSelect',
      'apptReasonInput', 'apptTypeSelect', 'apptNotesInput', 'appointmentConflictAlert',
      'appointmentConflictMessage', 'btnOpenAddDoctor', 'btnOpenAddPatient', 'btnOpenAddRecord'
    ];
    ids.forEach(id => getEl(id));

    // Specific structure
    getEl('modalAuth').children.push(new MockElement('button', 'authModalClose'));
    getEl('modalAuth').children[0].className = 'modal-close';

    const documentListeners = {};
    const windowListeners = {};

    const mockDoc = {
      createElement: tag => new MockElement(tag),
      getElementById: id => getEl(id),
      querySelector: sel => {
        if (sel === '#modalAuth .modal-close') return getEl('modalAuth').children[0];
        if (sel === '#dashboardAppointmentsTable tbody') return new MockElement('tbody');
        if (sel === '#patientsTable tbody') return new MockElement('tbody');
        if (sel === '#appointmentsTable tbody') return new MockElement('tbody');
        if (sel === '#medicalRecordsTable tbody') return new MockElement('tbody');
        if (sel.includes('.metric-info p')) return new MockElement('p');
        if (sel.includes('.nav-item[data-view="patients"]')) {
          const navEl = new MockElement('li');
          const span = new MockElement('span');
          span.innerText = 'Patients';
          navEl.children.push(span);
          return span;
        }
        return new MockElement('div');
      },
      querySelectorAll: sel => {
        if (sel === '.nav-item') {
          return ['dashboard', 'patients', 'doctors', 'appointments', 'records', 'ai-assistant', 'settings'].map(view => {
            const el = new MockElement('li');
            el.dataset = { view };
            return el;
          });
        }
        if (sel === '.view-section') {
          return ['dashboard', 'patients', 'doctors', 'appointments', 'records', 'ai-assistant', 'settings'].map(view => {
            return new MockElement('section', `view-${view}`);
          });
        }
        return [];
      },
      addEventListener: (evt, fn) => {
        if (!documentListeners[evt]) documentListeners[evt] = [];
        documentListeners[evt].push(fn);
      },
      removeEventListener: () => {}
    };

    const mockWin = {
      location: {
        protocol: 'https:',
        hostname: 'smart-clinic-mgmt.vercel.app', // Simulated Vercel domain!
        search: ''
      },
      localStorage,
      sessionStorage,
      document: mockDoc,
      fetch: global.fetch,
      setTimeout: global.setTimeout,
      clearTimeout: global.clearTimeout,
      setInterval: () => {},
      clearInterval: () => {},
      addEventListener: (evt, fn) => {
        if (!windowListeners[evt]) windowListeners[evt] = [];
        windowListeners[evt].push(fn);
      },
      clinicApp: null
    };
    mockWin.window = mockWin;

    return { mockWin, mockDoc, elementsById, windowListeners };
  }

  // =========================================================================
  // TEST 1: Fresh Visitor Opens Vercel URL
  // =========================================================================
  console.log('--- Step 1: Fresh Visitor Opens Vercel Application ---');
  let env = createSandbox();
  vm.runInNewContext(configContent, env.mockWin);
  vm.runInNewContext(scriptContent, env.mockWin);

  // Trigger DOMContentLoaded
  if (env.windowListeners['DOMContentLoaded']) {
    env.windowListeners['DOMContentLoaded'].forEach(fn => fn());
  }

  assert(localStorage.getItem('token') === null, '1.1 Fresh visitor has NO stored token in localStorage');
  assert(localStorage.getItem('user') === null, '1.2 Fresh visitor has NO stored user in localStorage');
  assert(env.elementsById['modalAuth'].classList.contains('active'), '1.3 Sign In modal (#modalAuth) opens automatically for unauthenticated visitor');
  assert(env.elementsById['userName'].innerText === 'Guest Visitor', '1.4 Header user name displays "Guest Visitor"');
  assert(env.elementsById['userRoleBadge'].innerText === 'Unauthenticated', '1.5 Header user badge displays "Unauthenticated"');
  assert(env.elementsById['userAvatar'].innerText === '?', '1.6 Header user avatar displays "?"');
  assert(env.elementsById['btnLoginModal'].style.display === 'inline-flex', '1.7 Sign In button is visible in header');
  assert(env.elementsById['btnLogout'].style.display === 'none', '1.8 Logout button is hidden in header');
  assert(env.elementsById['setUserName'].innerText === 'Not Signed In', '1.9 Settings card shows "Not Signed In"');
  assert(env.elementsById['roleWorkspaceBanner'].style.display === 'none', '1.10 Role workspace banner is hidden');

  // =========================================================================
  // TEST 2: Admin Login
  // =========================================================================
  console.log('\n--- Step 2: Admin Login (admin@smartclinic.com / admin123) ---');
  await env.mockWin.clinicApp.quickLogin('admin@smartclinic.com', 'admin123');

  assert(localStorage.getItem('token') !== null, '2.1 Admin token stored in localStorage');
  const adminUser = JSON.parse(localStorage.getItem('user'));
  assert(adminUser && adminUser.role === 'Admin', '2.2 Admin user profile stored with role "Admin"', `Name: ${adminUser?.name}`);
  assert(!env.elementsById['modalAuth'].classList.contains('active'), '2.3 Sign In modal closed on successful login');
  assert(env.elementsById['userRoleBadge'].innerText === 'Admin', '2.4 Header role badge shows "Admin"');
  assert(env.elementsById['roleWorkspaceBanner'].classList.contains('admin'), '2.5 Workspace banner has "admin" class');
  assert(env.elementsById['roleWorkspaceBanner'].innerHTML.includes('Administrator Command Center'), '2.6 Workspace banner displays "Administrator Command Center"');
  assert(env.elementsById['btnLogout'].style.display === 'inline-flex', '2.7 Logout button is visible');
  assert(env.elementsById['btnLoginModal'].style.display === 'none', '2.8 Sign In button is hidden');

  // =========================================================================
  // TEST 3: Admin Logout
  // =========================================================================
  console.log('\n--- Step 3: Admin Logout ---');
  env.mockWin.clinicApp.logoutUser(false);

  assert(localStorage.getItem('token') === null, '3.1 Token removed from localStorage on logout');
  assert(localStorage.getItem('user') === null, '3.2 User removed from localStorage on logout');
  assert(sessionStorage.getItem('token') === null, '3.3 Token removed from sessionStorage on logout');
  assert(env.elementsById['userName'].innerText === 'Guest Visitor', '3.4 Header reset to "Guest Visitor"');
  assert(env.elementsById['userRoleBadge'].innerText === 'Unauthenticated', '3.5 Header badge reset to "Unauthenticated"');
  assert(env.elementsById['modalAuth'].classList.contains('active'), '3.6 Sign In modal reopened after logout');
  assert(env.elementsById['statTotalPatients'].innerText === '--', '3.7 Dashboard metrics cleared to "--"');

  // =========================================================================
  // TEST 4: Patient Login
  // =========================================================================
  console.log('\n--- Step 4: Patient Login (patient@smartclinic.com / patient123) ---');
  await env.mockWin.clinicApp.quickLogin('patient@smartclinic.com', 'patient123');

  assert(localStorage.getItem('token') !== null, '4.1 Patient token stored in localStorage');
  const patUser = JSON.parse(localStorage.getItem('user'));
  assert(patUser && patUser.role === 'Patient', '4.2 Patient role preserved as "Patient"', `Role: ${patUser?.role}, Name: ${patUser?.name}`);
  assert(patUser.patientId === '60d0fe4f5311236168a109e1', '4.3 Patient profile correctly contains patientId', `patientId: ${patUser?.patientId}`);
  assert(!env.elementsById['modalAuth'].classList.contains('active'), '4.4 Sign In modal closed for Patient');
  assert(env.elementsById['userName'].innerText === patUser.name, '4.5 Header displays Patient name', `Name: ${env.elementsById['userName'].innerText}`);
  assert(env.elementsById['userRoleBadge'].innerText === 'Patient', '4.6 Header badge displays "Patient"');
  assert(env.elementsById['roleWorkspaceBanner'].classList.contains('patient'), '4.7 Workspace banner has "patient" class');
  assert(env.elementsById['roleWorkspaceBanner'].innerHTML.includes('Patient Health Hub'), '4.8 Workspace banner displays "Patient Health Hub"');
  assert(env.elementsById['roleWorkspaceBanner'].innerHTML.includes('Book Appointment'), '4.9 Workspace banner displays "Book Appointment" button for Patient');
  assert(env.elementsById['pageTitle'].innerText === 'Patient Health Hub', '4.10 Page title updated to "Patient Health Hub"');

  // =========================================================================
  // TEST 5: Browser Page Refresh (Session Persistence for Patient)
  // =========================================================================
  console.log('\n--- Step 5: Page Refresh / Reload Simulation (Patient Session) ---');
  // Re-initialize sandbox with existing localStorage preserved!
  const reloadEnv = createSandbox();
  vm.runInNewContext(configContent, reloadEnv.mockWin);
  vm.runInNewContext(scriptContent, reloadEnv.mockWin);

  if (reloadEnv.windowListeners['DOMContentLoaded']) {
    reloadEnv.windowListeners['DOMContentLoaded'].forEach(fn => fn());
  }

  const reloadedUser = JSON.parse(localStorage.getItem('user'));
  assert(reloadedUser && reloadedUser.role === 'Patient', '5.1 Session persists as Patient (DID NOT REVERT TO ADMIN)');
  assert(reloadEnv.elementsById['userName'].innerText === 'John Doe', '5.2 Header retains "John Doe"');
  assert(reloadEnv.elementsById['userRoleBadge'].innerText === 'Patient', '5.3 Header retains "Patient" badge');
  assert(reloadEnv.elementsById['roleWorkspaceBanner'].classList.contains('patient'), '5.4 Workspace banner retains "patient" class');
  assert(!reloadEnv.elementsById['modalAuth'].classList.contains('active'), '5.5 Sign In modal is NOT open (authenticated user goes to dashboard)');

  // =========================================================================
  // TEST 6: Doctor Login
  // =========================================================================
  console.log('\n--- Step 6: Doctor Login (doctor@smartclinic.com / doctor123) ---');
  reloadEnv.mockWin.clinicApp.logoutUser(false);
  await reloadEnv.mockWin.clinicApp.quickLogin('doctor@smartclinic.com', 'doctor123');

  const docUser = JSON.parse(localStorage.getItem('user'));
  assert(docUser && docUser.role === 'Doctor', '6.1 Doctor role stored as "Doctor"', `Role: ${docUser?.role}, Name: ${docUser?.name}`);
  assert(reloadEnv.elementsById['userRoleBadge'].innerText === 'Doctor', '6.2 Header badge displays "Doctor"');
  assert(reloadEnv.elementsById['roleWorkspaceBanner'].classList.contains('doctor'), '6.3 Workspace banner has "doctor" class');
  assert(reloadEnv.elementsById['roleWorkspaceBanner'].innerHTML.includes('Doctor Clinical Workspace'), '6.4 Workspace banner displays "Doctor Clinical Workspace"');
  assert(reloadEnv.elementsById['pageTitle'].innerText === 'Doctor Clinical Workspace', '6.5 Page title updated to "Doctor Clinical Workspace"');

  // =========================================================================
  // TEST 7: Clean Logout to Fresh State
  // =========================================================================
  console.log('\n--- Step 7: Final Logout to Fresh Visitor State ---');
  reloadEnv.mockWin.clinicApp.logoutUser(false);
  assert(localStorage.getItem('token') === null, '7.1 Storage completely empty');
  assert(reloadEnv.elementsById['modalAuth'].classList.contains('active'), '7.2 Returned to Login Page modal');
  assert(reloadEnv.elementsById['userName'].innerText === 'Guest Visitor', '7.3 Clean Guest state confirmed');

  console.log('\n========================================================');
  console.log(`Simulation Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');
}

runSimulation().catch(err => {
  console.error('Fatal error in simulation:', err);
  process.exit(1);
});
