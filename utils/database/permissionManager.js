const mongoose = require('mongoose');

// Schéma pour les permissions des commandes
const commandPermissionSchema = new mongoose.Schema({
    commandName: { type: String, required: true, unique: true },
    permissionLevel: { type: Number, default: 0, min: 0, max: 2 },
    updatedAt: { type: Date, default: Date.now }
});

const CommandPermission = mongoose.model('CommandPermission', commandPermissionSchema);

// Fonction pour mettre à jour la permission d'une commande
async function updateCommandPermission(commandName, permissionLevel) {
    try {
        const permission = await CommandPermission.findOneAndUpdate(
            { commandName },
            { 
                commandName,
                permissionLevel,
                updatedAt: Date.now()
            },
            { upsert: true, new: true }
        );
        return permission;
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la permission:', error);
        throw error;
    }
}

// Fonction pour obtenir le niveau de permission d'une commande
async function getCommandPermission(commandName) {
    try {
        const permission = await CommandPermission.findOne({ commandName });
        return permission ? permission.permissionLevel : 0; // 0 par défaut si non trouvé
    } catch (error) {
        console.error('Erreur lors de la récupération de la permission:', error);
        return 0;
    }
}

// Fonction pour vérifier si un utilisateur a la permission d'utiliser une commande
async function checkPermission(userId, commandName) {
    try {
        // Vérifier si l'utilisateur est l'owner principal
        if (userId === process.env.OWNER_ID) return true;

        // Récupérer le niveau de permission requis pour la commande
        const requiredLevel = await getCommandPermission(commandName);

        // TODO: Ajouter ici la logique pour vérifier le niveau de l'utilisateur
        // Pour l'instant, on retourne true pour test
        return true;
    } catch (error) {
        console.error('Erreur lors de la vérification des permissions:', error);
        return false;
    }
}

module.exports = {
    CommandPermission,
    updateCommandPermission,
    getCommandPermission,
    checkPermission
};