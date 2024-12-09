const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelType
} = require('discord.js');
const { 
    getLevelSettings, 
    updateLevelSettings,
    addReward,
    updateRewardInDB,
    deleteRewardFromDB,
    defaultLevelSettings
} = require('../../utils/database/levelSettingsManager');
const { checkPermission } = require('../../utils/database/permissionManager');

module.exports = {
    name: 'levelconfig',
    description: 'Configure le système de niveaux',
    usage: 'levelconfig',
    async execute(message, args) {
        try {
            // Vérifier les permissions
            const hasPermission = await checkPermission(message.member, 2);
            if (!hasPermission) {
                return message.reply('Vous n\'avez pas la permission d\'utiliser cette commande.');
            }

            // Récupérer les paramètres existants ou créer des paramètres par défaut
            const settings = await getLevelSettings(message.guild.id) || {
                enabled: false,
                voiceEnabled: false,
                maxLevel: 0,
                color: '#5865F2', // Couleur Discord par défaut
                xpRatioMin: 15,
                xpRatioMax: 25,
                levelUpChannel: null,
                excludedRoles: [],
                excludedChannels: [],
                rewards: [],
                resetOnLeave: false,
                longMessageBonus: false,
                threadXpEnabled: false,
                boostRoles: [],
                boostChannels: []
            };

            // Afficher la configuration
            await showMainConfig(message, settings);
        } catch (error) {
            console.error('Erreur dans la commande levelconfig:', error);
            await message.reply('Une erreur est survenue lors de l\'exécution de la commande.');
        }
    }
};

