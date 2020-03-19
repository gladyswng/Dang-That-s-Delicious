const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const reviewSchema = new mongoose.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'You must supply an author'
    },
    store: {
        type: mongoose.Schema.ObjectId,
        ref: 'Store',
        required: 'You must supply a store'
    },
    text: {
        type: String,
        required: 'Your review must have text'
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    }
})

// this makes it possible for us to add hooks to whenever this review is queried, it will automatically populate the author field
function autopopulate(next) {
    this.populate('author')
    next()
}

// this will add hooks - for any time somebody finds or finds one it's going to populate the author field of each of those
reviewSchema.pre('find', autopopulate)
reviewSchema.pre('findOne', autopopulate)

module.exports = mongoose.model('Review', reviewSchema)