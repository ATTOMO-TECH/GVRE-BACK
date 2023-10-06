const passport = require('passport');
const Consultant = require('../models/consultant.model');
const registerStrategy = require('./registerStrategy');
const loginStrategy = require('./loginStrategy');

passport.serializeUser((user, done) => {
    return done(null, user._id);
});

passport.deserializeUser(async (userId, done) => {
    try {
        const existingUser = await Consultant.findById(userId);

        return done(null, existingUser);
    } catch (error) {
        return done(error, null);
    }
})

passport.use('register', registerStrategy);
passport.use('login', loginStrategy);

