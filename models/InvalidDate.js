const mongoose = require('mongoose')
const moment = require('moment')
// const validator = require('validator')

const checkStartEndDate = (start, end) => {
	// Check supplied dates
	const startD = Date.parse(start)
	const endD = Date.parse(end)
	if (isNaN(startD) || isNaN(endD)) {
		throw new Error('Invalid date format')
	}

	if (startD >= endD) {
		throw new Error('Supplied End date is invalid')
	}

	return true
}

const invalidDateSchema = mongoose.Schema({
	start: {
		type: Date,
		required: true
	},
	end: {
		type: Date,
		required: true
	},
	reason: {
		type: String,
		required: true,
		default: 'Business Holiday'
	}
})

invalidDateSchema.pre('save', async function(next) {
	// Run validator manually on save
	checkStartEndDate(this.start, this.end)
	next()
})

invalidDateSchema.pre('updateOne', async function(next) {
	// Run validator manually on updateOne
	const updateData = this.getUpdate().$set
	checkStartEndDate(updateData.start, updateData.end)
	next()
})

invalidDateSchema.statics.getDates = async function() {
	const dates = await InvalidDate.find()
	if (!dates) {
		throw new Error('Nothing found')
	}
	return dates
}

invalidDateSchema.statics.getInvalidDates = async function() {
	const today = moment().startOf('day')
	const dates = await InvalidDate.find({
		start: { $gte: today.toDate() }
	})
	if (!dates) {
		throw new Error('Nothing found')
	}
	return dates
}

const InvalidDate = mongoose.model(
	'InvalidDate',
	invalidDateSchema,
	'InvalidDates'
)

module.exports = InvalidDate
