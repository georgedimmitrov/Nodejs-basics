const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');

passport.use(User.createStrategy());

// every time we have a request - we ask passport what should we
// do now that its confirmed that they are logged in
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());