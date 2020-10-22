const Product = require('../models/Product')
const Category = require('../models/Category')
const Discount = require('../models/Discount')
const Comment = require('../models/Comment')
const fs = require('fs')

exports.getProductStats = async (req, res) => {
	try {
		const stats = await Product.getProductStats()
		res.status(200).send(stats)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getProduct = async (req, res) => {
	// Get product details
	if (req.params.productID) {
		try {
			const product = await Product.findOne({
				_id: req.params.productID
			})
			if (product && product.images.length > 0) {
				product.images = product.images.map((item) => {
					item.image = item.image.replace(/\\/g, '/')
					return item
				})
			}
			res.status(200).send(product)
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Product ID missing or invalid.' })
	}
}
exports.getAllProducts = async (req, res) => {
	// Dump all
	try {
		const category =
			req.params.category && req.params.category !== 'all'
				? req.params.category
				: '.*'
		const products = await Product.getAllProductsByCategory(category)

		res.status(200).send({
			products: products,
			count: products.length
		})
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

exports.patchProducts = async (req, res) => {
	// Edit product details
	if (req.body && req.body.selected) {
		try {
			const updateProps = {}
			for (let op of req.body.props) {
				updateProps[op.property] = op.value
			}
			const result = await Product.updateMany(
				{ _id: { $in: req.body.selected } },
				{ $set: updateProps },
				{ runValidators: true }
			)
			if (!result || result.n == 0) {
				return res
					.status(404)
					.send({ error: 'Error updating product/s.' })
			}
			res.status(200).send({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'ProductIDs not suppplied.' })
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
	if (req.params.productID) {
		try {
			// Edit product images
			if (!req.files.length || req.files.length < 1) {
				return res.status(400).send({
					error:
						'File upload failed. Limit the files to 4MB and ensure that the images are of JPG/PNG type.'
				})
			}
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
					image: uImg.path.replace(/\\/g, '/'),
					imageType: req.body.imageType || 'gallery'
				})
			}
			product.images = [].concat(product.images, updatedImgs)
			await product.save()
			// send list of new img filenames
			res.status(200).send(product.images)
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'ProductID is invalid.' })
	}
}

exports.patchProductBanner = async (req, res) => {
	// Update product banner
	if (req.params.productID) {
		try {
			if (!req.file) {
				return res
					.status(400)
					.send({ error: 'Missing form data (image).' })
			}
			const product = await Product.findOne({ _id: req.params.productID })
			if (!product) {
				return res
					.status(404)
					.send({ error: 'Error updating product.' })
			}
			const newImgsList = []
			product.images.forEach((item) => {
				if (item.imageType == 'banner') {
					// remove current banner
					fs.unlinkSync(item.image) // remove
				} else {
					newImgsList.push(item)
				}
			})
			newImgsList.push({
				image: req.file.path.replace(/\\/g, '/'),
				imageType: req.body.imageType || 'banner'
			})
			product.images = newImgsList.slice()
			product.isFeatured = req.body.isFeatured
			await product.save()
			// send list of new img filenames
			res.status(200).send(product.images)
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'ProductID is invalid.' })
	}
}

exports.deleteProductImage = async (req, res) => {
	if (req.params.productID && req.params.imageID) {
		try {
			// Edit product images
			const product = await Product.findOne({ _id: req.params.productID })
			if (product) {
				product.images = product.images.filter((item) => {
					if (item._id != req.params.imageID) return true
					fs.unlinkSync(item.image) // remove
					return false
				})
				await product.save()
				res.status(200).send()
			} else {
				res.status(204).send()
			}
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Product or image ID is invalid.' })
	}
}
