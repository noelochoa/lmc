const mongoose = require('mongoose')
const getSlug = require('speakingurl')
const Category = require('./Category')

const productSchema = mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	seoname: {
		type: String,
		unique: true,
		trim: true
	},
	category: {
		type: mongoose.Types.ObjectId,
		ref: 'Category',
		required: true,
		validate: {
			validator: val => {
				return Category.exists({ _id: val })
			},
			message: 'Category is invalid'
		}
	},
	isActive: {
		type: Boolean,
		required: true,
		default: true
	},
	shortDesc: {
		type: String,
		required: true,
		trim: true
	},
	fullDesc: {
		type: String,
		trim: true
	},
	basePrice: {
		type: Number,
		required: true,
		min: 1
	},
	// pricing: {
	// 	basePrice: {
	// 		type: Number,
	// 		required: true,
	// 		min: 1
	// 	},
	// 	discount: {
	// 		type: Number,
	// 		default: 0,
	// 		min: 0,
	// 		max: 99
	// 	},
	// 	resellerDiscount: {
	// 		type: Number,
	// 		default: 0,
	// 		min: 0,
	// 		max: 99
	// 	}
	// },
	sold: {
		type: Number,
		default: 0
	},
	minOrderQuantity: {
		type: Number,
		required: true,
		default: 1
	},
	created: {
		type: Date,
		required: true,
		default: new Date()
	},
	images: [
		{
			image: {
				type: String
			},
			imageType: {
				type: String,
				required: () => {
					return this.images.image != null
				}
			}
		}
	],
	comments: [
		{
			type: mongoose.Types.ObjectId,
			ref: 'Comment'
		}
	]
})

productSchema.pre('save', async function(next) {
	// Create slug for name on save
	const product = this
	if (product.isModified('name')) {
		product.seoname = getSlug(product.name)
	}
	next()
})

productSchema.pre('updateOne', async function(next) {
	// Recreate slug for name on updateOne
	const updateData = this.getUpdate().$set
	if (updateData.name) {
		this.getUpdate().$set.seoname = getSlug(updateData.name)
	}
	next()
})

productSchema.statics.addNewComment = async (productID, commentID) => {
	// Push commentID to current list (limit to 10)
	const product = await Product.findOne({ _id: productID })
	if (!product) {
		throw new Error('Nothing found')
	}
	product.comments = [commentID].concat(product.comments.slice(0, 10))
	await product.save()
	return product
}

const Product = mongoose.model('Product', productSchema, 'Products')

module.exports = Product
