const express = require("express");
const line = require("@line/bot-sdk");

const app = express();

const config = {
  channelAccessToken: "utM209EmNZCvQ5keeKe/ayfAp4EcDrqu0dkP8fUlygXw/3Hapx4Zo6mnFNjGGKXK4doxXF6p2GTWoTd9a6ofnqymfK+j7m7AGOAmeQz1NRljcZ1MuqEXuKjUCIDpkPbkvO6oMnWVxwWTux//NEmKBQdB04t89/1O/w1cDnyilFU=",
  channelSecret: "ce8dfbca97f4f18ade6e6424e7417417"
};

app.use("/webhook", line.middleware(config));

// ===== groupId確認専用 =====
app.post("/webhook", (req, res) => {

  console.log("=== WEBHOOK受信 ===");
  console.log(JSON.stringify(req.body, null, 2));

  res.sendStatus(200);
});

// ===== サーバー =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
