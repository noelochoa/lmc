const mongoose = require('mongoose')
const moment = require('moment')
// const validator = require('validator')

const statusSchema = mongoose.Schema({
	status: {
		type: String,
		unique: true,
		lowercase: true,
		required: true
	},
	step: {
		type: Number,
		required: true
	}
})

statusSchema.statics.getOrdersStats = async function ({
	year = '',
	month = ''
}) {
	let ret = {}
	// Get Order statistics for this month or defined month
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

	const stats = await OrderStatus.aggregate([
		{
			$lookup: {
				from: 'Orders',
				let: { id: '$_id' },
				pipeline: [
					{
						$match: {
							$expr: { $eq: ['$$id', '$status'] },
							target: {
								$gte: qdate.startOf('month').toDate(),
								$lte: qdate.endOf('month').toDate()
							}
						}
					}
				],
				as: 'orders'
			}
		},
		{
			$addFields: {
				array: [
					{
						k: { $toLower: '$status' },
						v: { $size: '$orders' }
					}
				]
			}
		},
		{
			$replaceRoot: {
				newRoot: { $arrayToObject: '$array' }
			}
		}
	])

	if (stats) {
		// Map each status object as key value pair
		stats.forEach((item) => {
			ret = Object.assign({}, ret, item)
		})
	}

	return ret
}

const OrderStatus = mongoose.model('OrderStatus', statusSchema, 'OrderStatus')

module.exports = OrderStatus
