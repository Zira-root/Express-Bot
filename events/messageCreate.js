const { getSettings } = require('../utils/database/guildSettingsManager');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Ignorer les messages des bots
        if (message.author.bot) return;
        
        // Ignorer les messages privés
        if (!message.guild) return;

        // Récupérer les paramètres du serveur
        const settings = await getSettings(message.guild.id);
        
        // Vérifier si le message commence par le préfixe
        if (!message.content.startsWith(settings.prefix)) return;

        // Extraire les arguments et le nom de la commande
        const args = message.content.slice(settings.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Chercher la commande
        const command = message.client.commands.get(commandName) || 
                       message.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
                       
        if (!command) return;

        // Ajouter les paramètres au message pour un accès facile
        message.settings = settings;

        try {
            await command.execute(message, args);
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande:', error);
            message.reply({
                content: 'Une erreur est survenue lors de l\'exécution de cette commande.',
                allowedMentions: { repliedUser: false }
            }).catch(console.error);
        }
    },
};