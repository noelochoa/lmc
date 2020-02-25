const express = require('express')
const router = express.Router()

const CategoriesController = require('../controllers/categories')
const auth = require('../middleware/auth')

router.get('/', auth, CategoriesController.getCategories)
router.post('/', auth, CategoriesController.createCategory)
router.patch('/:categoryID', auth, CategoriesController.patchCategory)
router.delete('/:categoryID', auth, CategoriesController.deleteCategory)

module.exports = router
