// Load config file.
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
const uuid = require('uuid');
const bedrock = require('bedrock-protocol');
const realmInvite = 'https://realms.gg/LXEcnCjRpgk';
const { SlashCommandBuilder } = require('@discordjs/builders');

// Load discord.js
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { MessageContent, GuildMessages, Guilds } = GatewayIntentBits;
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://zbeps:websterE12@zbeps.lo7um8c.mongodb.net/'; // Replace with your MongoDB connection string
const mongoclient = new MongoClient(uri);
const database = mongoclient.db('xuid'); // Replace with your database name
const xuidCollection = database.collection('xuids'); // Collection to store XUIDs

const deviceNames = {
  Unknown: 'Unknown',
  bedrock_server: 'Bedrock Server',
  pocket: 'Pocket Edition',
  win10: 'Windows 10',
  xbox: 'Xbox',
  playstation: 'PlayStation',
  nintendo_switch: 'Nintendo Switch',
  gear_vr: 'Gear VR',
  hololens: 'HoloLens',
  windows_phone: 'Windows Phone',
  oculus: 'Oculus',
  ios: 'iOS',
  android: 'Android',
  fireos: 'Fire OS',
  apple_tv: 'Apple TV',
  raspberry_pi: 'Raspberry Pi',
  tizen: 'Tizen',
  chromeos: 'Chrome OS',
};

let channel = config.channel;
const token = config.token;
let blazedChannel = config.blazedLogsChannel;
var blazedLogs = config.blazedEnabled;
const correction = {
  "§r§4[§6blazed§4]§r": "blazed",
  "§4[§6blazed§4]": "blazed",
  "§r": "",
  "§6": "",
  "§4": ""
};

// Device OS ids to be converted to more friendly names
let DeviceOS;
const devices = [];
const onlinePlayers = new Map();

// Create a new discord client that can see what servers the bot is in, as well as the messages in those servers
const client = new Client({ intents: [Guilds, GuildMessages, MessageContent] });

async function startBot() {
  try {
    await mongoclient.connect();
    console.log('Connected to MongoDB successfully!');

    client.login(token);

    bot.on('command_response', (response) => {
      if (response.command === '/list') {
        const playerList = response.body.players;
        const playerNames = playerList.map(player => player.name);
        console.log('Received player list from server:', playerNames);

        if (playerNames.length > 0) {
          const playerListMessage = `Online Players: ${playerNames.join(', ')}`;
          channel.send(playerListMessage);
        } else {
          channel.send('There are no players online.');
        }
      }
    });
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

startBot();
const bot = bedrock.createClient({
  realms: {
    realmInvite,
    pickRealm: (realms) => realms.find(e => e.name === 'Realm Name')
  }
});

// When the discord client is ready, send a login message
client.on('ready', () => {
  console.log('Bot is logged in and ready');
  channel = client.channels.cache.get(channel);
});

// Event listener for when a player joins the realm
bot.on('add_player', async (packet) => {
  switch (packet.device_os) {
    case 'win10':
      DeviceOS = 'Windows PC';
      // Kick Windows players
      bot.queue('command_request', {
        command: `/kick ${packet.username} Kicked: Windows players are not allowed.`,
        origin: {
          type: 'player',
          uuid: '',
          request_id: '',
        },
        internal: false,
        version: 52,
      });
      break;
    case 'ios':
      DeviceOS = 'Apple Device';
      break;
    case 'nintendo_switch':
      DeviceOS = 'Nintendo Switch';
      break;
    case 'android':
      DeviceOS = 'Android';
      break;
    default:
      DeviceOS = packet.device_os;
      console.log('DeviceOS defaulted to packet.device_os');
  }

  const xuid = packet.identity;

  // Store the player's XUID in the database
  await xuidCollection.updateOne({ username: packet.username }, { $set: { xuid: xuid } }, { upsert: true });

  console.log(`Player joined: ${packet.username} (${DeviceOS})`);

  // Send a message to the Discord channel
  const embed = new EmbedBuilder()
    .setColor(0x00FFFF)
    .setTitle("Player Joined")
    .setDescription(`**Username:** ${packet.username}\n**Device:** ${DeviceOS}\n**XUID:** ${xuid}`);

  channel.send({ embeds: [embed.build()] });
});

// Event listener for when a player leaves the realm
bot.on('remove_player', (packet) => {
  console.log(`Player left: ${packet.username}`);

  // Send a message to the Discord channel
  const embed = new EmbedBuilder()
    .setColor(0x00FFFF)
    .setTitle('Player Left')
    .setDescription(`**Username:** ${packet.username}`);

  channel.send({ embeds: [embed.build()] });
});

// Event listener for chat messages
bot.on('text', (packet) => {
  const message = packet.message;

  // Ignore system messages and commands
  if (message.startsWith('/') || packet.type === 'system') {
    return;
  }

  const correctedMessage = autoCorrect(message);
  console.log(`[${packet.sender_name}] ${correctedMessage}`);

  // Send the chat message to the Discord channel
  const embed = new EmbedBuilder()
    .setColor(0x00FFFF)
    .setTitle("Chat Message")
    .setDescription(`**Username:** ${packet.sender_name}\n**Message:** ${correctedMessage}`);

  channel.send({ embeds: [embed.build()] });
});

// Event listener for realm errors
bot.on('error', (error) => {
  console.error('Realm error:', error);
});

// Event listener for disconnect event
bot.on('end', () => {
  console.log('Disconnected from realm');
  client.destroy();
});

// Apply correction to the chat message
function autoCorrect(message) {
  for (const key in correction) {
    message = message.replace(new RegExp(key, 'g'), correction[key]);
  }
  return message;
}
