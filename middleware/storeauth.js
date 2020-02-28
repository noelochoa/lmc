const jwt = require('jsonwebtoken')
const Customer = require('../models/Customer')

const storeauth = async (req, res, next) => {
	if (req.header('Authorization') && req.header('X-CSRF-TOKEN')) {
		const token = req.header('Authorization').replace('Bearer ', '')
		const csrfToken = req.header('X-CSRF-TOKEN')
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
					if (decoded._csrf_token !== csrfToken) {
						throw new Error('Invalid CSRF token')
					}
					// save to req
					req.customer = customer
					req.token = token
					next()
				} catch (error) {
					console.log(error)
					res.status(401).send({
						error:
							'Not authorized to access this resource. ' +
							error.message
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
