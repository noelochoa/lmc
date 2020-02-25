const jwt = require('jsonwebtoken')
const Customer = require('../models/Customer')

const storeauth = async (req, res, next) => {
	if (req.header('Authorization')) {
		const token = req.header('Authorization').replace('Bearer ', '')
		jwt.verify(token, process.env.JWT_STORE_KEY, async (err, decoded) => {
			if (decoded) {
				try {
					const customer = await Customer.findOne({
						_id: decoded._id,
						'tokens.token': token
					})
					if (!customer) {
						throw new Error('No entry found.')
					}
					// save to req
					req.customer = customer
					req.token = token
					next()
				} catch (error) {
					res.status(401).send({
						error: 'Not authorized to access this resource'
					})
				}
			} else {
				if (err.name == 'TokenExpiredError') {
					Customer.removeToken(token)
				}
				res.status(401).send({ error: err })
			}
		})
	} else {
		res.status(401).send({
			error: 'Not authorized to access this resource'
		})
	}
}

module.exports = storeauth
