const { sendLog } = require('../../../utils/function/logs');
const { AuditLogEvent } = require('discord.js');

module.exports = {
    name: 'messageDelete',
    description: 'Logs des messages supprimés',
    async execute(message) {
        if (!message.guild || message.author?.bot) return;

        const auditLogs = await message.guild.fetchAuditLogs({
            type: AuditLogEvent.MessageDelete,
            limit: 1
        });
        const deleteLog = auditLogs.entries.first();

        await sendLog(message.guild, 'MESSAGES', {
            action: 'DELETE',
            user: message.author,
            executor: deleteLog?.executor || { tag: 'Inconnu' },
            channel: message.channel,
            content: message.content,
            id: message.id
        });
    }
};