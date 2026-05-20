require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();

// ---------------- CONFIG ----------------
const CLIENT_ID = "1506668934668091473"; 
const REDIRECT_URI = "https://discord-oauth-2.onrender.com/callback";
const CHANNEL_ID = "1506693283479552101"; // Hardcoded channel ID

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
// Accept BOTH /button and /send-button so it never fails!
app.get(["/button", "/send-button"], async (req, res) => {
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
                url: "https://discord-oauth-2.onrender.com/" 
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
        <pre style="background: #2b2d31; padding: 15px; border-radius: 8px; color: #f23f43;">${JSON.stringify(errorPayload, null, 2)}</pre>
      </div>
    `);
  }
});

// ---------------- CALLBACK ----------------
app.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("No code provided from Discord.");

    const tokenRequestBody = new URLSearchParams({
      client_id: CLIENT_ID.trim(),
      client_secret: (CLIENT_SECRET || "").trim(),
      grant_type: "authorization_code",
      code: code,
      redirect_uri: REDIRECT_URI.trim(),
    }).toString();

    const tokenRes = await axios.post(
      "https://discord.com/api/v10/oauth2/token",
      tokenRequestBody,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const accessToken = tokenRes.data.access_token;

    const userRes = await axios.get("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const user = userRes.data;

    try {
      await axios.put(
        `https://discord.com/api/v10/guilds/${GUILD_ID.trim()}/members/${user.id}`,
        { 
          access_token: accessToken,
          roles: [String(ROLE_ID).trim()] 
        },
        {
          headers: {
            Authorization: `Bot ${BOT_TOKEN.trim()}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (memberErr) {
      await axios.put(
        `https://discord.com/api/v10/guilds/${GUILD_ID.trim()}/members/${user.id}/roles/${String(ROLE_ID).trim()}`,
        {},
        { headers: { Authorization: `Bot ${BOT_TOKEN.trim()}` } }
      );
    }

    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Verified</title>
  <style>
    body { margin: 0; height: 100vh; display: flex; justify-content: center; align-items: center; font-family: Arial; color: white; background: #0f172a; }
    .card { background: rgba(255,255,255,0.06); padding: 40px; border-radius: 18px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h2 style="color: #4bc0c0;">✔ Verified</h2>
    <p>${user.username}, you can close this tab.</p>
  </div>
  <script>
    setTimeout(() => { window.location.href = "https://discord.com/channels/@me"; }, 3000);
  </script>
</body>
</html>
    `);

  } catch (err) {
    const errorPayload = err.response?.data || err.message;
    
    res.status(500).send(`
      <div style="font-family: Arial; padding: 30px; color: white; background: #1e1f22; min-height: 100vh;">
        <h2 style="color: #f23f43;">Verification Failed</h2>
        <p>Discord rejected the connection request.</p>
        
        <h3>1. Discord's Response:</h3>
        <pre style="background: #2b2d31; padding: 15px; border-radius: 8px; color: #f23f43;">${JSON.stringify(errorPayload, null, 2)}</pre>
        
        <h3>2. Server Environment Check:</h3>
        <ul style="background: #2b2d31; padding: 15px 30px; border-radius: 8px; list-style-type: square; line-height: 1.6;">
          <li><strong>CLIENT_ID:</strong> "${CLIENT_ID}"</li>
          <li><strong>CLIENT_SECRET Status:</strong> ${CLIENT_SECRET ? `✅ Loaded (Length: ${CLIENT_SECRET.length} characters)` : "❌ MISSING / EMPTY"}</li>
          <li><strong>BOT_TOKEN Status:</strong> ${BOT_TOKEN ? "✅ Loaded" : "❌ MISSING / EMPTY"}</li>
          <li><strong>GUILD_ID:</strong> "${GUILD_ID || "❌ MISSING"}"</li>
          <li><strong>ROLE_ID:</strong> "${ROLE_ID || "❌ MISSING"}"</li>
        </ul>
      </div>
    `);
  }
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server live on port ${PORT}`);
});