async function showMainConfig(message, settings) {

    settings = {
        ...defaultLevelSettings,
        ...settings
    };

    const embed = new EmbedBuilder()
        .setColor(settings.color)
        .setTitle('⚙️ Configuration du Système de Niveaux')
        .setDescription('Configurez les différents aspects du système de niveaux')
        .addFields(
            { name: '📊 État du système', value: settings.enabled ? '✅ Activé' : '❌ Désactivé', inline: false },
            { name: '🎤 XP Vocal', value: settings.voiceEnabled ? '✅ Activé' : '❌ Désactivé', inline: false },
            { name: '🎯 Niveau Maximum', value: settings.maxLevel === 0 ? '∞ Infini' : settings.maxLevel.toString(), inline: false },
            { name: '🎨 Couleur', value: settings.color, inline: false },
            { name: '📈 Ratio XP', value: `${settings.xpRatioMin} - ${settings.xpRatioMax}`, inline: false },
            { name: '📢 Salon de niveau', value: settings.levelUpChannel ? `<#${settings.levelUpChannel}>` : 'Non configuré', inline: false },
            { name: '🚫 Exclusions', value: `${settings.excludedRoles.length} rôles, ${settings.excludedChannels.length} salons`, inline: false }
        )
        .setTimestamp();

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('toggle_levels')
                .setLabel(settings.enabled ? 'Désactiver' : 'Activer')
                .setStyle(settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
                .setEmoji('📊'),
            new ButtonBuilder()
                .setCustomId('toggle_voice')
                .setLabel(settings.voiceEnabled ? 'Désactiver XP Vocal' : 'Activer XP Vocal')
                .setStyle(settings.voiceEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
                .setEmoji('🎤')
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('set_max_level')
                .setLabel('Niveau Maximum')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎯'),
            new ButtonBuilder()
                .setCustomId('set_color')
                .setLabel('Couleur')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎨'),
            new ButtonBuilder()
                .setCustomId('set_xp_ratio')
                .setLabel('Ratio XP')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📈')
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('set_levelup_channel')
                .setLabel('Salon de niveau')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📢'),
            new ButtonBuilder()
                .setCustomId('manage_exclusions')
                .setLabel('Gérer Exclusions')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🚫'),
            new ButtonBuilder()
                .setCustomId('manage_boosters')
                .setLabel('Gérer Boosters')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⭐'),
            new ButtonBuilder()
                .setCustomId('manage_rewards')
                .setLabel('Gérer Récompenses')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎁')
        );

    const row4 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('toggle_reset')
                .setLabel('Reset au départ')
                .setStyle(settings.resetOnLeave ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('🔄'),
            new ButtonBuilder()
                .setCustomId('toggle_long_msg')
                .setLabel('Bonus longs messages')
                .setStyle(settings.longMessageBonus ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('📝'),
            new ButtonBuilder()
                .setCustomId('toggle_threads')
                .setLabel('XP dans threads')
                .setStyle(settings.threadXpEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('🧵')
        );

    const response = await message.reply({ embeds: [embed], components: [row1, row2, row3, row4] });
    const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 300000
    });

    collector.on('collect', async i => {
        let updated = false;
        
        switch (i.customId) {
            case 'toggle_levels':
                settings.enabled = !settings.enabled;
                await updateLevelSettings(message.guild.id, settings);
                updated = true;
                break;
            case 'toggle_voice':
                settings.voiceEnabled = !settings.voiceEnabled;
                await updateLevelSettings(message.guild.id, settings);
                updated = true;
                break;
            case 'set_max_level':
                await handleMaxLevel(i, settings, message);
                return;
            case 'set_color':
                await handleColor(i, settings, message);
                return;
            case 'set_xp_ratio':
                await handleXpRatio(i, settings, message);
                return;
            case 'set_levelup_channel':
                await handleLevelUpChannel(i, settings);
                break;
            case 'manage_exclusions':
                await handleExclusions(i, settings);
                break;
            case 'manage_boosters':
                await handleBoosters(i, settings);
                break;
            case 'manage_rewards':
                await handleRewards(i, settings);
                break;
            case 'toggle_reset':
                settings.resetOnLeave = !settings.resetOnLeave;
                await updateLevelSettings(message.guild.id, settings);
                updated = true;
                break;
            case 'toggle_long_msg':
                settings.longMessageBonus = !settings.longMessageBonus;
                await updateLevelSettings(message.guild.id, settings);
                updated = true;
                break;
            case 'toggle_threads':
                settings.threadXpEnabled = !settings.threadXpEnabled;
                await updateLevelSettings(message.guild.id, settings);
                updated = true;
                break;
        }
    
        if (updated) {
            // Mettre à jour l'embed principal
            const embed = new EmbedBuilder()
                .setColor(settings.color)
                .setTitle('⚙️ Configuration du Système de Niveaux')
                .setDescription('Configurez les différents aspects du système de niveaux')
                .addFields(
                    { name: '📊 État du système', value: settings.enabled ? '✅ Activé' : '❌ Désactivé', inline: false },
                    { name: '🎤 XP Vocal', value: settings.voiceEnabled ? '✅ Activé' : '❌ Désactivé', inline: false },
                    { name: '🎯 Niveau Maximum', value: settings.maxLevel === 0 ? '∞ Infini' : settings.maxLevel.toString(), inline: false },
                    { name: '🎨 Couleur', value: settings.color, inline: false },
                    { name: '📈 Ratio XP', value: `${settings.xpRatioMin} - ${settings.xpRatioMax}`, inline: false },
                    { name: '🚫 Exclusions', value: `${settings.excludedRoles.length} rôles, ${settings.excludedChannels.length} salons`, inline: false }
                )
                .setTimestamp();
    
            // Mettre à jour le style des boutons
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('toggle_levels')
                        .setLabel(settings.enabled ? 'Désactiver' : 'Activer')
                        .setStyle(settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
                        .setEmoji('📊'),
                    new ButtonBuilder()
                        .setCustomId('toggle_voice')
                        .setLabel(settings.voiceEnabled ? 'Désactiver XP Vocal' : 'Activer XP Vocal')
                        .setStyle(settings.voiceEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
                        .setEmoji('🎤')
                );

            const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_max_level')
                    .setLabel('Niveau Maximum')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎯'),
                new ButtonBuilder()
                    .setCustomId('set_color')
                    .setLabel('Couleur')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎨'),
                new ButtonBuilder()
                    .setCustomId('set_xp_ratio')
                    .setLabel('Ratio XP')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📈')
            );
    
        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_levelup_channel')
                    .setLabel('Salon de niveau')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📢'),
                new ButtonBuilder()
                    .setCustomId('manage_exclusions')
                    .setLabel('Gérer Exclusions')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🚫'),
                new ButtonBuilder()
                    .setCustomId('manage_boosters')
                    .setLabel('Gérer Boosters')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⭐'),
                new ButtonBuilder()
                    .setCustomId('manage_rewards')
                    .setLabel('Gérer Récompenses')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎁')
            );
    
        const row4 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('toggle_reset')
                    .setLabel('Reset au départ')
                    .setStyle(settings.resetOnLeave ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('toggle_long_msg')
                    .setLabel('Bonus longs messages')
                    .setStyle(settings.longMessageBonus ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('toggle_threads')
                    .setLabel('XP dans threads')
                    .setStyle(settings.threadXpEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setEmoji('🧵')
            );
    
            await i.update({ embeds: [embed], components: [row1, row2, row3, row4] });
        }
    });
}

async function updateMainEmbed(interaction, settings) {
    const embed = new EmbedBuilder()
        .setColor(settings.color)
        .setTitle('⚙️ Configuration du Système de Niveaux')
        .setDescription('Configurez les différents aspects du système de niveaux')
        .addFields(
            { name: '📊 État du système', value: settings.enabled ? '✅ Activé' : '❌ Désactivé', inline: false },
            { name: '🎤 XP Vocal', value: settings.voiceEnabled ? '✅ Activé' : '❌ Désactivé', inline: false },
            { name: '🎯 Niveau Maximum', value: settings.maxLevel === 0 ? '∞ Infini' : settings.maxLevel.toString(), inline: false },
            { name: '🎨 Couleur', value: settings.color, inline: false },
            { name: '📈 Ratio XP', value: `${settings.xpRatioMin} - ${settings.xpRatioMax}`, inline: false },
            { name: '🚫 Exclusions', value: `${settings.excludedRoles.length} rôles, ${settings.excludedChannels.length} salons`, inline: false }
        )
        .setTimestamp();

    const rows = getMainConfigRows(settings); // Extraire la création des rows dans une fonction séparée
    await interaction.message.edit({ embeds: [embed], components: rows });
}

function getMainConfigRows(settings) {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('toggle_levels')
                .setLabel(settings.enabled ? 'Désactiver' : 'Activer')
                .setStyle(settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
                .setEmoji('📊'),
            new ButtonBuilder()
                .setCustomId('toggle_voice')
                .setLabel(settings.voiceEnabled ? 'Désactiver XP Vocal' : 'Activer XP Vocal')
                .setStyle(settings.voiceEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
                .setEmoji('🎤')
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('set_max_level')
                .setLabel('Niveau Maximum')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎯'),
            new ButtonBuilder()
                .setCustomId('set_color')
                .setLabel('Couleur')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎨'),
            new ButtonBuilder()
                .setCustomId('set_xp_ratio')
                .setLabel('Ratio XP')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📈')
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('set_levelup_channel')
                .setLabel('Salon de niveau')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📢'),
            new ButtonBuilder()
                .setCustomId('manage_exclusions')
                .setLabel('Gérer Exclusions')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🚫'),
            new ButtonBuilder()
                .setCustomId('manage_boosters')
                .setLabel('Gérer Boosters')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⭐'),
            new ButtonBuilder()
                .setCustomId('manage_rewards')
                .setLabel('Gérer Récompenses')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎁')
        );

    const row4 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('toggle_reset')
                .setLabel('Reset au départ')
                .setStyle(settings.resetOnLeave ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('🔄'),
            new ButtonBuilder()
                .setCustomId('toggle_long_msg')
                .setLabel('Bonus longs messages')
                .setStyle(settings.longMessageBonus ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('📝'),
            new ButtonBuilder()
                .setCustomId('toggle_threads')
                .setLabel('XP dans threads')
                .setStyle(settings.threadXpEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('🧵')
        );

    return [row1, row2, row3, row4];
}

// Gérer la configuration du niveau maximum
async function handleMaxLevel(interaction, settings) {
    const embed = new EmbedBuilder()
        .setColor(settings.color)
        .setTitle('🎯 Configuration du Niveau Maximum')
        .setDescription('Entrez le niveau maximum (0 pour infini):')
        .setFooter({ text: 'Tapez un nombre ou "cancel" pour annuler' });

    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async message => {
        const response = message.content.toLowerCase();
        if (response === 'cancel') {
            await message.delete();
            await msg.delete();
            return;
        }

        const level = parseInt(response);
        if (isNaN(level) || level < 0) {
            await message.delete();
            await msg.delete();
            await interaction.followUp('Niveau invalide. Veuillez entrer un nombre positif.');
            return;
        }

        settings.maxLevel = level;
        await updateLevelSettings(interaction.guild.id, settings);
        await message.delete();
        await msg.delete();
        
        // Mettre à jour l'embed principal
        await updateMainEmbed(interaction, settings);
    });
}

// Gérer les récompenses
async function handleRewards(interaction, settings) {
    try {
        // S'assurer que settings.rewards existe
        if (!settings.rewards) {
            settings.rewards = [];
        }

        const embed = new EmbedBuilder()
            .setColor(settings.color)
            .setTitle('🎁 Gestion des Récompenses')
            .setDescription('Choisissez une action:')
            .addFields(
                { name: 'Récompenses actuelles', value: settings.rewards.length ? settings.rewards.map(r => 
                    `Niveau ${r.level}: <@&${r.roleId}>`).join('\n') : 'Aucune récompense' }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_reward')
                    .setLabel('Créer')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('edit_reward')
                    .setLabel('Modifier')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✏️')
                    .setDisabled(!settings.rewards.length),
                new ButtonBuilder()
                    .setCustomId('delete_reward')
                    .setLabel('Supprimer')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
                    .setDisabled(!settings.rewards.length)
            );

        // Stocker la réponse dans une variable
        const msg = await interaction.reply({ 
            embeds: [embed], 
            components: [row], 
            fetchReply: true 
        });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300000
        });

        collector.on('collect', async i => {
            try {
                switch(i.customId) {
                    case 'create_reward':
                        await createReward(i, settings);
                        break;
                    case 'edit_reward':
                        await handleRewardEdit(i, settings);
                        break;
                    case 'delete_reward':
                        await handleRewardDelete(i, settings);
                        break;
                }
            } catch (error) {
                console.error('Erreur dans handleRewards:', error);
                if (!i.replied && !i.deferred) {
                    await i.reply({ 
                        content: 'Une erreur est survenue lors du traitement de votre demande.',
                        ephemeral: true 
                    });
                } else {
                    await i.followUp({ 
                        content: 'Une erreur est survenue lors du traitement de votre demande.',
                        ephemeral: true 
                    });
                }
            }
        });
    } catch (error) {
        console.error('Erreur dans handleRewards:', error);
        await interaction.followUp('Une erreur est survenue.');
    }
}

async function returnToRewardsMenu(interaction, settings) {
    // S'assurer que settings.rewards existe
    if (!settings.rewards) {
        settings.rewards = [];
    }

    const embed = new EmbedBuilder()
        .setColor(settings.color)
        .setTitle('🎁 Gestion des Récompenses')
        .setDescription('Choisissez une action:')
        .addFields(
            { name: 'Récompenses actuelles', value: settings.rewards.length ? settings.rewards.map(r => 
                `Niveau ${r.level}: <@&${r.roleId}>`).join('\n') : 'Aucune récompense' }
        );

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_reward')
                .setLabel('Créer')
                .setStyle(ButtonStyle.Success)
                .setEmoji('➕'),
            new ButtonBuilder()
                .setCustomId('edit_reward')
                .setLabel('Modifier')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✏️')
                .setDisabled(!settings.rewards.length),
            new ButtonBuilder()
                .setCustomId('delete_reward')
                .setLabel('Supprimer')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
                .setDisabled(!settings.rewards.length)
        );

    try {
        await interaction.message.edit({
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error("Erreur lors du retour au menu des récompenses:", error);
        // Si on ne peut pas éditer le message, en créer un nouveau
        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
}

// Gestion de la couleur
async function handleColor(interaction, settings) {
    const embed = new EmbedBuilder()
        .setColor(settings.color)
        .setTitle('🎨 Configuration de la Couleur')
        .setDescription('Entrez une couleur au format hexadécimal (ex: #ffffff):')
        .setFooter({ text: 'Tapez "cancel" pour annuler' });

    await interaction.reply({ embeds: [embed] });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async message => {
        const response = message.content.toLowerCase();
        if (response === 'cancel') {
            await message.delete();
            return;
        }

        if (!/^#[0-9A-Fa-f]{6}$/.test(response)) {
            await message.reply('Format de couleur invalide. Utilisez le format hexadécimal (ex: #ffffff)');
            return;
        }

        settings.color = response;
        // Utiliser interaction.guild.id au lieu de originalMessage
        await updateLevelSettings(interaction.guild.id, settings);
        await message.delete();
        await updateMainEmbed(interaction, settings);
    });
}

// Gestion du ratio XP
async function handleXpRatio(interaction, settings) {
    const embed = new EmbedBuilder()
        .setColor(settings.color)
        .setTitle('📈 Configuration du Ratio XP')
        .setDescription('Entrez le ratio d\'XP sous la forme "min-max" ou un nombre fixe:')
        .addFields(
            { name: 'Exemples', value: '"15-25" pour un gain aléatoire entre 15 et 25 XP\n"20" pour un gain fixe de 20 XP' }
        )
        .setFooter({ text: 'Tapez "cancel" pour annuler' });

    await interaction.reply({ embeds: [embed] });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async message => {
        const response = message.content.toLowerCase();
        if (response === 'cancel') {
            await message.delete();
            return;
        }

        const parts = response.split('-');
        if (parts.length === 1) {
            const fixed = parseInt(parts[0]);
            if (isNaN(fixed) || fixed < 1) {
                await message.reply('Valeur invalide. Entrez un nombre positif.');
                return;
            }
            settings.xpRatioMin = fixed;
            settings.xpRatioMax = fixed;
        } else if (parts.length === 2) {
            const min = parseInt(parts[0]);
            const max = parseInt(parts[1]);
            if (isNaN(min) || isNaN(max) || min < 1 || max < min) {
                await message.reply('Valeurs invalides. Le minimum doit être positif et inférieur au maximum.');
                return;
            }
            settings.xpRatioMin = min;
            settings.xpRatioMax = max;
        } else {
            await message.reply('Format invalide. Utilisez "min-max" ou un nombre fixe.');
            return;
        }

        // Utiliser interaction.guild.id au lieu de originalMessage
        await updateLevelSettings(interaction.guild.id, settings);
        await message.delete();
        await updateMainEmbed(interaction, settings);
    });
}

async function handleLevelUpChannel(interaction, settings) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('select_levelup_channel')
                .setPlaceholder('Sélectionner le salon d\'annonce')
                .setChannelTypes(ChannelType.GuildText)
        );

    await interaction.update({ 
        content: 'Sélectionnez le salon où seront envoyées les annonces de passage de niveau:',
        components: [row]
    });

    const response = await interaction.message.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id,
        time: 30000
    });

    settings.levelUpChannel = response.values[0];
    await updateLevelSettings(interaction.guild.id, settings);
    await response.update({ 
        content: `✅ Le salon d'annonce a été configuré sur <#${settings.levelUpChannel}>`,
        components: []
    });

    // Mettre à jour l'affichage principal après un court délai
    setTimeout(async () => {
        await updateMainEmbed(interaction, settings);
    }, 1000);
}

