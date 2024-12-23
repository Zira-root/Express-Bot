const { sendLog } = require('../../../utils/function/logs');
const { AuditLogEvent } = require('discord.js');

module.exports = {
    name: 'roleCreate',
    description: 'Logs des rôles créés',
    async execute(role) {
        const auditLogs = await role.guild.fetchAuditLogs({
            type: AuditLogEvent.RoleCreate,
            limit: 1
        });
        const createLog = auditLogs.entries.first();

        await sendLog(role.guild, 'ROLES', {
            action: 'CREATE',
            role: role,
            executor: createLog?.executor || { tag: 'Inconnu' },
            id: role.id
        });
    }
};