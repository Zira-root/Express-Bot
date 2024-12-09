const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageReactionRemove,
    async execute(reaction, user) {
        if (user.bot) return;

        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Erreur lors du chargement de la réaction:', error);
                return;
            }
        }

        try {
            // Émettre l'événement pour le collecteur
            reaction.message.client.emit('messageReactionRemove', reaction, user);
        } catch (error) {
            console.error('Erreur lors du traitement du retrait de la réaction:', error);
        }
    },
};