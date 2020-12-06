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

exports.getCustomerOrders = async (req, res) => {
	//Get Customer Orders
	try {
		const orders = await Order.getCustomerOrders({
			customer: req.customer._id
		})
		res.status(200).send(orders)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.findSimilarOrders = async (req, res) => {
	if (req.params.orderID) {
		try {
			let orders = [],
				unique = new Map()
			queries = []
			let params = { ...req.body }
			/*
			if (params.status) {
				// Find similar status
				queries.push(
					Order.findSimilarStatus(req.params.orderID, params.status)
				)
			}
			if (params.customer) {
				// Find similar customer
				queries.push(
					Order.findSameCustomer(req.params.orderID, params.customer)
				)
			}*/
			if (params.target) {
				// Find similar target delivery date
				queries.push(
					Order.findNearbyDates(req.params.orderID, params.target)
				)
			}
			if (params.options) {
				// Find similar options
				queries.push(
					Order.findSimilarOptions(req.params.orderID, params.options)
				)
			}
			if (params.products) {
				// Find similar products
				queries.push(
					Order.findSimilarProducts(
						req.params.orderID,
						params.products.map((pid) =>
							mongoose.Types.ObjectId(pid)
						)
					)
				)
			}
			const results = await Promise.all(queries)
			results.forEach((resGrp, index) => {
				resGrp.forEach((order) => {
					order.similarity = [
						// 'Similar Status',
						// 'Same Customer',
						'Nearby Target date',
						'Similar Options',
						'Similar Products'
					][index % 5]
					if (!unique.has(order._id)) {
						orders.push(order)
					} else {
						unique.set(order._id, true)
					}
				})
			})
			res.status(200).send(orders)
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Order ID missing or invalid.' })
	}
}

exports.getOrder = async (req, res) => {
	// Get order details
	if (req.params.orderID) {
		try {
			const order = await Order.getOrderDetails({
				_id: mongoose.Types.ObjectId(req.params.orderID)
			})
			res.status(200).send(order)
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Order ID missing or invalid.' })
	}
}

exports.getCustomerOrder = async (req, res) => {
	// Get order details
	if (req.params.orderID && req.customer) {
		try {
			const order = await Order.getOrderDetails({
				_id: mongoose.Types.ObjectId(req.params.orderID),
				customer: req.customer._id
			})
			if (order) {
				return res.status(200).send(order)
			}
			res.status(404).send({
				error: 'Unknown or unauthorized order ID supplied.'
			})
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

exports.replaceOrder = async (req, res) => {
	if (req.params.orderID) {
		try {
			let params = req.body
			let finalPrice = 0

			// Find Placed status
			const [status, replacedStatus, customer] = await Promise.all([
				OrderStatus.findOne({ status: 'placed' }),
				OrderStatus.findOne({ status: 'replaced' }),
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
						item.target == customer.accountType ||
						item.target == 'all'
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
			// -------------------------------- //
			// set current order as Replaced
			const updateProps = {
				status: replacedStatus._id,
				replacedBy: { ordernum: order.ordernum, reference: order._id }
			}
			const result = await Order.updateOne(
				{ _id: req.params.orderID },
				{ $set: updateProps },
				{ runValidators: true }
			)
			if (!result || result.n == 0) {
				return res.status(400).send({ error: 'Error updating order.' })
			}
			res.status(200).send(order)
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Order ID is invalid.' })
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
