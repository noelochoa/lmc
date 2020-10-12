const mongoose = require('mongoose')
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

statusSchema.statics.getOrdersStats = async function () {
	// Get Order statistics for this month
	let ret = {}
	const d = new Date()
	const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1)
	const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0)

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
								$gte: firstDayOfMonth,
								$lte: lastDayOfMonth
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
