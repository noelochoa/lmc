const Category = require('../models/Category')
const Product = require('../models/Product')

exports.getCategories = async (req, res) => {
	// Get all categories
	try {
		const categories = await Category.getCategories()
		if (!categories) {
			return res.status(404).send({ error: 'Categories not found.' })
		}
		res.status(200).send(categories)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.createCategory = async (req, res) => {
	// Create category
	try {
		const category = new Category(req.body)
		if (category) {
			await category.save()
			res.status(200).send(category)
		} else {
			res.status(500).send({ error: 'Cannot post category.' })
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.patchCategory = async (req, res) => {
	// Edit category
	if (req.params.categoryID) {
		try {
			const updateProps = {}
			for (let op of req.body) {
				updateProps[op.property] = op.value
			}
			const result = await Category.updateOne(
				{ _id: req.params.categoryID },
				{ $set: updateProps },
				{ runValidators: true }
			)
			if (!result || result.n == 0) {
				return res
					.status(404)
					.send({ error: 'Error updating category.' })
			}
			res.status(200).send({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'CategoryID is invalid.' })
	}
}

exports.deleteCategory = async (req, res) => {
	// Remove Category
	if (req.params.categoryID) {
		try {
			// Check if any product is linked with this category
			const product = await Product.exists({
				category: req.params.categoryID
			})
			if (product) {
				return res.status(400).send({
					error: 'Error removing category. Product(s) exists.'
				})
			}

			const result = await Category.deleteOne({
				_id: req.params.categoryID
			})
			if (!result || result.n == 0) {
				return res
					.status(404)
					.send({ error: 'Error removing category.' })
			}
			res.status(200).send({ message: 'Successfully removed.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'CategoryID is invalid.' })
	}
}

exports.forceDeleteCategory = async (req, res) => {
	// Remove Category
	if (req.params.categoryID) {
		try {
			const result = await Category.deleteOne({
				_id: req.params.categoryID
			})
			if (!result || result.n == 0) {
				return res
					.status(404)
					.send({ error: 'Error removing category.' })
			}
			res.status(200).send({ message: 'Successfully removed.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'CategoryID is invalid.' })
	}
}
