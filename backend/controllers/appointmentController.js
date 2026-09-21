const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');

// Helper: Check if slot is taken
const isDoctorBooked = async (doctorId, date, time, excludeAppointmentId = null) => {
  const query = {
    doctor: doctorId,
    appointmentDate: date,
    appointmentTime: time,
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
    if (req.query.date) query.appointmentDate = req.query.date;
    if (req.query.status) query.status = req.query.status;

    const appointments = await Appointment.find(query)
      .populate('doctor', 'name specialization email phone consultationFee roomNumber')
      .populate('patient', 'name email phone age gender bloodGroup allergies')
      .sort({ appointmentDate: 1, appointmentTime: 1 });

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
      .populate('doctor', 'name specialization email phone consultationFee roomNumber')
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

// @desc    Create new appointment with Conflict Checking
// @route   POST /api/appointments
// @access  Private (Admin, Doctor, Patient)
exports.createAppointment = async (req, res, next) => {
  try {
    let { doctor, patient, appointmentDate, appointmentTime, reason, type, notes } = req.body;

    // If logged in as Patient, ensure the appointment is booked for them
    if (req.user.role === 'Patient') {
      if (!req.user.patientId) {
        return res.status(400).json({
          success: false,
          message: 'No patient record linked to this user account.'
        });
      }
      patient = req.user.patientId;
    }

    if (!doctor || !patient || !appointmentDate || !appointmentTime || !reason) {
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
    const reqDateStr = String(appointmentDate).substring(0, 10);

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

    // ==========================================
    // CRITICAL REQUIREMENT: APPOINTMENT CONFLICT CHECK
    // ==========================================
    const conflict = await isDoctorBooked(doctor, appointmentDate, appointmentTime);
    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'Doctor is not available at this time.'
      });
    }

    const newAppointment = await Appointment.create({
      doctor,
      patient,
      appointmentDate,
      appointmentTime,
      reason,
      type: type || 'Consultation',
      notes: notes || '',
      status: 'Scheduled'
    });

    const populated = await Appointment.findById(newAppointment._id)
      .populate('doctor', 'name specialization consultationFee roomNumber')
      .populate('patient', 'name email phone age gender bloodGroup');

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully.',
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

    appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('doctor', 'name specialization consultationFee roomNumber')
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
