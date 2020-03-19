const mongoose = require('mongoose')
const Schema = mongoose.Schema
mongoose.Promise = global.Promise
// We shouldn't have to do this but there's a bug in mongoose package that gives false positives in console

const md5 = require('md5')
const validator = require('validator')
const mongodbErrorHandler = require('mongoose-mongodb-errors')
const passportLocalMongoose = require('passport-local-mongoose')

const userSchema = new Schema({
    email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
        validator: [validator.isEmail, 'Invalid email address'],
        require: 'Please supply an email address'
    },
    name: {
        type: String,
        require: 'Please supply a name',
        trim: true
    },

    // These were added later when create forgot password
    resetPasswordToken: String, 
    resetPasswordExpires: Date,
    hearts: [
        { type: mongoose.Schema.ObjectId, ref: 'Store' }
        // Heart is an array of ids that are related to a store so after when we  populate our hearts we'll see all the stores with hearts

    ]

})



userSchema.virtual('gravatar').get(function() {
    const hash = md5(this.email)
    return `https://gravatar.com/avatar/${hash}?s=200`

})

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' })

userSchema.plugin(mongodbErrorHandler)
// if for example unique not true in email the error doesn't look so good


module.exports = mongoose.model('User', userSchema)