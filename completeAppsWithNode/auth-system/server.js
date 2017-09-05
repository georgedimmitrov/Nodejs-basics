const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const morgan = require('morgan');
const User = require('./models/user');

const app = express();

app.set('port', 9000);

// for development use log our requests with morgan
app.use(morgan('dev'));

// parse incoming parameters requestes to req.body
app.use(bodyParser.urlencoded({ extended: true }));

// allows access to cookies stored in the browser
app.use(cookieParser());

app.use(session({
  key: 'user_sid',
  secret: 'somerandomstuffz',
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: 600000
  }
}));



// This middleware will check if user's cookie is still saved in browser
// and user is not set, then automatically log the user out.
// This usually happens when you stop your express server after login,
// your cookie still remains saved in the browser.
app.use((req, res, next) => {
  if (req.cookies.user_sid && !req.session.user) {
    res.clearCookie('user_sid');
  }

  next();
});

// middleware function to check for logged-in users
const sessionChecker = (req, res, next) => {
  if (req.session.user && req.cookies.user_sid) {
    res.redirect('/dashboard');
  } else {
    next();
  }
};

app.get('/', sessionChecker, (req, res) => {
  res.redirect('/login');
});

app.route('/signup')
  .get(sessionChecker, (req, res) => {
    res.sendFile(__dirname + '/public/signup.html');
  })
  .post((req, res) => {
    User.create({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password
    })
    .then(user => {
      req.session.user = user.dataValues;
      res.redirect('/dashboard');
    });
  });

app.route('/login')
  .get(sessionChecker, (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
  })
  .post((req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({ where: { username } }).then(user => {
      if (!user) {
        res.redirect('/login');
      } else if (!user.validPassword(password)) {
        res.redirect('/login');
      } else {
        req.session.user = user.dataValues;
        res.redirect('/dashboard');
      }
    });
  });

app.get('/dashboard', (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
      res.sendFile(__dirname + '/public/dashboard.html');
  } else {
      res.redirect('/login');
  }
});

app.get('/logout', (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
      res.clearCookie('user_sid');
      res.redirect('/');
  } else {
      res.redirect('/login');
  }
});

// route for handling 404 requests(unavailable routes)
app.use((req, res, next) => {
  res.status(404).send('Sorry can\'t find that!');
});

app.listen(app.get('port'), () => console.log(`App started on port ${app.get('port')}`));
