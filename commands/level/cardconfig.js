const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getLevelSettings, updateLevelSettings } = require('../../utils/database/levelSettingsManager');
const { getSettings } = require('../../utils/database/guildSettingsManager');
const { checkPermission } = require('../../utils/database/permissionManager');

const defaultCardThemes = {
    default: {
        name: "Défaut",
        background: {
            startColor: '#1a1a1a',
            endColor: '#2d2d2d'
        },
        progressBar: {
            startColor: '#4f46e5',
            endColor: '#7c3aed',
            backgroundColor: '#333333'
        },
        text: {
            mainColor: '#ffffff',
            secondaryColor: '#cccccc'
        },
        layout: {
            avatar: { x: 45, y: 45 },
            username: { x: 240, y: 100 },
            level: { x: 240, y: 150 },
            progress: { x: 240, y: 220 }
        }
    },
    neon: {
        name: "Néon",
        background: {
            startColor: '#000000',
            endColor: '#1a1a1a'
        },
        progressBar: {
            startColor: '#ff00ff',
            endColor: '#00ffff',
            backgroundColor: '#333333'
        },
        text: {
            mainColor: '#ffffff',
            secondaryColor: '#00ffff'
        },
        layout: {
            avatar: { x: 45, y: 45 },
            username: { x: 240, y: 100 },
            level: { x: 240, y: 150 },
            progress: { x: 240, y: 220 }
        }
    },
    nature: {
        name: "Nature",
        background: {
            startColor: '#1b4332',
            endColor: '#2d6a4f'
        },
        progressBar: {
            startColor: '#40916c',
            endColor: '#95d5b2',
            backgroundColor: '#1b4332'
        },
        text: {
            mainColor: '#ffffff',
            secondaryColor: '#d8f3dc'
        },
        layout: {
            avatar: { x: 45, y: 45 },
            username: { x: 240, y: 100 },
            level: { x: 240, y: 150 },
            progress: { x: 240, y: 220 }
        }
    }
};

module.exports = {
    name: 'cardconfig',
    description: 'Configure l\'apparence de la carte de niveau',
    usage: 'cardconfig',
    category: 'admin',
    aliases: ['configcard', 'levelcard'],

    async execute(message, args) {
        const hasPermission = await checkPermission(message.member, 2);
        if (!hasPermission) {
            return message.reply('Vous n\'avez pas la permission d\'utiliser cette commande.');
        }

        try {
            const [guildSettings, levelSettings] = await Promise.all([
                getSettings(message.guild.id),
                getLevelSettings(message.guild.id)
            ]);

            if (!levelSettings.enabled) {
                return message.reply('❌ Le système de niveau n\'est pas activé sur ce serveur.');
            }

            const configEmbed = new EmbedBuilder()
                .setColor(guildSettings.embedColor)
                .setTitle('🎨 Configuration de la carte de niveau')
                .setDescription('Choisissez une option à configurer :')
                .addFields(
                    { name: '🎨 Thème', value: 'Choisir parmi les thèmes disponibles' },
                    { name: '🖌️ Couleurs', value: 'Modifier individuellement les couleurs' },
                    { name: '📐 Disposition', value: 'Modifier la position des éléments' },
                    { name: '👁️ Prévisualisation', value: 'Voir la carte avec les paramètres actuels' }
                );

            // Créer les lignes de boutons
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('theme')
                    .setLabel('Thème')
                    .setEmoji('🎨')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('colors')
                    .setLabel('Couleurs')
                    .setEmoji('🖌️')
                    .setStyle(ButtonStyle.Primary),
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('layout')
                    .setLabel('Disposition')
                    .setEmoji('📐')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('preview')
                    .setLabel('Prévisualisation')
                    .setEmoji('👁️')
                    .setStyle(ButtonStyle.Secondary),
            );

            const row3 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close')
                    .setLabel('Fermer')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Danger),
            );

            const configMessage = await message.reply({
                embeds: [configEmbed],
                components: [row1, row2, row3]
            });

            // Créer le collecteur de boutons
            const collector = configMessage.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async interaction => {
                switch (interaction.customId) {
                    case 'theme':
                        await showThemeSelection(interaction, levelSettings);
                        break;
                    case 'colors':
                        await showColorCustomization(interaction, levelSettings);
                        break;
                    case 'layout':
                        await showLayoutCustomization(interaction, levelSettings);
                        break;
                    case 'preview':
                        await showPreview(interaction, levelSettings);
                        break;
                    case 'close':
                        await configMessage.delete();
                        break;
                }
            });

            collector.on('end', async () => {
                if (!configMessage.deleted) {
                    await configMessage.edit({ components: [] }).catch(() => {});
                }
            });

        } catch (error) {
            console.error('Erreur lors de la configuration de la carte:', error);
            await message.reply('❌ Une erreur est survenue lors de la configuration.');
        }
    }
};

