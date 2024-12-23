const { sendLog } = require('../../../utils/function/logs');
const { AuditLogEvent } = require('discord.js');

module.exports = {
    name: 'roleUpdate',
    description: 'Logs des modifications de rôles',
    async execute(oldRole, newRole) {
        const changes = [];
        if (oldRole.name !== newRole.name) {
            changes.push(`Nom: ${oldRole.name} → ${newRole.name}`);
        }
        if (oldRole.color !== newRole.color) {
            changes.push(`Couleur: ${oldRole.hexColor} → ${newRole.hexColor}`);
        }
        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
            changes.push('Permissions modifiées');
        }

        if (changes.length > 0) {
            const auditLogs = await oldRole.guild.fetchAuditLogs({
                type: AuditLogEvent.RoleUpdate,
                limit: 1
            });
            const updateLog = auditLogs.entries.first();

            await sendLog(oldRole.guild, 'ROLES', {
                action: 'UPDATE',
                role: newRole,
                executor: updateLog?.executor || { tag: 'Inconnu' },
                changes: changes,
                id: newRole.id
            });
        }
    }
};