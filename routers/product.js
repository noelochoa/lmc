const express = require('express')
const { check } = require('express-validator')
const multer = require('multer')
const router = express.Router()

const { fileFilter, imageStorage, imageLimits } = require('../helpers/settings')
const upload = multer({
	storage: multer.diskStorage(imageStorage),
	limits: imageLimits,
	fileFilter: fileFilter
})

const ProductsController = require('../controllers/products')
const auth = require('../middleware/auth')

router.get(
	'/id/:productID',
	check('productID').escape().trim(),
	ProductsController.getActiveProduct
)
router.get('/any', auth, ProductsController.getAllProducts)
router.get('/', ProductsController.getActiveProducts)
router.get('/all', ProductsController.getActiveProducts)
router.get('/stats', ProductsController.getProductStats)
router.get(
	'/:category',
	check('category').escape().trim(),
	ProductsController.getActiveProducts
)
router.get(
	'/:category/:productName',
	check('productName').escape().trim(),
	ProductsController.getActiveProductByName
)
router.post('/', ProductsController.createProduct)
router.patch('/:productID', auth, ProductsController.patchProduct)
router.patch(
	'/options/:productID',
	auth,
	ProductsController.patchProductOptions
)
router.patch(
	'/images/:productID',
	auth,
	upload.array('image'),
	ProductsController.patchProductImages
)

module.exports = router
