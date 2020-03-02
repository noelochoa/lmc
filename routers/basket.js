const express = require('express')
const router = express.Router()

const BasketController = require('../controllers/basket')
const guestauth = require('../middleware/guestauth')
const storeauth = require('../middleware/storeauth')

// GUEST BASKET ROUTES
router.get('/guest/:basketID', BasketController.getGuestBasket)
router.get('/', guestauth, BasketController.getGuestBasket)
router.post('/', guestauth, BasketController.addToGuestBasket)
router.patch('/', guestauth, BasketController.patchGuestBasket)

// LOGGED-IN CUSTOMER BASKET ROUTES
router.get('/profile', storeauth, BasketController.getBasket)
router.post('/profile', storeauth, BasketController.addToBasket)
router.patch('/profile', storeauth, BasketController.patchBasket)
router.post('/merge', storeauth, guestauth, BasketController.combineBaskets)

module.exports = router
