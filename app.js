//jshint esversion:6
require('dotenv').config();
const http = require('http')
const https = require('https');
const fs = require("fs");
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const certKey = fs.readFileSync(__dirname + '/cert/CA/key.pem');
const cert = fs.readFileSync(__dirname + '/cert/CA/cert.pem');
const sslOptions = {
    key: certKey,
    cert: cert
};
http.createServer(app).listen(3030, function(){console.log('HTTP server running on port 3030')});
https.createServer(sslOptions, app).listen(3000, function(){console.log('HTTPS server running on port 3000')});

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
  facebookId: String,
  secret: String
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

passport.use( new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      callbackURL: "https://localhost:3000/auth/google/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "https://localhost:3000/auth/facebook/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ facebookId: profile.id }, function (err, user) {
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

app.route('/auth/facebook').get(passport.authenticate('facebook'));

app.route("/auth/facebook/secrets")
  .get(passport.authenticate("facebook", { failureRedirect: "/login" }), function(req, res){
    res.redirect('/secrets');
  }
);

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
        User.find({"secret": {$ne:null}}, function(err, foundUsers){
            if(err){
                console.log(err);
            }else{
                res.render('secrets', {
                    usersWithSecrets: foundUsers
                });
            }
        })
});

app.route('/submit').get(function(req, res){
    if(req.isAuthenticated()){
        res.render('submit');
    }else{
        res.redirect('/login');
    }
    })
    .post(function(req, res){
        User.findById(req.user.id, function(err, foundUser){
            if(err){
                console.log(err);
            }else{
                foundUser.secret = req.body.secret;
                foundUser.save(function(err){
                    if(err){
                        console.log(err);
                    }
                    res.redirect("/secrets");
                });
            }
        })
})

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