const express = require('express')
const router = express.Router()

const MaintenanceController = require('../controllers/maintenance')

// CMS
router.post('/clear', MaintenanceController.clearAll)

module.exports = router
