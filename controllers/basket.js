const moment = require('moment')
const mongoose = require('mongoose')
const Basket = require('../models/Basket')
const Product = require('../models/Product')
const Order = require('../models/Order')
const comparator = require('../helpers/comparehelper')

const STDER_Fn = function (eta) {
	// plus/minus 2*standard error of the regression
	return [eta - 2 * 6.413, eta + 2 * 6.413]
}
const ETA_Fn = function (qty1, qty2, qty3, shipType, workload) {
	// return Math.round(
	// 	-1.15 + // OFFSET
	// 		2.774 * workload + // 1-5 Scale (Light to Heavy workload)
	// 		0.222 * qty1 + // Easy (1)
	// 		7.898 * qty2 + // Medium (2)
	// 		25.73 * qty3 + // Hard (3)
	// 		4.54 * shipType // Pickup = 1 or Delivery = 2
	// )

	return Math.round(
		-9.74 + // OFFSET
			14.172 * workload + // 1-5 Scale (Light to Heavy workload)
			0.087 * qty1 + // Easy (1)
			3.832 * qty2 + // Medium (2)
			8.53 * qty3 + // Hard (3)
			2.89 * shipType // Pickup = 1 or Delivery = 2
	)
}

// Order complexitiy
const reducer = (total, value) => {
	// count per difficulty/complexity
	const idx = value.product.category.difficulty
	total[idx] = (total[idx] || 0) + value.quantity
	return total
}

// Workload
const wlReducer = (total, value, idx) => {
	// workload is perceived higher the nearer to target date
	let tmp = 1,
		orders = value.ordersNum

	if (idx == 0) {
		// same day
		if (orders >= 3) {
			tmp = 5
		} else if (orders > 0 && orders < 3) {
			tmp = 4
		}
	} else if (idx == 1) {
		// a day before
		if (orders >= 3) {
			tmp = 3
		} else if (orders > 0 && orders < 3) {
			tmp = 2
		}
	} else {
		// 2+ days before
		tmp = 1
	}

	total = Math.max(total, tmp)
	return total
}

