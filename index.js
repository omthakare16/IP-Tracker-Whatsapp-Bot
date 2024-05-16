const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { MessagingResponse } = require("twilio").twiml;
require("dotenv").config();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const sequelize = require("./database");
const User = require("./models/user");
const PaymentSession = require("./models/paymentSession");

sequelize.sync({ force: false }).then(() => {
  console.log("Database and tables created!");
});

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", "views");

app.post("/whatsapp", async (req, res) => {
  const userPhoneNo = req.body.From;
  const twiml = new MessagingResponse();
  const message = twiml.message();
  const userMessage = req.body.Body.trim().toLowerCase();
  const userPhone = encodeURIComponent(userPhoneNo.split(":")[1]);
  let user = await User.findOne({
    where: { phone: decodeURIComponent(userPhone) },
  });
  console.log(userPhone);
  console.log("Received message:", userMessage);

  if (!user) {
    user = await User.create({
      phone: decodeURIComponent(userPhone),
      isSubscribed: false,
    });
    console.log("New user created:", user.phone);
  }
  const ipRegex =
    /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))/gi;
  if (user.isSubscribed) {
    const currentPaymentSession = await PaymentSession.findOne({
      where: { userId: user.id, paymentState: "captured" },
    });

    if (
      currentPaymentSession &&
      new Date(currentPaymentSession.subscriptionEndDate) < new Date()
    ) {
      user.isSubscribed = false;
      await user.save();
      currentPaymentSession.paymentState = "expired";
      currentPaymentSession.orderState = "expired";
      await currentPaymentSession.save();
      message.body(
        "Your subscription has expired. Please renew to continue using the service."
      );
    } else if (ipRegex.test(userMessage)) {
      try {
        const response = await axios.get(
          `https://ipapi.co/${userMessage}/json/`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            },
          }
        );
        const data = response.data;
        message.body(
          `🌐 IP Tracker Details:\n` +
            `🔸 IP Address: ${data.ip}\n` +
            `📍 Location:\n    - City: ${data.city}, ${data.region}\n    - Country: ${data.country_name}\n` +
            `🌍 Coordinates: Latitude ${data.latitude}, Longitude ${data.longitude}\n` +
            `⏰ Timezone: ${data.timezone} (UTC ${data.utc_offset})\n` +
            `📞 Country Code: ${data.country_calling_code}\n` +
            `💵 Currency: ${data.currency}\n` +
            `🏢 Network Provider: ${data.org}`
        );
      } catch (error) {
        console.log(error);
        message.body(
          "Error: " +
            error.response.data.reason +
            " Sorry, there was an error processing your request."
        );
      }
    } else {
      message.body("Please enter a valid IP address to check.");
    }
  } else {
    if (userMessage === "monthly" || userMessage === "yearly") {
      const amount = userMessage === "monthly" ? 20000 : 200000; // Prices in paise
      try {
        const order = await razorpayInstance.orders.create({
          amount,
          currency: "INR",
          receipt: `receipt_${new Date().getTime()}`,
          payment_capture: "1",
          notes: { description: "Subscription payment" },
        });

        let paymentSession = await PaymentSession.findOne({
          where: {
            userId: user.id,
            orderState: "expired",
          },
        });

        if (!paymentSession) {
          paymentSession = await PaymentSession.create({
            userId: user.id,
            razorpayOrderId: order.id,
            subscriptionType: userMessage,
            subscriptionAmount: amount,
            subscriptionCurrency: "INR",
            orderState: "created",
            paymentState: "pending",
          });
        } else {
          paymentSession.razorpayOrderId = order.id;
          paymentSession.subscriptionType = userMessage;
          paymentSession.subscriptionAmount = amount;
          paymentSession.subscriptionCurrency = "INR";
          paymentSession.orderState = "created";
          paymentSession.paymentState = "pending";
          await paymentSession.save();
        }

        const paymentUrl = `${
          process.env.BASE_URL
        }/pay?amount=${amount}&orderId=${
          order.id
        }&userPhone=${encodeURIComponent(userPhone)}`;

        message.body(
          `Please complete your payment by visiting this link: ${paymentUrl}`
        );
      } catch (error) {
        console.error("Failed to create Razorpay order:", error);
        message.body("Failed to initiate payment. Please try again.");
      }
    } else {
      message.body(
        "Please reply 'monthly' or 'yearly' to choose your subscription plan."
      );
    }
  }

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

