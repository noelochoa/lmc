const Discount = require('../models/Discount')

exports.getAllDiscounts = async (req, res) => {
	// Get all discount date entries
	try {
		const discounts = await Discount.getAllDiscounts()
		res.status(200).send(discounts)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getDiscounts = async (req, res) => {
	// Get discount date entries
	try {
		let discounts = {}
		if (req.params.discountID) {
			discounts = await Discount.findOne({
				_id: req.params.discountID
			})
		} else {
			discounts = await Discount.getDiscounts()
		}
		res.status(200).send(discounts)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.createDiscount = async (req, res) => {
	// Create discount date entry
	try {
		const discount = new Discount(req.body)
		if (discount) {
			await discount.save()
			res.status(200).send({
				message: 'Created new discount entry.',
				discount
			})
		} else {
			res.status(500).send({ error: 'Cannot create Date entry.' })
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.patchDiscount = async (req, res) => {
	// Edit discount details
	if (req.params.discountID) {
		try {
			const updateProps = {}
			for (let op of req.body) {
				updateProps[op.property] = op.value
			}
			const result = await Discount.updateOne(
				{ _id: req.params.discountID },
				{ $set: updateProps },
				{ runValidators: true }
			)
			if (!result || result.n == 0) {
				return res
					.status(404)
					.send({ error: 'Error updating Discount entry.' })
			}
			res.status(200).send({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Discount entry ID is missing.' })
	}
}

exports.deleteDiscount = async (req, res) => {
	// Remove Discount
	if (req.params.discountID) {
		try {
			const result = await Discount.deleteOne({
				_id: req.params.discountID
			})
			if (!result || result.n == 0) {
				return res
					.status(404)
					.send({ error: 'Error removing Discount Date.' })
			}
			res.status(200).send({ message: 'Successfully removed.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Discount entry ID is missing.' })
	}
}
