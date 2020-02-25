const express = require('express')
const router = express.Router()

const UsersController = require('../controllers/users')
const auth = require('../middleware/auth')

router.get('/', auth, UsersController.getAllUsers)
router.post('/', UsersController.createNewUser)
router.post('/login', UsersController.loginUser)
router.post('/logout', auth, UsersController.logoutUser)
router.post('/logoutall', auth, UsersController.logoutAll)

module.exports = router
