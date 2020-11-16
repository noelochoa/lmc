const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose)
const moment = require('moment')
const sgmail = require('@sendgrid/mail')
const mailhelper = require('../helpers/mailhelper')

const OrderStatus = require('../models/OrderStatus')
const Product = require('../models/Product')
const Category = require('../models/Category')
const Discount = require('../models/Discount')
const Customer = require('../models/Customer')
// const validator = require('validator')

const zeroPad = function (num, numZeros) {
	var n = Math.abs(num)
	if (isNaN(num)) n = 0
	var zeros = Math.max(0, numZeros - Math.floor(n).toString().length)
	var zeroString = Math.pow(10, zeros).toString().substr(1)
	if (num < 0) {
		zeroString = '-' + zeroString
	}
	return zeroString + n
}

const buildOrderNum = function (dt, num) {
	return (
		'OR' +
		(dt ? dt.getYear() : new Date().getYear()) +
		'-' +
		zeroPad(num, 6)
	)
}

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
		required: true,
		validate: {
			validator: (val) => {
				return Customer.exists({ _id: val })
			},
			message: '{VALUE} is invalid or does not exist'
		}
	},
	status: {
		type: mongoose.Types.ObjectId,
		ref: 'OrderStatus',
		required: true,
		validate: {
			validator: (val) => {
				return OrderStatus.exists({ _id: val })
			},
			message: '{VALUE} is invalid or does not exist'
		}
	},
	replacedBy: {
		ordernum: {
			type: Number
		},
		reference: {
			type: mongoose.Types.ObjectId,
			ref: 'Order'
		}
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
	products: [orderItemSchema],
	memo: {
		type: String,
		trim: true,
		max: 1024
	}
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
				item.price += existing.price
				item.finalPrice += existing.finalPrice

				newArray.set(propertyValue, item)
			} else {
				newArray.set(propertyValue, item)
			}
		})
	}
	order.products = Array.from(newArray.values())
	next()
})

orderSchema.pre('updateOne', async function (next) {
	const q_id = this.getQuery()._id
	const updateData = this.getUpdate().$set
	try {
		// Check if status has changed
		const [current, newStatus] = await Promise.all([
			Order.findOne({ _id: q_id }).populate(
				'customer',
				'_id firstname email'
			),
			OrderStatus.findOne({ _id: updateData.status })
		])
		if (current.status.toString() != newStatus._id.toString()) {
			// Send notification to Customer
			/* TODO
			sgmail.setApiKey(process.env.SENDGRID_API_KEY)
			const orderNotifOptions = mailhelper.createOrderUpdateMail(
				current.customer.email,
				current.customer.firstname,
				buildOrderNum(current.created.getYear(), current.ordernum),
				newStatus.status
			)
			sgmail.send(orderNotifOptions)*/
		}
		next()
	} catch (err) {
		next('Error occurred while updating order status.')
	}
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

orderSchema.statics.findOrders = async function (search) {
	// Find orders with matching search param
	if (!search) return []
	const orders = await Order.aggregate([
		{
			$lookup: {
				from: OrderStatus.collection.name,
				localField: 'status',
				foreignField: '_id',
				as: 'status'
			}
		},
		{ $unwind: '$status' },
		{
			$lookup: {
				from: Customer.collection.name,
				localField: 'customer',
				foreignField: '_id',
				as: 'customer'
			}
		},
		{ $unwind: '$customer' },
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
						$project: {
							_id: 1,
							isActive: 1,
							name: 1,
							seoname: 1,
							category: 1
						}
					}
				],
				as: 'products.product'
			}
		},
		{ $unwind: '$products.product' },
		{
			$match: {
				$or: [
					{ 'products.product.name': { $in: [search] } },
					{
						'customer.firstname': { $in: [search] }
					},
					{ 'customer.lastname': { $in: [search] } },
					{ 'status.status': { $in: [search] } }
				]
			}
		},
		{
			$group: {
				_id: '$_id',
				status: { $first: '$status' },
				ordernum: { $first: '$ordernum' },
				target: { $first: '$target' },
				memo: { $first: '$memo' },
				total: { $first: '$total' },
				created: { $first: '$created' },
				customer: { $first: '$customer' },
				products: { $push: '$products' }
			}
		},
		{
			$sort: { modified: -1 }
		},
		{
			$limit: 5
		}
	])
	orders.forEach((item) => {
		item.orderRef = buildOrderNum(item.created, item.ordernum)
	})
	return orders
}

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
				ordernum: 1,
				status: {
					$arrayElemAt: [
						{
							$map: {
								input: '$status',
								as: 'status',
								in: {
									id: '$$status._id',
									status: '$$status.status'
								}
							}
						},
						0
					]
				},
				target: 1,
				total: 1,
				deliveryType: 1,
				customer: {
					$arrayElemAt: [
						{
							$map: {
								input: '$customer',
								as: 'customer',
								in: {
									id: '$$customer._id',
									firstname: '$$customer.firstname',
									lastname: '$$customer.lastname'
								}
							}
						},
						0
					]
				}
			}
		}
	])
	orders.forEach((item) => {
		item.orderRef = buildOrderNum(item.created, item.ordernum)
	})
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
							as: 'discounts'
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
							discounts: 1
						}
					}
				],
				as: 'products.product'
			}
		},
		{ $unwind: '$products.product' },
		{
			$group: {
				_id: '$_id',
				status: { $first: '$status' },
				ordernum: { $first: '$ordernum' },
				replacedBy: { $first: '$replacedBy' },
				target: { $first: '$target' },
				deliveryType: { $first: '$deliveryType' },
				shippingAddress: { $first: '$shippingAddress' },
				memo: { $first: '$memo' },
				total: { $first: '$total' },
				created: { $first: '$created' },
				modified: { $first: '$modified' },
				customer: { $first: '$customer' },
				products: { $push: '$products' }
			}
		}
	]).option({ hint: { 'products.product': 1 } })
	// ])
	order.forEach((item) => {
		item.orderRef = buildOrderNum(item.created, item.ordernum)
	})
	return order[0]
}

