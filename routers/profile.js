const express = require('express')
const { check } = require('express-validator')
const router = express.Router()

const CustomersController = require('../controllers/customers')
const storeauth = require('../middleware/storeauth')

router.get('/', storeauth, CustomersController.getCustomer)
router.post(
	'/',
	check('firstname').isAlphanumeric(),
	check('lastname').isAlphanumeric(),
	check('email').isEmail(),
	check('password').isLength({ min: 6 }),
	CustomersController.createNewCustomer
)
router.post(
	'/login',
	check('email').isEmail(),
	check('password').isLength({ min: 6 }),
	CustomersController.loginCustomer
)

router.post('/logout', storeauth, CustomersController.logoutCustomer)
router.post('/logoutall', storeauth, CustomersController.logoutAll)
router.patch('/', storeauth, CustomersController.patchCustomer)
router.post('/token', storeauth, CustomersController.generateToken)
router.post('/verify', storeauth, CustomersController.verifyToken)
router.post('/smstoken', storeauth, CustomersController.generateSMSToken)
router.post('/smsverify', storeauth, CustomersController.verifySMSToken)

module.exports = router
