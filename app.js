//jshint esversion:6
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require('mongoose-findorcreate');

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/secretsDB");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  active: Boolean,
  googleId: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("user", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.route('/').get(function(req, res){
    res.render('home');
});

app.route('/auth/google')
    .get(passport.authenticate('google', {
        scope: ['profile']
}));

app.route('/auth/google/secrets')
    .get(passport.authenticate('google', {failureRedirect: '/login'}), function(req, res){
        res.redirect('/secrets');
});

app.route('/register')
    .get(function(req, res){
        res.render('register');
    })
    .post(function(req, res){
        User.register({username: req.body.username}, req.body.password, function(err, account){
            if(err){
                console.log(err);
                res.redirect('/register');
            }else{
                passport.authenticate('local')(req, res, function(){
                    res.redirect('/secrets');
                });
            }
        })
});

app.route('/login')
    .get(function(req, res){
        res.render('login');
    })
    .post(passport.authenticate("local"), function(req, res){
        const user = new User ({
            username: req.body.username,
            password: req.body.password
        });

        req.login(user, function(err){
            if(err){
                console.log(err);
            }else{
                passport.authenticate('local')(req, res, function(){
                    res.redirect('/secrets');
                })
            }
        })
});

app.route('/secrets')
    .get(function(req, res){
    if(req.isAuthenticated()){
        res.render('secrets');
    }else{
        res.redirect('/login');
    }
});

app.route('/logout')
    .get(function(req, res){
        req.logout(function(err){
            if(err){
                console.log(err);
            }else{
                res.redirect("/");
            }
        });
})

app.route('/submit').get(function(req,res){
    res.render('submit')
});

app.listen(3000, function(){
    console.log('Server started on port 3000');
});