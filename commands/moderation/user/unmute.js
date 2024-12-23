const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const moderationManager = require('../../../utils/database/moderationManager');

module.exports = {
    name: 'unmute',
    description: 'Retirer le mute d\'un membre du serveur (timeout)',
    usage: 'unmute <@utilisateur/ID> [raison]',
    example: 'unmute @User A appris sa leçon',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],

    async execute(message, args) {
        // Si aucun argument n'est fourni, afficher l'aide
        if (!args[0]) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#ffca00')
                .setTitle('⚠️ Informations de la commande unmute')
                .setDescription('Cette commande permet de retirer le mute d\'un membre du serveur.')
                .addFields(
                    { name: 'Mention', value: 'Mentionnez l\'utilisateur ou utilisez son ID', inline: false },
                    { name: 'Raison', value: 'Vous pouvez spécifier une raison (optionnel)', inline: false }
                )
                .setFooter({ text: 'Exemple : !unmute @user A appris sa leçon' });
            
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

        // Vérification si l'utilisateur est actuellement mute
        if (!target.communicationDisabledUntil) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ | Cet utilisateur n\'est pas mute.')
                ]
            });
        }

        // Vérifications de base
        if (target.roles.highest.position >= message.member.roles.highest.position) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ | Vous ne pouvez pas unmute cet utilisateur car son rôle est supérieur ou égal au vôtre.')
                ]
            });
        }

        if (!target.manageable || !target.moderatable) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ | Je ne peux pas unmute cet utilisateur.')
                ]
            });
        }

        // Récupération de la raison
        const reason = args.slice(1).join(' ') || 'Aucune raison spécifiée';

        // Création de l'embed de confirmation
        const confirmEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🔊 Unmute')
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setDescription(`Êtes-vous sûr de vouloir unmute ${target.user.tag} ?`)
            .addFields([
                { name: 'Utilisateur', value: `${target.user.tag} (${target.id})`, inline: true },
                { name: 'Modérateur', value: `${message.author.tag}`, inline: true },
                { name: 'Raison', value: reason }
            ])
            .setTimestamp();

        const confirmMsg = await message.reply({ 
            embeds: [confirmEmbed],
            components: [{
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 3,
                        label: 'Confirmer',
                        custom_id: 'confirm_unmute',
                        emoji: '🔊'
                    },
                    {
                        type: 2,
                        style: 4,
                        label: 'Annuler',
                        custom_id: 'cancel_unmute',
                        emoji: '❌'
                    }
                ]
            }]
        });

        try {
            const filter = i => i.user.id === message.author.id;
            const response = await confirmMsg.awaitMessageComponent({ filter, time: 30000 });

            if (response.customId === 'cancel_unmute') {
                await confirmMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription('❌ Unmute annulé.')
                    ],
                    components: []
                });
                return;
            }

            // Envoi d'un message privé à l'utilisateur
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle(`🔊 Vous avez été unmute sur ${message.guild.name}`)
                    .addFields([
                        { name: 'Raison', value: reason },
                        { name: 'Modérateur', value: message.author.tag }
                    ])
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Impossible d'envoyer un message privé à ${target.user.tag}`);
            }

            // Retrait du timeout
            await target.timeout(null, reason);

            // Création de la sanction dans la base de données
            const sanction = await moderationManager.createSanction(
                message.guild.id,
                target.id,
                message.author.id,
                'UNMUTE',
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
                        .setDescription(`✅ ${target.user.tag} a été unmute.\nCase ID: #${sanction.caseId}`)
                ],
                components: []
            });

        } catch (error) {
            if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                await confirmMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription('❌ Temps écoulé, unmute annulé.')
                    ],
                    components: []
                });
            } else {
                console.error(error);
                message.reply('Une erreur est survenue lors de l\'unmute.');
            }
        }
    }
};