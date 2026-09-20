const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Public or Authenticated
exports.getDoctors = async (req, res, next) => {
  try {
    let query = {};

    // Filter by specialization if requested
    if (req.query.specialization) {
      query.specialization = new RegExp(req.query.specialization, 'i');
    }

    // Filter by status if requested
    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { specialization: searchRegex },
        { roomNumber: searchRegex }
      ];
    }

    const doctors = await Doctor.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single doctor
// @route   GET /api/doctors/:id
// @access  Public or Authenticated
exports.getDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: `Doctor not found with id of ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create doctor
// @route   POST /api/doctors
// @access  Private (Admin only)
exports.createDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.create(req.body);

    res.status(201).json({
      success: true,
      data: doctor
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update doctor
// @route   PUT /api/doctors/:id
// @access  Private (Admin or Doctor updating self)
exports.updateDoctor = async (req, res, next) => {
  try {
    let doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: `Doctor not found with id of ${req.params.id}`
      });
    }

    // If role is Doctor, make sure they only update themselves
    if (
      req.user.role === 'Doctor' &&
      req.user.doctorId &&
      doctor._id.toString() !== req.user.doctorId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update your own doctor profile.'
      });
    }

    doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete doctor
// @route   DELETE /api/doctors/:id
// @access  Private (Admin only)
exports.deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: `Doctor not found with id of ${req.params.id}`
      });
    }

    await Doctor.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Doctor removed successfully.'
    });
  } catch (err) {
    next(err);
  }
};
