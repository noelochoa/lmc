const Discount = require('../models/Discount')

exports.getDates = async (req, res) => {
	// Get all discount date entries
	try {
		const dates = await Discount.getDiscounts()
		if (!dates) {
			return res.status(404).send({ error: 'Date entries not found.' })
		}
		res.status(200).send({ dates })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.createDiscount = async (req, res) => {
	// Create discount date entry
	try {
		const date = new Discount(req.body)
		if (date) {
			await date.save()
			res.status(200).send(date)
		} else {
			res.status(500).send({ error: 'Cannot create Date entry.' })
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.patchDiscount = async (req, res) => {
	// Edit date details
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
					.send({ error: 'Error updating Date entry.' })
			}
			res.status(200).send({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Date entry ID is discount.' })
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
		res.status(400).send({ error: 'Date entry ID is discount.' })
	}
}
