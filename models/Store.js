const mongoose = require('mongoose')
mongoose.Promise = global.Promise
const slug = require('slugs')


const storeSchema = new mongoose.Schema({

    name: {
        type: String,
        trim: true,
        required: 'Please enter a store name'
    },
    slug: String,
    description: {
        type: String,
        trim: true
    },
    tags: [String],
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            default: 'Point'
          },
        coordinates: [
            {
                type: Number,
                required: 'You must supply coordinates!'
            }
        ],
        address: {
            type: String,
            required: 'You must supply an address!'
        }
    },
    photo: String,
    author: {
        // We're telling it this is going to be an object. But when somebody gives us an OnjectId we'regoing to store just the object, and it's going to be referenced to the actual User. So we'll be able to come back and populate the author of our stores

        type: mongoose.Schema.ObjectId, 
        // the objectId in database has its own type
        ref: 'User', // User model with 'User'
        required: 'You must supply an author'
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

// Define our indexes

// Setting type to 'text' also means we can perform a search on anything that is text
storeSchema.index({
    name: 'text',
    description: 'text',
    
})

storeSchema.index({ location: '2dsphere' })

storeSchema.pre('save', async function(next) {
    if (!this.isModified('name')) {
        next() // skip
        return // stop this func from running
    }
    this.slug = slug(this.name)
    // find other stores that have a slug of name, name-1, name-2
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i')
    const storesWithSlug = await this.constructor.find({ slug: slugRegEx })
    if(storesWithSlug.length) {
        this.slug = `${this.slug}-${storesWithSlug.length + 1}`
    }
    next()

    // TODO make more resiliant so slugs are unique
})

storeSchema.statics.getTagsList = function() {
    // this. is going to bound to the model

    return this.aggregate([
        // aggregate is like a query function, much like .find but we can do more complex stuff inside of it
        // mongodb aggregate/pipeline operators, start with $sign - meaning it's still an object but do sth special
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } }

    ])
} 

storeSchema.statics.getTopStores = function() {
    // By returning this.aggregate means it's going to return the promise so that we can await the result of getTopStores and put it into our actual variable in storeController
    return this.aggregate([
        // 1. Lookup stores and populate their reviews
            // populate a field that is sort of like virtuals
            // 'reviews' can't see in actual review model, but MongoDB will lower-case your model name and put an S on the end for you
        { $lookup: {  
            from: 'reviews',  // Get from Review
            localField: '_id', 
            foreignField: 'store', 
            as: 'reviews'}  // as whatever field name you like 
        },

        // 2. Filter for only items that have 2 or more reviews
            // reviews.1 - how you access index in mongodb
        { $match: { 'reviews.1': { $exists: true } } },

        // 3. Add the average reviews field 
            //- we don't know and calculate on the fly
        { $project: {
            // Since $addField don't work we have to add in
            photo: '$$ROOT.photo', // equal to the original document
            name: '$$ROOT.name',
            reviews: '$$ROOT.reviews',
            slug: '$$ROOT.slug',
            // $project create a field and set the value
            // $reviews with "$" meaning from the data being piped in (here from our $match)
            averageRating: { $avg: '$reviews.rating' }
        } },

        // 4. Sort it by our new field, highest reviews first
        { $sort: { averageRating: -1 } },

        // 5. Limit to at most 10
        { $limit: 10 }
    ])
}


// find reviews where the stores _id property === reviews store property
// if the same it will automatically populate that in the reviews field
// it's a virtual field so we are not saving any relationship between them, its 100% virtual
storeSchema.virtual('reviews', {
    // Tell it to go off another model - review model 
    ref: 'Review', // what model to link
    
    // which field (local field - on store) on our "store" needs to match up with which field on our our foreign model (review)
    localField: '_id', // which field on the store
    foreignField: 'store' // which field on review
    
})

function autopopulate(next) {
    this.populate('reviews')
    next()
}

storeSchema.pre('find', autopopulate)

storeSchema.pre('findOne', autopopulate)


module.exports = mongoose.model('Store', storeSchema)