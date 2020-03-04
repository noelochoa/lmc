const jwt = require('jsonwebtoken')
const User = require('../models/User')

const auth = async (req, res, next) => {
	if (req.header('Authorization')) {
		const token = req.header('Authorization').replace('Bearer ', '')
		try {
			const data = jwt.verify(token, process.env.JWT_KEY)
			const user = await User.findOne({
				_id: data._id,
				'tokens.token': token
			})
			if (!user) {
				throw new Error()
			}
			// save to req
			req.user = user
			req.token = token
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
