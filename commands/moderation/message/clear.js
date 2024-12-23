const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const ModerationManager = require('../../../utils/database/moderationManager');
const { sendLog } = require('../../../utils/function/logs');

module.exports = {
    name: 'clear',
    description: 'Supprime un nombre spécifié de messages',
    async execute(message, args) {
        // Vérifier les permissions
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('Vous n\'avez pas la permission de supprimer des messages.');
        }

        // Si aucun argument n'est fourni, afficher l'aide
        if (!args[0]) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('⚙️ Commande Clear')
                .setDescription('Cette commande permet de supprimer un nombre spécifié de messages.')
                .addFields(
                    { 
                        name: '📝 Syntaxe', 
                        value: '```!clear [nombre]```' 
                    },
                    {
                        name: '💡 Exemples', 
                        value: '• `!clear 10` - Efface 10 messages + la commande\n• `!clear 5` - Efface 5 messages + la commande'
                    },
                    {
                        name: '⚠️ Limitations', 
                        value: '• Minimum : 1 message \n• Maximum : 99 messages\n'
                    }
                )
                .setFooter({ text: 'Note: Les messages de plus de 14 jours ne peuvent pas être supprimés.' })
                .setTimestamp();

            return message.channel.send({ embeds: [helpEmbed] });
        }

        // Convertir l'argument en nombre
        const amount = parseInt(args[0]);

        // Vérifier si le nombre est valide
        if (isNaN(amount)) {
            return message.reply('Veuillez spécifier un nombre valide.');
        }

        // Vérifier si le nombre est dans les limites
        // On limite à 99 car on va ajouter +1 pour la commande elle-même
        if (amount < 1 || amount > 100) {
            return message.reply('Veuillez spécifier un nombre entre 1 et 100.');
        }

        try {
            // D'abord supprimer le message de la commande
            await message.delete();

            // Ensuite supprimer le nombre demandé de messages
            const deleted = await message.channel.bulkDelete(amount, true);

            // Créer un embed de confirmation
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Messages supprimés')
                .setDescription(`${deleted.size} messages ont été supprimés.`)
                .setTimestamp();

            // Envoyer l'embed et le supprimer après 5 secondes
            const reply = await message.channel.send({ embeds: [successEmbed] });
            setTimeout(() => reply.delete().catch(() => {}), 5000);

            // Créer une entrée dans les logs de modération
            const sanction = await ModerationManager.createSanction(
                message.guild.id,
                message.author.id,
                message.author.id,
                'CLEAR',
                `${deleted.size} messages supprimés dans #${message.channel.name}`
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

            // Envoyer le log avec la bonne variable deleted au lieu de messages
            await sendLog(message.guild, 'MESSAGES', {
                action: 'BULK_DELETE',
                executor: message.author,
                channel: message.channel,
                count: deleted.size, // Ici on utilise deleted au lieu de messages
                id: message.channel.id
            });

        } catch (error) {
            if (error.code === 50034) {
                return message.channel.send('Je ne peux pas supprimer les messages qui datent de plus de 14 jours.');
            }
            console.error(error);
            return message.channel.send('Une erreur est survenue lors de la suppression des messages.');
        }
    }
};