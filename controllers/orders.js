const mongoose = require('mongoose')
const Order = require('../models/Order')
const OrderStatus = require('../models/OrderStatus')
const Customer = require('../models/Customer')
const Product = require('../models/Product')
const { Mongoose } = require('mongoose')
const { param } = require('express-validator')

exports.getOrderStats = async (req, res) => {
	try {
		let params = { ...req.query }
		const stats = await OrderStatus.getOrdersStats(params)
		res.status(200).send(stats)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getOrders = async (req, res) => {
	try {
		let params = { ...req.query }
		const orders = await Order.getOrders(params)
		res.status(200).send(orders)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.placeOrder = async (req, res) => {
	try {
		let params = req.body
		let finalPrice = 0

		// Find Placed status
		const [status, customer] = await Promise.all([
			OrderStatus.findOne({ status: 'placed' }),
			Customer.findOne({ _id: params.customer })
		])
		// Set as default (placed)
		params.status = status._id
		params.deliveryType = params.type
		params.shippingAddress = params.address

		// Query selected product details
		const products = await Product.getProductDetailsById(
			params.products.map((item) => {
				return mongoose.Types.ObjectId(item.product)
			})
		)

		// Compute price per item
		params.products.forEach((paramProduct) => {
			const selProduct = products.find((item) => {
				return item._id == paramProduct.product
			})
			// price per product
			let sub = selProduct.basePrice * paramProduct.quantity

			// Discount found for each item
			const maxDiscount =
				selProduct.discount && selProduct.discount.length > 0
					? Math.max.apply(
							Math,
							selProduct.discount
								.filter((item) => {
									return (
										item.target == customer.accountType ||
										item.target == 'all'
									)
								})
								.map(function (o) {
									return o.percent
								})
					  )
					: 0
			paramProduct.options.forEach((paramOption) => {
				const optionGrp = selProduct.options.find((selOpt) => {
					return selOpt.attribute == paramOption._option
				})
				const choice = optionGrp.choices.find((selChoice) => {
					return selChoice.value == paramOption._selected
				})
				sub += paramProduct.quantity * choice.price
			})

			// Update total price
			finalPrice += sub - (sub * maxDiscount) / 100
		})
		// Set final price to insert
		params.total = finalPrice.toFixed(0)

		// Create Order object
		const order = new Order(params)
		await order.save()
		res.status(200).send(order)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}
