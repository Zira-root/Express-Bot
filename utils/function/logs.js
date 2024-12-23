const { EmbedBuilder } = require('discord.js');
const LogsModel = require('../database/schema/Logs.js');

async function sendLog(guild, type, data) {
    const logsData = await LogsModel.findOne({ guildId: guild.id });
    if (!logsData || !logsData.channels[type]) return;

    const channel = guild.channels.cache.get(logsData.channels[type]);
    if (!channel) return;

    const logEmbed = createLogEmbed(type, data);
    if (logEmbed) {
        await channel.send({ embeds: [logEmbed] });
    }
}

function createLogEmbed(type, data) {
    const embed = new EmbedBuilder()
        .setTimestamp()
        .setFooter({ text: `ID: ${data.id || 'N/A'}` });

    switch (type) {
        // MEMBERS
        case 'MEMBERS': {
            switch (data.action) {
                case 'JOIN':
                    return embed
                        .setTitle('👋 Nouveau Membre')
                        .setDescription(`${data.user.tag} a rejoint le serveur`)
                        .setColor('#00FF00')
                        .setThumbnail(data.user.displayAvatarURL())
                        .addFields(
                            { name: 'Compte créé le', value: `<t:${Math.floor(data.user.createdAt.getTime() / 1000)}:F>` },
                            { name: 'ID du membre', value: data.user.id }
                        );

                case 'LEAVE':
                    return embed
                        .setTitle('👋 Départ d\'un Membre')
                        .setDescription(`${data.user.tag} a quitté le serveur`)
                        .setColor('#FF0000')
                        .setThumbnail(data.user.displayAvatarURL());

                case 'NICKNAME':
                    return embed
                        .setTitle('📝 Modification de Surnom')
                        .setDescription(`Le surnom de ${data.user.tag} a été modifié`)
                        .setColor('#FFA500')
                        .addFields(
                            { name: 'Ancien surnom', value: data.oldNickname || 'Aucun' },
                            { name: 'Nouveau surnom', value: data.newNickname || 'Aucun' }
                        );

                case 'ROLE_ADD':
                    return embed
                        .setTitle('📥 Attribution de Rôle')
                        .setDescription(`Un rôle a été ajouté à ${data.user.tag}`)
                        .setColor('#00FF00')
                        .addFields(
                            { name: 'Rôle ajouté', value: data.role.toString() },
                            { name: 'Par', value: data.executor.tag }
                        );

                case 'ROLE_REMOVE':
                    return embed
                        .setTitle('📤 Retrait de Rôle')
                        .setDescription(`Un rôle a été retiré à ${data.user.tag}`)
                        .setColor('#FF0000')
                        .addFields(
                            { name: 'Rôle retiré', value: data.role.toString() },
                            { name: 'Par', value: data.executor.tag }
                        );

                case 'TIMEOUT':
                    return embed
                        .setTitle('⏰ Membre mis en timeout')
                        .setColor('#FF4500')
                        .setDescription(`${data.user.tag} a été mis en timeout`)
                        .addFields(
                            { name: 'Par', value: data.executor.tag },
                            { name: 'Durée', value: data.duration },
                            { name: 'Raison', value: data.reason || 'Aucune raison fournie' }
                        );

                case 'BAN':
                    return embed
                        .setTitle('🔨 Membre Banni')
                        .setColor('#FF0000')
                        .setDescription(`${data.user.tag} a été banni`)
                        .addFields(
                            { name: 'Par', value: data.executor.tag },
                            { name: 'Raison', value: data.reason || 'Aucune raison fournie' }
                        );

                case 'UNBAN':
                    return embed
                        .setTitle('🔓 Membre Débanni')
                        .setColor('#00FF00')
                        .setDescription(`${data.user.tag} a été débanni`)
                        .addFields(
                            { name: 'Par', value: data.executor.tag }
                        );

                case 'KICK':
                    return embed
                        .setTitle('👢 Membre Expulsé')
                        .setColor('#FFA500')
                        .setDescription(`${data.user.tag} a été expulsé`)
                        .addFields(
                            { name: 'Par', value: data.executor.tag },
                            { name: 'Raison', value: data.reason || 'Aucune raison fournie' }
                        );
            }
            break;
        }

        // MESSAGES
        case 'MESSAGES': {
            switch (data.action) {
                case 'DELETE':
                    return embed
                        .setTitle('🗑️ Message Supprimé')
                        .setColor('#FF0000')
                        .setDescription(`Un message de ${data.user.tag} a été supprimé dans ${data.channel.toString()}`)
                        .addFields(
                            { name: 'Contenu', value: data.content || 'Impossible de récupérer le contenu' },
                            { name: 'Par', value: data.executor?.tag || 'Inconnu' }
                        );

                case 'EDIT':
                    return embed
                        .setTitle('✏️ Message Modifié')
                        .setColor('#FFA500')
                        .setDescription(`Un message de ${data.user.tag} a été modifié dans ${data.channel.toString()}`)
                        .addFields(
                            { name: 'Avant', value: data.oldContent || 'Impossible de récupérer le contenu' },
                            { name: 'Après', value: data.newContent }
                        );

                case 'BULK_DELETE':
                    return embed
                        .setTitle('🗑️ Messages Supprimés en Masse')
                        .setColor('#FF0000')
                        .setDescription(`${data.count} messages ont été supprimés dans ${data.channel.toString()}`)
                        .addFields(
                            { name: 'Par', value: data.executor.tag }
                        );
            }
            break;
        }

        // CHANNELS
        case 'CHANNELS': {
            switch (data.action) {
                case 'CREATE':
                    return embed
                        .setTitle('📝 Salon Créé')
                        .setColor('#00FF00')
                        .setDescription(`Le salon ${data.channel.toString()} a été créé`)
                        .addFields([
                            { name: 'Par', value: data.executor?.tag || 'Inconnu' },
                            { name: 'Type', value: data.channel.type.toString() || 'Inconnu' }
                        ]);
        
                case 'DELETE':
                    return embed
                        .setTitle('🗑️ Salon Supprimé')
                        .setColor('#FF0000')
                        .setDescription(`Le salon ${data.name || 'Inconnu'} a été supprimé`)
                        .addFields([
                            { name: 'Par', value: data.executor?.tag || 'Inconnu' }
                        ]);
        
                case 'UPDATE':
                    return embed
                        .setTitle('🔄 Salon Modifié')
                        .setColor('#FFA500')
                        .setDescription(`Le salon ${data.channel.toString()} a été modifié`)
                        .addFields([
                            { name: 'Par', value: data.executor?.tag || 'Inconnu' },
                            { name: 'Modifications', value: Array.isArray(data.changes) ? data.changes.join('\n') : 'Modifications inconnues' }
                        ]);
            }
            break;
        }

        // ROLES
        case 'ROLES': {
            switch (data.action) {
                case 'CREATE':
                    return embed
                        .setTitle('✨ Rôle Créé')
                        .setColor('#00FF00')
                        .setDescription(`Le rôle ${data.role.toString()} a été créé`)
                        .addFields(
                            { name: 'Par', value: data.executor.tag }
                        );

                case 'DELETE':
                    return embed
                        .setTitle('🗑️ Rôle Supprimé')
                        .setColor('#FF0000')
                        .setDescription(`Le rôle ${data.name} a été supprimé`)
                        .addFields(
                            { name: 'Par', value: data.executor.tag }
                        );

                case 'UPDATE':
                    return embed
                        .setTitle('🔄 Rôle Modifié')
                        .setColor('#FFA500')
                        .setDescription(`Le rôle ${data.role.toString()} a été modifié`)
                        .addFields(
                            { name: 'Par', value: data.executor.tag },
                            { name: 'Modifications', value: data.changes.join('\n') }
                        );
            }
            break;
        }

        // SERVER
        case 'SERVER': {
            switch (data.action) {
                case 'UPDATE':
                    return embed
                        .setTitle('🔄 Serveur Modifié')
                        .setColor('#FFA500')
                        .setDescription('Les paramètres du serveur ont été modifiés')
                        .addFields(
                            { name: 'Par', value: data.executor.tag },
                            { name: 'Modifications', value: data.changes.join('\n') }
                        );

                case 'INVITE_CREATE':
                    return embed
                        .setTitle('📨 Invitation Créée')
                        .setColor('#00FF00')
                        .setDescription(`Une nouvelle invitation a été créée`)
                        .addFields(
                            { name: 'Par', value: data.executor.tag },
                            { name: 'Code', value: data.code },
                            { name: 'Expire', value: data.expires || 'Jamais' },
                            { name: 'Utilisations max', value: data.maxUses.toString() }
                        );

                case 'EMOJI_CREATE':
                    return embed
                        .setTitle('😀 Emoji Ajouté')
                        .setColor('#00FF00')
                        .setDescription(`Un nouvel emoji a été ajouté`)
                        .addFields(
                            { name: 'Par', value: data.executor.tag },
                            { name: 'Nom', value: data.name }
                        );
            }
            break;
        }

        // COMMANDS
        case 'COMMANDS': {
            switch (data.action) {
                case 'USE':
                    return embed
                        .setTitle('🤖 Commande Utilisée')
                        .setColor('#0099FF')
                        .setDescription(`${data.user.tag} a utilisé une commande`)
                        .addFields(
                            { name: 'Commande', value: data.command },
                            { name: 'Salon', value: data.channel.toString() }
                        );

                case 'ERROR':
                    return embed
                        .setTitle('❌ Erreur de Commande')
                        .setColor('#FF0000')
                        .setDescription(`Une erreur est survenue lors de l'exécution d'une commande`)
                        .addFields(
                            { name: 'Utilisateur', value: data.user.tag },
                            { name: 'Commande', value: data.command },
                            { name: 'Erreur', value: `\`\`\`${data.error}\`\`\`` }
                        );
            }
            break;
        }
    }
}

module.exports = { sendLog };