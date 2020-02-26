const mongoose = require('mongoose')
// const validator = require('validator')

const basketSchema = mongoose.Schema({
	customer: {
		type: monmongoose.Types.ObjectId,
		unique: true,
		required: true
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
	products: [
		{
			product: {
				type: mongoose.Types.ObjectId,
				ref: 'Product',
				requried: true
			},
			quantity: {
				type: Number,
				required: true,
				default: 1
			},
			price: {
				type: Number,
				requried: true
			},
			options: [
				{
					text: String,
					value: String
				}
			]
		}
	]
})

basketSchema.statics.getBasket = async function() {
	const categories = await Basket.find()
	if (!categories) {
		throw new Error('Nothing found')
	}
	return categories
}

const Basket = mongoose.model('Basket', basketSchema, 'Basket')

module.exports = Basket
