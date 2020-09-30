const mongoose = require('mongoose')
const Store = mongoose.model('Store')
const multer = require('multer')
const jimp = require('jimp')
const uuid = require('uuid')
const User = mongoose.model('User')

const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/')
        if (isPhoto) {
            next(null, true)
        } else {
            next({ message: 'That filetype isn\'t allowed!' })
        }
    }
}

exports.homePage = (req, res) => {
   
    // This only get sent on the next requests
    res.render('index')
}


exports.addStore = (req, res) => {
    res.render('editStore', { title: 'Add Store' })
}


exports.upload = multer(multerOptions).single('photo')

exports.resize = async (req, res, next) => {
    //  Since this is a middleware and we're not going to send or render back to client, we use next - so we can upload image save image name and pass it along to create store

    // Not every time we edit our store we upload new file, if no file multer not going to resize anything
    // check if no new file to resize, multer puts new file to request property 
    if (!req.file) {
        next() // Skip to the next middlewareq
        return
    }
    const extension = req.file.mimetype.split('/')[1]
    req.body.photo = `${uuid.v4()}.${extension}`

    // Resize now
    const photo = await jimp.read(req.file.buffer)
    await photo.resize(800, jimp.AUTO)
    await photo.write(`./public/uploads/${req.body.photo}`)
    // Once written the photo to filesystem, keep going
    next()

}

exports.createStore = async (req, res) => {
    // this will take the id of the currently logged in user and put it in the author field, now we can populate the data

    req.body.author = req.user._id

    const store = await (new Store(req.body)).save()
    
    req.flash('success', `Successfully created ${store.name}. Care to leave a review?`)
    res.redirect(`/store/${store.slug}`)
    
}

exports.getStores = async (req, res) => {
    // either call populate every time we ask for reviews or use autopopulate function that we've done for other ones in store.js

    const page = req.params.page || 1
    const limit = 4
    const skip = (page * limit) - limit

    const storesPromise = Store
        .find()
        .skip(skip)
        .limit(limit)
        .sort({ created: 'desc' })

    const countPromise = Store.count()

    const [stores, count] = await Promise.all([storesPromise, countPromise])
    
    const pages = Math.ceil(count / limit)
    if(!stores.length && skip) {
        req.flash('info', `Hey! Page ${page} doesn't exist. You've been redirected to page ${pages}`)
        res.redirect(`/stores/page/${pages}`)
        return
    }


    res.render('stores' , { title: 'Stores', stores, page, pages, count})
}

// Rather than awaiting our store data, we're going to do two queries, use promise.all to wait on both of them. 



const confirmOwner = (store, user) => {

    // equals() is a method that comes along since the store.author is going to be an ObjectID. In order to compare an ObjectID with an actual string we need to use the .equals() that lives inside of it
    if (!store.author.equals(user._id)) {
        throw Error('You must own the store in order to edit it!')
    }
}

exports.editStore = async (req, res) => {
    const store = await Store.findOne({ _id: req.params.id })

    // Confirm if its the owner of the store
    confirmOwner(store, req.user)

    // Render edit form
    res.render('editStore', { title: `Edit ${store.name}`, store })
     
}


exports.updateStore = async (req, res) => {

    // Set the location data to be a point
    req.body.location.type = 'Point'

    // findOneAndUpdate takes in (query, data, options )
    const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
        new: true, // return new store instad of old
        runValidators: true
    }).exec()
    req.flash('succcess', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a> `)
    res.redirect(`/stores/${store._id}/edit`)


}


exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne( {
        slug: req.params.slug
    }).populate('author reviews')
    // Here we can't see reviews if console store, but it's still in store.reviews - it's invisible in json or in objects

    // next will assume that the if statement is a middleware and pass it along ot the next steps
    if (!store) return next()

    res.render('store', { store, title: store.name })
}


exports.getStoresByTag = async(req, res) => {
    const tag = req.params.tag
    
    // If no tag - just give me any store that has a tag property on it, then it'll show every store that has at least one tag on it
    const tagQuery = tag || { $exists: true }

    const tagsPromise =  Store.getTagsList()
    const storesPromise = Store.find({ tags: tagQuery })
    // To wait several promises to comback
    const [ tags, stores ] = await Promise.all([tagsPromise, storesPromise])
    res.render('tag', { tags, title: 'Tags', tag, stores })
}


exports.searchStores = async (req, res) => {

    const stores = await Store
    // Find stores that match
    .find({
        $text: {
            $search: req.query.q,

        }   

    }, {
      score: { $meta: 'textScore' }
    })
    // Sort them
    .sort({
      score: { $meta: 'textScore' }
    })
    // Limit to only 5 results
    .limit(5)
    res.json(stores)

}

exports.mapStores = async (req, res) => {
    // MongDB expects us to pass it an array of long and lat numbers, but it turns to string in json, that why we also need to parse the string
    const coordinates = [req.query.lng, req.query.lat].map(parseFloat)
    const q = {
        // $near is an operator insdie of MongoDB to search near a lat and long
        location: {

            $near: {
                $geometry: {
                    type: 'Point',  //longitude latitude points
                    coordinates
                },
                $maxDistance: 8000 // 10km
            }
        }
    }
    const stores = await Store.find(q).select('slug name description location photo').limit(10)
    // We only need some info of the objects like slug, description, photo, author etc... so here we can chain a .select to .find()
    // We can either add like ('photo name') or ('-author -tags'), when we make it small our AJAX request is more fast
    // .limit() to closet 10 or like req.query.limit

    res.json(stores)
    
}


exports.mapPage = (req, res) => {
    res.render('map', { title: 'Map' })
}

exports.heartStore = async (req, res) => {
    const hearts = req.user.hearts.map(obj => obj.toString())
    // hearts an array of obj in model but we need an array of string that is specific to that user 

    // User.findOneAndUpdate() - we need variable that can take out and put in 
    // $pull mongoDB operator of removing this array on user
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet' 
    // addToSet instead of push makes sure that we don't accidentally add it twice to a specific user
    const user = await User
    .findByIdAndUpdate(req.user._id, 
        { [operator]: { hearts: req.params.id } },
        { new: true }  
        // by updating user it's going to return to us the updated user rather than the previous user

    )
    

    res.json(user)
    
}

exports.getHearts = async (req, res) => {
    // Two ways to do this
    // A. query the current user and call .populate all of the hearts
    // B. query a bunch of stores and find those stores whose ID are in our current heart array

    // it will find any stores where their id is in an array


    
    const stores = await Store.find({
        _id: { $in: req.user.hearts }
        // where the id propery of the store is in req.user.hearts

        
    })
    res.render('stores', { title: 'Hearted Stores', stores })
    // if another person opens up hearts in another window, will be error 'cannot read property hearts of undefined, so we need to create a page to say the person has to be logged in first.
}

// We have reviews and stores but we don't actually have the data of reviews in the stores. Here we can use aggregation - what you use in MongoDB whenever you need to do either multi-stepped or very complex queries. We want to grap a list of stores, populate their ratings, then find out what the average rating of that actual store is. But we also don't want to have stores with only one rating
exports.getTopStores = async (req, res) => {
    const stores = await Store.getTopStores()
    // Complex query - put in the model itself (schema.statics)

    res.render('topStores', { stores, title: '★ Top Stores' })
}