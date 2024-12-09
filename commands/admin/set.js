const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getSettings, updateSettings, defaultSettings } = require('../../utils/database/guildSettingsManager');
const { checkPermission } = require('../../utils/database/permissionManager');

module.exports = {
    name: 'set',
    description: 'Configure les paramètres du bot',
    usage: '<prefix|color>',
    async execute(message, args) {
        const hasPermission = await checkPermission(message.member, 2);
        if (!hasPermission) {
            return message.reply('Vous n\'avez pas la permission d\'utiliser cette commande.');
        }

        const settings = await getSettings(message.guild.id);

        // Si aucun argument n'est fourni, afficher le menu principal
        if (!args[0]) {
            const mainEmbed = new EmbedBuilder()
                .setColor(settings.embedColor)
                .setTitle('⚙️ Configuration du Bot')
                .setDescription('Voici les paramètres que vous pouvez configurer:')
                .addFields(
                    { 
                        name: '🔧 Préfixe', 
                        value: `- \`${settings.prefix}set prefix\`\n- Modifie le préfixe des commandes du bot\n- Valeur actuelle: \`${settings.prefix}\``,
                        inline: false 
                    },
                    { 
                        name: '🎨 Couleur', 
                        value: `- \`${settings.prefix}set color\`\n- Modifie la couleur des embeds du bot\n- Valeur actuelle: \`${settings.embedColor}\``,
                        inline: false 
                    }
                )
                .setFooter({ text: `Utilisez \`${settings.prefix}set <option>\` pour configurer un paramètre.` })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('configure_prefix')
                        .setLabel('Configurer le préfixe')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔧'),
                    new ButtonBuilder()
                        .setCustomId('configure_color')
                        .setLabel('Configurer la couleur')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🎨')
                );

            const response = await message.reply({ embeds: [mainEmbed], components: [row] });

            // Collecteur pour les boutons du menu principal
            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 60000
            });

            collector.on('collect', async i => {
                if (i.customId === 'configure_prefix') {
                    await handlePrefix(message, settings);
                    await i.update({ components: [] });
                } else if (i.customId === 'configure_color') {
                    await handleColor(message, settings);
                    await i.update({ components: [] });
                }
            });

            collector.on('end', async () => {
                if (response.editable) {
                    row.components.forEach(button => button.setDisabled(true));
                    await response.edit({ components: [row] }).catch(() => {});
                }
            });

            return;
        }

        const subCommand = args[0].toLowerCase();
        switch (subCommand) {
            case 'prefix':
                await handlePrefix(message, settings);
                break;
            case 'color':
                await handleColor(message, settings);
                break;
            default:
                message.reply('> - `❌` Option invalide. Utilisez "prefix" ou "color".');
        }
    }
};

async function handlePrefix(message, settings) {
    const embed = new EmbedBuilder()
        .setColor(settings.embedColor)
        .setTitle('Configuration du préfixe')
        .addFields(
            { name: 'Préfix actuel', value: `\`${settings.prefix}\``, inline: true },
            { name: 'Préfix par défaut', value: `\`${defaultSettings.prefix}\``, inline: true }
        )
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('set_prefix')
                .setLabel('Définir un préfix')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('apply_prefix')
                .setLabel('Définir')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('reset_prefix')
                .setLabel('Réinitialiser')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('cancel_prefix')
                .setLabel('Annuler')
                .setStyle(ButtonStyle.Danger)
        );

    const response = await message.reply({ embeds: [embed], components: [row] });
    let newPrefix = null;
    let questionMessage = null;
    let answerMessage = null;

    const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 60000
    });

    collector.on('collect', async i => {
        switch (i.customId) {
            case 'set_prefix':
                questionMessage = await i.reply({ 
                    content: 'Veuillez entrer le nouveau préfixe (maximum 3 caractères):',
                    fetchReply: true
                });
                try {
                    const collected = await message.channel.awaitMessages({
                        filter: m => m.author.id === message.author.id,
                        max: 1,
                        time: 30000,
                        errors: ['time']
                    });
                    
                    answerMessage = collected.first();
                    newPrefix = answerMessage.content;

                    if (newPrefix.length > 3) {
                        await questionMessage.delete().catch(() => {});
                        await answerMessage.delete().catch(() => {});
                        await i.followUp({ 
                            content: 'Le préfixe ne peut pas dépasser 3 caractères.',
                            ephemeral: true
                        });
                        return;
                    }

                    // Mettre à jour l'embed avec le nouveau préfixe immédiatement
                    embed.setFields(
                        { name: 'Préfix actuel', value: `\`${newPrefix}\``, inline: true },
                        { name: 'Préfix par défaut', value: `\`${defaultSettings.prefix}\``, inline: true }
                    );

                    row.components[1].setDisabled(false);
                    await response.edit({ embeds: [embed], components: [row] });
                    
                    // Supprimer les messages de question et réponse
                    await questionMessage.delete().catch(() => {});
                    await answerMessage.delete().catch(() => {});
                } catch (error) {
                    if (questionMessage) await questionMessage.delete().catch(() => {});
                    await i.followUp({ 
                        content: 'Temps écoulé. Veuillez réessayer.',
                        ephemeral: true
                    });
                }
                break;

            case 'apply_prefix':
                if (newPrefix) {
                    await updateSettings(message.guild.id, { prefix: newPrefix });
                    await i.update({ embeds: [embed], components: [] });
                }
                break;

            case 'reset_prefix':
                await updateSettings(message.guild.id, { prefix: defaultSettings.prefix });
                embed.setFields(
                    { name: 'Préfix actuel', value: `\`${defaultSettings.prefix}\``, inline: true },
                    { name: 'Préfix par défaut', value: `\`${defaultSettings.prefix}\``, inline: true }
                );
                await i.update({ embeds: [embed], components: [] });
                break;

            case 'cancel_prefix':
                if (questionMessage) await questionMessage.delete().catch(() => {});
                if (answerMessage) await answerMessage.delete().catch(() => {});
                await i.update({ components: [] });
                break;
        }
    });

    collector.on('end', async () => {
        if (questionMessage) await questionMessage.delete().catch(() => {});
        if (answerMessage) await answerMessage.delete().catch(() => {});
        if (response.editable) {
            row.components.forEach(button => button.setDisabled(true));
            response.edit({ components: [row] }).catch(() => {});
        }
    });
}