async function showThemeSelection(interaction, levelSettings) {
    const themeEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎨 Sélection du thème')
        .setDescription('Choisissez un thème pour votre carte de niveau:');

    const defaultThemeButtons = new ActionRowBuilder();
    const customThemeButtons = new ActionRowBuilder();
    
    // Ajouter les thèmes par défaut
    Object.entries(defaultCardThemes).forEach(([key, theme]) => {
        defaultThemeButtons.addComponents(
            new ButtonBuilder()
                .setCustomId(`theme_default_${key}`)
                .setLabel(theme.name)
                .setStyle(ButtonStyle.Secondary)
        );
    });

    // Ajouter les thèmes personnalisés s'ils existent
    if (levelSettings.customThemes?.length > 0) {
        levelSettings.customThemes.forEach((theme, index) => {
            customThemeButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`theme_custom_${index}`)
                    .setLabel(theme.name)
                    .setStyle(ButtonStyle.Primary)
            );
        });
    }

    // Créer le tableau des composants
    const components = [defaultThemeButtons];
    if (levelSettings.customThemes?.length > 0) {
        components.push(customThemeButtons);
    }

    // Utiliser les composants créés au lieu de themeButtons
    const msg = await interaction.reply({
        embeds: [themeEmbed],
        components: components,
        fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 30000
    });

    collector.on('collect', async i => {
        const [type, source, themeName] = i.customId.split('_');
        // Sélectionner le thème approprié
        let theme;
        if (source === 'default') {
            theme = defaultCardThemes[themeName];
        } else if (source === 'custom') {
            theme = levelSettings.customThemes[parseInt(themeName)];
        }
    
        if (!theme) {
            await i.update({
                content: '❌ Thème invalide',
                embeds: [],
                components: []
            });
            return;
        }
    
        // Mise à jour locale de levelSettings avant la sauvegarde
        levelSettings.cardTheme = {
            name: theme.name,
            background: {
                startColor: theme.background.startColor,
                endColor: theme.background.endColor
            },
            progressBar: {
                startColor: theme.progressBar.startColor,
                endColor: theme.progressBar.endColor,
                backgroundColor: theme.progressBar.backgroundColor
            },
            text: {
                mainColor: theme.text.mainColor,
                secondaryColor: theme.text.secondaryColor
            },
            layout: {
                avatar: { x: theme.layout.avatar.x, y: theme.layout.avatar.y },
                username: { x: theme.layout.username.x, y: theme.layout.username.y },
                level: { x: theme.layout.level.x, y: theme.layout.level.y },
                progress: { x: theme.layout.progress.x, y: theme.layout.progress.y }
            }
        };
    
        // Sauvegarde dans la base de données
        const updatedSettings = await updateLevelSettings(interaction.guild.id, {
            ...levelSettings,
            cardTheme: levelSettings.cardTheme
        });
    
        // Montrer une prévisualisation du thème appliqué
        const { createLevelCard } = require('../../utils/levelCard');
        const { getUserLevel } = require('../../utils/database/userLevelManager');
    
        const levelData = await getUserLevel(interaction.guild.id, interaction.user.id);
        const nextLevelXP = Math.floor(75 * Math.pow(1.4, levelData.level));
    
        const cardAttachment = await createLevelCard(interaction.member, levelData, nextLevelXP, levelSettings);
    
        await i.update({
            content: `✅ Thème "${theme.name}" appliqué !`,
            files: [cardAttachment],
            embeds: [],
            components: []
        });
    });

    collector.on('end', async (collected) => {
        if (!msg.deleted) {
            try {
                await msg.edit({ components: [] });
            } catch (error) {
                console.error('Erreur lors de la suppression des boutons:', error);
            }
        }
    });
}

