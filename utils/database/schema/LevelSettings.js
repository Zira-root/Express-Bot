const mongoose = require('mongoose');

const levelSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    voiceEnabled: { type: Boolean, default: false },
    maxLevel: { type: Number, default: 0 },
    color: { type: String, default: '#5865F2' },
    xpRatioMin: { type: Number, default: 15 },
    xpRatioMax: { type: Number, default: 25 },
    levelUpChannel: { type: String, default: null },
    excludedRoles: { type: [String], default: [] },
    excludedChannels: { type: [String], default: [] },
    rewards: [{
        id: String,
        roleId: String,
        level: Number,
        message: String,
        channelId: String
    }],
    resetOnLeave: { type: Boolean, default: false },
    longMessageBonus: { type: Boolean, default: false },
    threadXpEnabled: { type: Boolean, default: false },
    boostRoles: [{
        roleId: String,
        multiplier: Number
    }],
    boostChannels: [{
        channelId: String,
        multiplier: Number
    }],
    cardTheme: {
        name: { type: String, default: "Défaut" },
        background: {
            startColor: { type: String, default: '#1a1a1a' },
            endColor: { type: String, default: '#2d2d2d' }
        },
        progressBar: {
            startColor: { type: String, default: '#4f46e5' },
            endColor: { type: String, default: '#7c3aed' },
            backgroundColor: { type: String, default: '#333333' }
        },
        text: {
            mainColor: { type: String, default: '#ffffff' },
            secondaryColor: { type: String, default: '#cccccc' }
        },
        layout: {
            avatar: {
                x: { type: Number, default: 45 },
                y: { type: Number, default: 45 }
            },
            username: {
                x: { type: Number, default: 240 },
                y: { type: Number, default: 100 }
            },
            level: {
                x: { type: Number, default: 240 },
                y: { type: Number, default: 150 }
            },
            progress: {
                x: { type: Number, default: 240 },
                y: { type: Number, default: 220 }
            }
        }
    }
});

module.exports = mongoose.model('LevelSettings', levelSettingsSchema);