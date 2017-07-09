const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

// read the photo into virtual storage and check filetype (.png/.jpeg/)
const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed!' }, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render('index', {});
};

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' });
};

// server side validation for photo upload and temp save into memory
exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if (!req.file) {
    return next(); // skip to the next middleware
  }

  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;

  // now we resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);

  // once we have written the photo to our filesystem, keep going!
  next();
};

exports.createStore = async (req, res) => {
  // set the author to the currently logged in user's id 
  req.body.author = req.user._id;
  
  const store = await (new Store(req.body)).save();
  req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 4;
  // page 1 -> (1 * 4) - 4 = 0 skip=0
  // page 2 -> (2 * 4) - 4 = 4 skip=4
  const skip = (page * limit) - limit;
  // 1. Query the DB for a list of all stores
  const storesPromise = Store
    .find()
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });
  
  // count gives us how many there are in total
  const countPromise = Store.count();

  const [stores, count] = await Promise.all([storesPromise, countPromise]);

  // ceil because if we have 17/4 is 4.13769, but we need 5 pages for 17 stores, 4 per page
  const pages = Math.ceil(count / limit);

  if (!stores.length && skip) {
    req.flash('info', `Hey! You asked for page ${page}. But that doesn't exist. So I put you on page ${pages}`);
    res.redirect(`/stores/page/${pages}`);
    return;
  }

  res.render('stores', { 
    title: 'Stores',
    stores,
    page,
    pages,
    count
  });
};

// confirm the owner of the store
const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!');
  }
};

exports.editStore = async (req, res) => {
  // 1. Find the store given the id
  const store = await Store.findOne({ _id: req.params.id });

  // 2. Confirm they are the owner of the store
  confirmOwner(store, req.user);

  // 3. Render out the edit form so the user can update their store
  res.render('editStore', {
    title: `Edit ${store.name}`,
    store
  });
};

exports.updateStore = async (req, res) => {
  // set the location data to be a Point, because type Point is
  // a default and it doesn't kick in automatically when you update the store.
  req.body.location.type = 'Point';

  // 1. find and update the store
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return the new store, instead of the old one
    runValidators: true
  }).exec();
  req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store →</a>`);
  res.redirect(`/stores/${store._id}/edit`);
  // 2. redirect them to the store and tell them that it worked
};

exports.getStoreBySlug = async (req, res, next) => {
  // populate essentially finds by id and gives us all info on the field
  const store = await Store.findOne({
    slug: req.params.slug
  }).populate('author reviews');
  if (!store) {
    return next();
  }
  res.render('store', {
    title: store.name,
    store
  });
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true };
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

  res.render('tag', {
    title: 'Tags',
    tags,
    tag,
    stores
  });
};

// we indexed name/desc with 'text' in Store.js so we can use $text
// 'textScore' is part of mongodb's metadata
exports.searchStores = async (req, res) => {
  const stores = await Store
  // first find stores that match
  .find({
    $text: {
      $search: req.query.q
    }
  }, {
    score: { $meta: 'textScore' }
  })
  // then sort them
  .sort({
    score: { $meta: 'textScore' }
  })
  // limit to only 5 results
  .limit(5);

  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000 // 10km
      }
    }
  };

  const stores = await Store
    .find(q)
    .select('slug name description location photo')
    .limit(10);
  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  // $pull removes from array, $addToSet makes sure it is unique
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User
    .findByIdAndUpdate(
      req.user._id,
      { [operator]: { hearts: req.params.id } }, // operator is a variable
      { new: true } // returns new/updated user
    );
  res.json(user);
};

exports.getHearts = async (req, res) => {
  // const userPopulated = await User.findOne({ _id: req.user._id }).populate('hearts');
  const stores = await Store.find({
    _id: { $in: req.user.hearts }
  });

  res.render('stores', { title: 'Hearted Stores', stores });
};

exports.getTopStores = async (req, res) => {
  // when we have complex queries, we put them on the model.statics!
  // (getTopStores is in Store.js)
  const stores = await Store.getTopStores();
  // res.json(stores);
  res.render('topStores', {
    stores,
    title: '★ Top Stores!'
  });
};