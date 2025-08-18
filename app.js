if ( process.env.NODE_ENV !== "production" ) {
    require( "dotenv" ).config();
}

const express = require( "express" );
const app = express();
const mongoose = require( "mongoose" );
const path = require( "path" );
const methodOverride = require( "method-override" );
const ejsMate = require( "ejs-mate" );
const ExpressError = require( "./utils/ExpressError.js" );
const session = require( "express-session" );
const MongoStore = require( 'connect-mongo' );
const flash = require( "connect-flash" );
const passport = require( "passport" );
const LocalStrategy = require( "passport-local" );
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require( "./models/user.js" );
const paymentRouter = require('./routes/payment.js');


const listingRouter = require( "./routes/listing.js" );
const reviewRouter = require( "./routes/review.js" );
const userRouter = require( "./routes/user.js" );

const dbUrl = process.env.ATLASDB_URL;

main()
    .then(() => {
        console.log("MongoDB connected");
        console.log("Successfully connected to MongoDB Atlas!");
    })
    .catch((err) => {
        console.log(err);
        console.error("Failed to connect to MongoDB Atlas.");
        console.error(err);
    });

async function main() {
    await mongoose.connect( dbUrl );
}

app.set( "view engine", "ejs" );
app.set( "views", path.join( __dirname, "views" ) );
app.use( express.json() );
app.use( express.urlencoded( { extended: true } ) );
app.use( methodOverride( "_method" ) );
app.engine( "ejs", ejsMate );
app.use( express.static( path.join( __dirname, "/public" ) ) );
app.use("/payment", paymentRouter);

const store = MongoStore.create( {
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
} );


store.on( "error", () => {
    console.log( "ERROR in MONGO SESSION STORE", err );
} );

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use( session( sessionOptions ) );
app.use( flash() );

app.use( passport.initialize() );
app.use( passport.session() );
passport.use( new LocalStrategy( User.authenticate() ) );


passport.serializeUser( User.serializeUser() );
passport.deserializeUser( User.deserializeUser() );

app.use( ( req, res, next ) => {
    res.locals.success = req.flash( "success" );
    res.locals.error = req.flash( "error" );
    res.locals.currUser = req.user;
    res.locals.razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    // console.log(res.locals.success);
    next();
} );

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},
    async function (accessToken, refreshToken, profile, cb) {
        try {
            // Find user by googleId
            let user = await User.findOne({ googleId: profile.id });
            if (user) {
                return cb(null, user);
            }

            // If no user, check if one exists with the same email to link accounts
            user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
                user.googleId = profile.id;
                await user.save();
                return cb(null, user);
            }

            // If still no user, create a new one
            const newUser = new User({
                googleId: profile.id,
                username: profile.displayName,
                email: profile.emails[0].value,
            });
            await newUser.save();
            return cb(null, newUser);
        } catch (err) {
            return cb(err, null);
        }
    }
));

// GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "/auth/github/callback"
},
    async function (accessToken, refreshToken, profile, cb) {
        try {
            // Find user by githubId
            let user = await User.findOne({ githubId: profile.id });
            if (user) {
                return cb(null, user);
            }

            // GitHub may not provide an email if it's private.
            // The 'user:email' scope is required to get the emails array.
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            if (!email) {
                return cb(new Error("GitHub did not provide an email. Please make your email public on GitHub or try another login method."), null);
            }

            // If no user, check if one exists with the same email to link accounts
            user = await User.findOne({ email: email });
            if (user) {
                user.githubId = profile.id;
                await user.save();
                return cb(null, user);
            }

            // If still no user, create a new one
            const newUser = new User({ githubId: profile.id, username: profile.username, email: email });
            await newUser.save();
            return cb(null, newUser);
        } catch (err) { return cb(err, null); }
    }));



app.use( "/listings", listingRouter );
app.use( "/listings/:id/review", reviewRouter );
app.use( "/", userRouter );

app.all( "*", ( req, res, next ) => {
    next( new ExpressError( 404, "Page Not Found!" ) );
} );

app.use( ( err, req, res, next ) => {
    console.error( err.stack ); // Log the error stack trace
    let { statusCode = 500, message = "Something went wrong!" } = err;
    res.status( statusCode ).render( "error", { message } );
} );

app.listen( 8080, () => {
    console.log( "server is running on port 8080" );
} );
