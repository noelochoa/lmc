const mkdirp = require('mkdirp')

// Multer product images settings
const imageStorage = {
	destination: async (req, file, callback) => {
		const { productID } = req.params
		if (productID) {
			const path = `./images/${productID}`
			await mkdirp.sync(path)
			callback(null, path)
		} else {
			callback(null, './images/')
		}
	},
	filename: function(req, file, cb) {
		const uniqkey = Math.round(Math.random() * 1e9)
		cb(null, `${file.fieldname}_${uniqkey}_${file.originalname}`)
	}
}

const fileFilter = (req, file, cb) => {
	if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
		cb(null, true)
	} else {
		cb(null, false)
	}
}

const imageLimits = {
	fileSize: 1024 * 1024 * 4, // 4MB
	files: 10
}

module.exports = {
	fileFilter,
	imageStorage,
	imageLimits
}
