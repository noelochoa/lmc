const mongoose = require('mongoose')
const getSlug = require('speakingurl')
const Category = require('./Category')
const Discount = require('./Discount')
const Comment = require('./Comment')

const productSchema = mongoose.Schema(
	{
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
				validator: (val) => {
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
		isFeatured: {
			type: Boolean,
			required: true,
			default: false
		},
		description: {
			type: String,
			required: true,
			trim: true
		},
		colors: [
			{
				type: String,
				trim: true,
				validate: {
					validator: (val) => {
						return /^#([0-9A-F]{3}){1,2}$/i.test(val)
					},
					message: 'Invalid HEX color code'
				}
			}
		],
		basePrice: {
			type: Number,
			required: true,
			min: 1
		},
		details: [{}],
		options: [
			{
				_id: {
					type: String,
					trim: true
				},
				attribute: {
					type: String,
					required: true,
					trim: true,
					unique: true
				},
				choices: [
					{
						_id: {
							type: String,
							trim: true
						},
						value: {
							type: String,
							required: true,
							trim: true
						},
						price: {
							type: Number,
							required: true,
							default: 0
						},
						available: {
							type: Boolean,
							required: true,
							default: true
						}
						// add difficulty?
					}
				],
				userCustomizable: {
					type: Boolean,
					required: true,
					default: false
				}
			}
		],
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
			default: Date.now
		},
		images: [
			{
				image: {
					type: String,
					required: true
				},
				imageType: {
					type: String,
					required: true,
					enum: ['gallery', 'thumbnail', 'banner']
				}
			}
		],
		comments: [
			{
				type: mongoose.Types.ObjectId,
				ref: 'Comment'
			}
		]
	},
	{
		toJSON: {
			virtuals: true
		}
	}
)

productSchema.pre('save', async function (next) {
	// Create slug for name on save
	const product = this
	if (product.isModified('name')) {
		product.seoname = getSlug(product.name)
	}

	if (product.isModified('options')) {
		for (let opt of product.options) {
			let hasOther = false

			opt._id = opt.attribute // set ID as Attribute
			opt.choices = opt.choices.map((choice) => {
				if (choice.value == 'Other') {
					hasOther = true
				}
				choice._id = opt._id + '.' + choice.value // set ID as Attribute.Value
				return choice
			})

			if (opt.userCustomizable && !hasOther) {
				throw new Error(
					"Invalid Options. 'Other' is required if option is customizable."
				)
			}
		}
	}
	next()
})

productSchema.pre('updateOne', async function (next) {
	// Recreate slug for name on updateOne
	const updateData = this.getUpdate().$set
	if (updateData.name) {
		this.getUpdate().$set.seoname = getSlug(updateData.name)
	}
	next()
})

productSchema.statics.getProductStats = async function () {
	// Get product stats (Active, Featured, Total)
	const stats = await Product.aggregate([
		{
			$facet: {
				Active: [{ $match: { isActive: true } }, { $count: 'Active' }],
				Featured: [
					{ $match: { isFeatured: true } },
					{ $count: 'Featured' }
				],
				Total: [{ $count: 'Total' }]
			}
		},
		{
			$project: {
				active: {
					$ifNull: [{ $arrayElemAt: ['$Active.Active', 0] }, 0]
				},
				featured: {
					$ifNull: [{ $arrayElemAt: ['$Featured.Featured', 0] }, 0]
				},
				total: {
					$ifNull: [{ $arrayElemAt: ['$Total.Total', 0] }, 0]
				}
			}
		}
	])
	if (!stats || !stats[0]) {
		throw new Error('Error querying product stats.')
	}
	return stats[0]
}

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

productSchema.statics.getProductDetailsbyCategory = async (category) => {
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
				name: 1,
				seoname: 1,
				basePrice: 1,
				category: 1,
				isActive: 1,
				images: 1,
				discount: 1,
				sold: 1
			}
		}
	])
		.sort({
			created: -1
		})
		.option({ hint: { isActive: 1 } })

	return products
}

productSchema.statics.getProductDetails = async (productName) => {
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
				variants: 1,
				discount: 1,
				comments: 1
			}
		}
	]).option({ hint: { seoname: 1 } })

	return product
}

const Product = mongoose.model('Product', productSchema, 'Products')

module.exports = Product
