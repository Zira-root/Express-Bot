const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const moderationManager = require('../../../utils/database/moderationManager');

module.exports = {
    name: 'unwarn',
    description: 'Retirer un avertissement à un membre',
    usage: 'unwarn [@utilisateur/ID]',
    example: 'unwarn @User',
    category: 'moderation',
    userPermissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],

    async execute(message, args) {
        // Si pas d'argument, afficher tous les avertissements actifs
        if (!args[0]) {
            const allWarnings = await moderationManager.getAllActiveWarnings(message.guild.id);
            
            if (allWarnings.length === 0) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00ff00')
                            .setDescription('✅ | Aucun avertissement actif sur le serveur.')
                    ]
                });
            }

            // Grouper les avertissements par utilisateur
            const warningsByUser = new Map();
            for (const warn of allWarnings) {
                if (!warningsByUser.has(warn.userId)) {
                    warningsByUser.set(warn.userId, []);
                }
                warningsByUser.get(warn.userId).push(warn);
            }

            // Pour chaque utilisateur avec des avertissements
            for (const [userId, warns] of warningsByUser) {
                const user = await message.client.users.fetch(userId).catch(() => null);
                if (!user) continue;

                // Créer les boutons pour chaque avertissement (5 par ligne maximum)
                const buttons = warns.map(warn => ({
                    type: 2,
                    style: 1,
                    label: `Warn #${warn.caseId}`,
                    custom_id: `unwarn_${warn.caseId}`,
                    emoji: '🔄'
                }));

                const rows = [];
                for (let i = 0; i < buttons.length; i += 5) {
                    rows.push({
                        type: 1,
                        components: buttons.slice(i, i + 5)
                    });
                }

                // Créer l'embed pour l'utilisateur
                const embed = new EmbedBuilder()
                    .setColor('#ffa500')
                    .setTitle(`⚠️ Avertissements actifs de ${user.tag}`)
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setDescription(warns.map(warn => {
                        const date = new Date(warn.timestamp).toLocaleString('fr-FR', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric'
                        });
                        return `**Warn #${warn.caseId}**\n👮 Modérateur: <@${warn.moderatorId}>\n📅 Date: ${date}\n📝 Raison: ${warn.reason}\n`;
                    }).join('\n\n'));

                await message.channel.send({ embeds: [embed], components: rows });
            }

            // Collecter les interactions avec les boutons
            const collector = message.channel.createMessageComponentCollector({
                filter: i => i.customId.startsWith('unwarn_') && i.user.id === message.author.id,
                time: 60000
            });

            collector.on('collect', async interaction => {
                const warnId = parseInt(interaction.customId.split('_')[1]);

                // Demander la raison
                await interaction.reply({
                    content: 'Pour quelle raison souhaitez-vous retirer cet avertissement ? (Répondez dans les 30 secondes)',
                    ephemeral: true
                });

                try {
                    const collected = await message.channel.awaitMessages({
                        filter: m => m.author.id === interaction.user.id,
                        max: 1,
                        time: 30000,
                        errors: ['time']
                    });

                    const reason = collected.first()?.content || 'Aucune raison spécifiée';
                    collected.first()?.delete().catch(() => {});

                    // Récupérer et désactiver l'avertissement
                    const warning = await moderationManager.getSanctionById(warnId);
                    if (!warning || !warning.active) {
                        await interaction.editReply('❌ Cet avertissement n\'existe plus ou a déjà été retiré.');
                        return;
                    }

                    warning.active = false;
                    await warning.save();

                    // Créer la sanction UNWARN
                    const sanction = await moderationManager.createSanction(
                        message.guild.id,
                        warning.userId,
                        interaction.user.id,
                        'UNWARN',
                        reason
                    );

                    // Notifier l'utilisateur
                    const target = await message.client.users.fetch(warning.userId);
                    try {
                        await target.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor('#00ff00')
                                    .setTitle(`🔄 Avertissement retiré sur ${message.guild.name}`)
                                    .addFields([
                                        { name: 'Warn retiré', value: `#${warning.caseId}` },
                                        { name: 'Raison', value: reason },
                                        { name: 'Modérateur', value: interaction.user.tag }
                                    ])
                                    .setTimestamp()
                            ]
                        });
                    } catch (err) {
                        console.log(`Impossible d'envoyer un MP à ${target.tag}`);
                    }

                    // Logs de modération
                    const logChannel = await moderationManager.getModLogChannel(message.guild.id);
                    if (logChannel) {
                        const channel = await message.guild.channels.fetch(logChannel);
                        const logEmbed = moderationManager.createModLogEmbed(sanction, target, interaction.user);
                        channel?.send({ embeds: [logEmbed] });
                    }

                    // Confirmation
                    await interaction.editReply({
                        content: `✅ Avertissement #${warning.caseId} retiré avec succès.\nCase ID: #${sanction.caseId}`,
                        ephemeral: true
                    });

                    // Mettre à jour le message
                    if (interaction.message.editable) {
                        // Récupérer les warns restants
                        const remainingWarns = await moderationManager.getUserSanctions(message.guild.id, warning.userId);
                        const activeWarns = remainingWarns.filter(w => w.type === 'WARN' && w.active);

                        if (activeWarns.length === 0) {
                            await interaction.message.delete();
                        } else {
                            // Mettre à jour l'embed
                            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                                .setDescription(activeWarns.map(warn => {
                                    const date = new Date(warn.timestamp).toLocaleString('fr-FR', {
                                        year: 'numeric',
                                        month: 'numeric',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: 'numeric'
                                    });
                                    return `**Warn #${warn.caseId}**\n👮 Modérateur: <@${warn.moderatorId}>\n📅 Date: ${date}\n📝 Raison: ${warn.reason}\n`;
                                }).join('\n\n'));

                            // Mettre à jour les boutons
                            const newButtons = activeWarns.map(warn => ({
                                type: 2,
                                style: 1,
                                label: `Warn #${warn.caseId}`,
                                custom_id: `unwarn_${warn.caseId}`,
                                emoji: '🔄'
                            }));

                            const newRows = [];
                            for (let i = 0; i < newButtons.length; i += 5) {
                                newRows.push({
                                    type: 1,
                                    components: newButtons.slice(i, i + 5)
                                });
                            }

                            await interaction.message.edit({
                                embeds: [updatedEmbed],
                                components: newRows
                            });
                        }
                    }

                } catch (error) {
                    if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                        await interaction.editReply('❌ Temps écoulé, retrait annulé.');
                    } else {
                        console.error(error);
                        await interaction.editReply('❌ Une erreur est survenue.');
                    }
                }
            });

            // Fin du collector principal
            collector.on('end', async () => {
                // Désactiver tous les boutons
                const messages = await message.channel.messages.fetch();
                messages.forEach(msg => {
                    if (msg.components?.length > 0) {
                        msg.edit({ components: [] }).catch(() => {});
                    }
                });
            });

            return;
        }

        // Si un utilisateur est spécifié
        const target = message.mentions.members.first() 
            || await message.guild.members.fetch(args[0]).catch(() => null);

        if (!target) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('❌ | Utilisateur introuvable.')
                ]
            });
        }

        // Afficher les avertissements de l'utilisateur spécifié
        const warnings = await moderationManager.getUserSanctions(message.guild.id, target.id);
        const activeWarns = warnings.filter(w => w.type === 'WARN' && w.active);

        if (activeWarns.length === 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription(`❌ | ${target.user.tag} n'a aucun avertissement actif.`)
                ]
            });
        }

        // Créer les boutons pour les avertissements
        const buttons = activeWarns.map(warn => ({
            type: 2,
            style: 1,
            label: `Warn #${warn.caseId}`,
            custom_id: `unwarn_${warn.caseId}`,
            emoji: '🔄'
        }));

        const rows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            rows.push({
                type: 1,
                components: buttons.slice(i, i + 5)
            });
        }

        // Créer et envoyer l'embed
        const embed = new EmbedBuilder()
            .setColor('#ffa500')
            .setTitle(`⚠️ Avertissements actifs de ${target.user.tag}`)
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setDescription(activeWarns.map(warn => {
                const date = new Date(warn.timestamp).toLocaleString('fr-FR', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric'
                });
                return `**Warn #${warn.caseId}**\n👮 Modérateur: <@${warn.moderatorId}>\n📅 Date: ${date}\n📝 Raison: ${warn.reason}\n`;
            }).join('\n\n'));

        const msg = await message.reply({ embeds: [embed], components: rows });

        // Utiliser le même collecteur que précédemment
        const collector = msg.createMessageComponentCollector({
            filter: i => i.customId.startsWith('unwarn_') && i.user.id === message.author.id,
            time: 60000
        });

        // Réutiliser la même logique de collection que précédemment
        collector.on('collect', async interaction => {
            const warnId = parseInt(interaction.customId.split('_')[1]);
        
            // Demander la raison
            await interaction.reply({
                content: 'Pour quelle raison souhaitez-vous retirer cet avertissement ? (Répondez dans les 30 secondes)',
                ephemeral: true
            });
        
            try {
                const collected = await message.channel.awaitMessages({
                    filter: m => m.author.id === interaction.user.id,
                    max: 1,
                    time: 30000,
                    errors: ['time']
                });
        
                const reason = collected.first()?.content || 'Aucune raison spécifiée';
                collected.first()?.delete().catch(() => {});
        
                // Récupérer et désactiver l'avertissement
                const warning = await moderationManager.getSanctionById(warnId);
                if (!warning || !warning.active) {
                    await interaction.editReply('❌ Cet avertissement n\'existe plus ou a déjà été retiré.');
                    return;
                }
        
                warning.active = false;
                await warning.save();
        
                // Créer la sanction UNWARN
                const sanction = await moderationManager.createSanction(
                    message.guild.id,
                    warning.userId,
                    interaction.user.id,
                    'UNWARN',
                    reason
                );
        
                // Notifier l'utilisateur
                const targetUser = await message.client.users.fetch(warning.userId);
                try {
                    await targetUser.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#00ff00')
                                .setTitle(`🔄 Avertissement retiré sur ${message.guild.name}`)
                                .addFields([
                                    { name: 'Warn retiré', value: `#${warning.caseId}` },
                                    { name: 'Raison', value: reason },
                                    { name: 'Modérateur', value: interaction.user.tag }
                                ])
                                .setTimestamp()
                        ]
                    });
                } catch (err) {
                    console.log(`Impossible d'envoyer un MP à ${targetUser.tag}`);
                }
        
                // Logs de modération
                const logChannel = await moderationManager.getModLogChannel(message.guild.id);
                if (logChannel) {
                    const channel = await message.guild.channels.fetch(logChannel);
                    const logEmbed = moderationManager.createModLogEmbed(sanction, targetUser, interaction.user);
                    channel?.send({ embeds: [logEmbed] });
                }
        
                // Confirmation
                await interaction.editReply({
                    content: `✅ Avertissement #${warning.caseId} retiré avec succès.\nCase ID: #${sanction.caseId}`,
                    ephemeral: true
                });
        
                // Mettre à jour le message
                if (msg.editable) {
                    const remainingWarns = activeWarns.filter(w => w.caseId !== warning.caseId);
                    if (remainingWarns.length === 0) {
                        await msg.delete();
                    } else {
                        const updatedEmbed = EmbedBuilder.from(msg.embeds[0])
                            .setDescription(remainingWarns.map(warn => {
                                const date = new Date(warn.timestamp).toLocaleString('fr-FR', {
                                    year: 'numeric',
                                    month: 'numeric',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: 'numeric'
                                });
                                return `**Warn #${warn.caseId}**\n👮 Modérateur: <@${warn.moderatorId}>\n📅 Date: ${date}\n📝 Raison: ${warn.reason}\n`;
                            }).join('\n\n'));
        
                        const newButtons = remainingWarns.map(warn => ({
                            type: 2,
                            style: 1,
                            label: `Warn #${warn.caseId}`,
                            custom_id: `unwarn_${warn.caseId}`,
                            emoji: '🔄'
                        }));
        
                        const newRows = [];
                        for (let i = 0; i < newButtons.length; i += 5) {
                            newRows.push({
                                type: 1,
                                components: newButtons.slice(i, i + 5)
                            });
                        }
        
                        await msg.edit({ embeds: [updatedEmbed], components: newRows });
                    }
                }
            } catch (error) {
                if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                    await interaction.editReply('❌ Temps écoulé, retrait annulé.');
                } else {
                    console.error(error);
                    await interaction.editReply('❌ Une erreur est survenue.');
                }
            }
        });

        collector.on('end', async () => {
            if (msg.editable) {
                await msg.edit({ components: [] }).catch(() => {});
            }
        });
    }
};