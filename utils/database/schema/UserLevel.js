const mongoose = require('mongoose');

const userLevelSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 }
});

// Index composé pour optimiser les recherches
userLevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('UserLevel', userLevelSchema);