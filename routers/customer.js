const express = require('express')
const router = express.Router()

const CustomersController = require('../controllers/customers')
const storeauth = require('../middleware/storeauth')

router.get('/', storeauth, CustomersController.getAllCustomers)
router.post('/', CustomersController.createNewCustomer)
router.post('/login', CustomersController.loginCustomer)
// router.post('/logout', storeauth, CustomersController.logoutCustomer)
// router.post('/logoutall', storeauth, CustomersController.logoutAll)

module.exports = router
