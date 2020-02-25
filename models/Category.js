const mongoose = require('mongoose')
// const validator = require('validator')

const categorySchema = mongoose.Schema({
	name: {
		type: String,
		unique: true,
		required: true,
		trim: true
	}
})

categorySchema.statics.getCategories = async function() {
	const categories = await Category.find()
	if (!categories) {
		throw new Error('Nothing found')
	}
	return categories
}

const Category = mongoose.model('Category', categorySchema, 'Categories')

module.exports = Category
