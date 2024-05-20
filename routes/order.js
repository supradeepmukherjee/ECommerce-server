import { Router } from 'express'
import { allOrders, delOrder, myOrders, singleOrder, updateOrderStatus } from '../controllers/order.js'
import { authoriseRoles } from '../middlewares/auth.js'

const app = Router()

app.get('/myorders', myOrders)
app.get('/order/:id', singleOrder)

app.use(authoriseRoles('Admin'))
app.get('/admin/allorders', allOrders)
app.delete('/admin/delorder/:id', delOrder)
app.put('/admin/updateorderstatus/:id', updateOrderStatus)

export default app