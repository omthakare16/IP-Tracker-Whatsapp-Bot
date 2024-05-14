const { Sequelize } = require("sequelize");

// Setting up the database connection
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
});

module.exports = sequelize;
