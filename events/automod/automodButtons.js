const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder
} = require('discord.js');
const AutomodSettings = require('../../utils/database/schema/AutoModSettings');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isStringSelectMenu()) return;
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ 
                content: '❌ Vous devez être administrateur pour utiliser cette commande.', 
                ephemeral: true 
            });
        }

        const settings = await AutomodSettings.findOne({ guildId: interaction.guild.id });
        if (!settings) return;

        // Gestion du menu déroulant
        if (interaction.isStringSelectMenu() && interaction.customId === 'filter_select') {
            const selected = interaction.values[0];
            switch (selected) {
                case 'config_spam':
                    await handleSpamConfig(interaction, settings);
                    break;
                case 'config_invites':
                    await handleInvitesConfig(interaction, settings);
                    break;
                case 'config_badwords':
                    await handleBadWordsConfig(interaction, settings);
                    break;
                case 'config_caps':
                    await handleCapsConfig(interaction, settings);
                    break;
                case 'config_mentions':
                    await handleMentionsConfig(interaction, settings);
                    break;
            }
        }

        // Gestion des boutons
        if (interaction.isButton()) {

            if (interaction.isStringSelectMenu() && interaction.customId === 'logs_channel') {
                settings.logs.channelId = interaction.values[0];
                await updateConfig(interaction, settings);
                await handleLogsConfig(interaction, settings);
                return;
            }

            if (interaction.customId.startsWith('action_')) {
                await handleActionSelect(interaction, settings);
                return;
            }

            switch (interaction.customId) {
                case 'automod_toggle':
                    settings.enabled = !settings.enabled;
                    await updateConfig(interaction, settings);
                    break;
                case 'logs_toggle':
                    settings.logs.enabled = !settings.logs.enabled;
                    await updateConfig(interaction, settings);
                    await handleLogsConfig(interaction, settings);
                    break;
                case 'return_main':
                    await showMainMenu(interaction, settings);
                    break;
                // Toggles des différents modules
                case 'badwords_toggle':
                    settings.badWords.enabled = !settings.badWords.enabled;
                    await updateConfig(interaction, settings);
                    break;
                case 'spam_toggle':
                    settings.spam.enabled = !settings.spam.enabled;
                    await updateConfig(interaction, settings);
                    break;
                case 'caps_toggle':
                    settings.caps.enabled = !settings.caps.enabled;
                    await updateConfig(interaction, settings);
                    break;
                case 'invites_toggle':
                    settings.invites.enabled = !settings.invites.enabled;
                    await updateConfig(interaction, settings);
                    break;
                case 'mentions_toggle':
                    settings.mentions.enabled = !settings.mentions.enabled;
                    await updateConfig(interaction, settings);
                    break;
                // Configuration des actions
                case 'spam_action':
                    await handleActionConfig(interaction, settings, 'spam');
                    break;
                case 'badwords_action':
                    await handleActionConfig(interaction, settings, 'badwords');
                    break;
                case 'caps_action':
                    await handleActionConfig(interaction, settings, 'caps');
                    break;
                case 'invites_action':
                    await handleActionConfig(interaction, settings, 'invites');
                    break;
                case 'mentions_action':
                    await handleActionConfig(interaction, settings, 'mentions');
                    break;
                // Configuration des paramètres spécifiques
                case 'badwords_words':
                    await showBadWordsModal(interaction, settings);
                    break;
                case 'spam_params':
                    await showSpamModal(interaction, settings);
                    break;
                case 'caps_percentage':
                    await showCapsModal(interaction, settings);
                    break;
                case 'mentions_max':
                    await showMentionsModal(interaction, settings);
                    break;
            }
        }

        // Gestion des modaux
        if (interaction.isModalSubmit()) {
            switch (interaction.customId) {
                case 'modal_badwords':
                    await handleBadWordsModal(interaction, settings);
                    break;
                case 'modal_spam':
                    await handleSpamModal(interaction, settings);
                    break;
                case 'modal_caps':
                    await handleCapsModal(interaction, settings);
                    break;
                case 'modal_mentions':
                    await handleMentionsModal(interaction, settings);
                    break;
            }
        }
    }
};