async function handleLevelUp(member, newLevel, message) {
    try {
        // Récupérer les paramètres du serveur
        const settings = await getLevelSettings(message.guild.id);
        
        // Déterminer le salon où envoyer le message
        let channelToSend;
        if (settings.levelUpChannel) {
            // Si un salon est configuré, l'utiliser
            channelToSend = message.guild.channels.cache.get(settings.levelUpChannel);
        }

        // Si pas de salon configuré ou salon introuvable, utiliser le salon du message
        if (!channelToSend) {
            channelToSend = message.channel;
        }

        // Créer l'embed de passage de niveau
        const levelUpEmbed = new EmbedBuilder()
            .setColor(settings.color)
            .setAuthor({ 
                name: member.displayName, 
                iconURL: member.user.displayAvatarURL({ dynamic: true }) 
            })
            .setDescription(`🎉 Félicitations! Vous êtes passé au niveau ${newLevel}!`)
            .setTimestamp();

        // Envoyer le message
        await channelToSend.send({ 
            content: `<@${member.id}>`,  // Mentionner l'utilisateur
            embeds: [levelUpEmbed] 
        });

        // Vérifier et attribuer les récompenses si nécessaire
        await checkAndAssignRewards(member, newLevel, settings);

    } catch (error) {
        console.error('Erreur lors du passage de niveau:', error);
    }
}

