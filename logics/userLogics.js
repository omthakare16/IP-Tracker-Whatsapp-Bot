const User = require("../models/user");

async function updateSubscriptionStatus(
  userPhone,
  newStatus,
  paymentId,
  orderId,
  signature,
  subscriptionType
) {
  try {
    const user = await User.findOne({ where: { phone: userPhone } });
    if (user) {
      user.isSubscribed = newStatus;
      user.razorpayPaymentId = paymentId;
      user.razorpayOrderId = orderId;
      user.razorpaySignature = signature;
      user.subscriptionType = subscriptionType;
      user.subscribedOn = new Date(); // Set the current date as the subscription date
      await user.save();
      console.log("Subscription status updated for user:", userPhone);
      return true;
    } else {
      console.log("User not found:", userPhone);
      return false;
    }
  } catch (error) {
    console.error("Failed to update subscription status:", error);
    return false;
  }
}

module.exports = { updateSubscriptionStatus };
