const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const { check } = require('express-validator')

const customerSchema = mongoose.Schema({
	accountType: {
		type: String,
		enum: ['regular', 'reseller', 'partner'],
		default: 'regular'
	},
	lastname: {
		type: String,
		required: true,
		trim: true,
		max: 256
	},
	firstname: {
		type: String,
		required: true,
		trim: true,
		max: 256
	},
	address: {
		type: String,
		trim: true,
		max: 512
	},
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		validate: value => {
			if (!validator.isEmail(value)) {
				throw new Error('Invalid email address')
			}
		}
	},
	phonenumber: {
		type: String,
		unique: true,
		sparse: true,
		validate: value => {
			if (!validator.isMobilePhone(value)) {
				throw new Error('Invalid phone number')
			}
		}
	},
	password: {
		type: String,
		required: true,
		minLength: 6
	},
	status: {
		isActive: {
			type: Boolean,
			required: true,
			default: true
		},
		isVerified: {
			type: Boolean,
			required: true,
			default: false
		},
		isSMSVerified: {
			type: Boolean,
			required: true,
			default: false
		},
		isResellerApproved: {
			type: Boolean,
			required: true,
			default: false
		}
	},
	notification: {
		isEmailAllowed: {
			type: Boolean,
			required: true,
			default: true
		},
		isSMSAllowed: {
			type: Boolean,
			required: true,
			default: false
		}
	},
	joined: {
		type: Date,
		required: true,
		default: new Date()
	},
	login: {
		type: Date
	},
	tokens: [
		{
			token: {
				type: String,
				required: true
			}
		}
	]
})

customerSchema.pre('save', async function(next) {
	// Hash the password before saving the Customer model
	const customer = this
	if (customer.isModified('password')) {
		customer.password = await bcrypt.hash(customer.password, 10)
	}
	next()
})

customerSchema.pre('updateOne', async function(next) {
	// Hash the password before saving the Customer model
	const updateData = this.getUpdate().$set
	if (updateData.password) {
		this.getUpdate().$set.password = await bcrypt.hash(
			updateData.password,
			10
		)
	}
	next()
})

customerSchema.methods.generateAuthToken = async function(csrfToken) {
	// Generate an auth token for the Customer
	const customer = this
	const token = jwt.sign(
		{ _id: customer._id, _csrf_token: csrfToken },
		process.env.JWT_STORE_KEY,
		{
			expiresIn: '1 week'
		}
	)
	customer.tokens = customer.tokens.concat({ token })
	await customer.save()
	return token
}

customerSchema.statics.findByCredentials = async (email, password) => {
	// Search for a Customer by email and password.
	if (password && email) {
		const customer = await Customer.findOne({
			email: email,
			'status.isActive': true
		})

		if (!customer) {
			throw new Error('Invalid login credentials')
		}
		const isPasswordMatch = await bcrypt.compare(
			password,
			customer.password
		)
		if (!isPasswordMatch) {
			throw new Error('Invalid login credentials')
		}
		return customer
	}
	throw new Error('Missing expected params')
}

customerSchema.statics.removeToken = async token => {
	// Remove token from list
	const customer = await Customer.findOne({ 'tokens.token': token })
	if (customer) {
		customer.tokens = customer.tokens.filter(item => {
			return item.token != token
		})
		await customer.save()
		return true
	}
	return false
}

customerSchema.statics.getCustomers = async function() {
	// Get all customers
	const Customers = await Customer.find()
	if (!Customers) {
		throw new Error('Nothing found')
	}
	return Customers
}

customerSchema.statics.createEntry = async reqBody => {
	// check and create Customer entry
	let customer = await Customer.findOne({ email: reqBody.email })
	if (customer) {
		throw new Error('Email is already used')
	} else {
		customer = new Customer(reqBody)
		customer.status.isVerified = false
		customer.status.isResellerApproved = false
		customer.status.isSMSVerified = false
	}

	return customer
}

const Customer = mongoose.model('Customer', customerSchema, 'Customers')

module.exports = Customer
