const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'help',
    description: "Affiche le menu d'aide du bot",
    category: 'utils',
    usage: 'help [catégorie]',

    async execute(message, args) {
        const prefix = message.settings.prefix;

        // Fonction pour charger les commandes d'une catégorie et ses sous-dossiers
        const loadCategoryCommands = (categoryName) => {
            const commandsBySubfolder = new Map();
            commandsBySubfolder.set('main', []); // Pour les commandes à la racine

            const categoryPath = path.join(process.cwd(), 'commands', categoryName);
            
            if (fs.existsSync(categoryPath)) {
                const items = fs.readdirSync(categoryPath, { withFileTypes: true });
                
                items.forEach(item => {
                    if (item.isDirectory()) {
                        // Pour les sous-dossiers
                        commandsBySubfolder.set(item.name, []);
                        const subFiles = fs.readdirSync(path.join(categoryPath, item.name));
                        subFiles.forEach(file => {
                            if (file.endsWith('.js')) {
                                const command = require(path.join(categoryPath, item.name, file));
                                commandsBySubfolder.get(item.name).push(command);
                            }
                        });
                    } else if (item.name.endsWith('.js')) {
                        // Pour les fichiers directs dans la catégorie
                        const command = require(path.join(categoryPath, item.name));
                        commandsBySubfolder.get('main').push(command);
                    }
                });
            }
            
            return commandsBySubfolder;
        };

        const subfolderEmojis = {
            config: '⚙️',
            informations: 'ℹ️',
            message: '💬',
            user: '👤',
            utils: '🛠️',
            main: '📌'
        };

        const subfolderTitles = {
            config: 'Configuration',
            informations: 'Informations',
            message: 'Messages',
            user: 'Utilisateurs',
            utils: 'Utilitaires',
            main: 'Commandes Principales'
        };

        // Si une catégorie est spécifiée
        if (args[0]) {
            const categoryName = args[0].toLowerCase();
            const commandsBySubfolder = loadCategoryCommands(categoryName);

            if (commandsBySubfolder.size === 0) {
                return message.reply('Cette catégorie n\'existe pas.');
            }

            const categoryEmoji = {
                admin: '👑',
                utils: '🛠️',
                level: '📊',
                moderation: '👮'
            };

            const categoryTitle = {
                admin: 'Administration',
                utils: 'Utilitaires',
                level: 'Niveaux',
                moderation: 'Modération'
            };

            // Création du menu de sélection des sous-dossiers
            const subfolderSelect = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('subfolder-select')
                        .setPlaceholder('📂 Sélectionnez une section')
                        .addOptions(
                            Array.from(commandsBySubfolder.keys())
                                .filter(subfolder => commandsBySubfolder.get(subfolder).length > 0)
                                .map(subfolder => ({
                                    label: subfolderTitles[subfolder] || subfolder,
                                    description: `Commandes de ${subfolderTitles[subfolder] || subfolder}`,
                                    value: subfolder,
                                    emoji: subfolderEmojis[subfolder] || '📁'
                                }))
                        )
                );

            // Créer l'embed initial avec le premier sous-dossier
            const firstSubfolder = Array.from(commandsBySubfolder.keys())[0];
            const createSubfolderEmbed = (subfolderName) => {
                const commands = commandsBySubfolder.get(subfolderName);
                return new EmbedBuilder()
                    .setColor(message.settings.embedColor)
                    .setTitle(`${categoryEmoji[categoryName]} ${categoryTitle[categoryName]} - ${subfolderEmojis[subfolderName]} ${subfolderTitles[subfolderName] || subfolderName}`)
                    .setDescription(`Liste des commandes de la section ${subfolderTitles[subfolderName] || subfolderName}\n\n`)
                    .addFields(
                        commands.map(cmd => ({
                            name: `\`${prefix}${cmd.name}\``,
                            value: `Description : ${cmd.description}\n${cmd.usage ? `Utilisation : \`${prefix}${cmd.usage}\`\n` : ''}`,
                            inline: false
                        }))
                    )
                    .setFooter({ text: `Page: ${subfolderName} • Utilisez le menu pour naviguer` });
            };

            const helpMessage = await message.channel.send({
                embeds: [createSubfolderEmbed(firstSubfolder)],
                components: [subfolderSelect]
            });

            const collector = helpMessage.createMessageComponentCollector({
                time: 300000
            });

            collector.on('collect', async interaction => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ 
                        content: 'Vous ne pouvez pas utiliser ce menu d\'aide.', 
                        ephemeral: true 
                    });
                }

                await interaction.update({
                    embeds: [createSubfolderEmbed(interaction.values[0])],
                    components: [subfolderSelect]
                });
            });

            collector.on('end', () => {
                subfolderSelect.components[0].setDisabled(true);
                helpMessage.edit({ components: [subfolderSelect] }).catch(() => {});
            });

            return;
        }

        // Le reste du code pour le menu principal reste inchangé...
        const categories = {
            admin: {
                name: '👑 Administration',
                usage: `${prefix}help admin`,
                commands: Array.from(loadCategoryCommands('admin').values()).flat()
            },
            utils: {
                name: '🛠️ Utilitaires',
                usage: `${prefix}help utils`,
                commands: Array.from(loadCategoryCommands('utils').values()).flat()
            },
            level: {
                name: '📊 Niveaux',
                usage: `${prefix}help level`,
                commands: Array.from(loadCategoryCommands('level').values()).flat()
            },
            moderation: {
                name: '👮 Modération',
                usage: `${prefix}help moderation`,
                commands: Array.from(loadCategoryCommands('moderation').values()).flat()
            }
        };

        // Création du menu déroulant avec StringSelectMenuBuilder
        const menu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help-menu')
                    .setPlaceholder('Sélectionnez une option')
                    .addOptions([
                        {
                            label: 'Menu Principal',
                            description: 'Retourner au menu principal',
                            value: 'main',
                            emoji: '🏠'
                        },
                        {
                            label: 'Liste des Commandes',
                            description: 'Voir toutes les catégories de commandes',
                            value: 'commands',
                            emoji: '📚'
                        },
                        {
                            label: 'Changelogs',
                            description: 'Voir les dernières mises à jour',
                            value: 'changelogs',
                            emoji: '📝'
                        }
                    ])
            );

        // Création de l'embed principal
        const mainEmbed = new EmbedBuilder()
            .setColor(message.settings.embedColor)
            .setTitle("❓・Centre d'aide")
            .setDescription("Bienvenue dans le centre d'aide. Utilisez le menu déroulant pour naviguer !\n\n")
            .addFields(
                { 
                    name: '📚 Commandes', 
                    value: 'Voir toutes les catégories de commandes disponibles'
                },
                { 
                    name: '📝 Changelogs', 
                    value: 'Consulter les dernières mises à jour du bot'
                }
            )
            .setFooter({ text: "Temps d'expiration: 5 minutes" });

        const helpMessage = await message.channel.send({
            embeds: [mainEmbed],
            components: [menu]
        });

        const collector = helpMessage.createMessageComponentCollector({
            time: 300000
        });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ 
                    content: 'Vous ne pouvez pas utiliser ce menu d\'aide.', 
                    ephemeral: true 
                });
            }

            if (interaction.values[0] === 'main') {
                await interaction.update({
                    embeds: [mainEmbed],
                    components: [menu]
                });
            }
            else if (interaction.values[0] === 'commands') {
                const commandsEmbed = new EmbedBuilder()
                    .setColor(message.settings.embedColor)
                    .setTitle('📚 Liste des Catégories')
                    .setDescription('Voici toutes les catégories de commandes disponibles\n\n')
                    .addFields(
                        Object.entries(categories).map(([_, category]) => ({
                            name: category.name,
                            value: `\`${category.usage}\``,
                            inline: true
                        }))
                    )
                    .setFooter({ text: 'Utilisez le menu pour naviguer entre les différentes sections' });

                await interaction.update({
                    embeds: [commandsEmbed],
                    components: [menu]
                });
            }
            else if (interaction.values[0] === 'changelogs') {
                const changelogsEmbed = new EmbedBuilder()
                    .setColor(message.settings.embedColor)
                    .setTitle('📝 Changelogs')
                    .setDescription('Dernières mises à jour du bot :')
                    .addFields(
                        { name: 'Version 1.0.0', value: '- Système de niveau\n- Commandes d\'administration\n- Menu d\'aide' }
                    )
                    .setTimestamp();

                await interaction.update({
                    embeds: [changelogsEmbed],
                    components: [menu]
                });
            }
        });

        collector.on('end', () => {
            menu.components[0].setDisabled(true);
            helpMessage.edit({ components: [menu] }).catch(() => {});
        });
    }
};