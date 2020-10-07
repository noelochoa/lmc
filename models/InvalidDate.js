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

invalidDateSchema.pre('save', async function (next) {
	// Run validator manually on save
	checkStartEndDate(this.start, this.end)
	next()
})

invalidDateSchema.pre('updateOne', async function (next) {
	// Run validator manually on updateOne
	const updateData = this.getUpdate().$set
	checkStartEndDate(updateData.start, updateData.end)
	next()
})

invalidDateSchema.statics.getDates = async function () {
	const dates = await InvalidDate.find()
	if (!dates) {
		throw new Error('Nothing found')
	}
	return dates
}

invalidDateSchema.statics.getInvalidDates = async function (year, month) {
	// get whole month list of business holidays
	const base = moment().startOf('day')
	let qyear = base.year(),
		qmonth = base.month()

	if (!isNaN(year) && year.length === 4) {
		qyear = year
	}
	if (!isNaN(month) && month > 0 && month <= 12) {
		qmonth = month - 1
	}
	const qdate = moment({ year: qyear, month: qmonth })
	const dates = await InvalidDate.find({
		$and: [
			{
				end: { $not: { $lt: qdate.startOf('month').toDate() } }
			},
			{
				start: { $not: { $gt: qdate.endOf('month').toDate() } }
			}
		]
	}).sort({ start: 1 })

	return dates
}

const InvalidDate = mongoose.model(
	'InvalidDate',
	invalidDateSchema,
	'InvalidDates'
)

module.exports = InvalidDate