async function handleThemeSelection(message, configMessage, levelSettings) {
    const themeEmbed = new EmbedBuilder()
        .setColor(message.guild.me?.displayHexColor || '#5865F2')
        .setTitle('🎨 Sélection du thème')
        .setDescription(
            Object.entries(defaultCardThemes)
                .map(([key, theme], index) => `${EMOJIS.numbers[index]} **${theme.name}**`)
                .join('\n')
        );

    const themeMessage = await message.channel.send({ embeds: [themeEmbed] });
    
    // Ajouter les réactions
    for (let i = 0; i < Object.keys(defaultCardThemes).length; i++) {
        await themeMessage.react(EMOJIS.numbers[i]);
    }

    const filter = (reaction, user) => {
        return EMOJIS.numbers.slice(0, Object.keys(defaultCardThemes).length)
            .includes(reaction.emoji.toString()) && 
            user.id === message.author.id;
    };

    const collector = themeMessage.createReactionCollector({ filter, time: 30000 });

    collector.on('collect', async (reaction, user) => {
        const themeIndex = EMOJIS.numbers.indexOf(reaction.emoji.name);
        const themeName = Object.keys(defaultCardThemes)[themeIndex];
        const selectedTheme = defaultCardThemes[themeName];

        levelSettings.cardTheme = selectedTheme;
        await updateLevelSettings(message.guild.id, { cardTheme: selectedTheme });

        await message.channel.send(`✅ Thème "${selectedTheme.name}" appliqué !`);
        await themeMessage.delete();
    });

    collector.on('end', async () => {
        try {
            if (!themeMessage.deleted) {
                await themeMessage.reactions.removeAll();
            }
        } catch (error) {
            console.error('Erreur lors de la suppression des réactions:', error);
        }
    });
}

async function showColorCustomization(interaction, levelSettings) {
    // S'assurer que le thème existe
    if (!levelSettings.cardTheme) {
        levelSettings.cardTheme = JSON.parse(JSON.stringify(defaultCardThemes.default));
    }

    // Créer les fields pour chaque couleur
    const colorFields = [
        {
            name: '🎨 Arrière-plan',
            value: `Début: \`${levelSettings.cardTheme.background.startColor}\` ⬛\nFin: \`${levelSettings.cardTheme.background.endColor}\` ⬛`,
            inline: true
        },
        {
            name: '📊 Barre de progression',
            value: `Début: \`${levelSettings.cardTheme.progressBar.startColor}\` ⬛\nFin: \`${levelSettings.cardTheme.progressBar.endColor}\` ⬛`,
            inline: true
        },
        {
            name: '✏️ Texte',
            value: `Principal: \`${levelSettings.cardTheme.text.mainColor}\` ⬛\nSecondaire: \`${levelSettings.cardTheme.text.secondaryColor}\` ⬛`,
            inline: true
        }
    ];

    const colorEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🖌️ Personnalisation des couleurs')
        .setDescription('Sélectionnez l\'élément à modifier :')
        .addFields(colorFields);

    // Créer les boutons avec les labels plus courts
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('color_background_start')
                .setLabel('Fond (Début)')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('color_background_end')
                .setLabel('Fond (Fin)')
                .setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('color_progress_start')
                .setLabel('Barre (Début)')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('color_progress_end')
                .setLabel('Barre (Fin)')
                .setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('color_text_main')
                .setLabel('Texte Principal')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('color_text_secondary')
                .setLabel('Texte Secondaire')
                .setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('save_theme')
                .setLabel('Sauvegarder comme thème')
                .setEmoji('💾')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('color_menu_back')
                .setLabel('Retour')
                .setStyle(ButtonStyle.Danger)
        )
    ];

    try {
        let messageToUse;
        
        if (interaction.message) {
            // Si c'est une interaction de bouton
            await interaction.update({
                embeds: [colorEmbed],
                components: rows
            });
            messageToUse = interaction.message;
        } else {
            // Si c'est une interaction de commande
            messageToUse = await interaction.reply({
                embeds: [colorEmbed],
                components: rows,
                fetchReply: true
            });
        }

        const collector = messageToUse.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.customId === 'color_menu_back') {
                // Créer l'embed du menu principal
                const configEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🎨 Configuration de la carte de niveau')
                    .setDescription('Choisissez une option à configurer :')
                    .addFields(
                        { name: '🎨 Thème', value: 'Choisir parmi les thèmes disponibles' },
                        { name: '🖌️ Couleurs', value: 'Modifier individuellement les couleurs' },
                        { name: '📐 Disposition', value: 'Modifier la position des éléments' },
                        { name: '👁️ Prévisualisation', value: 'Voir la carte avec les paramètres actuels' }
                    );
        
                // Créer les lignes de boutons du menu principal
                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('theme')
                        .setLabel('Thème')
                        .setEmoji('🎨')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('colors')
                        .setLabel('Couleurs')
                        .setEmoji('🖌️')
                        .setStyle(ButtonStyle.Primary),
                );
        
                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('layout')
                        .setLabel('Disposition')
                        .setEmoji('📐')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('preview')
                        .setLabel('Prévisualisation')
                        .setEmoji('👁️')
                        .setStyle(ButtonStyle.Secondary),
                );
        
                const row3 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('close')
                        .setLabel('Fermer')
                        .setEmoji('❌')
                        .setStyle(ButtonStyle.Danger),
                );
        
                // Mettre à jour le message avec le menu principal
                await i.update({
                    content: null,
                    embeds: [configEmbed],
                    components: [row1, row2, row3]
                });
                
                // Arrêter le collecteur actuel
                collector.stop();
                return;
            } else if (i.customId === 'save_theme') {
                await handleSaveTheme(i, levelSettings);
            } else {
                const [type, element, part] = i.customId.split('_');
                await handleColorSelection(i, levelSettings, element, part);
            }
        });

    } catch (error) {
        console.error('Erreur lors de l\'affichage du menu des couleurs:', error);
        const errorResponse = {
            content: '❌ Une erreur est survenue.',
            ephemeral: true
        };

        if (interaction.replied) {
            await interaction.followUp(errorResponse);
        } else if (interaction.deferred) {
            await interaction.editReply(errorResponse);
        } else {
            await interaction.reply(errorResponse);
        }
    }
}

