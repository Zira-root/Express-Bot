const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const { getSettings } = require('../../utils/database/guildSettingsManager');
const { getAllLevelRoles, updateLevelRoles } = require('../../utils/database/permissionManager');

module.exports = {
    name: 'setpermission',
    description: 'Configurer les niveaux de permission et leurs rôles associés',
    usage: 'setpermission',
    async execute(message, args) {
        // Vérifier si l'utilisateur est admin
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Vous n\'avez pas la permission d\'utiliser cette commande.');
        }

        const settings = await getSettings(message.guild.id);
        const levelRoles = await getAllLevelRoles(message.guild.id);

        function createMainEmbed() {
            return new EmbedBuilder()
                .setColor(settings.embedColor)
                .setTitle('Configuration des niveaux de permission')
                .setDescription('Choisissez un niveau pour configurer les rôles qui y auront accès')
                .addFields(
                    { 
                        name: '🌐 Public (Niveau 0)',
                        value: levelRoles[0].length > 0 
                            ? levelRoles[0].map(roleId => `<@&${roleId}>`).join(', ')
                            : 'Commandes accessibles à tous les utilisateurs',
                        inline: false
                    },
                    {
                        name: '🔷 Niveau 1',
                        value: levelRoles[1].length > 0
                            ? levelRoles[1].map(roleId => `<@&${roleId}>`).join(', ')
                            : 'Commandes avec accès restreint niveau 1',
                        inline: false
                    },
                    {
                        name: '🔶 Niveau 2',
                        value: levelRoles[2].length > 0
                            ? levelRoles[2].map(roleId => `<@&${roleId}>`).join(', ')
                            : 'Commandes avec accès restreint niveau 2',
                        inline: false
                    }
                )
                .setFooter({ text: 'Cliquez sur un bouton pour configurer les rôles du niveau' });
        }

        // Créer les boutons
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('configure_level_0')
                    .setLabel('Gérer Public')
                    .setEmoji('🌐')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('configure_level_1')
                    .setLabel('Gérer Niveau 1')
                    .setEmoji('🔷')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('configure_level_2')
                    .setLabel('Gérer Niveau 2')
                    .setEmoji('🔶')
                    .setStyle(ButtonStyle.Secondary)
            );

        const response = await message.reply({
            embeds: [createMainEmbed()],
            components: [buttons]
        });

        const filter = i => i.user.id === message.author.id;
        const collector = response.createMessageComponentCollector({
            filter,
            time: 300000
        });

        collector.on('collect', async interaction => {
            const level = parseInt(interaction.customId.split('_')[2]);

            const roles = message.guild.roles.cache
                .filter(role => role.id !== message.guild.id)
                .sort((a, b) => b.position - a.position);

            const roleSelect = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`roles_level_${level}`)
                        .setPlaceholder('Sélectionnez les rôles pour ce niveau')
                        .setMinValues(1)
                        .setMaxValues(Math.min(roles.size, 25))
                        .addOptions(
                            roles.map(role => ({
                                label: role.name,
                                value: role.id,
                                description: `Configurer le rôle ${role.name}`,
                                emoji: level === 0 ? '🌐' : level === 1 ? '🔷' : '🔶',
                                default: levelRoles[level].includes(role.id)
                            }))
                        )
                );

            const configEmbed = new EmbedBuilder()
                .setColor(settings.embedColor)
                .setTitle(`Configuration des rôles - Niveau ${level}`)
                .setDescription(`Sélectionnez les rôles qui auront accès au niveau ${level}`)
                .addFields(
                    { name: 'Instructions', value: 'Vous pouvez sélectionner plusieurs rôles en maintenant Ctrl (ou Cmd sur Mac)' }
                )
                .setFooter({ text: 'Les modifications seront sauvegardées automatiquement' });

            await interaction.reply({
                embeds: [configEmbed],
                components: [roleSelect],
                ephemeral: true
            });
        });

        const menuFilter = i => i.user.id === message.author.id && i.customId.startsWith('roles_level_');
        const menuCollector = response.channel.createMessageComponentCollector({
            filter: menuFilter,
            time: 300000
        });

        menuCollector.on('collect', async interaction => {
            const [, , level] = interaction.customId.split('_');
            const selectedRoles = interaction.values;

            try {
                // Mettre à jour les rôles pour ce niveau
                levelRoles[level] = selectedRoles;
                await updateLevelRoles(message.guild.id, parseInt(level), selectedRoles);

                // Mettre à jour l'embed principal
                await response.edit({
                    embeds: [createMainEmbed()],
                    components: [buttons]
                });

                const successEmbed = new EmbedBuilder()
                    .setColor(settings.embedColor)
                    .setTitle('✅ Configuration sauvegardée')
                    .setDescription(`Les rôles pour le niveau ${level} ont été mis à jour`)
                    .addFields(
                        { name: 'Rôles configurés', value: selectedRoles.map(roleId => `<@&${roleId}>`).join(', ') }
                    );

                await interaction.update({
                    embeds: [successEmbed],
                    components: [],
                });
            } catch (error) {
                console.error('Erreur lors de la mise à jour des rôles:', error);
                await interaction.reply({
                    content: 'Une erreur est survenue lors de la mise à jour des rôles.',
                    ephemeral: true
                });
            }
        });

        collector.on('end', async () => {
            if (response.editable) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(settings.embedColor)
                    .setTitle('Session expirée')
                    .setDescription('La configuration des permissions est terminée.')
                    .setFooter({ text: `Utilisez ${settings.prefix}setpermission pour recommencer` });

                await response.edit({
                    embeds: [timeoutEmbed],
                    components: []
                });
            }
        });
    },
};