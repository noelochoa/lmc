const express = require('express')

const customerRouter = require('./routers/customer')
const userRouter = require('./routers/user')
const productRouter = require('./routers/product')
const commentRouter = require('./routers/comment')
const categoryRouter = require('./routers/category')
const invalidDateRouter = require('./routers/invaliddate')

const port = process.env.PORT
require('./db/db')

const app = express()

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

app.use('/customers', customerRouter)
app.use('/users', userRouter)
app.use('/products', productRouter)
app.use('/comments', commentRouter)
app.use('/categories', categoryRouter)
app.use('/invaliddates', invalidDateRouter)

// Invalid Route Error Handler
app.use(async (req, res, next) => {
	res.status(404).send({ error: { message: 'Not Found' } })
})

// Internal Error Handler
app.use(async (err, req, res, next) => {
	res.status(500).send({ error: { message: err.message } })
})

app.listen(port, () => {
	console.log(`Server running on port ${port}`)
})