async function handleColor(message, settings) {
    const embed = new EmbedBuilder()
        .setColor(settings.embedColor)
        .setTitle('Configuration de la couleur')
        .addFields(
            { name: 'Couleur actuelle', value: `\`${settings.embedColor}\``, inline: true },
            { name: 'Couleur par défaut', value: `\`${defaultSettings.embedColor}\``, inline: true }
        )
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('choose_color')
                .setLabel('Choisir la couleur')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('apply_color')
                .setLabel('Envoyer')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('reset_color')
                .setLabel('Réinitialiser')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('cancel_color')
                .setLabel('Annuler')
                .setStyle(ButtonStyle.Danger)
        );

    const response = await message.reply({ embeds: [embed], components: [row] });
    let newColor = null;
    let questionMessage = null;
    let answerMessage = null;

    const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 60000
    });

    collector.on('collect', async i => {
        switch (i.customId) {
            case 'choose_color':
                questionMessage = await i.reply({ 
                    content: 'Veuillez entrer la nouvelle couleur (format hex: #ffffff):',
                    fetchReply: true
                });
                try {
                    const collected = await message.channel.awaitMessages({
                        filter: m => m.author.id === message.author.id,
                        max: 1,
                        time: 30000,
                        errors: ['time']
                    });
                    
                    answerMessage = collected.first();
                    newColor = answerMessage.content;

                    if (!/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
                        await questionMessage.delete().catch(() => {});
                        await answerMessage.delete().catch(() => {});
                        await i.followUp({ 
                            content: 'Format de couleur invalide. Utilisez le format hex (#ffffff)',
                            ephemeral: true
                        });
                        return;
                    }

                    // Mettre à jour l'embed avec la nouvelle couleur immédiatement
                    embed.setColor(newColor)
                         .setFields(
                             { name: 'Couleur actuelle', value: `\`${newColor}\``, inline: true },
                             { name: 'Couleur par défaut', value: `\`${defaultSettings.embedColor}\``, inline: true }
                         );

                    row.components[1].setDisabled(false);
                    await response.edit({ embeds: [embed], components: [row] });
                    
                    // Supprimer les messages de question et réponse
                    await questionMessage.delete().catch(() => {});
                    await answerMessage.delete().catch(() => {});
                } catch (error) {
                    if (questionMessage) await questionMessage.delete().catch(() => {});
                    await i.followUp({ 
                        content: 'Temps écoulé. Veuillez réessayer.',
                        ephemeral: true
                    });
                }
                break;

            case 'apply_color':
                if (newColor) {
                    await updateSettings(message.guild.id, { embedColor: newColor });
                    embed.setFields(
                        { name: 'Couleur actuelle', value: `\`${newColor}\``, inline: true },
                        { name: 'Couleur par défaut', value: `\`${defaultSettings.embedColor}\``, inline: true }
                    );
                    await i.update({ embeds: [embed], components: [] });
                }
                break;

            case 'reset_color':
                await updateSettings(message.guild.id, { embedColor: defaultSettings.embedColor });
                embed.setColor(defaultSettings.embedColor)
                    .setFields(
                        { name: 'Couleur actuelle', value: `\`${defaultSettings.embedColor}\``, inline: true },
                        { name: 'Couleur par défaut', value: `\`${defaultSettings.embedColor}\``, inline: true }
                    );
                await i.update({ embeds: [embed], components: [] });
                break;

            case 'cancel_color':
                if (questionMessage) await questionMessage.delete().catch(() => {});
                if (answerMessage) await answerMessage.delete().catch(() => {});
                await i.update({ components: [] });
                break;
        }
    });

    collector.on('end', async () => {
        if (questionMessage) await questionMessage.delete().catch(() => {});
        if (answerMessage) await answerMessage.delete().catch(() => {});
        if (response.editable) {
            row.components.forEach(button => button.setDisabled(true));
            response.edit({ components: [row] }).catch(() => {});
        }
    });
}