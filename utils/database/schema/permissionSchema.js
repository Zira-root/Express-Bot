const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    level: { type: Number, required: true, enum: [0, 1, 2] },
    roleIds: [{ type: String }],
    updatedAt: { type: Date, default: Date.now }
});

// Index composé pour optimiser les recherches
permissionSchema.index({ guildId: 1, level: 1 }, { unique: true });

module.exports = mongoose.model('Permission', permissionSchema);