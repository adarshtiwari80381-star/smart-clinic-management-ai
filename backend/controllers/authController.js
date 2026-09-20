const User = require('../models/User');
const Patient = require('../models/Patient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_clinic_jwt_key_2026';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';

// Generate Token
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      doctorId: user.doctorId,
      patientId: user.patientId
    }
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both an email and password'
      });
    }

    // Check for user (include password field)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User does not exist.'
      });
    }

    // Check password match
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Register user (Patients self-registration)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, gender, age, bloodGroup, address } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: 'Patient',
      phone: phone || ''
    });

    // Create linked Patient profile
    const patient = await Patient.create({
      userId: user._id,
      name,
      email: email.toLowerCase().trim(),
      phone: phone || 'N/A',
      gender: gender || 'Other',
      age: age ? Number(age) : 25,
      bloodGroup: bloodGroup || 'Unknown',
      address: address || ''
    });

    // Link patientId back to user
    user.patientId = patient._id;
    await user.save();

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Logout user / clear token
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User successfully logged out.'
  });
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};
