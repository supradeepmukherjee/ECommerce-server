import cookieParser from 'cookie-parser'
import cors from 'cors'
import { config } from 'dotenv'
import express, { json, urlencoded } from 'express'
import { isAuthenticated } from './middlewares/auth.js'
import { errorMiddleware } from './middlewares/error.js'
import order from './routes/order.js'
import payment from './routes/payment.js'
import product from './routes/product.js'
import user from './routes/user.js'

const app = express()

if (process.env.NODE_ENV !== 'production') config({ path: 'config/config.env' })

app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:4173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        process.env.CLIENT_URL
    ],
    credentials: true
}))
app.use(json({ limit: '50mb' }))
app.use(cookieParser())
app.use(urlencoded({ limit: '50mb', extended: true }))

app.use('/api/v1/product', product)
app.use('/api/v1/user', user)

app.use(isAuthenticated)
app.use('/api/v1/order', order)
app.use('/api/v1/payment', payment)

app.use(errorMiddleware)

// if (process.env.NODE_ENV === 'production') {
//     app.use(static(join(__dirname, '../frontend/build')))
//     app.get('*', (req, res) => res.sendFile(resolve(__dirname, "../frontend/build/index.html")))
// }

export default app