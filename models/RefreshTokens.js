const mongoose = require('mongoose')
const User = require('./User')
// const moment = require('moment')
// const validator = require('validator')

const refreshTokenSchema = mongoose.Schema({
	user: {
		type: mongoose.Types.ObjectId,
		ref: 'User',
		required: true
	},
	token: {
		type: String,
		required: true
	},
	created: {
		type: Date,
		expires: '60m',
		default: new Date()
	},
	expiresAt: {
		type: Date,
		required: true
	},
	revokedAt: {
		type: Date,
		default: null
	}
})

refreshTokenSchema.virtual('isExpired').get(function () {
	return Date.now() >= this.expiresAt
})

refreshTokenSchema.virtual('isActive').get(function () {
	return !this.revokedAt && !this.isExpired
})

const RefreshToken = mongoose.model(
	'RefreshToken',
	refreshTokenSchema,
	'RefreshTokens'
)

module.exports = RefreshToken
