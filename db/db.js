const mongoose = require('mongoose')

mongoose
	.connect(process.env.MONGODB_URL, {
		useNewUrlParser: true,
		useUnifiedTopology: false,
		useCreateIndex: true
	})
	.then(res => {
		console.log('MongoDB connected!')
	})
	.catch(error => {
		console.log(error)
	})
