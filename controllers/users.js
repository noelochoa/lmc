const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { validationResult } = require('express-validator')
const User = require('../models/User')
const AccessToken = require('../models/AccessToken')

exports.getAllUsers = async (req, res) => {
	// Dump all
	try {
		const users = await User.getUsers()
		if (!users) {
			return res.status(404).send({ error: 'Users not found.' })
		}
		res.status(200).send(users)
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
			const token = user.generateAuthToken()
			const accToken = new AccessToken({
				user: user._id,
				token: token
			})
			await accToken.save()
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
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(422).send({ error: 'Invalid input(s) format.' })
		}

		const { email, password } = req.body
		const user = await User.findByCredentials(email, password)
		if (!user) {
			return res.status(401).send({
				error: 'Login failed! Check authentication credentials'
			})
		}
		const token = user.generateAuthToken()
		const accToken = new AccessToken({
			user: user._id,
			token: token
		})
		await accToken.save()
		const cmsuser = {
			name: user.name,
			email: user.email
		}
		res.send({ cmsuser, token })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.logoutUser = async (req, res) => {
	// Log user out of the application
	try {
		req.token.revoked = true
		await req.token.save()
		res.send()
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}

exports.changePW = async (req, res) => {
	try {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(422).send({ error: 'Invalid input(s) format.' })
		}
		const { currpw, newpw, reppw } = req.body
		const isPasswordMatch = await bcrypt.compare(currpw, req.user.password)

		if (!isPasswordMatch) {
			return res
				.status(400)
				.send({ error: 'Current password does not match' })
		}
		if (newpw !== reppw) {
			return res.status(400).send({
				error: 'New and retyped passwords do not match'
			})
		}

		req.user.password = newpw
		await req.user.save()
		res.status(200).send({ message: 'Password has been changed' })
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}

exports.logoutAll = async (req, res) => {
	// Log user out of all devices
	try {
		//req.user.tokens.splice(0, req.user.tokens.length)
		//await req.token.save()
		const result = await AccessToken.updateMany(
			{ user: req.user._id },
			{ $set: { revoked: true } },
			{ runValidators: true }
		)
		res.send()
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}

exports.refresh = async (req, res) => {
	// Get new JWT for valid refresh token
	try {
		if (req.header('X-REF-TOKEN')) {
			const reftoken = await CMSysJWT.findOne({
				token: req.header('X-REF-TOKEN')
			})
			if (reftoken && !reftoken.isActive) {
				const user = await User.findOne({
					_id: reftoken.user
				})
				if (user) {
					const token = user.generateAuthToken()
					const cmsuser = {
						name: user.name,
						email: user.email
					}
					res.send({ cmsuser, token })
				}
			}
		}
		res.status(401).send({
			error: 'Not authorized to access this resource'
		})
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}
