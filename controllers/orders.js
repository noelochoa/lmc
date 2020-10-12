const mongoose = require('mongoose')
// const Order = require('../models/Order')
const OrderStatus = require('../models/OrderStatus')

exports.getOrderStats = async (req, res) => {
	try {
		const stats = await OrderStatus.getOrdersStats()
		res.status(200).send(stats)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}
