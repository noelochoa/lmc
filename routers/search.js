const express = require('express')
const router = express.Router()

const SearchController = require('../controllers/search')
const auth = require('../middleware/auth')

// SEARCH
router.get('/', auth, SearchController.findItems)

module.exports = router
