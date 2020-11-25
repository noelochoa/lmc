const mongoose = require('mongoose')
const Customer = require('./Customer')
// const moment = require('moment')
// const validator = require('validator')

const accTokenWebSchema = mongoose.Schema({
	user: {
		type: mongoose.Types.ObjectId,
		ref: 'Customer',
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

accTokenWebSchema.virtual('isExpired').get(function () {
	return this.expiresAt < Date.now()
})

accTokenWebSchema.virtual('isActive').get(function () {
	return !this.revoked && !this.isExpired
})

accTokenWebSchema.virtual('isRefreshable').get(function () {
	return !this.refreshed && !this.isExpired
})

const AccessTokenWeb = mongoose.model(
	'AccessTokenWeb',
	accTokenWebSchema,
	'AccessTokenWeb'
)

module.exports = AccessTokenWeb
