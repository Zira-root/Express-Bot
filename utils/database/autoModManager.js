const AutoModSettings = require('./schema/AutoModSettings');

const DEFAULT_SETTINGS = {
    enabled: false,
    logs: {
        enabled: false,
        channelId: null
    },
    badWords: {
        enabled: false,
        words: [],
        action: 'warn'
    },
    spam: {
        enabled: false,
        maxMessages: 5,
        timeWindow: 5000,
        action: 'warn'
    },
    caps: {
        enabled: false,
        percentage: 70,
        action: 'warn'
    },
    invites: {
        enabled: false,
        whitelist: [],
        action: 'delete'
    },
    mentions: {
        enabled: false,
        maxMentions: 5,
        action: 'warn'
    }
};

class AutoModManager {
    async getSettings(guildId) {
        try {
            let settings = await AutoModSettings.findOne({ guildId });
            
            if (!settings) {
                settings = new AutoModSettings({ 
                    guildId,
                    ...DEFAULT_SETTINGS 
                });
                await settings.save();
            }

            return settings.toObject();
        } catch (error) {
            console.error('Erreur lors de la récupération des paramètres:', error);
            return { ...DEFAULT_SETTINGS, guildId };
        }
    }

    async updateSettings(guildId, updates) {
        try {
            const settings = await AutoModSettings.findOneAndUpdate(
                { guildId },
                { $set: updates },
                { 
                    new: true, 
                    upsert: true,
                    setDefaultsOnInsert: true
                }
            );
            
            return settings;
        } catch (error) {
            console.error('Erreur lors de la mise à jour des paramètres:', error);
            throw error;
        }
    }

    async toggleModule(guildId, moduleName, enabled) {
        try {
            const update = {
                [`${moduleName}.enabled`]: enabled
            };
            
            return await this.updateSettings(guildId, update);
        } catch (error) {
            console.error('Erreur lors du basculement du module:', error);
            throw error;
        }
    }

    async updateModuleSettings(guildId, moduleName, settings) {
        try {
            const update = {};
            Object.entries(settings).forEach(([key, value]) => {
                update[`${moduleName}.${key}`] = value;
            });
            
            return await this.updateSettings(guildId, update);
        } catch (error) {
            console.error('Erreur lors de la mise à jour des paramètres du module:', error);
            throw error;
        }
    }

    async applyModuleAction(guild, member, moduleName, action, reason = null) {
        try {
            const logChannel = await this.getLogChannel(guild);
            
            switch(action) {
                case 'warn':
                    await this.warnUser(member, moduleName, logChannel);
                    break;
                    
                case 'mute':
                    await this.muteUser(member, moduleName, logChannel);
                    break;
                    
                case 'kick':
                    await this.kickUser(member, moduleName, logChannel);
                    break;
                    
                case 'ban':
                    await this.banUser(member, moduleName, logChannel);
                    break;
                    
                case 'delete':
                    if (reason?.message) {
                        await reason.message.delete();
                        this.logAction(logChannel, member, moduleName, 'Message supprimé');
                    }
                    break;
            }
        } catch (error) {
            console.error(`Erreur lors de l'application de la sanction:`, error);
        }
    }

    async getLogChannel(guild) {
        const settings = await this.getSettings(guild.id);
        if (settings.logs?.enabled && settings.logs?.channelId) {
            return guild.channels.cache.get(settings.logs.channelId);
        }
        return null;
    }

    async warnUser(member, moduleName, logChannel) {
        try {
            await member.send(`⚠️ Vous avez reçu un avertissement pour violation du module ${moduleName}.`);
            this.logAction(logChannel, member, moduleName, 'Avertissement');
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'avertissement:', error);
        }
    }

    async muteUser(member, moduleName, logChannel, duration = 5 * 60 * 1000) {
        try {
            let muteRole = member.guild.roles.cache.find(r => r.name === 'Muted');
            
            if (!muteRole) {
                // Créer le rôle Muted s'il n'existe pas
                muteRole = await member.guild.roles.create({
                    name: 'Muted',
                    reason: 'Création du rôle Muted pour l\'AutoMod',
                    permissions: []
                });

                // Configurer les permissions dans tous les canaux
                member.guild.channels.cache.forEach(async (channel) => {
                    await channel.permissionOverwrites.create(muteRole, {
                        SendMessages: false,
                        AddReactions: false,
                        Speak: false
                    });
                });
            }

            await member.roles.add(muteRole);
            this.logAction(logChannel, member, moduleName, 'Mute temporaire');
            
            // Retirer le rôle après la durée spécifiée
            setTimeout(async () => {
                try {
                    if (member.roles.cache.has(muteRole.id)) {
                        await member.roles.remove(muteRole);
                        this.logAction(logChannel, member, moduleName, 'Fin du mute');
                    }
                } catch (error) {
                    console.error('Erreur lors du retrait du rôle Muted:', error);
                }
            }, duration);
        } catch (error) {
            console.error('Erreur lors du mute:', error);
        }
    }

    async kickUser(member, moduleName, logChannel) {
        try {
            await member.send(`🚫 Vous avez été expulsé du serveur pour violation du module ${moduleName}.`);
            await member.kick(`AutoMod: Violation du module ${moduleName}`);
            this.logAction(logChannel, member, moduleName, 'Expulsion');
        } catch (error) {
            console.error('Erreur lors de l\'expulsion:', error);
        }
    }

    async banUser(member, moduleName, logChannel) {
        try {
            await member.send(`🔨 Vous avez été banni du serveur pour violation du module ${moduleName}.`);
            await member.ban({ reason: `AutoMod: Violation du module ${moduleName}` });
            this.logAction(logChannel, member, moduleName, 'Bannissement');
        } catch (error) {
            console.error('Erreur lors du bannissement:', error);
        }
    }

    logAction(logChannel, member, moduleName, action) {
        if (logChannel) {
            logChannel.send({
                embeds: [{
                    color: 0xff0000,
                    title: '🛡️ Action AutoMod',
                    description: `**Module:** ${moduleName}\n**Action:** ${action}\n**Utilisateur:** ${member.user.tag} (${member.id})`,
                    timestamp: new Date()
                }]
            }).catch(console.error);
        }
    }
}

module.exports = new AutoModManager();