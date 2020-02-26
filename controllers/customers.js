const crypto = require('crypto')
const nodemailer = require('nodemailer')
const mailhelper = require('../helpers/mailoptions')
const Customer = require('../models/Customer')
const Token = require('../models/Token')

exports.getAllCustomers = async (req, res) => {
	// Dump all
	try {
		const customers = await Customer.getCustomers()
		if (!customers) {
			return res.status(404).send({ error: 'Customers not found.' })
		}
		res.status(200).json(customers)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.createNewCustomer = async (req, res) => {
	// Create a new Customer
	try {
		const customer = await Customer.createEntry(req.body)
		if (customer) {
			await customer.save()

			const genToken = crypto
				.randomBytes(3)
				.toString('hex')
				.toUpperCase()

			// update or create new token document
			await Token.updateOne(
				{ customer: customer._id },
				{
					$set: {
						token: genToken,
						created: new Date()
					}
				},
				{ upsert: true, runValidators: true }
			)
			const token = await customer.generateAuthToken()
			const user = {
				name: customer.firstname,
				email: customer.email,
				status: customer.status
			}
			res.status(201).send({ user, token, genToken })
		} else {
			res.status(400).send({ error: 'Cannot create Customer.' })
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.generateToken = async (req, res) => {
	// send email verification token
	try {
		const genToken = crypto
			.randomBytes(3)
			.toString('hex')
			.toUpperCase()
		// update or create new token document
		await Token.updateOne(
			{ customer: req.customer._id },
			{
				$set: {
					token: genToken,
					created: new Date()
				}
			},
			{ upsert: true, runValidators: true }
		)

		res.status(200).send({ token: genToken })

		// Send the email (TODO IN CLIENT APP)
		/*
		const transporter = nodemailer.createTransport(
			mailhelper.getMailerService()
		)
		const verificationMailOptions = mailhelper.createVerificationMail(
			req.customer.email,
			req.customer.firstname,
			genToken
		)
		transporter.sendMail(verificationMailOptions, function(err) {
			if (err) {
				return res.status(500).send({ msg: err.message })
			}
			res.status(200).send({
				message:
					'A verification email has been sent to ' +
					req.customer.email +
					'.'
			})
		})*/
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}

exports.verifyToken = async (req, res) => {
	// verify supplied token
	try {
		const customer = await Customer.findOne({ _id: req.customer._id })
		if (customer) {
			if (customer.status.isVerified) {
				return res
					.status(200)
					.send({ message: 'Customer already verified' })
			} else {
				const verification = await Token.findOne({
					customer: req.customer._id
				})
				if (verification) {
					if (verification.token === req.body.token.toUpperCase()) {
						// set customer status verified to true
						customer.status.isVerified = true
						await customer.save()
						return res
							.status(200)
							.send({ message: 'Customer email is now verified' })
					} else {
						return res.status(400).send({
							error: 'Invalid verification code'
						})
					}
				} else {
					return res.status(400).send({
						error: 'Supplied verification code has expired'
					})
				}
			}
		}

		res.status(400).json({ error: 'Invalid verification request' })
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}

exports.loginCustomer = async (req, res) => {
	//Login a registered Customer
	try {
		const { email, password } = req.body
		const customer = await Customer.findByCredentials(email, password)
		if (!customer) {
			return res.status(401).send({
				error: 'Login failed! Check authentication credentials'
			})
		}
		const token = await customer.generateAuthToken()
		const user = {
			name: customer.firstname,
			email: customer.email,
			status: customer.status
		}
		res.send({ user, token })
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.logoutCustomer = async (req, res) => {
	// Log Customer out of the application
	try {
		req.customer.tokens = req.customer.tokens.filter(token => {
			return token.token != req.token
		})
		await req.customer.save()
		res.send()
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}

exports.logoutAll = async (req, res) => {
	// Log Customer out of all devices
	try {
		req.customer.tokens.splice(0, req.customer.tokens.length)
		await req.customer.save()
		res.send()
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}

exports.patchCustomer = async (req, res) => {
	// Edit Customer details
	if (req.customer) {
		try {
			const updateProps = {}
			for (let op of req.body) {
				updateProps[op.property] = op.value
			}
			const result = await Customer.updateOne(
				{ _id: req.customer._id },
				{ $set: updateProps },
				{ runValidators: true }
			)
			if (!result || result.n == 0) {
				return res
					.status(404)
					.send({ error: 'Error updating customer details.' })
			}
			res.status(200).json({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'CustomerID is invalid.' })
	}
}
