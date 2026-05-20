require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();

// ---------------- CONFIG ----------------
const CLIENT_ID = "1506668934668091473"; 
const REDIRECT_URI = "https://discord-oauth-2.onrender.com/callback";
const CHANNEL_ID = "1506693283479552101"; 

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
app.get(["/button", "/send-button"], async (req, res) => {
  try {
    if (!BOT_TOKEN) return res.status(500).send("<h3>Error: BOT_TOKEN missing in Render.</h3>");

    await axios.post(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`,
      {
        content: "🔐 **Verify to get access to the server**",
        components: [
          {
            type: 1, 
            components: [
              {
                type: 2, 
                style: 5, 
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

    res.send("<h3>✔ Success! Button sent.</h3>");
  } catch (err) {
    res.status(500).send(`<pre>${JSON.stringify(err.response?.data || err.message)}</pre>`);
  }
});

// ---------------- CALLBACK ----------------
app.get("/callback", async (req, res) => {
  let user = { username: "User" };
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
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenRes.data.access_token;

    const userRes = await axios.get("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    user = userRes.data;

    // 3. ADD MEMBER / APPLY ROLE (CRITICAL LOGGING ZONE)
    try {
      // Try adding them to the server with the role directly
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
      // If they are already in the server, this fallback runs to apply the role
      try {
        await axios.put(
          `https://discord.com/api/v10/guilds/${GUILD_ID.trim()}/members/${user.id}/roles/${String(ROLE_ID).trim()}`,
          {},
          { headers: { Authorization: `Bot ${BOT_TOKEN.trim()}` } }
        );
      } catch (roleErr) {
        // IF THE ROLE FAILS, STOP AND SHOW THE REAL ERROR CODE ABOVE ALL ELSE
        const roleErrPayload = roleErr.response?.data || roleErr.message;
        return res.status(500).send(`
          <div style="font-family: Arial; padding: 30px; color: white; background: #1e1f22; min-height: 100vh;">
            <h2 style="color: #f23f43;">❌ Failed to Give Role</h2>
            <p>Your server settings are blocking the bot from handing out this specific role.</p>
            <h3>Discord's Precise Reason:</h3>
            <pre style="background: #2b2d31; padding: 15px; border-radius: 8px; color: #f23f43; font-size: 16px;">${JSON.stringify(roleErrPayload, null, 2)}</pre>
            <p><strong>GUILD_ID Used:</strong> "${GUILD_ID}"</p>
            <p><strong>ROLE_ID Used:</strong> "${ROLE_ID}"</p>
          </div>
        `);
      }
    }

    // SUCCESS PAGE
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
    <p>${user.username}, you have been verified and given the role!</p>
  </div>
</body>
</html>
    `);

  } catch (err) {
    const errorPayload = err.response?.data || err.message;
    res.status(500).send(`<div style="color:white; background:#1e1f22; padding:30px;"><pre>${JSON.stringify(errorPayload, null, 2)}</pre></div>`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server live on port ${PORT}`); });
