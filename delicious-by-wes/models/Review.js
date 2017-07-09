const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const reviewSchema = new mongoose.Schema({
  created: {
    type: Date,
    default: Date.now()
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author!'
  },
  store: {
    type: mongoose.Schema.ObjectId,
    ref: 'Store',
    required: 'You must supply a store!'
  },
  text: {
    type: String,
    required: 'Your review must have text!'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  }
});

// every time this is called, it is gonna autopopulate the author field
// so we dont have to explicitly do it ourselves
function autopopulate(next) {
  this.populate('author');
  next();
}

// adds HOOKS for everyime somebody uses `find` or `findOne` on this Schema
reviewSchema.pre('find', autopopulate);
reviewSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Review', reviewSchema);