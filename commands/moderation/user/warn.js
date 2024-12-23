const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const moderationManager = require('../../../utils/database/moderationManager');

module.exports = {
    name: 'warn',
    description: 'Donner un avertissement à un membre',
    usage: 'warn <@utilisateur/ID> <raison>',
    example: 'warn @User Non respect des règles',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],

    async execute(message, args) {
        // Si aucun argument n'est fourni, afficher l'aide
        if (!args[0]) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#ffca00')
                .setTitle('⚠️ Informations de la commande warn')
                .setDescription('Cette commande permet de donner un avertissement à un membre.')
                .addFields(
                    { name: 'Mention', value: 'Mentionnez l\'utilisateur ou utilisez son ID', inline: false },
                    { name: 'Raison', value: 'Spécifiez une raison pour l\'avertissement', inline: false },
                    { name: 'Système d\'avertissements', value: '3 avertissements = ban automatique', inline: false }
                )
                .setFooter({ text: 'Exemple : !warn @user Spam dans le chat' });
            
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
                        .setDescription('❌ | Vous ne pouvez pas vous avertir vous-même.')
                ]
            });
        }

        if (target.roles.highest.position >= message.member.roles.highest.position) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ | Vous ne pouvez pas avertir cet utilisateur car son rôle est supérieur ou égal au vôtre.')
                ]
            });
        }

        // Vérification de la raison
        const reason = args.slice(1).join(' ');
        if (!reason) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ | Vous devez spécifier une raison pour l\'avertissement.')
                ]
            });
        }

        // Récupération des avertissements précédents
        const previousWarns = await moderationManager.getUserSanctions(message.guild.id, target.id);
        const activeWarns = previousWarns.filter(s => s.type === 'WARN' && s.active).length;

        // Création de l'embed de confirmation
        const confirmEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ Avertissement')
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setDescription(`Êtes-vous sûr de vouloir avertir ${target.user.tag} ?`)
            .addFields([
                { name: 'Utilisateur', value: `${target.user.tag} (${target.id})`, inline: true },
                { name: 'Modérateur', value: `${message.author.tag}`, inline: true },
                { name: 'Avertissements actifs', value: `${activeWarns}/3`, inline: true },
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
                        custom_id: 'confirm_warn',
                        emoji: '⚠️'
                    },
                    {
                        type: 2,
                        style: 4,
                        label: 'Annuler',
                        custom_id: 'cancel_warn',
                        emoji: '❌'
                    }
                ]
            }]
        });

        try {
            const filter = i => i.user.id === message.author.id;
            const response = await confirmMsg.awaitMessageComponent({ filter, time: 30000 });

            if (response.customId === 'cancel_warn') {
                await confirmMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription('❌ Avertissement annulé.')
                    ],
                    components: []
                });
                return;
            }

            // Envoi d'un message privé à l'utilisateur
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle(`⚠️ Vous avez reçu un avertissement sur ${message.guild.name}`)
                    .addFields([
                        { name: 'Raison', value: reason },
                        { name: 'Modérateur', value: message.author.tag },
                        { name: 'Avertissements', value: `${activeWarns + 1}/3` }
                    ])
                    .setFooter({ text: 'Au bout de 3 avertissements, vous serez banni automatiquement.' })
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Impossible d'envoyer un message privé à ${target.user.tag}`);
            }

            // Création de la sanction dans la base de données
            const sanction = await moderationManager.createSanction(
                message.guild.id,
                target.id,
                message.author.id,
                'WARN',
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

            // Vérification du nombre d'avertissements pour bannissement automatique
            if (activeWarns + 1 >= 3) {
                const banReason = "Limite d'avertissements atteinte (3/3)";
                await target.ban({ reason: banReason });

                // Création de la sanction de bannissement
                const banSanction = await moderationManager.createSanction(
                    message.guild.id,
                    target.id,
                    message.author.id,
                    'BAN',
                    banReason
                );

                const banLogEmbed = moderationManager.createModLogEmbed(banSanction, target.user, message.author);
                if (logChannel) {
                    const channel = await message.guild.channels.fetch(logChannel);
                    channel?.send({ embeds: [banLogEmbed] });
                }

                await confirmMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription(`⚠️ ${target.user.tag} a reçu son 3ème avertissement et a été banni automatiquement.\nCase ID: #${sanction.caseId}`)
                    ],
                    components: []
                });
            } else {
                await confirmMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00ff00')
                            .setDescription(`✅ ${target.user.tag} a reçu un avertissement (${activeWarns + 1}/3).\nCase ID: #${sanction.caseId}`)
                    ],
                    components: []
                });
            }

        } catch (error) {
            if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                await confirmMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription('❌ Temps écoulé, avertissement annulé.')
                    ],
                    components: []
                });
            } else {
                console.error(error);
                message.reply('Une erreur est survenue lors de l\'avertissement.');
            }
        }
    }
};