const express = require("express");
const line = require("@line/bot-sdk");
const cron = require("node-cron");
const fs = require("fs");

const app = express();

// ===== LINE設定 =====
const config = {
  channelAccessToken: "3Tdcjzz1K9RpQuthjeZIRt8R8X9wakyyGlp7F27BsU11xCdhXpYrM19RnyqGWKXf4doxXF6p2GTWoTd9a6ofnqymfK+j7m7AGOAmeQz1NRkUcv9ogQDAEFWS3/5fS23gbCGwWwWzHpZ4oJml5GfqlwdB04t89/1O/w1cDnyilFU=",
  channelSecret: "ce8dfbca97f4f18ade6e6424e7417417"
};

// ===== LINE SDK v3 =====
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken
});

// ===== middleware =====
const middleware = line.middleware;
app.use("/webhook", middleware(config));

// ===== グループID =====
const GROUP_ID = "C112673a28cebbcd93908d5d22d6ba8de";

// ===== 起床状態 =====
let awake = {};

// ===== users保存 =====
const USERS_FILE = "users.json";

let users = {};

// ===== users読み込み =====
if (fs.existsSync(USERS_FILE)) {

  users = JSON.parse(
    fs.readFileSync(USERS_FILE)
  );

  console.log("users loaded");
  console.log(users);
}

// ===== users保存 =====
function saveUsers() {

  fs.writeFileSync(
    USERS_FILE,
    JSON.stringify(users, null, 2)
  );

  console.log("users saved");

  console.log(users);
}

// ===== メンション生成 =====
function createMentionText(ids, users) {

  let text = "未起床👇\n";

  let mentions = [];

  let index = text.length;

  ids.forEach(id => {

    const name =
      users[id] || "不明";

    const mentionText =
      `@${name}\n`;

    mentions.push({
      index: index,
      length:
        mentionText.length - 1,
      userId: id
    });

    text += mentionText;

    index += mentionText.length;
  });

  return {
    type: "text",
    text,
    mention: {
      mentionees: mentions
    }
  };
}

// ===== Webhook =====
app.post("/webhook", async (req, res) => {

  console.log("webhook received");

  try {

    for (const event of req.body.events) {

      // ===== messageのみ =====
      if (event.type !== "message")
        continue;

      const userId =
        event.source.userId;

      // ===== 新規ユーザー =====
      if (!users[userId]) {

        try {

          const profile =
            await client.getGroupMemberProfile(
              event.source.groupId,
              userId
            );

          users[userId] =
            profile.displayName;

          saveUsers();

        } catch (err) {

          console.log(err);

          users[userId] = "不明";

          saveUsers();
        }
      }

      // ===== 起床 =====
      if (
        event.message.text ===
        "起きた"
      ) {

        awake[userId] = true;

        console.log(
          `${users[userId]} awake`
        );
      }
    }

    res.sendStatus(200);

  } catch (err) {

    console.log(err);

    res.sendStatus(500);
  }
});

// ===== 毎朝7:40 =====
// UTCで22:40
cron.schedule("40 22 * * *", async () => {

  console.log("cron fired");

  // ===== users空 =====
  if (
    Object.keys(users).length === 0
  ) {

    console.log("users empty");

    return;
  }

  awake = {};

  // ===== 起床ボタン =====
  try {

    await client.pushMessage({
      pushMessageRequest: {
        to: GROUP_ID,
        messages: [
          {
            type: "template",
            altText: "起床チェック",
            template: {
              type: "buttons",
              text:
                "起きてる人は押して👇（5分以内）",
              actions: [
                {
                  type: "message",
                  label: "起きた",
                  text: "起きた"
                }
              ]
            }
          }
        ]
      }
    });

    console.log("button sent");

  } catch (err) {

    console.log("push error");

    console.log(err);
  }

  // ===== 5分後 =====
  setTimeout(async () => {

    const late =
      Object.keys(users).filter(
        id => !awake[id]
      );

    // ===== 全員起床 =====
    if (late.length === 0) {

      console.log(
        "everyone awake"
      );

      return;
    }

    try {

      const message =
        createMentionText(
          late,
          users
        );

      await client.pushMessage({
        pushMessageRequest: {
          to: GROUP_ID,
          messages: [message]
        }
      });

      console.log(
        "mention sent"
      );

    } catch (err) {

      console.log(
        "mention error"
      );

      console.log(err);
    }

  }, 5 * 60 * 1000);

});

// ===== サーバー =====
const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log("running");
});
