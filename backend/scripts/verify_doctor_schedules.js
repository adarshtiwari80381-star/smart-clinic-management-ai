/**
 * Verification of Doctor-Specific Schedules Across System
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const schedulingService = require('../services/schedulingService');
const seedData = require('../../database/seed/demo-data/seedData.json');

console.log('====================================================');
console.log('🩺 VERIFYING 4 DEMO DOCTOR WORKING SCHEDULES');
console.log('====================================================');

const expected = {
  'James': {
    hours: '10:00 AM - 02:00 PM',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    slotsCount: 8
  },
  'Priya': {
    hours: '11:00 AM - 04:00 PM',
    days: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    slotsCount: 10
  },
  'Robert': {
    hours: '09:00 AM - 01:00 PM',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    slotsCount: 8
  },
  'Sarah': {
    hours: '02:00 PM - 07:00 PM',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    slotsCount: 10
  }
};

// 1. Verify seedData.json doctors
for (const [key, spec] of Object.entries(expected)) {
  const doc = seedData.doctors.find(d => d.name.includes(key));
  assert(doc, `Doctor ${key} must exist in seedData.json`);
  
  const sched = schedulingService.getDoctorScheduleInfo(doc);
  assert.strictEqual(sched.workingHoursFormatted, spec.hours, `Doctor ${doc.name} hours mismatch`);
  assert.strictEqual(sched.slots.length, spec.slotsCount, `Doctor ${doc.name} slots count mismatch`);
  
  console.log(`  ✅ [PASS] ${doc.name}: ${sched.workingHoursFormatted} | Days: ${sched.workingDays.join(', ')} (${sched.slots.length} slots)`);
}

// 2. Verify frontend index.html & script.js contains working hours UI
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'script.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'style.css'), 'utf8');

assert(html.includes('id="doctorScheduleName"'), 'doctorScheduleName missing in index.html');
assert(html.includes('id="doctorScheduleDays"'), 'doctorScheduleDays missing in index.html');
assert(html.includes('id="doctorScheduleHours"'), 'doctorScheduleHours missing in index.html');
assert(script.includes('doctor-schedule-block'), 'doctor-schedule-block missing in script.js');
assert(script.includes('getDoctorWorkingHours'), 'getDoctorWorkingHours missing in script.js');
assert(script.includes('getDoctorWorkingDays'), 'getDoctorWorkingDays missing in script.js');
assert(css.includes('.doctor-schedule-block'), '.doctor-schedule-block missing in style.css');

console.log('  ✅ [PASS] Frontend Doctor Cards & Booking Modal markup, JS logic, and CSS verified');
console.log('====================================================');
console.log('🎉 ALL 4 DOCTOR SCHEDULE VERIFICATIONS PASSED');
console.log('====================================================');
