const mongoose = require('mongoose')

mongoose
	.connect(process.env.MONGODB_URL, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: false
	})
	.then((res) => {
		console.log('MongoDB connected!')
	})
	.catch((error) => {
		console.log(error)
	})
