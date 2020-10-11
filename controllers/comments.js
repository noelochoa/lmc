const Comment = require('../models/Comment')

exports.postComment = async (req, res) => {
	// Post comment
	try {
		const comment = new Comment(req.body)
		if (comment) {
			await comment.postComment()
			res.status(200).send(comment)
		} else {
			res.status(500).send({ error: 'Cannot post comment.' })
		}
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getComment = async (req, res) => {
	// getComments for product
	if (req.params.commentID) {
		try {
			const comment = await Comment.findOne({
				_id: req.params.commentID
			})
				.populate('author', 'lastname firstname name')
				.populate('product', 'name')
			res.status(200).send(comment)
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(404).send({ error: 'No comment id provided.' })
	}
}

exports.getComments = async (req, res) => {
	// getComments for product
	if (req.params.productID) {
		try {
			const comments = await Comment.find({
				product: req.params.productID
			}).sort({ created: 1 })
			if (!comments) {
				return res.status(201).send({ error: 'No Comments.' })
			}
			res.status(200).send({ comments })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(404).send({ error: 'No product id provided.' })
	}
}

exports.getAllComments = async (req, res) => {
	// get all comments
	try {
		const comments = await Comment.find()
			.populate('author', 'firstname lastname name')
			.populate('product', 'name seoname')
			.sort({ created: -1 })
		res.status(200).send(comments)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.getRecentComments = async (req, res) => {
	// get Recent Comments for dashboard
	try {
		const comments = await Comment.find()
			.populate('author', 'firstname lastname name')
			.sort({ created: -1 })
			.limit(5)
		res.status(200).send(comments)
	} catch (error) {
		res.status(400).send({ error: error.message })
	}
}

exports.editComment = async (req, res) => {
	// Edit comment details
	if (req.params.commentID) {
		try {
			const updateProps = {}
			for (let op of req.body) {
				updateProps[op.property] = op.value
			}

			const result = await Comment.updateOne(
				{ _id: req.params.commentID },
				{ $set: updateProps },
				{ runValidators: true }
			)
			if (!result || result.n == 0) {
				return res
					.status(404)
					.send({ error: 'Error updating comment.' })
			}
			res.status(200).send({ message: 'Successfully updated.' })
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send({ error: 'Comment ID is invalid.' })
	}
}
