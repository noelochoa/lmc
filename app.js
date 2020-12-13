const express = require('express')
// const compression = require("compression")

const searchRouter = require('./routers/search')
const psaRouter = require('./routers/announcement')
const productRouter = require('./routers/product')
const discountRouter = require('./routers/discount')
const basketRouter = require('./routers/basket')
const profileRouter = require('./routers/profile')
const userRouter = require('./routers/user')
const customerRouter = require('./routers/customer')
const commentRouter = require('./routers/comment')
const categoryRouter = require('./routers/category')
const invalidDateRouter = require('./routers/invaliddate')
const ordersRouter = require('./routers/orders')

const port = process.env.PORT
require('./db/db')

const app = express()
let ALLOWED_ORIGINS = ['http://localhost:8080', 'http://localhost:8081']

// Add headers
app.use(function (req, res, next) {
	let origin = req.headers.origin
	let allowed =
		ALLOWED_ORIGINS.indexOf(origin) >= 0 ? origin : ALLOWED_ORIGINS[0]

	// Website you wish to allow to connect
	res.setHeader('Access-Control-Allow-Origin', allowed)
	// Request methods you wish to allow
	res.setHeader(
		'Access-Control-Allow-Methods',
		'GET, POST, OPTIONS, PUT, PATCH, DELETE'
	)
	// Request headers you wish to allow
	res.setHeader(
		'Access-Control-Allow-Headers',
		'X-Requested-With,content-type'
	)
	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader('Access-Control-Allow-Credentials', false)
	// Pass to next layer of middleware
	next()
})
// gzip ( handled by NGINX )
// app.use(compression({ threshold: 0 }));
app.use('/images', express.static('images'))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

app.use('/search', searchRouter)
app.use('/psa', psaRouter)
app.use('/products', productRouter)
app.use('/discounts', discountRouter)
app.use('/basket', basketRouter)
app.use('/profile', profileRouter)
app.use('/users', userRouter)
app.use('/customers', customerRouter)
app.use('/comments', commentRouter)
app.use('/categories', categoryRouter)
app.use('/invaliddates', invalidDateRouter)
app.use('/orders', ordersRouter)

// Invalid Route Error Handler
app.use(async (req, res, next) => {
	res.status(404).send({ error: 'Not Found' })
})

// Internal Error Handler
app.use(async (err, req, res, next) => {
	res.status(500).send({ error: err.message })
})

app.listen(port, () => {
	console.log(`Server running on port ${port}`)
})
