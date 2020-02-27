const Product = require('../models/Product')
const Category = require('../models/Category')

exports.getAllProducts = async (req, res) => {
	// Dump all
	try {
		const products = await Product.find({ isActive: true }).sort({
			created: -1
		})

		if (!products || products.length == 0) {
			return res.status(404).send({ error: 'Products not found.' })
		}
		res.status(200).send({ products: products, count: products.length })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getAllActiveProducts = async (req, res) => {
	// Get all active products
	try {
		const products = await Product.find({ isActive: true }).sort({
			created: -1
		})

		if (!products || products.length == 0) {
			return res.status(404).send({ error: 'Products not found.' })
		}
		res.status(200).send({ products: products, count: products.length })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getActiveProducts = async (req, res) => {
	// Get active products by category
	try {
		let products
		if (req.params.category) {
			// All active products for category
			products = await Product.aggregate([
				{
					$lookup: {
						from: Category.collection.name,
						localField: 'category',
						foreignField: '_id',
						as: 'category'
					}
				},
				{
					$match: {
						isActive: true,
						'category.name': {
							$in: [
								new RegExp('^' + req.params.category + '$', 'i')
							]
						}
					}
				}
			]).sort({
				created: -1
			})
		} else {
			// All active products
			products = await Product.find({ isActive: true }).sort({
				created: -1
			})
		}

		if (!products || products.length == 0) {
			return res.status(404).send({ error: 'Products not found.' })
		}
		res.status(200).send({ products: products, count: products.length })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getActiveProductByName = async (req, res) => {
	// get active product
	try {
		let product
		if (req.params.productName) {
			// Get active product
			product = await Product.findOne({
				seoname: req.params.productName,
				isActive: true
			}).populate([
				{
					path: 'comments',
					populate: {
						path: 'author',
						select: 'firstname -_id'
					}
				},
				{ path: 'category', select: 'name' }
			])
		}
		if (!product) {
			return res.status(404).send({ error: 'Product not found.' })
		}
		res.status(200).send({ product })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getActiveProduct = async (req, res) => {
	// get active product by ID
	try {
		let product
		if (req.params.productID) {
			// Get active product
			product = await Product.findOne({
				_id: req.params.productID,
				isActive: true
			}).populate([
				{
					path: 'comments',
					populate: {
						path: 'author',
						select: 'firstname -_id'
					}
				},
				{ path: 'category', select: 'name' }
			])
		}
		if (!product) {
			return res.status(404).send({ error: 'ProductID not found.' })
		}
		res.status(200).send({ product })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.createProduct = async (req, res) => {
	// Post product
	try {
		const product = new Product(req.body)
		if (product) {
			await product.save()
			res.status(200).json(product)
		} else {
			res.status(500).send({ error: 'Cannot save product.' })
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.patchProduct = async (req, res) => {
	// Edit product details
	if (req.params.productID) {
		try {
			const updateProps = {}
			for (let op of req.body) {
				updateProps[op.property] = op.value
			}
			const result = await Product.updateOne(
				{ _id: req.params.productID },
				{ $set: updateProps },
				{ runValidators: true }
			)
			if (!result || result.n == 0) {
				return res
					.status(404)
					.send({ error: 'Error updating product.' })
			}
			res.status(200).json({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'ProductID is invalid.' })
	}
}
