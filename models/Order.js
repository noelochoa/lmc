const mongoose = require('mongoose')
const moment = require('moment')
const OrderStatus = require('../models/OrderStatus')
const Product = require('../models/Product')
const Category = require('../models/Category')
const Discount = require('../models/Discount')
const Customer = require('../models/Customer')
// const TrustedComms = require('twilio/lib/rest/preview/TrustedComms')
// const validator = require('validator')

const optionsSchema = mongoose.Schema(
	{
		_option: {
			type: String,
			required: true
		},
		_selected: {
			type: String,
			required: true
		},
		otherValue: String
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
			validate: (value) => {
				if (!Number.isInteger(value)) {
					throw new Error('{VALUE} is not integer')
				}
			}
		},
		discount: {
			type: Number,
			required: true,
			min: 0,
			max: 99,
			default: 0
		},
		price: {
			type: Number,
			required: true
		},
		finalPrice: {
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
		ref: 'Customer',
		required: true
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
		default: Date.now
	},
	target: {
		type: Date,
		required: true
	},
	total: {
		type: Number,
		required: true
	},
	modified: {
		type: Date,
		required: true,
		default: Date.now
	},
	products: [orderItemSchema]
})

orderSchema.pre('save', async function (next) {
	const order = this
	// Ignore address if 'Pickup'
	if (order.deliveryType == 'pickup') {
		order.shippingAddress = null
	} else if (!order.shippingAddress) {
		throw new Error('Missing address')
	}

	const newArray = new Map()
	if (order.products) {
		// Group duplicates and resolve quantity
		order.products.forEach((item) => {
			let suffix = ''
			if (item.options && item.options.length > 0) {
				const selectedArr = item.options.map((selected) => {
					return (
						selected._option +
						selected._selected +
						(selected.otherValue ? selected.otherValue : '')
					)
				})

				suffix = JSON.stringify(selectedArr.sort())
			}
			//JSON.stringify(item.options)
			const propertyValue = (item.product + suffix).replace('{}', '')

			if (newArray.has(propertyValue) && item.quantity > 0) {
				const existing = newArray.get(propertyValue)
				item.quantity += existing.quantity

				newArray.set(propertyValue, item)
			} else {
				newArray.set(propertyValue, item)
			}
		})
	}
	order.products = Array.from(newArray.values())
	next()
})

/*
orderSchema.statics.getOrderStats = async function () {
	const today = new Date()
	const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
	const lastDayOfMonth = new Date(
		today.getFullYear(),
		today.getMonth() + 1,
		0
	)
	const stats = await Order.aggregate([
		{
			$match: { target: { $gte: firstDayOfMonth, $lte: lastDayOfMonth } }
		},
		{
			$lookup: {
				from: OrderStatus.collection.name,
				localField: 'status',
				foreignField: '_id',
				as: 'status'
			}
		},
		{ $unwind: '$status' },
		// { $group: { _id: '$status.status', count: { $sum: 1 } } },
		{
			$facet: {
				Placed: [
					{ $match: { 'status.status': 'Placed' } },
					{ $count: 'Placed' }
				],
				Accepted: [
					{ $match: { 'status.status': 'Accepted' } },
					{ $count: 'Accepted' }
				],
				Processed: [
					{ $match: { 'status.status': 'Processed' } },
					{ $count: 'Processed' }
				],
				Fulfilled: [
					{ $match: { 'status.status': 'Fulfilled' } },
					{ $count: 'Fulfilled' }
				]
			}
		},
		{
			$project: {
				placed: {
					$ifNull: [{ $arrayElemAt: ['$Placed.Placed', 0] }, 0]
				},
				accepted: {
					$ifNull: [{ $arrayElemAt: ['$Accepted.Accepted', 0] }, 0]
				},
				processed: {
					$ifNull: [{ $arrayElemAt: ['$Processed.Processed', 0] }, 0]
				},
				fulfilled: {
					$ifNull: [{ $arrayElemAt: ['$Fulfilled.Fulfilled', 0] }, 0]
				}
			}
		}
	])
	if (!stats || !stats[0]) {
		throw new Error('Error querying order stats.')
	}
	return stats[0]
}*/

orderSchema.statics.getOrders = async function ({ year, month, status }) {
	// get whole month
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

	// status query
	if (!status || status == 'all') {
		status = '.*'
	}

	// Get product details of order
	const orders = await Order.aggregate([
		{
			$lookup: {
				from: OrderStatus.collection.name,
				localField: 'status',
				foreignField: '_id',
				as: 'status'
			}
		},
		{
			$lookup: {
				from: Customer.collection.name,
				localField: 'customer',
				foreignField: '_id',
				as: 'customer'
			}
		},
		{
			$match: {
				target: {
					$gte: qdate.startOf('month').toDate(),
					$lte: qdate.endOf('month').toDate()
				},
				'status.status': {
					$in: [new RegExp(status, 'i')]
				}
			}
		},
		{
			$project: {
				id: '$_id',
				status: {
					$map: {
						input: '$status',
						as: 'status',
						in: {
							id: '$$status._id',
							status: '$$status.status'
						}
					}
				},
				target: 1,
				total: 1,
				deliveryType: 1,
				customer: {
					$map: {
						input: '$customer',
						as: 'customer',
						in: {
							id: '$$customer._id',
							fname: '$$customer.firstname',
							lname: '$$customer.lastname'
						}
					}
				}
			}
		}
	])

	return orders
}

orderSchema.statics.getOrderDetails = async function (searchParam) {
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
		// ]).option({ hint: { 'products.product': 1 } })
	])

	return order
}

const Order = mongoose.model('Order', orderSchema, 'Orders')

module.exports = Order