async function checkAndAssignRewards(member, level, settings) {
    if (!settings.rewards || settings.rewards.length === 0) return;

    for (const reward of settings.rewards) {
        if (reward.level === level) {
            try {
                const role = member.guild.roles.cache.get(reward.roleId);
                if (role && !member.roles.cache.has(reward.roleId)) {
                    await member.roles.add(role);
                }
            } catch (error) {
                console.error(`Erreur lors de l'attribution de la récompense:`, error);
            }
        }
    }
}

// Gestion des exclusions
async function handleExclusions(interaction, settings) {
    const embed = new EmbedBuilder()
        .setColor(settings.color)
        .setTitle('🚫 Gestion des Exclusions')
        .setDescription('Configurez les rôles et salons exclus du gain d\'XP')
        .addFields(
            { name: 'Rôles exclus', value: settings.excludedRoles.length ? 
                settings.excludedRoles.map(r => `<@&${r}>`).join('\n') : 'Aucun rôle exclu', inline: true },
            { name: 'Salons exclus', value: settings.excludedChannels.length ? 
                settings.excludedChannels.map(c => `<#${c}>`).join('\n') : 'Aucun salon exclu', inline: true }
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId('select_excluded_roles')
                .setPlaceholder('Sélectionner des rôles à exclure')
                .setMinValues(0)
                .setMaxValues(25)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('select_excluded_channels')
                .setPlaceholder('Sélectionner des salons à exclure')
                .setChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
                .setMinValues(0)
                .setMaxValues(25)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('save_exclusions')
                .setLabel('Sauvegarder')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('reset_exclusions')
                .setLabel('Réinitialiser')
                .setStyle(ButtonStyle.Danger)
        );

    const msg = await interaction.reply({ 
        embeds: [embed], 
        components: [row1, row2, row3],
        fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000
    });

    let newExcludedRoles = [...settings.excludedRoles];
    let newExcludedChannels = [...settings.excludedChannels];

    collector.on('collect', async i => {
        if (i.customId === 'select_excluded_roles') {
            newExcludedRoles = i.values;
            await i.update({ content: 'Rôles mis à jour ! Cliquez sur Sauvegarder pour confirmer.' });
        }
        else if (i.customId === 'select_excluded_channels') {
            newExcludedChannels = i.values;
            await i.update({ content: 'Salons mis à jour ! Cliquez sur Sauvegarder pour confirmer.' });
        }
        else if (i.customId === 'save_exclusions') {
            settings.excludedRoles = newExcludedRoles;
            settings.excludedChannels = newExcludedChannels;
            await updateLevelSettings(interaction.guild.id, settings);
            await msg.delete();
            await updateMainEmbed(interaction, settings);
        }
        else if (i.customId === 'reset_exclusions') {
            settings.excludedRoles = [];
            settings.excludedChannels = [];
            await updateLevelSettings(interaction.guild.id, settings);
            await msg.delete();
            await updateMainEmbed(interaction, settings);
        }
    });
}

