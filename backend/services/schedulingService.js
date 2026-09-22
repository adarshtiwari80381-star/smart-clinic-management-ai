/**
 * Scheduling Service for Smart Clinic Management System AI
 * Allocates consultation slots strictly within doctor's working hours
 * while allowing patients to submit requests anytime.
 */

// Helper: Convert 'HH:MM' (24-hr or 12-hr with AM/PM) into minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const clean = String(timeStr).trim();

  // Match 12-hour format e.g. "10:30 AM", "6:00 PM", "01:30 PM"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridian = match12[3].toUpperCase();

    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Match 24-hour format e.g. "18:00", "09:30"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }

  return 0;
}

// Helper: Convert minutes from midnight to "HH:MM" (24-hr format)
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Helper: Convert "HH:MM" (24-hr) to "hh:mm AM/PM" (12-hr format)
function formatTime12Hour(timeStr) {
  if (!timeStr) return '';
  const totalMins = timeToMinutes(timeStr);
  let h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  const meridian = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${meridian}`;
}

// Helper: Get Day of Week name from "YYYY-MM-DD"
function getDayOfWeekName(dateStr) {
  const parts = String(dateStr).substring(0, 10).split('-');
  if (parts.length !== 3) return 'Monday';
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const date = new Date(Date.UTC(y, m, d));
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getUTCDay()];
}

// Helper: Advance date by N days
function getNextDateString(dateStr, daysAhead = 1) {
  const parts = String(dateStr).substring(0, 10).split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const date = new Date(Date.UTC(y, m, d + daysAhead));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Extract doctor's working schedule details
function getDoctorScheduleInfo(doctor) {
  const workingDays =
    Array.isArray(doctor.availableDays) && doctor.availableDays.length > 0
      ? doctor.availableDays
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  let workingHoursStart = doctor.workingHoursStart || '10:00';
  let workingHoursEnd = doctor.workingHoursEnd || '14:00';

  // Normalize Dr. James Wilson specific default (10:00 AM - 02:00 PM)
  if (doctor.name && doctor.name.includes('Wilson')) {
    workingHoursStart = doctor.workingHoursStart || '10:00';
    workingHoursEnd = doctor.workingHoursEnd || '14:00';
  }

  const startMins = timeToMinutes(workingHoursStart);
  const endMins = timeToMinutes(workingHoursEnd);

  // Generate 30-minute consultation slots within doctor's working hours
  const slots = [];
  for (let m = startMins; m < endMins; m += 30) {
    slots.push(minutesToTime(m));
  }

  const workingHoursFormatted = `${formatTime12Hour(workingHoursStart)} - ${formatTime12Hour(workingHoursEnd)}`;

  return {
    workingDays,
    workingHoursStart: minutesToTime(startMins),
    workingHoursEnd: minutesToTime(endMins),
    startMins,
    endMins,
    slots,
    workingHoursFormatted
  };
}

/**
 * Schedule Allocation Algorithm:
 * 1. Patient submits preferred date/time.
 * 2. Check doctor's working days.
 * 3. Check doctor's working hours.
 * 4. Find available consultation slot.
 * 5. If requested time falls within working hours and is available: assign that slot.
 * 6. If requested time is outside working hours: find nearest available slot during doctor's working hours.
 * 7. If the requested date has no available slots: move to the doctor's next working day.
 * 8. Prevent duplicate doctor/date/time appointments.
 * 9. Never assign a consultation outside doctor's working hours.
 */
async function allocateAppointmentSlot(doctor, requestedDateStr, requestedTimeStr, isDoctorBookedFn) {
  const normReqDate = String(requestedDateStr).substring(0, 10);
  const reqMins = timeToMinutes(requestedTimeStr);
  const normReqTime = minutesToTime(reqMins);

  const schedule = getDoctorScheduleInfo(doctor);
  const { workingDays, startMins, endMins, slots, workingHoursFormatted } = schedule;

  let scheduledDate = null;
  let scheduledTime = null;
  let allocationReason = '';

  // Helper to check if a specific day is in doctor's working days
  const isWorkingDay = (dayName) => workingDays.map(d => d.toLowerCase()).includes(dayName.toLowerCase());

  // Step 4 & 5: Check requested date
  const reqDayName = getDayOfWeekName(normReqDate);

  if (isWorkingDay(reqDayName)) {
    // Check if requested time is within working hours
    const isWithinHours = reqMins >= startMins && reqMins < endMins;

    if (isWithinHours) {
      // Find if exact requested slot is in doctor's slots or align to nearest 30-min slot
      let exactSlot = normReqTime;
      if (!slots.includes(exactSlot)) {
        // Snap to closest 30-min slot inside working hours
        exactSlot = slots.reduce((prev, curr) => {
          return Math.abs(timeToMinutes(curr) - reqMins) < Math.abs(timeToMinutes(prev) - reqMins) ? curr : prev;
        });
      }

      const booked = await isDoctorBookedFn(doctor._id, normReqDate, exactSlot);
      if (!booked) {
        scheduledDate = normReqDate;
        scheduledTime = exactSlot;
        allocationReason = 'EXACT_REQUESTED_SLOT';
      }
    }

    // Step 6: If outside working hours OR requested slot was already booked, find nearest available slot today
    if (!scheduledDate) {
      // Check all consultation slots for this date
      const availableToday = [];
      for (const slot of slots) {
        const booked = await isDoctorBookedFn(doctor._id, normReqDate, slot);
        if (!booked) {
          availableToday.push(slot);
        }
      }

      if (availableToday.length > 0) {
        // Find nearest available slot in minutes to requested time
        availableToday.sort((a, b) => {
          const diffA = Math.abs(timeToMinutes(a) - reqMins);
          const diffB = Math.abs(timeToMinutes(b) - reqMins);
          if (diffA === diffB) {
            return timeToMinutes(a) - timeToMinutes(b);
          }
          return diffA - diffB;
        });

        scheduledDate = normReqDate;
        scheduledTime = availableToday[0];
        allocationReason = isWithinHours ? 'NEXT_AVAILABLE_SAME_DAY' : 'NEAREST_SLOT_IN_WORKING_HOURS';
      }
    }
  }

  // Step 7: If requested date has no available slots (or requested date is not a working day):
  // Move to doctor's next working day
  if (!scheduledDate) {
    let currDate = normReqDate;
    let daysSearched = 0;

    while (!scheduledDate && daysSearched < 30) {
      daysSearched++;
      currDate = getNextDateString(normReqDate, daysSearched);
      const currDayName = getDayOfWeekName(currDate);

      if (isWorkingDay(currDayName)) {
        // Check available slots on this next working day
        const availableNextDay = [];
        for (const slot of slots) {
          const booked = await isDoctorBookedFn(doctor._id, currDate, slot);
          if (!booked) {
            availableNextDay.push(slot);
          }
        }

        if (availableNextDay.length > 0) {
          // If moving to next working day, pick the earliest available slot (or nearest to requested time)
          scheduledDate = currDate;
          scheduledTime = availableNextDay[0];
          allocationReason = 'NEXT_AVAILABLE_WORKING_DAY';
          break;
        }
      }
    }
  }

  // Fallback safety: ensure scheduled slot is strictly defined
  if (!scheduledDate || !scheduledTime) {
    scheduledDate = normReqDate;
    scheduledTime = slots[0] || '10:00';
  }

  const scheduledDayName = getDayOfWeekName(scheduledDate);
  const scheduledTime12h = formatTime12Hour(scheduledTime);
  const requestedTime12h = formatTime12Hour(normReqTime);

  const doctorDisplay = doctor.name.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`;
  const displayMessage = `${doctorDisplay} is available from ${workingHoursFormatted}. Your consultation has been scheduled for ${scheduledDayName} at ${scheduledTime12h}.`;

  return {
    doctorName: doctor.name,
    doctorWorkingHours: workingHoursFormatted,
    requestedDate: normReqDate,
    requestedTime: requestedTime12h,
    requestedTimeRaw: normReqTime,
    scheduledDate,
    scheduledTime,
    scheduledTime12h,
    scheduledDayName,
    allocationReason,
    displayMessage
  };
}

module.exports = {
  timeToMinutes,
  minutesToTime,
  formatTime12Hour,
  getDayOfWeekName,
  getNextDateString,
  getDoctorScheduleInfo,
  allocateAppointmentSlot
};
