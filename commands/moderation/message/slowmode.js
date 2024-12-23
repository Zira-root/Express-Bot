const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const ModerationManager = require('../../../utils/database/moderationManager');

module.exports = {
    name: 'slowmode',
    description: 'Configure le mode lent d\'un salon',
    async execute(message, args) {
        // Vérifier les permissions
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.reply('Vous n\'avez pas la permission de gérer le mode lent.');
        }

        // Si aucun argument n'est fourni, afficher l'aide
        if (!args[0]) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('⚙️ Commande Slowmode')
                .setDescription("Permet de configurer le mode lent (cooldown entre chaque message) d'un salon.")
                .addFields(
                    { 
                        name: '📝 Syntaxe', 
                        value: '```!slowmode [durée] [#salon]```' 
                    },
                    { 
                        name: '⏱️ Format de durée', 
                        value: '• `nombre` - Durée en secondes\n• `nombre`s - Durée en secondes\n• `nombre`m - Durée en minutes\n• `nombre`h - Durée en heures\n• `off` - Désactive le mode lent',
                        inline: true
                    },
                    {
                        name: '📌 Salon', 
                        value: '• Non spécifié - Salon actuel\n• `#salon` - Salon mentionné',
                        inline: true
                    },
                    {
                        name: '💡 Exemples', 
                        value: '• `!slowmode 10` - 10 secondes de délai\n• `!slowmode 5m` - 5 minutes de délai\n• `!slowmode 2h #général` - 2 heures dans #général\n• `!slowmode off` - Désactive le mode lent'
                    },
                    {
                        name: '⚠️ Limitations', 
                        value: '• Maximum : 6 heures (21600 secondes)\n• Requiert la permission "Gérer les salons"'
                    }
                )
                .setFooter({ text: 'Conseil : Utilisez cette commande pour ralentir les conversations trop rapides' })
                .setTimestamp();

            return message.channel.send({ embeds: [helpEmbed] });
        }

        // Fonction pour convertir la durée en secondes
        const parseTime = (timeStr) => {
            if (timeStr.toLowerCase() === 'off') return 0;
            
            const match = timeStr.match(/^(\d+)([smh])?$/);
            if (!match) return null;
            
            const value = parseInt(match[1]);
            const unit = match[2] || 's';
            
            switch (unit.toLowerCase()) {
                case 'h': return value * 3600;
                case 'm': return value * 60;
                case 's': return value;
                default: return null;
            }
        };

        // Convertir l'argument en secondes
        const seconds = parseTime(args[0]);
        
        if (seconds === null) {
            return message.reply('Format de durée invalide. Utilisez `!slowmode` pour voir les formats acceptés.');
        }

        if (seconds > 21600) { // 6 heures maximum
            return message.reply('Le mode lent ne peut pas dépasser 6 heures.');
        }

        // Déterminer le salon cible
        let targetChannel = message.channel;
        if (args[1]) {
            // Extraire l'ID du salon depuis la mention
            const channelId = args[1].replace(/[<#>]/g, '');
            const channel = message.guild.channels.cache.get(channelId);
            
            if (!channel) {
                return message.reply('Salon invalide. Assurez-vous de mentionner un salon valide avec #.');
            }
            
            if (!channel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.ManageChannels)) {
                return message.reply('Je n\'ai pas la permission de gérer le mode lent dans ce salon.');
            }
            
            targetChannel = channel;
        }

        try {
            // Appliquer le slowmode
            await targetChannel.setRateLimitPerUser(seconds);

            // Créer un embed de confirmation
            const statusEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Mode lent configuré')
                .setDescription(seconds === 0 
                    ? `Le mode lent a été désactivé dans ${targetChannel}.` 
                    : `Mode lent configuré sur ${formatDuration(seconds)} dans ${targetChannel}.`
                )
                .setTimestamp();

            // Envoyer l'embed
            message.channel.send({ embeds: [statusEmbed] });

            // Créer une entrée dans les logs de modération
            const sanction = await ModerationManager.createSanction(
                message.guild.id,
                message.author.id,
                message.author.id,
                'SLOWMODE',
                `Mode lent ${seconds === 0 ? 'désactivé' : 'configuré sur ' + formatDuration(seconds)} dans ${targetChannel.name}`
            );

            // Envoyer le log dans le canal de modération
            const modLogChannel = await ModerationManager.getModLogChannel(message.guild.id);
            if (modLogChannel) {
                const logEmbed = ModerationManager.createModLogEmbed(sanction, message.author, message.author);
                const logChannel = message.guild.channels.cache.get(modLogChannel);
                if (logChannel) {
                    logChannel.send({ embeds: [logEmbed] });
                }
            }
        } catch (error) {
            console.error(error);
            message.reply('Une erreur est survenue lors de la configuration du mode lent.');
        }
    }
};

// Fonction pour formater la durée
function formatDuration(seconds) {
    if (seconds >= 3600) {
        const hours = Math.floor(seconds / 3600);
        return `${hours} heure${hours > 1 ? 's' : ''}`;
    } else if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
        return `${seconds} seconde${seconds > 1 ? 's' : ''}`;
    }
}