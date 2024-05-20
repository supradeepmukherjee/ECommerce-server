import { Router } from 'express'
import { addItemToCart, allUsers, cartItems, forgotPassword, getShipInfo, login, logout, register, removeItem, resetPassword, updatePassword, updateProfile, updateRole, updateShip, userDetails, viewUser } from '../controllers/user.js'
import { authoriseRoles, isAuthenticated } from '../middlewares/auth.js'
import { singleChavi } from '../middlewares/multer.js'

const app = Router()

app.post('/register', singleChavi, register)
app.post('/login', login)
app.get('/logout', logout)
app.post('/forgotpassword', forgotPassword)
app.put('/resetpassword/:token', resetPassword)

app.use(isAuthenticated)
app.get('/me', userDetails)
app.put('/updatepassword', updatePassword)
app.put('/updateprofile', singleChavi, updateProfile)
app.put('/addtocart', addItemToCart)
app.get('/cartitems', cartItems)
app.get('/getship', getShipInfo)
app.put('/update-ship', updateShip)
app.put('/removeitem/:id', removeItem)

app.use(authoriseRoles('Admin'))
app.get('/admin/users', allUsers)
app.put('/admin/updaterole/:id', updateRole)
app.get('/admin/user/:id', viewUser)

export default app