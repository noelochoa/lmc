const express = require('express')
const router = express.Router()

const BasketController = require('../controllers/basket')
// const auth = require('../middleware/auth')

router.get('/:basketID', BasketController.getBasket)
router.patch('/:basketID', BasketController.patchBasket)
router.post('/add', BasketController.addToBasket)
router.post('/add/:basketID', BasketController.addToBasket)

module.exports = router