async function handleColorSelection(interaction, levelSettings, element, part) {
    try {
        const promptEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎨 Sélection de la couleur')
            .setDescription('Envoyez le code couleur hexadécimal (ex: #FF0000 pour rouge)\nOu "cancel" pour annuler.');

        // Mise à jour du message actuel avec le prompt
        await interaction.update({
            embeds: [promptEmbed],
            components: []
        });

        const filter = m => m.author.id === interaction.user.id &&
            (m.content.toLowerCase() === 'cancel' || /^#[0-9A-Fa-f]{6}$/.test(m.content));

        const collected = await interaction.channel.awaitMessages({
            filter,
            max: 1,
            time: 30000,
            errors: ['time']
        });

        const response = collected.first();
        await response.delete().catch(() => {});

        if (response.content.toLowerCase() === 'cancel') {
            // Retour au menu des couleurs
            const colorFields = [
                {
                    name: '🎨 Arrière-plan',
                    value: `Début: \`${levelSettings.cardTheme.background.startColor}\` ⬛\nFin: \`${levelSettings.cardTheme.background.endColor}\` ⬛`,
                    inline: true
                },
                {
                    name: '📊 Barre de progression',
                    value: `Début: \`${levelSettings.cardTheme.progressBar.startColor}\` ⬛\nFin: \`${levelSettings.cardTheme.progressBar.endColor}\` ⬛`,
                    inline: true
                },
                {
                    name: '✏️ Texte',
                    value: `Principal: \`${levelSettings.cardTheme.text.mainColor}\` ⬛\nSecondaire: \`${levelSettings.cardTheme.text.secondaryColor}\` ⬛`,
                    inline: true
                }
            ];

            const colorEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🖌️ Personnalisation des couleurs')
                .setDescription('Sélectionnez l\'élément à modifier :')
                .addFields(colorFields);

            const rows = createColorButtons();

            await interaction.message.edit({
                embeds: [colorEmbed],
                components: rows
            });
            return;
        }

        const color = response.content;
        
        // Mettre à jour la couleur
        if (element === 'background') {
            levelSettings.cardTheme.background[`${part}Color`] = color;
        } else if (element === 'progress') {
            levelSettings.cardTheme.progressBar[`${part}Color`] = color;
        } else if (element === 'text') {
            levelSettings.cardTheme.text[`${part}Color`] = color;
        }

        await updateLevelSettings(interaction.guild.id, { cardTheme: levelSettings.cardTheme });

        // Retour au menu des couleurs avec les valeurs mises à jour
        const colorFields = [
            {
                name: '🎨 Arrière-plan',
                value: `Début: \`${levelSettings.cardTheme.background.startColor}\` ⬛\nFin: \`${levelSettings.cardTheme.background.endColor}\` ⬛`,
                inline: true
            },
            {
                name: '📊 Barre de progression',
                value: `Début: \`${levelSettings.cardTheme.progressBar.startColor}\` ⬛\nFin: \`${levelSettings.cardTheme.progressBar.endColor}\` ⬛`,
                inline: true
            },
            {
                name: '✏️ Texte',
                value: `Principal: \`${levelSettings.cardTheme.text.mainColor}\` ⬛\nSecondaire: \`${levelSettings.cardTheme.text.secondaryColor}\` ⬛`,
                inline: true
            }
        ];

        const colorEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🖌️ Personnalisation des couleurs')
            .setDescription('Sélectionnez l\'élément à modifier :')
            .addFields(colorFields);

        const rows = createColorButtons();

        await interaction.message.edit({
            content: `✅ Couleur mise à jour à \`${color}\``,
            embeds: [colorEmbed],
            components: rows
        });

    } catch (error) {
        console.error('Erreur lors de la sélection de la couleur:', error);
        await interaction.message.edit({
            content: '❌ Une erreur est survenue',
            embeds: [],
            components: []
        });
    }
}

function createColorButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('color_background_start')
                .setLabel('Fond (Début)')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('color_background_end')
                .setLabel('Fond (Fin)')
                .setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('color_progress_start')
                .setLabel('Barre (Début)')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('color_progress_end')
                .setLabel('Barre (Fin)')
                .setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('color_text_main')
                .setLabel('Texte Principal')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('color_text_secondary')
                .setLabel('Texte Secondaire')
                .setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('save_theme')
                .setLabel('Sauvegarder comme thème')
                .setEmoji('💾')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('color_menu_back')
                .setLabel('Retour')
                .setStyle(ButtonStyle.Danger)
        )
    ];
}

