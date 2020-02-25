const express = require('express')
const router = express.Router()

const CommentsController = require('../controllers/comments')
const auth = require('../middleware/auth')
const storeauth = require('../middleware/storeauth')

router.get('/:productID', CommentsController.getComments)
router.post('/', storeauth, CommentsController.postComment)
router.patch('/:commentID', auth, CommentsController.editComment)

module.exports = router
