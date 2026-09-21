const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

// @desc    Get medical records (role-filtered)
// @route   GET /api/medical-records
// @access  Private
exports.getMedicalRecords = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'Patient') {
      if (!req.user.patientId) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      query.patient = req.user.patientId;
    } else if (req.user.role === 'Doctor') {
      if (req.query.myRecordsOnly === 'true' && req.user.doctorId) {
        query.doctor = req.user.doctorId;
      }
    }

    if (req.query.patient) query.patient = req.query.patient;
    if (req.query.doctor) query.doctor = req.query.doctor;

    const records = await MedicalRecord.find(query)
      .populate('patient', 'name email phone age gender bloodGroup allergies')
      .populate('doctor', 'name specialization roomNumber email phone')
      .sort({ visitDate: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single medical record
// @route   GET /api/medical-records/:id
// @access  Private
exports.getMedicalRecord = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('patient', 'name email phone age gender bloodGroup allergies medicalHistory')
      .populate('doctor', 'name specialization roomNumber email phone')
      .populate('appointment');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Medical record not found with id of ${req.params.id}`
      });
    }

    // Role check: Patient can only view their own
    if (req.user.role === 'Patient' && record.patient._id.toString() !== req.user.patientId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view records of other patients'
      });
    }

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new medical record
// @route   POST /api/medical-records
// @access  Private (Doctor only)
exports.createMedicalRecord = async (req, res, next) => {
  try {
    if (req.user.role !== 'Doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin and Patients cannot create medical records. Clinical documentation is reserved for doctors.'
      });
    }

    let { patient, doctor, appointment, visitDate, symptoms, diagnosis, vitals, prescriptions, labTests, doctorNotes, followUpDate } = req.body;

    // Auto-assign doctor from authenticated doctor account
    doctor = req.user.doctorId || doctor;

    if (!patient || !doctor || !diagnosis) {
      return res.status(400).json({
        success: false,
        message: 'Please provide patient, doctor, and diagnosis details'
      });
    }

    const newRecord = await MedicalRecord.create({
      patient,
      doctor,
      appointment: appointment || null,
      visitDate: visitDate || new Date().toISOString().split('T')[0],
      symptoms: Array.isArray(symptoms) ? symptoms : (symptoms ? [symptoms] : []),
      diagnosis,
      vitals: vitals || {},
      prescriptions: prescriptions || [],
      labTests: labTests || [],
      doctorNotes: doctorNotes || '',
      followUpDate: followUpDate || null
    });

    const populated = await MedicalRecord.findById(newRecord._id)
      .populate('patient', 'name email phone age gender bloodGroup')
      .populate('doctor', 'name specialization roomNumber');

    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update medical record
// @route   PUT /api/medical-records/:id
// @access  Private (Doctor only)
exports.updateMedicalRecord = async (req, res, next) => {
  try {
    if (req.user.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin has read-only access and cannot edit medical records.'
      });
    }

    if (req.user.role !== 'Doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only doctors can edit medical records.'
      });
    }

    let record = await MedicalRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Medical record not found with id of ${req.params.id}`
      });
    }

    if (record.doctor.toString() !== req.user.doctorId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only edit records you authored'
      });
    }

    record = await MedicalRecord.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('patient', 'name email phone age gender bloodGroup')
      .populate('doctor', 'name specialization roomNumber');

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete medical record
// @route   DELETE /api/medical-records/:id
// @access  Private (Authoring Doctor only)
exports.deleteMedicalRecord = async (req, res, next) => {
  try {
    if (req.user.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin has read-only monitoring access and cannot delete medical records.'
      });
    }

    if (req.user.role !== 'Doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only attending doctors can delete their own medical records.'
      });
    }

    const record = await MedicalRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Medical record not found with id of ${req.params.id}`
      });
    }

    if (record.doctor.toString() !== req.user.doctorId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete records you authored'
      });
    }

    await MedicalRecord.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Medical record deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};
