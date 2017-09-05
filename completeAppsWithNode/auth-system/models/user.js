const Sequelize = require('sequelize');
const bcrypt = require('bcrypt');

// sequelize instance with our local postgres db info
const sequelize = new Sequelize('postgres://postgres@localhost:5432/auth-system');

// setup User model and its fields
const User = sequelize.define('users', {
  username: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false
  }, email: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false
  }, password: {
    type: Sequelize.STRING,
    allowNull: false
  }
}, {
  hooks: {
    beforeCreate: (user) => {
      const salt = bcrypt.genSaltSync();
      user.password = bcrypt.hashSync(user.password, salt);
    }
  }
});

User.prototype.validPassword = function(password) {
  return bcrypt.compareSync(password,this.password)  
}

// create all defined tables in the specified db
sequelize.sync()
  .then(() => console.log('users table has been successfully created, if one doesn\'t exist'))
  .catch(error => console.log('Error occured', error));

module.exports = User;
