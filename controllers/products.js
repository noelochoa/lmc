const Product = require('../models/Product')

exports.getAllProducts = async (req, res) => {
	// Dump all
	try {
		const products = await Product.getProducts()
		if (!products) {
			return res.status(404).send({ error: 'Products not found.' })
		}
		res.status(200).json({ products })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getAllActiveProducts = async (req, res) => {
	// Dump all active products
	try {
		const products = await Product.getActiveProducts()
		if (!products) {
			return res.status(404).send({ error: 'Products not found.' })
		}
		res.status(200).json({ products })
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
