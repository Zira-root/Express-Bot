const { addOwner, isOwner } = require('../../utils/database/ownerManager');
require('dotenv').config();

module.exports = {
    name: 'addowner',
    description: 'Ajouter un owner au bot',
    usage: '<@utilisateur>',
    async execute(message, args) {
        // Vérifier si l'utilisateur est l'owner principal
        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('Seul l\'owner principal peut ajouter des owners.');
        }

        // Vérifier si un utilisateur est mentionné
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('Vous devez mentionner un utilisateur à ajouter comme owner.');
        }
        
        // Vérifier si l'utilisateur est déjà owner
        if (await isOwner(targetUser.id)) {
            return message.reply('Cet utilisateur est déjà owner du bot.');
        }
        
        try {
            // Ajouter l'owner dans la base de données
            await addOwner(targetUser.id);
            return message.reply(`${targetUser.tag} a été ajouté comme owner du bot.`);
        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'owner:', error);
            return message.reply('Une erreur est survenue lors de l\'ajout de l\'owner.');
        }
    },
};