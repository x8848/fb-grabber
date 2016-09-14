var express = require('express');
var app = express();
var passport = require('passport');
var db = require('diskdb');
var Strategy = require('passport-local').Strategy;

require('./selenium.js')(app);

app.set('view engine', 'ejs');
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({extended: true}));
app.use(require('express-session')({secret: 'secret', resave: false, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

db.connect('\db', ['users']);

passport.use(new Strategy(
    function (username, password, done) {
        var user = db.users.findOne({username: username});
        if (!user || user.password != password) {
            return done(null, false);
        }
        return done(null, user);
    }));

passport.serializeUser(function (user, done) {
    done(null, user._id);
});

passport.deserializeUser(function (id, done) {
    var user = db.users.findOne({_id: id});
    done(null, user ? user : false);
});

app.get('/',
    function (req, res) {
        res.render('home', {user: req.user});
    });

app.get('/accounts',
    function (req, res) {
        if (req.user && req.user.admin) {
            res.render('accounts', {id: req.user._id, accounts: db.users.find()});
        } else {
            res.redirect('/');
        }
    }
);

app.get('/logout',
    function (req, res) {
        req.logout();
        res.redirect('/');
    });

app.post('/login',
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/'
    }));

app.post('/create',
    function (req, res) {
        if (req.user && req.user.admin) {
            db.users.save({username: req.body.name, password: req.body.password, admin: req.body.admin ? true : false})
            res.redirect('/accounts');
        }
    });

app.post('/remove',
    function (req, res) {
        db.users.remove({_id: req.body.id});
        res.redirect('/accounts');
    });