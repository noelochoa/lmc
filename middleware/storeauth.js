const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const AccessTokenWeb = require('../models/AccessTokenWeb')

const storeauth = async (req, res, next) => {
	if (req.header('Authorization')) {
		const token = req.header('Authorization').replace('Bearer ', '')
		const csrfToken = req.header('X-CSRF-TOKEN')
			? req.header('X-CSRF-TOKEN')
			: null
		await jwt.verify(
			token,
			process.env.JWT_STORE_KEY,
			async (err, decoded) => {
				if (decoded) {
					try {
						if (req.method != 'GET') {
							if (!csrfToken) {
								return res.status(400).send({
									error: 'Malformed request headers.'
								})
							}
							const isMatch = await bcrypt.compare(
								csrfToken,
								decoded._xref
							)
							if (!isMatch) throw new Error('Invalid CSRF Token.')
						}
						const accToken = await AccessTokenWeb.findOne({
							user: decoded._id,
							token: token
						}).populate('user')

						if (!accToken || !accToken.isActive) {
							throw new Error('Invalid Access Token.')
						}
						if (!accToken.user.status.isActive) {
							throw new Error('Unauthorized account.')
						}

						// save to req
						req.customer = accToken.user
						req.token = accToken
						next()
					} catch (error) {
						res.status(401).send({
							error:
								'Not authorized to access this resource. ' +
								error.message
						})
					}
				} else {
					res.status(401).send({ error: err })
				}
			}
		)
	} else {
		res.status(401).send({
			error: 'Not authorized to access this resource'
		})
	}
}

module.exports = storeauth
