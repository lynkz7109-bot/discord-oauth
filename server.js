require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();

// ---------------- CONFIG ----------------

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;

// IMPORTANT: hardcoded to avoid Render/env mismatch bugs
const REDIRECT_URI = "https://discord-oauth-2.onrender.com/callback";

// ---------------- HOME PAGE ----------------

app.get("/", (req, res) => {
  const oauth = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=identify%20guilds.join`;

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
      font-family: Arial;
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
    if (!code) return res.send("No code provided");

    // ---------------- TOKEN EXCHANGE ----------------
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
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // ---------------- GET USER ----------------
    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const user = userRes.data;

    // ---------------- ADD TO SERVER ----------------
    await axios.put(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`,
      { access_token: accessToken },
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    // ---------------- GIVE ROLE ----------------
    await axios.put(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}/roles/${ROLE_ID}`,
      {},
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    );

    // ---------------- SUCCESS PAGE ----------------
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
      font-family: Arial;
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

    .check {
      font-size: 60px;
    }
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
    console.log("ERROR:", err.response?.data || err.message);
    res.send(`<pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>`);
  }
});

// ---------------- START ----------------

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on Render");
});
