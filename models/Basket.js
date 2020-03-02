const mongoose = require('mongoose')
const Product = require('../models/Product')
const jwt = require('jsonwebtoken')
// const validator = require('validator')

const optionsSchema = mongoose.Schema(
	{
		type: String,
		value: String
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
			validate: value => {
				if (!Number.isInteger(value)) {
					throw new Error('{VALUE} is not integer')
				}
			}
		},
		// price: {
		// 	type: Number,
		// 	required: true
		// },
		options: [optionsSchema]
	},
	{ _id: false }
)

const basketSchema = mongoose.Schema({
	customer: {
		type: mongoose.Types.ObjectId,
		unique: true,
		sparse: true
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
	products: [basketItemSchema]
})

basketSchema.pre('save', async function(next) {
	const basket = this
	const newArray = new Map()
	if (basket.products) {
		basket.products.forEach(item => {
			const propertyValue = (
				item.product + JSON.stringify(item.options)
			).replace('{}', '')

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

basketSchema.methods.generateAccessToken = async function(csrfToken) {
	// Generate token for accessing
	const basket = this
	const token = jwt.sign(
		{ _basket_id: basket._id, _csrf_token: csrfToken },
		process.env.JWT_STORE_KEY,
		{
			expiresIn: '1 week'
		}
	)
	return token
}

basketSchema.methods.addItem = async function(reqBody) {
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
	basket.products.push({
		product: reqBody.product,
		quantity: reqBody.quantity,
		options: reqBody.options
	})

	basket.modified = new Date()
	return basket
}

basketSchema.methods.editItem = async function(reqBody) {
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

	basket.products.push({
		product: reqBody.product,
		quantity: reqBody.quantity,
		options: reqBody.options
	})

	basket.modified = new Date()
	return basket
}

basketSchema.statics.getBasketDetails = async function(searchParam) {
	const basket = await Basket.findOne(searchParam).populate([
		{
			path: 'products.product',
			populate: {
				path: 'category'
			},
			select: 'name isActive pricing images seoname category -_id'
		}
	])

	if (!basket) {
		return null
	}

	return basket
}

basketSchema.methods.combineBasket = async function(otherBasketID) {
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

basketSchema.statics.createNewBasket = async reqBody => {
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
