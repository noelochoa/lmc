const mongoose = require('mongoose')
const OrderStatus = require('../models/OrderStatus')
const Product = require('../models/Product')
const Category = require('../models/Category')
const Discount = require('../models/Discount')
// const validator = require('validator')

const optionsSchema = mongoose.Schema(
	{
		type: String,
		value: String
	},
	{ _id: false }
)
const orderItemSchema = mongoose.Schema(
	{
		product: {
			type: mongoose.Types.ObjectId,
			ref: 'Product',
			required: true
		},
		quantity: {
			type: Number,
			required: true,
			min: 1,
			default: 1,
			validate: value => {
				if (!Number.isInteger(value)) {
					throw new Error('{VALUE} is not integer')
				}
			}
		},
		price: {
			type: Number,
			required: true
		},
		options: [optionsSchema]
	},
	{ _id: false }
)

const orderSchema = mongoose.Schema({
	customer: {
		type: mongoose.Types.ObjectId,
		unique: true,
		sparse: true
	},
	status: {
		type: mongoose.Types.ObjectId,
		ref: 'OrderStatus',
		required: true
	},
	deliveryType: {
		type: String,
		required: true,
		enum: ['pickup', 'delivery'],
		default: 'pickup'
	},
	shippingAddress: {
		type: String,
		trim: true,
		max: 512
	},
	created: {
		type: Date,
		required: true,
		default: new Date()
	},
	modified: {
		type: Date,
		required: true,
		default: new Date()
	},
	products: [orderItemSchema]
})

orderSchema.pre('save', async function(next) {
	const order = this
	next()
})

orderSchema.statics.getOrderDetails = async function(searchParam) {
	// Get product details of order
	const order = await Order.aggregate([
		{
			$match: searchParam
		},
		{ $unwind: '$products' },
		{
			$lookup: {
				from: Product.collection.name,
				let: { productID: '$products.product' },
				pipeline: [
					{
						$match: {
							$expr: { $eq: ['$_id', '$$productID'] }
						}
					},
					{
						$lookup: {
							from: Category.collection.name,
							localField: 'category',
							foreignField: '_id',
							as: 'category'
						}
					},
					{ $unwind: '$category' },
					{
						$lookup: {
							from: Discount.collection.name,
							let: { id: '$_id' },
							pipeline: [
								{
									$match: {
										$expr: { $in: ['$$id', '$products'] },
										start: { $lte: new Date() },
										end: { $gte: new Date() }
									}
								},
								{
									$project: {
										_id: 1,
										percent: 1,
										target: 1
									}
								}
							],
							as: 'discount'
						}
					},
					{
						$project: {
							_id: 1,
							isActive: 1,
							name: 1,
							seoname: 1,
							category: 1,
							basePrice: 1,
							images: 1,
							discount: 1
						}
					}
				],
				as: 'products.product'
			}
		},
		{
			$group: {
				_id: '$_id',
				created: { $first: '$created' },
				modified: { $first: '$modified' },
				customer: { $first: '$customer' },
				products: { $push: '$products' }
			}
		}
	]).option({ hint: { 'products.product': 1 } })

	return order
}

orderSchema.statics.placeOrder = async reqBody => {
	const order = this
	order.status = null /* should be PLACED */

	return order
}

const Order = mongoose.model('Order', orderSchema, 'Orders')

module.exports = Order
