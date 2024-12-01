// utils/database/ownerManager.js
const mongoose = require('mongoose');

// Schéma Owner
const ownerSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    level: { type: Number, default: 1 }, // 1 = owner secondaire, 2 = owner principal
    addedAt: { type: Date, default: Date.now }
});

const Owner = mongoose.model('Owner', ownerSchema);

// Fonctions de gestion des owners
async function addOwner(userId) {
    try {
        const newOwner = new Owner({
            userId,
            level: 1 // Owner secondaire par défaut
        });
        await newOwner.save();
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'owner:', error);
        throw error;
    }
}

async function removeOwner(userId) {
    try {
        await Owner.deleteOne({ userId });
        return true;
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'owner:', error);
        throw error;
    }
}

async function isOwner(userId) {
    try {
        const owner = await Owner.findOne({ userId });
        return owner !== null;
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'owner:', error);
        return false;
    }
}

module.exports = {
    Owner,
    addOwner,
    removeOwner,
    isOwner
};