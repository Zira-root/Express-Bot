const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const moderationManager = require('../../../utils/database/moderationManager');
const { sendLog } = require('../../../utils/function/logs');

module.exports = {
    name: 'mute',
    description: 'Rendre muet un membre du serveur (timeout)',
    usage: 'mute <@utilisateur/ID> <durée> [raison]',
    example: 'mute @User 1h Spam',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],

    async execute(message, args) {
        // Si aucun argument n'est fourni, afficher l'aide
        if (!args[0] || !args[1]) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#ffca00')
                .setTitle('⚠️ Informations de la commande mute')
                .setDescription('Cette commande permet de rendre muet temporairement un membre du serveur.')
                .addFields(
                    { name: 'Mention', value: 'Mentionnez l\'utilisateur ou utilisez son ID', inline: false },
                    { name: 'Durée', value: 'Spécifiez la durée (1s, 1m, 1h, 1j)\n- Maximum: 28 jours\n- Minimum: 1 seconde', inline: false },
                    { name: 'Raison', value: 'Vous pouvez spécifier une raison (optionnel)', inline: false }
                )
                .setFooter({ text: 'Exemple : !mute @user 1h Spam' });
            
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
                        .setDescription('❌ | Vous ne pouvez pas vous rendre muet vous-même.')
                ]
            });
        }

        if (target.roles.highest.position >= message.member.roles.highest.position) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ | Vous ne pouvez pas rendre muet cet utilisateur car son rôle est supérieur ou égal au vôtre.')
                ]
            });
        }

        if (!target.manageable || !target.moderatable) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ | Je ne peux pas rendre muet cet utilisateur.')
                ]
            });
        }

        // Parsing de la durée
        const durationArg = args[1].toLowerCase();
        if (!/^\d+[smhj]$/.test(durationArg)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ | Format de durée invalide. Utilisez s (secondes), m (minutes), h (heures), j (jours).\nExemple: 1h, 30m, 24h')
                ]
            });
        }

        const unit = durationArg.slice(-1);
        const amount = parseInt(durationArg.slice(0, -1));
        
        const multiplier = {
            's': 1000,
            'm': 60 * 1000,
            'h': 60 * 60 * 1000,
            'j': 24 * 60 * 60 * 1000
        }[unit];

        const duration = amount * multiplier;

        // Vérification de la durée maximale (28 jours)
        if (duration > 28 * 24 * 60 * 60 * 1000) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ | La durée maximale est de 28 jours.')
                ]
            });
        }

        // Récupération de la raison
        const reason = args.slice(2).join(' ') || 'Aucune raison spécifiée';

        // Création de l'embed de confirmation
        const confirmEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🔇 Mute (Timeout)')
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setDescription(`Êtes-vous sûr de vouloir rendre muet ${target.user.tag} ?`)
            .addFields([
                { name: 'Utilisateur', value: `${target.user.tag} (${target.id})`, inline: true },
                { name: 'Modérateur', value: `${message.author.tag}`, inline: true },
                { name: 'Durée', value: durationArg, inline: true },
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
                        custom_id: 'confirm_mute',
                        emoji: '🔇'
                    },
                    {
                        type: 2,
                        style: 4,
                        label: 'Annuler',
                        custom_id: 'cancel_mute',
                        emoji: '❌'
                    }
                ]
            }]
        });

        try {
            const filter = i => i.user.id === message.author.id;
            const response = await confirmMsg.awaitMessageComponent({ filter, time: 30000 });

            if (response.customId === 'cancel_mute') {
                await confirmMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription('❌ Mute annulé.')
                    ],
                    components: []
                });
                return;
            }

            // Envoi d'un message privé à l'utilisateur
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle(`🔇 Vous avez été rendu muet sur ${message.guild.name}`)
                    .addFields([
                        { name: 'Durée', value: durationArg },
                        { name: 'Raison', value: reason },
                        { name: 'Modérateur', value: message.author.tag }
                    ])
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Impossible d'envoyer un message privé à ${target.user.tag}`);
            }

            // Application du timeout
            await target.timeout(duration, reason);

            // Création de la sanction dans la base de données
            const sanction = await moderationManager.createSanction(
                message.guild.id,
                target.id,
                message.author.id,
                'MUTE',
                reason,
                duration
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
                        .setDescription(`✅ ${target.user.tag} a été rendu muet pour ${durationArg}.\nCase ID: #${sanction.caseId}`)
                ],
                components: []
            });

        } catch (error) {
            if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                await confirmMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription('❌ Temps écoulé, mute annulé.')
                    ],
                    components: []
                });
            } else {
                console.error(error);
                message.reply('Une erreur est survenue lors du mute.');
            }
        }

        await sendLog(message.guild, 'MEMBERS', {
            action: 'TIMEOUT',
            user: target.user,
            executor: message.author,
            duration: duration,
            reason: reason || 'Aucune raison fournie',
            id: target.id
        });
    }
};