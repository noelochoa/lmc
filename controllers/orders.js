const mongoose = require('mongoose')
const Order = require('../models/Order')

exports.getOrderStats = async (req, res) => {
	try {
		const stats = await Order.getOrderStats()
		res.status(200).send(stats)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}
