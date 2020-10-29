const express = require('express')
const router = express.Router()

const OrdersController = require('../controllers/orders')
const auth = require('../middleware/auth')

router.get('/stats', auth, OrdersController.getOrderStats)
router.get('/statlist', auth, OrdersController.getOrderStatuses)
router.get('/cms', auth, OrdersController.getOrders)
router.get('/cms/:orderID', auth, OrdersController.getOrder)
router.post('/similar/:orderID', auth, OrdersController.findSimilarOrders)
router.post('/cms', auth, OrdersController.placeOrder)
router.patch('/cms/:orderID', auth, OrdersController.patchOrder)
router.patch('/cms/replace/:orderID', auth, OrdersController.replaceOrder)

module.exports = router
