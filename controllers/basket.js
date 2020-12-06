const mongoose = require('mongoose')
const crypto = require('crypto')
const Basket = require('../models/Basket')
const Product = require('../models/Product')
const comparator = require('../helpers/comparehelper')

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
				return res.status(404).send({ error: 'No items in cart.' })
			}
			return res.status(200).send({ basket })
		} else if (req.basket) {
			const basket = await Basket.getBasketDetails({
				_id: req.basket._id
			})
			if (!basket || basket.length == 0) {
				return res.status(404).send({ error: 'No items in cart.' })
			}
			return res.status(200).send({ basket })
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

				const csrfToken = crypto.randomBytes(48).toString('base64')
				const token = await basket.generateAccessToken(csrfToken)

				res.status(200).send({
					message: 'New Basket created',
					token,
					xsrf: csrfToken,
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
			// If not logged in, but has supplied a basket ID
			basket = await Basket.findUpdateBasket(req.basket._id, req.body)
			await basket.save()
			res.status(200).send({
				message: 'Added item to basket',
				count: basket.count
			})
		} else {
			// create new
			basket = await Basket.createNewBasket(req.body)
			await basket.save()

			const csrfToken = crypto.randomBytes(48).toString('base64')
			const token = await basket.generateAccessToken(csrfToken)
			res.status(201).send({
				message: 'New Basket created',
				token,
				xsrf: csrfToken,
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
			const basket = await Basket.findOne({
				_id: req.basket._id
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
					error: 'Basket or Product ID is invalid'
				})
			}
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(404).send({ error: 'BasketID is invalid' })
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
					error: 'Basket or Product ID is invalid'
				})
			}
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'BasketID is invalid' })
	}
}
