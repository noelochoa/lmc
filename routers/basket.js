const express = require('express')
const router = express.Router()

const BasketController = require('../controllers/basket')
const customerauth = require('../middleware/customerauth')

router.get('/', customerauth, BasketController.getBasket)
router.get('/:basketID', customerauth, BasketController.getBasket)
router.post(
	'/merge/:basketID',
	customerauth,
	BasketController.combineCustomerBasket
)
router.patch('/:basketID', customerauth, BasketController.patchBasket)
router.post('/add', customerauth, BasketController.addToBasket)
router.post('/add/:basketID', customerauth, BasketController.addToBasket)

module.exports = router
