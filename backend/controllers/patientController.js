const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// @desc    Get all patients (filtered by role)
// @route   GET /api/patients
// @access  Private (Admin, Doctor, Patient)
exports.getPatients = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'Patient') {
      // Patient can ONLY see their own profile
      if (!req.user.patientId) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      query = { _id: req.user.patientId };
    } else if (req.user.role === 'Doctor') {
      // Doctor can view patients related to their appointments or all clinic patients if searching
      if (req.query.myPatientsOnly === 'true' && req.user.doctorId) {
        const docAppointments = await Appointment.find({ doctor: req.user.doctorId }).distinct('patient');
        query = { _id: { $in: docAppointments } };
      }
    }

    // Keyword search support
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex }
      ];
    }

    const patients = await Patient.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Private
exports.getPatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient not found with id of ${req.params.id}`
      });
    }

    // Role check: Patient can only view their own
    if (
      req.user.role === 'Patient' &&
      req.user.patientId &&
      patient._id.toString() !== req.user.patientId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own patient profile'
      });
    }

    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new patient
// @route   POST /api/patients
// @access  Private (Admin, Doctor)
exports.createPatient = async (req, res, next) => {
  try {
    const patient = await Patient.create(req.body);

    res.status(201).json({
      success: true,
      data: patient
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private (Admin, Doctor, or the Patient themselves)
exports.updatePatient = async (req, res, next) => {
  try {
    let patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient not found with id of ${req.params.id}`
      });
    }

    // Patient can only update their own record
    if (
      req.user.role === 'Patient' &&
      req.user.patientId &&
      patient._id.toString() !== req.user.patientId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update your own record'
      });
    }

    patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Private (Admin only)
exports.deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient not found with id of ${req.params.id}`
      });
    }

    await Patient.findByIdAndDelete(req.params.id);

    // Also remove appointments and records if admin wants clean cascade
    await Appointment.deleteMany({ patient: req.params.id });

    res.status(200).json({
      success: true,
      data: {},
      message: 'Patient and associated appointments successfully removed.'
    });
  } catch (err) {
    next(err);
  }
};
