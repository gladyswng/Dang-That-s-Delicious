const mongoose = require('mongoose')
const User = mongoose.model('User')
const promisify = require('es6-promisify')

exports.loginForm = (req, res) => {
    res.render('login', { title: 'Login' })
}

exports.registerForm = (req, res) => {
    res.render('register', {
        title: 'Register'
    })
}

exports.validateRegister = (req, res, next) => {
    // we imported expressValidator and app.use() it so we can request different validation methods on it
    req.sanitizeBody('name')   
    req.checkBody('name', 'You must supply a name').notEmpty()
    req.checkBody('email', 'That Email is not valid').notEmpty().isEmail()
    req.sanitizeBody('email').normalizeEmail({
        remove_dots: false,
        remove_extension: false,
        gmail_remove_subaddress: false
    })
    req.checkBody('password', 'Password cannot be blank').notEmpty()
    req.checkBody('password-confirm', 'Confirmed password cannot be blank').notEmpty()
    req.checkBody('password-confirm', 'Oops! Your passwords do not match').equals(req.body.password)

    const errors = req.validationErrors()
    if (errors) {
        
        // Normally flash happens on next request and we don't need to pass it along but now we need to send everything on one single request
        req.flash('error', errors.map(err => err.msg ))
        res.render('register', { title: this.registerForm, body: req.body, flashes: req.flash() })
        return // stop the funtion from running
    }

    next() // no errors continue
}

exports.register = async (req, res, next) => {
    // .register comes from user model where we have plugin of passportLocalMongoose, it expose to us a method called register()
    const user = new User({ email: req.body.email, name: req.body.name })
    const register = promisify(User.register, User)
    // when the middleware is still returning callback and not promise we can use promisify
    await register(user, req.body.password)
    next() // pass to authController.login

}

exports.account = (req, res) => {
    res.render('account', { title: 'Edit your account' })
}

exports.account = (req, res) => {
    res.render('account', { title: 'Edit Your Account' })
}

exports.updateAccount = async (req, res) => {
    const updates = {
        name: req.body.name,
        email: req.body.email
    }

    const user = await User.findOneAndUpdate(
        //query
        { _id: req.user._id },
        // update
        { $set: updates },
        // options
        { new: true, runValidators: true, context: 'query' }

    )

    req.flash('success', 'Updated the profile')
    res.redirect('back') 
    // back to the url where they came from or '/accounts', this is useful for if it's working on multiple endpoints, 'back' will just send them back 
}

