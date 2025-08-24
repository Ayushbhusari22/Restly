const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");
const { isLoggedIn } = require('../middleware');

const userController = require("../controllers/users.js");

router
    .route("/signup")
    .get(userController.renderSignupForm)
    .post(wrapAsync(userController.signup));

router
    .route("/login")
    .get(userController.renderLoginForm)
    .post(
        saveRedirectUrl,
        passport.authenticate("local", {
            failureRedirect: "/login",
            failureFlash: true,
        }),
        userController.login
    );

router.get("/logout",
    userController.logout
);

// Profile route
router.get('/', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('reviews')
            .populate('trips');
        res.render('users/profile', { user });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Unable to load profile');
        res.redirect('/listings');
    }
});

// Profile specific routes
router.get('/profile', isLoggedIn, async (req, res) => {
    res.redirect('/user');
});

router.get('/trips', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('trips');
        res.render('users/profile', { user, activeTab: 'trips' });
    } catch (err) {
        req.flash('error', 'Unable to load trips');
        res.redirect('/user');
    }
});

router.get('/wishlists', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('users/profile', { user, activeTab: 'wishlists' });
    } catch (err) {
        req.flash('error', 'Unable to load wishlists');
        res.redirect('/user');
    }
});

router.get('/settings', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('users/profile', { user, activeTab: 'settings' });
    } catch (err) {
        req.flash('error', 'Unable to load settings');
        res.redirect('/user');
    }
});

// GET /auth/google - Initiate Google Login
router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /auth/google/callback - Google Callback
router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', failureFlash: true }),
    (req, res) => {
        req.flash('success', 'Welcome to Wanderlust! You are logged in.');
        const redirectUrl = res.locals.redirectUrl || '/listings';
        res.redirect(redirectUrl);
    }
);

// GET /auth/github - Initiate GitHub Login
router.get('/auth/github',
    passport.authenticate('github', { scope: ['user:email'] })); // Request user's email

// GET /auth/github/callback - GitHub Callback
router.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/login', failureFlash: true }),
    (req, res) => {
        req.flash('success', 'Welcome to Restly! You are logged in.');
        const redirectUrl = req.session.redirectUrl || '/listings';
        delete req.session.redirectUrl; // Clean up the session
        res.redirect(redirectUrl);
    }
);

module.exports = router;
