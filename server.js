require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();

// ---------------- CONFIG ----------------
const CLIENT_ID = "1506668934668091473";
const REDIRECT_URI = "https://discord-oauth-2.onrender.com/callback";

const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN;

const GUILD_ID = "1506050108876132535";
const ROLE_ID = "1506456153520083025";

// ---------------- HOME PAGE ----------------
app.get("/", (req, res) => {

  const oauth = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify%20guilds.join`;

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
      background: #0f172a;
    }

    .card {
      background: rgba(255,255,255,0.06);
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
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Discord Verification</h1>
    <p>Click to continue</p>
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
      "https://discord.com/api/v10/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
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
    const userRes = await axios.get("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const user = userRes.data;

    // ---------------- ADD USER TO GUILD ----------------
    await axios.put(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${user.id}`,
      { access_token: accessToken },
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    // ---------------- GIVE ROLE (FIXED PROPERLY) ----------------
    await axios.put(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${user.id}/roles/${ROLE_ID}`,
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
      background: #0f172a;
    }

    .card {
      background: rgba(255,255,255,0.06);
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
    <p>${user.username}, you now have access.</p>
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
    console.log(err.response?.data || err.message);
    res.send(`<pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>`);
  }
});

// ---------------- START ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
