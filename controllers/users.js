const User = require('../models/User')

exports.getAllUsers = async (req, res) => {
	// Dump all
	try {
		const users = await User.getUsers()
		if (!users) {
			return res.status(404).send({ error: 'Users not found.' })
		}
		res.status(200).json(users)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.createNewUser = async (req, res) => {
	// Create a new user
	try {
		const user = new User(req.body)
		if (user) {
			await user.save()
			const token = await user.generateAuthToken()
			res.status(201).send({ user, token })
		} else {
			res.status(400).send({ error: 'Cannot create user.' })
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.loginUser = async (req, res) => {
	//Login a registered user
	try {
		const { email, password } = req.body
		const user = await User.findByCredentials(email, password)
		if (!user) {
			return res
				.status(401)
				.send({
					error: 'Login failed! Check authentication credentials'
				})
		}
		const token = await user.generateAuthToken()
		res.send({ user, token })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.logoutUser = async (req, res) => {
	// Log user out of the application
	try {
		req.user.tokens = req.user.tokens.filter(token => {
			return token.token != req.token
		})
		await req.user.save()
		res.send()
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}

exports.logoutAll = async (req, res) => {
	// Log user out of all devices
	try {
		req.user.tokens.splice(0, req.user.tokens.length)
		await req.user.save()
		res.send()
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}
