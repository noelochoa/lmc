const express = require('express')
const router = express.Router()

const OrdersController = require('../controllers/orders')
const auth = require('../middleware/auth')

router.get('/stats', auth, OrdersController.getOrderStats)
router.get('/cms', OrdersController.getOrders)
router.post('/cms', auth, OrdersController.placeOrder)

module.exports = router
