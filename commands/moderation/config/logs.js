const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const LogsModel = require('../../../utils/database/schema/Logs.js');

// Définition des catégories de logs
const LOG_CATEGORIES = {
    MEMBERS: {
        name: "Membres",
        description: "Logs des actions liées aux membres",
        color: "#FF0000"
    },
    MESSAGES: {
        name: "Messages",
        description: "Logs des actions sur les messages",
        color: "#00FF00"
    },
    CHANNELS: {
        name: "Salons",
        description: "Logs des modifications de salons",
        color: "#0000FF"
    },
    ROLES: {
        name: "Rôles",
        description: "Logs des modifications de rôles",
        color: "#FFFF00"
    },
    SERVER: {
        name: "Serveur",
        description: "Logs des modifications du serveur",
        color: "#FF00FF"
    },
    COMMANDS: {
        name: "Commandes",
        description: "Logs des commandes du bot",
        color: "#00FFFF"
    }
};

module.exports = {
    name: 'logs',
    description: 'Configure les salons de logs',
    userPermissions: ['Administrator'],
    
    async execute(message, args) {
        const guild = message.guild;
        const logsData = await LogsModel.findOne({ guildId: guild.id }) || new LogsModel({ guildId: guild.id });

        // Création de l'embed
        const embed = new EmbedBuilder()
            .setTitle('Configuration des Logs')
            .setDescription('Configurez les salons de logs pour chaque catégorie')
            .setColor('#0099ff');

        // Ajout des fields pour chaque catégorie
        for (const [key, category] of Object.entries(LOG_CATEGORIES)) {
            const channelId = logsData.channels[key];
            const channel = channelId ? guild.channels.cache.get(channelId) : null;
            embed.addFields({
                name: category.name,
                value: channel ? `📝 ${channel.toString()}` : '❌ Non configuré',
                inline: true
            });
        }

        // Création des boutons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('logs_auto')
                    .setLabel('Auto')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('logs_setup')
                    .setLabel('Définir')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('logs_cancel')
                    .setLabel('Annuler')
                    .setStyle(ButtonStyle.Danger)
            );

        const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });

        // Création du collector pour les boutons
        const filter = i => i.user.id === message.author.id;
        const collector = sentMessage.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async interaction => {
            switch (interaction.customId) {
                case 'logs_auto':
                    await handleAutoSetup(interaction, guild);
                    break;
                case 'logs_setup':
                    await handleManualSetup(interaction, message);
                    break;
                case 'logs_cancel':
                    await interaction.update({ components: [] });
                    break;
            }
        });

        collector.on('end', collected => {
            if (sentMessage.editable) {
                sentMessage.edit({ components: [] });
            }
        });
    }
};

async function handleAutoSetup(interaction, guild) {
    await interaction.deferUpdate();

    try {
        // Création de la catégorie
        const category = await guild.channels.create({
            name: '📋 Logs',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                }
            ]
        });

        // Création des salons pour chaque catégorie
        const channels = {};
        const moderatorRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'moderator');
        
        const defaultPermissions = [
            {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            }
        ];

        // Ajouter les permissions du rôle modérateur seulement s'il existe
        if (moderatorRole) {
            defaultPermissions.push({
                id: moderatorRole.id,
                allow: [PermissionsBitField.Flags.ViewChannel]
            });
        }

        for (const [key, categoryData] of Object.entries(LOG_CATEGORIES)) {
            const channel = await guild.channels.create({
                name: `logs-${categoryData.name.toLowerCase()}`,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: defaultPermissions
            });
            channels[key] = channel.id;
        }

        // Mise à jour dans la base de données
        await LogsModel.findOneAndUpdate(
            { guildId: guild.id },
            { channels: channels },
            { upsert: true }
        );

        // Création du nouvel embed de confirmation
        const confirmEmbed = new EmbedBuilder()
            .setTitle('Configuration des Logs')
            .setDescription('✅ Configuration automatique terminée !')
            .setColor('#00FF00');

        for (const [key, categoryData] of Object.entries(LOG_CATEGORIES)) {
            const channel = guild.channels.cache.get(channels[key]);
            confirmEmbed.addFields({
                name: categoryData.name,
                value: channel ? `📝 ${channel.toString()}` : '❌ Erreur',
                inline: true
            });
        }

        await interaction.message.edit({ embeds: [confirmEmbed], components: [] });
    } catch (error) {
        console.error('Erreur lors de la configuration automatique:', error);
        const errorEmbed = new EmbedBuilder()
            .setTitle('Erreur')
            .setDescription('Une erreur est survenue lors de la configuration automatique des logs.')
            .setColor('#FF0000');
        
        await interaction.message.edit({ embeds: [errorEmbed], components: [] });
    }
}

async function handleManualSetup(interaction, originalMessage) {
    await interaction.deferUpdate();
    const setupMessage = await interaction.message.channel.send("🔧 Configuration manuelle des logs\n\nEntrez l'ID ou mentionnez le salon pour chaque catégorie. Tapez 'skip' pour passer une catégorie ou 'cancel' pour annuler.");
    
    const channels = {};
    for (const [key, category] of Object.entries(LOG_CATEGORIES)) {
        await setupMessage.edit(`🔧 Configuration manuelle des logs\n\nEntrez l'ID ou mentionnez le salon pour : **${category.name}**\n(skip/cancel pour passer/annuler)`);
        
        try {
            const collected = await interaction.message.channel.awaitMessages({
                filter: m => m.author.id === originalMessage.author.id,
                max: 1,
                time: 30000,
                errors: ['time']
            });

            const response = collected.first();
            await response.delete().catch(() => {});

            if (response.content.toLowerCase() === 'cancel') {
                await setupMessage.edit('❌ Configuration annulée');
                return;
            }

            if (response.content.toLowerCase() !== 'skip') {
                const channelId = response.content.match(/^<#(\d+)>$/) 
                    ? response.content.match(/^<#(\d+)>$/)[1]
                    : response.content;
                
                const channel = interaction.message.guild.channels.cache.get(channelId);
                if (channel && channel.type === ChannelType.GuildText) {
                    channels[key] = channel.id;
                }
            }
        } catch (error) {
            await setupMessage.edit('⚠️ Temps écoulé ou erreur. Configuration annulée.');
            return;
        }
    }

    // Mise à jour dans la base de données
    await LogsModel.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { channels: channels },
        { upsert: true }
    );

    // Création de l'embed de confirmation
    const confirmEmbed = new EmbedBuilder()
        .setTitle('Configuration des Logs')
        .setDescription('✅ Configuration manuelle terminée !')
        .setColor('#00FF00');

    for (const [key, categoryData] of Object.entries(LOG_CATEGORIES)) {
        const channel = interaction.guild.channels.cache.get(channels[key]);
        confirmEmbed.addFields({
            name: categoryData.name,
            value: channel ? `📝 ${channel.toString()}` : '❌ Non configuré',
            inline: true
        });
    }

    await setupMessage.delete().catch(() => {});
    await interaction.message.edit({ embeds: [confirmEmbed], components: [] });
}