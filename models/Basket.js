const mongoose = require('mongoose')
const Product = require('../models/Product')
const Category = require('../models/Category')
const Discount = require('../models/Discount')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
// const validator = require('validator')

const optionSchema = mongoose.Schema(
	// {
	// 	type: String,
	// 	value: String
	// },
	// { _id: false }
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
const basketItemSchema = mongoose.Schema(
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
		// price: {
		// 	type: Number,
		// 	required: true
		// },
		options: [optionSchema],
		references: [
			{
				type: String,
				trim: true
			}
		],
		memo: {
			type: String,
			trim: true
		}
	},
	{ _id: false }
)

const basketSchema = mongoose.Schema(
	{
		customer: {
			type: mongoose.Types.ObjectId,
			unique: true,
			sparse: true
		},
		created: {
			type: Date,
			required: true,
			default: Date.now
		},
		modified: {
			type: Date,
			required: true,
			default: Date.now,
			expires: '1w'
		},
		products: [basketItemSchema]
	},
	{
		toJSON: {
			virtuals: true
		}
	}
)

basketSchema.virtual('count').get(function () {
	return this.products.reduce((total, item) => {
		return total + item.quantity
	}, 0)
})

basketSchema.pre('save', async function (next) {
	const basket = this
	const newArray = new Map()
	if (basket.products) {
		// Group duplicates and resolve quantity
		basket.products.forEach((item) => {
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
	basket.products = Array.from(newArray.values())
	next()
})

basketSchema.methods.generateCartToken = async function () {
	// Generate token for accessing cart
	const basket = this
	const xsrf = crypto.randomBytes(48).toString('base64')
	const xsrfHash = await bcrypt.hash(xsrf, 10)

	const token = jwt.sign(
		{ _id: basket._id, _xref: xsrfHash },
		process.env.JWT_STORE_KEY,
		{
			expiresIn: '1 week'
		}
	)
	return { token, xsrf }
}

basketSchema.methods.addItem = async function (reqBody) {
	// Push new item into basket
	const basket = this
	const product = await Product.findOne({
		_id: reqBody.product,
		isActive: true
	})
	if (!product) {
		throw new Error('Product to add is invalid')
	}
	if (reqBody.quantity < product.minOrderQuantity) {
		throw new Error('Minimum order quantity not met')
	}
	if (reqBody.options && reqBody.options.length > 0) {
		if (
			!product.options ||
			product.options.length < reqBody.options.length
		) {
			throw new Error('Product has no selectable options. ')
		}

		reqBody.options.forEach((item) => {
			const attribute = product.options.find((option) => {
				return option.attribute === item._option
			})

			if (!attribute) {
				throw new Error('Supplied attribute type not configurable')
			}
			const selected = attribute.choices.find((value) => {
				return value.value === item._selected
			})
			if (!selected) {
				throw new Error('Supplied attribute value not an option')
			}
		})
	}

	basket.products.push({
		product: reqBody.product,
		quantity: reqBody.quantity,
		options: reqBody.options
	})

	basket.modified = new Date()
	return basket
}

basketSchema.methods.editItem = async function (reqBody) {
	// Push new item into basket
	const basket = this
	const product = await Product.findOne({
		_id: reqBody.product,
		isActive: true
	})
	if (!product) {
		throw new Error('Product is now invalid. Removed from cart')
	}
	if (reqBody.quantity < product.minOrderQuantity) {
		throw new Error('Minimum order quantity not met')
	}
	if (reqBody.options && reqBody.options.length > 0) {
		if (
			!product.options ||
			product.options.length < reqBody.options.length
		) {
			throw new Error('Product has no selectable options. ')
		}

		reqBody.options.forEach((item) => {
			const attribute = product.options.find((option) => {
				return option.attribute === item._option
			})

			if (!attribute) {
				throw new Error('Supplied attribute type not configurable')
			}
			const selected = attribute.choices.find((value) => {
				return value.value === item._selected
			})
			if (!selected) {
				throw new Error('Supplied attribute value not an option')
			}
		})
	}

	basket.products.push({
		product: reqBody.product,
		quantity: reqBody.quantity,
		options: reqBody.options
	})

	basket.modified = new Date()
	return basket
}

basketSchema.statics.getBasketDetails = async function (searchParam) {
	// Get product details of basket
	const basket = await Basket.aggregate([
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
										target: 1,
										percent: 1,
										start: 1,
										end: 1
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
							minOrderQuantity: 1,
							basePrice: 1,
							images: 1,
							discount: 1,
							options: 1
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
				created: { $first: '$created' },
				modified: { $first: '$modified' },
				customer: { $first: '$customer' },
				products: { $push: '$products' }
			}
		}
	]).option({ hint: { 'products.product': 1 } })

	return basket[0]
}

basketSchema.methods.combineBasket = async function (otherBasketID) {
	// Merge current basket items with another && delete current
	const basket = this
	const otherBasket = await Basket.findOne({
		_id: otherBasketID,
		customer: { $ne: basket.customer }
	})

	if (!otherBasket) {
		return basket
	}
	if (basket.products && otherBasket.products) {
		otherBasket.products = basket.products.concat(otherBasket.products)
	} else if (basket.products) {
		otherBasket.products = basket.products
	}
	otherBasket.modified = new Date()

	await Basket.deleteOne({ _id: basket._id })

	return otherBasket
}

basketSchema.statics.createNewBasket = async (reqBody) => {
	const product = await Product.findOne({
		_id: reqBody.product,
		isActive: true
	})
	if (!product) {
		throw new Error('Product to add is invalid')
	}
	if (reqBody.quantity < product.minOrderQuantity) {
		throw new Error('Minimum order quantity not met')
	}
	if (reqBody.options && reqBody.options.length > 0) {
		if (
			!product.options ||
			product.options.length < reqBody.options.length
		) {
			throw new Error('Product has no selectable options. ')
		}
		reqBody.options.forEach((item) => {
			const attribute = product.options.find((option) => {
				return option.attribute === item._option
			})

			if (!attribute) {
				throw new Error('Supplied attribute type not configurable')
			}
			const selected = attribute.choices.find((value) => {
				return value.value === item._selected
			})
			if (!selected) {
				throw new Error('Supplied attribute value not an option')
			}
		})
	}

	const item = {
		product: reqBody.product,
		quantity: reqBody.quantity,
		options: reqBody.options
	}

	// new basket
	const basket = new Basket({
		products: [item]
	})

	if (!basket) {
		throw new Error('Error making basket')
	}

	return basket
}

basketSchema.statics.findUpdateBasket = async (basketID, reqBody) => {
	const basket = await Basket.findOne({ _id: basketID })
	if (!basket) {
		throw new Error('Error finding basket')
	}

	const product = await Product.findOne({
		_id: reqBody.product,
		isActive: true
	})
	if (!product) {
		throw new Error('Product to add is invalid')
	}
	if (reqBody.quantity < product.minOrderQuantity) {
		throw new Error('Minimum order quantity not met')
	}
	if (reqBody.options && reqBody.options.length > 0) {
		if (
			!product.options ||
			product.options.length < reqBody.options.length
		) {
			throw new Error('Product has no selectable options. ')
		}

		reqBody.options.forEach((item) => {
			const attribute = product.options.find((option) => {
				return option.attribute === item._option
			})

			if (!attribute) {
				throw new Error('Supplied attribute type not configurable')
			}
			const selected = attribute.choices.find((value) => {
				return value.value === item._selected
			})
			if (!selected) {
				throw new Error('Supplied attribute value not an option')
			}
		})
	}

	basket.products.push({
		product: reqBody.product,
		quantity: reqBody.quantity,
		options: reqBody.options
	})

	basket.modified = new Date()

	return basket
}

const Basket = mongoose.model('Basket', basketSchema, 'Basket')

module.exports = Basket
