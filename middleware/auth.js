const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const AccessToken = require('../models/AccessToken')

const auth = async (req, res, next) => {
	if (req.header('Authorization')) {
		const token = req.header('Authorization').replace('Bearer ', '')
		const csrfToken = req.header('X-CSRF-TOKEN')
			? req.header('X-CSRF-TOKEN')
			: null
		try {
			const data = jwt.verify(token, process.env.JWT_KEY)
			if (req.method != 'GET') {
				if (!csrfToken) throw new Error('Invalid Request.')
				const isMatch = await bcrypt.compare(csrfToken, data._xref)
				if (!isMatch) throw new Error('Invalid CSRF token.')
			}
			const accToken = await AccessToken.findOne({
				user: data._id,
				token: token
			}).populate('user')
			if (!accToken || !accToken.isActive || !accToken.user.isActive) {
				throw new Error('Invalid Token or Unauthorized account used.')
			}
			// save to req
			req.user = accToken.user
			req.token = accToken
			next()
		} catch (error) {
			res.status(401).send({
				error: error.message
			})
		}
	} else {
		res.status(401).send({
			error: 'Not authorized to access this resource'
		})
	}
}

module.exports = auth
