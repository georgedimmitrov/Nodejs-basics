const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!'
    }],
    address: {
      type: String,
      required: 'You must supply an address!'
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author!'
  }
}, {
  // if we have virtuals, they are sort of invisible even tho there
  // with this object/option we can set them to be visible explicitly 
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// define our indexes
storeSchema.index({
  name: 'text',
  description: 'text'
});

storeSchema.index({ location: '2dsphere' });

storeSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    return next(); // if store's name is not modified - skip it and return;
  }
  this.slug = slug(this.name);
  // find other stores that have a slug of wes, wes-1, wes-2 etc..
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  
  // with this.constructor you can access the DB before the Store is created
  // fuzzy match is done with a regex
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });

  if (storesWithSlug.length) {
    this.slug =`${this.slug}-${storesWithSlug.length + 1}`;
  }
  
  next();
});

storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    // Lookup Stores and populate their reviews (because .virtual is mongoose and not mongodb. mongodb is lower level)
    { 
      $lookup: {
        from: 'reviews', // model name is `Review` -> mongodb automatically lowercases and adds 's' at the end -> makes it `reviews`
        localField: '_id', // which field in Store
        foreignField: 'store', // which field in Review
        as: 'reviews' // what to name it
      }
    },
    // filter for only items that have 2 or more reviews
    // NOOB INTERPRETATION: where the second item index[1] in reviews exists
    { 
      $match: {
        'reviews.1': { $exists: true }
      }
    },
    // Add the average reviews fields
    {
      // $project removes all other fields, so we need to add the ones we need in. In mongodb 3.4 we have $addField, but in 3.2 we dont
      $project: {
        photo: '$$ROOT.photo',
        name: '$$ROOT.name',
        reviews: '$$ROOT.reviews',
        slug: '$$ROOT.slug',
        // create a new field called 'averageRating' and set its value 
        // to be the average of each of the `reviews.rating` field
        // $ means it is a field from the date being piped in (in our case data piped in from our $match)
        averageRating: { $avg: '$reviews.rating' }
      }
    },
    // sort it by our new field, highest reviews first
    { $sort: { averageRating: -1 } },
    // limit to at most 10
    { $limit: 10 }
   ]);
};

// find Reviews where the Store's `_id` propery === reviews' `store` property
// like JOIN but 100% virtual, no relationship
storeSchema.virtual('reviews', {
  ref: 'Review', // what model to link?
  localField: '_id', // which field on the Store?
  foreignField: 'store' // which field on the Review?
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

// whenever I query a Store, we will run autopopulate, which adds 'reviews'
storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);