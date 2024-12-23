const { sendLog } = require('../../../utils/function/logs');
const { AuditLogEvent } = require('discord.js');

module.exports = {
    name: 'channelUpdate',
    description: 'Logs des modifications de salons',
    async execute(oldChannel, newChannel) {
        if (!oldChannel.guild) return;

        const changes = [];
        if (oldChannel.name !== newChannel.name) {
            changes.push(`Nom: ${oldChannel.name} → ${newChannel.name}`);
        }
        if (oldChannel.topic !== newChannel.topic) {
            changes.push(`Sujet: ${oldChannel.topic || 'Aucun'} → ${newChannel.topic || 'Aucun'}`);
        }

        if (changes.length > 0) {
            const auditLogs = await oldChannel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelUpdate,
                limit: 1
            });
            const updateLog = auditLogs.entries.first();

            await sendLog(oldChannel.guild, 'CHANNELS', {
                action: 'UPDATE',
                channel: newChannel,
                executor: updateLog?.executor || { tag: 'Inconnu' },
                changes: changes,
                id: newChannel.id
            });
        }
    }
};