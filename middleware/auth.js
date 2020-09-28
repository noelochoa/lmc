const jwt = require('jsonwebtoken')
const AccessToken = require('../models/AccessToken')

const auth = async (req, res, next) => {
	if (req.header('Authorization')) {
		const token = req.header('Authorization').replace('Bearer ', '')
		try {
			const data = jwt.verify(token, process.env.JWT_KEY)
			const accToken = await AccessToken.findOne({
				user: data._id,
				token: token
			}).populate('user')
			if (!accToken || !accToken.isActive) {
				throw new Error()
			}
			// save to req
			req.user = accToken.user
			req.token = accToken
			next()
		} catch (error) {
			res.status(401).send({
				error:
					'Not authorized to access this resource. ' + error.message
			})
		}
	} else {
		res.status(401).send({
			error: 'Not authorized to access this resource'
		})
	}
}

module.exports = auth
