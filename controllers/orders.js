const mongoose = require('mongoose')
const Order = require('../models/Order')
const OrderStatus = require('../models/OrderStatus')
const Customer = require('../models/Customer')
const Product = require('../models/Product')
// const { check } = require('express-validator')

exports.getOrderStats = async (req, res) => {
	try {
		let params = { ...req.query }
		const stats = await OrderStatus.getOrdersStats(params)
		res.status(200).send(stats)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getOrderStatuses = async (req, res) => {
	try {
		const stats = await OrderStatus.find()
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

exports.getOrder = async (req, res) => {
	// Get order details
	if (req.params.orderID) {
		try {
			const order = await Order.findOne({
				_id: req.params.orderID
			}).populate('products.product', 'id name seoname images')

			res.status(200).send(order)
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Order ID missing or invalid.' })
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
			const discounts = selProduct.discount.filter((item) => {
				return (
					item.target == customer.accountType || item.target == 'all'
				)
			})
			// price per product
			let sub = selProduct.basePrice * paramProduct.quantity
			// Discount found for each item
			const maxDiscount =
				discounts && discounts.length > 0
					? Math.max.apply(
							Math,
							discounts.map(function (o) {
								return o.percent
							})
					  )
					: 0
			// Find option price
			paramProduct.options.forEach((paramOption) => {
				const optionGrp = selProduct.options.find((selOpt) => {
					return selOpt.attribute == paramOption._option
				})
				const choice = optionGrp.choices.find((selChoice) => {
					return selChoice.value == paramOption._selected
				})
				sub += paramProduct.quantity * choice.price
			})
			// Update per item prices
			paramProduct.price = sub
			paramProduct.discount = maxDiscount
			paramProduct.finalPrice = parseFloat(
				sub - (sub * maxDiscount) / 100
			).toFixed(0)
			// Update total price
			finalPrice += parseInt(paramProduct.finalPrice)
		})
		// Set final price to insert
		params.total = finalPrice
		// Create Order object and save
		const order = new Order(params)
		await order.save()
		res.status(200).send(order)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.patchOrder = async (req, res) => {
	// Edit Order details
	if (req.params.orderID) {
		try {
			const updateProps = {}
			for (let op of req.body) {
				updateProps[op.property] = op.value
			}
			const result = await Order.updateOne(
				{ _id: req.params.orderID },
				{ $set: updateProps },
				{ runValidators: true }
			)
			if (!result || result.n == 0) {
				return res.status(404).send({ error: 'Error updating order.' })
			}
			res.status(200).send({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Order ID is invalid.' })
	}
}
