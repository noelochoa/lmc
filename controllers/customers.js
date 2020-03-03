const crypto = require('crypto')
const sgmail = require('@sendgrid/mail')
const twilio = require('twilio')
const { validationResult } = require('express-validator')

const mailhelper = require('../helpers/mailhelper')
const smshelper = require('../helpers/smshelper')

const Customer = require('../models/Customer')
const Token = require('../models/Token')

exports.getAllCustomers = async (req, res) => {
	// Dump all
	try {
		const customers = await Customer.getCustomers()
		if (!customers) {
			return res.status(404).send({ error: 'Customers not found.' })
		}
		res.status(200).send(customers)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.createNewCustomer = async (req, res) => {
	// Create a new Customer
	try {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(422).send({ error: 'Invalid input(s) format.' })
		}

		const customer = await Customer.createEntry(req.body)
		if (customer) {
			await customer.save()

			const genToken = crypto
				.randomBytes(3)
				.toString('hex')
				.toUpperCase()

			// update or create new token document for verification
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
			const csrfToken = crypto.randomBytes(48).toString('hex')
			const token = await customer.generateAuthToken(csrfToken)
			const user = {
				name: customer.firstname,
				email: customer.email,
				status: customer.status
			}
			res.status(201).send({ user, token, csrfToken })
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
			{ customer: req.customer._id, verify: 'email' },
			{
				$set: {
					token: genToken,
					verify: 'email',
					created: new Date()
				}
			},
			{ upsert: true, runValidators: true }
		)

		//res.status(200).send({ token: genToken })

		// Send the email (TODO IN CLIENT APP)
		/*
		sgmail.setApiKey(process.env.SENDGRID_API_KEY)
		const verificationMailOptions = mailhelper.createVerificationMail(
			req.customer.email,
			req.customer.firstname,
			genToken
		)
		await sgmail.send(verificationMailOptions)
		res.status(200).send({
			message:
				'A verification code has been sent to your email: ' +
				req.customer.email
		})*/
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}

exports.verifyToken = async (req, res) => {
	// verify supplied token
	try {
		const customer = await Customer.findOne({
			_id: req.customer._id,
			'status.isVerified': false
		})
		if (customer) {
			const verification = await Token.findOne({
				customer: req.customer._id,
				verify: 'email'
			})
			if (verification) {
				if (verification.token === req.body.token.toUpperCase()) {
					// set customer status verified to true
					customer.status.isVerified = true
					await customer.save()
					return res
						.status(200)
						.send({ message: 'Customer account has been verified' })
				} else {
					return res.status(400).send({
						error: 'Verification code does not match'
					})
				}
			} else {
				return res.status(400).send({
					error: 'Supplied verification code has expired'
				})
			}
		} else {
			return res
				.status(200)
				.send({ message: 'Customer already verified' })
		}
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}

exports.generateSMSToken = async (req, res) => {
	// send SMS verification code to phone number
	try {
		const genToken = crypto
			.randomBytes(3)
			.toString('hex')
			.toUpperCase()
		// update or create new token document
		await Token.updateOne(
			{ customer: req.customer._id, verify: 'sms' },
			{
				$set: {
					token: genToken,
					verify: 'sms',
					created: new Date()
				}
			},
			{ upsert: true, runValidators: true }
		)

		// res.status(200).send({ token: genToken })
		/*
		const client = new twilio(
			process.env.TWILIO_ACCOUNT_SID,
			process.env.TWILIO_AUTH_TOKEN
		)
		await client.messages.create(
			smshelper.createVerificationSMS(
				req.customer.phonenumber,
				req.customer.firstname,
				genToken
			)
		)
		res.status(200).send({
			message:
				'A verification code has been sent to your phonenumber: ' +
				req.customer.phonenumber
		})*/
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}

exports.verifySMSToken = async (req, res) => {
	// verify phonenumber through supplied code
	try {
		const customer = await Customer.findOne({
			_id: req.customer._id,
			'status.isSMSVerified': false
		})
		if (customer) {
			const verification = await Token.findOne({
				customer: req.customer._id,
				verify: 'sms'
			})
			if (verification) {
				if (verification.token === req.body.token.toUpperCase()) {
					// set customer status verified to true
					customer.status.isSMSVerified = true
					await customer.save()
					return res.status(200).send({
						message: 'Customer phone number has been verified'
					})
				} else {
					return res.status(400).send({
						error: 'Verification code does not match'
					})
				}
			} else {
				return res.status(400).send({
					error: 'Supplied verification code has expired'
				})
			}
		} else {
			return res
				.status(200)
				.send({ message: 'Customer already verified phone number' })
		}
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}

exports.getCustomer = async (req, res) => {
	//Login a registered Customer
	try {
		const customer = req.customer
		res.status(200).send({ customer })
	} catch (error) {
		res.status(400).send({ error: error.message })
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
		const csrfToken = crypto.randomBytes(48).toString('hex')
		const token = await customer.generateAuthToken(csrfToken)
		const user = {
			name: customer.firstname,
			email: customer.email,
			status: customer.status
		}
		res.send({ user, token, csrfToken })
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
			res.status(200).send({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'CustomerID is invalid.' })
	}
}
