const mongoose = require('mongoose');

const logsSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channels: {
        MEMBERS: String,
        MESSAGES: String,
        CHANNELS: String,
        ROLES: String,
        SERVER: String,
        COMMANDS: String
    }
});

module.exports = mongoose.model('Logs', logsSchema);