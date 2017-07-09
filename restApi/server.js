var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongoose   = require('mongoose');
mongoose.connect('mongodb://node:node@novus.modulusmongo.net:27017/Iganiq8o'); // connect to our database
var Bear = require('./app/models/bear');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;

// Routes for our API ---
var router = express.Router();

// middleware to use for all requests
router.use(function(req, res, next) {
  // do logging
  console.log('Something happening');
  next();
});

// test router
router.get('/', function(req, res) {
  res.json({ message: 'hooray! welcome to our api!' });
});

router.route('/bears')
  // create a bear (accessed at POST http://localhost:8080/api/bears)
  .post(function(req, res) {
    var bear = new Bear();
    bear.name = req.body.name;

    bear.save(function(err) {
      if (err) res.send(err);

      res.json({ message: 'Bear created!' });
    });
  });

// register our routes ---
// all of our routes will be prefixed with /api
app.use('/api', router);

// start the server
app.listen(port);
console.log('Magic happens on port ' + port);