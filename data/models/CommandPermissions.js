const { Schema, model } = require('mongoose');

const commandPermissionSchema = new Schema({
    commandName: { type: String, required: true, unique: true },
    permissionLevel: { type: Number, default: 0, min: 0, max: 2 }
});

module.exports = model('CommandPermission', commandPermissionSchema);

// data/models/Owner.js
const { Schema, model } = require('mongoose');

const ownerSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    level: { type: Number, default: 1, min: 1, max: 2 } // 2 pour owner principal, 1 pour owner secondaire
});

module.exports = model('Owner', ownerSchema);