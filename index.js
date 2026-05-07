const express = require("express");
const line = require("@line/bot-sdk");
const cron = require("node-cron");

const app = express();

const config = {
  channelAccessToken: "utM209EmNZCvQ5keeKe/ayfAp4EcDrqu0dkP8fUlygXw/3Hapx4Zo6mnFNjGGKXK4doxXF6p2GTWoTd9a6ofnqymfK+j7m7AGOAmeQz1NRljcZ1MuqEXuKjUCIDpkPbkvO6oMnWVxwWTux//NEmKBQdB04t89/1O/w1cDnyilFU=",
  channelSecret: "ce8dfbca97f4f18ade6e6424e7417417"
};

const client = new line.Client(config);

app.use("/webhook", line.middleware(config));

const GROUP_ID = "C112673a28cebbcd93908d5d22d6ba8de";

let awake = {};
let users = {};

// ===== メンション生成 =====
function createMentionText(ids, users) {
  let text = "未起床👇\n";
  let mentions = [];
  let index = text.length;

  ids.forEach(id => {
    const name = users[id] || "不明";
    const mentionText = `@${name}\n`;

    mentions.push({
      index: index,
      length: mentionText.length - 1,
      userId: id
    });

    text += mentionText;
    index += mentionText.length;
  });

  return {
    type: "text",
    text,
    mention: { mentionees: mentions }
  };
}

// ===== Webhook =====
app.post("/webhook", async (req, res) => {
  for (const event of req.body.events) {
    if (event.type === "message") {
      const userId = event.source.userId;

      // 名前取得
      if (!users[userId]) {
        try {
          const profile = await client.getGroupMemberProfile(
            event.source.groupId,
            userId
          );
          users[userId] = profile.displayName;
        } catch {
          users[userId] = "不明";
        }
      }

      // 起床判定
      if (event.message.text === "起きた") {
        awake[userId] = true;

        await client.replyMessage(event.replyToken, {
          type: "text",
          text: "OK 👍"
        });
      }
    }
  }
  res.sendStatus(200);
});

// ===== cron（テスト：毎分）=====
cron.schedule("* * * * *", async () => {

  awake = {};

  await client.pushMessage(GROUP_ID, {
    type: "template",
    altText: "起床チェック",
    template: {
      type: "buttons",
      text: "起きてる人は押して👇（1分以内）",
      actions: [
        {
          type: "message",
          label: "起きた",
          text: "起きた"
        }
      ]
    }
  });

  setTimeout(async () => {
    const late = Object.keys(users).filter(id => !awake[id]);

    if (late.length > 0) {
      const message = createMentionText(late, users);
      await client.pushMessage(GROUP_ID, message);
    }
  }, 60 * 1000);

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
