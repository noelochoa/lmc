const Announcement = require('../models/Announcement')

exports.getAnnouncement = async (req, res) => {
	// Get announcement for the current datetime
	try {
		const psa = await Announcement.getAnnouncement()
		if (!psa) {
			return res
				.status(404)
				.send({ error: 'Announcement entries not found.' })
		}
		res.status(200).send({ psa })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getAllAnnouncements = async (req, res) => {
	// Get all announcement entries
	try {
		const psas = await Announcement.find().sort({ start: -1 })
		if (!psas) {
			return res
				.status(404)
				.send({ error: 'Announcement entries not found.' })
		}
		res.status(200).send({ psas })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.createAnnouncement = async (req, res) => {
	// Create announcement date entry
	try {
		const psa = new Announcement(req.body)
		if (psa) {
			await psa.save()
			res.status(200).send({ message: 'Posted new announcement.', psa })
		} else {
			res.status(500).send({ error: 'Cannot create Announcement entry.' })
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.patchAnnouncement = async (req, res) => {
	// Edit date details
	if (req.params.psaID) {
		try {
			const updateProps = {}
			for (let op of req.body) {
				updateProps[op.property] = op.value
			}
			const result = await Announcement.updateOne(
				{ _id: req.params.psaID },
				{ $set: updateProps },
				{ runValidators: true }
			)
			if (!result || result.n == 0) {
				return res
					.status(404)
					.send({ error: 'Error updating Announcement entry.' })
			}
			res.status(200).send({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Announcement ID is missing.' })
	}
}

exports.deleteAnnouncement = async (req, res) => {
	// Remove Announcement
	if (req.params.psaID) {
		try {
			const result = await Announcement.deleteOne({
				_id: req.params.psaID
			})
			if (!result || result.n == 0) {
				return res
					.status(404)
					.send({ error: 'Error removing Announcement.' })
			}
			res.status(200).send({ message: 'Successfully removed.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Announcement ID is missing.' })
	}
}
