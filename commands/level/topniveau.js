const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getLevelSettings } = require('../../utils/database/levelSettingsManager');
const { getAllUserLevels } = require('../../utils/database/userLevelManager');
const { getSettings } = require('../../utils/database/guildSettingsManager');

module.exports = {
    name: 'topniveau',
    description: 'Affiche le classement des membres par niveau',
    usage: 'topniveau',
    async execute(message, args) {
        try {
            const settings = await getSettings(message.guild.id);
            
            const allLevels = await getAllUserLevels(message.guild.id);
            
            if (!allLevels || allLevels.length === 0) {
                return await message.reply('Aucun utilisateur n\'a encore gagné de niveaux !');
            }

            const sortedUsers = allLevels.sort((a, b) => {
                if (b.level === a.level) {
                    return b.xp - a.xp;
                }
                return b.level - a.level;
            });

            const usersPerPage = 10;
            let currentPage = args[0] ? parseInt(args[0]) : 1;
            const maxPages = Math.ceil(sortedUsers.length / usersPerPage);
            
            if (currentPage > maxPages || currentPage < 1) {
                return message.reply(`Il n'y a que ${maxPages} pages disponibles.`);
            }

            async function generateEmbed(page) {
                const startIndex = (page - 1) * usersPerPage;
                const endIndex = Math.min(startIndex + usersPerPage, sortedUsers.length);
                
                const userList = [];
                
                const rankEmojis = {
                    1: '👑',
                    2: '🏆',
                    3: '🎖️',
                    other: '⭐'
                };

                let description = '```\n═══════ Classement Serveur ═══════\n```\n';
                
                for (let i = startIndex; i < endIndex; i++) {
                    const userData = sortedUsers[i];
                    const member = await message.guild.members.fetch(userData.userId).catch(() => null);
                    
                    // Sélection de l'emoji de rang
                    let rankEmoji = rankEmojis.other;
                    if (page === 1) {
                        if (i === 0) rankEmoji = rankEmojis[1];
                        else if (i === 1) rankEmoji = rankEmojis[2];
                        else if (i === 2) rankEmoji = rankEmojis[3];
                    }

                    const nextLevelXP = 75 + (userData.level * 30);
                    
                    userList.push(
                        `${rankEmoji} \`#${String(i + 1).padStart(2, '0')}\` <@${userData.userId}>\n` +
                        `┃ ⬆️ Niveau: \`${userData.level}\`\n` +
                        `┗ ✨ XP: \`${userData.xp}/${nextLevelXP}\`\n`
                    );
                }

                return new EmbedBuilder()
                    .setColor(settings.embedColor || '#5865F2')
                    .setAuthor({ 
                        name: '📊 Classement des niveaux', 
                        iconURL: message.guild.iconURL({ dynamic: true })
                    })
                    .setDescription(description + userList.join('\n'))
                    .setThumbnail(message.guild.iconURL({ dynamic: true }))
                    .setFooter({ 
                        text: `📄 Page ${page}/${maxPages} • 👥 Total: ${sortedUsers.length} membres`
                    })
                    .setTimestamp();
            }

            // Créer les boutons de navigation
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('first')
                        .setLabel('◀◀')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 1),
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('◀')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 1),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === maxPages),
                    new ButtonBuilder()
                        .setCustomId('last')
                        .setLabel('▶▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === maxPages)
                );

            // Envoyer le message avec les boutons
            const embedMessage = await message.reply({
                embeds: [await generateEmbed(currentPage)],
                components: [buttons]
            });

            // Créer le collecteur de boutons
            const collector = embedMessage.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 60000
            });

            collector.on('collect', async (interaction) => {
                switch (interaction.customId) {
                    case 'first':
                        currentPage = 1;
                        break;
                    case 'prev':
                        currentPage = Math.max(1, currentPage - 1);
                        break;
                    case 'next':
                        currentPage = Math.min(maxPages, currentPage + 1);
                        break;
                    case 'last':
                        currentPage = maxPages;
                        break;
                }

                // Mettre à jour les boutons
                buttons.components.forEach((button) => {
                    if (button.data.custom_id === 'first' || button.data.custom_id === 'prev') {
                        button.setDisabled(currentPage === 1);
                    } else {
                        button.setDisabled(currentPage === maxPages);
                    }
                });

                // Mettre à jour le message
                await interaction.update({
                    embeds: [await generateEmbed(currentPage)],
                    components: [buttons]
                });
            });

            // Quand le temps est écoulé, désactiver les boutons
            collector.on('end', async () => {
                buttons.components.forEach(button => button.setDisabled(true));
                await embedMessage.edit({ components: [buttons] }).catch(() => {});
            });
            
        } catch (error) {
            console.error('Erreur dans la commande topniveau:', error);
            await message.reply('Une erreur est survenue lors de la récupération du classement.');
        }
    }
};