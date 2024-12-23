const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const ModerationManager = require('../../../utils/database/moderationManager');

// Fonction utilitaire pour vérifier si une chaîne est un ID
const isId = (str) => /^\d+$/.test(str);

// Fonction utilitaire pour extraire l'ID d'une mention de salon
const getChannelId = (mention) => mention.replace(/[<#>]/g, '');

const lockUnlockChannel = async (channel, lock = true, roleEveryone) => {
    await channel.permissionOverwrites.edit(roleEveryone, {
        SendMessages: lock ? false : null,
        CreatePublicThreads: lock ? false : null,
        CreatePrivateThreads: lock ? false : null,
        SendMessagesInThreads: lock ? false : null
    });
};

const processChannelsInCategory = async (category, lock, roleEveryone) => {
    const channels = category.children.cache.filter(channel => 
        channel.type !== 2 && // Exclure les salons vocaux
        channel.type !== 13 && // Exclure les salons de stage
        channel.type !== 15 // Exclure les forums
    );
    
    for (const channel of channels.values()) {
        await lockUnlockChannel(channel, lock, roleEveryone);
    }
    
    return channels.size;
};

module.exports = {
    name: 'unlock',
    description: 'Déverrouille un salon ou une catégorie',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.reply('Vous n\'avez pas la permission de gérer les salons.');
        }

        // Si pas d'arguments, afficher l'aide
        if (!args[0]) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('⚙️ Commande Unlock')
                .setDescription('Déverrouille un salon ou une catégorie entière.')
                .addFields(
                    { 
                        name: '📝 Syntaxe', 
                        value: '```!unlock [#salon ou ID-catégorie]```' 
                    },
                    {
                        name: '💡 Exemples', 
                        value: '• `!unlock` - Déverrouille le salon actuel\n• `!unlock #général` - Déverrouille le salon #général\n• `!unlock 123456789` - Déverrouille tous les salons de la catégorie'
                    },
                    {
                        name: '⚠️ Notes', 
                        value: '• Requiert la permission "Gérer les salons"\n• Les salons vocaux et forums ne sont pas affectés'
                    }
                )
                .setTimestamp();

            return message.channel.send({ embeds: [helpEmbed] });
        }

        const roleEveryone = message.guild.roles.everyone;
        let targetChannel = message.channel;
        let affectedChannels = 0;

        // Si un argument est fourni
        if (args[0]) {
            if (message.mentions.channels.size > 0) {
                // Si c'est une mention de salon
                targetChannel = message.mentions.channels.first();
            } else if (isId(args[0])) {
                // Si c'est un ID, vérifier si c'est une catégorie
                const category = message.guild.channels.cache.get(args[0]);
                if (!category || category.type !== 4) {
                    return message.reply('ID de catégorie invalide.');
                }
                
                affectedChannels = await processChannelsInCategory(category, false, roleEveryone);
                
                const successEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🔓 Catégorie déverrouillée')
                    .setDescription(`${affectedChannels} salons ont été déverrouillés dans la catégorie ${category.name}`)
                    .setTimestamp();

                message.channel.send({ embeds: [successEmbed] });

                // Log de modération
                const sanction = await ModerationManager.createSanction(
                    message.guild.id,
                    message.author.id,
                    message.author.id,
                    'UNLOCK',
                    `Catégorie ${category.name} déverrouillée (${affectedChannels} salons)`
                );

                const modLogChannel = await ModerationManager.getModLogChannel(message.guild.id);
                if (modLogChannel) {
                    const logChannel = message.guild.channels.cache.get(modLogChannel);
                    if (logChannel) {
                        const logEmbed = ModerationManager.createModLogEmbed(sanction, message.author, message.author);
                        logChannel.send({ embeds: [logEmbed] });
                    }
                }

                return;
            }
        }

        try {
            await lockUnlockChannel(targetChannel, false, roleEveryone);

            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔓 Salon déverrouillé')
                .setDescription(`Le salon ${targetChannel} a été déverrouillé`)
                .setTimestamp();

            message.channel.send({ embeds: [successEmbed] });

            // Log de modération
            const sanction = await ModerationManager.createSanction(
                message.guild.id,
                message.author.id,
                message.author.id,
                'UNLOCK',
                `Salon ${targetChannel.name} déverrouillé`
            );

            const modLogChannel = await ModerationManager.getModLogChannel(message.guild.id);
            if (modLogChannel) {
                const logChannel = message.guild.channels.cache.get(modLogChannel);
                if (logChannel) {
                    const logEmbed = ModerationManager.createModLogEmbed(sanction, message.author, message.author);
                    logChannel.send({ embeds: [logEmbed] });
                }
            }
        } catch (error) {
            console.error(error);
            message.reply('Une erreur est survenue lors du déverrouillage du salon.');
        }
    }
};