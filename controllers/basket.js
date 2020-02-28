const Basket = require('../models/Basket')

exports.getBasket = async (req, res) => {
	// Get basket
	if (req.params.basketID) {
		try {
			const basket = await Basket.findOne({ _id: req.params.basketID })
			if (!basket) {
				return res.status(404).send({ error: 'Basket not found.' })
			}
			res.status(200).send({ basket })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'BasketID is invalid.' })
	}
}

exports.addToBasket = async (req, res) => {
	// Create basket
	try {
		let basket
		if (!req.params.basketID) {
			// If not existing, create new and push product
			basket = await Basket.createNewBasket(req.body)
		} else {
			// If existing, push product
			basket = await Basket.addToBasket(req.params.basketID, req.body)
		}

		if (basket) {
			await basket.save()
			res.status(200).send({ basket })
		} else {
			res.status(500).send({ error: 'Cannot add item to basket.' })
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.patchBasket = async (req, res) => {
	// Edit basket
	if (req.params.basketID) {
		try {
			const updateProps = {}
			for (let op of req.body) {
				updateProps[op.property] = op.value
			}
			const result = await Basket.updateOne(
				{ _id: req.params.basketID },
				{ $set: updateProps },
				{ runValidators: true }
			)
			if (!result || result.n == 0) {
				return res.status(404).send({ error: 'Error updating basket.' })
			}
			res.status(200).send({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'BasketID is invalid.' })
	}
}
