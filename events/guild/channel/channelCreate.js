const { sendLog } = require('../../../utils/function/logs');
const { AuditLogEvent } = require('discord.js');

module.exports = {
    name: 'channelCreate',
    description: 'Logs des salons créés',
    async execute(channel) {
        if (!channel.guild) return;

        const auditLogs = await channel.guild.fetchAuditLogs({
            type: AuditLogEvent.ChannelCreate,
            limit: 1
        });
        const createLog = auditLogs.entries.first();

        await sendLog(channel.guild, 'CHANNELS', {
            action: 'CREATE',
            channel: channel,
            executor: createLog?.executor || { tag: 'Inconnu' },
            id: channel.id
        });
    }
};