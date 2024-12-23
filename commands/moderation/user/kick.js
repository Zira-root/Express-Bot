const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const moderationManager = require('../../../utils/database/moderationManager');

module.exports = {
    name: 'kick',
    description: 'Expulser un membre du serveur',
    usage: 'kick <@utilisateur/ID> [raison]',
    example: 'kick @User Non-respect des règles',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.KickMembers],
    botPermissions: [PermissionFlagsBits.KickMembers],

    async execute(message, args) {
        // Si aucun argument n'est fourni, afficher l'aide
        if (!args[0]) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#ffca00')
                .setTitle('⚠️ Informations')
                .setDescription('Voici la liste des informations que vous pouvez utiliser')
                .addFields(
                    { name: 'Mention', value: 'Vous pouvez mentionner un utilisateur [@User]', inline: false },
                    { name: 'Raison', value: 'Vous pouvez attribuer une raison.', inline: false }
                )
                .setFooter({ text: 'Exemple : !kick @user Spam' });
            
            return message.reply({ embeds: [helpEmbed] });
        }

        // Récupération de l'utilisateur
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

        // Vérifications de base
        if (target.id === message.author.id) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ | Vous ne pouvez pas vous expulser vous-même.')
                ]
            });
        }

        if (target.roles.highest.position >= message.member.roles.highest.position) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ | Vous ne pouvez pas expulser cet utilisateur car son rôle est supérieur ou égal au vôtre.')
                ]
            });
        }

        if (!target.kickable) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ | Je ne peux pas expulser cet utilisateur.')
                ]
            });
        }

        // Récupération de la raison
        const reason = args.slice(1).join(' ') || 'Aucune raison spécifiée';

        // Création de l'embed de confirmation
        const confirmEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('👢 Expulsion')
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setDescription(`Êtes-vous sûr de vouloir expulser ${target.user.tag} ?`)
            .addFields([
                { name: 'Utilisateur', value: `${target.user.tag} (${target.id})`, inline: true },
                { name: 'Modérateur', value: `${message.author.tag}`, inline: true },
                { name: 'Raison', value: reason }
            ])
            .setTimestamp();

        // Envoi du message de confirmation
        const confirmMsg = await message.reply({ 
            embeds: [confirmEmbed],
            components: [{
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 3,
                        label: 'Confirmer',
                        custom_id: 'confirm_kick',
                        emoji: '👢'
                    },
                    {
                        type: 2,
                        style: 4,
                        label: 'Annuler',
                        custom_id: 'cancel_kick',
                        emoji: '❌'
                    }
                ]
            }]
        });

        try {
            const filter = i => i.user.id === message.author.id;
            const response = await confirmMsg.awaitMessageComponent({ filter, time: 30000 });

            if (response.customId === 'cancel_kick') {
                await confirmMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription('❌ Expulsion annulée.')
                    ],
                    components: []
                });
                return;
            }

            // Envoi d'un message privé à l'utilisateur avant l'expulsion
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle(`👢 Vous avez été expulsé de ${message.guild.name}`)
                    .addFields([
                        { name: 'Raison', value: reason },
                        { name: 'Modérateur', value: message.author.tag }
                    ])
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Impossible d'envoyer un message privé à ${target.user.tag}`);
            }

            // Expulsion
            await target.kick(reason);

            // Création de la sanction dans la base de données
            const sanction = await moderationManager.createSanction(
                message.guild.id,
                target.id,
                message.author.id,
                'KICK',
                reason
            );

            // Création et envoi de l'embed de confirmation
            const logEmbed = moderationManager.createModLogEmbed(sanction, target.user, message.author);
            
            // Envoi dans le salon de logs
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
                        .setDescription(`✅ ${target.user.tag} a été expulsé.\nCase ID: #${sanction.caseId}`)
                ],
                components: []
            });

        } catch (error) {
            if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                await confirmMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription('❌ Temps écoulé, expulsion annulée.')
                    ],
                    components: []
                });
            } else {
                console.error(error);
                message.reply('Une erreur est survenue lors de l\'expulsion.');
            }
        }
    }
};