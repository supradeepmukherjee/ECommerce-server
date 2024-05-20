import mongoose, { Schema, model, Types } from 'mongoose'

const productSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Please enter Product name'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Please enter Product description']
    },
    price: {
        type: Number,
        required: [true, 'Please enter Product price'],
        maxLength: [8, "Price must be less than Rs 10 crore"]
    },
    rating: {
        type: Number,
        default: 0
    },
    images: [{
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    }],
    category: {
        type: String,
        required: [true, 'Please enter Product category'],
    },
    stock: {
        type: Number,
        required: [true, 'Please enter product stock'],
        maxLength: [4, 'Stock must be less than 10000'],
        default: 0
    },
    numOfReviews: {
        type: Number,
        default: 0
    },
    reviews: [{
        user: {
            type: Types.ObjectId,
            ref: 'UserEcom',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        rating: {
            type: Number,
            required: true
        },
        comment: {
            type: String,
            required: true
        }
    }],
    user: {
        type: Types.ObjectId,
        ref: 'UserEcom',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

export const Product = mongoose.models.Product || model('Product', productSchema)