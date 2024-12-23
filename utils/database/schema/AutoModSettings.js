const mongoose = require('mongoose');

const automodSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    enabled: {
        type: Boolean,
        default: false
    },
    logs: {
        enabled: {
            type: Boolean,
            default: false
        },
        channelId: {
            type: String,
            default: null
        }
    },
    badWords: {
        enabled: {
            type: Boolean,
            default: false
        },
        words: [{
            type: String
        }],
        action: {
            type: String,
            enum: ['warn', 'mute', 'kick', 'ban', 'delete'],
            default: 'warn'
        }
    },
    spam: {
        enabled: {
            type: Boolean,
            default: false
        },
        maxMessages: {
            type: Number,
            default: 5
        },
        timeWindow: {
            type: Number,
            default: 5000
        },
        action: {
            type: String,
            enum: ['warn', 'mute', 'kick', 'ban', 'delete'],
            default: 'warn'
        }
    },
    caps: {
        enabled: {
            type: Boolean,
            default: false
        },
        percentage: {
            type: Number,
            default: 70
        },
        action: {
            type: String,
            enum: ['warn', 'mute', 'kick', 'ban', 'delete'],
            default: 'warn'
        }
    },
    invites: {
        enabled: {
            type: Boolean,
            default: false
        },
        action: {
            type: String,
            enum: ['warn', 'mute', 'kick', 'ban', 'delete'],
            default: 'delete'
        },
        whitelist: [{
            type: String
        }]
    },
    mentions: {
        enabled: {
            type: Boolean,
            default: false
        },
        maxMentions: {
            type: Number,
            default: 5
        },
        action: {
            type: String,
            enum: ['warn', 'mute', 'kick', 'ban', 'delete'],
            default: 'warn'
        }
    }
});

module.exports = mongoose.model('AutomodSettings', automodSchema);