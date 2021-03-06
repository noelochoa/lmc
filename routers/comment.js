const express = require('express')
const { check } = require('express-validator')
const router = express.Router()

const CommentsController = require('../controllers/comments')
const auth = require('../middleware/auth')
const storeauth = require('../middleware/storeauth')

router.get('/recent', CommentsController.getRecentComments)
router.get('/', CommentsController.getAllComments)
router.get('/:commentID', CommentsController.getComment)
router.get('/product/:productID', CommentsController.getComments)
router.post(
	'/',
	check('comment').trim().exists(),
	check('product').exists(),
	check('author').exists(),
	// storeauth,
	CommentsController.postComment
)
router.patch('/:commentID', auth, CommentsController.editComment)

module.exports = router
