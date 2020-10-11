const mongoose = require('mongoose')
const Product = require('./Product')
// const validator = require('validator')

const categorySchema = mongoose.Schema({
	name: {
		type: String,
		unique: true,
		required: true,
		trim: true
	},
	created: {
		type: Date,
		default: Date.now
	}
})

categorySchema.statics.getAllCategories = async function () {
	const categories = await Category.aggregate([
		{
			$lookup: {
				from: 'Products',
				localField: '_id',
				foreignField: 'category',
				as: 'products'
			}
		},
		{
			$project: {
				id: '$_id',
				category: '$name',
				created: 1,
				count: { $size: '$products' },
				products: {
					$map: {
						input: '$products',
						as: 'prod',
						in: {
							id: '$$prod._id',
							name: '$$prod.name',
							seo: '$$prod.seoname'
						}
					}
				}
			}
		}
	])

	return categories
}

const Category = mongoose.model('Category', categorySchema, 'Categories')

module.exports = Category
