const express = require('express');
const router = express.Router();
const {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment
} = require('../controllers/appointmentController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.use(protect);

router
  .route('/')
  .get(getAppointments)
  .post(authorizeRoles('Patient'), createAppointment);

router
  .route('/:id')
  .get(getAppointment)
  .put(updateAppointment)
  .delete(authorizeRoles('Doctor'), deleteAppointment);

module.exports = router;
