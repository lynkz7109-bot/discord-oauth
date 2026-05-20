require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// 👇 THIS GOES HERE
client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);

  const channel = client.channels.cache.get("1506693283479552101");

  if (!channel) return;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Continue with Discord")
      .setStyle(ButtonStyle.Link)
      .setURL("http://localhost:3000/")
  );

  channel.send({
    content: "🔐 **Verify to get access to the server**",
    components: [row],
  });
});

// login at the bottom
client.login(process.env.BOT_TOKEN);