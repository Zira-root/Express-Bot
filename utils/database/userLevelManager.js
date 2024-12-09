const UserLevel = require('./schema/UserLevel');

async function getUserLevel(guildId, userId) {
    try {
        let userLevel = await UserLevel.findOne({ guildId, userId });
        if (!userLevel) {
            userLevel = await UserLevel.create({
                guildId,
                userId,
                xp: 0,
                level: 0
            });
        }
        return userLevel;
    } catch (error) {
        console.error('Erreur lors de la récupération du niveau utilisateur:', error);
        throw error;
    }
}

async function updateUserLevel(guildId, userId, data) {
    try {
        return await UserLevel.findOneAndUpdate(
            { guildId, userId },
            data,
            { new: true, upsert: true }
        );
    } catch (error) {
        console.error('Erreur lors de la mise à jour du niveau utilisateur:', error);
        throw error;
    }
}

async function resetUserLevel(guildId, userId) {
    try {
        await UserLevel.deleteOne({ guildId, userId });
    } catch (error) {
        console.error('Erreur lors de la réinitialisation du niveau utilisateur:', error);
        throw error;
    }
}

/**
 * Récupère tous les niveaux des utilisateurs d'un serveur
 * @param {string} guildId - L'ID du serveur
 * @returns {Promise<Array>} - Un tableau des données de niveau des utilisateurs
 */
async function getAllUserLevels(guildId) {
    try {
        // Récupérer tous les documents pour ce serveur
        const userLevels = await UserLevel.find({ guildId });
        
        // Transformer les documents en objets simples
        return userLevels.map(doc => ({
            userId: doc.userId,
            level: doc.level,
            xp: doc.xp
        }));
    } catch (error) {
        console.error('Erreur dans getAllUserLevels:', error);
        return [];
    }
}

module.exports = {
    getUserLevel,
    updateUserLevel,
    resetUserLevel,
    getAllUserLevels,
};