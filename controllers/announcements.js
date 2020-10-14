const Announcement = require('../models/Announcement')
const mongoose = require('mongoose')

exports.getAllAnnouncements = async (req, res) => {
	// Get all announcements
	try {
		const psas = await Announcement.getAll()
		res.status(200).send(psas)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getAnnouncement = async (req, res) => {
	// Get announcement for the current datetime
	if (req.params.psaID) {
		try {
			const psa = await Announcement.getAnnouncement(req.params.psaID)
			if (!psa) {
				return res
					.status(404)
					.send({ error: 'Announcement(s) not found.' })
			}
			res.status(200).send(psa)
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Announcement ID is missing.' })
	}
}

exports.createAnnouncement = async (req, res) => {
	// Create announcement date entry
	try {
		const psa = new Announcement(req.body)
		await psa.save()
		res.status(200).send({ message: 'Posted new announcement.', psa })
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
