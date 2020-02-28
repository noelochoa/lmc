const express = require('express')
const router = express.Router()

const CustomersController = require('../controllers/customers')
const storeauth = require('../middleware/storeauth')

router.post('/login', CustomersController.loginCustomer)
router.post('/logout', storeauth, CustomersController.logoutCustomer)
router.post('/logoutall', storeauth, CustomersController.logoutAll)
router.patch('/', storeauth, CustomersController.patchCustomer)
router.post('/token', storeauth, CustomersController.generateToken)
router.post('/verify', storeauth, CustomersController.verifyToken)
router.post('/smstoken', storeauth, CustomersController.generateSMSToken)
router.post('/smsverify', storeauth, CustomersController.verifySMSToken)

module.exports = router
