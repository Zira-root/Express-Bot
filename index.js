require('dotenv').config();
const { Client, IntentsBitField, Collection } = require('discord.js');
const CommandHandler = require('./handlers/CommandHandler');
const EventHandler = require('./handlers/EventHandler');
const mongoose = require('mongoose');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildBans,
        IntentsBitField.Flags.GuildEmojisAndStickers,
        IntentsBitField.Flags.GuildInvites,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildModeration
    ]
});

// Initialisation des handlers
const commandHandler = new CommandHandler(client);
const eventHandler = new EventHandler(client);

// Chargement des commandes et des événements
(async () => {
    try {
        await commandHandler.loadCommands();
        eventHandler.loadEvents();
    } catch (error) {
        console.error('Erreur lors du chargement:', error);
    }
})();

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connecté à MongoDB'))
.catch(err => console.error('❌ Erreur de connexion à MongoDB:', err));

client.login(process.env.DISCORD_BOT_TOKEN);