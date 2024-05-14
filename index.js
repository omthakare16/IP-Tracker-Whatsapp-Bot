const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { MessagingResponse } = require("twilio").twiml;
require('dotenv').config()

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/whatsapp", async (req, res) => {
  const twiml = new MessagingResponse();
  const message = twiml.message();
  const userMessage = req.body.Body.trim();
  console.log(userMessage);
  try {
    const response = await axios.get(`https://ipapi.co/${userMessage}/json/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });
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
      "errro : " +
        error.response.data.reason +
        " Sorry, there was an error processing your request."
    );
  }

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
