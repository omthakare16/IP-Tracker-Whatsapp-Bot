const { DataTypes } = require("sequelize");
const sequelize = require("../database");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  isSubscribed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // subscribedOn: {
  //   type: DataTypes.DATE,
  //   allowNull: true,
  // },
  // subscriptionEndDate: {
  //   type: DataTypes.DATE,
  //   allowNull: true,
  // },
  // subscriptionType: {
  //   type: DataTypes.STRING,
  //   allowNull: true,
  // },
});

module.exports = User;
