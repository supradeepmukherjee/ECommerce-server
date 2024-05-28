import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { User } from '../models/User.js'
import { tryCatch } from "../middlewares/error.js"
import { ErrorHandler } from "../utils/utility.js"

const singleOrder = tryCatch(async (req, res, next) => {
    const order = await Order.findById(req.params.id).populate('user', 'name email')
    if (!order) return next(new ErrorHandler(404, 'Order not Found'))
    res.status(200).json({ success: true, order })
})

const myOrders = tryCatch(async (req, res, next) => {
    const orders = await Order.find({ user: req.user._id })
    res.status(200).json({ success: true, orders })
})

const allOrders = tryCatch(async (req, res, next) => { // admin
    const products = await Product.find({ user: req.user._id })
    const orders = await Order.find().populate('user', 'name email')
    let filteredOrders = []
    for (let i = 0; i < orders.length; i++) {
        for (let j = 0; j < orders[i].orderedItems.length; j++) {
            for (let k = 0; k < products.length; k++) {
                if (orders[i].orderedItems[j].product.toString() === products[k]._id.toString()) {
                    filteredOrders.push(orders[i])
                }
            }
        }
    }
    let totalAmt = 0
    filteredOrders.forEach(order => totalAmt += order.amt);
    res.status(200).json({ totalAmt, success: true, orders: filteredOrders })
})

const updateOrderStatus = tryCatch(async (req, res, next) => { // admin
    const order = await Order.findById(req.params.id)
    if (!order) return next(new ErrorHandler(404, 'Order not Found'))
    const updateStock = async (id, qty) => {
        const product = await Product.findById(id)
        product.stock -= qty
        await product.save()
    }
    order.orderStatus = req.body.status
    const user = await User.findById(order.user)
    if (req.body.status === 'Delivered') {
        order.orderedItems.forEach(async item => await updateStock(item.product, item.qty))
        order.deliveredAt = Date.now()
        for (let i = 0; i < order.orderedItems.length; i++) {
            const product = order.orderedItems.product[i]
            if (!user.productsDelivered.includes(product)) user.productsDelivered.push(product)
        }
    }
    await Promise.all([order.save(), user.save()])
    res.status(200).json({ success: true, msg: 'Order status updated' })
})

const delOrder = tryCatch(async (req, res, next) => { // admin
    const order = await Order.findById(req.params.id)
    if (!order) return next(new ErrorHandler(404, 'Order not Found'))
    await Order.deleteOne({ _id: order._id })
    res.status(200).json({ success: true, msg: "order deleted" })
})

export { allOrders, delOrder, myOrders, singleOrder, updateOrderStatus }