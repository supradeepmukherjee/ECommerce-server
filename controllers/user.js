import { v2 } from 'cloudinary'
import crypto from 'crypto'
import { tryCatch } from "../middlewares/error.js"
import { Product } from '../models/Product.js'
import { User } from '../models/User.js'
import { uploadToCloudinary } from '../utils/cloudinary.js'
import sendToken from '../utils/jwtToken.js'
import sendEmail from '../utils/sendEmail.js'
import { ErrorHandler } from "../utils/utility.js"

const register = tryCatch(async (req, res, next) => {
    const { name, email, password } = req.body
    const file = req.file
    let user = await User.findOne({ email })
    if (user) return next(new ErrorHandler(400, 'User already exists'))
    const chaviResult = await uploadToCloudinary([file], 'EcomChavi')
    user = await User.create({
        name,
        email,
        password,
        chavi: {
            public_id: chaviResult[0].id,
            url: chaviResult[0].url
        },
        shippingInfo: {
            address: '',
            city: '',
            state: '',
            country: '',
            pincode: '000000',
            phone: '0000000000'
        },
        productsDelivered: []
    })
    sendToken(user, 201, res, 'Registered Successfully')
})

const login = tryCatch(async (req, res, next) => {
    const { email, password } = req.body
    const user = await User.findOne({ email }).select('+password')
    if (!user) return next(new ErrorHandler(401, 'Email or Password is incorrect'))
    const passwordMatched = await user.comparePassword(password)
    if (!passwordMatched) return next(new ErrorHandler(401, 'Email or Password is incorrect'))
    sendToken(user, 201, res, `Welcome back, ${user.name}`)
})

const logout = tryCatch(async (req, res, next) =>
    res.status(200).cookie('token', null, {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        maxAge: 0,
    }).json({ success: true, msg: 'Logged Out' }))

const forgotPassword = tryCatch(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email })
    if (!user) return next(new ErrorHandler(404, 'Email ID not registered'))
    const token = await user.generateResetPasswordToken()
    await user.save()
    const resetPasswordUrl = `${req.protocol}://${req.get('host')}/resetpassword/${token}`
    const text = `Reset your password by clicking on the link below:\n\n ${resetPasswordUrl}`
    try {
        await sendEmail({ to: user.email, subject: 'Reset your password', text })
        res.status(200).json({ success: true, msg: `Password reset link has been sent to ${user.email}` })
    } catch (err) {
        console.log(err);
        user.resetPasswordToken = undefined
        user.resetPasswordExpire = undefined
        await user.save()
        res.status(500).json({ success: false, msg: err.msg })
    }
})

const resetPassword = tryCatch(async (req, res, next) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    })
    if (!user) return next(new ErrorHandler(400, 'Token is invalid or has expired'))
    if (req.body.pass !== req.body.cpass) return next(new ErrorHandler(400, 'Passwords do not match'))
    user.password = req.body.password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save()
    res.status(200).json({ success: true, msg: 'Password updated successfully' })
})

const userDetails = tryCatch(async (req, res, next) => {
    const user = await User.findById(req.user._id)
    if (!user) return next(new ErrorHandler(404, 'User not found'))
    res.status(200).json({ success: true, user })
})

const updatePassword = tryCatch(async (req, res, next) => {
    const user = await User.findById(req.user._id).select('+password')
    const { old, newP, cPass } = req.body
    const isMatch = await user.comparePassword(old)
    if (!isMatch) return next(new ErrorHandler(400, 'Old password entered is incorrect'))
    if (cPass !== newP) return next(new ErrorHandler(400, 'Passwords don\'t match'))
    user.password = newP
    await user.save()
    res.status(200).json({ success: true, msg: 'Password changed successfully' })
})

const updateProfile = tryCatch(async (req, res, next) => {
    const user = await User.findById(req.user._id)
    if (!user) return next(new ErrorHandler(404, 'User not found'))
    const { name, email } = req.body
    const file = req.file
    if (name) user.name = name
    if (email) user.email = email
    if (file) {
        await v2.uploader.destroy(user.chavi.public_id)
        const chaviResult = await uploadToCloudinary([file], 'EcomChavi')
        user.chavi.public_id = chaviResult[0].id
        user.chavi.url = chaviResult[0].url
    }
    await user.save()
    res.status(200).json({ success: true, user, msg: "Profile Updated" })
})

const allUsers = tryCatch(async (req, res, next) => { // admin
    const users = await User.find()
    res.status(200).json({ success: true, users })
})

const viewUser = tryCatch(async (req, res, next) => { // admin
    const user = await User.findById(req.params.id)
    if (!user) return next(new ErrorHandler(404, "User doesn\'t exist"))
    res.status(200).json({ success: true, user })
})

const updateRole = tryCatch(async (req, res, next) => { // admin
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, {
        new: true,
        runValidators: true
    })
    if (!user) return next(new ErrorHandler(404, "User doesn\'t exist"))
    res.status(200).json({ success: true, user })
})

const addItemToCart = tryCatch(async (req, res, next) => {
    const { id, qty } = req.body
    let exists = -1
    const user = await User.findById(req.user._id)
    if (!user) return next(new ErrorHandler(404, "User doesn\'t exist"))
    user.cartItems.forEach((item, index) => {
        if (item.item.toString() == id.toString()) exists = index
    })
    if (exists >= 0) {
        user.cartItems[exists].qty = qty
        await user.save()
        res.status(200).json({ success: true, user, msg: 'Quantity updated' })
    } else {
        user.cartItems.push({ item: id, qty })
        await user.save()
        res.status(200).json({ success: true, user, msg: 'Item added' })
    }
})

const cartItems = tryCatch(async (req, res, next) => {
    const user = await User.findById(req.user._id)
    if (!user) return next(new ErrorHandler(404, "User doesn\'t exist"))
    const items = []
    for (let i = 0; i < user.cartItems.length; i++) {
        const item = await Product.findById(user.cartItems[i].item).populate('name price images')
        items.push(item)
    }
    res.status(200).json({ success: true, items })
})

const removeItem = tryCatch(async (req, res, next) => {
    const user = await User.findById(req.user._id)
    if (!user) return next(new ErrorHandler(404, "User doesn\'t exist"))
    const itemID = req.params.id
    const result = user.cartItems.filter(_ => _.item.toString() != itemID);
    user.cartItems = result
    await user.save()
    res.status(200).json({ success: true, user, msg: 'Item removed from cart' })
})

const getShipInfo = tryCatch(async (req, res, next) => {
    const user = await User.findById(req.user._id)
    if (!user) return next(new ErrorHandler(404, "User doesn\'t exist"))
    res.status(200).json({ success: true, shipInfo: user.shippingInfo })
})

const updateShip = tryCatch(async (req, res, next) => {
    const user = await User.findById(req.user._id)
    if (!user) return next(new ErrorHandler(404, "User doesn\'t exist"))
    const { address, city, state, country, pincode, phone } = req.body
    user.shippingInfo.address = address
    user.shippingInfo.city = city
    user.shippingInfo.state = state
    user.shippingInfo.country = country
    user.shippingInfo.pincode = pincode
    user.shippingInfo.phone = phone
    await user.save()
    res.status(200).json({ success: true, shipInfo: user.shippingInfo })
})

export { addItemToCart, allUsers, cartItems, forgotPassword, getShipInfo, login, logout, register, removeItem, resetPassword, updateShip, updatePassword, updateProfile, updateRole, userDetails, viewUser }