const {
    EmbedBuilder, 
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType
} = require('discord.js');
const moment = require('moment');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const ServerStats = require('../../../utils/database/schema/ServerStats');
moment.locale('fr');

module.exports = {
    name: 'servinfo',
    description: 'Affiche les informations du serveur',

    async execute(message, args) {
        const guild = message.guild;

        // Créer l'embed initial
        const embed = new EmbedBuilder()
            .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .setColor('#2F3136')
            .setFooter({ 
                text: `ID: ${guild.id}`,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        // Si le serveur a une bannière, l'ajouter
        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }

        // Créer les composants interactifs
        const menuRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_servinfo')
                    .setPlaceholder('Sélectionnez les informations à afficher')
                    .addOptions([
                        {
                            label: 'Informations générales',
                            description: 'Informations de base sur le serveur',
                            value: 'general',
                            emoji: '📋'
                        },
                        {
                            label: 'Statistiques',
                            description: 'Statistiques du serveur',
                            value: 'stats',
                            emoji: '📊'
                        },
                        {
                            label: 'Salons',
                            description: 'Informations sur les salons',
                            value: 'channels',
                            emoji: '💬'
                        },
                        {
                            label: 'Sécurité',
                            description: 'Paramètres de sécurité',
                            value: 'security',
                            emoji: '🔒'
                        },
                        {
                            label: 'Émojis & Stickers',
                            description: 'Liste des émojis et stickers',
                            value: 'emojis',
                            emoji: '😄'
                        },
                        {
                            label: 'Boosts',
                            description: 'Informations sur les boosts',
                            value: 'boosts',
                            emoji: '🚀'
                        },
                        {
                            label: 'Membres',
                            description: 'Statistiques des membres',
                            value: 'members',
                            emoji: '👥'
                        },
                        {
                            label: 'Features',
                            description: 'Fonctionnalités du serveur',
                            value: 'features',
                            emoji: '✨'
                        }
                    ])
            );

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('show_graph')
                    .setLabel('📊 Courbes')
                    .setStyle(ButtonStyle.Primary)
            );

        // Initialisation des stats du jour
        async function initializeStats() {
            try {
                const existingStats = await ServerStats.findOne({
                    guildId: guild.id,
                    date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                });

                if (!existingStats) {
                    await ServerStats.create({
                        guildId: guild.id,
                        date: new Date(),
                        stats: {
                            members: guild.members.cache.filter(m => !m.user.bot).size,
                            bots: guild.members.cache.filter(m => m.user.bot).size,
                            channels: {
                                text: guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size,
                                voice: guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size,
                                announcement: guild.channels.cache.filter(c => c.type === ChannelType.GuildAnnouncement).size,
                                stage: guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size,
                                forum: guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size
                            },
                            roles: guild.roles.cache.size,
                            emojis: guild.emojis.cache.size,
                            stickers: guild.stickers.cache.size,
                            boosts: guild.premiumSubscriptionCount || 0,
                            online: guild.members.cache.filter(m => m.presence?.status === 'online').size,
                            idle: guild.members.cache.filter(m => m.presence?.status === 'idle').size,
                            dnd: guild.members.cache.filter(m => m.presence?.status === 'dnd').size,
                            offline: guild.memberCount - guild.members.cache.filter(m => ['online', 'idle', 'dnd'].includes(m.presence?.status)).size
                        },
                        creationHistory: {
                            channels: guild.channels.cache.map(c => ({
                                id: c.id,
                                name: c.name,
                                type: c.type,
                                createdAt: c.createdAt
                            })),
                            roles: guild.roles.cache.map(r => ({
                                id: r.id,
                                name: r.name,
                                createdAt: r.createdAt
                            })),
                            emojis: guild.emojis.cache.map(e => ({
                                id: e.id,
                                name: e.name,
                                createdAt: e.createdAt
                            }))
                        }
                    });
                }
            } catch (error) {
                console.error('Erreur lors de l\'initialisation des stats:', error);
            }
        }

        // Fonctions d'affichage des informations
        const displayFunctions = {
            general: () => [
                `👑 **Propriétaire:** <@${guild.ownerId}>`,
                `📅 **Créé le:** ${moment(guild.createdAt).format('LL')}`,
                `🌍 **Région:** ${guild.preferredLocale}`,
                `💎 **Niveau de boost:** ${guild.premiumTier}`,
                `✨ **Description:** ${guild.description || 'Aucune description'}`,
                `🏷️ **Vanity URL:** ${guild.vanityURLCode ? `discord.gg/${guild.vanityURLCode}` : 'Aucune'}`
            ].join('\n'),

            stats: () => [
                `👥 **Membres:** ${guild.memberCount}`,
                `🤖 **Bots:** ${guild.members.cache.filter(m => m.user.bot).size}`,
                `🎭 **Rôles:** ${guild.roles.cache.size}`,
                `💬 **Salons:** ${guild.channels.cache.size}`,
                `😄 **Émojis:** ${guild.emojis.cache.size}`,
                `🎯 **Stickers:** ${guild.stickers.cache.size}`,
                `🚀 **Nombre de boosts:** ${guild.premiumSubscriptionCount || 0}`
            ].join('\n'),

            members: () => {
                const online = guild.members.cache.filter(m => m.presence?.status === 'online').size;
                const idle = guild.members.cache.filter(m => m.presence?.status === 'idle').size;
                const dnd = guild.members.cache.filter(m => m.presence?.status === 'dnd').size;
                const offline = guild.memberCount - online - idle - dnd;

                return [
                    `**Total des membres:** ${guild.memberCount}`,
                    `\n**Status:**`,
                    `🟢 En ligne: ${online}`,
                    `🟡 Inactif: ${idle}`,
                    `🔴 Ne pas déranger: ${dnd}`,
                    `⚫ Hors ligne: ${offline}`,
                    `\n**Composition:**`,
                    `👥 Humains: ${guild.members.cache.filter(m => !m.user.bot).size}`,
                    `🤖 Bots: ${guild.members.cache.filter(m => m.user.bot).size}`
                ].join('\n');
            },

            channels: () => {
                const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
                const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
                const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
                const announcements = guild.channels.cache.filter(c => c.type === ChannelType.GuildAnnouncement).size;
                const stages = guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size;
                const forums = guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size;
            
                return [
                    `💬 **Salons textuels:** ${textChannels}`,
                    `🔊 **Salons vocaux:** ${voiceChannels}`,
                    `📢 **Salons d'annonce:** ${announcements}`,
                    `🎭 **Salons de stage:** ${stages}`,
                    `📚 **Forums:** ${forums}`,
                    `📁 **Catégories:** ${categories}`
                ].join('\n');
            },
            
            security: () => {
                const verificationLevels = {
                    0: '❌ Aucune',
                    1: '✉️ Email vérifié',
                    2: '📱 Inscription depuis 5 minutes',
                    3: '⏰ Membre depuis 10 minutes',
                    4: '📱 Numéro de téléphone vérifié'
                };
            
                const contentFilter = {
                    0: '❌ Désactivé',
                    1: '👀 Analyse les messages des membres sans rôle',
                    2: '✅ Analyse tous les messages'
                };
            
                return [
                    `🛡️ **Niveau de vérification:** ${verificationLevels[guild.verificationLevel]}`,
                    `🔞 **Filtre de contenu explicite:** ${contentFilter[guild.explicitContentFilter]}`,
                    `🔔 **Notifications par défaut:** ${guild.defaultMessageNotifications === 'MENTIONS' ? 'Mentions uniquement' : 'Tous les messages'}`,
                    `⚠️ **2FA requis pour la modération:** ${guild.mfaLevel === 1 ? 'Oui' : 'Non'}`
                ].join('\n');
            },
            
            emojis: () => {
                const animatedEmojis = guild.emojis.cache.filter(emoji => emoji.animated).size;
                const staticEmojis = guild.emojis.cache.filter(emoji => !emoji.animated).size;
                const emojiList = guild.emojis.cache
                    .sort((a, b) => b.animated - a.animated)
                    .first(15)
                    .map(emoji => emoji.toString())
                    .join(' ');
            
                return [
                    `**Émojis:** ${guild.emojis.cache.size}/${guild.maxEmojis}`,
                    `• Animés: ${animatedEmojis}`,
                    `• Statiques: ${staticEmojis}`,
                    `\n**Stickers:** ${guild.stickers.cache.size}/${guild.maxStickers}`,
                    `\n**Aperçu des émojis:**\n${emojiList}`
                ].join('\n');
            },
            
            boosts: () => {
                const boostTiers = {
                    0: 'Aucun boost',
                    1: 'Niveau 1',
                    2: 'Niveau 2',
                    3: 'Niveau 3'
                };
            
                const benefits = {
                    0: ['❌ Aucun avantage'],
                    1: ['✨ 50 emplacements d\'émojis supplémentaires', '🎭 Avatar animé du serveur', '128 Kbps qualité audio'],
                    2: ['✨ 100 emplacements d\'émojis supplémentaires', '🎥 Bannière de serveur', '256 Kbps qualité audio'],
                    3: ['✨ 250 emplacements d\'émojis supplémentaires', '🎯 URL personnalisée', '384 Kbps qualité audio']
                };
            
                return [
                    `🚀 **Niveau actuel:** ${boostTiers[guild.premiumTier]}`,
                    `💎 **Nombre de boosts:** ${guild.premiumSubscriptionCount || 0}`,
                    `\n**Avantages débloqués:**\n${benefits[guild.premiumTier].map(b => `• ${b}`).join('\n')}`
                ].join('\n');
            },
            
            features: () => {
                const featuresList = {
                    ANIMATED_BANNER: '🎥 Bannière animée',
                    ANIMATED_ICON: '🎭 Icône animée',
                    AUTO_MODERATION: '🛡️ Auto modération',
                    BANNER: '🎌 Bannière',
                    COMMUNITY: '👥 Communautaire',
                    DISCOVERABLE: '🔍 Découvrable',
                    FEATURABLE: '✨ Mise en avant possible',
                    INVITE_SPLASH: '🎨 Splash d\'invitation',
                    MEMBER_VERIFICATION_GATE_ENABLED: '✅ Vérification des membres',
                    NEWS: '📢 Salons d\'annonce',
                    PARTNERED: '🤝 Partenaire',
                    PREVIEW_ENABLED: '👀 Prévisualisation',
                    VANITY_URL: '🔗 URL personnalisée',
                    VERIFIED: '✓ Vérifié',
                    VIP_REGIONS: '🌟 Régions VIP',
                    WELCOME_SCREEN_ENABLED: '👋 Écran de bienvenue'
                };
            
                const features = guild.features
                    .map(feature => featuresList[feature] || feature)
                    .join('\n');
            
                return features || 'Aucune feature spéciale';
            }
        };

        // Initialisation des stats et envoi du message initial
        await initializeStats();
        embed.setDescription(displayFunctions.general());
        const response = await message.reply({
            embeds: [embed],
            components: [buttonRow, menuRow]
        });

        // Création du collecteur
        const collector = response.createMessageComponentCollector({
            filter: () => true,
            idle: 120000
        });

        // Fonction pour générer les graphiques
        async function generateGraph(filterType) {
            const stats = await ServerStats.find({
                guildId: guild.id,
                date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }).sort({ date: 1 });

            if (!stats.length) return null;

            const chartConfig = {
                type: 'line',
                data: {
                    labels: stats.map(stat => moment(stat.date).format('DD/MM')),
                    datasets: []
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true },
                        x: { grid: { display: false } }
                    },
                    plugins: {
                        legend: { 
                            position: 'top',
                            labels: { padding: 20 }
                        }
                    }
                }
            };

            const graphData = {
                members_bots: [
                    {
                        label: 'Membres',
                        data: stats.map(s => s.stats.members),
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    },
                    {
                        label: 'Bots',
                        data: stats.map(s => s.stats.bots),
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    }
                ],
                member_status: [
                    {
                        label: 'En ligne',
                        data: stats.map(s => s.stats.online),
                        borderColor: 'rgb(0, 255, 0)',
                        tension: 0.1
                    },
                    {
                        label: 'Inactif',
                        data: stats.map(s => s.stats.idle),
                        borderColor: 'rgb(255, 255, 0)',
                        tension: 0.1
                    },
                    {
                        label: 'Ne pas déranger',
                        data: stats.map(s => s.stats.dnd),
                        borderColor: 'rgb(255, 0, 0)',
                        tension: 0.1
                    },
                    {
                        label: 'Hors-ligne',
                        data: stats.map(s => s.stats.offline),
                        borderColor: 'rgb(128, 128, 128)',
                        tension: 0.1
                    }
                ],
                channels: [
                    {
                        label: 'Textuels',
                        data: stats.map(s => s.stats.channels.text),
                        borderColor: 'rgb(54, 162, 235)',
                        tension: 0.1
                    },
                    {
                        label: 'Vocaux',
                        data: stats.map(s => s.stats.channels.voice),
                        borderColor: 'rgb(255, 159, 64)',
                        tension: 0.1
                    },
                    {
                        label: 'Annonces',
                        data: stats.map(s => s.stats.channels.announcement),
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    },
                    {
                        label: 'Forums',
                        data: stats.map(s => s.stats.channels.forum),
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }
                ],
                emojis_stickers: [
                    {
                        label: 'Émojis',
                        data: stats.map(s => s.stats.emojis),
                        borderColor: 'rgb(255, 206, 86)',
                        tension: 0.1
                    },
                    {
                        label: 'Stickers',
                        data: stats.map(s => s.stats.stickers),
                        borderColor: 'rgb(153, 102, 255)',
                        tension: 0.1
                    }
                ],
                boosts: [
                    {
                        label: 'Boosts',
                        data: stats.map(s => s.stats.boosts),
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1,
                        fill: true
                    }
                ]
            };

            chartConfig.data.datasets = graphData[filterType] || [];
            const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 400 });
            return await chartJSNodeCanvas.renderToBuffer(chartConfig);
        }

        // Menu pour les graphiques
        const graphMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('graph_filter')
                    .setPlaceholder('Sélectionner les données à afficher')
                    .addOptions([
                        {
                            label: 'Membres et Bots',
                            description: 'Évolution du nombre de membres et bots',
                            value: 'members_bots',
                            emoji: '👥'
                        },
                        {
                            label: 'Status des membres',
                            description: 'En ligne, Inactif, Ne pas déranger, Hors-ligne',
                            value: 'member_status',
                            emoji: '🟢'
                        },
                        {
                            label: 'Salons',
                            description: 'Évolution des différents types de salons',
                            value: 'channels',
                            emoji: '💬'
                        },
                        {
                            label: 'Émojis et Stickers',
                            description: 'Évolution des émojis et stickers',
                            value: 'emojis_stickers',
                            emoji: '😄'
                        },
                        {
                            label: 'Boosts',
                            description: 'Évolution du nombre de boosts',
                            value: 'boosts',
                            emoji: '🚀'
                        }
                    ])
            );

        // Mise à jour du collecteur pour gérer les graphiques
        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: 'Vous ne pouvez pas utiliser ces contrôles.', ephemeral: true });
            }
        
            try {
                if (i.isButton()) {
                    if (i.customId === 'show_graph') {
                        await i.update({
                            embeds: [embed],
                            components: [buttonRow, graphMenu]
                        });
                    }
                } else if (i.isSelectMenu()) {
                    if (i.customId === 'graph_filter') {
                    const buffer = await generateGraph(i.values[0]);
                    if (!buffer) {
                        return i.reply({
                            content: 'Pas assez de données pour générer un graphique.',
                            ephemeral: true
                        });
                    }
                    const attachment = new AttachmentBuilder(buffer, { name: 'graph.png' });
                    const graphEmbed = new EmbedBuilder()
                        .setTitle(`📊 Statistiques - ${i.values[0]}`)
                        .setImage('attachment://graph.png')
                        .setColor('#2F3136')
                        .setTimestamp();

                    await i.update({
                        embeds: [graphEmbed],
                        files: [attachment],
                        components: [buttonRow, graphMenu]
                    });
                } else if (i.customId === 'select_servinfo' && displayFunctions[i.values[0]]) {
                    embed.setDescription(displayFunctions[i.values[0]]());
                    await i.update({
                        embeds: [embed],
                        components: [buttonRow, menuRow]
                    });
                }
            }
        } catch (error) {
            console.error(error);
        }
    });

    }
};