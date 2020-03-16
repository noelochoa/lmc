const express = require('express')
const { check } = require('express-validator')
const router = express.Router()

const UsersController = require('../controllers/users')
const auth = require('../middleware/auth')

router.get('/', auth, UsersController.getAllUsers)
router.post('/', auth, UsersController.createNewUser)
router.post(
	'/login',
	check('email').isEmail(),
	check('password').isLength({ min: 6 }),
	UsersController.loginUser
)
router.post(
	'/changepw',
	check('currpw').isLength({ min: 6 }),
	check('newpw').isLength({ min: 6 }),
	check('reppw').isLength({ min: 6 }),
	auth,
	UsersController.changePW
)
router.post('/logout', auth, UsersController.logoutUser)
router.post('/logoutall', auth, UsersController.logoutAll)

module.exports = router
