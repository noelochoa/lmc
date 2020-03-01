const jwt = require('jsonwebtoken')
const Customer = require('../models/Customer')
const Basket = require('../models/Basket')

const customerauth = async (req, res, next) => {
	if (req.header('Basket')) {
		const basketToken = req.header('Basket')
		await jwt.verify(
			basketToken,
			process.env.JWT_STORE_KEY,
			async (err, decoded) => {
				if (decoded) {
					try {
						const basket = await Basket.findOne({
							_id: decoded._basket_id
						})
						if (basket) {
							// save to req
							req.basket = basket
						}
					} catch (error) {}
				}
			}
		)
	}

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
}

module.exports = customerauth