// Fonctions de configuration des modules
async function handleBadWordsConfig(interaction, settings) {
    const embed = new EmbedBuilder()
        .setTitle('🤬 Configuration - Mots Interdits')
        .setColor('#2b2d31')
        .addFields(
            { name: 'État', value: settings.badWords.enabled ? '✅ Activé' : '❌ Désactivé' },
            { name: 'Action', value: settings.badWords.action },
            { name: 'Mots interdits', value: settings.badWords.words.length > 0 ? '||' + settings.badWords.words.join(', ') + '||' : 'Aucun mot configuré' }
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('badwords_toggle')
                .setLabel(settings.badWords.enabled ? 'Désactiver' : 'Activer')
                .setStyle(settings.badWords.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('badwords_words')
                .setLabel('Configurer les mots')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('badwords_action')
                .setLabel('Changer l\'action')
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('return_main')
                .setLabel('Retour au menu principal')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({ embeds: [embed], components: [row1, row2] });
}

async function handleSpamConfig(interaction, settings) {
    const embed = new EmbedBuilder()
        .setTitle('🚫 Configuration - Anti-Spam')
        .setColor('#2b2d31')
        .addFields(
            { name: 'État', value: settings.spam.enabled ? '✅ Activé' : '❌ Désactivé' },
            { name: 'Messages Maximum', value: settings.spam.maxMessages.toString() },
            { name: 'Fenêtre de temps', value: `${settings.spam.timeWindow / 1000} secondes` },
            { name: 'Action', value: settings.spam.action }
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('spam_toggle')
                .setLabel(settings.spam.enabled ? 'Désactiver' : 'Activer')
                .setStyle(settings.spam.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('spam_params')
                .setLabel('Configurer les paramètres')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('spam_action')
                .setLabel('Changer l\'action')
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('return_main')
                .setLabel('Retour au menu principal')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({ embeds: [embed], components: [row1, row2] });
}

async function handleCapsConfig(interaction, settings) {
    const embed = new EmbedBuilder()
        .setTitle('⚡ Configuration - Anti-Majuscules')
        .setColor('#2b2d31')
        .addFields(
            { name: 'État', value: settings.caps.enabled ? '✅ Activé' : '❌ Désactivé' },
            { name: 'Pourcentage Maximum', value: `${settings.caps.percentage}%` },
            { name: 'Action', value: settings.caps.action }
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('caps_toggle')
                .setLabel(settings.caps.enabled ? 'Désactiver' : 'Activer')
                .setStyle(settings.caps.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('caps_percentage')
                .setLabel('Configurer le pourcentage')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('caps_action')
                .setLabel('Changer l\'action')
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('return_main')
                .setLabel('Retour au menu principal')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({ embeds: [embed], components: [row1, row2] });
}

async function handleInvitesConfig(interaction, settings) {
    const embed = new EmbedBuilder()
        .setTitle('🔗 Configuration - Anti-Invitations')
        .setColor('#2b2d31')
        .addFields(
            { name: 'État', value: settings.invites.enabled ? '✅ Activé' : '❌ Désactivé' },
            { name: 'Action', value: settings.invites.action }
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('invites_toggle')
                .setLabel(settings.invites.enabled ? 'Désactiver' : 'Activer')
                .setStyle(settings.invites.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('invites_action')
                .setLabel('Changer l\'action')
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('return_main')
                .setLabel('Retour au menu principal')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({ embeds: [embed], components: [row1, row2] });
}

async function handleMentionsConfig(interaction, settings) {
    const embed = new EmbedBuilder()
        .setTitle('📢 Configuration - Mentions')
        .setColor('#2b2d31')
        .addFields(
            { name: 'État', value: settings.mentions.enabled ? '✅ Activé' : '❌ Désactivé' },
            { name: 'Mentions Maximum', value: settings.mentions.maxMentions.toString() },
            { name: 'Action', value: settings.mentions.action }
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('mentions_toggle')
                .setLabel(settings.mentions.enabled ? 'Désactiver' : 'Activer')
                .setStyle(settings.mentions.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('mentions_max')
                .setLabel('Configurer le maximum')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('mentions_action')
                .setLabel('Changer l\'action')
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('return_main')
                .setLabel('Retour au menu principal')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// Fonctions des modaux
async function showBadWordsModal(interaction, settings) {
    const modal = new ModalBuilder()
        .setCustomId('modal_badwords')
        .setTitle('Configuration des mots interdits');

    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('words')
                .setLabel('Mots interdits (séparés par des virgules)')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(settings.badWords.words.join(', '))
                .setRequired(true)
        )
    );

    await interaction.showModal(modal);
}

async function showSpamModal(interaction, settings) {
    const modal = new ModalBuilder()
        .setCustomId('modal_spam')
        .setTitle('Configuration Anti-Spam');

    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('maxMessages')
                .setLabel('Nombre maximum de messages')
                .setStyle(TextInputStyle.Short)
                .setValue(settings.spam.maxMessages.toString())
                .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('timeWindow')
                .setLabel('Fenêtre de temps (en secondes)')
                .setStyle(TextInputStyle.Short)
                .setValue((settings.spam.timeWindow / 1000).toString())
                .setRequired(true)
        )
    );

    await interaction.showModal(modal);
}

async function showCapsModal(interaction, settings) {
    const modal = new ModalBuilder()
        .setCustomId('modal_caps')
        .setTitle('Configuration Anti-Majuscules');

    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('percentage')
                .setLabel('Pourcentage maximum de majuscules (0-100)')
                .setStyle(TextInputStyle.Short)
                .setValue(settings.caps.percentage.toString())
                .setRequired(true)
        )
    );

    await interaction.showModal(modal);
}

async function showMentionsModal(interaction, settings) {
    const modal = new ModalBuilder()
        .setCustomId('modal_mentions')
        .setTitle('Configuration des Mentions');

    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('maxMentions')
                .setLabel('Nombre maximum de mentions')
                .setStyle(TextInputStyle.Short)
                .setValue(settings.mentions.maxMentions.toString())
                .setRequired(true)
        )
    );

    await interaction.showModal(modal);
}

// Gestionnaires de modaux
async function handleBadWordsModal(interaction, settings) {
    const words = interaction.fields.getTextInputValue('words');
    settings.badWords.words = words.split(',').map(word => word.trim().toLowerCase());
    await updateConfig(interaction, settings);
    await handleBadWordsConfig(interaction, settings);
}

async function handleSpamModal(interaction, settings) {
    const maxMessages = parseInt(interaction.fields.getTextInputValue('maxMessages'));
    const timeWindow = parseInt(interaction.fields.getTextInputValue('timeWindow'));

    if (isNaN(maxMessages) || isNaN(timeWindow) || maxMessages < 1 || timeWindow < 1) {
        return interaction.reply({ 
            content: '❌ Veuillez entrer des nombres valides.', 
            ephemeral: true 
        });
    }

    settings.spam.maxMessages = maxMessages;
    settings.spam.timeWindow = timeWindow * 1000;
    await updateConfig(interaction, settings);
    await handleSpamConfig(interaction, settings);
}

async function handleCapsModal(interaction, settings) {
    const percentage = parseInt(interaction.fields.getTextInputValue('percentage'));

    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        return interaction.reply({ 
            content: '❌ Veuillez entrer un pourcentage valide (0-100).', 
            ephemeral: true 
        });
    }

    settings.caps.percentage = percentage;
    await updateConfig(interaction, settings);
    await handleCapsConfig(interaction, settings);
}

async function handleMentionsModal(interaction, settings) {
    const maxMentions = parseInt(interaction.fields.getTextInputValue('maxMentions'));

    if (isNaN(maxMentions) || maxMentions < 1) {
        return interaction.reply({ 
            content: '❌ Veuillez entrer un nombre valide.', 
            ephemeral: true 
        });
    }

    settings.mentions.maxMentions = maxMentions;
    await updateConfig(interaction, settings);
    await handleMentionsConfig(interaction, settings);
}

// Gestion des actions
async function handleActionConfig(interaction, settings, moduleType) {
    const embed = new EmbedBuilder()
        .setTitle(`Configuration de l'action - ${moduleType}`)
        .setColor('#2b2d31')
        .setDescription('Sélectionnez l\'action à effectuer lors d\'une violation.');

    // Correction du moduleType pour badWords
    const settingsKey = moduleType === 'badwords' ? 'badWords' : moduleType;
    const currentAction = settings[settingsKey].action;

    const row = new ActionRowBuilder()
        .addComponents([
            {
                customId: 'warn',
                label: 'Warn',
                active: currentAction === 'warn'
            },
            {
                customId: 'mute',
                label: 'Mute',
                active: currentAction === 'mute'
            },
            {
                customId: 'kick',
                label: 'Kick',
                active: currentAction === 'kick'
            },
            {
                customId: 'ban',
                label: 'Ban',
                active: currentAction === 'ban'
            },
            {
                customId: 'delete',
                label: 'Delete',
                active: currentAction === 'delete'
            }
        ].map(button => 
            new ButtonBuilder()
                .setCustomId(`action_${moduleType}_${button.customId}`)
                .setLabel(button.label)
                .setStyle(button.active ? ButtonStyle.Success : ButtonStyle.Secondary)
        ));

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('return_main')
                .setLabel('Retour au menu principal')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({
        embeds: [embed],
        components: [row, row2]
    });
}

async function handleActionSelect(interaction, settings) {
    const [_, moduleType, action] = interaction.customId.split('_');
    
    // Correction du moduleType pour badWords
    const settingsKey = moduleType === 'badwords' ? 'badWords' : moduleType;

    if (settings[settingsKey]) {
        settings[settingsKey].action = action;
        await settings.save();

        // Retour au menu de configuration spécifique
        const handlers = {
            spam: handleSpamConfig,
            badwords: handleBadWordsConfig,
            caps: handleCapsConfig,
            invites: handleInvitesConfig,
            mentions: handleMentionsConfig
        };

        const handler = handlers[moduleType];
        if (handler) {
            await handler(interaction, settings);
        } else {
            await showMainMenu(interaction, settings);
        }
    }
}

// Fonctions utilitaires
async function updateConfig(interaction, settings) {
    await settings.save();
    if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
            embeds: [await createMainEmbed(settings)],
            components: await createMainComponents(settings)
        });
    } else {
        await interaction.update({
            embeds: [await createMainEmbed(settings)],
            components: await createMainComponents(settings)
        });
    }
}

