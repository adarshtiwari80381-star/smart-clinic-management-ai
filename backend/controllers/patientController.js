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
// @access  Private (Blocked for Admin/Doctor - Public registration only)
exports.createPatient = async (req, res, next) => {
  try {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin cannot register patients. Patient registration is handled through the public patient registration flow.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private (Patient self-update only)
exports.updatePatient = async (req, res, next) => {
  try {
    if (req.user.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin has read-only monitoring access and cannot edit patients.'
      });
    }

    if (req.user.role === 'Doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Doctors cannot modify patient administrative profile information.'
      });
    }

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
      (!req.user.patientId || patient._id.toString() !== req.user.patientId.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update your own record'
      });
    }

    // Only allow updating personal contact details
    const allowedUpdates = {
      phone: req.body.phone,
      address: req.body.address,
      emergencyContact: req.body.emergencyContact,
      allergies: req.body.allergies
    };
    if (req.body.name) allowedUpdates.name = req.body.name;

    patient = await Patient.findByIdAndUpdate(req.params.id, allowedUpdates, {
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
// @access  Private (Blocked: Admin is monitoring only)
exports.deletePatient = async (req, res, next) => {
  try {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin has read-only monitoring access and cannot delete patients.'
    });
  } catch (err) {
    next(err);
  }
};
