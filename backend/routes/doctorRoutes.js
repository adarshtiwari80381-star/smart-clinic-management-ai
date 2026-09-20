const express = require('express');
const router = express.Router();
const {
  getDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
  deleteDoctor
} = require('../controllers/doctorController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(getDoctors)
  .post(protect, authorizeRoles('Admin'), createDoctor);

router
  .route('/:id')
  .get(getDoctor)
  .put(protect, authorizeRoles('Admin', 'Doctor'), updateDoctor)
  .delete(protect, authorizeRoles('Admin'), deleteDoctor);

module.exports = router;
