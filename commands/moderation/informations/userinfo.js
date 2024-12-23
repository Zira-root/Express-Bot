const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    ComponentType
} = require('discord.js');
const moment = require('moment');
moment.locale('fr');

module.exports = {
    name: 'userinfo',
    description: 'Affiche les informations d\'un utilisateur',
    async execute(message, args) {
        // Récupération de l'utilisateur mentionné ou l'auteur du message
        const target = message.mentions.users.first() || message.author;
        const member = await message.guild.members.fetch(target.id);

        // Création du menu déroulant
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_userinfo')
                    .setPlaceholder('Sélectionnez les informations à afficher')
                    .addOptions([
                        {
                            label: 'Informations générales',
                            description: 'Informations de base sur l\'utilisateur',
                            value: 'general',
                            emoji: '📋'
                        },
                        {
                            label: 'Rôles',
                            description: 'Liste des rôles de l\'utilisateur',
                            value: 'roles',
                            emoji: '🎭'
                        },
                        {
                            label: 'Permissions',
                            description: 'Liste des permissions de l\'utilisateur',
                            value: 'permissions',
                            emoji: '🔒'
                        },
                        {
                            label: 'Statistiques',
                            description: 'Statistiques sur l\'utilisateur',
                            value: 'stats',
                            emoji: '📊'
                        },
                        {
                            label: 'Badges',
                            description: 'Badges et distinctions de l\'utilisateur',
                            value: 'badges',
                            emoji: '🏆'
                        },
                        {
                            label: 'Activités',
                            description: 'Activités actuelles de l\'utilisateur',
                            value: 'activities',
                            emoji: '🎮'
                        },
                        {
                            label: 'Profil',
                            description: 'Informations de profil personnalisées',
                            value: 'profile',
                            emoji: '👤'
                        },
                        {
                            label: 'Appareil',
                            description: 'Plateforme et client utilisés',
                            value: 'device',
                            emoji: '📱'
                        }
                    ]),
            );

        // Création de l'embed
        const embed = new EmbedBuilder()
            .setAuthor({
                name: target.tag,
                iconURL: target.displayAvatarURL({ dynamic: true })
            })
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))
            .setColor('#2F3136')
            .setFooter({
                text: `ID: ${target.id}`,
                iconURL: message.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        // Fonction pour obtenir les informations générales
        function getGeneralInfo() {
            return [
                `👤 **Nom d'utilisateur:** \`${target.username}\``,
                `🏷️ **Tag:** \`#${target.discriminator}\``,
                `📅 **Compte créé le:** \`${moment(target.createdAt).format('LL')}\``,
                `📥 **A rejoint le serveur le:** \`${moment(member.joinedAt).format('LL')}\``,
                `🎭 **Surnom sur le serveur:** \`${member.nickname || 'Aucun'}\``,
                `🤖 **Bot:** \`${target.bot ? 'Oui' : 'Non'}\``
            ].join('\n');
        }

        // Fonction pour obtenir les rôles
        function getRoles() {
            const roles = member.roles.cache
                .sort((a, b) => b.position - a.position)
                .map(role => role)
                .filter(role => role.name !== '@everyone');
            return roles.length ? roles.join(', ') : 'Aucun rôle'
        }

        // Fonction pour obtenir les badges
        function getBadges() {
            const flags = target.flags.toArray();
            const badgeEmojis = {
                DISCORD_EMPLOYEE: '<:staff:123> Staff Discord',
                PARTNERED_SERVER_OWNER: '<:partner:123> Propriétaire Serveur Partenaire',
                HYPESQUAD_EVENTS: '<:hypesquad:123> HypeSquad Events',
                BUGHUNTER_LEVEL_1: '<:bughunter:123> Bug Hunter',
                HOUSE_BRAVERY: '<:bravery:123> HypeSquad Bravery',
                HOUSE_BRILLIANCE: '<:brilliance:123> HypeSquad Brilliance',
                HOUSE_BALANCE: '<:balance:123> HypeSquad Balance',
                EARLY_SUPPORTER: '<:supporter:123> Soutien de la première heure',
                VERIFIED_BOT: '<:verifiedbot:123> Bot Vérifié',
                VERIFIED_DEVELOPER: '<:developer:123> Développeur Bot Vérifié'
            };

            const userBadges = flags.map(flag => badgeEmojis[flag] || flag).join('\n');
            return userBadges || 'Aucun badge';
        }

        // Fonction pour obtenir les activités détaillées
        function getActivities() {
            if (!member.presence || !member.presence.activities.length) return 'Aucune activité en cours';

            return member.presence.activities.map(activity => {
                let details = [`**Type:** ${activity.type}`];
                if (activity.name) details.push(`**Nom:** ${activity.name}`);
                if (activity.details) details.push(`**Détails:** ${activity.details}`);
                if (activity.state) details.push(`**État:** ${activity.state}`);
                if (activity.timestamps?.start) {
                    const duration = moment.duration(Date.now() - activity.timestamps.start).humanize();
                    details.push(`**Durée:** ${duration}`);
                }
                return details.join('\n');
            }).join('\n\n');
        }

        // Fonction pour obtenir le profil
        function getProfile() {
            const nitro = member.premiumSince 
                ? `🎁 **Nitro depuis:** \`${moment(member.premiumSince).format('LL')}\`` 
                : '❌ **Pas de Nitro**';
            
            const booster = member.premiumSinceTimestamp
                ? `💎 **Boost le serveur depuis:** \`${moment(member.premiumSinceTimestamp).format('LL')}\``
                : '❌ **Ne boost pas le serveur**';

            return [
                nitro,
                booster,
                `🎨 **Couleur:** \`${member.displayHexColor}\``,
                `🏷️ **Plus haut rôle:** \`${member.roles.highest.name}\``,
                `📝 **Compte créé il y a:** \`${moment(target.createdAt).fromNow()}\``,
                `📥 **Rejoint il y a:** \`${moment(member.joinedAt).fromNow()}\``
            ].join('\n');
        }

        // Fonction pour obtenir l'appareil
        function getDevice() {
            const clientStatus = member.presence?.clientStatus || {};
            const devices = [];
            
            if (clientStatus.desktop) devices.push('🖥️ **PC**');
            if (clientStatus.mobile) devices.push('📱 **Mobile**');
            if (clientStatus.web) devices.push('🌐 **Web**');

            if (devices.length === 0) return '❌ **Hors ligne ou status invisible**';

            const status = {
                online: '🟢 En ligne',
                idle: '🟡 Inactif',
                dnd: '🔴 Ne pas déranger',
                offline: '⚫ Hors ligne'
            };

            return [
                `**Appareils connectés:**\n${devices.join('\n')}`,
                `\n**Status:** \`${status[member.presence?.status || 'offline']}\``
            ].join('\n')
        }

        // Fonction pour obtenir les permissions
        function getPermissions() {
            const permissions = member.permissions.toArray()
                .map(perm => `\`${perm}\``)
                .join(', ');
            return permissions || 'Aucune permission';
        }

        // Fonction pour obtenir les statistiques
        function getStats() {
            return [
                `📊 **Position dans le serveur:** \`${message.guild.memberCount}e membre\``,
                `🎨 **Couleur du plus haut rôle:** \`${member.displayHexColor}\``,
                `🎮 **Status:** \`${member.presence?.status || 'Inconnu'}\``,
                `🎯 **Activité:** \`${member.presence?.activities[0]?.name || 'Aucune'}\``
            ].join('\n');
        }

        // Affichage initial avec les informations générales
        embed.setDescription(getGeneralInfo());
        
        // Envoi du message initial
        const response = await message.reply({
            embeds: [embed],
            components: [row]
        });

        // Création du collecteur pour le menu
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({
                    content: 'Vous ne pouvez pas utiliser ce menu.',
                    ephemeral: true
                });
            }

            const selection = i.values[0];
            switch (selection) {
                case 'general':
                    embed.setDescription(getGeneralInfo());
                    break;
                case 'roles':
                    embed.setDescription(`**Rôles de l'utilisateur:**\n${getRoles()}`);
                    break;
                case 'permissions':
                    embed.setDescription(`**Permissions de l'utilisateur:**\n${getPermissions()}`);
                    break;
                case 'stats':
                    embed.setDescription(getStats());
                    break;
                case 'badges':
                    embed.setDescription(getBadges());
                    break;
                case 'activities':
                    embed.setDescription(getActivities());
                    break;
                case 'profile':
                    embed.setDescription(getProfile());
                    break;
                case 'device':
                    embed.setDescription(getDevice());
            }

            await i.update({ embeds: [embed] });
        });

        collector.on('end', () => {
            row.components[0].setDisabled(true);
            if (!response.deleted) {
                response.edit({ components: [row] }).catch(() => {});
            }
        });
    },
};