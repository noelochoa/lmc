const crypto = require('crypto')
const sgmail = require('@sendgrid/mail')
const twilio = require('twilio')
const { validationResult } = require('express-validator')

const mailhelper = require('../helpers/mailhelper')
const smshelper = require('../helpers/smshelper')

const Customer = require('../models/Customer')
const Token = require('../models/Token')
const ResetToken = require('../models/ResetToken')

exports.getAllCustomers = async (req, res) => {
	// Get all accounts
	try {
		const { type } = req.query
		const customers = await Customer.getCustomers(type)
		res.status(200).send(customers)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getCustomerDetails = async (req, res) => {
	// Get account details
	if (req.params.accountID) {
		try {
			const customer = await Customer.findOne({
				_id: req.params.accountID
			}).select('-password')
			if (!customer) {
				return res.status(404).send({ error: 'Unknown account.' })
			}
			res.status(200).send(customer)
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(404).send({ error: 'Account ID is missing' })
	}
}

exports.getCustomerStats = async (req, res) => {
	try {
		const stats = await Customer.getCustomerStats()
		res.status(200).send(stats)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getPendingResellers = async (req, res) => {
	try {
		const stats = await Customer.getPendingResellers()
		res.status(200).send(stats)
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
				.randomBytes(88)
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

exports.sendResetToken = async (req, res) => {
	// send password reset token
	try {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(422).send({ error: 'Invalid input(s) provided.' })
		}
		const genToken = crypto.randomBytes(3).toString('hex').toUpperCase()
		// update or create new token document
		const result = await ResetToken.updateOne(
			{ email: req.body.email },
			{
				$set: {
					email: req.body.email,
					token: genToken,
					created: new Date()
				}
			},
			{ upsert: true, runValidators: true }
		)

		//res.status(200).send({ token: genToken })

		// Send the email (TODO IN CLIENT APP)
		if (!result || result.n == 0) {
			return res
				.status(500)
				.send({ error: 'Could not process your request.' })
		}

		sgmail.setApiKey(process.env.SENDGRID_API_KEY)
		const resetPWMailOptions = mailhelper.createPasswordResetMail(
			req.body.email,
			genToken
		)
		await sgmail.send(resetPWMailOptions)
		res.status(200).send({
			message:
				'A password reset code has been sent to your email: ' +
				req.body.email
		})
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}

exports.verifyNewPass = async (req, res) => {
	// verify supplied token
	try {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(422).send({ error: 'Invalid input(s) provided.' })
		}

		const resetToken = await ResetToken.findOne({
			email: req.body.email,
			token: req.body.token
		})

		// resettoken tied to email is found
		if (resetToken) {
			const customer = await Customer.findOne({
				email: req.body.email,
				'status.isActive': true
			})

			if (customer) {
				// Reset customer password
				customer.password = req.body.newpass
				await customer.save()

				res.status(200).send({ message: 'Password has been reset.' })

				// Delete this token
				await ResetToken.deleteOne({
					email: req.body.email,
					token: req.body.token
				})
			} else {
				return res.status(400).send({
					error: 'Password reset has failed.'
				})
			}
		} else {
			return res.status(400).send({
				message:
					'Supplied code or email is invalid. ' +
					'Recheck input fields or try to reissue a new password reset request.'
			})
		}
	} catch (error) {
		res.status(500).send({ error: error.message })
	}
}

exports.generateToken = async (req, res) => {
	// send email verification token
	try {
		const genToken = crypto.randomBytes(3).toString('hex').toUpperCase()
		// update or create new token document
		const result = await Token.updateOne(
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
		if (!result || result.n == 0) {
			return res
				.status(500)
				.send({ error: 'Could not process your request.' })
		}
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
		})
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
		const genToken = crypto.randomBytes(3).toString('hex').toUpperCase()
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
		req.customer.tokens = req.customer.tokens.filter((token) => {
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
	if (req.params.accountID) {
		try {
			const updateProps = {}
			for (let op of req.body) {
				updateProps[op.property] = op.value
			}
			// console.log(updateProps)
			const result = await Customer.updateOne(
				{ _id: req.params.accountID },
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

/*exports.patchCustomer = async (req, res) => {
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
}*/
