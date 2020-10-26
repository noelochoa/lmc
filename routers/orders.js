const express = require('express')
const router = express.Router()

const OrdersController = require('../controllers/orders')
const auth = require('../middleware/auth')

router.get('/stats', auth, OrdersController.getOrderStats)
router.get('/statlist', auth, OrdersController.getOrderStatuses)
router.get('/cms', auth, OrdersController.getOrders)
router.get('/cms/:orderID', auth, OrdersController.getOrder)
router.post('/cms', auth, OrdersController.placeOrder)

module.exports = router
