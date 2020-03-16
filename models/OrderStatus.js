const mongoose = require('mongoose')
// const validator = require('validator')

const statusSchema = mongoose.Schema({
	status: {
		type: String,
		unique: true,
		required: true
	},
	step: {
		type: Number,
		required: true
	}
})

const OrderStatus = mongoose.model('OrderStatus', statusSchema, 'OrderStatus')

module.exports = OrderStatus
