const mongoose = require('mongoose')
const Product = require('../models/Product')
const comparator = require('../helpers/comparisonhelper')
// const validator = require('validator')

const getFinalPrice = function(base, discount, resellerDiscount) {
	return base
}

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
			default: 1
		},
		price: {
			type: Number,
			required: true
		},
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
	next()
})

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

	const basket = new Basket({
		products: [
			{
				product: reqBody.product,
				quantity: reqBody.quantity,
				price: reqBody.quantity * product.pricing.basePrice,
				options: reqBody.options
			}
		]
	})
	if (!basket) {
		throw new Error('Error making basket')
	}
	await basket.save()
	return basket
}

basketSchema.statics.addToBasket = async (basketID, reqBody) => {
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

	let index = 0
	for (index in basket.products) {
		// If product is already existing in cart, add quantity
		if (
			basket.products[index].product == reqBody.product &&
			comparator.isEqual(basket.products[index].options, reqBody.options)
		) {
			const newQty = (basket.products[index].quantity += reqBody.quantity)
			basket.products[index].quantity = newQty
			basket.products[index].price = newQty * product.pricing.basePrice
			break
		}
		index++
	}

	// New type of product, push to cart
	if (index == basket.products.length) {
		basket.products.push({
			product: reqBody.product,
			quantity: reqBody.quantity,
			price: reqBody.quantity * product.pricing.basePrice,
			options: reqBody.options
		})
	}
	basket.modified = new Date()
	await basket.save()
	return basket
}

const Basket = mongoose.model('Basket', basketSchema, 'Basket')

module.exports = Basket
