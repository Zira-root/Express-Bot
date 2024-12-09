const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'help',
    description: 'Affiche le menu d\'aide du bot',
    category: 'utils',
    usage: 'help [catégorie]',

    async execute(message, args) {
        const prefix = message.settings.prefix;

        // Fonction pour charger les commandes d'une catégorie
        const loadCategoryCommands = (categoryName) => {
            const commands = [];
            const categoryPath = path.join(process.cwd(), 'commands', categoryName);
            
            if (fs.existsSync(categoryPath)) {
                const items = fs.readdirSync(categoryPath, { withFileTypes: true });
                
                items.forEach(item => {
                    if (item.isDirectory()) {
                        // Pour les sous-dossiers (comme level)
                        const subFiles = fs.readdirSync(path.join(categoryPath, item.name));
                        subFiles.forEach(file => {
                            if (file.endsWith('.js')) {
                                const command = require(path.join(categoryPath, item.name, file));
                                commands.push(command);
                            }
                        });
                    } else if (item.name.endsWith('.js')) {
                        // Pour les fichiers directs
                        const command = require(path.join(categoryPath, item.name));
                        commands.push(command);
                    }
                });
            }
            
            return commands;
        };

        // Si une catégorie est spécifiée
        if (args[0]) {
            const categoryName = args[0].toLowerCase();
            const commands = loadCategoryCommands(categoryName);

            if (commands.length === 0) {
                return message.reply('Cette catégorie n\'existe pas.');
            }

            const categoryEmoji = {
                admin: '👑',
                utils: '🛠️',
                level: '📊'
            };

            const categoryTitle = {
                admin: 'Administration',
                utils: 'Utilitaires',
                level: 'Niveaux'
            };

            const categoryEmbed = new EmbedBuilder()
                .setColor(message.settings.embedColor)
                .setTitle("❓・Centre d'aide")
                .setDescription(`Liste des commandes de la catégorie ${categoryTitle[categoryName].toLowerCase()}\n\n`)
                .addFields(
                    commands.map(cmd => ({
                        name: `\`${prefix}${cmd.name}\``,
                        value: `Description : ${cmd.description}\n`,
                        inline: false
                    }))
                );

            return message.channel.send({ embeds: [categoryEmbed] });
        }

        // Configuration des catégories
        const categories = {
            admin: {
                name: '👑 Administration',
                usage: `${prefix}help admin`,
                commands: loadCategoryCommands('admin')
            },
            utils: {
                name: '🛠️ Utilitaires',
                usage: `${prefix}help utils`,
                commands: loadCategoryCommands('utils')
            },
            level: {
                name: '📊 Niveaux',
                usage: `${prefix}help level`,
                commands: loadCategoryCommands('level')
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