const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const userSchema = mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true
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
	password: {
		type: String,
		required: true,
		minLength: 6
	},
	isActive: {
		type: Boolean,
		required: true,
		default: true
	}
})

userSchema.pre('save', async function (next) {
	// Hash the password before saving the user model
	const user = this
	if (user.isModified('password')) {
		user.password = await bcrypt.hash(user.password, 10)
	}
	next()
})

userSchema.pre('updateOne', async function (next) {
	// Hash the password before saving the user model
	const updateData = this.getUpdate().$set
	if (updateData.password) {
		this.getUpdate().$set.password = await bcrypt.hash(
			updateData.password,
			10
		)
	}
	next()
})

userSchema.methods.generateAuthToken = async function (prevXSRF) {
	// Generate an auth token for the user
	const user = this
	const xsrf = crypto.randomBytes(48).toString('base64')
	const xsrfHash = await bcrypt.hash(xsrf, 10)

	const token = jwt.sign(
		{ _id: user._id, _xref: xsrfHash, _prev: prevXSRF || '' },
		process.env.JWT_KEY,
		{
			expiresIn: '1h'
		}
	)
	//user.tokens = user.tokens.concat({ token })
	//await user.save()
	return { token, xsrf }
}

userSchema.statics.findByCredentials = async (email, password) => {
	// Search for a user by email and password.
	if (password && email) {
		const user = await User.findOne({ email: email, isActive: true })
		if (!user) {
			throw new Error('Invalid or unknown email.')
		}
		const isPasswordMatch = await bcrypt.compare(password, user.password)
		if (!isPasswordMatch) {
			throw new Error('Invalid password.')
		}
		return user
	}
	throw new Error('Missing login credentials.')
}

userSchema.statics.getUsers = async function () {
	const users = await User.find()
	if (!users) {
		throw new Error('Nothing found.')
	}
	return users
}

const User = mongoose.model('User', userSchema, 'Users')

module.exports = User