// Gestion des boosters
async function handleBoosters(interaction, settings) {
    const embed = new EmbedBuilder()
        .setColor(settings.color)
        .setTitle('⭐ Gestion des Boosters')
        .setDescription('Configurez les multiplicateurs d\'XP pour certains rôles et salons')
        .addFields(
            { name: 'Rôles boostés', value: settings.boostRoles.length ? 
                settings.boostRoles.map(r => `<@&${r.roleId}> (×${r.multiplier})`).join('\n') : 'Aucun rôle boosté', inline: true },
            { name: 'Salons boostés', value: settings.boostChannels.length ? 
                settings.boostChannels.map(c => `<#${c.channelId}> (×${c.multiplier})`).join('\n') : 'Aucun salon boosté', inline: true }
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('add_role_boost')
                .setLabel('Ajouter Rôle Boost')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👥'),
            new ButtonBuilder()
                .setCustomId('add_channel_boost')
                .setLabel('Ajouter Salon Boost')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📺')
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('remove_role_boost')
                .setLabel('Retirer Rôle Boost')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗑️'),
            new ButtonBuilder()
                .setCustomId('remove_channel_boost')
                .setLabel('Retirer Salon Boost')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗑️')
        );

    const msg = await interaction.reply({ 
        embeds: [embed], 
        components: [row1, row2],
        fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000
    });

    collector.on('collect', async i => {
        if (i.customId === 'add_role_boost') {
            await handleAddBoostRole(i, settings);
            await msg.delete();
            await updateMainEmbed(interaction, settings);
        }
        else if (i.customId === 'add_channel_boost') {
            await handleAddBoostChannel(i, settings);
            await msg.delete();
            await updateMainEmbed(interaction, settings);
        }
        else if (i.customId === 'remove_role_boost') {
            await handleRemoveBoostRole(i, settings);
            await msg.delete();
            await updateMainEmbed(interaction, settings);
        }
        else if (i.customId === 'remove_channel_boost') {
            await handleRemoveBoostChannel(i, settings);
            await msg.delete();
            await updateMainEmbed(interaction, settings);
        }
    });
}

// Sous-fonctions pour la gestion des boosters
async function handleAddBoostRole(interaction, settings) {
    const row = new ActionRowBuilder()
        .addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId('select_boost_role')
                .setPlaceholder('Sélectionner un rôle')
                .setMinValues(1)
                .setMaxValues(1)
        );

    await interaction.update({ 
        content: 'Sélectionnez un rôle à booster:', 
        components: [row] 
    });

    const response = await interaction.message.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id,
        time: 30000
    });

    const roleId = response.values[0];
    
    await response.update({ 
        content: 'Entrez le multiplicateur d\'XP pour ce rôle (ex: 1.5 pour +50%):',
        components: []
    });

    const filter = m => m.author.id === interaction.user.id;
    const collected = await interaction.channel.awaitMessages({
        filter,
        max: 1,
        time: 30000
    });

    const multiplier = parseFloat(collected.first().content);
    if (isNaN(multiplier) || multiplier < 1) {
        await interaction.followUp('Multiplicateur invalide. Doit être supérieur ou égal à 1.');
        return;
    }

    settings.boostRoles.push({ roleId, multiplier });
    await updateLevelSettings(interaction.guild.id, settings);
    await collected.first().delete();
    await updateMainEmbed(interaction, settings);
}