exports.combineBaskets = async (req, res) => {
	// Merge existing customer with supplied basket ID
	try {
		if (req.customer && req.basket) {
			let basket = await Basket.findOne({
				customer: req.customer._id
			})

			if (!basket) {
				// No customer basket, use supplied basket (guest)
				basket = await Basket.findOne({ _id: req.basket._id })
				if (basket) {
					// Update ownership
					basket.customer = req.customer._id
					await basket.save()

					return res.status(200).send({ message: 'Basket updated' })
				} else {
					res.status(202).send({
						message: 'Both baskets are empty. Nothing to process'
					})
				}
			} else {
				// Merge customer and supplied baskets then remove original
				basket = await basket.combineBasket(req.basket._id)
				if (basket) {
					basket.customer = req.customer._id
					await basket.save()
					return res.status(200).send({ message: 'Baskets combined' })
				} else {
					res.status(202).send({
						error: 'Basket to merge is empty. Nothing to process'
					})
				}
			}
		} else {
			res.status(400).send({ error: 'No valid baskets to merge' })
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getGuestBasket = async (req, res) => {
	// Get guest basket
	try {
		if (req.params.basketID) {
			// getBasketDetails uses aggregate with pipeline
			// basketID needs to be casted to mongoose ObjectID
			const basketID = mongoose.Types.ObjectId(req.params.basketID)
			const basket = await Basket.getBasketDetails({
				_id: basketID
			})
			if (!basket || basket.length == 0) {
				return res
					.status(200)
					.send({ message: 'Empty shopping basket.' })
			}
			return res.status(200).send({ basket })
		} else if (req.basket) {
			let tokens = {}
			const basket = await Basket.getBasketDetails({
				_id: req.basket._id
			})
			if (!basket || basket.length == 0) {
				return res
					.status(200)
					.send({ message: 'Empty shopping basket.' })
			}
			const orderDff = basket.products.reduce(reducer, {})
			// get ETA (minimum)
			const eta = ETA_Fn(
				orderDff['1'] || 0,
				orderDff['2'] || 0,
				orderDff['3'] || 0,
				1,
				1
			)
			const std = STDER_Fn(eta)

			// If near expiry, refresh access token
			if (req.refreshBasket) {
				const { token, xsrf } = await req.basket.generateCartToken()
				tokens = { token, xsrf }
			}
			basket.eta = eta
			basket.stdER = std

			return res
				.status(200)
				.send({ basket, count: req.basket.count, eta, ...tokens })
		}
		res.status(200).send({ message: 'Empty shopping basket' })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getBasket = async (req, res) => {
	// Get customer basket
	try {
		if (req.customer) {
			const basket = await Basket.getBasketDetails({
				customer: req.customer._id
			})
			if (basket && basket.length > 0) {
				return res.status(200).send({ basket })
			}
		}
		return res.status(200).send({ message: 'Empty shopping basket' })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.addToBasket = async (req, res) => {
	// Create or update basket
	try {
		let basket
		if (req.customer) {
			// If logged in, check if user has current past cart items
			basket = await Basket.findOne({
				customer: req.customer._id
			})
			if (basket) {
				// If customer basket exists push new item
				basket = await basket.addItem(req.body)
				basket.customer = req.customer._id
				await basket.save()

				let basketObj = basket.toJSON()
				res.status(200).send({
					message: 'Added item to basket',
					count: basket.count
				})
			} else {
				// If not existing basket but has supplied a basket ID
				basket = await Basket.createNewBasket(req.body)
				basket.customer = req.customer._id
				await basket.save()

				const { token, xsrf } = await basket.generateCartToken()
				res.status(200).send({
					message: 'New shopping basket created',
					token,
					xsrf,
					count: basket.count
				})
			}
		} else {
			res.status(400).send({ error: 'Invalid operation' })
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.addToGuestBasket = async (req, res) => {
	// Create or update guest basket
	try {
		let basket
		if (req.basket) {
			let tokens = {}

			// If not logged in, but has supplied a basket ID
			basket = await Basket.findUpdateBasket(req.basket._id, req.body)
			await basket.save()

			// If near expiry, refresh access token
			if (req.refreshBasket) {
				const { token, xsrf } = await basket.generateCartToken()
				tokens = { token, xsrf }
			}
			res.status(200).send({
				message: 'Added item to basket',
				count: basket.count,
				...tokens
			})
		} else {
			// create new
			basket = await Basket.createNewBasket(req.body)
			await basket.save()

			const { token, xsrf } = await basket.generateCartToken()
			res.status(201).send({
				message: 'New shopping basket created',
				token,
				xsrf,
				count: basket.count
			})
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.patchGuestBasket = async (req, res) => {
	// Edit basket
	if (req.basket) {
		try {
			const { product, quantity, options } = req.body
			const basket = req.basket
			const productObj = await Product.findOne({
				_id: product,
				isActive: true
			})

			if (basket && basket.products && product) {
				let result,
					tokens = {}
				for (let i in basket.products) {
					// if found
					if (
						basket.products[i].product == product &&
						comparator.isEqArr(basket.products[i].options, options)
					) {
						// Remove this element
						if (quantity == 0) {
							basket.products.pull(basket.products[i])
						} else {
							// Update quantity
							if (quantity < productObj.minOrderQuantity) {
								throw new Error(
									'Minimum order quantity not met'
								)
							} else {
								basket.products[i].quantity = quantity
							}
						}

						basket.modified = new Date()
						result = await basket.save()
						break
					}
				}

				// If near expiry, refresh access token
				if (req.refreshBasket) {
					const { token, xsrf } = await basket.generateCartToken()
					tokens = { token, xsrf }
				}

				res.status(200).send({
					message: result
						? 'Successfully updated'
						: 'Nothing updated',
					count: basket.count,
					...tokens
				})
			} else {
				return res.status(404).send({
					error: 'Cart or Product ID is invalid'
				})
			}
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(404).send({
			error: 'Could not retrieve or invalid resource.'
		})
	}
}

exports.patchBasket = async (req, res) => {
	// Edit customer basket
	if (req.customer) {
		try {
			const { product, quantity, options } = req.body
			const basket = await Basket.findOne({
				customer: req.customer._id
			})

			const productObj = await Product.findOne({
				_id: product,
				isActive: true
			})

			if (basket && basket.products && product) {
				let result
				for (let i in basket.products) {
					// if found
					if (
						basket.products[i].product == product &&
						comparator.isEqArr(basket.products[i].options, options)
					) {
						// Remove this element
						if (quantity == 0) {
							basket.products.pull(basket.products[i])
						} else {
							// Update quantity
							if (quantity < productObj.minOrderQuantity) {
								throw new Error(
									'Minimum order quantity not met'
								)
							} else {
								basket.products[i].quantity = quantity
							}
						}

						basket.modified = new Date()
						result = await basket.save()
						break
					}
				}
				res.status(200).send({
					message: result
						? 'Successfully updated'
						: 'Nothing updated',

					count: basket.count
				})
			} else {
				return res.status(404).send({
					error: 'Cart or Product ID is invalid'
				})
			}
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(404).send({
			error: 'Could not retrieve or invalid resource.'
		})
	}
}

// Customer Order
exports.getETA = async (req, res) => {
	if (req.basket) {
		try {
			const delType = req.body.type == 'delivery' ? 2 : 1
			const tdate = req.body.target

			const [basket, orders] = await Promise.all([
				Basket.getBasketDetails({
					_id: req.basket._id
				}),
				Order.getNumOrdersByRange(
					moment(tdate).subtract(2, 'days').startOf('day').toDate(),
					moment(tdate).endOf('day').toDate()
				)
			])
			const orderDff = basket.products.reduce(reducer, {})
			const workload = orders.reduce(wlReducer, 0) || 1
			// get ETA
			const eta = ETA_Fn(
				orderDff['1'] || 0,
				orderDff['2'] || 0,
				orderDff['3'] || 0,
				delType,
				workload
			)
			const stdER = STDER_Fn(eta)

			res.status(200).send({ message: 'Computed ETA.', eta, stdER })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({
			error: 'Unauthorized action or missing required info.'
		})
	}
}
