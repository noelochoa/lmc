const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const AccessTokenWeb = require('../models/AccessTokenWeb')

const refreshauth = async (req, res, next) => {
	if (req.header('Authorization')) {
		const token = req.header('Authorization').replace('Bearer ', '')
		const csrfToken = req.header('X-CSRF-TOKEN')
			? req.header('X-CSRF-TOKEN')
			: null
		try {
			const data = jwt.verify(token, process.env.JWT_STORE_KEY, {
				ignoreExpiration: true
			})
			if (req.method != 'GET') {
				if (!csrfToken) {
					return res.status(400).send({
						error: 'Malformed request headers. No token found.'
					})
				}

				const [isMatch, isPrevMatch] = await Promise.all([
					await bcrypt.compare(csrfToken, data._xref),
					await bcrypt.compare(csrfToken, data._prev)
				])

				if (!isMatch && !isPrevMatch)
					throw new Error('Invalid CSRF Token.')
			}
			const accToken = await AccessTokenWeb.findOne({
				user: data._id,
				token: token
			}).populate('user')
			if (!accToken || !accToken.isActive) {
				throw new Error('Inactive Access Token.')
			}
			if (!accToken.user.status.isActive) {
				throw new Error('Unauthorized account.')
			}

			// save to req
			req.customer = accToken.user
			req.token = accToken
			req.prevXSRF = data._xref
			next()
		} catch (error) {
			return res.status(401).send({
				error: error.message
			})
		}
	} else {
		return res.status(401).send({
			error: 'Not authorized to access this resource.'
		})
	}
}

module.exports = refreshauth
