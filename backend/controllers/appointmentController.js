const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const schedulingService = require('../services/schedulingService');

// Helper: Check if slot is taken
const isDoctorBooked = async (doctorId, date, time, excludeAppointmentId = null) => {
  const normTime = schedulingService.minutesToTime(schedulingService.timeToMinutes(time));
  const time12h = schedulingService.formatTime12Hour(time);
  const possibleTimes = Array.from(new Set([time, normTime, time12h].filter(Boolean)));

  const query = {
    doctor: doctorId,
    $or: [
      { scheduledDate: date, scheduledTime: { $in: possibleTimes } },
      { appointmentDate: date, appointmentTime: { $in: possibleTimes } },
      { scheduledDate: date, appointmentTime: { $in: possibleTimes } },
      { appointmentDate: date, scheduledTime: { $in: possibleTimes } }
    ],
    status: { $ne: 'Cancelled' }
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const existing = await Appointment.findOne(query);
  return !!existing;
};

// @desc    Get all appointments (Role filtered)
// @route   GET /api/appointments
// @access  Private
exports.getAppointments = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'Patient') {
      if (!req.user.patientId) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      query.patient = req.user.patientId;
    } else if (req.user.role === 'Doctor') {
      if (!req.user.doctorId) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      query.doctor = req.user.doctorId;
    }

    // Optional query filters
    if (req.query.doctor) query.doctor = req.query.doctor;
    if (req.query.patient) query.patient = req.query.patient;
    if (req.query.date) {
      query.$or = [
        { scheduledDate: req.query.date },
        { appointmentDate: req.query.date }
      ];
    }
    if (req.query.status) query.status = req.query.status;

    const appointments = await Appointment.find(query)
      .populate('doctor', 'name specialization email phone consultationFee roomNumber availableDays workingHoursStart workingHoursEnd availableTimeSlots')
      .populate('patient', 'name email phone age gender bloodGroup allergies')
      .sort({ scheduledDate: 1, scheduledTime: 1, appointmentDate: 1, appointmentTime: 1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor', 'name specialization email phone consultationFee roomNumber availableDays workingHoursStart workingHoursEnd availableTimeSlots')
      .populate('patient', 'name email phone age gender bloodGroup allergies');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `Appointment not found with id of ${req.params.id}`
      });
    }

    // RBAC check
    if (req.user.role === 'Patient' && appointment.patient._id.toString() !== req.user.patientId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view appointments of other patients'
      });
    }

    if (req.user.role === 'Doctor' && appointment.doctor._id.toString() !== req.user.doctorId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view appointments assigned to other doctors'
      });
    }

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new appointment with Intelligent Schedule Allocation
// @route   POST /api/appointments
// @access  Private (Patient only)
exports.createAppointment = async (req, res, next) => {
  try {
    // Strict RBAC: Only Patient role can book appointments
    if (req.user.role !== 'Patient') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Appointment booking is reserved for patients only. Admin and Doctors cannot book appointments.'
      });
    }

    if (!req.user.patientId) {
      return res.status(400).json({
        success: false,
        message: 'No patient record linked to this user account.'
      });
    }

    let { doctor, patient, appointmentDate, appointmentTime, requestedDate, requestedTime, autoSchedule, reason, type, notes } = req.body;

    const reqDateInput = requestedDate || appointmentDate;
    const reqTimeInput = requestedTime || appointmentTime;

    // Strict ownership enforcement: Patient cannot book for another patient
    if (patient && patient.toString() !== req.user.patientId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot create an appointment for another patient.'
      });
    }

    // Always enforce logged-in patient's identity
    patient = req.user.patientId;

    if (!doctor || !patient || !reqDateInput || !reqTimeInput || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide doctor, patient, date, time slot, and reason for visit.'
      });
    }

    // ==========================================
    // CRITICAL REQUIREMENT: STRICT PAST DATE CHECK
    // ==========================================
    const now = new Date();
    const utcDateStr = now.toISOString().split('T')[0];
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const localDateStr = `${year}-${month}-${day}`;
    const reqDateStr = String(reqDateInput).substring(0, 10);

    if (reqDateStr < utcDateStr && reqDateStr < localDateStr) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date cannot be in the past. Please select today or a future date.'
      });
    }

    // Verify doctor exists
    const doctorExists = await Doctor.findById(doctor);
    if (!doctorExists) {
      return res.status(404).json({
        success: false,
        message: 'Selected doctor does not exist.'
      });
    }

    // Verify patient exists
    const patientExists = await Patient.findById(patient);
    if (!patientExists) {
      return res.status(404).json({
        success: false,
        message: 'Selected patient does not exist.'
      });
    }

    // Allocate consultation slot strictly within doctor's working hours
    const scheduleResult = await schedulingService.allocateAppointmentSlot(
      doctorExists,
      reqDateStr,
      reqTimeInput,
      isDoctorBooked
    );

    // Conflict check for legacy direct booking without autoSchedule (double booking prevention)
    const isTargetSlotBooked = await isDoctorBooked(doctor, scheduleResult.scheduledDate, reqTimeInput);
    const isReqSlotBooked = await isDoctorBooked(doctor, reqDateStr, reqTimeInput);

    if ((isTargetSlotBooked || isReqSlotBooked) && autoSchedule !== true && !requestedTime) {
      return res.status(409).json({
        success: false,
        message: 'Doctor is not available at this time.'
      });
    }

    if ((isTargetSlotBooked || isReqSlotBooked) && autoSchedule === false) {
      return res.status(409).json({
        success: false,
        message: 'Doctor is not available at this time.'
      });
    }

    const newAppointment = await Appointment.create({
      doctor,
      patient,
      requestedDate: scheduleResult.requestedDate,
      requestedTime: scheduleResult.requestedTime,
      scheduledDate: scheduleResult.scheduledDate,
      scheduledTime: scheduleResult.scheduledTime,
      appointmentDate: scheduleResult.scheduledDate,
      appointmentTime: scheduleResult.scheduledTime,
      reason,
      type: type || 'Consultation',
      notes: notes || '',
      status: 'Confirmed'
    });

    const populated = await Appointment.findById(newAppointment._id)
      .populate('doctor', 'name specialization consultationFee roomNumber availableDays workingHoursStart workingHoursEnd')
      .populate('patient', 'name email phone age gender bloodGroup');

    res.status(201).json({
      success: true,
      message: 'Appointment Request Confirmed',
      scheduleDetails: {
        doctorName: doctorExists.name,
        doctorWorkingHours: scheduleResult.doctorWorkingHours,
        requestedDate: scheduleResult.requestedDate,
        requestedTime: scheduleResult.requestedTime,
        scheduledDate: scheduleResult.scheduledDate,
        scheduledTime: scheduleResult.scheduledTime12h,
        scheduledDayName: scheduleResult.scheduledDayName,
        displayMessage: scheduleResult.displayMessage
      },
      data: populated
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Doctor is not available at this time.'
      });
    }
    next(err);
  }
};

