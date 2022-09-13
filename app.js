//jshint esversion:6
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const ejs = require('ejs');
const md5 = require('md5');

mongoose.connect('mongodb://localhost:27017/secretsDB');

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const User = mongoose.model('user', userSchema);

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));

app.route('/').get(function(req, res){
    res.render('home');
});

app.route('/register')
    .get(function(req, res){
        res.render('register');
    })
    .post(function(req, res){
        const newUser = new User({
          email: req.body.username,
          password: md5(req.body.password)
        });
        newUser.save(function(err, result){
            if(!err){
                res.render('secrets');
            }else{
                res.send('Something went wrong');
                console.log(err);
            }
        });
});

app.route('/login')
    .get(function(req, res){
        res.render('login');
    })
    .post(function(req, res){
        const username = req.body.username;
        const password = md5(req.body.password);

        User.findOne({email: username}, function(err, result){
            if(err){
                console.log(err);
                res.send('Something went wrong')
            }else if(result != null){
                if(result.password === password){
                    res.render('secrets');
                }else{
                    res.send('Wrong password');
                }
            }else{
                res.send('Username not found');
            }
        });
    });

app.route('/submit').get(function(req,res){
    res.render('submit')
});

app.listen(3000, function(){
    console.log('Server started on port 3000');
});