const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const customerSchema = mongoose.Schema(
	{
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
			validate: (value) => {
				if (!validator.isEmail(value)) {
					throw new Error('Invalid email address')
				}
			}
		},
		phonenumber: {
			type: String,
			trim: true,
			unique: true,
			sparse: true,
			validate: (value) => {
				if (!value) return true
				const mobilePattern = /^\+\d{1,3}\s\d{1,14}(\s\d{1,13})?/
				return mobilePattern.test(
					value.replace(new RegExp(/[-()]/g), '')
				)
				// if (!validator.isMobilePhone(rawNum)) {
				// 	throw new Error('Invalid phone number')
				// }
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
			default: Date.now
		},
		login: {
			type: Date
		}
		// tokens: [
		// 	{
		// 		token: {
		// 			type: String,
		// 			required: true
		// 		}
		// 	}
		// ]
	},
	{
		toJSON: {
			virtuals: true
		}
	}
)

customerSchema.virtual('name').get(function () {
	return this.firstname + ' ' + this.lastname
})

customerSchema.pre('save', async function (next) {
	// Hash the password before saving the Customer model
	const customer = this
	if (customer.isModified('password')) {
		customer.password = await bcrypt.hash(customer.password, 10)
	}
	next()
})

customerSchema.pre('updateOne', async function (next) {
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

customerSchema.methods.generateAuthToken = async function (prevXSRF = '') {
	// Generate an auth token for the Customer
	const customer = this
	const xsrf = crypto.randomBytes(48).toString('base64')
	const xsrfHash = await bcrypt.hash(xsrf, 10)

	const token = jwt.sign(
		{ _id: customer._id, _xref: xsrfHash, _prev: prevXSRF || '' },
		process.env.JWT_STORE_KEY,
		{
			expiresIn: '1h'
		}
	)
	// customer.tokens = customer.tokens.concat({ token })
	// await customer.save()
	return { token, xsrf }
}

customerSchema.statics.findByCredentials = async (email, password) => {
	// Search for a Customer by email and password.
	if (password && email) {
		const customer = await Customer.findOne({
			email: email,
			'status.isActive': true
		})

		if (!customer) {
			throw new Error('Invalid login credentials.')
		}
		const isPasswordMatch = await bcrypt.compare(
			password,
			customer.password
		)
		if (!isPasswordMatch) {
			throw new Error('Invalid login credentials.')
		}
		return customer
	}
	throw new Error('Missing expected params')
}

customerSchema.statics.removeToken = async (token) => {
	// Remove token from list
	const customer = await Customer.findOne({ 'tokens.token': token })
	if (customer) {
		customer.tokens = customer.tokens.filter((item) => {
			return item.token != token
		})
		await customer.save()
		return true
	}
	return false
}

customerSchema.statics.getCustomers = async function (type) {
	// Get all customers
	let Customers
	if (!type || type.toLowerCase() === 'all') {
		Customers = await Customer.find().select(
			'id firstname lastname accountType status joined login'
		)
	} else {
		Customers = await Customer.find({
			accountType: { $regex: type, $options: 'i' }
		}).select('id firstname lastname accountType status joined login')
	}

	return Customers
}

customerSchema.statics.getPendingResellers = async (reqBody) => {
	// Select pending reseller accounts

	var filterFields = {
		__v: false,
		password: false,
		tokens: false,
		status: false
	}

	const pending = await Customer.find(
		{
			accountType: 'reseller',
			'status.isResellerApproved': false
		},
		filterFields
	)
	return pending
}

customerSchema.statics.getCustomerStats = async function () {
	// Get customers stats
	// const stats = await Customer.aggregate([
	// 	{ $group: { _id: '$accountType', count: { $sum: 1 } } }
	// ])
	const stats = await Customer.aggregate([
		{
			$facet: {
				Regular: [
					{ $match: { accountType: 'regular' } },
					{ $count: 'Regular' }
				],
				Reseller: [
					{ $match: { accountType: 'reseller' } },
					{ $count: 'Reseller' }
				],
				Partner: [
					{ $match: { accountType: 'partner' } },
					{ $count: 'Partner' }
				]
			}
		},
		{
			$project: {
				regular: {
					$ifNull: [{ $arrayElemAt: ['$Regular.Regular', 0] }, 0]
				},
				reseller: {
					$ifNull: [{ $arrayElemAt: ['$Reseller.Reseller', 0] }, 0]
				},
				partner: {
					$ifNull: [{ $arrayElemAt: ['$Partner.Partner', 0] }, 0]
				}
			}
		}
	])
	if (!stats || !stats[0]) {
		throw new Error('Error querying customer stats.')
	}
	return stats[0]
}

customerSchema.statics.createEntry = async (reqBody) => {
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
