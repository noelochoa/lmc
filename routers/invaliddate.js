const express = require('express')
const router = express.Router()

const InvalidDatesController = require('../controllers/invaliddates')
const auth = require('../middleware/auth')

//router.get('/', auth, InvalidDatesController.getDates)
router.get('/', InvalidDatesController.getDates)
router.get('/:invalidDateID', auth, InvalidDatesController.getDate)
router.post('/', auth, InvalidDatesController.createInvalidDate)
router.patch('/:invalidDateID', auth, InvalidDatesController.patchInvalidDate)
router.delete('/:invalidDateID', auth, InvalidDatesController.deleteInvalidDate)

module.exports = router