async function showMainMenu(interaction, settings) {
    await interaction.update({
        embeds: [await createMainEmbed(settings)],
        components: await createMainComponents(settings)
    });
}

async function createMainEmbed(settings) {
    return new EmbedBuilder()
        .setTitle('🛡️ Configuration de l\'AutoMod')
        .setColor('#2b2d31')
        .setDescription(`
**📋 Statut Global**
${settings.enabled ? '✅ Activé' : '❌ Désactivé'} | #️⃣ automod

**🚫 Anti-Spam**
${settings.spam.enabled ? '✅' : '❌'} Max ${settings.spam.maxMessages} msgs/${settings.spam.timeWindow/1000}s | Action: ${settings.spam.action}

**🔗 Liens**
${settings.invites.enabled ? '✅' : '❌'} 0 liens autorisés | Action: ${settings.invites.action}

**🤬 Mots Interdits**
${settings.badWords.enabled ? '✅' : '❌'} ${settings.badWords.words.length} mots interdits | Action: ${settings.badWords.action}

**⚡ Majuscules**
${settings.caps.enabled ? '✅' : '❌'} Max ${settings.caps.percentage}% majuscules | Action: ${settings.caps.action}

**📢 Mentions**
${settings.mentions?.enabled ? '✅' : '❌'} Max ${settings.mentions?.maxMentions || 5} mentions | Action: ${settings.mentions?.action || 'warn'}`);
}