async function showLayoutCustomization(interaction, levelSettings) {
    const layoutEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📐 Personnalisation de la disposition')
        .setDescription('Choisissez l\'élément à déplacer :');

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('layout_avatar')
            .setLabel('Avatar')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('layout_username')
            .setLabel('Nom d\'utilisateur')
            .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('layout_level')
            .setLabel('Niveau')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('layout_progress')
            .setLabel('Barre de progression')
            .setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.reply({
        embeds: [layoutEmbed],
        components: [row1, row2],
        fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 60000
    });

    collector.on('collect', async i => {
        const [type, element] = i.customId.split('_');
        await handleLayoutSelection(i, levelSettings, element);
    });
}

async function handleLayoutSelection(interaction, levelSettings, element) {
    if (!levelSettings.cardTheme) {
        levelSettings.cardTheme = JSON.parse(JSON.stringify(defaultCardThemes.default));
    }

    if (!levelSettings.cardTheme.layout) {
        levelSettings.cardTheme.layout = {
            avatar: { x: 45, y: 45 },
            username: { x: 240, y: 100 },
            level: { x: 240, y: 150 },
            progress: { x: 240, y: 220 }
        };
    }

    const { createLevelCard } = require('../../utils/levelCard');
    const { getUserLevel } = require('../../utils/database/userLevelManager');

    const levelData = await getUserLevel(interaction.guild.id, interaction.user.id);
    const nextLevelXP = Math.floor(75 * Math.pow(1.4, levelData.level));

    // Créer le row avec les boutons
    const createLayoutRow = (element) => new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`move_${element}_left`)
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`move_${element}_right`)
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`move_${element}_up`)
            .setEmoji('⬆️')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`move_${element}_down`)
            .setEmoji('⬇️')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`move_${element}_save`)
            .setLabel('Sauvegarder')
            .setStyle(ButtonStyle.Success)
    );

    // Créer l'embed
    const createLayoutEmbed = (element, x, y) => new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`📏 Position de ${element}`)
        .setDescription(
            'Utilisez les boutons pour ajuster la position.\n' +
            'Les coordonnées actuelles sont :\n' +
            `X: ${x}\n` +
            `Y: ${y}`
        );

    try {
        // Premier affichage
        const row = createLayoutRow(element);
        const embed = createLayoutEmbed(
            element,
            levelSettings.cardTheme.layout[element].x,
            levelSettings.cardTheme.layout[element].y
        );

        let response;
        if (interaction.replied || interaction.deferred) {
            response = await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
        } else {
            response = await interaction.reply({
                embeds: [embed],
                components: [row],
                fetchReply: true
            });
        }

        // Générer et envoyer la prévisualisation
        const cardAttachment = await createLevelCard(interaction.member, levelData, nextLevelXP, levelSettings);
        const previewMessage = await interaction.channel.send({ 
            content: 'Prévisualisation en temps réel :',
            files: [cardAttachment] 
        });

        // Créer le collecteur sur le nouveau message
        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async i => {
            const [, , action] = i.customId.split('_');
            
            if (action === 'save') {
                try {
                    // Créer le layout mis à jour
                    const updatedLayout = {
                        ...levelSettings.cardTheme.layout,
                        [element]: { 
                            x: levelSettings.cardTheme.layout[element].x,
                            y: levelSettings.cardTheme.layout[element].y
                        }
                    };
        
                    // Sauvegarder les changements dans la base de données
                    await updateLevelSettings(interaction.guild.id, {
                        cardTheme: {
                            ...levelSettings.cardTheme,
                            layout: updatedLayout
                        }
                    });
                        
                    // Supprimer les messages
                    await response.delete().catch(() => {});
                    await previewMessage.delete().catch(() => {});
                        
                    // Envoyer confirmation temporaire
                    const confirmMsg = await interaction.channel.send('✅ Position sauvegardée !');
                    setTimeout(() => confirmMsg.delete().catch(() => {}), 2000);
                        
                    collector.stop();
                    return;
                } catch (error) {
                    console.error('Erreur lors de la sauvegarde de la disposition:', error);
                    await interaction.channel.send('❌ Erreur lors de la sauvegarde !').then(msg => {
                        setTimeout(() => msg.delete().catch(() => {}), 2000);
                    });
                }
                return;
            }
        
            const delta = 10;
            switch (action) {
                case 'left':
                    levelSettings.cardTheme.layout[element].x -= delta;
                    break;
                case 'right':
                    levelSettings.cardTheme.layout[element].x += delta;
                    break;
                case 'up':
                    levelSettings.cardTheme.layout[element].y -= delta;
                    break;
                case 'down':
                    levelSettings.cardTheme.layout[element].y += delta;
                    break;
            }
        
            try {
                // Mettre à jour l'embed et la prévisualisation
                const newEmbed = createLayoutEmbed(
                    element,
                    levelSettings.cardTheme.layout[element].x,
                    levelSettings.cardTheme.layout[element].y
                );
        
                // Générer la nouvelle prévisualisation
                const newCardAttachment = await createLevelCard(interaction.member, levelData, nextLevelXP, levelSettings);
        
                // Effectuer les deux mises à jour en parallèle
                await Promise.all([
                    i.update({
                        embeds: [newEmbed],
                        components: [createLayoutRow(element)]
                    }),
                    previewMessage.edit({
                        content: 'Prévisualisation en temps réel :',
                        files: [newCardAttachment]
                    })
                ]);
            } catch (error) {
                console.error('Erreur lors de la mise à jour en temps réel:', error);
                await interaction.channel.send('❌ Erreur lors de la mise à jour!').then(msg => {
                    setTimeout(() => msg.delete().catch(() => {}), 2000);
                });
            }
        });
        
        // Améliorer la gestion de fin du collector
        collector.on('end', async (collected, reason) => {
            try {
                if (reason !== 'messageDelete') {
                    // Supprimer tous les messages liés
                    await Promise.all([
                        response.delete().catch(() => {}),
                        previewMessage.delete().catch(() => {})
                    ]);
                }
            } catch (error) {
                console.error('Erreur lors du nettoyage des messages:', error);
            }
        });

    } catch (error) {
        console.error('Erreur lors de la gestion de la disposition:', error);
        if (!interaction.replied) {
            await interaction.reply({ 
                content: '❌ Une erreur est survenue lors de la modification de la disposition.',
                ephemeral: true
            });
        }
    }
}

