const Customer = require('../models/Customer')
const Product = require('../models/Product')
const Order = require('../models/Order')

exports.findItems = async (req, res) => {
	// Find search query from Customers, Products, or Orders
	if (req.query.search) {
		try {
			let ret = []
			const search = new RegExp(req.query.search.trim(), 'i')
			const result = await Promise.all([
				Customer.find({
					$or: [
						{ firstname: { $in: [search] } },
						{ lastname: { $in: [search] } }
					]
				})
					.select(
						'id firstname lastname accountType status joined login'
					)
					.limit(3),
				Product.find({
					name: { $in: [search] }
				})
					.populate('category')
					.select('id name seoname category')
					.limit(3),
				Order.findOrders(search)
			])

			// BUILD Search ITEMS
			result.forEach((resGrp, idx) => {
				let tmp = {
					category: ['Customers', 'Products', 'Orders'][idx % 3],
					path: ['/accounts', '/products', '/orders'][idx % 3],
					items: []
				}
				switch (idx) {
					case 0:
						resGrp.forEach((item) => {
							tmp.items.push({
								id: item._id,
								title: item.firstname + ' ' + item.lastname,
								link: '/accounts/edit/' + item._id,
								caption: item.accountType
							})
						})
						break
					case 1:
						resGrp.forEach((item) => {
							tmp.items.push({
								id: item._id,
								title: item.name,
								link: '/products/edit/' + item._id,
								caption: item.category.name
							})
						})
						break
					case 2:
						resGrp.forEach((item) => {
							tmp.items.push({
								id: item._id,
								title: item.orderRef
									? item.orderRef
									: 'Untitled',
								link: '/orders/process/' + item._id,
								caption: item.status.status
							})
						})
						break
				}
				ret.push(tmp)
			})
			res.status(200).send(ret)
		} catch (error) {
			res.status(400).send({ error: error.message })
		}
	} else {
		res.status(400).send('Missing search string.')
	}
}