async function createMainComponents(settings) {
    // Boutons principaux
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('automod_toggle')
                .setLabel(settings.enabled ? 'Désactiver' : 'Activer')
                .setEmoji(settings.enabled ? '🔴' : '🟢')
                .setStyle(settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('config_logs')
                .setLabel('Configurer Logs')
                .setEmoji('📋')
                .setStyle(ButtonStyle.Primary)
        );

    // Menu déroulant
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('filter_select')
        .setPlaceholder('Sélectionner un filtre à configurer')
        .addOptions([
            {
                label: 'Anti-Spam',
                description: 'Configurer les paramètres anti-spam',
                value: 'config_spam',
                emoji: '🚫'
            },
            {
                label: 'Liens',
                description: 'Configurer les paramètres des liens',
                value: 'config_invites',
                emoji: '🔗'
            },
            {
                label: 'Mots Interdits',
                description: 'Configurer la liste des mots interdits',
                value: 'config_badwords',
                emoji: '🤬'
            },
            {
                label: 'Majuscules',
                description: 'Configurer les paramètres des majuscules',
                value: 'config_caps',
                emoji: '⚡'
            },
            {
                label: 'Mentions',
                description: 'Configurer les paramètres des mentions',
                value: 'config_mentions',
                emoji: '📢'
            }
        ]);

    const row2 = new ActionRowBuilder().addComponents(selectMenu);

    return [row1, row2];
}

// Ajoutez cette fonction avec les autres fonctions de configuration

async function handleLogsConfig(interaction, settings) {
    const embed = new EmbedBuilder()
        .setTitle('📋 Configuration - Logs')
        .setColor('#2b2d31')
        .addFields(
            { name: 'État', value: settings.logs.enabled ? '✅ Activé' : '❌ Désactivé' },
            { name: 'Canal', value: settings.logs.channelId ? `<#${settings.logs.channelId}>` : 'Non configuré' }
        );

    // Créer un menu déroulant pour sélectionner le canal
    const channelSelect = new StringSelectMenuBuilder()
        .setCustomId('logs_channel')
        .setPlaceholder('Sélectionner un canal de logs')
        .addOptions(
            interaction.guild.channels.cache
                .filter(channel => channel.type === 0) // 0 = GUILD_TEXT
                .map(channel => ({
                    label: channel.name,
                    value: channel.id,
                    emoji: '📝',
                    default: channel.id === settings.logs.channelId
                }))
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('logs_toggle')
                .setLabel(settings.logs.enabled ? 'Désactiver' : 'Activer')
                .setStyle(settings.logs.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(channelSelect);

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('return_main')
                .setLabel('Retour au menu principal')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({
        embeds: [embed],
        components: [row1, row2, row3]
    });
}