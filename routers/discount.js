const express = require('express')
const router = express.Router()

const DiscountsController = require('../controllers/discounts')
const auth = require('../middleware/auth')

router.get('/', auth, DiscountsController.getDates)
router.post('/', auth, DiscountsController.createDiscount)
router.patch('/:discountID', auth, DiscountsController.patchDiscount)
router.delete('/:discountID', auth, DiscountsController.deleteDiscount)

module.exports = router
