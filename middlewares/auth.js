import { User } from '../models/User.js'
import jwt from 'jsonwebtoken'

export const isAuthenticated = async (req, res, next) => {
    const { token } = req.cookies
    if (!token) return res.status(401).json({})
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id)
    next()
}

export const authoriseRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, msg: `${req.user.role} is not authorised to perform this action` })
        next()
    }
}