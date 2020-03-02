const express = require('express')
const { check } = require('express-validator')
const router = express.Router()

const ProductsController = require('../controllers/products')
const auth = require('../middleware/auth')

router.get(
	'/id/:productID',
	check('productID')
		.escape()
		.trim(),
	ProductsController.getActiveProduct
)
router.get('/', ProductsController.getActiveProducts)
router.get('/all', ProductsController.getActiveProducts)
router.get(
	'/:category',
	check('category')
		.escape()
		.trim(),
	ProductsController.getActiveProducts
)
router.get(
	'/:category/:productName',
	check('productName')
		.escape()
		.trim(),
	ProductsController.getActiveProductByName
)
router.post('/', ProductsController.createProduct)
router.patch('/:productID', auth, ProductsController.patchProduct)

module.exports = router