async function handleAddBoostChannel(interaction, settings) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('select_boost_channel')
                .setPlaceholder('Sélectionner un salon')
                .setChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
                .setMinValues(1)
                .setMaxValues(1)
        );

    await interaction.update({ 
        content: 'Sélectionnez un salon à booster:', 
        components: [row] 
    });

    const response = await interaction.message.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id,
        time: 30000
    });

    const channelId = response.values[0];
    
    await response.update({ 
        content: 'Entrez le multiplicateur d\'XP pour ce salon (ex: 1.5 pour +50%):',
        components: []
    });

    const filter = m => m.author.id === interaction.user.id;
    const collected = await interaction.channel.awaitMessages({
        filter,
        max: 1,
        time: 30000
    });

    const multiplier = parseFloat(collected.first().content);
    if (isNaN(multiplier) || multiplier < 1) {
        await interaction.followUp('Multiplicateur invalide. Doit être supérieur ou égal à 1.');
        return;
    }

    settings.boostChannels.push({ channelId, multiplier });
    await updateLevelSettings(interaction.guild.id, settings);
    await collected.first().delete();
    await updateMainEmbed(interaction, settings);
}

async function handleRemoveBoostRole(interaction, settings) {
    if (settings.boostRoles.length === 0) {
        await interaction.reply('Aucun rôle boosté à supprimer.');
        return;
    }

    const options = settings.boostRoles.map(r => ({
        label: `@${interaction.guild.roles.cache.get(r.roleId)?.name || 'Rôle inconnu'}`,
        value: r.roleId,
        description: `Multiplicateur: ×${r.multiplier}`
    }));

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_remove_role_boost')
                .setPlaceholder('Sélectionner un rôle à retirer')
                .addOptions(options)
        );

    await interaction.update({ components: [row] });

    try {
        const response = await interaction.message.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: 30000
        });

        settings.boostRoles = settings.boostRoles.filter(r => r.roleId !== response.values[0]);
        await updateLevelSettings(interaction.guild.id, settings);
        
        // Au lieu de supprimer le message, on met à jour la réponse
        await response.update({ 
            content: '✅ Rôle retiré des boosters !',
            components: [] 
        });

        // Attendre un peu avant de mettre à jour l'embed principal
        setTimeout(async () => {
            try {
                await updateMainEmbed(interaction, settings);
            } catch (error) {
                console.error('Erreur lors de la mise à jour de l\'embed principal:', error);
            }
        }, 1000);
    } catch (error) {
        console.error('Erreur dans handleRemoveBoostRole:', error);
        await interaction.followUp('Une erreur est survenue.');
    }
}

async function handleRemoveBoostChannel(interaction, settings) {
    if (settings.boostChannels.length === 0) {
        await interaction.reply('Aucun salon boosté à supprimer.');
        return;
    }

    const options = settings.boostChannels.map(c => ({
        label: `#${interaction.guild.channels.cache.get(c.channelId)?.name || 'Salon inconnu'}`,
        value: c.channelId,
        description: `Multiplicateur: ×${c.multiplier}`
    }));

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_remove_channel_boost')
                .setPlaceholder('Sélectionner un salon à retirer')
                .addOptions(options)
        );

    await interaction.update({ components: [row] });

    try {
        const response = await interaction.message.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: 30000
        });

        settings.boostChannels = settings.boostChannels.filter(c => c.channelId !== response.values[0]);
        await updateLevelSettings(interaction.guild.id, settings);
        
        await response.update({ 
            content: '✅ Salon retiré des boosters !',
            components: [] 
        });

        setTimeout(async () => {
            try {
                await updateMainEmbed(interaction, settings);
            } catch (error) {
                console.error('Erreur lors de la mise à jour de l\'embed principal:', error);
            }
        }, 1000);
    } catch (error) {
        console.error('Erreur dans handleRemoveBoostChannel:', error);
        await interaction.followUp('Une erreur est survenue.');
    }
}

async function handleRemoveBoostChannel(interaction, settings) {
    if (settings.boostChannels.length === 0) {
        await interaction.reply('Aucun salon boosté à supprimer.');
        return;
    }

    const options = settings.boostChannels.map(c => ({
        label: `#${interaction.guild.channels.cache.get(c.channelId)?.name || 'Salon inconnu'}`,
        value: c.channelId,
        description: `Multiplicateur: ×${c.multiplier}`
    }));

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_remove_channel_boost')
                .setPlaceholder('Sélectionner un salon à retirer')
                .addOptions(options)
        );

    await interaction.update({ components: [row] });

    const response = await interaction.message.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id,
        time: 30000
    });

    settings.boostChannels = settings.boostChannels.filter(c => c.channelId !== response.values[0]);
    await updateLevelSettings(interaction.guild.id, settings);
    await response.message.delete();
    await updateMainEmbed(interaction, settings);
}

function getRewardsEmbed(settings) {
    return new EmbedBuilder()
        .setColor(settings.color)
        .setTitle('🎁 Gestion des Récompenses')
        .setDescription('Choisissez une action:')
        .addFields(
            { name: 'Récompenses actuelles', value: settings.rewards.length ? 
                settings.rewards.map(r => `Niveau ${r.level}: ${r.role ? `<@&${r.role}>` : 'Pas de rôle'}`).join('\n') 
                : 'Aucune récompense' 
            }
        );
}

function getRewardsActionRow(settings) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_reward')
                .setLabel('Créer')
                .setStyle(ButtonStyle.Success)
                .setEmoji('➕'),
            new ButtonBuilder()
                .setCustomId('edit_reward')
                .setLabel('Modifier')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✏️')
                .setDisabled(!settings.rewards.length),
            new ButtonBuilder()
                .setCustomId('delete_reward')
                .setLabel('Supprimer')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
                .setDisabled(!settings.rewards.length)
        );
}

