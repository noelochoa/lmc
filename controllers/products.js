const Product = require('../models/Product')
const Category = require('../models/Category')
const Discount = require('../models/Discount')
const Comment = require('../models/Comment')

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

exports.getActiveProducts = async (req, res) => {
	// Get active products by category
	try {
		const category = req.params.category ? req.params.category : '.*'
		// All active products for category
		const products = await Product.getProductDetailsbyCategory(category)

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
		if (req.params.productName) {
			// Get active product
			const product = await Product.getProductDetails(
				req.params.productName
			)

			if (!product || product.length == 0) {
				return res.status(404).send({ error: 'Products not found.' })
			}
			res.status(200).send({ product })
		} else {
			return res.status(404).send({ error: 'Product not found.' })
		}
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
			res.status(200).send(product)
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
			res.status(200).send({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'ProductID is invalid.' })
	}
}

exports.patchProductOptions = async (req, res) => {
	// Edit product options

	if (req.params.productID) {
		try {
			const product = await Product.findOne({ _id: req.params.productID })
			if (!product) {
				return res
					.status(404)
					.send({ error: 'Error updating product.' })
			}
			const updatedOpts = []
			for (let uOpt of req.body) {
				// Find and update entry
				// let found = false
				// for (let pOpt of product.options) {
				// 	if (pOpt._id.toString() === uOpt._id) {
				// 		const option = {
				// 			attribute: uOpt.attribute,
				// 			userCustomizable: uOpt.userCustomizable,
				// 			choices: [...pOpt.choices, ...uOpt.choices]
				// 		}
				// 		console.log(option.choices)
				// 		updatedOpts.push(option)
				// 		found = true
				// 		break
				// 	}
				// }
				// if (found) {
				// 	continue
				// }

				// add new entry
				updatedOpts.push({
					// _id: uOpt._id,
					attribute: uOpt.attribute,
					userCustomizable: uOpt.userCustomizable,
					choices: uOpt.choices
				})
			}
			product.options = updatedOpts
			await product.save()
			res.status(200).send({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'ProductID is invalid.' })
	}
}

exports.patchProductImages = async (req, res) => {
	// Edit product images
	if (!req.files.length || req.files.length < 1) {
		return res
			.status(400)
			.send({
				error:
					'File upload failed. Limit the files to 4MB and ensure that the images are of JPG/PNG type.'
			})
	}

	if (req.params.productID) {
		try {
			const product = await Product.findOne({ _id: req.params.productID })
			if (!product) {
				return res
					.status(404)
					.send({ error: 'Error updating product.' })
			}
			const updatedImgs = []
			// console.log(req.body)
			for (let uImg of req.files) {
				// add new entry
				updatedImgs.push({
					image: uImg.path,
					imageType: req.body.imageType || 'gallery'
				})
			}
			product.images = updatedImgs
			await product.save()
			res.status(200).send({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'ProductID is invalid.' })
	}
}
