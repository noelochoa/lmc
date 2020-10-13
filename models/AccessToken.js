const mongoose = require('mongoose')
const User = require('./User')
// const moment = require('moment')
// const validator = require('validator')

const accessTokenSchema = mongoose.Schema({
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
		required: true,
		default: Date.now
	},
	expiresAt: {
		type: Date,
		required: true,
		default: () => Date.now() + 3600 * 24 * 7 * 1000,
		expires: 0
	},
	revoked: {
		type: Boolean,
		default: false
	},
	refreshed: {
		type: Boolean,
		default: false
	},
	modified: {
		type: Date
	}
})

accessTokenSchema.virtual('isExpired').get(function () {
	return this.expiresAt < Date.now()
})

accessTokenSchema.virtual('isActive').get(function () {
	return !this.revoked && !this.isExpired
})

accessTokenSchema.virtual('isRefreshable').get(function () {
	return !this.refreshed && !this.isExpired
})

const AccessToken = mongoose.model(
	'AccessToken',
	accessTokenSchema,
	'AccessTokens'
)

module.exports = AccessToken
