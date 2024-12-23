const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const AutomodSettings = require('../../../utils/database/schema/AutoModSettings');

module.exports = {
    name: 'automod',
    description: 'Configure le système d\'automodération',
    category: 'moderation',
    permissions: ['ADMINISTRATOR'],
    
    async execute(message, args) {
        if (!message || !message.guild) {
            console.error('Message ou guild non défini:', message);
            return message.reply('Une erreur est survenue lors de l\'exécution de la commande.');
        }

        // Vérification des permissions
        if (!message.member.permissions.has(PermissionsBitField.Flags.ADMINISTRATOR)) {
            return message.reply({ 
                content: '❌ Vous devez être administrateur pour utiliser cette commande.',
                ephemeral: true 
            });
        }

        try {
            let settings = await AutomodSettings.findOne({ guildId: message.guild.id });
            if (!settings) {
                settings = new AutomodSettings({
                    guildId: message.guild.id,
                    enabled: false,
                    logs: {
                        enabled: false,
                        channelId: null
                    },
                    badWords: { enabled: false, words: [], action: 'warn' },
                    spam: { enabled: false, maxMessages: 5, timeWindow: 5000, action: 'warn' },
                    caps: { enabled: false, percentage: 70, action: 'warn' },
                    invites: { enabled: false, action: 'delete', whitelist: [] },
                    mentions: { enabled: false, maxMentions: 5, action: 'warn' }
                });
                await settings.save();
            }

            const embed = new EmbedBuilder()
                .setTitle('🛡️ Configuration de l\'AutoMod')
                .setColor('#2b2d31')
                .setDescription(`
**📋 Statut Global**
${settings.enabled ? '✅ Activé' : '❌ Désactivé'} | #️⃣ automod

**📋 Logs**
${settings.logs.enabled ? '✅ Activé' : '❌ Désactivé'} ${settings.logs.channelId ? `| <#${settings.logs.channelId}>` : ''}

**🚫 Anti-Spam**
${settings.spam.enabled ? '✅' : '❌'} Max ${settings.spam.maxMessages} msgs/${settings.spam.timeWindow/1000}s | Action: ${settings.spam.action}

**🔗 Liens**
${settings.invites.enabled ? '✅' : '❌'} ${settings.invites.whitelist.length} liens autorisés | Action: ${settings.invites.action}

**🤬 Mots Interdits**
${settings.badWords.enabled ? '✅' : '❌'} ${settings.badWords.words.length} mots interdits | Action: ${settings.badWords.action}

**⚡ Majuscules**
${settings.caps.enabled ? '✅' : '❌'} Max ${settings.caps.percentage}% majuscules | Action: ${settings.caps.action}

**📢 Mentions**
${settings.mentions?.enabled ? '✅' : '❌'} Max ${settings.mentions?.maxMentions || 5} mentions | Action: ${settings.mentions?.action || 'warn'}`);

            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('automod_toggle')
                        .setLabel(settings.enabled ? 'Désactiver' : 'Activer')
                        .setEmoji(settings.enabled ? '🔴' : '🟢')
                        .setStyle(settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('config_logs')
                        .setLabel('Configurer Logs')
                        .setEmoji('📋')
                        .setStyle(ButtonStyle.Primary)
                );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('filter_select')
                .setPlaceholder('Sélectionner un filtre à configurer')
                .addOptions([
                    {
                        label: 'Anti-Spam',
                        description: 'Configurer les paramètres anti-spam',
                        value: 'config_spam',
                        emoji: '🚫'
                    },
                    {
                        label: 'Liens',
                        description: 'Configurer les paramètres des liens',
                        value: 'config_invites',
                        emoji: '🔗'
                    },
                    {
                        label: 'Mots Interdits',
                        description: 'Configurer la liste des mots interdits',
                        value: 'config_badwords',
                        emoji: '🤬'
                    },
                    {
                        label: 'Majuscules',
                        description: 'Configurer les paramètres des majuscules',
                        value: 'config_caps',
                        emoji: '⚡'
                    },
                    {
                        label: 'Mentions',
                        description: 'Configurer les paramètres des mentions',
                        value: 'config_mentions',
                        emoji: '📢'
                    }
                ]);

            const row2 = new ActionRowBuilder().addComponents(selectMenu);

            await message.reply({
                embeds: [embed],
                components: [row1, row2]
            });

        } catch (error) {
            console.error('Erreur dans la commande automod:', error);
            await message.reply('Une erreur est survenue lors de l\'exécution de la commande.');
        }
    }
};