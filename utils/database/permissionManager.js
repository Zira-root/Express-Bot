const { PermissionFlagsBits } = require('discord.js');
const Permission = require('./schema/permissionSchema');

/**
 * Récupère les rôles configurés pour un niveau de permission
 * @param {string} guildId - ID du serveur
 * @param {number} level - Niveau de permission (0, 1, 2)
 * @returns {Promise<string[]>} Liste des IDs des rôles
 */
async function getLevelRoles(guildId, level) {
    try {
        const permission = await Permission.findOne({ guildId, level });
        return permission ? permission.roleIds : [];
    } catch (error) {
        console.error('Erreur lors de la récupération des rôles:', error);
        return [];
    }
}

/**
 * Récupère tous les niveaux de permission et leurs rôles pour un serveur
 * @param {string} guildId - ID du serveur
 * @returns {Promise<Object>} Objet contenant les rôles par niveau
 */
async function getAllLevelRoles(guildId) {
    try {
        const permissions = await Permission.find({ guildId });
        const roles = {
            0: [],
            1: [],
            2: []
        };

        permissions.forEach(perm => {
            roles[perm.level] = perm.roleIds;
        });

        return roles;
    } catch (error) {
        console.error('Erreur lors de la récupération des permissions:', error);
        return { 0: [], 1: [], 2: [] };
    }
}

/**
 * Met à jour les rôles pour un niveau de permission
 * @param {string} guildId - ID du serveur
 * @param {number} level - Niveau de permission (0, 1, 2)
 * @param {string[]} roleIds - Liste des IDs des rôles
 * @returns {Promise<void>}
 */
async function updateLevelRoles(guildId, level, roleIds) {
    try {
        await Permission.findOneAndUpdate(
            { guildId, level },
            { 
                $set: { 
                    roleIds,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
    } catch (error) {
        console.error('Erreur lors de la mise à jour des rôles:', error);
        throw error;
    }
}

/**
 * Vérifie si un membre a accès à un niveau de permission
 * @param {Object} member - Membre Discord
 * @param {number} level - Niveau de permission à vérifier
 * @returns {Promise<boolean>}
 */
async function checkPermission(member, level) {
    try {
        // Les admins ont toujours accès
        if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

        const permission = await Permission.findOne({ 
            guildId: member.guild.id,
            level
        });

        // Si aucun rôle n'est configuré pour ce niveau
        if (!permission || !permission.roleIds.length) {
            return level === 0; // Niveau 0 accessible à tous par défaut
        }

        // Vérifie si le membre a un des rôles configurés
        return member.roles.cache.some(role => permission.roleIds.includes(role.id));
    } catch (error) {
        console.error('Erreur lors de la vérification des permissions:', error);
        return false;
    }
}

module.exports = {
    getLevelRoles,
    getAllLevelRoles,
    updateLevelRoles,
    checkPermission
};