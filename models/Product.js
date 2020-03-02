const mongoose = require('mongoose')
const getSlug = require('speakingurl')
const Category = require('./Category')
const Discount = require('./Discount')
const Comment = require('./Comment')

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

productSchema.statics.getProductDetailsbyCategory = async category => {
	// Get product details belonging to supplied category
	const products = await Product.aggregate([
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
			$match: {
				isActive: true,
				'category.name': {
					$in: [new RegExp('^' + category + '$', 'i')]
				}
			}
		},
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
					}
				],
				as: 'discount'
			}
		},
		{
			$project: {
				_id: -1,
				seoname: 1,
				basePrice: 1,
				category: 1,
				isActive: 1,
				images: 1,
				discount: 1
			}
		}
	])
		.sort({
			created: -1
		})
		.option({ hint: { isActive: 1 } })

	return products
}

productSchema.statics.getProductDetails = async productName => {
	// Get product details of using slug
	const product = await Product.aggregate([
		{
			$match: {
				seoname: productName,
				isActive: true
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
					}
				],
				as: 'discount'
			}
		},
		{
			$lookup: {
				from: Comment.collection.name,
				localField: 'comments',
				foreignField: '_id',
				as: 'comments'
			}
		},
		{
			$project: {
				_id: -1,
				seoname: 1,
				basePrice: 1,
				category: 1,
				isActive: 1,
				images: 1,
				discount: 1,
				comments: 1
			}
		}
	]).option({ hint: { seoname: 1 } })

	return product
}

const Product = mongoose.model('Product', productSchema, 'Products')

module.exports = Product
