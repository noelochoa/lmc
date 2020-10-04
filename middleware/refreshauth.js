const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const AccessToken = require('../models/AccessToken')

const refreshauth = async (req, res, next) => {
	if (req.header('Authorization')) {
		const token = req.header('Authorization').replace('Bearer ', '')
		const csrfToken = req.header('X-CSRF-TOKEN')
			? req.header('X-CSRF-TOKEN')
			: null
		try {
			const data = jwt.verify(token, process.env.JWT_KEY, {
				ignoreExpiration: true
			})
			if (req.method != 'GET') {
				if (!csrfToken) {
					return res.status(400).send({
						error: 'Malformed request headers.'
					})
				}
				const isMatch = await bcrypt.compare(csrfToken, data._xref)
				if (!isMatch) throw new Error('Invalid CSRF Token.')
			}
			const accToken = await AccessToken.findOne({
				user: data._id,
				token: token
			}).populate('user')
			if (!accToken || !accToken.isActive) {
				throw new Error('Inactive Access Token.')
			}
			if (!accToken.user.isActive) {
				throw new Error('Unauthorized account.')
			}
			// save to req
			req.user = accToken.user
			req.token = accToken
			next()
		} catch (error) {
			console.log('REF', error)
			return res.status(401).send({
				error: error.message
			})
		}
	} else {
		return res.status(401).send({
			error: 'Not authorized to access this resource'
		})
	}
}

module.exports = refreshauth
