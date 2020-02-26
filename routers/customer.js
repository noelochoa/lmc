const express = require('express')
const router = express.Router()

const CustomersController = require('../controllers/customers')
const storeauth = require('../middleware/storeauth')

router.get('/', storeauth, CustomersController.getAllCustomers)
router.post('/', CustomersController.createNewCustomer)
router.post('/login', CustomersController.loginCustomer)
router.post('/token', storeauth, CustomersController.generateToken)
router.post('/verify', storeauth, CustomersController.verifyToken)
router.post('/logout', storeauth, CustomersController.logoutCustomer)
router.post('/logoutall', storeauth, CustomersController.logoutAll)
router.patch('/', storeauth, CustomersController.patchCustomer)

module.exports = router
