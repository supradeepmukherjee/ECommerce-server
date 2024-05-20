import { createHmac } from 'crypto'
import { tryCatch } from "../middlewares/error.js"
import { instance } from '../server.js'
import { Payment } from '../models/Payment.js'
import { ErrorHandler } from "../utils/utility.js"
import { User } from '../models/User.js'
import { Order } from '../models/Order.js'

const checkout = tryCatch(async (req, res, next) => {
    const { amount, order } = req.body
    const { shippingInfo, orderedItems, itemsSubtotal, tax, shippingCharge, amt } = order
    const options = {
        amount: Number(amount * 100),
        currency: "INR",
    }
    const paymentOrder = await instance.orders.create(options)
    const createdOrder = await Order.create({
        shippingInfo,
        orderedItems,
        itemsSubtotal,
        tax,
        shippingCharge,
        amt,
        user: req.user._id,
        paymentInfo: {
            orderID: paymentOrder.id,
            status: 'Pending'
        }
    })
    res.status(201).json({ success: true, order: paymentOrder, createdOrder })
})

const verifyPayment = tryCatch(async (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body
    const body = `${razorpay_order_id}|${razorpay_payment_id}`
    const expectedSignature =
        createHmac('sha256', process.env.RAZORPAY_SECRET)
            .update(body.toString())
            .digest('hex')
    const { signature } = await Payment.create({
        paymentID: razorpay_payment_id,
        orderID: razorpay_order_id,
        signature: razorpay_signature
    })
    if (expectedSignature !== signature) return next(new ErrorHandler(400, 'Invalid Payment Signature'))
    const order = await Order.findOneAndUpdate(
        { 'paymentInfo.orderID': razorpay_order_id },
        {
            paymentInfo: {
                paymentID: razorpay_payment_id,
                status: 'Successful'
            },
            paidAt: Date.now()
        },
        { new: true }
    )
    const user = await User.findById(req.user._id)
    user.cartItems = []
    await user.save()
    res.redirect(`${process.env.CLIENT_URL}/success?ref=${razorpay_payment_id}`)
})

const key = async (req, res) => res.status(200).json({ success: true, key: process.env.RAZORPAY_KEY })

export { checkout, key, verifyPayment }