// Gestion des récompenses
async function createReward(interaction, settings) {
    if (!settings.rewards) {
        settings.rewards = [];
    }

    try {
        // Définir le temps d'attente pour les collecteurs (2 minutes)
        const COLLECTOR_TIMEOUT = 120000;

        // Étape 1: Sélection du rôle
        const roleEmbed = new EmbedBuilder()
            .setColor(settings.color)
            .setTitle('🎁 Création d\'une Récompense')
            .setDescription('Sélectionnez le rôle qui sera attribué comme récompense.')
            .setFooter({ text: 'Étape 1/3: Sélection du rôle' });

        const roleRow = new ActionRowBuilder()
            .addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId('select_reward_role')
                    .setPlaceholder('Sélectionner le rôle de récompense')
                    .setMinValues(1)
                    .setMaxValues(1)
            );

        // Message initial avec le menu de sélection de rôle
        const roleMessage = await interaction.update({
            embeds: [roleEmbed],
            components: [roleRow],
            fetchReply: true
        });

        // Attendre la sélection du rôle
        const roleInteraction = await roleMessage.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: COLLECTOR_TIMEOUT
        });

        const roleId = roleInteraction.values[0];

        // Étape 2: Niveau requis
        const levelEmbed = new EmbedBuilder()
            .setColor(settings.color)
            .setTitle('🎁 Création d\'une Récompense')
            .setDescription('Entrez le niveau requis pour obtenir cette récompense (envoyez le nombre dans le chat)')
            .addFields(
                { name: 'Rôle sélectionné', value: `<@&${roleId}>` }
            )
            .setFooter({ text: 'Étape 2/3: Niveau requis | Tapez "cancel" pour annuler' });

        await roleInteraction.update({
            embeds: [levelEmbed],
            components: [],
            fetchReply: true
        });

        // Collecteur pour le niveau
        const levelCollector = interaction.channel.createMessageCollector({
            filter: m => m.author.id === interaction.user.id,
            time: COLLECTOR_TIMEOUT,
            max: 1
        });

        const level = await new Promise((resolve, reject) => {
            levelCollector.on('collect', async (msg) => {
                const content = msg.content.toLowerCase();
                await msg.delete().catch(() => {});

                if (content === 'cancel') {
                    reject(new Error('Création annulée'));
                    return;
                }

                const parsedLevel = parseInt(content);
                if (isNaN(parsedLevel) || parsedLevel < 1) {
                    reject(new Error('Niveau invalide'));
                    return;
                }

                resolve(parsedLevel);
            });

            levelCollector.on('end', collected => {
                if (collected.size === 0) reject(new Error('Temps écoulé'));
            });
        });

        // Créer la récompense avec les données collectées
        const newReward = {
            id: Date.now().toString(),
            roleId,
            level,
            message: null,
            channelId: null
        };

        // Ajouter la récompense à la base de données
        await addReward(interaction.guild.id, newReward);

        // Embed de confirmation
        const successEmbed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('✅ Récompense créée avec succès !')
            .addFields(
                { name: 'Rôle', value: `<@&${roleId}>`, inline: true },
                { name: 'Niveau requis', value: level.toString(), inline: true }
            );

        // Retourner au menu des récompenses
        await interaction.followUp({
            embeds: [successEmbed],
            ephemeral: true
        });

        // Mettre à jour la liste des récompenses
        settings.rewards.push(newReward);
        await returnToRewardsMenu(interaction, settings);

    } catch (error) {
        console.error('Erreur dans createReward:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('Red')
            .setDescription(`❌ ${error.message || 'Une erreur est survenue lors de la création de la récompense.'}`)
            .setFooter({ text: 'Veuillez réessayer' });

        if (!interaction.replied) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}

async function handleRewardEdit(interaction, settings) {
    try {
        // S'assurer que settings.rewards existe et contient des récompenses
        if (!settings.rewards || settings.rewards.length === 0) {
            await interaction.update({
                content: 'Aucune récompense à modifier.',
                components: [],
                embeds: []
            });
            return;
        }

        // Créer les options en vérifiant que toutes les propriétés nécessaires existent
        const options = settings.rewards.map(reward => {
            const roleName = interaction.guild.roles.cache.get(reward.roleId)?.name || 'Rôle inconnu';
            return {
                label: `Niveau ${reward.level || '?'}`,
                value: reward.id || Date.now().toString(),
                description: `Rôle: ${roleName}`
            };
        }).filter(option => option.label && option.value); // Filtrer les options invalides

        const selectRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_reward_to_edit')
                    .setPlaceholder('Sélectionner une récompense à modifier')
                    .addOptions(options)
            );

        await interaction.update({ 
            content: 'Sélectionnez la récompense à modifier:',
            components: [selectRow],
            embeds: []
        });

        const response = await interaction.message.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: 30000
        });

        const rewardToEdit = settings.rewards.find(r => r.id === response.values[0]);
        if (!rewardToEdit) {
            await response.update({
                content: '❌ Récompense introuvable.',
                components: [],
                embeds: []
            });
            return;
        }

        const editRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('edit_reward_role')
                    .setLabel('Modifier le Rôle')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('edit_reward_level')
                    .setLabel('Modifier le Niveau')
                    .setStyle(ButtonStyle.Primary),
            );

        await response.update({ 
            content: `Modification de la récompense niveau ${rewardToEdit.level}`,
            components: [editRow]
        });

        const editResponse = await response.message.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: 30000
        });

        switch (editResponse.customId) {
            case 'edit_reward_role':
                await handleEditRewardRole(editResponse, settings, rewardToEdit);
                break;
            case 'edit_reward_level':
                await handleEditRewardLevel(editResponse, settings, rewardToEdit);
                break;
            case 'edit_reward_message':
                await handleEditRewardMessage(editResponse, settings, rewardToEdit);
                break;
            case 'edit_reward_channel':
                await handleEditRewardChannel(editResponse, settings, rewardToEdit);
                break;
        }

        // Retourner au menu principal après l'édition
        await returnToRewardsMenu(interaction, settings);

    } catch (error) {
        console.error('Erreur dans handleRewardEdit:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de la modification.',
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: '❌ Une erreur est survenue lors de la modification.',
                ephemeral: true
            });
        }
    }
}

