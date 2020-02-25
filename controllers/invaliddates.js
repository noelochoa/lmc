const InvalidDate = require('../models/InvalidDate')

exports.getDates = async (req, res) => {
	// Get all invalid date entries
	try {
		const dates = await InvalidDate.getInvalidDates()
		if (!dates) {
			return res.status(404).send({ error: 'Date entries not found.' })
		}
		res.status(200).json(dates)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.createInvalidDate = async (req, res) => {
	// Create invalid date entry
	try {
		const date = new InvalidDate(req.body)
		if (date) {
			await date.save()
			res.status(200).json(date)
		} else {
			res.status(500).send({ error: 'Cannot create Date entry.' })
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.patchInvalidDate = async (req, res) => {
	// Edit date details
	if (req.params.invalidDateID) {
		try {
			const updateProps = {}
			for (let op of req.body) {
				updateProps[op.property] = op.value
			}
			const result = await InvalidDate.updateOne(
				{ _id: req.params.invalidDateID },
				{ $set: updateProps },
				{ runValidators: true }
			)
			if (!result || result.n == 0) {
				return res
					.status(404)
					.send({ error: 'Error updating Date entry.' })
			}
			res.status(200).json({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Date entry ID is invalid.' })
	}
}

exports.deleteInvalidDate = async (req, res) => {
	// Remove InvalidDate
	if (req.params.invalidDateID) {
		try {
			const result = await InvalidDate.deleteOne({
				_id: req.params.invalidDateID
			})
			if (!result || result.n == 0) {
				return res
					.status(404)
					.send({ error: 'Error removing Invalid Order Date.' })
			}
			res.status(200).json({ message: 'Successfully removed.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Date entry ID is invalid.' })
	}
}
