const mongoose = require('mongoose')
// const moment = require('moment')
// const validator = require('validator')

const tokenSchema = mongoose.Schema({
	customer: {
		type: mongoose.Types.ObjectId,
		ref: 'Customer',
		required: true
	},
	verify: {
		type: String,
		required: true,
		default: 'email'
	},
	token: {
		type: String,
		required: true
	},
	created: {
		type: Date,
		expires: '30m',
		default: Date.now
	}
})

const Token = mongoose.model('Token', tokenSchema, 'Tokens')

module.exports = Token
