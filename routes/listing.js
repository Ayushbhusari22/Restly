const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js")
const listingController = require("../controllers/listings.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });


router
    .route("/")
    .get(wrapAsync(listingController.index)) 
    .post(
        isLoggedIn,
        upload.single('listing[image]'),
        validateListing,
        wrapAsync(listingController.createListing) 
    );


router.get("/new",
    isLoggedIn,
    listingController.renderNewForm
);

router
    .route("/:id")
    .get(wrapAsync(listingController.showListing)) 
    .put(
        isLoggedIn,
        isOwner,
        upload.single('listing[image]'),
        validateListing,
        wrapAsync(listingController.updateListing)) 
    .delete(
        isLoggedIn,
        isOwner,
        wrapAsync(listingController.destroyListing) 
    );


router.get("/:id/edit",
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.renderEditForm)
);

router.get("/", async (req, res) => {
    try {
        let allListings;
        if (req.query.search) {
            // Search in title, location, city, state, and country
            allListings = await Listing.find({
                $or: [
                    { city: { $regex: req.query.search, $options: "i" } },
                    { state: { $regex: req.query.search, $options: "i" } },
                    { country: { $regex: req.query.search, $options: "i" } },
                    { location: { $regex: req.query.search, $options: "i" } }
                ]
            });
        } else {
            allListings = await Listing.find({});
        }
        res.render("listings/index", { allListings });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error loading listings");
        res.redirect("/");
    }
});

module.exports = router;