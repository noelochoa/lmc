const express = require('express')
const router = express.Router()

const CustomersController = require('../controllers/customers')
const auth = require('../middleware/auth')

router.get('/', auth, CustomersController.getAllCustomers)
router.get('/stats', auth, CustomersController.getCustomerStats)
router.get('/pending', auth, CustomersController.getPendingResellers)
router.patch('/', auth, CustomersController.patchCustomer)
router.post('/', auth, CustomersController.createNewCustomer)

module.exports = router
