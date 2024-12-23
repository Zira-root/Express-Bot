const AutoModManager = require('../../utils/database/autoModManager');
const userMessages = new Map();

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        // Récupérer les paramètres de l'automod
        const settings = await AutoModManager.getSettings(message.guild.id);
        if (!settings.enabled || !settings.spam.enabled) return;

        // Récupérer l'historique des messages de l'utilisateur
        const userId = message.author.id;
        if (!userMessages.has(userId)) {
            userMessages.set(userId, []);
        }

        const userHistory = userMessages.get(userId);
        const now = Date.now();

        // Nettoyer les anciens messages
        const timeWindow = settings.spam.timeWindow;
        userHistory.push({
            timestamp: now,
            messageId: message.id
        });

        // Supprimer les messages plus vieux que la fenêtre de temps
        while (userHistory.length > 0 && userHistory[0].timestamp < now - timeWindow) {
            userHistory.shift();
        }

        // Vérifier si le nombre de messages dépasse la limite
        if (userHistory.length > settings.spam.maxMessages) {
            // Appliquer l'action configurée
            await AutoModManager.applyModuleAction(
                message.guild,
                message.member,
                'spam',
                settings.spam.action,
                { message: message }
            );

            // Nettoyer l'historique après l'action
            userHistory.length = 0;
        }
    }
};