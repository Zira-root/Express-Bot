const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user) {
        // Éviter les réactions du bot
        if (user.bot) return;

        // Si la réaction n'est pas complètement chargée
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Erreur lors du chargement de la réaction:', error);
                return;
            }
        }

        // Logs pour debug
        console.log(`Réaction reçue: ${reaction.emoji.name} par ${user.tag}`);
        
        try {
            // Émettre l'événement pour le collecteur
            reaction.message.client.emit('messageReactionAdd', reaction, user);
        } catch (error) {
            console.error('Erreur lors du traitement de la réaction:', error);
        }
    },
};