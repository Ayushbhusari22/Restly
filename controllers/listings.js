const Listing=require("../models/listing");

module.exports.index=async (req,res) => {
    const allListings=await Listing.find({})
    res.render("listings/index.ejs",{allListings});
};

module.exports.renderNewForm=(req,res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing=async (req,res) => {
    let {id}=req.params;
    const listing=await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        })
        .populate("owner")
    if(!listing) {
        req.flash("error","Listing you requested for does not exist");
        res.redirect("/listings");
    }
    res.render("listings/show.ejs",{listing});
};

module.exports.createListing=async (req,res,next) => {
    let url=req.file.path;
    let filename=req.file.filename;
   
    const response=await fetch(`https://nominatim.openstreetmap.org/search?format=geojson&q=${encodeURIComponent(req.body.listing.location)}`);
    const data=await response.json();

    if(!data.features||data.features.length===0) {
        req.flash("error","Location not found.");
        return res.redirect("/listings/new");
    }

    const feature=data.features[0];
    const coords=feature.geometry.coordinates; 
    const lon=coords[0];
    const lat=coords[1];
    console.log("Coordinates:",coords);

    const newListing=new Listing(req.body.listing);

    newListing.owner=req.user._id;
    newListing.image={url,filename};
    newListing.geometry={type: "Point",coordinates: [lon,lat]}; 

    await newListing.save();

    req.flash("success","New Listing Created");
    res.redirect("/listings");
};

module.exports.renderEditForm=async (req,res) => {

    let {id}=req.params;
    const listing=await Listing.findById(id);
    if(!listing) {
        req.flash("error","Listing you requested for does not exist");
        res.redirect("/listings");
    }

    let originalImageUrl=listing.image.url;
    originalImageUrl=originalImageUrl.replace("/upload","/upload/w_250");
    res.render("listings/edit.ejs",{listing,originalImageUrl});
};

module.exports.updateListing=async (req,res) => {
    let {id}=req.params;
    let listing=await Listing.findById(id);

    if(!listing) {
        req.flash("error","Listing not found.");
        return res.redirect("/listings");
    }

    // Update basic fields
    listing.title=req.body.listing.title;
    listing.description=req.body.listing.description;
    listing.price=req.body.listing.price;
    listing.country=req.body.listing.country;
    listing.location=req.body.listing.location;

    if(req.file) {
        listing.image={url: req.file.path,filename: req.file.filename};
    }

    if(listing.isModified("location")) {
        const response=await fetch(`https://nominatim.openstreetmap.org/search?format=geojson&q=${encodeURIComponent(req.body.listing.location)}`);
        const data=await response.json();

        if(!data.features||data.features.length===0) {
            req.flash("error","Location not found.");
            return res.redirect(`/listings/${id}/edit`);
        }

        const feature=data.features[0];
        const coords=feature.geometry.coordinates; // [longitude, latitude]
        listing.geometry={type: "Point",coordinates: coords};
    }

    await listing.save();
    req.flash("success","Listing Updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing=async (req,res) => {
    let {id}=req.params;
    let deletedListing=await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success","Listing Deleted");
    res.redirect("/listings");
};