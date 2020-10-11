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

const discountSchema = mongoose.Schema({
	start: {
		type: Date,
		required: true
	},
	end: {
		type: Date,
		required: true
	},
	target: {
		type: String,
		enum: ['all', 'regular', 'reseller', 'partner'],
		default: 'all',
		required: true
	},
	products: [
		{
			type: mongoose.Types.ObjectId,
			ref: 'Product'
		}
	],
	percent: {
		type: Number,
		required: true,
		min: 0,
		max: 99,
		default: 0
	}
})

discountSchema.pre('save', async function (next) {
	// Run validator manually on save
	checkStartEndDate(this.start, this.end)
	next()
})

discountSchema.pre('updateOne', async function (next) {
	// Run validator manually on updateOne
	const updateData = this.getUpdate().$set
	checkStartEndDate(updateData.start, updateData.end)
	next()
})

discountSchema.statics.getDiscounts = async function () {
	const dates = await Discount.find()
		.populate('products', '_id name seoname pricing')
		.sort({ start: -1 })
	if (!dates) {
		throw new Error('Nothing found')
	}
	return dates
}

discountSchema.statics.getAllDiscounts = async function () {
	const categories = await Discount.aggregate([
		{
			$lookup: {
				from: 'Products',
				localField: 'products',
				foreignField: '_id',
				as: 'products'
			}
		},
		{
			$project: {
				id: '$_id',
				percent: 1,
				start: 1,
				end: 1,
				target: 1,
				count: { $size: '$products' },
				products: {
					$map: {
						input: '$products',
						as: 'prod',
						in: {
							id: '$$prod._id',
							name: '$$prod.name',
							seo: '$$prod.seoname',
							basePrice: '$$prod.basePrice'
						}
					}
				}
			}
		}
	])

	return categories
}

const Discount = mongoose.model('Discount', discountSchema, 'Discounts')

module.exports = Discount