async function handleEditRewardRole(interaction, settings, reward) {
    const row = new ActionRowBuilder()
        .addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId('select_new_reward_role')
                .setPlaceholder('Sélectionner le nouveau rôle')
                .setMinValues(1)
                .setMaxValues(1)
        );

    await interaction.update({ 
        content: 'Sélectionnez le nouveau rôle pour cette récompense:',
        components: [row]
    });

    const response = await interaction.message.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id,
        time: 30000
    });

    reward.roleId = response.values[0];
    await updateRewardInDB(interaction.guild.id, reward.id, reward);
    await response.update({ content: '✅ Rôle modifié avec succès !', components: [] });
}

async function handleEditRewardLevel(interaction, settings, reward) {
    try {
        await interaction.update({
            content: 'Entrez le nouveau niveau requis pour cette récompense:',
            components: []
        });

        const filter = m => m.author.id === interaction.user.id;
        const collected = await interaction.channel.awaitMessages({
            filter,
            max: 1,
            time: 60000 // Augmenté à 1 minute
        });

        const msg = collected.first();
        if (!msg) {
            throw new Error('Temps écoulé');
        }

        const level = parseInt(msg.content);
        if (isNaN(level) || level < 1) {
            await msg.delete().catch(() => {});
            await interaction.followUp('Niveau invalide. La modification a été annulée.');
            return;
        }

        // Mettre à jour la récompense localement
        reward.level = level;
        const rewardIndex = settings.rewards.findIndex(r => r.id === reward.id);
        if (rewardIndex !== -1) {
            settings.rewards[rewardIndex] = reward;
        }

        // Sauvegarder dans la base de données
        await updateRewardInDB(interaction.guild.id, reward.id, reward);
        
        await msg.delete().catch(() => {});
        await interaction.followUp({
            content: '✅ Niveau modifié avec succès !',
            ephemeral: true
        });

        // Rafraîchir le menu des récompenses
        await returnToRewardsMenu(interaction, settings);
        
    } catch (error) {
        console.error('Erreur dans handleEditRewardLevel:', error);
        await interaction.followUp({
            content: '❌ Une erreur est survenue lors de la modification du niveau.',
            ephemeral: true
        });
    }
}

async function handleRewardDelete(interaction, settings) {
    try {
        // Vérifier si des récompenses existent
        if (!settings.rewards || settings.rewards.length === 0) {
            await interaction.update({
                content: 'Aucune récompense à supprimer.',
                components: [],
                embeds: []
            });
            return;
        }

        // Créer les options en vérifiant que toutes les propriétés sont valides
        const options = settings.rewards
            .filter(reward => reward && reward.level && reward.id && reward.roleId) // Filtrer les récompenses invalides
            .map(reward => ({
                label: `Niveau ${reward.level}`,
                value: reward.id,
                description: `Rôle: ${interaction.guild.roles.cache.get(reward.roleId)?.name || 'Rôle inconnu'}`
            }));

        if (options.length === 0) {
            await interaction.update({
                content: 'Aucune récompense valide à supprimer.',
                components: [],
                embeds: []
            });
            return;
        }

        const selectRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_reward_to_delete')
                    .setPlaceholder('Sélectionner une récompense à supprimer')
                    .addOptions(options)
            );

        // Premier message pour la sélection
        await interaction.update({
            content: 'Sélectionnez la récompense à supprimer:',
            components: [selectRow],
            embeds: []
        });

        // Attendre la sélection
        const rewardResponse = await interaction.message.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: 30000
        });

        const rewardToDelete = settings.rewards.find(r => r.id === rewardResponse.values[0]);
        if (!rewardToDelete) {
            await rewardResponse.update({
                content: '❌ Récompense introuvable.',
                components: [],
                embeds: []
            });
            return;
        }

        // Message de confirmation
        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_delete_reward')
                    .setLabel('Confirmer la suppression')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚠️'),
                new ButtonBuilder()
                    .setCustomId('cancel_delete_reward')
                    .setLabel('Annuler')
                    .setStyle(ButtonStyle.Secondary)
            );

        await rewardResponse.update({
            content: `⚠️ Êtes-vous sûr de vouloir supprimer la récompense de niveau ${rewardToDelete.level} ?`,
            components: [confirmRow]
        });

        // Attendre la confirmation
        const confirmResponse = await interaction.message.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: 30000
        });

        if (confirmResponse.customId === 'confirm_delete_reward') {
            await deleteRewardFromDB(interaction.guild.id, rewardToDelete.id);
            settings.rewards = settings.rewards.filter(r => r.id !== rewardToDelete.id);
            await confirmResponse.update({
                content: '✅ Récompense supprimée avec succès !',
                components: []
            });
        } else {
            await confirmResponse.update({
                content: '❌ Suppression annulée.',
                components: []
            });
        }

        // Retourner au menu principal après un court délai
        setTimeout(async () => {
            await returnToRewardsMenu(interaction, settings);
        }, 1000);

    } catch (error) {
        console.error('Erreur dans handleRewardDelete:', error);
        try {
            const errorMessage = {
                content: '❌ Une erreur est survenue lors de la suppression.',
                ephemeral: true
            };
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(errorMessage);
            } else {
                await interaction.followUp(errorMessage);
            }
        } catch (e) {
            console.error('Erreur lors de l\'envoi du message d\'erreur:', e);
        }
    }
}