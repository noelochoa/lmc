const express = require('express')
const { check } = require('express-validator')
const router = express.Router()

const UsersController = require('../controllers/users')
const auth = require('../middleware/auth')
const refreshauth = require('../middleware/refreshauth')

router.get('/', auth, UsersController.getAllUsers)
router.post(
	'/',
	check('email').isEmail(),
	check('name').trim().notEmpty(),
	check('password').isLength({ min: 6 }),
	auth,
	UsersController.createNewUser
)
router.post(
	'/login',
	check('email').isEmail(),
	check('password').isLength({ min: 6 }),
	UsersController.loginUser
)
router.post('/refresh', refreshauth, UsersController.refresh)
router.post(
	'/edit',
	check('name').trim().notEmpty(),
	auth,
	UsersController.changeName
)
router.post(
	'/changepw',
	check('prevpw').isLength({ min: 6 }),
	check('newpw').isLength({ min: 6 }),
	check('reppw').isLength({ min: 6 }),
	auth,
	UsersController.changePW
)
router.post('/logout', auth, UsersController.logoutUser)
router.post('/logoutall', auth, UsersController.logoutAll)

module.exports = router
