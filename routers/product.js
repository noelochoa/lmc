const express = require('express')
const router = express.Router()

const ProductsController = require('../controllers/products')
const auth = require('../middleware/auth')

router.get('/', ProductsController.getAllProducts)
router.get('/id/:productID', ProductsController.getActiveProduct)
router.get('/all', ProductsController.getActiveProducts)
router.get('/:category', ProductsController.getActiveProducts)
router.get('/:category/:productName', ProductsController.getActiveProductByName)
router.post('/', ProductsController.createProduct)
router.patch('/:productID', auth, ProductsController.patchProduct)

module.exports = router
