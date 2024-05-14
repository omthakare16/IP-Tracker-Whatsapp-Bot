const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { MessagingResponse } = require("twilio").twiml;
require("dotenv").config();
const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.set("view engine", "ejs");
app.set("views", "views");

app.post("/whatsapp", async (req, res) => {
  const userPhoneNo = req.body.From;
  const twiml = new MessagingResponse();
  const message = twiml.message();
  const userMessage = req.body.Body.trim().toLowerCase();
  const userPhone = encodeURIComponent(userPhoneNo.split(":")[1]);
  console.log(userPhone);
  console.log("Received message:", userMessage);

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

      const paymentUrl = `${process.env.BASE_URL}/pay?orderId=${
        order.id
      }&userPhone=${encodeURIComponent(userPhone)}`;

      message.body(
        `Please complete your payment by visiting this link: ${paymentUrl}`
      );
    } catch (error) {
      console.error("Failed to create Razorpay order:", error);
      message.body(error + "Failed to initiate payment. Please try again.");
    }
  } else {
    message.body(
      "Please reply 'monthly' or 'yearly' to choose your subscription plan."
    );
  }

  //   try {
  //     const response = await axios.get(`https://ipapi.co/${userMessage}/json/`, {
  //       headers: {
  //         "User-Agent":
  //           "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  //       },
  //     });
  //     const data = response.data;
  //     message.body(
  //       `🌐 IP Tracker Details:\n` +
  //         `🔸 IP Address: ${data.ip}\n` +
  //         `📍 Location:\n    - City: ${data.city}, ${data.region}\n    - Country: ${data.country_name}\n` +
  //         `🌍 Coordinates: Latitude ${data.latitude}, Longitude ${data.longitude}\n` +
  //         `⏰ Timezone: ${data.timezone} (UTC ${data.utc_offset})\n` +
  //         `📞 Country Code: ${data.country_calling_code}\n` +
  //         `💵 Currency: ${data.currency}\n` +
  //         `🏢 Network Provider: ${data.org}`
  //     );
  //   } catch (error) {
  //     console.log(error);
  //     message.body(
  //       "errro : " +
  //         error.response.data.reason +
  //         " Sorry, there was an error processing your request."
  //     );
  //   }

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
    userPhone: userPhone,
  });
});
app.post("/payment-callback", async (req, res) => {
  console.log("Callback Data:", req.body);
  const paymentId = req.body.razorpay_payment_id;
  const orderId = req.body.razorpay_order_id;
  const signature = req.body.razorpay_signature;
  const userPhone = req.query.userPhone;

  // Verify the signature
  if (isValidSignature(paymentId, orderId, signature)) {
    // Update subscription status
    // updateSubscriptionStatus(userPhone, true);
    sendMessageToWhatsApp(
      userPhone,
      "Your payment was successful and your subscription is now active."
    );
    res.send("Payment successful and subscription updated.");
  } else {
    sendMessageToWhatsApp(
      userPhone,
      "Payment failed or could not be verified."
    );
    res.send("Payment failed or could not be verified.");
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
