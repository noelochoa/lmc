const express = require('express')
const { check } = require('express-validator')
const router = express.Router()

const CommentsController = require('../controllers/comments')
const auth = require('../middleware/auth')
const storeauth = require('../middleware/storeauth')

router.get('/:productID', CommentsController.getComments)
router.post(
	'/',
	check('comment')
		.escape()
		.trim(),
	storeauth,
	CommentsController.postComment
)
router.patch('/:commentID', auth, CommentsController.editComment)

module.exports = router
