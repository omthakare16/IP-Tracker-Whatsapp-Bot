const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const User = require("./user");

const PaymentSession = sequelize.define("PaymentSession", {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
  },
  razorpayOrderId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  razorpayPaymentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  razorpaySignature: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  orderState: {
    type: DataTypes.STRING, // e.g., created, attempted, paid
    allowNull: true,
  },
  paymentState: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paymentCapturedTimeStamp: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  subscriptionType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subscriptionAmount: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  subscriptionCurrency: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subscriptionEndDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  subscribedOn: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

// Create the foreign key relationship
PaymentSession.belongsTo(User, { foreignKey: "userId" });
User.hasMany(PaymentSession, { foreignKey: "userId" });

module.exports = PaymentSession;