// @desc    Update appointment (status, rescheduling with conflict check)
// @route   PUT /api/appointments/:id
// @access  Private
exports.updateAppointment = async (req, res, next) => {
  try {
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `Appointment not found with id of ${req.params.id}`
      });
    }

    // Check RBAC permissions
    if (req.user.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin has read-only access to appointments.'
      });
    }
    if (req.user.role === 'Patient') {
      if (appointment.patient.toString() !== req.user.patientId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You cannot modify other patients appointments'
        });
      }
      // Patient can only cancel or update reason
      if (req.body.status && req.body.status !== 'Cancelled') {
        return res.status(403).json({
          success: false,
          message: 'Patients can only cancel their appointments'
        });
      }
    }

    if (req.user.role === 'Doctor') {
      if (appointment.doctor.toString() !== req.user.doctorId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You cannot modify appointments of other doctors'
        });
      }
    }

    // If rescheduling date or time, verify availability
    const targetDoctor = req.body.doctor || appointment.doctor;
    const targetDate = req.body.appointmentDate || appointment.appointmentDate;
    const targetTime = req.body.appointmentTime || appointment.appointmentTime;

    if (req.body.appointmentDate && req.body.status !== 'Cancelled') {
      const now = new Date();
      const utcDateStr = now.toISOString().split('T')[0];
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const localDateStr = `${year}-${month}-${day}`;
      const reqDateStr = String(req.body.appointmentDate).substring(0, 10);

      if (reqDateStr < utcDateStr && reqDateStr < localDateStr) {
        return res.status(400).json({
          success: false,
          message: 'Appointment date cannot be in the past. Please select today or a future date.'
        });
      }
    }

    if (
      (req.body.appointmentDate || req.body.appointmentTime || req.body.doctor) &&
      req.body.status !== 'Cancelled'
    ) {
      const conflict = await isDoctorBooked(targetDoctor, targetDate, targetTime, appointment._id);
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'Doctor is not available at this time.'
        });
      }
    }

    if (req.body.appointmentDate) req.body.scheduledDate = req.body.appointmentDate;
    if (req.body.scheduledDate) req.body.appointmentDate = req.body.scheduledDate;
    if (req.body.appointmentTime) req.body.scheduledTime = req.body.appointmentTime;
    if (req.body.scheduledTime) req.body.appointmentTime = req.body.scheduledTime;

    appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('doctor', 'name specialization consultationFee roomNumber availableDays workingHoursStart workingHoursEnd')
      .populate('patient', 'name email phone age gender bloodGroup');

    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully.',
      data: appointment
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Doctor is not available at this time.'
      });
    }
    next(err);
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Private (Admin or Doctor)
exports.deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `Appointment not found with id of ${req.params.id}`
      });
    }

    if (req.user.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin has read-only monitoring access and cannot delete appointments.'
      });
    }

    if (req.user.role === 'Patient') {
      return res.status(403).json({
        success: false,
        message: 'Patients cannot delete appointments permanently. Use cancellation instead.'
      });
    }

    await Appointment.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Appointment successfully deleted.'
    });
  } catch (err) {
    next(err);
  }
};
