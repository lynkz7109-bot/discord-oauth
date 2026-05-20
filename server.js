require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();

// ---------------- CONFIG ----------------

// Hardcoded safe values from your exact link
const CLIENT_ID = "1506668934668091473"; 
const REDIRECT_URI = "https://discord-oauth-2.onrender.com/callback";

// Environment Variables
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;

// ---------------- STARTUP CHECK ----------------
// This will log to your Render terminal if you forgot to add your variables!
console.log("--- CHECKING ENVIRONMENT VARIABLES ---");
console.log(`CLIENT_SECRET Loaded: ${!!CLIENT_SECRET}`);
console.log(`BOT_TOKEN Loaded: ${!!BOT_TOKEN}`);
console.log(`GUILD_ID Loaded: ${!!GUILD_ID}`);
console.log(`ROLE_ID Loaded: ${!!ROLE_ID}`);
console.log("--------------------------------------");

// ---------------- HOME PAGE ----------------

app.get("/", (req, res) => {
  // Use the exact scopes needed: identify and guilds.join
  const oauthParams = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: "identify guilds.join" 
  });

  const oauth = `https://discord.com/oauth2/authorize?${oauthParams.toString()}`;

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Discord Verify</title>
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
      color: white;
      background: linear-gradient(-45deg, #0f172a, #111827, #1e1b4b, #0b0c10);
      background-size: 400% 400%;
      animation: bg 10s ease infinite;
    }
    @keyframes bg {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .card {
      background: rgba(255,255,255,0.06);
      backdrop-filter: blur(12px);
      padding: 40px;
      border-radius: 18px;
      text-align: center;
      width: 360px;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    }
    a {
      display: inline-block;
      padding: 12px 20px;
      background: #5865F2;
      color: white;
      text-decoration: none;
      border-radius: 10px;
      font-weight: bold;
      transition: 0.2s;
    }
    a:hover {
      transform: scale(1.05);
      background: #4752c4;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Discord Verification</h1>
    <p>Click below to continue</p>
    <a href="${oauth}">Continue with Discord</a>
  </div>
</body>
</html>
  `);
});

// ---------------- CALLBACK ----------------

app.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("No code provided from Discord.");

    // 1. EXCHANGE CODE FOR ACCESS TOKEN
    const tokenRes = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // 2. FETCH USER PROFILE DATA
    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const user = userRes.data;

    // 3. ADD MEMBER TO SERVER AND ASSIGN ROLE
    // We wrap ROLE_ID in String() because Discord strict-checks that roles are an array of strings.
    // If it passes as a number, it throws "Invalid Form Body".
    try {
      await axios.put(
        `https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`,
        { 
          access_token: accessToken,
          roles: [String(ROLE_ID)] 
        },
        {
          headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (memberErr) {
      console.log("Adding member failed. Attempting fallback role assignment...");
      // Fallback: If they are already in the server, this assigns the role.
      await axios.put(
        `https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}/roles/${ROLE_ID}`,
        {},
        { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
      );
    }

    // 4. SUCCESS PAGE
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Verified</title>
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
      color: white;
      background: linear-gradient(-45deg, #0f172a, #111827, #1e1b4b, #0b0c10);
      background-size: 400% 400%;
      animation: bg 10s ease infinite;
    }
    .card {
      background: rgba(255,255,255,0.06);
      backdrop-filter: blur(12px);
      padding: 40px;
      border-radius: 18px;
      text-align: center;
    }
    .check { font-size: 60px; color: #4bc0c0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✔</div>
    <h2>Verified</h2>
    <p>${user.username}, you can close this tab.</p>
  </div>
  <script>
    setTimeout(() => {
      window.location.href = "https://discord.com/channels/@me";
    }, 3000);
  </script>
</body>
</html>
    `);

  } catch (err) {
    console.error("API ERROR DETECTED:", err.response?.data || err.message);
    res.status(500).send(`
      <div style="font-family: Arial; padding: 20px; color: white; background: #2f3136; height: 100vh;">
        <h2>Verification Failed</h2>
        <p>Something went wrong while talking to Discord's API.</p>
        <pre style="background: #202225; padding: 15px; border-radius: 8px;">${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>
      </div>
    `);
  }
});

// ---------------- START SERVER ----------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
