const mongoose = require('mongoose');

const sanctionSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    type: { 
        type: String, 
        required: true,
        enum: ['BAN', 'KICK', 'MUTE', 'WARN', 'UNMUTE', 'UNBAN', 'UNWARN', 'CLEAR', 'SLOWMODE', 'LOCK', 'UNLOCK', 'RENEW']
    },
    reason: { type: String, default: "Aucune raison spécifiée" },
    duration: { type: Number, default: null },
    active: { type: Boolean, default: true },
    caseId: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    expires: { type: Date, default: null }
});

const moderationSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    modLogChannel: { type: String, default: null },
    muteRole: { type: String, default: null },
    automod: {
        enabled: { type: Boolean, default: false },
        maxMentions: { type: Number, default: 5 },
        maxLines: { type: Number, default: 10 },
        blacklistedWords: [String],
        whitelistedUrls: [String]
    }
});

const Sanction = mongoose.model('Sanction', sanctionSchema);
const ModerationSettings = mongoose.model('ModerationSettings', moderationSettingsSchema);

module.exports = { Sanction, ModerationSettings };