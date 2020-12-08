const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
// const Customer = require('../models/Customer')
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
						if (req.method != 'GET') {
							if (!csrfToken) return next()
							const isMatch = await bcrypt.compare(
								csrfToken,
								decoded._xref
							)
							if (!isMatch) return next()
						}

						const basket = await Basket.findOne({
							_id: decoded._id
						})
						if (!basket) {
							// Create new
							return next()
						}
						//Check if near expiry (1 day left)
						if (
							decoded.exp - new Date().getTime() / 1000 <=
							1 * 24 * 60 * 60
						) {
							req.refreshBasket = true
						}
						//save to req
						req.basket = basket
						next()
					} catch (error) {
						return res.status(400).send({
							error: 'Request error. ' + error.message
						})
					}
				} else {
					// Ignored
					if (err.name == 'TokenExpiredError') return next()
					else {
						return res
							.status(404)
							.send({ error: 'Unknown or invalid resource.' })
					}
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
