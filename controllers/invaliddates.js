const InvalidDate = require('../models/InvalidDate')
const Order = require('../models/Order')

exports.getDates = async (req, res) => {
	// Get all invalid date entries
	try {
		const { year, month } = req.query
		const holidays = await InvalidDate.getInvalidDates(year, month)
		res.status(200).send(holidays)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getDateStats = async (req, res) => {
	// Get all invalid date entries & workload for selected month-year
	try {
		const { year, month } = req.query
		const [holidays, worklist] = await Promise.all([
			InvalidDate.getInvalidDates(year, month),
			await Order.getNumOrders(year, month)
		])
		res.status(200).send({ holidays, worklist })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getDate = async (req, res) => {
	// Get invalid date details
	if (req.params.invalidDateID) {
		try {
			const holiday = await InvalidDate.findOne({
				_id: req.params.invalidDateID
			})
			res.status(200).send(holiday)
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Date entry ID is invalid.' })
	}
}

exports.createInvalidDate = async (req, res) => {
	// Create invalid date entry
	try {
		const date = new InvalidDate(req.body)
		if (date) {
			await date.save()
			res.status(200).send({
				message: 'Created new entry.',
				date
			})
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
			res.status(200).send({ message: 'Successfully updated.' })
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
			res.status(200).send({ message: 'Successfully removed.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Date entry ID is invalid.' })
	}
}
