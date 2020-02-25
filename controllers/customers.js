const Customer = require('../models/Customer')

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
		const customer = new Customer(req.body)
		if (customer) {
			await customer.save()
			const token = await customer.generateAuthToken()
			const user = { name: customer.name, email: customer.email }
			res.status(201).send({ user, token })
		} else {
			res.status(400).send({ error: 'Cannot create Customer.' })
		}
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
