const express = require('express')
const router = express.Router()

const CustomersController = require('../controllers/customers')
const auth = require('../middleware/auth')

router.get('/', auth, CustomersController.getAllCustomers)
router.get('/stats', auth, CustomersController.getCustomerStats)
router.get('/pending', auth, CustomersController.getPendingResellers)
router.get('/:accountID', auth, CustomersController.getCustomerDetails)
router.patch('/:accountID', auth, CustomersController.patchCustomerAccount)
router.post('/', auth, CustomersController.createNewCustomer)

module.exports = router
