// This file is to configure our actual passport

const passport = require('passport')
const mongoose = require('mongoose')
const User = mongoose.model('User')

passport.use(User.createStrategy())

passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())
// Every time we have request its going to ask passport what to do with the actual user now that i've confirmed they're properly logged in

