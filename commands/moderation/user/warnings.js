const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const moderationManager = require('../../../utils/database/moderationManager');

module.exports = {
    name: 'warnings',
    description: 'Voir les avertissements du serveur ou d\'un membre',
    usage: 'warnings [@utilisateur/ID]',
    example: 'warnings @User',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],

    async execute(message, args) {
        if (args[0]) {
            const target = message.mentions.members.first() 
                || await message.guild.members.fetch(args[0]).catch(() => null);

            if (!target) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription('❌ | Utilisateur introuvable.')
                    ]
                });
            }

            // Récupération des avertissements
            const warnings = await moderationManager.getUserSanctions(message.guild.id, target.id);
            const allWarns = warnings.filter(s => s.type === 'WARN');
            const activeWarns = allWarns.filter(w => w.active);
            const removedWarns = allWarns.filter(w => !w.active);

            if (allWarns.length === 0) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00ff00')
                            .setDescription(`✅ | ${target.user.tag} n'a jamais reçu d'avertissement.`)
                    ]
                });
            }

            // Fonction pour créer les embeds selon le filtre
            const createWarningEmbeds = (warns) => {
                const warningEmbeds = [];
                const warnsArray = [...warns].sort((a, b) => b.timestamp - a.timestamp);
                const totalPages = Math.ceil(warnsArray.length / 5);

                for (let i = 0; i < totalPages; i++) {
                    const currentWarns = warnsArray.slice(i * 5, (i + 1) * 5);
                    const embed = new EmbedBuilder()
                        .setColor('#ffa500')
                        .setTitle(`⚠️ Avertissements de ${target.user.tag}`)
                        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                        .setDescription(currentWarns.map((warn, index) => {
                            const status = warn.active ? '🟢 Actif' : '🔴 Retiré';
                            const date = new Date(warn.timestamp).toLocaleString('fr-FR', {
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: 'numeric'
                            });
                            const warnNumber = index + 1;
                            return `**Case #${warnNumber}** - ${status}\n👮 Modérateur: <@${warn.moderatorId}>\n📅 Date: ${date}\n📝 Raison: ${warn.reason}\n`;
                        }).join('\n'))
                        .setFooter({ 
                            text: `Page ${i + 1}/${totalPages} • ${activeWarns.length} avertissement${activeWarns.length > 1 ? 's' : ''} actif${activeWarns.length > 1 ? 's' : ''} sur ${allWarns.length} total` 
                        });

                    warningEmbeds.push(embed);
                }
                return warningEmbeds;
            };

            // Créer les différents sets d'embeds
            let currentFilter = 'all';
            let currentEmbeds = createWarningEmbeds(allWarns);
            let currentPage = 0;

            // Fonction pour obtenir les boutons de navigation et de filtre
            const getButtons = (currentPage, embeds, filter) => [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 2,
                            custom_id: 'filter_all',
                            label: 'Tout',
                            disabled: filter === 'all'
                        },
                        {
                            type: 2,
                            style: 2,
                            custom_id: 'filter_active',
                            label: 'Actif',
                            disabled: filter === 'active'
                        },
                        {
                            type: 2,
                            style: 2,
                            custom_id: 'filter_removed',
                            label: 'Retiré',
                            disabled: filter === 'removed'
                        },
                        {
                            type: 2,
                            style: 4,
                            custom_id: 'clean_history',
                            label: 'Nettoyer',
                            disabled: !message.member.permissions.has(PermissionFlagsBits.Administrator)
                        }
                    ]
                },
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 1,
                            custom_id: 'first',
                            label: '⏮️',
                            disabled: currentPage === 0
                        },
                        {
                            type: 2,
                            style: 1,
                            custom_id: 'previous',
                            label: '◀️',
                            disabled: currentPage === 0
                        },
                        {
                            type: 2,
                            style: 1,
                            custom_id: 'next',
                            label: '▶️',
                            disabled: currentPage === embeds.length - 1 || embeds.length === 0
                        },
                        {
                            type: 2,
                            style: 1,
                            custom_id: 'last',
                            label: '⏭️',
                            disabled: currentPage === embeds.length - 1 || embeds.length === 0
                        }
                    ]
                }
            ];

            // Message initial
            const warningMsg = await message.reply({
                embeds: currentEmbeds.length > 0 ? [currentEmbeds[0]] : [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('Aucun avertissement à afficher.')
                ],
                components: getButtons(0, currentEmbeds, currentFilter)
            });

            // Collecteur pour les boutons
            const collector = warningMsg.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 300000
            });

            collector.on('collect', async interaction => {
                if (interaction.customId.startsWith('filter_')) {
                    switch (interaction.customId) {
                        case 'filter_all':
                            currentEmbeds = createWarningEmbeds(allWarns);
                            currentFilter = 'all';
                            break;
                        case 'filter_active':
                            currentEmbeds = createWarningEmbeds(activeWarns);
                            currentFilter = 'active';
                            break;
                        case 'filter_removed':
                            currentEmbeds = createWarningEmbeds(removedWarns);
                            currentFilter = 'removed';
                            break;
                    }
                    currentPage = 0;
                } else if (interaction.customId === 'clean_history') {
                    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                        return interaction.reply({
                            content: '❌ Vous devez être administrateur pour nettoyer l\'historique.',
                            ephemeral: true
                        });
                    }

                    // Confirmation de nettoyage
                    const confirmEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('⚠️ Confirmation de nettoyage')
                        .setDescription(`Êtes-vous sûr de vouloir nettoyer l'historique des avertissements de ${target.user.tag} ?\nCette action est irréversible.`);

                    const confirmMsg = await interaction.reply({
                        embeds: [confirmEmbed],
                        components: [{
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    style: 4,
                                    label: 'Confirmer',
                                    custom_id: 'confirm_clean'
                                },
                                {
                                    type: 2,
                                    style: 2,
                                    label: 'Annuler',
                                    custom_id: 'cancel_clean'
                                }
                            ]
                        }],
                        ephemeral: true
                    });

                    try {
                        const confirmation = await confirmMsg.awaitMessageComponent({ time: 30000 });
                        
                        if (confirmation.customId === 'confirm_clean') {
                            await moderationManager.cleanUserWarnings(message.guild.id, target.id);
                            await confirmation.update({
                                embeds: [new EmbedBuilder()
                                    .setColor('#00ff00')
                                    .setDescription('✅ Historique nettoyé avec succès.')],
                                components: []
                            });
                            
                            // Mettre à jour l'affichage
                            currentEmbeds = [];
                            currentPage = 0;
                            await warningMsg.edit({
                                embeds: [new EmbedBuilder()
                                    .setColor('#00ff00')
                                    .setDescription(`✅ L'historique des avertissements de ${target.user.tag} a été nettoyé.`)],
                                components: []
                            });
                            collector.stop();
                            return;
                        } else {
                            await confirmation.update({
                                embeds: [new EmbedBuilder()
                                    .setColor('#ff0000')
                                    .setDescription('❌ Nettoyage annulé.')],
                                components: []
                            });
                        }
                    } catch (error) {
                        await interaction.editReply({
                            embeds: [new EmbedBuilder()
                                .setColor('#ff0000')
                                .setDescription('❌ Temps écoulé, nettoyage annulé.')],
                            components: []
                        });
                    }
                    return;
                } else {
                    // Navigation
                    switch (interaction.customId) {
                        case 'first':
                            currentPage = 0;
                            break;
                        case 'previous':
                            currentPage = Math.max(0, currentPage - 1);
                            break;
                        case 'next':
                            currentPage = Math.min(currentEmbeds.length - 1, currentPage + 1);
                            break;
                        case 'last':
                            currentPage = currentEmbeds.length - 1;
                            break;
                    }
                }

                await interaction.update({
                    embeds: currentEmbeds.length > 0 ? [currentEmbeds[currentPage]] : [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription('Aucun avertissement à afficher.')
                    ],
                    components: getButtons(currentPage, currentEmbeds, currentFilter)
                });
            });

            collector.on('end', async () => {
                try {
                    await warningMsg.edit({ components: [] });
                } catch (err) {
                    console.error('Impossible de mettre à jour le message après expiration:', err);
                }
            });

        } else {
            // Si aucun utilisateur n'est mentionné, afficher la liste globale
            const allWarnings = await moderationManager.getAllActiveWarnings(message.guild.id);
            
            if (allWarnings.length === 0) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00ff00')
                            .setDescription('✅ | Aucun avertissement actif sur le serveur.')
                    ]
                });
            }

            // Grouper les avertissements par utilisateur
            const warningsByUser = new Map();
            for (const warn of allWarnings) {
                if (!warningsByUser.has(warn.userId)) {
                    warningsByUser.set(warn.userId, []);
                }
                warningsByUser.get(warn.userId).push(warn);
            }

            // Création des pages d'embed (10 utilisateurs par page)
            const warningEmbeds = [];
            const usersArray = [...warningsByUser.entries()];
            const totalPages = Math.ceil(usersArray.length / 10);

            for (let i = 0; i < totalPages; i++) {
                const currentUsers = usersArray.slice(i * 10, (i + 1) * 10);
                
                // Récupérer toutes les informations utilisateur d'abord
                const userDescriptions = await Promise.all(currentUsers.map(async ([userId, warns]) => {
                    const user = await message.client.users.fetch(userId).catch(() => null);
                    if (!user) return `ID: ${userId} - ${warns.length} avertissement(s)`;
                    return `<@${userId}> (${user.tag})\n┗ ${warns.length} avertissement${warns.length > 1 ? 's' : ''} actif${warns.length > 1 ? 's' : ''}`;
                }));

                const embed = new EmbedBuilder()
                    .setColor('#ffa500')
                    .setTitle('⚠️ Liste des membres avertis')
                    .setDescription(userDescriptions.join('\n\n'))
                    .setFooter({ 
                        text: `Page ${i + 1}/${totalPages} • Total: ${allWarnings.length} avertissements pour ${usersArray.length} membres` 
                    });

                warningEmbeds.push(embed);
            }

            // Si une seule page, pas besoin de boutons
            if (warningEmbeds.length === 1) {
                return message.reply({ embeds: [warningEmbeds[0]] });
            }

            // Sinon, créer les boutons de navigation (même logique que précédemment)
            let currentPage = 0;

            const getButtons = (currentPage) => [{
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 1,
                        custom_id: 'first',
                        label: '⏮️',
                        disabled: currentPage === 0
                    },
                    {
                        type: 2,
                        style: 1,
                        custom_id: 'previous',
                        label: '◀️',
                        disabled: currentPage === 0
                    },
                    {
                        type: 2,
                        style: 1,
                        custom_id: 'next',
                        label: '▶️',
                        disabled: currentPage === warningEmbeds.length - 1
                    },
                    {
                        type: 2,
                        style: 1,
                        custom_id: 'last',
                        label: '⏭️',
                        disabled: currentPage === warningEmbeds.length - 1
                    }
                ]
            }];

            const warningMsg = await message.reply({
                embeds: [warningEmbeds[0]],
                components: getButtons(0)
            });

            const collector = warningMsg.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 60000
            });

            collector.on('collect', async interaction => {
                switch (interaction.customId) {
                    case 'first':
                        currentPage = 0;
                        break;
                    case 'previous':
                        currentPage = Math.max(0, currentPage - 1);
                        break;
                    case 'next':
                        currentPage = Math.min(warningEmbeds.length - 1, currentPage + 1);
                        break;
                    case 'last':
                        currentPage = warningEmbeds.length - 1;
                        break;
                }

                await interaction.update({
                    embeds: [warningEmbeds[currentPage]],
                    components: getButtons(currentPage)
                });
            });

            collector.on('end', async () => {
                try {
                    await warningMsg.edit({ components: [] });
                } catch (err) {
                    console.error('Impossible de mettre à jour le message après expiration:', err);
                }
            });
        }
    }
};