/**
 * Automated Test: Strict Date Entry for Patient Appointments
 * Verifies that past dates cannot be booked on either frontend or backend
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

async function runDateValidationTests() {
  console.log('====================================================');
  console.log('📅 TESTING STRICT APPOINTMENT DATE ENTRY');
  console.log('====================================================\n');

  // Step 1: Unit testing date helper logic
  console.log('--- Step 1: Testing Date Comparison Logic ---');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const pastYear = pastDate.getFullYear();
  const pastMonth = String(pastDate.getMonth() + 1).padStart(2, '0');
  const pastDay = String(pastDate.getDate()).padStart(2, '0');
  const pastDateStr = `${pastYear}-${pastMonth}-${pastDay}`;

  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureYear = futureDate.getFullYear();
  const futureMonth = String(futureDate.getMonth() + 1).padStart(2, '0');
  const futureDay = String(futureDate.getDate()).padStart(2, '0');
  const futureDateStr = `${futureYear}-${futureMonth}-${futureDay}`;

  console.log(`  Today: ${todayStr}`);
  console.log(`  Past:  ${pastDateStr}`);
  console.log(`  Future:${futureDateStr}`);

  assert(pastDateStr < todayStr, 'Past date string must be strictly less than today');
  assert(!(futureDateStr < todayStr), 'Future date string must not be less than today');
  assert(!(todayStr < todayStr), 'Today string must not be less than today');
  console.log('  ✅ [PASS] Date lexical comparisons are correct.\n');

  // Step 2: Backend API validation test
  console.log('--- Step 2: Testing Backend Past Date Rejection ---');
  const apptController = require('./controllers/appointmentController');
  
  let statusCode = null;
  let jsonResponse = null;

  const mockRes = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonResponse = data;
      return this;
    }
  };

  const mockReqPast = {
    user: { role: 'Admin', id: '60d0fe4f5311236168a109a1' },
    body: {
      doctor: '60d0fe4f5311236168a109b1',
      patient: '60d0fe4f5311236168a109c1',
      appointmentDate: pastDateStr, // PAST DATE!
      appointmentTime: '10:00',
      reason: 'Check past date rejection'
    }
  };

  await apptController.createAppointment(mockReqPast, mockRes, (err) => {});
  
  console.log(`  Past date HTTP Status: ${statusCode}`);
  console.log(`  Response message: ${jsonResponse?.message}`);
  assert.strictEqual(statusCode, 400, 'Backend must return HTTP 400 for past dates');
  assert(jsonResponse?.message?.includes('cannot be in the past'), 'Message must indicate past date error');
  console.log('  ✅ [PASS] Backend controller correctly rejected past date with HTTP 400.\n');

  // Step 3: Frontend DOM Validation Test
  console.log('--- Step 3: Testing Frontend Script & DOM Handlers ---');
  const scriptPath = path.join(__dirname, '..', 'frontend', 'script.js');
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');

  // Mock DOM elements
  const elements = {};
  function getOrCreateElement(id, tag = 'div') {
    if (!elements[id]) {
      elements[id] = {
        id,
        tagName: tag.toUpperCase(),
        min: '',
        value: '',
        innerText: '',
        innerHTML: '',
        style: {},
        classList: {
          classes: new Set(),
          add: (...c) => c.forEach(x => elements[id].classList.classes.add(x)),
          remove: (...c) => c.forEach(x => elements[id].classList.classes.delete(x)),
          contains: x => elements[id].classList.classes.has(x)
        },
        listeners: {},
        addEventListener(event, fn) {
          if (!this.listeners[event]) this.listeners[event] = [];
          this.listeners[event].push(fn);
        },
        dispatchEvent(evt) {
          const list = this.listeners[evt.type] || [];
          list.forEach(fn => fn.call(this, evt));
        },
        querySelector: () => null,
        querySelectorAll: () => [],
        appendChild: () => {},
        remove: () => {},
        reset: () => { elements[id].value = ''; }
      };
    }
    return elements[id];
  }

  // Pre-seed required elements
  getOrCreateElement('apptDateInput', 'input');
  getOrCreateElement('modalBookAppointment', 'div');
  getOrCreateElement('appointmentConflictAlert', 'div');
  getOrCreateElement('appointmentConflictMessage', 'span');
  getOrCreateElement('apptDoctorSelect', 'select');
  getOrCreateElement('apptPatientSelect', 'select');
  getOrCreateElement('apptTimeSelect', 'select');
  getOrCreateElement('apptReasonInput', 'input');
  getOrCreateElement('apptTypeSelect', 'select');
  getOrCreateElement('apptNotesInput', 'textarea');
  getOrCreateElement('bookAppointmentForm', 'form');
  getOrCreateElement('toastContainer', 'div');

  const listeners = {};
  const mockWindow = {
    document: {
      getElementById: (id) => getOrCreateElement(id),
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: (tag) => getOrCreateElement(`dyn_${Math.random()}`, tag),
      addEventListener: (event, fn) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(fn);
      },
      dispatchEvent: (evt) => {
        const list = listeners[evt.type] || [];
        list.forEach(fn => fn(evt));
      }
    },
    addEventListener: (event, fn) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    },
    location: { hostname: 'smart-clinic.vercel.app', protocol: 'https:', search: '' },
    localStorage: {
      data: {},
      getItem(k) { return this.data[k] || null; },
      setItem(k, v) { this.data[k] = String(v); },
      removeItem(k) { delete this.data[k]; }
    },
    sessionStorage: {
      data: {},
      getItem(k) { return this.data[k] || null; },
      setItem(k, v) { this.data[k] = String(v); },
      removeItem(k) { delete this.data[k]; }
    },
    setTimeout: (fn) => fn(),
    setInterval: () => 1,
    console: { log: () => {}, error: () => {}, warn: () => {} }
  };
  mockWindow.window = mockWindow;

  // Execute script in vm sandbox
  const context = vm.createContext(mockWindow);
  vm.runInContext(scriptContent, context);

  // Trigger DOMContentLoaded
  if (listeners['DOMContentLoaded']) {
    listeners['DOMContentLoaded'].forEach(fn => fn({}));
  }

  const dateInput = mockWindow.document.getElementById('apptDateInput');
  console.log(`  Initial dateInput.min: ${dateInput.min}`);
  assert.strictEqual(dateInput.min, todayStr, 'Date input min must be initialized to today');
  console.log('  ✅ [PASS] Date input min attribute initialized to today.');

  // Open book appointment modal
  mockWindow.clinicApp.openModal('modalBookAppointment');
  console.log(`  Modal opened. dateInput.value: ${dateInput.value}, dateInput.min: ${dateInput.min}`);
  assert(dateInput.value >= todayStr, 'Default date must be today or future');
  assert.strictEqual(dateInput.min, todayStr, 'dateInput.min must remain today');
  console.log('  ✅ [PASS] openModal enforces min attribute and non-past default value.');

  // Test validateAppointmentDate with past date
  dateInput.value = '2022-04-10';
  mockWindow.clinicApp.validateAppointmentDate(dateInput);
  console.log(`  After entering past date and validating: dateInput.value = ${dateInput.value}`);
  assert(dateInput.value >= todayStr, 'validateAppointmentDate must reset past date');
  console.log('  ✅ [PASS] validateAppointmentDate correctly intercepts past date.');

  // Test handleCreateAppointment with past date
  dateInput.value = '2023-01-01'; // Past date
  mockWindow.document.getElementById('apptDoctorSelect').value = 'doc_123';
  mockWindow.document.getElementById('apptPatientSelect').value = 'pat_123';
  mockWindow.document.getElementById('apptTimeSelect').value = '10:00';
  mockWindow.document.getElementById('apptReasonInput').value = 'Routine check';

  let eventPrevented = false;
  const mockEvent = {
    preventDefault: () => { eventPrevented = true; }
  };

  mockWindow.clinicApp.handleCreateAppointment(mockEvent);
  assert(eventPrevented, 'Event preventDefault must be called');

  const alertMsg = mockWindow.document.getElementById('appointmentConflictMessage');
  console.log(`  Alert message on past date submit: "${alertMsg.innerText}"`);
  assert(alertMsg.innerText.includes('cannot be in the past'), 'Alert must state date cannot be in the past');
  console.log('  ✅ [PASS] Form submission strictly blocked past date with clear message.');

  console.log('\n====================================================');
  console.log('🎉 ALL STRICT DATE VALIDATION TESTS PASSED (3/3 STEPS)');
  console.log('====================================================');
}

runDateValidationTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
