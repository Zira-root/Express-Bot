const { getSettings } = require('../utils/database/guildSettingsManager');
const levelManager = require('../utils/database/levelManager');

module.exports = {
    name: 'messageCreate',
    description: "Gère les commandes et l'XP lors de la création d'un message",
    async execute(message) {
        // Ignorer les messages privés et des bots
        if (!message.guild || message.author.bot) return;

        try {
            // Traitement parallèle des commandes et de l'XP
            await Promise.all([
                this.handleCommand(message),
                this.handleLevels(message)
            ]);
        } catch (error) {
            console.error('Erreur dans messageCreate:', error);
        }
    },

    async handleCommand(message) {
        try {
            // Récupérer les paramètres du serveur
            const settings = await getSettings(message.guild.id);
            if (!settings?.prefix) return;
            
            // Vérifier si le message commence par le préfixe
            if (!message.content.startsWith(settings.prefix)) return;

            // Extraire les arguments et le nom de la commande
            const args = message.content.slice(settings.prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // Chercher la commande
            const command = message.client.commands.get(commandName) || 
                          message.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
                          
            if (!command) return;

            // Ajouter les paramètres au message
            message.settings = settings;

            // Exécuter la commande
            await command.execute(message, args);

            await sendLog(message.guild, 'COMMANDS', {
                action: 'USE',
                user: message.author,
                command: commandName,
                channel: message.channel,
                id: message.id
            });
            
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande:', error);
            message.reply({
                content: 'Une erreur est survenue lors de l\'exécution de cette commande.',
                allowedMentions: { repliedUser: false }
            }).catch(console.error);

            await sendLog(message.guild, 'COMMANDS', {
                action: 'ERROR',
                user: message.author,
                command: commandName,
                error: error.message,
                id: message.id
            });
        }
    },

    async handleLevels(message) {
        try {
            await levelManager.handleMessage(message);
        } catch (error) {
            console.error('Erreur lors du traitement de l\'XP:', error);
        }
    }
};