/*
orderSchema.statics.findSimilarStatus = async function (oID, status) {
	const items = await Order.find({
		_id: { $ne: oID },
		status: status
	})
		.populate('customer', 'name firstname lastname')
		.populate('status')
		.sort({ target: -1 })
		.limit(5)
		.lean()
	items.forEach((item) => {
		item.orderRef = buildOrderNum(item.created, item.ordernum)
	})
	return items
}

orderSchema.statics.findSameCustomer = async function (oID, customer) {
	const items = await Order.find({
		_id: { $ne: oID },
		customer: customer
	})
		.populate('customer', 'name firstname lastname')
		.populate('status')
		.sort({ target: -1 })
		.limit(5)
		.lean()
	items.forEach((item) => {
		item.orderRef = buildOrderNum(item.created, item.ordernum)
	})
	return items
}*/

orderSchema.statics.findNearbyDates = async function (oID, target) {
	const items = await Order.aggregate([
		{ $match: { _id: { $ne: oID } } },
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
		{ $match: { 'status.step': { $in: [1, 2] } } }, // accepted / preparing / finalizing
		{
			$project: {
				id: '$_id',
				ordernum: 1,
				status: {
					$arrayElemAt: [
						{
							$map: {
								input: '$status',
								as: 'status',
								in: {
									id: '$$status._id',
									status: '$$status.status'
								}
							}
						},
						0
					]
				},
				target: 1,
				total: 1,
				deliveryType: 1,
				customer: {
					$arrayElemAt: [
						{
							$map: {
								input: '$customer',
								as: 'customer',
								in: {
									id: '$$customer._id',
									firstname: '$$customer.firstname',
									lastname: '$$customer.lastname'
								}
							}
						},
						0
					]
				},
				difference: {
					$abs: {
						$subtract: [moment(target).toDate(), '$target']
					}
				}
			}
		},
		{ $match: { difference: { $lte: 2 * 86400 * 1000 } } }, // 3 days (milliseconds)
		{
			$sort: { difference: 1 }
		},
		{
			$limit: 5
		}
	])
	items.forEach((item) => {
		item.orderRef = buildOrderNum(item.created, item.ordernum)
	})
	return items
}

orderSchema.statics.findSimilarProducts = async function (oID, products) {
	const items = await Order.find({
		_id: { $ne: oID },
		'products.product': { $in: products }
	})
		.populate('customer', 'name firstname lastname')
		.populate('status', 'status')
		.sort({ target: -1 })
		.limit(5)
		.lean()
	items.forEach((item) => {
		item.orderRef = buildOrderNum(item.created, item.ordernum)
	})
	return items
}

orderSchema.statics.findSimilarOptions = async function (oID, options) {
	const items = await Order.find(
		{
			_id: { $ne: oID },
			$text: { $search: options }
		},
		{ score: { $meta: 'textScore' } }
	)
		.populate('customer', 'name firstname lastname')
		.populate('status', 'status')
		.sort({ score: { $meta: 'textScore' } })
		.limit(5)
		.lean()
	items.forEach((item) => {
		item.orderRef = buildOrderNum(item.created, item.ordernum)
	})
	return items
}

orderSchema.plugin(AutoIncrement, { inc_field: 'ordernum' })
const Order = mongoose.model('Order', orderSchema, 'Orders')

module.exports = Order
