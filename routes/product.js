import { Router } from 'express'
import { createProduct, delProduct, delReview, getAllProducts, getProducts, productDetails, review, updateProduct } from '../controllers/product.js'
import { authoriseRoles, isAuthenticated } from '../middlewares/auth.js'
import { multerImgs } from '../middlewares/multer.js'

const app = Router()

app.get('/products', getProducts)
app.get('/product/:id', productDetails)

app.use(isAuthenticated)
app.put('/review', review)
app.delete('/review/:id', delReview)

app.use(authoriseRoles('Admin'))
app.get('/admin/products', getAllProducts)
app.post('/admin/newproduct', multerImgs, createProduct)
app.route('/admin/product/:id')
    .put(multerImgs, updateProduct)
    .delete(delProduct)

export default app