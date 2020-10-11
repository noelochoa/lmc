const mongoose = require('mongoose')
const Customer = require('./Customer')
const Product = require('./Product')

const commentSchema = mongoose.Schema(
	{
		author: {
			type: mongoose.Types.ObjectId,
			ref: 'Customer',
			required: true,
			validate: {
				validator: (val) => {
					return Customer.exists({
						_id: val,
						'status.isVerified': true
					})
				},
				message: 'Customer id is invalid'
			}
		},
		product: {
			type: mongoose.Types.ObjectId,
			ref: 'Product',
			required: true,
			validate: {
				validator: (val) => {
					return Product.exists({ _id: val })
				},
				message: 'Product id is invalid'
			}
		},
		// parent: {
		// 	type: mongoose.Types.ObjectId,
		// 	ref: 'Comment',
		// 	validate: {
		// 		validator: (val) => {
		// 			return Comment.exists({ _id: val })
		// 		},
		// 		message: 'Parent comment is invalid'
		// 	}
		// },
		comment: {
			type: String,
			required: true,
			trim: true
		},
		reply: {
			type: String,
			trim: true
		},
		replyAuthor: {
			type: String,
			trim: true,
			max: 256
		},
		isFlagged: {
			type: Boolean,
			required: true,
			default: false
		},
		created: {
			type: Date,
			required: true,
			default: Date.now
		}
	},
	{
		toJSON: {
			virtuals: true
		}
	}
)

commentSchema.methods.flagComment = async function (bool) {
	const comment = this
	comment.isFlagged = bool
	await comment.save()
}

commentSchema.methods.postComment = async function () {
	const comment = this
	await comment.save()
	result = await Product.addNewComment(comment.product, comment._id)
	if (!result) {
		throw new Error('Comment can not be posted')
	}
	return comment
}

commentSchema.statics.getComments = async function () {
	const comments = await Comment.find().sort({ created: -1 })
	if (!comments) {
		throw new Error('Nothing found')
	}
	return comments
}

commentSchema.statics.toHumanReadableDate = (timestamp) => {
	if (timestamp) {
		return new Date(timestamp).toUTCString()
	}
	return timestamp
}

const Comment = mongoose.model('Comment', commentSchema, 'Comments')

module.exports = Comment
