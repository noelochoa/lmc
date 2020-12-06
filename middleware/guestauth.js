const jwt = require('jsonwebtoken')
const Customer = require('../models/Customer')
const Basket = require('../models/Basket')

const guestauth = async (req, res, next) => {
	if (req.header('X-CART')) {
		const basketToken = req.header('X-CART')
		const csrfToken = req.header('X-CSRF-CART')
			? req.header('X-CSRF-CART')
			: null
		await jwt.verify(
			basketToken,
			process.env.JWT_STORE_KEY,
			async (err, decoded) => {
				if (decoded) {
					try {
						const basket = await Basket.findOne({
							_id: decoded._basket_id
						})
						if (!basket) {
							// Create new
							return next()
						}
						if (
							req.method != 'GET' &&
							decoded._csrf_token !== csrfToken
						) {
							// Create new
							return next()
							// throw new Error('Invalid Basket CSRF token')
						}
						//save to req
						req.basket = basket
						next()
					} catch (error) {
						return res.status(401).send({
							error:
								'Not authorized to access this resource. ' +
								error.message
						})
					}
				} else {
					// return res.status(401).send({
					// 	error: 'Not authorized to access this resource'
					// })
					return next()
				}
			}
		)
	} else {
		// Ignored
		next()
	}

	/*
	if (req.header('Authorization')) {
		const token = req.header('Authorization').replace('Bearer ', '')
		await jwt.verify(
			token,
			process.env.JWT_STORE_KEY,
			async (err, decoded) => {
				if (decoded) {
					try {
						const customer = await Customer.findOne({
							_id: decoded._id,
							'tokens.token': token
						})
						if (customer) {
							// save to req
							req.customer = customer
							req.token = token
						}
					} catch (error) {}
				} else {
					if (err.name == 'TokenExpiredError') {
						Customer.removeToken(token)
					}
				}
				next()
			}
		)
	} else {
		next()
	}
	*/
}

module.exports = guestauth
