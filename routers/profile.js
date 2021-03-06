const express = require('express')
const { check } = require('express-validator')
const router = express.Router()

const CustomersController = require('../controllers/customers')
const storeauth = require('../middleware/storeauth')
const refsauth = require('../middleware/refreshstoreauth')

router.get('/', storeauth, CustomersController.getCustomer)
router.post(
	'/register',
	check('firstname').isAlphanumeric(),
	check('lastname').isAlphanumeric(),
	check('email').isEmail(),
	check('password').isLength({ min: 6 }),
	check('accountType').isAlphanumeric(),
	CustomersController.createNewCustomer
)
router.post(
	'/login',
	check('email').isEmail(),
	check('password').isLength({ min: 6 }),
	CustomersController.loginCustomer
)

router.post('/refresh', refsauth, CustomersController.refresh)
router.post('/logout', storeauth, CustomersController.logoutCustomer)
router.post('/logoutall', storeauth, CustomersController.logoutAll)
router.patch('/', storeauth, CustomersController.patchCustomer)
router.post(
	'/password/reset',
	check('email').isEmail(),
	CustomersController.sendResetToken
)

router.patch(
	'/password/reset',
	check('email').isEmail(),
	check('token').isLength(6),
	check('newpass').isLength({ min: 6 }),
	CustomersController.verifyNewPass
)
router.post('/token', storeauth, CustomersController.generateToken)
router.post(
	'/verify',
	check('email').isEmail(),
	check('token').isLength(6),
	CustomersController.verifyToken
)
router.post('/smstoken', storeauth, CustomersController.generateSMSToken)
router.post('/smsverify', storeauth, CustomersController.verifySMSToken)

module.exports = router
