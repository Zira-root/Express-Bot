const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!', maxLength: 3 },
    embedColor: { type: String, default: '#0099ff', match: /^#[0-9A-Fa-f]{6}$/ }
});

const GuildSettings = mongoose.model('GuildSettings', guildSettingsSchema);

async function getSettings(guildId) {
    try {
        let settings = await GuildSettings.findOne({ guildId });
        if (!settings) {
            settings = new GuildSettings({ guildId });
            await settings.save();
        }
        return settings;
    } catch (error) {
        console.error('Erreur lors de la récupération des paramètres:', error);
        return {
            prefix: '!',
            embedColor: '#0099ff'
        };
    }
}

async function updateSettings(guildId, updates) {
    try {
        const settings = await GuildSettings.findOneAndUpdate(
            { guildId },
            updates,
            { upsert: true, new: true }
        );
        return settings;
    } catch (error) {
        console.error('Erreur lors de la mise à jour des paramètres:', error);
        throw error;
    }
}

module.exports = {
    GuildSettings,
    getSettings,
    updateSettings,
    defaultSettings: {
        prefix: '!',
        embedColor: '#0099ff'
    }
};