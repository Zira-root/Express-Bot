const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const ModerationManager = require('../../../utils/database/moderationManager');

module.exports = {
    name: 'renew',
    description: 'Recrée un salon à l\'identique',
    async execute(message, args) {
        // Vérifier les permissions
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.reply('Vous n\'avez pas la permission de gérer les salons.');
        }

        // Si pas d'arguments, afficher l'aide
        if (!args[0]) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('⚙️ Commande Renew')
                .setDescription('Recrée un salon en conservant ses permissions et sa position.')
                .addFields(
                    { 
                        name: '📝 Syntaxe', 
                        value: '```!renew [#salon]```' 
                    },
                    {
                        name: '💡 Exemples', 
                        value: '• `!renew` - Recrée le salon actuel\n• `!renew #général` - Recrée le salon #général'
                    },
                    {
                        name: '⚠️ Notes', 
                        value: '• Requiert la permission "Gérer les salons"\n• Tous les messages seront supprimés\n• Les permissions et la position seront conservées'
                    }
                )
                .setTimestamp();

            return message.channel.send({ embeds: [helpEmbed] });
        }

        // Déterminer le salon cible
        let targetChannel = message.channel;
        if (message.mentions.channels.size > 0) {
            targetChannel = message.mentions.channels.first();
        }

        try {
            // Sauvegarder les propriétés importantes du salon
            const channelData = {
                name: targetChannel.name,
                type: targetChannel.type,
                topic: targetChannel.topic,
                nsfw: targetChannel.nsfw,
                bitrate: targetChannel.bitrate,
                userLimit: targetChannel.userLimit,
                rateLimitPerUser: targetChannel.rateLimitPerUser,
                position: targetChannel.position,
                parent: targetChannel.parent,
                permissionOverwrites: targetChannel.permissionOverwrites.cache.toJSON()
            };

            // Créer un embed d'information
            const infoEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔄 Renouvellement en cours')
                .setDescription(`Le salon ${targetChannel.name} va être recréé. Veuillez patienter...`)
                .setTimestamp();

            // Si on renouvelle le salon actuel, envoyer l'embed dans un autre salon
            let notificationChannel;
            if (targetChannel.id === message.channel.id) {
                // Trouver un autre salon texte où envoyer la notification
                notificationChannel = message.guild.channels.cache
                    .find(c => c.type === 0 && c.id !== targetChannel.id);
            } else {
                notificationChannel = message.channel;
            }

            if (notificationChannel) {
                await notificationChannel.send({ embeds: [infoEmbed] });
            }

            // Supprimer l'ancien salon
            await targetChannel.delete();

            // Créer le nouveau salon avec les mêmes propriétés
            const newChannel = await message.guild.channels.create({
                name: channelData.name,
                type: channelData.type,
                topic: channelData.topic,
                nsfw: channelData.nsfw,
                bitrate: channelData.bitrate,
                userLimit: channelData.userLimit,
                rateLimitPerUser: channelData.rateLimitPerUser,
                parent: channelData.parent,
                position: channelData.position,
                permissionOverwrites: channelData.permissionOverwrites
            });

            // Créer un embed de confirmation
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Salon renouvelé')
                .setDescription(`Le salon ${newChannel} a été recréé avec succès.`)
                .setTimestamp();

            // Envoyer la confirmation dans le nouveau salon
            await newChannel.send({ embeds: [successEmbed] });

            // Log de modération
            const sanction = await ModerationManager.createSanction(
                message.guild.id,
                message.author.id,
                message.author.id,
                'RENEW',
                `Salon ${newChannel.name} renouvelé`
            );

            const modLogChannel = await ModerationManager.getModLogChannel(message.guild.id);
            if (modLogChannel) {
                const logChannel = message.guild.channels.cache.get(modLogChannel);
                if (logChannel) {
                    const logEmbed = ModerationManager.createModLogEmbed(sanction, message.author, message.author);
                    logChannel.send({ embeds: [logEmbed] });
                }
            }
        } catch (error) {
            console.error(error);
            // Si une erreur survient, essayer d'envoyer le message dans le salon original
            const errorMessage = 'Une erreur est survenue lors du renouvellement du salon.';
            if (message.channel.id === targetChannel.id) {
                const fallbackChannel = message.guild.channels.cache
                    .find(c => c.type === 0 && c.id !== targetChannel.id);
                if (fallbackChannel) {
                    fallbackChannel.send(errorMessage);
                }
            } else {
                message.channel.send(errorMessage);
            }
        }
    }
};