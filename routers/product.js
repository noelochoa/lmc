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

// PROTECTED
router.get('/cms', auth, ProductsController.getAllProducts)
router.get('/cms/:category', auth, ProductsController.getAllProducts)
router.get('/cms/item/:productID', auth, ProductsController.getProduct)
router.post('/', auth, ProductsController.createProduct)
router.patch('/multi', auth, ProductsController.patchProducts)
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
router.patch(
	'/banner/:productID',
	auth,
	upload.single('banner'),
	ProductsController.patchProductBanner
)
router.delete(
	'/images/:productID/:imageID',
	auth,
	ProductsController.deleteProductImage
)

// PUBLIC ROUTES
router.get(
	'/id/:productID',
	check('productID').escape().trim(),
	ProductsController.getActiveProduct
)
router.get('/', ProductsController.getActiveProducts)
router.get('/all', ProductsController.getActiveProducts)
router.get('/new', ProductsController.getNewItems)
router.get('/featured', ProductsController.getFeaturedProducts)
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

module.exports = router
