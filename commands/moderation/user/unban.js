const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const moderationManager = require('../../../utils/database/moderationManager');

module.exports = {
    name: 'unban',
    description: 'Débannir un membre du serveur',
    usage: 'unban [ID] [raison]',
    example: 'unban 123456789 Seconde chance',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],

    async execute(message, args) {
        // Si aucun argument n'est fourni, afficher la liste des bannis
        if (!args[0]) {
            try {
                const bans = await message.guild.bans.fetch();
                
                if (bans.size === 0) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#ffca00')
                                .setDescription('⚠️ Aucun membre n\'est banni du serveur.')
                        ]
                    });
                }

                // Création des pages d'embed (10 bannis par page)
                const banListEmbeds = [];
                const bansArray = [...bans.values()];
                const totalPages = Math.ceil(bans.size / 10);

                for (let i = 0; i < totalPages; i++) {
                    const currentBans = bansArray.slice(i * 10, (i + 1) * 10);
                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('📜 Liste des membres bannis')
                        .setDescription(currentBans.map((ban, index) => 
                            `\`${(i * 10) + index + 1}.\` ${ban.user.tag} (\`${ban.user.id}\`)\n┗ Raison: ${ban.reason || 'Aucune raison spécifiée'}`
                        ).join('\n\n'))
                        .setFooter({ text: `Page ${i + 1}/${totalPages} • Total: ${bans.size} bannis` });

                    banListEmbeds.push(embed);
                }

                // Si une seule page, pas besoin de boutons
                if (banListEmbeds.length === 1) {
                    return message.reply({ embeds: [banListEmbeds[0]] });
                }

                // Sinon, créer les boutons de navigation
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
                            disabled: currentPage === banListEmbeds.length - 1
                        },
                        {
                            type: 2,
                            style: 1,
                            custom_id: 'last',
                            label: '⏭️',
                            disabled: currentPage === banListEmbeds.length - 1
                        }
                    ]
                }];

                const banListMsg = await message.reply({
                    embeds: [banListEmbeds[0]],
                    components: getButtons(0)
                });

                // Collecteur pour les boutons
                const collector = banListMsg.createMessageComponentCollector({
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
                            currentPage = Math.min(banListEmbeds.length - 1, currentPage + 1);
                            break;
                        case 'last':
                            currentPage = banListEmbeds.length - 1;
                            break;
                    }

                    await interaction.update({
                        embeds: [banListEmbeds[currentPage]],
                        components: getButtons(currentPage)
                    });
                });

                collector.on('end', async () => {
                    try {
                        await banListMsg.edit({
                            components: []
                        });
                    } catch (err) {
                        console.error('Impossible de mettre à jour le message après expiration:', err);
                    }
                });

                return;
            } catch (error) {
                console.error('Erreur lors de la récupération des bans:', error);
                return message.reply('Une erreur est survenue lors de la récupération de la liste des bannis.');
            }
        }

        // Si un ID est fourni, procéder au débannissement
        const userId = args[0].replace(/[<@!>]/g, '');
        const reason = args.slice(1).join(' ') || 'Aucune raison spécifiée';

        try {
            const ban = await message.guild.bans.fetch(userId).catch(() => null);
            if (!ban) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription('❌ Cet utilisateur n\'est pas banni du serveur.')
                    ]
                });
            }

            // Création de l'embed de confirmation
            const confirmEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🔓 Débannissement')
                .setDescription(`Êtes-vous sûr de vouloir débannir ${ban.user.tag} ?`)
                .addFields([
                    { name: 'Utilisateur', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
                    { name: 'Modérateur', value: message.author.tag, inline: true },
                    { name: 'Raison du débannissement', value: reason }
                ]);

            const confirmMsg = await message.reply({
                embeds: [confirmEmbed],
                components: [{
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 3,
                            label: 'Confirmer',
                            custom_id: 'confirm_unban'
                        },
                        {
                            type: 2,
                            style: 4,
                            label: 'Annuler',
                            custom_id: 'cancel_unban'
                        }
                    ]
                }]
            });

            try {
                const filter = i => i.user.id === message.author.id;
                const response = await confirmMsg.awaitMessageComponent({ filter, time: 30000 });

                if (response.customId === 'cancel_unban') {
                    await confirmMsg.edit({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#ff0000')
                                .setDescription('❌ Débannissement annulé.')
                        ],
                        components: []
                    });
                    return;
                }

                // Débannissement
                await message.guild.members.unban(ban.user.id, reason);

                // Création de la sanction dans la base de données
                const sanction = await moderationManager.createSanction(
                    message.guild.id,
                    ban.user.id,
                    message.author.id,
                    'UNBAN',
                    reason
                );

                // Logs de modération
                const logEmbed = moderationManager.createModLogEmbed(sanction, ban.user, message.author);
                const logChannel = await moderationManager.getModLogChannel(message.guild.id);
                if (logChannel) {
                    const channel = await message.guild.channels.fetch(logChannel);
                    channel?.send({ embeds: [logEmbed] });
                }

                // Message de confirmation
                await confirmMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00ff00')
                            .setDescription(`✅ ${ban.user.tag} a été débanni.\nCase ID: #${sanction.caseId}`)
                    ],
                    components: []
                });

            } catch (error) {
                if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                    await confirmMsg.edit({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#ff0000')
                                .setDescription('❌ Temps écoulé, débannissement annulé.')
                        ],
                        components: []
                    });
                } else {
                    console.error(error);
                    message.reply('Une erreur est survenue lors du débannissement.');
                }
            }

        } catch (error) {
            console.error('Erreur lors du débannissement:', error);
            message.reply('Une erreur est survenue lors du débannissement.');
        }
    }
};