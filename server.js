require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();

// ---------------- CONFIG ----------------
const CLIENT_ID = "1506668934668091473"; 
const REDIRECT_URI = "https://discord-oauth-2.onrender.com/callback";
const CHANNEL_ID = "1506693283479552101"; // Hardcoded channel ID as requested

const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;

// ---------------- HOME PAGE ----------------
app.get("/", (req, res) => {
  const oauthParams = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: "identify guilds.join" 
  });

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Discord Verify</title>
  <style>
    body { margin: 0; height: 100vh; display: flex; justify-content: center; align-items: center; font-family: Arial; color: white; background: #0f172a; }
    .card { background: rgba(255,255,255,0.06); padding: 40px; border-radius: 18px; text-align: center; width: 360px; }
    a { display: inline-block; padding: 12px 20px; background: #5865F2; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Discord Verification</h1>
    <p>Click below to continue</p>
    <a href="https://discord.com/oauth2/authorize?${oauthParams.toString()}">Continue with Discord</a>
  </div>
</body>
</html>
  `);
});

// ---------------- BUTTON SENDER ROUTE ----------------
// Visit https://discord-oauth-2.onrender.com/send-button to trigger this!
app.get("/send-button", async (req, res) => {
  try {
    if (!BOT_TOKEN) return res.status(500).send("<h3>Error: BOT_TOKEN environment variable is missing in Render.</h3>");

    await axios.post(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`,
      {
        content: "🔐 **Verify to get access to the server**",
        components: [
          {
            type: 1, // Action Row
            components: [
              {
                type: 2, // Component Type: Button
                style: 5, // Style: Link Button
                label: "Continue with Discord",
                url: "https://discord-oauth-2.onrender.com/" // Points directly to your homepage
              }
            ]
          }
        ]
      },
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN.trim()}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.send(`
      <div style="font-family: Arial; padding: 30px; color: white; background: #1e1f22; min-height: 100vh; text-align: center; display: flex; flex-direction: column; justify-content: center;">
        <h2 style="color: #4bc0c0;">✔ Success!</h2>
        <p>Your bot has successfully sent the verification message and button to Channel ID: ${CHANNEL_ID}</p>
      </div>
    `);

  } catch (err) {
    const errorPayload = err.response?.data || err.message;
    res.status(500).send(`
      <div style="font-family: Arial; padding: 30px; color: white; background: #1e1f22; min-height: 100vh;">
        <h2 style="color: #f23f43;">Failed to Send Button</h2>
        <p>Ensure your bot has 'Send Messages' permissions in that channel.</p>
        <pre style="background: #2b2d31; padding: 15px; border-radius: 8px; color: #f23f43;">${JSON.stringify(errorPayload, null, 2)}</pre>
      </div>
    `);
  }
});

// ---------------- CALLBACK ----------------
app.get("/
