const { DataTypes } = require("sequelize");
const sequelize = require("../database");

const User = sequelize.define("User", {
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  isSubscribed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  razorpayPaymentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  razorpayOrderId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  razorpaySignature: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subscriptionType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subscribedOn: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

module.exports = User;