app.get("/pay", async (req, res) => {
  const { amount, orderId, userPhone } = req.query;

  if (!orderId) {
    return res.status(400).send("Order ID is required.");
  }

  res.render("payment", {
    orderId: orderId,
    amount: amount,
    userPhone: decodeURIComponent(userPhone),
  });
});

app.post("/payment-callback", async (req, res) => {
  console.log("Callback Data:", req.body);
  const paymentId = req.body.razorpay_payment_id;
  const orderId = req.body.razorpay_order_id;
  const signature = req.body.razorpay_signature;
  const userPhone = decodeURIComponent(req.query.userPhone);
  const amount = parseInt(req.query.amount, 10);
  const subscriptionType = amount == 20000 ? "monthly" : "yearly";
  // Verify the signature
  if (isValidSignature(paymentId, orderId, signature)) {
    const user = await User.findOne({
      where: { phone: userPhone },
    });
    const paymentSession = await PaymentSession.findOne({
      where: { userId: user.id }, // Ensure correct filtering based on user or order ID
    });

    paymentSession.razorpayOrderId = orderId;
    paymentSession.razorpayPaymentId = paymentId;
    paymentSession.razorpaySignature = signature;
    await paymentSession.save();

    // sendMessageToWhatsApp(
    //   userPhone,
    //   "We have received your payment attempt and are processing it."
    // );
    res.send("Payment attempt recorded successfully.");
  } else {
    sendMessageToWhatsApp(
      userPhone,
      "Payment failed or could not be verified."
    );
    res.send("Invalid signature; payment attempt not recorded.");
  }
});

function isValidSignature(paymentId, orderId, signature) {
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(orderId + "|" + paymentId)
    .digest("hex");
  return generatedSignature === signature;
}

function sendMessageToWhatsApp(userPhone, messageText) {
  const client = require("twilio")(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  client.messages
    .create({
      from: "whatsapp:+14155238886",
      to: `whatsapp:${userPhone}`,
      body: messageText,
    })
    .then((message) => console.log("Message sent successfully:", message.sid))
    .catch((error) => console.error("Failed to send WhatsApp message:", error));
}

app.post("/webhook", async (req, res) => {
  console.log("Webhook received:", req.body);
  const { event, payload } = req.body;

  try {
    switch (event) {
      case "order.paid":
        await handleOrderPaid(payload.order.entity);
        break;
      case "payment.captured":
        await handlePaymentCaptured(payload.payment.entity);
        break;
      default:
      // console.log("Unhandled event type:", event);
    }
    res.status(200).send("Webhook processed successfully");
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});

async function handleOrderPaid(order) {
  console.log(order);
  await PaymentSession.update(
    { orderState: "paid" },
    { where: { razorpayOrderId: order.id } }
  );
  console.log(`Order paid for order ID: ${order.id}`);
}

async function handlePaymentCaptured(payment) {
  const paymentSession = await PaymentSession.findOne({
    where: { razorpayOrderId: payment.order_id },
  });

  if (paymentSession) {
    paymentSession.paymentState = "captured";
    paymentSession.paymentCapturedTimeStamp = new Date();
    if (paymentSession.subscriptionType === "monthly") {
      paymentSession.subscriptionEndDate = new Date(
        new Date().setMonth(new Date().getMonth() + 1)
      );
    } else if (paymentSession.subscriptionType === "yearly") {
      paymentSession.subscriptionEndDate = new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      );
    }
    paymentSession.subscribedOn = new Date();
    await paymentSession.save();

    // Updating the user's subscription status
    const user = await User.findOne({ where: { id: paymentSession.userId } });
    if (user) {
      user.isSubscribed = true;
      await user.save();
      sendMessageToWhatsApp(
        user.phone,
        "Your payment has been successfully captured, and your subscription is now active."
      );
    }
    console.log(
      `Payment captured and subscription updated for payment ID: ${payment.id}`
    );
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
