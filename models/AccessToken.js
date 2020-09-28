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
		default: () => Date.now() + 300 * 1000,
		expires: '15m'
	},
	revoked: {
		type: Boolean,
		default: false
	}
})

accessTokenSchema.virtual('isUserInactive', {
	ref: 'User',
	localField: 'user',
	foreignField: '_id',
	justOne: true
})

accessTokenSchema.virtual('isActive').get(function () {
	return !this.revoked && !this.isUserInactive
})

const AccessToken = mongoose.model(
	'AccessToken',
	accessTokenSchema,
	'AccessTokens'
)

module.exports = AccessToken
