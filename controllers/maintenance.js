const Discount = require('../models/Discount')
const Order = require('../models/Order')
const Product = require('../models/Product')
const Comment = require('../models/Comment')
// const Customer = require('../models/Customer')

exports.clearAll = async (req, res) => {
	// Clear Discounts, Products, and Orders
	try {
		await Discount.deleteMany()
		await Order.deleteMany()
		await Product.deleteMany()
		await Comment.deleteMany()

		res.status(200).send({ message: 'Deleted items' })
	} catch (err) {
		res.status(400).send({ error: err })
	}
}
