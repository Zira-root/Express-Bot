const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    id: String,
    name: String,
    type: Number,
    createdAt: Date
});

const roleSchema = new mongoose.Schema({
    id: String,
    name: String,
    createdAt: Date
});

const emojiSchema = new mongoose.Schema({
    id: String,
    name: String,
    createdAt: Date
});

const serverStatsSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    date: { type: Date, required: true },
    stats: {
        members: Number,
        bots: Number,
        channels: {
            text: Number,
            voice: Number,
            announcement: Number,
            stage: Number,
            forum: Number
        },
        roles: Number,
        emojis: Number,
        stickers: Number,
        boosts: Number,
        online: Number,
        idle: Number,
        dnd: Number,
        offline: Number
    },
    creationHistory: {
        channels: [channelSchema],
        roles: [roleSchema],
        emojis: [emojiSchema]
    }
});

module.exports = mongoose.model('ServerStats', serverStatsSchema);