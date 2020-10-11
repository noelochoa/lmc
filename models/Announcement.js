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

const announcementSchema = mongoose.Schema(
	{
		start: {
			type: Date,
			required: true,
			default: Date.now
		},
		end: {
			type: Date,
			required: true
		},
		message: {
			type: String,
			required: true,
			trim: true
		},
		targetLink: {
			type: String
		}
	},
	{
		toJSON: {
			virtuals: true
		}
	}
)

announcementSchema.pre('save', async function (next) {
	// Run validator manually on save
	checkStartEndDate(this.start, this.end)
	next()
})

announcementSchema.pre('updateOne', async function (next) {
	// Run validator manually on updateOne
	const updateData = this.getUpdate().$set
	checkStartEndDate(updateData.start, updateData.end)
	next()
})

announcementSchema.statics.getAll = async function () {
	// retrieve all PSAs
	const announcements = await Announcement.find().sort({ start: -1 })
	return announcements
}

announcementSchema.statics.getAnnouncement = async function (psaID) {
	let psa = {}
	if (psaID) {
		// retrieve psa details
		psa = await Announcement.findOne({ _id: psaID })
	} else {
		// get current PSA
		const now = moment()
		psa = await Announcement.findOne({
			start: { $lte: now.toDate() },
			end: { $gt: now.toDate() }
		}).sort({ _id: -1 })
	}

	return psa
}

const Announcement = mongoose.model(
	'Announcement',
	announcementSchema,
	'Announcements'
)

module.exports = Announcement
