const { sendLog } = require('../../../utils/function/logs');
const { AuditLogEvent } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        // Membre rejoint
        client.on('guildMemberAdd', async member => {
            await sendLog(member.guild, 'MEMBERS', {
                action: 'JOIN',
                user: member.user,
                id: member.id
            });
        });

        // Membre part
        client.on('guildMemberRemove', async member => {
            await sendLog(member.guild, 'MEMBERS', {
                action: 'LEAVE',
                user: member.user,
                id: member.id
            });
        });

        // Modification de surnom et rôles
        client.on('guildMemberUpdate', async (oldMember, newMember) => {
            // Vérification des changements de surnom
            if (oldMember.nickname !== newMember.nickname) {
                await sendLog(newMember.guild, 'MEMBERS', {
                    action: 'NICKNAME',
                    user: newMember.user,
                    oldNickname: oldMember.nickname,
                    newNickname: newMember.nickname,
                    id: newMember.id
                });
            }

            // Vérification des changements de rôles
            const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
            const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

            if (addedRoles.size > 0) {
                const auditLogs = await newMember.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberRoleUpdate,
                    limit: 1
                });
                const roleLog = auditLogs.entries.first();
                
                for (const [, role] of addedRoles) {
                    await sendLog(newMember.guild, 'MEMBERS', {
                        action: 'ROLE_ADD',
                        user: newMember.user,
                        role: role,
                        executor: roleLog?.executor || { tag: 'Inconnu' },
                        id: newMember.id
                    });
                }
            }

            if (removedRoles.size > 0) {
                const auditLogs = await newMember.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberRoleUpdate,
                    limit: 1
                });
                const roleLog = auditLogs.entries.first();

                for (const [, role] of removedRoles) {
                    await sendLog(newMember.guild, 'MEMBERS', {
                        action: 'ROLE_REMOVE',
                        user: newMember.user,
                        role: role,
                        executor: roleLog?.executor || { tag: 'Inconnu' },
                        id: newMember.id
                    });
                }
            }

            // Vérification du timeout
            if (!oldMember.isCommunicationDisabled() && newMember.isCommunicationDisabled()) {
                const auditLogs = await newMember.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberUpdate,
                    limit: 1
                });
                const timeoutLog = auditLogs.entries.first();

                await sendLog(newMember.guild, 'MEMBERS', {
                    action: 'TIMEOUT',
                    user: newMember.user,
                    executor: timeoutLog?.executor || { tag: 'Inconnu' },
                    duration: newMember.communicationDisabledUntil
                        ? `Jusqu'à <t:${Math.floor(newMember.communicationDisabledUntil.getTime() / 1000)}:F>`
                        : 'Durée inconnue',
                    reason: timeoutLog?.reason || 'Aucune raison fournie',
                    id: newMember.id
                });
            }
        });

        // Ban
        client.on('guildBanAdd', async ban => {
            const auditLogs = await ban.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanAdd,
                limit: 1
            });
            const banLog = auditLogs.entries.first();

            await sendLog(ban.guild, 'MEMBERS', {
                action: 'BAN',
                user: ban.user,
                executor: banLog?.executor || { tag: 'Inconnu' },
                reason: banLog?.reason || 'Aucune raison fournie',
                id: ban.user.id
            });
        });

        // Unban
        client.on('guildBanRemove', async ban => {
            const auditLogs = await ban.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanRemove,
                limit: 1
            });
            const unbanLog = auditLogs.entries.first();

            await sendLog(ban.guild, 'MEMBERS', {
                action: 'UNBAN',
                user: ban.user,
                executor: unbanLog?.executor || { tag: 'Inconnu' },
                id: ban.user.id
            });
        });

        // Kick (via audit logs car pas d'événement direct)
        client.on('guildMemberRemove', async member => {
            const auditLogs = await member.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberKick,
                limit: 1
            });
            const kickLog = auditLogs.entries.first();

            // Vérifie si le membre a été kick (et non pas parti de lui-même)
            if (kickLog && kickLog.target.id === member.id && kickLog.createdTimestamp > (Date.now() - 5000)) {
                await sendLog(member.guild, 'MEMBERS', {
                    action: 'KICK',
                    user: member.user,
                    executor: kickLog.executor,
                    reason: kickLog.reason || 'Aucune raison fournie',
                    id: member.id
                });
            }
        });
    }
};