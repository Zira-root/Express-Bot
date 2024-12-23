const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const moderationManager = require('../../../utils/database/moderationManager');
const { sendLog } = require('../../../utils/function/logs');

module.exports = {
    name: 'ban',
    description: 'Bannir un membre du serveur',
    usage: 'ban <@utilisateur/ID> [durée] [raison]',
    example: 'ban @User 7j Spam',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],

    async execute(message, args) {
        // Si aucun argument n'est fourni, afficher l'aide
        if (!args[0]) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#ffca00')
                .setTitle('⚠️ Informations')
                .setDescription('Voici la liste des informations que vous pouvez utiliser')
                .addFields(
                    { name: '👥 Mention', value: 'Vous pouvez mentionner un utilisateur \n- [@User]', inline: false },
                    { name: '⌛ Durée', value: 'Vous pouvez renseigner une durée de bannissement \n- (7j ou ne rien mettre pour un bannissement définitif)', inline: false },
                    { name: '✨ Raison', value: 'Vous pouvez attribuer une raison.\n - [Raison]', inline: false }
                )
                .setFooter({ text: 'Exemple : !ban @user 7j pub mp' });
            
            return message.reply({ embeds: [helpEmbed] });
        }

        // Récupération de l'utilisateur
        let targetUser;
        let targetMember;

        try {
            // Essayer de récupérer d'abord le membre mentionné
            targetMember = message.mentions.members.first();
            
            if (!targetMember) {
                // Si pas de mention, essayer de récupérer par ID
                try {
                    targetMember = await message.guild.members.fetch(args[0]);
                    targetUser = targetMember.user;
                } catch {
                    // Si l'utilisateur n'est pas dans le serveur, récupérer juste l'utilisateur
                    targetUser = await message.client.users.fetch(args[0]);
                }
            } else {
                targetUser = targetMember.user;
            }
        } catch (error) {
            const userEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('❌ | Utilisateur introuvable.')

            return message.reply({embeds: [userEmbed] });
        }

        // Vérifications de base
        if (targetUser.id === message.author.id) {
            const banYourself = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('❌ | Vous ne pouvez pas vous bannir vous-même.')

            return message.reply({embeds: [banYourself] });
        }

        // Vérification des rôles seulement si l'utilisateur est dans le serveur
        if (targetMember) {
            if (targetMember.roles.highest.position >= message.member.roles.highest.position) {
                const bigRole = new EmbedBuilder()
                    .setColor('#2b2d31')
                    .setTitle('❌ | Vous ne pouvez pas bannir cet utilisateur car son rôle est supérieur ou égal au vôtre.')

                return message.reply({embeds: [bigRole] });
            }

            if (!targetMember.bannable) {
                const noPossible = new EmbedBuilder()
                    .setColor('#2b2d31')
                    .setTitle('❌ | Je ne peux pas bannir cet utilisateur.')

                return message.reply({embeds: [noPossible] });
            }
        }

        // Parsing de la durée et de la raison
        let duration = null;
        let reason = args.slice(1).join(' ');

        if (args[1] && /^\d+[smhj]$/.test(args[1])) {
            const unit = args[1].slice(-1);
            const amount = parseInt(args[1].slice(0, -1));
            
            const multiplier = {
                's': 1000,
                'm': 60 * 1000,
                'h': 60 * 60 * 1000,
                'j': 24 * 60 * 60 * 1000
            }[unit];

            duration = amount * multiplier;
            reason = args.slice(2).join(' ');
        }

        // Création de l'embed de confirmation
        const confirmEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🔨 Bannissement')
            .setDescription(`Êtes-vous sûr de vouloir bannir ${targetUser.tag} ?`)
            .addFields([
                { name: 'Utilisateur', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Modérateur', value: `${message.author.tag}`, inline: true },
                { name: 'Raison', value: reason || 'Aucune raison spécifiée' }
            ]);

        if (duration) {
            confirmEmbed.addFields([
                { name: 'Durée', value: args[1], inline: true }
            ]);
        }

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
                        custom_id: 'confirm_ban'
                    },
                    {
                        type: 2,
                        style: 4,
                        label: 'Annuler',
                        custom_id: 'cancel_ban'
                    }
                ]
            }]
        });

        // Attente de la réponse
        try {
            const filter = i => i.user.id === message.author.id;
            const response = await confirmMsg.awaitMessageComponent({ filter, time: 30000 });

            if (response.customId === 'cancel_ban') {
                await confirmMsg.edit({
                    embeds: [new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription('❌ Bannissement annulé.')],
                    components: []
                });
                return;
            }

            // Bannissement
            await message.guild.members.ban(targetUser.id, { reason: reason || 'Aucune raison spécifiée' });

            // Création de la sanction dans la base de données
            const sanction = await moderationManager.createSanction(
                message.guild.id,
                targetUser.id,
                message.author.id,
                'BAN',
                reason,
                duration
            );

            // Création et envoi de l'embed de confirmation
            const logEmbed = moderationManager.createModLogEmbed(sanction, targetUser, message.author);
            
            // Envoi dans le salon de logs
            const logChannel = await moderationManager.getModLogChannel(message.guild.id);
            if (logChannel) {
                const channel = await message.guild.channels.fetch(logChannel);
                channel?.send({ embeds: [logEmbed] });
            }

            // Message de confirmation
            await confirmMsg.edit({
                embeds: [new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription(`✅ ${targetUser.tag} a été banni.\nCase ID: #${sanction.caseId}`)],
                components: []
            });

        } catch (error) {
            if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                await confirmMsg.edit({
                    embeds: [new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription('❌ Temps écoulé, bannissement annulé.')],
                    components: []
                });
            } else {
                console.error(error);
                message.reply('Une erreur est survenue lors du bannissement.');
            }
        }
    }
};