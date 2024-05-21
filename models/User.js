import mongoose, { Schema, model, Types } from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomBytes, createHash } from 'crypto'

const userSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Name cant be blank'],
    },
    email: {
        type: String,
        required: [true, 'Email can\'t be blank'],
        unique: [true, 'Email already exists'],
    },
    password: {
        type: String,
        required: [true, 'Password cant be blank'],
        minLength: [8, 'Password must be of minimum 8 characters'],
        select: false
    },
    chavi: {
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    },
    role: {
        type: String,
        default: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    cartItems: [{
        item: {
            type: Types.ObjectId,
            ref: 'Product'
        },
        qty: {
            type: Number,
            default: 1
        }
    }],
    shippingInfo: {
        address: String,
        city: String,
        state: String,
        country: String,
        pincode: {
            type: String,
            maxLength: [6, "Pincode must be of 6 digits"],
            minLength: [6, "Pincode must be of 6 digits"]
        },
        phone: {
            type: String,
            maxLength: [10, "Pincode must be of 10 digits"],
            minLength: [10, "Pincode must be of 10 digits"]
        }
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
})

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) next()
    this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.getJWTtoken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY })
}

userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password)
}

userSchema.methods.generateResetPasswordToken = async function () {
    const resetToken = randomBytes(20).toString('hex')
    this.resetPasswordToken = createHash('sha256').update(resetToken).digest('hex')
    this.resetPasswordExpire = Date.now() + (15 * 60000)
    return resetToken
}

export const User = mongoose.models.UserEcom || model('UserEcom', userSchema)