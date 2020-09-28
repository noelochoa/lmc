const mongoose = require('mongoose')
const Customer = require('./Customer')
// const moment = require('moment')
// const validator = require('validator')

const resetTokenSchema = mongoose.Schema({
	email: {
		type: 'String',
		required: true,
		unique: true,
		lowercase: true,
		validate: {
			validator: (val) => {
				return Customer.exists({ email: val, 'status.isActive': true })
			},
			message: '{VALUE} is invalid or does not exist'
		}
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

const ResetToken = mongoose.model('ResetToken', resetTokenSchema, 'ResetTokens')

module.exports = ResetToken
