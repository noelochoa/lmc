const Basket = require('../models/Basket')
const Product = require('../models/Product')
const comparator = require('../helpers/comparehelper')

exports.combineCustomerBasket = async (req, res) => {
	// Merge existing customer with supplied basket ID
	try {
		if (req.customer && req.basket) {
			let basket = await Basket.findOne({
				customer: req.customer._id
			})

			if (!basket) {
				// No customer basket,
				basket = await Basket.findOne({ _id: req.basket._id })
				if (basket) {
					basket.customer = req.customer._id
					await basket.save()

					return res.status(200).send({ basket })
				} else {
					res.status(400).send({
						error: 'Both customer and supplied Basket ID missing'
					})
				}
			} else {
				// Merge customer and supplied baskets
				basket = await basket.combineBasket(req.basket._id)
				if (basket) {
					basket.customer = req.customer._id
					await basket.save()
					return res.status(200).send({ basket })
				} else {
					res.status(400).send({
						error: 'Both customer and supplied Basket ID missing'
					})
				}
			}
		} else {
			res.status(400).send({ error: 'No Baskets to merge' })
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getBasket = async (req, res) => {
	// Get basket
	try {
		if (req.customer && !req.basket) {
			const basket = await Basket.getBasketDetails({
				customer: req.customer._id
			})

			if (basket) {
				return res.status(200).send({ basket })
			}
		} else if (req.basket) {
			const basket = await Basket.getBasketDetails({
				_id: req.basket._id
			})
			if (!basket) {
				return res.status(404).send({ error: 'Basket not found.' })
			}
			return res.status(200).send({ basket })
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
			if (req.customer.status.isResellerApproved) {
				req.body.isReseller = true
			}

			// If logged in, check if user has current past cart items
			basket = await Basket.findOne({
				customer: req.customer._id
			})
			if (basket) {
				// If customer basket exists push new item
				basket = await basket.addItem(req.body)

				// Combine if supplied basket ID is different
				if (
					req.basket &&
					basket._id.toString() != req.basket._id.toString()
				) {
					basket = await basket.combineBasket(req.basket._id)
				}
			} else if (req.basket) {
				// If not existing basket but has supplied a basket ID
				basket = await Basket.findUpdateBasket(req.basket._id, req.body)
			} else {
				// If not existing basket but has supplied a basket ID
				basket = await Basket.createNewBasket(req.body)
				basket.customer = req.customer._id
				await basket.save()

				const token = await basket.generateAccessToken()
				return res.status(200).send({ basket, token })
			}
			basket.customer = req.customer._id
		} else if (req.basket) {
			// If not logged in, but has supplied a basket ID
			basket = await Basket.findUpdateBasket(req.basket._id, req.body)
		} else {
			// create new
			basket = await Basket.createNewBasket(req.body)
			await basket.save()

			const token = await basket.generateAccessToken()
			return res.status(200).send({ basket, token })
		}

		if (basket) {
			await basket.save()
			res.status(200).send({ basket })
		} else {
			res.status(500).send({ error: 'Cannot add item to basket.' })
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.patchBasket = async (req, res) => {
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
						comparator.isEqual(basket.products[i].options, options)
					) {
						// Remove this element
						if (quantity == 0) {
							basket.products = basket.products.filter(item => {
								return item != basket.products[i]
							})
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
					message: result ? 'Successfully updated' : 'Nothing updated'
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