async function handleSaveTheme(interaction, levelSettings) {
    const saveEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('💾 Sauvegarde du thème')
        .setDescription('Envoyez le nom que vous souhaitez donner à ce thème\nOu "cancel" pour annuler.');

    // Au lieu de créer une nouvelle interaction, on met à jour l'existante
    await interaction.update({
        embeds: [saveEmbed],
        components: []
    });

    const filter = m => m.author.id === interaction.user.id;
    const channel = interaction.channel;

    try {
        const collected = await channel.awaitMessages({
            filter,
            max: 1,
            time: 30000,
            errors: ['time']
        });

        const response = collected.first();
        if (response.content.toLowerCase() === 'cancel') {
            await response.delete().catch(() => {});
            // Retour au menu des couleurs
            const colorFields = [
                {
                    name: '🎨 Arrière-plan',
                    value: `Début: \`${levelSettings.cardTheme.background.startColor}\` ⬛\nFin: \`${levelSettings.cardTheme.background.endColor}\` ⬛`,
                    inline: true
                },
                {
                    name: '📊 Barre de progression',
                    value: `Début: \`${levelSettings.cardTheme.progressBar.startColor}\` ⬛\nFin: \`${levelSettings.cardTheme.progressBar.endColor}\` ⬛`,
                    inline: true
                },
                {
                    name: '✏️ Texte',
                    value: `Principal: \`${levelSettings.cardTheme.text.mainColor}\` ⬛\nSecondaire: \`${levelSettings.cardTheme.text.secondaryColor}\` ⬛`,
                    inline: true
                }
            ];

            const colorEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🖌️ Personnalisation des couleurs')
                .setDescription('Sélectionnez l\'élément à modifier :')
                .addFields(colorFields);

            const rows = createColorButtons();

            await interaction.message.edit({
                content: '❌ Sauvegarde annulée.',
                embeds: [colorEmbed],
                components: rows
            });
            return;
        }

        const themeName = response.content;
        // Utiliser directement le thème actuel
        const newTheme = {
            ...levelSettings.cardTheme,
            name: themeName,
            custom: true
        };

        // Mettre à jour les thèmes personnalisés
        const customThemes = levelSettings.customThemes || [];
        customThemes.push(newTheme);

        await updateLevelSettings(interaction.guild.id, {
            customThemes: customThemes
        });

        await response.delete().catch(() => {});
        
        // Message de confirmation et retour au menu des couleurs
        const colorFields = [
            {
                name: '🎨 Arrière-plan',
                value: `Début: \`${levelSettings.cardTheme.background.startColor}\` ⬛\nFin: \`${levelSettings.cardTheme.background.endColor}\` ⬛`,
                inline: true
            },
            {
                name: '📊 Barre de progression',
                value: `Début: \`${levelSettings.cardTheme.progressBar.startColor}\` ⬛\nFin: \`${levelSettings.cardTheme.progressBar.endColor}\` ⬛`,
                inline: true
            },
            {
                name: '✏️ Texte',
                value: `Principal: \`${levelSettings.cardTheme.text.mainColor}\` ⬛\nSecondaire: \`${levelSettings.cardTheme.text.secondaryColor}\` ⬛`,
                inline: true
            }
        ];

        const colorEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🖌️ Personnalisation des couleurs')
            .setDescription('Sélectionnez l\'élément à modifier :')
            .addFields(colorFields);

        const rows = createColorButtons();

        await interaction.message.edit({
            content: `✅ Thème "${themeName}" sauvegardé avec succès !`,
            embeds: [colorEmbed],
            components: rows
        });

    } catch (error) {
        console.error('Erreur lors de la sauvegarde du thème:', error);
        // En cas d'erreur, retour au menu des couleurs
        const colorEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🖌️ Personnalisation des couleurs')
            .setDescription('Sélectionnez l\'élément à modifier :')
            .addFields(colorFields);

        const rows = createColorButtons();

        await interaction.message.edit({
            content: '❌ Une erreur est survenue lors de la sauvegarde du thème.',
            embeds: [colorEmbed],
            components: rows
        });
    }
}

async function handlePreview(message, levelSettings) {
    const { createLevelCard } = require('../../utils/levelCard');
    const { getUserLevel } = require('../../utils/database/userLevelManager');

    const levelData = await getUserLevel(message.guild.id, message.author.id);
    const nextLevelXP = Math.floor(75 * Math.pow(1.4, levelData.level));

    const cardAttachment = await createLevelCard(message.member, levelData, nextLevelXP, levelSettings);
    await message.channel.send({ files: [cardAttachment] });
}

async function showPreview(interaction, levelSettings) {
    const { createLevelCard } = require('../../utils/levelCard');
    const { getUserLevel } = require('../../utils/database/userLevelManager');

    const levelData = await getUserLevel(interaction.guild.id, interaction.user.id);
    const nextLevelXP = Math.floor(75 * Math.pow(1.4, levelData.level));

    const cardAttachment = await createLevelCard(interaction.member, levelData, nextLevelXP, levelSettings);
    await interaction.reply({ files: [cardAttachment] });
}