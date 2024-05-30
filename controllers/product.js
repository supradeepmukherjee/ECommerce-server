import { Product } from '../models/Product.js'
import cloudinary from 'cloudinary'
import { tryCatch } from "../middlewares/error.js"
import { ErrorHandler } from "../utils/utility.js"
import { delCloudinaryFiles, uploadToCloudinary } from '../utils/cloudinary.js'

const createProduct = tryCatch(async (req, res, next) => { //admin
    const { name, price, description, category, stock } = req.body
    const files = req.files || []
    if (files.length < 1) return next(new ErrorHandler(400, 'Please provide attachments'))
    let nonEmptyFiles = []
    files.forEach(f => {
        if (f.size > 0) nonEmptyFiles.push(f)
    })
    if (nonEmptyFiles.length < 1) return next(new ErrorHandler(400, 'Empty files cannot be sent'))
    let imgs = []
    const imgsResult = await uploadToCloudinary(nonEmptyFiles, 'Products')
    for (let i = 0; i < imgsResult.length; i++) {
        imgs.push({
            public_id: imgsResult[i].id,
            url: imgsResult[i].url
        })
    }
    const product = await Product.create({
        name,
        price,
        description,
        category,
        stock,
        user: req.user._id,
        images: imgs
    })
    res.status(201).json({ product, success: true, msg: 'Product Created Successfully' })
})

const getAllProducts = tryCatch(async (req, res, next) => {
    const products = await Product.find({ user: req.user._id })
    res.status(200).json({ products, success: true })
})

const getProducts = tryCatch(async (req, res, next) => {
    const { page, keyword, price, category, rating } = req.query
    const resultPerPage = 5
    const skip = resultPerPage * (page - 1)
    let products = []
    let productCount = 0
    if (category) {
        productCount = await Product.countDocuments({
            name: {
                $regex: keyword,
                $options: 'i'
            },
            price: {
                $gte: price.gte,
                $lte: price.lte
            },
            category,
            rating: {
                $gte: rating
            }
        })
        products = await Product.find({
            name: {
                $regex: keyword,
                $options: 'i'
            },
            price: {
                $gte: price.gte,
                $lte: price.lte
            },
            category,
            rating: {
                $gte: rating
            }
        })
            .skip(skip)
            .limit(resultPerPage)
    }
    else {
        productCount = await Product.countDocuments({
            name: {
                $regex: keyword,
                $options: 'i'
            },
            price: {
                $gte: price.gte,
                $lte: price.lte
            }, rating: {
                $gte: rating
            }
        })
        products = await Product.find({
            name: {
                $regex: keyword,
                $options: 'i'
            },
            price: {
                $gte: price.gte,
                $lte: price.lte
            },
            rating: {
                $gte: rating
            }
        })
            .skip(skip)
            .limit(resultPerPage)
    }
    res.status(200).json({ products, productCount, resultPerPage, success: true })
})

const productDetails = tryCatch(async (req, res, next) => {
    let product = await Product.findById(req.params.id)
    if (!product) return next(new ErrorHandler(404, 'Product not found'))
    res.status(200).json({ product, success: true })
})

const updateProduct = tryCatch(async (req, res, next) => { //admin
    const { name, price, description, category, stock } = req.body
    const files = req.files || []
    if (files.length < 1) return next(new ErrorHandler(400, 'Please provide attachments'))
    let nonEmptyFiles = []
    files.forEach(f => {
        if (f.size > 0) nonEmptyFiles.push(f)
    })
    if (nonEmptyFiles.length < 1) return next(new ErrorHandler(400, 'Empty files cannot be sent'))
    let product = await Product.findById(req.params.id)
    let images = []
    let toBeDeleted = []
    if (!product) return next(new ErrorHandler(404, 'Product not found'))
    for (let i = 0; i < product.images.length; i++) toBeDeleted.push(product.images[i].public_id)
    const [imgsResult] = await Promise.all([
        uploadToCloudinary(nonEmptyFiles, 'Products'),
        delCloudinaryFiles(toBeDeleted)
    ])
    for (let i = 0; i < imgsResult.length; i++) {
        images.push({
            public_id: imgsResult[i].id,
            url: imgsResult[i].url
        })
    }
    product = await Product.findByIdAndUpdate(
        req.params.id,
        { name, price, description, category, stock, images },
        { new: true, runValidators: true })
    res.status(200).json({ product, success: true, msg: 'Product Updated Successfully' })
})

const delProduct = tryCatch(async (req, res, next) => { //admin
    const product = await Product.findById(req.params.id)
    if (!product) return next(new ErrorHandler(404, 'Product not found'))
    for (let i = 0; i < product.images.length; i++) await cloudinary.v2.uploader.destroy(product.images[i].public_id)
    await Product.deleteOne({ _id: product._id })
    res.status(200).json({ msg: 'Product deleted successfully', success: true })
})

const review = tryCatch(async (req, res, next) => {
    const { _id, name } = req.user
    const { rating, comment, productID } = req.body
    const review = {
        user: _id,
        name,
        rating: Number(rating),
        comment
    }
    const product = await Product.findById(productID)
    if (!product) return next(new ErrorHandler(404, 'Product not found'))
    const isReviewed = product.reviews.find(review => review.user.toString() === _id.toString())
    if (isReviewed) product.reviews.forEach(review => {
        if (review => review.user.toString() === _id.toString()) {
            review.rating = rating
            review.comment = comment
        }
    })
    else {
        product.reviews.push(review)
        product.numOfReviews += 1
    }
    let total = 0
    product.reviews.forEach(review => total += review.rating)
    product.rating = total / product.reviews.length
    await product.save()
    res.status(200).json({ product, success: true })
})

const delReview = tryCatch(async (req, res, next) => {
    const { productID } = req.query
    const product = await Product.findById(productID)
    if (!product) return next(new ErrorHandler(404, 'Product not found'))
    const reviews = product.reviews.filter(review => review._id.toString() !== req.params.id.toString())
    let total = 0
    reviews.forEach(review => total += review.rating)
    let rating
    if (reviews.length > 0) rating = total / reviews.length
    else rating = 0
    const numOfReviews = reviews.length
    await Product.findByIdAndUpdate(productID, { reviews, rating, numOfReviews }, {
        new: true,
        runValidators: true
    })
    res.status(200).json({ msg: 'Review deleted', success: true })
})

export { createProduct, delProduct, delReview, getAllProducts, getProducts, productDetails, review, updateProduct }