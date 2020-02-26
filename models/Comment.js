const mongoose = require('mongoose')
const Customer = require('./Customer')
const Product = require('./Product')

const commentSchema = mongoose.Schema({
	author: {
		type: mongoose.Types.ObjectId,
		ref: 'Customer',
		required: true,
		validate: {
			validator: val => {
				return Customer.exists({ _id: val, 'status.isVerified': true })
			},
			message: 'Customer id is invalid'
		}
	},
	product: {
		type: mongoose.Types.ObjectId,
		ref: 'Product',
		required: true,
		validate: {
			validator: val => {
				return Product.exists({ _id: val })
			},
			message: 'Product id is invalid'
		}
	},
	parent: {
		type: mongoose.Types.ObjectId,
		ref: 'Comment',
		validate: {
			validator: val => {
				return Comment.exists({ _id: val })
			},
			message: 'Parent comment is invalid'
		}
	},
	comment: {
		type: String,
		required: true,
		trim: true
	},
	isFlagged: {
		type: Boolean,
		required: true,
		default: true
	},
	created: {
		type: Date,
		required: true,
		default: Date.now
	}
})

commentSchema.methods.flagComment = async function() {
	const comment = this
	await comment.save()
}

commentSchema.methods.postComment = async function() {
	const comment = this
	await comment.save()
	result = await Product.addNewComment(comment.product, comment._id)
	if (!result) {
		throw new Error('Comment can not be posted')
	}
	return comment
}

commentSchema.statics.getComments = async function() {
	const comments = await Comment.find().sort({ created: -1 })
	if (!comments) {
		throw new Error('Nothing found')
	}
	return comments
}

commentSchema.statics.toHumanReadableDate = timestamp => {
	if (timestamp) {
		return new Date(timestamp).toUTCString()
	}
	return timestamp
}

const Comment = mongoose.model('Comment', commentSchema, 'Comments')

module.exports = Comment
